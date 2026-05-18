import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolvePortfolioItems } from '@/lib/resolve-portfolio-items';
import { enrichPortfolio } from '@/lib/portfolio';
import { getQuotes } from '@/services/market';
import { calculatePortfolioDividends } from '@/services/dividends/portfolio-dividends';
import type { PortfolioItem } from '@/types';

async function buildSummary(items: PortfolioItem[], userId: string) {
  const tickers = items.map((i) => i.ticker);
  const quotes = await getQuotes(tickers);
  const enriched = enrichPortfolio(items, quotes);
  return calculatePortfolioDividends(enriched, userId);
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const items = await resolvePortfolioItems();
    const summary = await buildSummary(items, user?.id ?? 'demo');
    return NextResponse.json(summary);
  } catch {
    return NextResponse.json({ error: 'Falha ao calcular dividendos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!Array.isArray(body.items)) {
      return NextResponse.json({ error: 'items obrigatório' }, { status: 400 });
    }

    const summary = await buildSummary(body.items as PortfolioItem[], 'demo');
    return NextResponse.json(summary);
  } catch {
    return NextResponse.json({ error: 'Falha ao calcular dividendos' }, { status: 500 });
  }
}
