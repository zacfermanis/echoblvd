import type { Browser, BrowserContext, Locator, Page, Response } from 'playwright-core';
import {
  detectLooksLikeJson,
  dedupeByNormalizedTitle,
  extractBadgeRowsFromUnknownJson,
  extractStructuredTrailblazerBadgeEntries,
  mergeStructuredBadgeEntries,
} from './badge-extract';
import {
  buildTrailblazerBrowserContextProfiles,
  buildTrailblazerExtraHttpHeaders,
  DEFAULT_TRAILBLAZER_VIEWPORT,
  getTrailblazerProfileTimeoutMs,
  isAccessDeniedHtml,
  summarizeBrowserLaunchError,
} from './browser-context';
import { launchTrailblazerBrowser } from './browser-launch';
import { logTrailblazerValidation } from './logging';
import { extractHtmlFromMhtmlRawContent } from './mhtml';
import type {
  HydrationDiagnostics,
  PagePresenceDiagnostics,
  ScrapePresenceDiagnostics,
  ScrapeTimelineEntry,
  ShowMoreRoundSummary,
  StructuredBadgeEntry,
  TrailblazerBrowserProfile,
  TrailblazerScrapeResult,
} from './types';

async function safeReadResponseText(response: Response): Promise<string | null> {
  try {
    return await response.text();
  } catch {
    return null;
  }
}

function extractAnchorBadgeRow(anchor: HTMLAnchorElement): StructuredBadgeEntry {
  function normalizeText(value: unknown) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parsePointsText(value: unknown) {
    const match = String(value || '')
      .replace(/,/g, '')
      .match(/\d+/);
    if (!match) return null;
    const parsed = Number.parseInt(match[0], 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }

  function parseDateText(value: unknown) {
    const raw = normalizeText(value);
    if (!raw) return null;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
  }

  function findSiblingDdNode(dtNode: Element) {
    let ddNode = dtNode.nextElementSibling;
    while (ddNode && ddNode.tagName && ddNode.tagName.toLowerCase() !== 'dd') {
      ddNode = ddNode.nextElementSibling;
    }
    return ddNode;
  }

  function extractDtDdFields(container: Element) {
    let points: number | null = null;
    let earnedDateIso: string | null = null;
    const dtNodes = Array.from(container.querySelectorAll('dt'));
    for (const dtNode of dtNodes) {
      const label = normalizeText(dtNode.textContent).toLowerCase();
      const ddNode = findSiblingDdNode(dtNode);
      if (label.includes('date') && ddNode && !earnedDateIso) {
        earnedDateIso = parseDateText(ddNode.textContent);
      }
      if (!label.includes('point')) continue;
      if (ddNode) points = parsePointsText(ddNode.textContent);
      if (points !== null) break;
    }
    return { points, earnedDateIso };
  }

  const title = normalizeText(anchor.textContent || anchor.getAttribute('title') || '');
  const container = anchor.closest('article, section, div') || anchor.parentElement;
  let points: number | null = null;
  let earnedDateIso: string | null = null;

  if (container) {
    const fields = extractDtDdFields(container);
    points = fields.points;
    earnedDateIso = fields.earnedDateIso;
  }

  return {
    title,
    normalizedTitle: normalizeText(title)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ''),
    points,
    earnedDateIso,
  };
}

