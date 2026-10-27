import { cookies } from 'next/headers';

/** API base URL (server-only env; the browser never calls the API). */
export const API_URL =
  process.env.API_URL ?? 'http://localhost:3000';

export async function getTokens(): Promise<{
  access?: string;
  refresh?: string;
}> {
  const store = await cookies();
  return {
    access: store.get('access_token')?.value,
    refresh: store.get('refresh_token')?.value,
  };
}

/** Cookie options for the httpOnly session cookies. */
export const ACCESS_COOKIE = {
  httpOnly: true,
  maxAge: 15 * 60, // 15-minute access token
  path: '/',
  sameSite: 'lax' as const,
};

export const REFRESH_COOKIE = {
  httpOnly: true,
  maxAge: 60 * 60, // 60-minute absolute session bound (S01 K-2 default)
  path: '/',
  sameSite: 'lax' as const,
};

type RefreshResult =
  | { ok: true; access: string; refresh: string }
  | { ok: false };

/** Exchange a refresh token for a fresh pair. Raw tokens are never
 * stored anywhere except these httpOnly cookies. */
export async function refreshPair(
  refreshToken: string,
): Promise<RefreshResult> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      body: JSON.stringify({ refreshToken }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    if (!res.ok) {
      return { ok: false };
    }
    const body = (await res.json()) as {
      data?: { accessToken?: string; refreshToken?: string };
    };
    if (!body.data?.accessToken || !body.data?.refreshToken) {
      return { ok: false };
    }
    return {
      access: body.data.accessToken,
      ok: true,
      refresh: body.data.refreshToken,
    };
  } catch {
    return { ok: false };
  }
}

export interface ProxyResult {
  body: string;
  contentType: string | null;
  refreshed?: { access: string; refresh: string };
  status: number;
}

/**
 * Forward a request to the API with the access cookie as a Bearer
 * token. On a 401, retry once after a refresh — this is what keeps
 * staff sessions alive across the 15-minute access TTL without
 * exposing tokens to browser code.
 */
export async function proxyToApi(
  path: string,
  init: RequestInit,
): Promise<ProxyResult> {
  const { access, refresh } = await getTokens();
  const headers = new Headers(init.headers);
  if (access) {
    headers.set('Authorization', `Bearer ${access}`);
  }
  const doFetch = (token?: string) => {
    const h = new Headers(headers);
    if (token) {
      h.set('Authorization', `Bearer ${token}`);
    }
    return fetch(`${API_URL}/${path}`, { ...init, headers: h });
  };

  let res = await doFetch();
  if (res.status === 401 && refresh) {
    const refreshed = await refreshPair(refresh);
    if (refreshed.ok) {
      res = await doFetch(refreshed.access);
      return {
        body: await res.text(),
        contentType: res.headers.get('Content-Type'),
        refreshed: {
          access: refreshed.access,
          refresh: refreshed.refresh,
        },
        status: res.status,
      };
    }
  }
  return {
    body: await res.text(),
    contentType: res.headers.get('Content-Type'),
    status: res.status,
  };
}
