import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { demoPortfolio } from '@/lib/demo-data';
import { getQuotes } from '@/services/market';
import { enrichPortfolio, summarizePortfolio } from '@/lib/portfolio';
import type { PortfolioItem } from '@/types';

async function enrichAndSummarize(items: PortfolioItem[]) {
  const tickers = items.map((p) => p.ticker);
  const quotes = await getQuotes(tickers);
  const enriched = enrichPortfolio(items, quotes);
  return summarizePortfolio(enriched);
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const enriched = await enrichAndSummarize(demoPortfolio);
    return NextResponse.json(enriched);
  }

  const { data, error } = await supabase
    .from('portfolio')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const enriched = await enrichAndSummarize(data || []);
  return NextResponse.json(enriched);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Preview/enrich only (modo demo — sem persistir no banco)
  if (Array.isArray(body.items)) {
    const enriched = await enrichAndSummarize(body.items as PortfolioItem[]);
    return NextResponse.json(enriched);
  }

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { ticker, asset_type, quantity, average_price, purchase_date, notes } =
    body;

  if (!ticker || !quantity || !average_price || !purchase_date) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('portfolio')
    .insert({
      ticker: String(ticker).toUpperCase(),
      asset_type: asset_type || 'stock_br',
      quantity,
      average_price,
      purchase_date,
      notes,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: all } = await supabase
    .from('portfolio')
    .select('*')
    .eq('user_id', user.id);

  const enriched = await enrichAndSummarize([...(all || [])]);
  return NextResponse.json(enriched);
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
    .from('portfolio')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: all } = await supabase
    .from('portfolio')
    .select('*')
    .eq('user_id', user.id);

  const enriched = await enrichAndSummarize(all || []);
  return NextResponse.json(enriched);
}
