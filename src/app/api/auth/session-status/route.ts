import { NextRequest, NextResponse } from 'next/server';
import { isAppAccessRequest, hasPrivateAppAccess } from '@/lib/app-access';
import { isDemoRequest } from '@/lib/demo-mode';
import { isPersonalRequest } from '@/lib/personal-mode';

export async function GET(request: NextRequest) {
  if (isDemoRequest(request)) {
    return NextResponse.json({ mode: 'demo' as const });
  }
  if (isPersonalRequest(request) || isAppAccessRequest(request)) {
    return NextResponse.json({ mode: 'personal' as const });
  }
  if (hasPrivateAppAccess(request)) {
    return NextResponse.json({ mode: 'personal' as const });
  }
  return NextResponse.json({ mode: 'guest' as const });
}
