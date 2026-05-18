import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = '/dashboard';
  url.search = '';

  const response = NextResponse.redirect(url);
  response.cookies.set('demo_mode', '1', {
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
  });
  return response;
}
