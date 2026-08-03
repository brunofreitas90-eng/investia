import type { NextRequest } from 'next/server';

export function isDemoRequest(request: NextRequest): boolean {
  return request.cookies.get('demo_mode')?.value === '1';
}

export async function isDemoCookie(): Promise<boolean> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  return cookieStore.get('demo_mode')?.value === '1';
}

export function isDemoModeClient(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.includes('demo_mode=1');
}
