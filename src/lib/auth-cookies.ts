import type { NextRequest, NextResponse } from 'next/server';

function isAuthCookieName(name: string): boolean {
  return name.includes('auth-token') || name.startsWith('sb-');
}

export function clearAuthCookiesOnResponse(
  response: NextResponse,
  request?: NextRequest
) {
  const names = new Set<string>();

  request?.cookies.getAll().forEach((cookie) => {
    if (isAuthCookieName(cookie.name)) names.add(cookie.name);
  });

  for (const name of names) {
    response.cookies.set(name, '', { path: '/', maxAge: 0 });
  }
}