function extractShadowBadgeRowsFromDom(): StructuredBadgeEntry[] {
  function normalizeText(value: unknown) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parsePointsText(value: unknown) {
    const match = String(value || '')
      .replace(/,/g, '')
      .match(/\d+/);
    if (!match) return null;
    const parsed = Number.parseInt(match[0], 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }

  function parseDateText(value: unknown) {
    const raw = normalizeText(value);
    if (!raw) return null;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
  }

  function traverseShadowRoots() {
    const roots: Array<Document | ShadowRoot> = [document];
    const seenRoots = new Set<Document | ShadowRoot>([document]);
    for (let index = 0; index < roots.length; index += 1) {
      const root = roots[index];
      const hosts = root.querySelectorAll ? root.querySelectorAll('*') : [];
      for (const host of Array.from(hosts)) {
        if (host.shadowRoot && !seenRoots.has(host.shadowRoot)) {
          seenRoots.add(host.shadowRoot);
          roots.push(host.shadowRoot);
        }
      }
    }
    return roots;
  }

  function findSiblingDdNode(dtNode: Element) {
    let ddNode = dtNode.nextElementSibling;
    while (ddNode && ddNode.tagName && ddNode.tagName.toLowerCase() !== 'dd') {
      ddNode = ddNode.nextElementSibling;
    }
    return ddNode;
  }

  function extractAnchorFields(container: Element) {
    let points: number | null = null;
    let earnedDateIso: string | null = null;
    const dtNodes = Array.from(container.querySelectorAll('dt'));
    for (const dtNode of dtNodes) {
      const label = normalizeText(dtNode.textContent).toLowerCase();
      const ddNode = findSiblingDdNode(dtNode);
      if (label.includes('date') && ddNode && !earnedDateIso) {
        earnedDateIso = parseDateText(ddNode.textContent);
      }
      if (!label.includes('point')) continue;
      if (ddNode) points = parsePointsText(ddNode.textContent);
      if (points !== null) break;
    }
    return { points, earnedDateIso };
  }

  function collectAnchorRow(anchor: Element): StructuredBadgeEntry | null {
    const title = normalizeText(anchor.textContent || anchor.getAttribute('title') || '');
    if (!title) return null;
    const container = anchor.closest('article, section, div') || anchor.parentElement;
    const { points, earnedDateIso } = container
      ? extractAnchorFields(container)
      : { points: null, earnedDateIso: null };
    return {
      title,
      normalizedTitle: normalizeText(title)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ''),
      points,
      earnedDateIso,
      source: 'shadow_dom',
    };
  }

  function deduplicateRows(rows: StructuredBadgeEntry[]) {
    const deduped: StructuredBadgeEntry[] = [];
    const seenTitles = new Set<string>();
    for (const row of rows) {
      const key = String(row?.normalizedTitle || '').trim();
      if (!key || seenTitles.has(key)) continue;
      seenTitles.add(key);
      deduped.push(row);
      if (deduped.length >= 200) break;
    }
    return deduped;
  }

  const roots = traverseShadowRoots();
  const collectedRows: StructuredBadgeEntry[] = [];

  for (const root of roots) {
    if (!root.querySelectorAll) continue;
    const shadowAnchors = root.querySelectorAll('a.badge-detail-link, a[href*="/trailhead/"]');
    for (const anchor of Array.from(shadowAnchors)) {
      const row = collectAnchorRow(anchor);
      if (row) collectedRows.push(row);
    }
  }

  return deduplicateRows(collectedRows);
}

async function extractBadgeDetailsFromDom(page: Page): Promise<StructuredBadgeEntry[]> {
  const anchors = page.locator('a.badge-detail-link');
  const count = await anchors.count();
  const rows: StructuredBadgeEntry[] = [];

  for (let index = 0; index < count; index += 1) {
    const row = await anchors.nth(index).evaluate(extractAnchorBadgeRow);
    if (row?.title) rows.push(row);
  }

  if (rows.length === 0) {
    const shadowRows = await page.evaluate(extractShadowBadgeRowsFromDom);
    if (Array.isArray(shadowRows) && shadowRows.length > 0) rows.push(...shadowRows);
  }

  return rows;
}

