import { NextResponse } from 'next/server';
import { isAppPasswordConfigured } from '@/lib/app-access';
import { isPushConfigured } from '@/lib/push/vapid';
import { hasSupabaseConfig } from '@/lib/supabase/config';

export async function GET() {
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());
  const supabase = hasSupabaseConfig();

  return NextResponse.json({
    supabase,
    openai: openaiConfigured,
    authAvailable: supabase || isAppPasswordConfigured(),
    authMode: supabase ? 'supabase' : isAppPasswordConfigured() ? 'password' : 'none',
    push: isPushConfigured(),
  });
}
