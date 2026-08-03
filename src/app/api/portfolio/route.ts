import { NextRequest, NextResponse } from 'next/server';
import { isDemoRequest } from '@/lib/demo-mode';
import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/supabase/get-auth-user';
import { getQuotes } from '@/services/market';
import {
  enrichPortfolio,
  enrichPositionsWith5yDividends,
  summarizePortfolio,
} from '@/lib/portfolio';
import { aggregatePortfolioPositions } from '@/lib/portfolio-aggregate';
import type { PortfolioItem } from '@/types';

async function enrichAndSummarize(items: PortfolioItem[]) {
  const tickers = items.map((p) => p.ticker);
  const quotes = await getQuotes(tickers);
  const enriched = enrichPortfolio(items, quotes);
  const summary = summarizePortfolio(enriched);
  const positions = await enrichPositionsWith5yDividends(
    aggregatePortfolioPositions(enriched)
  );
  return { ...summary, positions, rawItemCount: items.length };
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

  // Preview/enrich only (modo demo — sem persistir no banco)
  if (Array.isArray(body.items)) {
    const enriched = await enrichAndSummarize(body.items as PortfolioItem[]);
    return NextResponse.json(enriched);
  }

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Não autenticado', code: 'SESSION_INVALID' },
      { status: 401 }
    );
  }

  const supabase = await createClient();

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
