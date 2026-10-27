import { NextResponse } from 'next/server';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  proxyToApi,
} from '@/lib/server';

/**
 * Generic staff-API proxy: /api/staff/glossary/... and
 * /api/staff/audit forward to the API with the access cookie as a
 * Bearer token, retrying once after a refresh on 401. Explicit
 * /api/auth/* routes take precedence over this catch-all.
 */
async function handle(
  request: Request,
  params: Promise<{ path: string[] }>,
) {
  const { path } = await params;
  const url = new URL(request.url);
  const target = `${path.join('/')}${url.search}`;
  const body =
    request.method === 'GET' || request.method === 'HEAD'
      ? undefined
      : await request.text();
  const result = await proxyToApi(target, {
    body,
    headers: { 'Content-Type': 'application/json' },
    method: request.method,
  });
  const response = new NextResponse(result.body, {
    headers: result.contentType
      ? { 'Content-Type': result.contentType }
      : undefined,
    status: result.status,
  });
  if (result.refreshed) {
    response.cookies.set(
      'access_token',
      result.refreshed.access,
      ACCESS_COOKIE,
    );
    response.cookies.set(
      'refresh_token',
      result.refreshed.refresh,
      REFRESH_COOKIE,
    );
  }
  return response;
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  return handle(request, ctx.params);
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  return handle(request, ctx.params);
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  return handle(request, ctx.params);
}

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  return handle(request, ctx.params);
}
