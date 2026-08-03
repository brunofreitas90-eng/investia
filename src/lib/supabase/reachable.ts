import { hasSupabaseConfig } from '@/lib/supabase/config';

/** Verifica se o Supabase responde (com apikey — health público pode retornar 403). */
export async function isSupabaseReachable(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!hasSupabaseConfig() || !url || !key) return false;

  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      signal: AbortSignal.timeout(4_000),
      cache: 'no-store',
    });
    return res.ok || res.status === 401;
  } catch {
    return false;
  }
}
