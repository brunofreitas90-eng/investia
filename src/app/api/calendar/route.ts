import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolvePortfolioItems } from '@/lib/resolve-portfolio-items';
import { enrichPortfolio } from '@/lib/portfolio';
import { getQuotes } from '@/services/market';
import { calculatePortfolioDividends } from '@/services/dividends/portfolio-dividends';
import {
  dividendsToCalendarEvents,
  filterEventsByRange,
} from '@/lib/calendar-events';
import type { PortfolioItem } from '@/types';

async function buildCalendar(items: PortfolioItem[], userId: string) {
  const quotes = await getQuotes(items.map((i) => i.ticker));
  const enriched = enrichPortfolio(items, quotes);
  const dividends = await calculatePortfolioDividends(enriched, userId);
  const allEvents = dividendsToCalendarEvents(dividends.events);
  const events = filterEventsByRange(allEvents, 60, 120);

  return {
    events,
    allEvents,
    dividendsSummary: {
      received12m: dividends.received12m,
      expectedUpcoming: dividends.expectedUpcoming,
    },
  };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const items = await resolvePortfolioItems();
    const data = await buildCalendar(items, user?.id ?? 'demo');
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Falha ao carregar calendário' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!Array.isArray(body.items)) {
      return NextResponse.json({ error: 'items obrigatório' }, { status: 400 });
    }
    const data = await buildCalendar(body.items as PortfolioItem[], 'demo');
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Falha ao carregar calendário' }, { status: 500 });
  }
}
