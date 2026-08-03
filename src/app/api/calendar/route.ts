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
import type { AssetType, CalendarEventFilter, PortfolioItem } from '@/types';

function matchesFilter(
  eventType: string,
  ticker: string,
  assetType: AssetType | undefined,
  filter: CalendarEventFilter
): boolean {
  if (filter === 'all') return true;
  if (filter === 'com') return eventType === 'dividend_com';
  if (filter === 'payment') return eventType === 'payment' || eventType === 'jcp';
  if (filter === 'jcp') return eventType === 'jcp';
  if (filter === 'dividend') return eventType.startsWith('dividend');
  if (filter === 'fii') return ticker.endsWith('11') && assetType === 'fii';
  if (filter === 'etf') return assetType === 'etf' || ticker.includes('BOVA');
  if (filter === 'stock') return assetType === 'stock_br' || assetType === 'stock_us';
  return true;
}

async function buildCalendar(
  items: PortfolioItem[],
  userId: string,
  filter: CalendarEventFilter = 'all',
  tickerFilter?: string
) {
  const quotes = await getQuotes(items.map((i) => i.ticker));
  const enriched = enrichPortfolio(items, quotes);
  const dividends = await calculatePortfolioDividends(enriched, userId);
  let allEvents = dividendsToCalendarEvents(dividends.events);

  if (tickerFilter) {
    const t = tickerFilter.toUpperCase();
    allEvents = allEvents.filter((e) => e.ticker.toUpperCase() === t);
  }

  const assetMap = new Map(items.map((i) => [i.ticker.toUpperCase(), i.asset_type]));
  allEvents = allEvents.filter((e) =>
    matchesFilter(e.event_type, e.ticker, assetMap.get(e.ticker.toUpperCase()), filter)
  );

  const events = filterEventsByRange(allEvents, 60, 365);

  return {
    events,
    allEvents,
    filter,
    dividendsSummary: {
      received12m: dividends.received12m,
      expectedUpcoming: dividends.expectedUpcoming,
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const filter = (request.nextUrl.searchParams.get('filter') ||
      'all') as CalendarEventFilter;
    const ticker = request.nextUrl.searchParams.get('ticker') ?? undefined;

    const items = await resolvePortfolioItems();
    const data = await buildCalendar(items, user?.id ?? 'demo', filter, ticker);
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
    const filter = (body.filter || 'all') as CalendarEventFilter;
    const ticker = body.ticker as string | undefined;
    const data = await buildCalendar(
      body.items as PortfolioItem[],
      'demo',
      filter,
      ticker
    );
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Falha ao carregar calendário' }, { status: 500 });
  }
}
