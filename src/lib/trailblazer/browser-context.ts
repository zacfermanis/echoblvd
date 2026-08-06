import type { TrailblazerBrowserProfile } from './types';

export const DEFAULT_TRAILBLAZER_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';
export const DEFAULT_TRAILBLAZER_ACCEPT_LANGUAGE = 'en-US,en;q=0.9';
export const DEFAULT_TRAILBLAZER_TIMEZONE = 'America/New_York';
export const DEFAULT_TRAILBLAZER_PROFILE_TIMEOUT_MS = 45000;

function parsePositiveInteger(value: unknown, defaultValue: number): number {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return defaultValue;
  return parsed;
}

export function getTrailblazerProfileTimeoutMs(): number {
  return parsePositiveInteger(
    process.env.TRAILBLAZER_PROFILE_TIMEOUT_MS,
    DEFAULT_TRAILBLAZER_PROFILE_TIMEOUT_MS
  );
}

export function buildTrailblazerBrowserContextProfiles(): TrailblazerBrowserProfile[] {
  const customUserAgent = String(process.env.TRAILBLAZER_BROWSER_USER_AGENT || '').trim();
  const customAcceptLanguage = String(process.env.TRAILBLAZER_BROWSER_ACCEPT_LANGUAGE || '').trim();
  const customTimezone = String(process.env.TRAILBLAZER_BROWSER_TIMEZONE || '').trim();

  const primaryProfile: TrailblazerBrowserProfile = {
    name: 'primary',
    userAgent: customUserAgent || DEFAULT_TRAILBLAZER_USER_AGENT,
    acceptLanguage: customAcceptLanguage || DEFAULT_TRAILBLAZER_ACCEPT_LANGUAGE,
    timezoneId: customTimezone || DEFAULT_TRAILBLAZER_TIMEZONE,
  };

  const fallbackProfile: TrailblazerBrowserProfile = {
    name: 'fallback-windows-ua',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
    acceptLanguage: primaryProfile.acceptLanguage,
    timezoneId: primaryProfile.timezoneId,
  };

  return [primaryProfile, fallbackProfile];
}

export function isAccessDeniedHtml(html: unknown): boolean {
  const normalized = String(html || '').toLowerCase();
  if (!normalized) return false;

  return (
    normalized.includes('access denied') ||
    normalized.includes("you don't have permission") ||
    normalized.includes('errors.edgesuite.net')
  );
}

export function summarizeBrowserLaunchError(error: unknown): string {
  const message = String((error as { message?: string } | null)?.message || '').trim();
  if (!message) return 'Unknown browser launch error.';

  const collapsed = message
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(' | ');

  return collapsed || 'Unknown browser launch error.';
}

export function isVercelServerlessRuntime(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}