function collectTrailblazerPagePresenceDiagnostics(): PagePresenceDiagnostics {
  function traverseShadowRoots() {
    const roots: Array<Document | ShadowRoot> = [document];
    const seenRoots = new Set<Document | ShadowRoot>([document]);
    for (let index = 0; index < roots.length; index += 1) {
      const root = roots[index];
      const hosts = root.querySelectorAll ? root.querySelectorAll('*') : [];
      for (const host of Array.from(hosts)) {
        if (host.shadowRoot && !seenRoots.has(host.shadowRoot)) {
          seenRoots.add(host.shadowRoot);
          roots.push(host.shadowRoot);
        }
      }
    }
    return roots;
  }

  function countShadowElements(roots: Array<Document | ShadowRoot>) {
    let shadowButtonCount = 0;
    let shadowShowMoreTextCount = 0;
    let shadowBadgeDetailLinkCount = 0;
    let shadowTextLength = 0;
    for (const root of roots) {
      if (!root.querySelectorAll) continue;
      shadowTextLength += String(root.textContent || '').length;
      const rootButtons = Array.from(root.querySelectorAll('button, a, span, div'));
      shadowButtonCount += root.querySelectorAll('button').length;
      shadowBadgeDetailLinkCount += root.querySelectorAll('a.badge-detail-link').length;
      for (const node of rootButtons) {
        if (/show\s*more/i.test(String(node.textContent || '').trim())) {
          shadowShowMoreTextCount += 1;
        }
      }
    }
    return {
      shadowButtonCount,
      shadowShowMoreTextCount,
      shadowBadgeDetailLinkCount,
      shadowTextLength,
    };
  }

  const text = String(document.body?.innerText || '');
  const countRegex = (pattern: RegExp) => {
    const matches = text.match(pattern);
    return Array.isArray(matches) ? matches.length : 0;
  };
  const mainContent = document.querySelector('#main-content');
  const roots = traverseShadowRoots();
  const shadowCounts = countShadowElements(roots);

  return {
    mainContentExists: Boolean(mainContent),
    mainContentChildCount: mainContent?.childElementCount || 0,
    mainContentTextLength: String(mainContent?.textContent || '').trim().length,
    bodyTextLength: text.length,
    badgeDetailLinkCount: document.querySelectorAll('a.badge-detail-link').length,
    badgeContainerCount: document.querySelectorAll('lwc-tbui-card-footer-link').length,
    buttonCount: document.querySelectorAll('button').length,
    showMoreTextCount: countRegex(/show\s*more/gi),
    badgeTextCount: countRegex(/badge/gi),
    pointsTextCount: countRegex(/points?/gi),
    shadowRootCount: Math.max(roots.length - 1, 0),
    ...shadowCounts,
  };
}

function performShadowDomShowMoreClick(): {
  clicked: boolean;
  candidateCount: number;
  visibleCandidateCount: number;
  shadowRootCount: number;
} {
  function traverseShadowRoots() {
    const roots: Array<Document | ShadowRoot> = [document];
    const seenRoots = new Set<Document | ShadowRoot>([document]);
    for (let index = 0; index < roots.length; index += 1) {
      const root = roots[index];
      const hosts = root.querySelectorAll ? root.querySelectorAll('*') : [];
      for (const host of Array.from(hosts)) {
        if (host.shadowRoot && !seenRoots.has(host.shadowRoot)) {
          seenRoots.add(host.shadowRoot);
          roots.push(host.shadowRoot);
        }
      }
    }
    return roots;
  }

  function collectShowMoreCandidates(roots: Array<Document | ShadowRoot>) {
    const candidates: Element[] = [];
    for (const root of roots) {
      if (!root.querySelectorAll) continue;
      const nodes = root.querySelectorAll('button, a, div[role="button"], span[role="button"]');
      for (const node of Array.from(nodes)) {
        if (!/show\s*more/i.test(String(node.textContent || '').replace(/\s+/g, ' ').trim())) {
          continue;
        }
        candidates.push(node);
      }
    }
    return candidates;
  }

  function clickFirstVisible(candidates: Element[]) {
    let visibleCandidateCount = 0;
    for (const node of candidates.slice(0, 8)) {
      const rect = node.getBoundingClientRect();
      if (!(rect.width > 0 && rect.height > 0)) continue;
      visibleCandidateCount += 1;
      try {
        node.scrollIntoView({ block: 'center', inline: 'nearest' });
        node.dispatchEvent(
          new MouseEvent('click', { bubbles: true, cancelable: true, composed: true })
        );
        return { clicked: true, visibleCandidateCount };
      } catch {
        // continue
      }
    }
    return { clicked: false, visibleCandidateCount };
  }

  const roots = traverseShadowRoots();
  const candidates = collectShowMoreCandidates(roots);
  const { clicked, visibleCandidateCount } = clickFirstVisible(candidates);

  return {
    clicked,
    candidateCount: candidates.length,
    visibleCandidateCount,
    shadowRootCount: Math.max(roots.length - 1, 0),
  };
}

