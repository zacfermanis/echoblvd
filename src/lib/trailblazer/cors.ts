const CORS_ALLOW_METHODS = 'POST, OPTIONS';
const CORS_ALLOW_HEADERS = 'Content-Type, Authorization';
const CORS_MAX_AGE = '86400';

export function normalizeOrigin(origin: string | null | undefined): string | null {
  const value = String(origin || '').trim();
  if (!value) return null;

  try {
    const parsed = new URL(value);
    // Origins never include a path; reject anything unexpected.
    if (parsed.pathname !== '/' && parsed.pathname !== '') return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function getAllowedCorsOrigins(): string[] {
  return String(process.env.TRAILBLAZER_SCRAPE_CORS_ORIGINS || '')
    .split(',')
    .map((origin) => normalizeOrigin(origin))
    .filter((origin): origin is string => Boolean(origin));
}

export function resolveCorsOrigin(requestOrigin: string | null): string | null {
  const origin = normalizeOrigin(requestOrigin);
  if (!origin) return null;

  const allowed = getAllowedCorsOrigins();
  if (allowed.includes('*')) return origin;
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

export function applyCorsHeaders(
  headers: Headers,
  requestOrigin: string | null
): void {
  const corsHeaders = buildCorsHeaders(requestOrigin);
  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }
}
