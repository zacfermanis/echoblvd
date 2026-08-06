/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import {
  detectLooksLikeJson,
  dedupeByNormalizedTitle,
  extractBadgeRowsFromUnknownJson,
  extractStructuredTrailblazerBadgeEntries,
  mergeStructuredBadgeEntries,
} from '@/lib/trailblazer/badge-extract';
import { authorizeTrailblazerScrapeRequest, getBearerToken } from '@/lib/trailblazer/auth';
import { isAccessDeniedHtml } from '@/lib/trailblazer/browser-context';
import { buildCorsHeaders, resolveCorsOrigin } from '@/lib/trailblazer/cors';
import { extractHtmlFromMhtmlRawContent } from '@/lib/trailblazer/mhtml';
import { validateTrailblazerProfileUrl } from '@/lib/trailblazer/url';

const originalEnv = process.env;

jest.mock('@/lib/trailblazer/scrape', () => ({
  fetchTrailblazerProfileHtmlWithShowMore: jest.fn(),
}));

describe('Trailblazer scrape helpers', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.TRAILBLAZER_SCRAPE_API_KEY;
    delete process.env.TRAILBLAZER_SCRAPE_CORS_ORIGINS;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('validateTrailblazerProfileUrl', () => {
    it('accepts valid public Trailblazer profile URLs', () => {
      expect(
        validateTrailblazerProfileUrl('https://www.salesforce.com/trailblazer/johndoe')
      ).toBe(true);
      expect(
        validateTrailblazerProfileUrl('https://www.salesforce.com/trailblazer/abc123/')
      ).toBe(true);
    });

    it('rejects invalid Trailblazer profile URLs', () => {
      expect(validateTrailblazerProfileUrl('')).toBe(false);
      expect(validateTrailblazerProfileUrl('http://www.salesforce.com/trailblazer/johndoe')).toBe(
        false
      );
      expect(validateTrailblazerProfileUrl('https://trailblazer.me/id/johndoe')).toBe(false);
      expect(
        validateTrailblazerProfileUrl('https://www.salesforce.com/trailblazer/profile')
      ).toBe(false);
      expect(
        validateTrailblazerProfileUrl('https://www.salesforce.com/trailblazer/john-doe')
      ).toBe(false);
    });
  });

  describe('auth', () => {
    it('extracts bearer tokens', () => {
      const request = {
        headers: new Headers({ authorization: 'Bearer secret-key' }),
      };
      expect(getBearerToken(request)).toBe('secret-key');
    });

    it('rejects when API key is not configured', () => {
      const result = authorizeTrailblazerScrapeRequest({
        headers: new Headers({ authorization: 'Bearer anything' }),
      });
      expect(result).toEqual({
        isAuthorized: false,
        failureStatus: 503,
        reason: 'TRAILBLAZER_SCRAPE_API_KEY is not configured.',
      });
    });

    it('rejects invalid bearer tokens', () => {
      process.env.TRAILBLAZER_SCRAPE_API_KEY = 'expected-secret';
      const result = authorizeTrailblazerScrapeRequest({
        headers: new Headers({ authorization: 'Bearer wrong' }),
      });
      expect(result).toEqual({
        isAuthorized: false,
        failureStatus: 401,
        reason: 'Unauthorized.',
      });
    });

    it('accepts a matching bearer token', () => {
      process.env.TRAILBLAZER_SCRAPE_API_KEY = 'expected-secret';
      const result = authorizeTrailblazerScrapeRequest({
        headers: new Headers({ authorization: 'Bearer expected-secret' }),
      });
      expect(result).toEqual({ isAuthorized: true });
    });
  });

  describe('cors', () => {
    it('allows configured origins', () => {
      process.env.TRAILBLAZER_SCRAPE_CORS_ORIGINS = 'https://app.example.com,https://other.test';
      expect(resolveCorsOrigin('https://app.example.com')).toBe('https://app.example.com');
      expect(resolveCorsOrigin('https://blocked.test')).toBeNull();
      expect(buildCorsHeaders('https://app.example.com')['Access-Control-Allow-Origin']).toBe(
        'https://app.example.com'
      );
    });
  });

  describe('access denied detection', () => {
    it('detects access denied HTML', () => {
      expect(isAccessDeniedHtml('<html>Access Denied</html>')).toBe(true);
      expect(isAccessDeniedHtml('<html>errors.edgesuite.net</html>')).toBe(true);
      expect(isAccessDeniedHtml('<html>Welcome Trailblazer</html>')).toBe(false);
    });
  });

  describe('mhtml extraction', () => {
    it('extracts HTML from multipart MHTML', () => {
      const mhtml = [
        'From: <Saved by Blink>',
        'Snapshot-Content-Location: https://example.com/',
        'Content-Type: multipart/related; boundary="----=_NextPart"',
        '',
        '------=_NextPart',
        'Content-Type: text/html; charset=utf-8',
        'Content-Transfer-Encoding: quoted-printable',
        '',
        '<html><body>Badge Page</body></html>',
        '------=_NextPart--',
      ].join('\r\n');

      expect(extractHtmlFromMhtmlRawContent(mhtml)).toContain('Badge Page');
    });
  });

  describe('structured badge extraction', () => {
    it('extracts badge titles from HTML anchors', () => {
      const html = `
        <a class="badge-detail-link" href="/trailhead/content/module/foo">Agentforce Basics</a>
        <dt>Points</dt><dd>200</dd>
        <dt>Date Earned</dt><dd>2024-01-15</dd>
        <a class="badge-detail-link" href="/trailhead/content/module/bar">Data Cloud Basics</a>
      `;

      const entries = extractStructuredTrailblazerBadgeEntries(html);
      expect(entries.map((entry) => entry.title)).toEqual(
        expect.arrayContaining(['Agentforce Basics', 'Data Cloud Basics'])
      );
      expect(entries[0]?.normalizedTitle).toBeTruthy();
    });

    it('extracts badge rows from nested JSON', () => {
      const rows = extractBadgeRowsFromUnknownJson({
        data: {
          badges: [
            { title: 'Agentforce Basics', points: 200, earnedDate: '2024-01-15' },
            { name: 'Data Cloud Basics', pointValue: '100' },
          ],
        },
      });

      expect(rows.length).toBeGreaterThanOrEqual(2);
      expect(rows.some((row) => row.title === 'Agentforce Basics' && row.points === 200)).toBe(
        true
      );
    });

    it('dedupes and merges structured badge entries', () => {
      const network = [
        {
          title: 'Agentforce Basics',
          normalizedTitle: 'agentforcebasics',
          points: 200,
          earnedDateIso: null,
          source: 'network_json',
        },
      ];
      const dom = [
        {
          title: 'Agentforce Basics',
          normalizedTitle: 'agentforcebasics',
          points: 200,
          earnedDateIso: '2024-01-15T00:00:00.000Z',
          source: 'dom',
        },
      ];
      const mhtml = [
        {
          title: 'Data Cloud Basics',
          normalizedTitle: 'datacloudbasics',
          points: 100,
          earnedDateIso: null,
        },
      ];

      expect(dedupeByNormalizedTitle([...network, ...dom])).toHaveLength(1);
      const merged = mergeStructuredBadgeEntries(network, dom, mhtml);
      expect(merged).toHaveLength(2);
      expect(merged.find((entry) => entry.normalizedTitle === 'agentforcebasics')?.earnedDateIso).toBe(
        '2024-01-15T00:00:00.000Z'
      );
    });

    it('detects JSON-looking responses', () => {
      expect(detectLooksLikeJson('application/json', '{"a":1}')).toBe(true);
      expect(detectLooksLikeJson('text/plain', '[{"title":"x"}]')).toBe(true);
      expect(detectLooksLikeJson('text/html', '<html></html>')).toBe(false);
    });
  });
});

