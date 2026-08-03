import { NextRequest, NextResponse } from 'next/server';
import { clearAppAccessCookie } from '@/lib/app-access';
import { clearAuthCookiesOnResponse } from '@/lib/auth-cookies';
import { clearPersonalModeCookie } from '@/lib/personal-mode';

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url));
  clearAuthCookiesOnResponse(response, request);
  clearAppAccessCookie(response);
  clearPersonalModeCookie(response);
  response.cookies.set('demo_mode', '', { path: '/', maxAge: 0, sameSite: 'lax' });
  return response;
}
