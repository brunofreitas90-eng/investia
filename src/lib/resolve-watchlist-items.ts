import { createClient } from '@/lib/supabase/server';
import { demoWatchlist } from '@/lib/demo-data';
import type { WatchlistItem } from '@/types';

export async function resolveWatchlistItems(): Promise<WatchlistItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return demoWatchlist;
  }

  const { data, error } = await supabase
    .from('watchlist')
    .select('*')
    .eq('user_id', user.id);

  if (error || !data?.length) {
    return [];
  }

  return data;
}
