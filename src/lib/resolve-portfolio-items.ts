import { hasPrivateAppAccessCookie } from '@/lib/app-access';
import { getAuthUser } from '@/lib/supabase/get-auth-user';
import { createClient } from '@/lib/supabase/server';
import type { PortfolioItem } from '@/types';

/** Carteira do usuário logado. Com senha/demo, retorna vazio (dados vêm do cliente). */
export async function resolvePortfolioItems(): Promise<PortfolioItem[]> {
  if (await hasPrivateAppAccessCookie()) {
    return [];
  }

  const user = await getAuthUser();
  if (!user) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('portfolio')
    .select('*')
    .eq('user_id', user.id);

  if (error || !data?.length) {
    return [];
  }

  return data;
}
