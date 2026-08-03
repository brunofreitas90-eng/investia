import { NextRequest, NextResponse } from 'next/server';
import { clearAppAccessCookie } from '@/lib/app-access';
import { clearPersonalModeCookie } from '@/lib/personal-mode';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';

  const response = NextResponse.redirect(url);
  response.cookies.set('demo_mode', '', { path: '/', maxAge: 0, sameSite: 'lax' });
  clearAppAccessCookie(response);
  clearPersonalModeCookie(response);
  return response;
}
