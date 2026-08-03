import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { hasPrivateAppAccess } from '@/lib/app-access';
import { hasSupabaseConfig } from '@/lib/supabase/config';

/** Rotas que exigem acesso (senha do app, demo ou sessão Supabase). */
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/carteira',
  '/watchlist',
  '/dividendos',
  '/imposto',
  '/metas',
  '/alertas',
  '/calendario',
  '/ranking',
  '/setores',
  '/radar',
  '/analise',
  '/assessoria',
  '/chat',
  '/configuracoes',
  '/juros-compostos',
  '/simuladores',
  '/renda-mensal',
] as const;

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });

  let cloudUser: { id: string } | null = null;

  if (hasSupabaseConfig()) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value);
            });
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) => {
              supabaseResponse.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    try {
      const { data } = await supabase.auth.getUser();
      cloudUser = data.user;
    } catch {
      cloudUser = null;
    }
  }

  const pathname = request.nextUrl.pathname;
  const cookieAccess = hasPrivateAppAccess(request);
  const hasAccess = cookieAccess || Boolean(cloudUser);
  const allowAuthPagesWhileLoggedIn =
    request.nextUrl.searchParams.get('upgrade') === '1';

  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname.startsWith('/auth');

  if (
    hasAccess &&
    (pathname === '/login' || pathname === '/register') &&
    !allowAuthPagesWhileLoggedIn
  ) {
    const redirect = NextResponse.redirect(new URL('/dashboard', request.url));
    supabaseResponse.cookies.getAll().forEach((c) => {
      redirect.cookies.set(c.name, c.value);
    });
    return redirect;
  }

  if (!hasAccess && isProtectedPath(pathname)) {
    const redirect = NextResponse.redirect(new URL('/login', request.url));
    supabaseResponse.cookies.getAll().forEach((c) => {
      redirect.cookies.set(c.name, c.value);
    });
    return redirect;
  }

  void isAuthPage;
  return supabaseResponse;
}