async function runHydrationPhase(
  page: Page,
  timeout: number,
  collectFn: () => Promise<PagePresenceDiagnostics>,
  hydrationDiagnostics: HydrationDiagnostics,
  recordFn: (phase: string, details?: Record<string, unknown>) => void,
  options: { fastFail?: boolean } = {}
): Promise<void> {
  const hydrationStart = Date.now();
  const mainContentTimeout = options.fastFail ? 1500 : Math.min(timeout, 5000);
  const childrenTimeout = options.fastFail ? 1500 : Math.min(timeout, 8000);
  const maxProbeRounds = options.fastFail ? 1 : 4;

  try {
    await page.waitForSelector('#main-content', {
      state: 'attached',
      timeout: mainContentTimeout,
    });
    hydrationDiagnostics.waitForMainContentSucceeded = true;
  } catch {
    hydrationDiagnostics.waitForMainContentSucceeded = false;
  }

  const childrenStart = Date.now();

  try {
    await page.waitForFunction(
      () => {
        const main = document.querySelector('#main-content');
        return Boolean(main && main.childElementCount > 0);
      },
      { timeout: childrenTimeout }
    );
    hydrationDiagnostics.waitForMainContentChildrenSucceeded = true;
  } catch {
    hydrationDiagnostics.waitForMainContentChildrenSucceeded = false;
  }

  hydrationDiagnostics.waitedForMainContentChildrenMs = Date.now() - childrenStart;
  hydrationDiagnostics.waitedForMainContentMs = Date.now() - hydrationStart;
  recordFn('main-content-wait-complete', {
    waitForMainContentSucceeded: hydrationDiagnostics.waitForMainContentSucceeded,
    waitedForMainContentMs: hydrationDiagnostics.waitedForMainContentMs,
    waitForMainContentChildrenSucceeded: hydrationDiagnostics.waitForMainContentChildrenSucceeded,
    waitedForMainContentChildrenMs: hydrationDiagnostics.waitedForMainContentChildrenMs,
    fastFail: Boolean(options.fastFail),
  });

  for (let probeRound = 0; probeRound < maxProbeRounds; probeRound += 1) {
    hydrationDiagnostics.hydrationProbeRounds += 1;
    const probe = await collectFn();

    if (!hydrationDiagnostics.preScanProbe) hydrationDiagnostics.preScanProbe = probe;

    recordFn('hydration-probe-round', {
      probeRound: probeRound + 1,
      badgeDetailLinkCount: probe.badgeDetailLinkCount,
      showMoreTextCount: probe.showMoreTextCount,
      mainContentTextLength: probe.mainContentTextLength,
    });

    if (
      probe.badgeDetailLinkCount > 0 ||
      probe.showMoreTextCount > 0 ||
      probe.mainContentTextLength > 200
    ) {
      break;
    }

    if (options.fastFail) break;
    await page.waitForTimeout(500 + probeRound * 250).catch(() => null);
  }
}

async function applyStealthInitScripts(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });

    const windowWithChrome = window as Window & {
      chrome?: { runtime?: Record<string, unknown> };
    };
    const existingChrome = windowWithChrome.chrome || {};
    windowWithChrome.chrome = {
      ...existingChrome,
      runtime: existingChrome.runtime || {},
    };

    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });

    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });
  });
}

async function tryLocatorEntryClick(
  entry: { label: string; locator: Locator },
  roundSummary: ShowMoreRoundSummary
): Promise<{ clicked: boolean; addedCount: number }> {
  const count = await entry.locator.count();
  roundSummary.candidateCounts[entry.label] = count;
  if (count === 0) return { clicked: false, addedCount: 0 };

  const maxToTry = Math.min(count, 5);

  for (let index = 0; index < maxToTry; index += 1) {
    const candidate = entry.locator.nth(index);
    const visible = await candidate.isVisible().catch(() => false);
    if (!visible) continue;

    roundSummary.visibleCandidateCount += 1;

    try {
      await candidate.scrollIntoViewIfNeeded({ timeout: 1000 }).catch(() => null);
      await candidate.click({ timeout: 2000, force: true });
      return { clicked: true, addedCount: count };
    } catch {
      // continue
    }
  }

  return { clicked: false, addedCount: count };
}

