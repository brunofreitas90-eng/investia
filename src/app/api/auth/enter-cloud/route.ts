import { NextRequest, NextResponse } from 'next/server';
import { clearAppAccessCookie } from '@/lib/app-access';

/** Após login/cadastro na nuvem: sai do modo local sem apagar localStorage. */
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('personal_mode', '', { path: '/', maxAge: 0, sameSite: 'lax' });
  response.cookies.set('demo_mode', '', { path: '/', maxAge: 0, sameSite: 'lax' });
  // Mantém app_access se existir (não atrapalha); limpa só se pedido
  if (request.nextUrl.searchParams.get('clearAccess') === '1') {
    clearAppAccessCookie(response);
  }
  return response;
}
