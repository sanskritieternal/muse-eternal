/** Browser-side fetch helper: same-origin /api/* proxies only. The
 * browser never sees API tokens or the API origin. */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { detail: text };
  }
  if (!res.ok) {
    const detail =
      (body as { detail?: string })?.detail ??
      (body as { details?: string[] })?.details?.join(' ') ??
      `Request failed (${res.status})`;
    const error = new Error(detail);
    (error as Error & { status: number }).status = res.status;
    throw error;
  }
  return body as T;
}

export interface Envelope<T> {
  data: T;
  meta?: unknown;
}
