import { NextRequest, NextResponse } from 'next/server';
import { authorizeTrailblazerScrapeRequest } from '@/lib/trailblazer/auth';
import { applyCorsHeaders, applyPreflightHeaders } from '@/lib/trailblazer/cors';
import { fetchTrailblazerProfileHtmlWithShowMore } from '@/lib/trailblazer/scrape';
import { validateTrailblazerProfileUrl } from '@/lib/trailblazer/url';

export const runtime = 'nodejs';
export const maxDuration = 60;

function jsonWithCors(
  request: NextRequest,
  body: unknown,
  init?: { status?: number }
): NextResponse {
  const origin = request.headers.get('origin');
  const response = NextResponse.json(body, {
    status: init?.status,
  });
  applyCorsHeaders(response.headers, origin);
  return response;
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const headers = new Headers();
  applyPreflightHeaders(headers, origin);
  return new NextResponse(null, {
    status: 204,
    headers,
  });
}

export async function POST(request: NextRequest) {
  try {
    const auth = authorizeTrailblazerScrapeRequest(request);
    if (!auth.isAuthorized) {
      return jsonWithCors(
        request,
        { ok: false, reason: auth.reason || 'Unauthorized.' },
        { status: auth.failureStatus ?? 401 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonWithCors(
        request,
        { ok: false, reason: 'Request body must be valid JSON.' },
        { status: 400 }
      );
    }

    const url =
      typeof body === 'object' && body !== null && 'url' in body
        ? String((body as { url?: unknown }).url || '').trim()
        : '';

    if (!validateTrailblazerProfileUrl(url)) {
      return jsonWithCors(
        request,
        {
          ok: false,
          reason:
            'Invalid Trailblazer profile URL. Expected https://www.salesforce.com/trailblazer/<id>.',
        },
        { status: 400 }
      );
    }

    const result = await fetchTrailblazerProfileHtmlWithShowMore(url);

    if (!result.ok) {
      return jsonWithCors(request, result, { status: 502 });
    }

    return jsonWithCors(request, result, { status: 200 });
  } catch (error) {
    const reason =
      String((error as { message?: string } | null)?.message || '').trim() ||
      'Unexpected Trailblazer scrape failure.';
    return jsonWithCors(request, { ok: false, reason }, { status: 500 });
  }
}
