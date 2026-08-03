import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/register',
    '/auth/:path*',
    '/dashboard/:path*',
    '/carteira/:path*',
    '/watchlist/:path*',
    '/dividendos/:path*',
    '/imposto/:path*',
    '/metas/:path*',
    '/alertas/:path*',
    '/calendario/:path*',
    '/ranking/:path*',
    '/setores',
    '/setores/:path*',
    '/radar/:path*',
    '/analise/:path*',
    '/assessoria',
    '/assessoria/:path*',
    '/chat/:path*',
    '/configuracoes/:path*',
    '/juros-compostos/:path*',
    '/simuladores/:path*',
    '/renda-mensal',
  ],
};
