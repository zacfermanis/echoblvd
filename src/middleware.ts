import { NextRequest, NextResponse } from 'next/server';
import { applyCorsHeaders, resolveCorsOrigin } from '@/lib/trailblazer/cors';

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const isAllowedOrigin = Boolean(resolveCorsOrigin(origin));

  if (request.method === 'OPTIONS') {
    const headers = new Headers();
    applyCorsHeaders(headers, origin);

    // Always advertise preflight allowances when origin is allowed.
    // When not allowed, return 204 without ACAO so the browser blocks correctly.
    if (!isAllowedOrigin) {
      return new NextResponse(null, { status: 204 });
    }

    return new NextResponse(null, { status: 204, headers });
  }

  const response = NextResponse.next();
  if (isAllowedOrigin) {
    applyCorsHeaders(response.headers, origin);
  }

  return response;
}

export const config = {
  matcher: '/api/trailblazer/scrape',
};
