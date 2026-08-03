import { NextResponse } from 'next/server';
import { isAppPasswordConfigured } from '@/lib/app-access';
import { isPushConfigured } from '@/lib/push/vapid';

export async function GET() {
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());

  return NextResponse.json({
    supabase: false,
    openai: openaiConfigured,
    authAvailable: isAppPasswordConfigured(),
    authMode: 'password',
    push: isPushConfigured(),
  });
}
