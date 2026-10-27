import { NextResponse } from 'next/server';
import { API_URL, getTokens } from '@/lib/server';

/** POST /api/auth/logout — revokes the refresh token server-side
 * (best effort) and always clears the session cookies. */
export async function POST() {
  const { refresh } = await getTokens();
  if (refresh) {
    await fetch(`${API_URL}/auth/logout`, {
      body: JSON.stringify({ refreshToken: refresh }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    }).catch(() => undefined);
  }
  const response = NextResponse.json({ data: { loggedOut: true } });
  response.cookies.set('access_token', '', { maxAge: 0, path: '/' });
  response.cookies.set('refresh_token', '', { maxAge: 0, path: '/' });
  return response;
}
