import { timingSafeEqual } from 'crypto';
import type { NextRequest, NextResponse } from 'next/server';
import { isPersonalRequest } from '@/lib/personal-mode';

export const APP_ACCESS_COOKIE = 'app_access';
const APP_ACCESS_VALUE = '1';

export function isAppAccessRequest(request: NextRequest): boolean {
  return request.cookies.get(APP_ACCESS_COOKIE)?.value === APP_ACCESS_VALUE;
}

export async function isAppAccessCookie(): Promise<boolean> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  return cookieStore.get(APP_ACCESS_COOKIE)?.value === APP_ACCESS_VALUE;
}

export function hasPrivateAppAccess(request: NextRequest): boolean {
  return (
    request.cookies.get('demo_mode')?.value === '1' ||
    isAppAccessRequest(request) ||
    isPersonalRequest(request)
  );
}

export async function hasPrivateAppAccessCookie(): Promise<boolean> {
  const { isDemoCookie } = await import('@/lib/demo-mode');
  const { isPersonalCookie } = await import('@/lib/personal-mode');
  if (await isDemoCookie()) return true;
  if (await isPersonalCookie()) return true;
  return isAppAccessCookie();
}

function expectedPassword(): string {
  return process.env.APP_ACCESS_PASSWORD?.trim() ?? '';
}

export function isAppPasswordConfigured(): boolean {
  return expectedPassword().length >= 8;
}

export function verifyAppPassword(input: string): boolean {
  const expected = expectedPassword();
  if (!expected || !input) return false;

  const a = Buffer.from(input, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) {
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}

export function setAppAccessCookie(response: NextResponse) {
  response.cookies.set(APP_ACCESS_COOKIE, APP_ACCESS_VALUE, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 90,
  });
}

export function clearAppAccessCookie(response: NextResponse) {
  response.cookies.set(APP_ACCESS_COOKIE, '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax',
  });
}
