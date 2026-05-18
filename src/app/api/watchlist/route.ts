import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { demoWatchlist } from '@/lib/demo-data';
import { enrichWatchlist } from '@/lib/watchlist';
import { getQuotes } from '@/services/market';
import type { WatchlistItem } from '@/types';

async function enrichItems(items: WatchlistItem[]) {
  const tickers = items.map((i) => i.ticker);
  const quotes = await getQuotes(tickers);
  return enrichWatchlist(items, quotes);
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const items = await enrichItems(demoWatchlist);
    return NextResponse.json({ items });
  }

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (Array.isArray(body.items)) {
    const items = await enrichItems(body.items as WatchlistItem[]);
    return NextResponse.json({ items });
  }

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

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
