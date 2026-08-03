import { NextRequest, NextResponse } from 'next/server';
import { isDemoRequest } from '@/lib/demo-mode';
import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/supabase/get-auth-user';
import {
  enrichWatchlist,
  enrichWatchlistWith12mYield,
} from '@/lib/watchlist';
import { getQuotes } from '@/services/market';
import type { WatchlistItem } from '@/types';

async function enrichItems(items: WatchlistItem[]) {
  const tickers = items.map((i) => i.ticker);
  const quotes = await getQuotes(tickers);
  const withQuotes = enrichWatchlist(items, quotes);
  return enrichWatchlistWith12mYield(withQuotes);
}

export async function GET(request: NextRequest) {
  if (isDemoRequest(request)) {
    return NextResponse.json(
      { error: 'Modo demo usa armazenamento local', code: 'DEMO_CLIENT' },
      { status: 401 }
    );
  }

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Não autenticado', code: 'SESSION_INVALID' },
      { status: 401 }
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('watchlist')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = await enrichItems(data || []);
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (Array.isArray(body.items)) {
    const items = await enrichItems(body.items as WatchlistItem[]);
    return NextResponse.json({ items });
  }

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Não autenticado', code: 'SESSION_INVALID' },
      { status: 401 }
    );
  }

  const supabase = await createClient();

  const { ticker, asset_type, notes } = body;
  if (!ticker) {
    return NextResponse.json({ error: 'Ticker obrigatório' }, { status: 400 });
  }

  const { error } = await supabase.from('watchlist').insert({
    ticker: String(ticker).toUpperCase(),
    asset_type: asset_type || 'stock_br',
    notes: notes || null,
    user_id: user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: all } = await supabase
    .from('watchlist')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const items = await enrichItems(all || []);
  return NextResponse.json({ items });
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Não autenticado', code: 'SESSION_INVALID' },
      { status: 401 }
    );
  }

  const supabase = await createClient();

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  }

  const { error } = await supabase
    .from('watchlist')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: all } = await supabase
    .from('watchlist')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const items = await enrichItems(all || []);
  return NextResponse.json({ items });
}