async function runShowMoreAttempt(
  page: Page,
  profile: TrailblazerBrowserProfile,
  hydrationDiagnostics: HydrationDiagnostics,
  recordFn: (phase: string, details?: Record<string, unknown>) => void
): Promise<{
  showMoreClicks: number;
  showMoreScanAttempted: boolean;
  showMoreScanRounds: number;
  showMoreCandidateCount: number;
}> {
  const showMoreScanAttempted = true;
  const showMoreScanRounds = 1;
  let showMoreClicks = 0;
  let showMoreCandidateCount = 0;

  const candidateLocators = [
    { label: 'role-button-show-more', locator: page.getByRole('button', { name: /show more/i }) },
    { label: 'button-text-show-more', locator: page.locator('button:has-text("Show More")') },
    { label: 'card-footer-button', locator: page.locator('lwc-tbui-card-footer-link button') },
    {
      label: 'card-footer-link-text',
      locator: page.locator('lwc-tbui-card-footer-link:has-text("Show More")'),
    },
  ];

  const roundSummary: ShowMoreRoundSummary = {
    round: 1,
    candidateCounts: {},
    visibleCandidateCount: 0,
    clicked: false,
  };
  let clicked = false;

  for (const entry of candidateLocators) {
    const result = await tryLocatorEntryClick(entry, roundSummary);
    showMoreCandidateCount += result.addedCount;
    if (result.clicked) {
      clicked = true;
      break;
    }
  }

  if (!clicked) {
    const shadowDomClickResult = await page.evaluate(performShadowDomShowMoreClick);
    roundSummary.candidateCounts['shadow-dom-show-more'] = shadowDomClickResult.candidateCount;
    roundSummary.visibleCandidateCount += shadowDomClickResult.visibleCandidateCount;
    roundSummary.shadowRootCount = shadowDomClickResult.shadowRootCount;
    if (shadowDomClickResult.clicked) clicked = true;
  }

  roundSummary.clicked = clicked;
  hydrationDiagnostics.scanRoundSummaries.push(roundSummary);

  if (!clicked) {
    recordFn('show-more-round-no-click', { round: 1, roundSummary });
    logTrailblazerValidation('show-more-scan-no-click', {
      attempt: 0,
      showMoreClicks,
      showMoreScanAttempted,
      showMoreScanRounds,
      showMoreCandidateCount,
      roundSummary,
      profile: profile.name,
    });
  } else {
    showMoreClicks += 1;
    recordFn('show-more-round-clicked', { round: 1, showMoreClicks });
    logTrailblazerValidation('show-more-clicked', {
      attempt: 0,
      showMoreClicks,
      showMoreScanAttempted,
      showMoreScanRounds,
      showMoreCandidateCount,
      roundSummary,
      profile: profile.name,
    });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => null);
    await page.waitForTimeout(500).catch(() => null);
  }

  return {
    showMoreClicks,
    showMoreScanAttempted,
    showMoreScanRounds,
    showMoreCandidateCount,
  };
}

async function captureMhtmlBadges(
  context: BrowserContext,
  page: Page
): Promise<{ mhtmlStructuredBadgeEntries: StructuredBadgeEntry[]; cdpMhtmlCaptured: boolean }> {
  let mhtmlStructuredBadgeEntries: StructuredBadgeEntry[] = [];
  let cdpMhtmlCaptured = false;

  try {
    const cdpSession = await context.newCDPSession(page);
    const snapshot = await cdpSession.send('Page.captureSnapshot', { format: 'mhtml' });
    await cdpSession.detach().catch(() => null);

    if (snapshot?.data) {
      const mhtmlHtml = extractHtmlFromMhtmlRawContent(snapshot.data);
      if (mhtmlHtml) {
        mhtmlStructuredBadgeEntries = extractStructuredTrailblazerBadgeEntries(mhtmlHtml);
        cdpMhtmlCaptured = true;
      }
    }
  } catch (cdpError) {
    logTrailblazerValidation('cdp-mhtml-capture-failed', {
      error: String((cdpError as { message?: string } | null)?.message || cdpError || 'Unknown CDP error'),
    });
  }

  return { mhtmlStructuredBadgeEntries, cdpMhtmlCaptured };
}

