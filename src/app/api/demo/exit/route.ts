import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';

  const response = NextResponse.redirect(url);
  response.cookies.set('demo_mode', '', {
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
  });
  return response;
}
