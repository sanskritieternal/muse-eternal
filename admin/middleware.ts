import { NextResponse, type NextRequest } from 'next/server';

/**
 * Presence-only gate: the API enforces token validity and capabilities.
 * An absent access cookie sends staff pages to /login; a present but
 * expired token fails at the API, whose 401 triggers a refresh retry
 * in the proxy (see app/api/[...path]/route.ts).
 */
export function middleware(request: NextRequest) {
  const access = request.cookies.get('access_token')?.value;
  if (!access) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/glossary/:path*'],
};
