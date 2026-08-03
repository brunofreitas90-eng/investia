import { NextRequest, NextResponse } from 'next/server';
import { isAppAccessRequest, hasPrivateAppAccess } from '@/lib/app-access';
import { isDemoRequest } from '@/lib/demo-mode';
import { isPersonalRequest } from '@/lib/personal-mode';
import { getAuthUser } from '@/lib/supabase/get-auth-user';

export async function GET(request: NextRequest) {
  if (isDemoRequest(request)) {
    return NextResponse.json({ mode: 'demo' as const });
  }

  // Conta na nuvem tem prioridade sobre cookie pessoal residual
  const user = await getAuthUser();
  if (user) {
    return NextResponse.json({
      mode: 'cloud' as const,
      userId: user.id,
      email: user.email ?? null,
    });
  }

  if (isPersonalRequest(request) || isAppAccessRequest(request)) {
    return NextResponse.json({ mode: 'personal' as const });
  }
  if (hasPrivateAppAccess(request)) {
    return NextResponse.json({ mode: 'personal' as const });
  }
  return NextResponse.json({ mode: 'guest' as const });
}
