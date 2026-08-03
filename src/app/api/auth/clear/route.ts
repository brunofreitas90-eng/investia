import { NextRequest, NextResponse } from 'next/server';
import { clearAppAccessCookie } from '@/lib/app-access';
import { clearAuthCookiesOnResponse } from '@/lib/auth-cookies';
import { clearPersonalModeCookie } from '@/lib/personal-mode';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  clearAuthCookiesOnResponse(response, request);
  clearAppAccessCookie(response);
  clearPersonalModeCookie(response);
  return response;
}
