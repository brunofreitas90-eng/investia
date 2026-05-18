import { createClient } from '@/lib/supabase/server';
import { demoPortfolio } from '@/lib/demo-data';
import type { PortfolioItem } from '@/types';

/** Carrega itens da carteira: usuário logado ou demo padrão */
export async function resolvePortfolioItems(): Promise<PortfolioItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return demoPortfolio;
  }

  const { data, error } = await supabase
    .from('portfolio')
    .select('*')
    .eq('user_id', user.id);

  if (error || !data?.length) {
    return [];
  }

  return data;
}
