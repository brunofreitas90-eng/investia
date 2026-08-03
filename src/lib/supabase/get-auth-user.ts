import { hasSupabaseConfig } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';

const AUTH_TIMEOUT_MS = 3_000;

/** Usuário autenticado ou null (timeout / Supabase indisponível). */
export async function getAuthUser() {
  if (!hasSupabaseConfig()) return null;

  const supabase = await createClient();

  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('auth_timeout')), AUTH_TIMEOUT_MS);
      }),
    ]);
    return result.data.user ?? null;
  } catch {
    return null;
  }
}
