const CORS_ALLOW_METHODS = 'POST, OPTIONS';
const CORS_ALLOW_HEADERS = 'Content-Type, Authorization';
const CORS_MAX_AGE = '86400';

export function normalizeOrigin(origin: string | null | undefined): string | null {
  const value = String(origin || '').trim();
  if (!value) return null;

  try {
    const parsed = new URL(value);
    // Origins never include a trailing path beyond `/`.
    if (parsed.pathname !== '/' && parsed.pathname !== '') return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function getAllowedCorsOrigins(): string[] {
  return String(process.env.TRAILBLAZER_SCRAPE_CORS_ORIGINS || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => (entry === '*' ? '*' : normalizeOrigin(entry)))
    .filter((origin): origin is string => Boolean(origin));
}

/**
 * Resolve which Origin may be echoed in Access-Control-Allow-Origin.
 *
 * - If TRAILBLAZER_SCRAPE_CORS_ORIGINS is unset/empty: reflect the request Origin
 *   (API is Bearer-protected; empty allowlist previously returned no CORS headers).
 * - If allowlist includes `*`: reflect the request Origin.
 * - Otherwise: only echo origins present in the allowlist.
 */
export function resolveCorsOrigin(requestOrigin: string | null): string | null {
  const origin = normalizeOrigin(requestOrigin);
  if (!origin) return null;

  const allowed = getAllowedCorsOrigins();
  if (allowed.length === 0 || allowed.includes('*')) return origin;
  return allowed.includes(origin) ? origin : null;
}

export function buildCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const allowedOrigin = resolveCorsOrigin(requestOrigin);
  if (!allowedOrigin) return {};

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': CORS_ALLOW_METHODS,
    'Access-Control-Allow-Headers': CORS_ALLOW_HEADERS,
    'Access-Control-Max-Age': CORS_MAX_AGE,
    Vary: 'Origin',
  };
}

export function buildPreflightHeaders(requestOrigin: string | null): Record<string, string> {
  const corsHeaders = buildCorsHeaders(requestOrigin);

  // Even when origin is not allowed, advertise methods/headers so preflight
  // debugging is clearer. Browsers still require Allow-Origin to proceed.
  return {
    'Access-Control-Allow-Methods': CORS_ALLOW_METHODS,
    'Access-Control-Allow-Headers': CORS_ALLOW_HEADERS,
    'Access-Control-Max-Age': CORS_MAX_AGE,
    Vary: 'Origin',
    ...corsHeaders,
  };
}

export function applyCorsHeaders(
  headers: Headers,
  requestOrigin: string | null
): void {
  const corsHeaders = buildCorsHeaders(requestOrigin);
  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }
}

export function applyPreflightHeaders(
  headers: Headers,
  requestOrigin: string | null
): void {
  const preflightHeaders = buildPreflightHeaders(requestOrigin);
  for (const [key, value] of Object.entries(preflightHeaders)) {
    headers.set(key, value);
  }
}