describe('Trailblazer scrape API route', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.TRAILBLAZER_SCRAPE_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('rejects unauthorized requests', async () => {
    const { POST } = await import('@/app/api/trailblazer/scrape/route');
    const request = new NextRequest('http://localhost/api/trailblazer/scrape', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        url: 'https://www.salesforce.com/trailblazer/johndoe',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      reason: 'Unauthorized.',
    });
  });

  it('rejects invalid Trailblazer URLs', async () => {
    const { POST } = await import('@/app/api/trailblazer/scrape/route');
    const request = new NextRequest('http://localhost/api/trailblazer/scrape', {
      method: 'POST',
      headers: {
        authorization: 'Bearer test-api-key',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ url: 'https://example.com/not-trailblazer' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.ok).toBe(false);
    expect(String(payload.reason)).toContain('Invalid Trailblazer profile URL');
  });

  it('returns scrape success payload', async () => {
    const { fetchTrailblazerProfileHtmlWithShowMore } = await import('@/lib/trailblazer/scrape');
    (fetchTrailblazerProfileHtmlWithShowMore as jest.Mock).mockResolvedValue({
      ok: true,
      html: '<html>profile</html>',
      showMoreClicks: 1,
      attemptedShowMore: true,
      showMoreScanRounds: 1,
      showMoreCandidateCount: 2,
      structuredBadgeEntries: [],
      scrapePresenceDiagnostics: null,
      browserMode: 'remote-ws',
      browserProfile: 'primary',
      launchDiagnostics: [],
    });

    const { POST } = await import('@/app/api/trailblazer/scrape/route');
    const request = new NextRequest('http://localhost/api/trailblazer/scrape', {
      method: 'POST',
      headers: {
        authorization: 'Bearer test-api-key',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://www.salesforce.com/trailblazer/johndoe',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      html: '<html>profile</html>',
      showMoreClicks: 1,
      browserMode: 'remote-ws',
    });
  });

  it('returns 502 when scrape fails', async () => {
    const { fetchTrailblazerProfileHtmlWithShowMore } = await import('@/lib/trailblazer/scrape');
    (fetchTrailblazerProfileHtmlWithShowMore as jest.Mock).mockResolvedValue({
      ok: false,
      reason: 'Unable to launch browser',
      launchDiagnostics: ['default:missing'],
    });

    const { POST } = await import('@/app/api/trailblazer/scrape/route');
    const request = new NextRequest('http://localhost/api/trailblazer/scrape', {
      method: 'POST',
      headers: {
        authorization: 'Bearer test-api-key',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://www.salesforce.com/trailblazer/johndoe',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      reason: 'Unable to launch browser',
    });
  });
});
