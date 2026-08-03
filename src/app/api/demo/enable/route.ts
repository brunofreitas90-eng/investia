import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookiesOnResponse } from '@/lib/auth-cookies';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true, mode: 'demo' });
  clearAuthCookiesOnResponse(response, request);
  response.cookies.set('demo_mode', '1', {
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
  });
  return response;
}
