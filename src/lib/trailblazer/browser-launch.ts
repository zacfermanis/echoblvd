import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import type { Browser, BrowserType } from 'playwright-core';
import {
  getTrailblazerProfileTimeoutMs,
  isVercelServerlessRuntime,
  summarizeBrowserLaunchError,
} from './browser-context';
import { logTrailblazerValidation } from './logging';

export interface BrowserLaunchResult {
  browser: Browser | null;
  browserMode: string | null;
}

type ChromiumLauncher = BrowserType<Browser>;

function trimDiagnosticText(value: unknown, maxLength = 400): string {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function getTrailblazerBrowserExecutableCandidates(): string[] {
  const configuredPath = String(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '').trim();
  const candidates = [
    configuredPath,
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean);

  return [...new Set(candidates)].filter((candidatePath) => existsSync(candidatePath));
}

function getPackagedPlaywrightBrowsersRoot(): string | null {
  const configuredRoot = String(process.env.PLAYWRIGHT_BROWSERS_PATH || '').trim();
  if (!configuredRoot) return null;
  return path.isAbsolute(configuredRoot)
    ? configuredRoot
    : path.join(process.cwd(), configuredRoot);
}

function collectPackagedPlaywrightExecutableMatches(
  current: { dirPath: string; depth: number },
  pending: Array<{ dirPath: string; depth: number }>,
  matches: string[],
  executableNames: Set<string>
): void {
  if (!current || current.depth > 4) return;

  let entries: Array<{ name: string; isDirectory: () => boolean; isFile: () => boolean }> = [];
  try {
    entries = readdirSync(current.dirPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const entryPath = path.join(current.dirPath, entry.name);
    if (entry.isDirectory()) {
      pending.push({ dirPath: entryPath, depth: current.depth + 1 });
      continue;
    }
    if (entry.isFile() && executableNames.has(entry.name)) {
      matches.push(entryPath);
    }
  }
}

function getPackagedPlaywrightExecutableCandidates(): string[] {
  const root = getPackagedPlaywrightBrowsersRoot();
  if (!root || !existsSync(root)) return [];

  const matches: string[] = [];
  const pending = [{ dirPath: root, depth: 0 }];
  const executableNames = new Set(['chrome', 'chrome-headless-shell', 'chrome.exe']);

  while (pending.length > 0 && matches.length < 8) {
    const current = pending.shift();
    if (!current) break;
    collectPackagedPlaywrightExecutableMatches(current, pending, matches, executableNames);
  }

  return [...new Set(matches)];
}

function runBrowserExecutableProbe(executablePath: string): Record<string, unknown> {
  const versionResult = spawnSync(executablePath, ['--version'], {
    encoding: 'utf8',
    timeout: 5000,
    env: process.env,
  });

  const diagnostics: Record<string, unknown> = {
    executablePath,
    versionStatus: versionResult.status,
    versionSignal: versionResult.signal,
    versionStdout: trimDiagnosticText(versionResult.stdout),
    versionStderr: trimDiagnosticText(versionResult.stderr),
    versionError: trimDiagnosticText(versionResult.error?.message),
  };

  if (process.platform === 'linux' && existsSync('/usr/bin/ldd')) {
    const lddResult = spawnSync('/usr/bin/ldd', [executablePath], {
      encoding: 'utf8',
      timeout: 5000,
      env: process.env,
    });
    diagnostics.lddStatus = lddResult.status;
    diagnostics.lddSignal = lddResult.signal;
    diagnostics.lddStdout = trimDiagnosticText(lddResult.stdout, 800);
    diagnostics.lddStderr = trimDiagnosticText(lddResult.stderr);
    diagnostics.lddError = trimDiagnosticText(lddResult.error?.message);
  }

  return diagnostics;
}

function getTrailblazerBrowserExecutableDiagnostics(): Array<Record<string, unknown>> {
  const candidates = [
    ...getPackagedPlaywrightExecutableCandidates(),
    ...getTrailblazerBrowserExecutableCandidates(),
  ];

  return [...new Set(candidates)]
    .filter((candidatePath) => existsSync(candidatePath))
    .slice(0, 6)
    .map((candidatePath) => runBrowserExecutableProbe(candidatePath));
}

async function launchWithSparticuz(
  chromium: ChromiumLauncher,
  launchDiagnostics: string[]
): Promise<BrowserLaunchResult> {
  try {
    const sparticuz = await import('@sparticuz/chromium');
    const chromiumPack = sparticuz.default ?? sparticuz;
    const executablePath = await chromiumPack.executablePath();

    if (executablePath) {
      const executableDir = path.dirname(executablePath);
      process.env.LD_LIBRARY_PATH = [executableDir, process.env.LD_LIBRARY_PATH]
        .filter(Boolean)
        .join(path.delimiter);
    }

    const stealthArgs = [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1366,768',
    ];

    const browser = await chromium.launch({
      args: [...chromiumPack.args, ...stealthArgs],
      executablePath,
      headless: true,
      ignoreDefaultArgs: ['--enable-automation'],
    });

    logTrailblazerValidation('browser-launch-success', { browserMode: 'sparticuz' });
    return { browser, browserMode: 'sparticuz' };
  } catch (error) {
    launchDiagnostics.push(`sparticuz:${summarizeBrowserLaunchError(error)}`);
    logTrailblazerValidation('browser-launch-failed', {
      launchAttempt: 'sparticuz',
      error: summarizeBrowserLaunchError(error),
    });
    return { browser: null, browserMode: null };
  }
}

async function launchLocalFallbacks(
  chromium: ChromiumLauncher,
  launchDiagnostics: string[]
): Promise<BrowserLaunchResult> {
  const launchAttempts: Array<{ type: string; options: Record<string, unknown> }> = [
    { type: 'channel:chromium', options: { channel: 'chromium' } },
    { type: 'channel:chrome', options: { channel: 'chrome' } },
    { type: 'default', options: {} },
    ...getTrailblazerBrowserExecutableCandidates().map((executablePath) => ({
      type: `executable:${executablePath}`,
      options: { executablePath },
    })),
  ];

  for (const launchAttempt of launchAttempts) {
    try {
      const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        ...launchAttempt.options,
      });
      logTrailblazerValidation('browser-launch-success', { browserMode: launchAttempt.type });
      return { browser, browserMode: launchAttempt.type };
    } catch (error) {
      launchDiagnostics.push(`${launchAttempt.type}:${summarizeBrowserLaunchError(error)}`);
      logTrailblazerValidation('browser-launch-failed', {
        launchAttempt: launchAttempt.type,
        error: summarizeBrowserLaunchError(error),
      });
    }
  }

  logTrailblazerValidation('browser-executable-preflight', {
    packagedBrowsersPath: getPackagedPlaywrightBrowsersRoot(),
    executableDiagnostics: getTrailblazerBrowserExecutableDiagnostics(),
  });

  return { browser: null, browserMode: null };
}

export async function launchTrailblazerBrowser(
  chromium: ChromiumLauncher,
  browserWsEndpoint: string,
  launchDiagnostics: string[]
): Promise<BrowserLaunchResult> {
  if (browserWsEndpoint) {
    try {
      const browser = await chromium.connect(browserWsEndpoint, {
        timeout: getTrailblazerProfileTimeoutMs(),
      });
      logTrailblazerValidation('browser-connected-remote-ws', { browserMode: 'remote-ws' });
      return { browser, browserMode: 'remote-ws' };
    } catch (error) {
      launchDiagnostics.push(`connect:${summarizeBrowserLaunchError(error)}`);
      logTrailblazerValidation('browser-remote-ws-connect-failed', {
        error: summarizeBrowserLaunchError(error),
      });
    }
  }

  if (isVercelServerlessRuntime()) {
    const sparticuzLaunch = await launchWithSparticuz(chromium, launchDiagnostics);
    if (sparticuzLaunch.browser) return sparticuzLaunch;
  }

  return launchLocalFallbacks(chromium, launchDiagnostics);
}
