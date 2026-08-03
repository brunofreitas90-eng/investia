import { NextRequest, NextResponse } from 'next/server';
import { clearAppAccessCookie } from '@/lib/app-access';
import { clearAuthCookiesOnResponse } from '@/lib/auth-cookies';
import { clearPersonalModeCookie } from '@/lib/personal-mode';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseConfig } from '@/lib/supabase/config';

export async function POST(request: NextRequest) {
  if (hasSupabaseConfig()) {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
  }

  const response = NextResponse.redirect(new URL('/login', request.url));
  clearAuthCookiesOnResponse(response, request);
  clearAppAccessCookie(response);
  clearPersonalModeCookie(response);
  response.cookies.set('demo_mode', '', { path: '/', maxAge: 0, sameSite: 'lax' });
  return response;
}

export async function GET(request: NextRequest) {
  return POST(request);
}
