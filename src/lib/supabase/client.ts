import { createBrowserClient } from '@supabase/ssr';
import { hasSupabaseConfig } from '@/lib/supabase/config';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!hasSupabaseConfig() || !url || !key) {
    throw new Error(
      'Supabase não configurado. Use o modo demo ou configure NEXT_PUBLIC_SUPABASE_URL na Vercel.'
    );
  }

  return createBrowserClient(url, key);
}

export function isAuthClientAvailable(): boolean {
  return hasSupabaseConfig();
}
