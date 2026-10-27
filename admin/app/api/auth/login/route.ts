import { NextResponse } from 'next/server';
import {
  ACCESS_COOKIE,
  API_URL,
  REFRESH_COOKIE,
} from '@/lib/server';

/** POST /api/auth/login — proxies to the API and sets httpOnly
 * session cookies. The browser never receives the tokens. */
export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));
  const res = await fetch(`${API_URL}/auth/login`, {
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
  const text = await res.text();
  const response = new NextResponse(text, {
    headers: { 'Content-Type': 'application/json' },
    status: res.status,
  });
  if (res.ok) {
    try {
      const body = JSON.parse(text) as {
        data?: { accessToken?: string; refreshToken?: string };
      };
      if (body.data?.accessToken) {
        response.cookies.set('access_token', body.data.accessToken, ACCESS_COOKIE);
      }
      if (body.data?.refreshToken) {
        response.cookies.set(
          'refresh_token',
          body.data.refreshToken,
          REFRESH_COOKIE,
        );
      }
    } catch {
      // Malformed success body: leave cookies unset; the client
      // will see the login as failed on its next call.
    }
  }
  return response;
}
