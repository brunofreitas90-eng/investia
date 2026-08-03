import { NextResponse, type NextRequest } from 'next/server';

import { hasPrivateAppAccess } from '@/lib/app-access';



/** Rotas que exigem senha do app (cookie app_access ou demo_mode). */

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



export function updateSession(request: NextRequest): NextResponse {

  const pathname = request.nextUrl.pathname;

  const hasAccess = hasPrivateAppAccess(request);



  const isAuthPage =

    pathname === '/login' ||

    pathname === '/register' ||

    pathname.startsWith('/auth');



  if (hasAccess && (pathname === '/login' || pathname === '/register')) {

    return NextResponse.redirect(new URL('/dashboard', request.url));

  }



  if (!hasAccess && isProtectedPath(pathname)) {

    return NextResponse.redirect(new URL('/login', request.url));

  }



  if (isAuthPage || pathname === '/' || isProtectedPath(pathname) || hasAccess) {

    return NextResponse.next();

  }



  return NextResponse.next();

}

