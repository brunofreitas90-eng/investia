import { NextRequest, NextResponse } from 'next/server';

import type { User } from '@supabase/supabase-js';

import { hasPrivateAppAccess } from '@/lib/app-access';



export type ApiAccess =

  | { ok: true; mode: 'demo' }

  | { ok: true; mode: 'auth'; user: User }

  | { ok: false; response: NextResponse };



export async function requireAuthOrDemo(request: NextRequest): Promise<ApiAccess> {

  if (hasPrivateAppAccess(request)) {

    return { ok: true, mode: 'demo' };

  }



  return {

    ok: false,

    response: NextResponse.json(

      { error: 'Não autenticado', code: 'SESSION_INVALID' },

      { status: 401 }

    ),

  };

}



export function unauthorized() {

  return NextResponse.json(

    { error: 'Não autenticado', code: 'SESSION_INVALID' },

    { status: 401 }

  );

}