function buildSuccessProfileResult(
  profileResult: {
    html: string;
    showMoreClicks: number;
    showMoreScanAttempted: boolean;
    showMoreScanRounds: number;
    showMoreCandidateCount: number;
    structuredBadgeEntries: StructuredBadgeEntry[];
    scrapePresenceDiagnostics: ScrapePresenceDiagnostics;
    browserProfile: string;
  },
  { browserMode, launchDiagnostics }: { browserMode: string | null; launchDiagnostics: string[] }
): TrailblazerScrapeResult {
  return {
    ok: true,
    html: profileResult.html,
    showMoreClicks: profileResult.showMoreClicks,
    attemptedShowMore: Boolean(profileResult.showMoreScanAttempted),
    showMoreScanRounds: profileResult.showMoreScanRounds || 0,
    showMoreCandidateCount: profileResult.showMoreCandidateCount || 0,
    structuredBadgeEntries: profileResult.structuredBadgeEntries,
    scrapePresenceDiagnostics: profileResult.scrapePresenceDiagnostics,
    browserMode,
    browserProfile: profileResult.browserProfile,
    launchDiagnostics,
  };
}

function buildFallbackAccessDeniedResult(
  lastProfileResult: {
    html?: string;
    showMoreClicks?: number;
    showMoreScanAttempted?: boolean;
    showMoreScanRounds?: number;
    showMoreCandidateCount?: number;
    structuredBadgeEntries?: StructuredBadgeEntry[];
    scrapePresenceDiagnostics?: ScrapePresenceDiagnostics | null;
    browserProfile?: string;
  } | null,
  { browserMode, launchDiagnostics }: { browserMode: string | null; launchDiagnostics: string[] }
): TrailblazerScrapeResult {
  const result = lastProfileResult || {};

  return {
    ok: true,
    html: result.html || '',
    showMoreClicks: result.showMoreClicks || 0,
    attemptedShowMore: Boolean(result.showMoreScanAttempted),
    showMoreScanRounds: result.showMoreScanRounds || 0,
    showMoreCandidateCount: result.showMoreCandidateCount || 0,
    structuredBadgeEntries: result.structuredBadgeEntries || [],
    scrapePresenceDiagnostics: result.scrapePresenceDiagnostics || null,
    browserMode,
    browserProfile: result.browserProfile || 'unknown',
    accessDeniedHtml: true,
    launchDiagnostics,
  };
}

