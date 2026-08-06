export interface TrailblazerAuthResult {
  isAuthorized: boolean;
  failureStatus?: number;
  reason?: string;
}

export interface TrailblazerRequestLike {
  headers: Headers;
}

export function getTrailblazerScrapeApiKey(): string | null {
  const key = String(process.env.TRAILBLAZER_SCRAPE_API_KEY || '').trim();
  return key || null;
}

export function getBearerToken(request: TrailblazerRequestLike): string | null {
  const authorization = String(request.headers.get('authorization') || '').trim();
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = String(match[1] || '').trim();
  return token || null;
}

export function authorizeTrailblazerScrapeRequest(request: TrailblazerRequestLike): TrailblazerAuthResult {
  const apiKey = getTrailblazerScrapeApiKey();

  if (!apiKey) {
    return {
      isAuthorized: false,
      failureStatus: 503,
      reason: 'TRAILBLAZER_SCRAPE_API_KEY is not configured.',
    };
  }

  const token = getBearerToken(request);
  if (token === apiKey) return { isAuthorized: true };

  return {
    isAuthorized: false,
    failureStatus: 401,
    reason: 'Unauthorized.',
  };
}
