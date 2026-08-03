import { hasPrivateAppAccessCookie } from '@/lib/app-access';
import { getAuthUser } from '@/lib/supabase/get-auth-user';
import { createClient } from '@/lib/supabase/server';
import type { WatchlistItem } from '@/types';

/** Watchlist do usuário logado. No modo demo, retorna vazio (dados vêm do cliente). */
export async function resolveWatchlistItems(): Promise<WatchlistItem[]> {
  if (await hasPrivateAppAccessCookie()) {
    return [];
  }

  const user = await getAuthUser();
  if (!user) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('watchlist')
    .select('*')
    .eq('user_id', user.id);

  if (error || !data?.length) {
    return [];
  }

  return data;
}
