import { NextRequest, NextResponse } from 'next/server';
import { applyCorsHeaders, applyPreflightHeaders } from '@/lib/trailblazer/cors';

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');

  if (request.method === 'OPTIONS') {
    const headers = new Headers();
    applyPreflightHeaders(headers, origin);
    return new NextResponse(null, { status: 204, headers });
  }

  const response = NextResponse.next();
  applyCorsHeaders(response.headers, origin);
  return response;
}

export const config = {
  matcher: ['/api/trailblazer/scrape', '/api/trailblazer/scrape/(.*)'],
};