export async function fetchTrailblazerProfileHtmlWithShowMore(
  trailblazerProfileUrl: string
): Promise<TrailblazerScrapeResult> {
  let browser: Browser | null = null;
  let browserMode: string | null = null;
  const launchDiagnostics: string[] = [];

  logTrailblazerValidation('browser-scrape-start', { trailblazerProfileUrl });

  try {
    const playwright = await import('playwright-core');
    const chromium = playwright?.chromium;

    if (!chromium) {
      return {
        ok: false,
        reason: 'Playwright chromium launcher is unavailable.',
      };
    }

    const browserWsEndpoint = String(process.env.PLAYWRIGHT_WS_ENDPOINT || '').trim();
    const launched = await launchTrailblazerBrowser(chromium, browserWsEndpoint, launchDiagnostics);
    browser = launched.browser;
    browserMode = launched.browserMode;

    if (!browser) {
      return {
        ok: false,
        reason:
          'Unable to launch browser for Trailblazer scraping. Configure PLAYWRIGHT_WS_ENDPOINT or PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH.',
        launchDiagnostics,
      };
    }

    const timeout = getTrailblazerProfileTimeoutMs();

    const runProfileAttempt = async (profile: TrailblazerBrowserProfile) => {
      const context = await browser!.newContext({
        userAgent: profile.userAgent,
        locale: profile.acceptLanguage.split(',')[0] || 'en-US',
        timezoneId: profile.timezoneId,
        viewport: DEFAULT_TRAILBLAZER_VIEWPORT,
        extraHTTPHeaders: buildTrailblazerExtraHttpHeaders(profile.acceptLanguage),
      });
      await applyStealthInitScripts(context);
      const page = await context.newPage();
      const networkBadgeEntries: StructuredBadgeEntry[] = [];
      const browserRuntimeDiagnostics = { consoleErrors: [] as Array<{ type: string; text: string }>, pageErrors: [] as string[] };
      const networkCaptureDiagnostics = {
        responseCount: 0,
        jsonResponseCount: 0,
        candidateJsonResponseCount: 0,
        parsedBadgeRowsBeforeDedup: 0,
        parseErrors: 0,
      };

      const onResponse = async (response: Response) => {
        networkCaptureDiagnostics.responseCount += 1;
        const url = String(response.url());
        if (!/(trailhead|trailblazer|badge|graphql|profile)/i.test(url)) return;
        const contentType = String(response.headers()?.['content-type'] || '').toLowerCase();
        const text = await safeReadResponseText(response);
        if (text === null) {
          networkCaptureDiagnostics.parseErrors += 1;
          return;
        }
        if (!text || text.length > 400000) return;
        if (!detectLooksLikeJson(contentType, text)) return;
        networkCaptureDiagnostics.jsonResponseCount += 1;
        networkCaptureDiagnostics.candidateJsonResponseCount += 1;
        try {
          const rows = extractBadgeRowsFromUnknownJson(JSON.parse(text), [], 0);
          if (rows.length > 0) {
            networkBadgeEntries.push(...rows);
            networkCaptureDiagnostics.parsedBadgeRowsBeforeDedup += rows.length;
          }
        } catch {
          networkCaptureDiagnostics.parseErrors += 1;
        }
      };

      const onConsole = (message: { type: () => string; text: () => string }) => {
        if (message.type() !== 'error' && message.type() !== 'warning') return;
        if (browserRuntimeDiagnostics.consoleErrors.length >= 12) return;
        browserRuntimeDiagnostics.consoleErrors.push({
          type: message.type(),
          text: String(message.text() || '').slice(0, 500),
        });
      };

      const onPageError = (error: Error) => {
        if (browserRuntimeDiagnostics.pageErrors.length >= 12) return;
        browserRuntimeDiagnostics.pageErrors.push(String(error?.message || '').slice(0, 500));
      };

      page.on('response', onResponse);
      page.on('console', onConsole);
      page.on('pageerror', onPageError);

      try {
        const navigationStartedAt = Date.now();
        await page.goto(trailblazerProfileUrl, { waitUntil: 'domcontentloaded', timeout });
        const scrapeTimeline: ScrapeTimelineEntry[] = [];
        const recordTimeline = (phase: string, details: Record<string, unknown> = {}) => {
          const entry = { phase, elapsedMs: Date.now() - navigationStartedAt, ...details };
          scrapeTimeline.push(entry);
          logTrailblazerValidation('browser-scan-phase', {
            profile: profile.name,
            browserMode,
            ...entry,
          });
        };

        logTrailblazerValidation('browser-goto-complete', {
          requestedUrl: trailblazerProfileUrl,
          resolvedUrl: page.url(),
          browserMode,
          profile: profile.name,
        });

        const collectPresenceDiagnostics = async () =>
          page.evaluate(collectTrailblazerPagePresenceDiagnostics);
        recordTimeline('post-goto');

        // Fail fast when Akamai/Salesforce already served an access-denied interstitial.
        const earlyHtml = await page.content();
        const earlyAccessDenied = isAccessDeniedHtml(earlyHtml);
        if (earlyAccessDenied) {
          recordTimeline('early-access-denied');
          logTrailblazerValidation('browser-early-access-denied', {
            profile: profile.name,
            browserMode,
            htmlLength: earlyHtml.length,
          });
        }

        const hydrationDiagnostics: HydrationDiagnostics = {
          waitedForMainContentMs: 0,
          waitForMainContentSucceeded: false,
          hydrationProbeRounds: 0,
          preScanProbe: null,
          postScanProbe: null,
          scanRoundSummaries: [],
        };

        await runHydrationPhase(
          page,
          timeout,
          collectPresenceDiagnostics,
          hydrationDiagnostics,
          recordTimeline,
          { fastFail: earlyAccessDenied }
        );

        const showMoreStats = earlyAccessDenied
          ? {
              showMoreClicks: 0,
              showMoreScanAttempted: false,
              showMoreScanRounds: 0,
              showMoreCandidateCount: 0,
            }
          : await runShowMoreAttempt(page, profile, hydrationDiagnostics, recordTimeline);

        hydrationDiagnostics.postScanProbe = await collectPresenceDiagnostics();
        recordTimeline('post-scan-probe', {
          badgeDetailLinkCount: hydrationDiagnostics.postScanProbe.badgeDetailLinkCount,
          showMoreTextCount: hydrationDiagnostics.postScanProbe.showMoreTextCount,
          bodyTextLength: hydrationDiagnostics.postScanProbe.bodyTextLength,
        });

        const { mhtmlStructuredBadgeEntries, cdpMhtmlCaptured } = earlyAccessDenied
          ? { mhtmlStructuredBadgeEntries: [] as StructuredBadgeEntry[], cdpMhtmlCaptured: false }
          : await captureMhtmlBadges(context, page);
        const html = earlyAccessDenied ? earlyHtml : await page.content();
        const domStructuredBadgeEntries = earlyAccessDenied
          ? []
          : await extractBadgeDetailsFromDom(page);
        const networkStructuredBadgeEntries = dedupeByNormalizedTitle(networkBadgeEntries);
        const structuredBadgeEntries = mergeStructuredBadgeEntries(
          networkStructuredBadgeEntries,
          domStructuredBadgeEntries,
          mhtmlStructuredBadgeEntries
        );
        const accessDeniedHtml = earlyAccessDenied || isAccessDeniedHtml(html);
        const scrapePresenceDiagnostics: ScrapePresenceDiagnostics = {
          ...hydrationDiagnostics,
          scrapeTimeline,
          domStructuredBadgeEntryCount: domStructuredBadgeEntries.length,
          networkStructuredBadgeEntryCount: networkStructuredBadgeEntries.length,
          mhtmlStructuredBadgeEntryCount: mhtmlStructuredBadgeEntries.length,
          cdpMhtmlCaptured,
          networkCaptureDiagnostics,
          browserRuntimeDiagnostics,
        };

        logTrailblazerValidation('browser-scrape-complete', {
          showMoreClicks: showMoreStats.showMoreClicks,
          showMoreScanAttempted: showMoreStats.showMoreScanAttempted,
          showMoreScanRounds: showMoreStats.showMoreScanRounds,
          showMoreCandidateCount: showMoreStats.showMoreCandidateCount,
          structuredBadgeEntriesCount: structuredBadgeEntries.length,
          domStructuredBadgeEntryCount: domStructuredBadgeEntries.length,
          networkStructuredBadgeEntryCount: networkStructuredBadgeEntries.length,
          mhtmlStructuredBadgeEntryCount: mhtmlStructuredBadgeEntries.length,
          cdpMhtmlCaptured,
          accessDeniedHtml,
          scrapePresenceDiagnostics,
          profile: profile.name,
        });

        return {
          html,
          showMoreClicks: showMoreStats.showMoreClicks,
          showMoreScanAttempted: showMoreStats.showMoreScanAttempted,
          showMoreScanRounds: showMoreStats.showMoreScanRounds,
          showMoreCandidateCount: showMoreStats.showMoreCandidateCount,
          structuredBadgeEntries,
          scrapePresenceDiagnostics,
          accessDeniedHtml,
          browserProfile: profile.name,
        };
      } finally {
        page.off('response', onResponse);
        page.off('console', onConsole);
        page.off('pageerror', onPageError);
        await context.close().catch(() => null);
      }
    };

    const profiles = buildTrailblazerBrowserContextProfiles();
    let lastProfileResult: Awaited<ReturnType<typeof runProfileAttempt>> | null = null;

    for (const profile of profiles) {
      const profileResult = await runProfileAttempt(profile);
      lastProfileResult = profileResult;
      if (!profileResult.accessDeniedHtml) {
        return buildSuccessProfileResult(profileResult, { browserMode, launchDiagnostics });
      }
      logTrailblazerValidation('browser-profile-access-denied', {
        profile: profile.name,
        browserMode,
      });
    }

    return buildFallbackAccessDeniedResult(lastProfileResult, { browserMode, launchDiagnostics });
  } catch (error) {
    logTrailblazerValidation('browser-scrape-error', {
      error: summarizeBrowserLaunchError(error),
      launchDiagnostics,
    });
    return {
      ok: false,
      reason: summarizeBrowserLaunchError(error) || 'Browser-assisted Trailblazer scrape failed.',
      launchDiagnostics,
    };
  } finally {
    if (browser) {
      logTrailblazerValidation('browser-close', { browserMode });
      await browser.close().catch(() => null);
    }
  }
}
