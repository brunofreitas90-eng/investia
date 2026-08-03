import type { NextRequest } from 'next/server';

export const PERSONAL_MODE_COOKIE = 'personal_mode';

export function isPersonalRequest(request: NextRequest): boolean {
  return request.cookies.get(PERSONAL_MODE_COOKIE)?.value === '1';
}

export async function isPersonalCookie(): Promise<boolean> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  return cookieStore.get(PERSONAL_MODE_COOKIE)?.value === '1';
}

export function isPersonalModeClient(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.includes(`${PERSONAL_MODE_COOKIE}=1`);
}

export function setPersonalModeCookie(response: import('next/server').NextResponse) {
  response.cookies.set(PERSONAL_MODE_COOKIE, '1', {
    path: '/',
    maxAge: 60 * 60 * 24 * 90,
    sameSite: 'lax',
  });
}

export function clearPersonalModeCookie(response: import('next/server').NextResponse) {
  response.cookies.set(PERSONAL_MODE_COOKIE, '', {
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
  });
}
