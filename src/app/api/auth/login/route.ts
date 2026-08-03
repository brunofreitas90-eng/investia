import { NextRequest, NextResponse } from 'next/server';
import {
  isAppPasswordConfigured,
  setAppAccessCookie,
  verifyAppPassword,
} from '@/lib/app-access';
import { clearAuthCookiesOnResponse } from '@/lib/auth-cookies';
import { setPersonalModeCookie } from '@/lib/personal-mode';

export async function POST(request: NextRequest) {
  if (!isAppPasswordConfigured()) {
    return NextResponse.json(
      { error: 'Senha do app não configurada no servidor.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const password = String(body.password ?? '');

    if (!verifyAppPassword(password)) {
      return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    clearAuthCookiesOnResponse(response, request);
    response.cookies.set('demo_mode', '', { path: '/', maxAge: 0, sameSite: 'lax' });
    setAppAccessCookie(response);
    setPersonalModeCookie(response);

    return response;
  } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  }
}
