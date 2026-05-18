import { fetchBrapiFullData } from '@/services/market/brapi-extended';
import { getQuotes } from '@/services/market';
import { isBrazilianTicker } from '@/lib/utils';
import { groupDividendsByMonth, type MonthlyDividendRow } from '@/lib/dividends-monthly';
import type { Dividend, PortfolioItem } from '@/types';

export interface DividendsSummary {
  received12m: number;
  expectedUpcoming: number;
  monthlyEstimate: number;
  averageYield: number;
  events: Dividend[];
  monthlyBreakdown: MonthlyDividendRow[];
}

export type { MonthlyDividendRow };

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function parseDateStr(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso + 'T12:00:00');
  return Number.isNaN(d.getTime()) ? null : d;
}

async function dividendsForBrazilianItem(
  item: PortfolioItem,
  userId: string
): Promise<Dividend[]> {
  const data = await fetchBrapiFullData(item.ticker);
  if (!data?.dividendsData?.cashDividends?.length) return [];

  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - ONE_YEAR_MS);
  const events: Dividend[] = [];

  for (const d of data.dividendsData.cashDividends) {
    const payment = parseDateStr(d.paymentDate);
    if (!payment || !d.rate) continue;

    const com = parseDateStr(d.lastDatePrior);
    const ex = com ? new Date(com.getTime() + 86400000) : null;
    const amount = d.rate * item.quantity;

    let status: Dividend['status'] = 'expected';
    if (payment <= now) status = 'paid';
    else if (payment.getTime() - now.getTime() < 30 * 86400000) status = 'confirmed';

    if (payment < oneYearAgo && status === 'paid') continue;

    events.push({
      id: `${item.ticker}-${d.paymentDate}-${d.rate}`,
      user_id: userId,
      ticker: item.ticker,
      amount,
      amount_per_share: d.rate,
      quantity: item.quantity,
      com_date: com ? com.toISOString().split('T')[0] : undefined,
      ex_date: ex ? ex.toISOString().split('T')[0] : undefined,
      payment_date: payment.toISOString().split('T')[0],
      status,
    });
  }

  return events;
}

function estimateFromYield(
  item: PortfolioItem,
  userId: string,
  quotes: Map<string, { price: number; dividendYield?: number }>
): Dividend[] {
  const quote = quotes.get(item.ticker.toUpperCase());
  const price = quote?.price ?? item.current_price ?? item.average_price;
  const yield_ = quote?.dividendYield ?? item.dividend_yield;
  if (!yield_ || yield_ <= 0) return [];

  const annualAmount = (price * item.quantity * yield_) / 100;
  const now = new Date();
  const year = now.getFullYear();

  return [
    {
      id: `est-${item.ticker}-${year}`,
      user_id: userId,
      ticker: item.ticker,
      amount: annualAmount,
      amount_per_share: (price * yield_) / 100,
      quantity: item.quantity,
      payment_date: `${year}-12-31`,
      status: 'paid',
    },
  ];
}

export async function calculatePortfolioDividends(
  items: PortfolioItem[],
  userId = 'demo'
): Promise<DividendsSummary> {
  if (items.length === 0) {
    return {
      received12m: 0,
      expectedUpcoming: 0,
      monthlyEstimate: 0,
      averageYield: 0,
      events: [],
      monthlyBreakdown: [],
    };
  }

  const quotes = await getQuotes(items.map((i) => i.ticker));
  const quoteMap = new Map(
    [...quotes.entries()].map(([t, q]) => [
      t,
      { price: q.price, dividendYield: q.dividendYield },
    ])
  );

  const allEvents: Dividend[] = [];

  await Promise.all(
    items.map(async (item) => {
      if (isBrazilianTicker(item.ticker)) {
        const br = await dividendsForBrazilianItem(item, userId);
        if (br.length > 0) {
          allEvents.push(...br);
          return;
        }
      }
      allEvents.push(...estimateFromYield(item, userId, quoteMap));
    })
  );

  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - ONE_YEAR_MS);

  const paid12m = allEvents.filter((e) => {
    if (e.status !== 'paid' || !e.payment_date) return false;
    const p = parseDateStr(e.payment_date);
    return p && p >= oneYearAgo && p <= now;
  });

  const upcoming = allEvents.filter((e) => {
    if (!e.payment_date) return false;
    const p = parseDateStr(e.payment_date);
    return p && p > now;
  });

  const received12m = paid12m.reduce((s, e) => s + e.amount, 0);
  const expectedUpcoming = upcoming.reduce((s, e) => s + e.amount, 0);

  let yieldSum = 0;
  let yieldCount = 0;
  items.forEach((item) => {
    const q = quoteMap.get(item.ticker.toUpperCase());
    const y = q?.dividendYield ?? item.dividend_yield;
    if (y && y > 0) {
      yieldSum += y;
      yieldCount++;
    }
  });

  const averageYield = yieldCount > 0 ? yieldSum / yieldCount : 0;
  const monthlyEstimate =
    received12m > 0 ? received12m / 12 : (expectedUpcoming > 0 ? expectedUpcoming / 12 : 0);

  allEvents.sort((a, b) => {
    const da = a.payment_date ?? '';
    const db = b.payment_date ?? '';
    return db.localeCompare(da);
  });

  const monthlyBreakdown = groupDividendsByMonth(allEvents, {
    pastMonths: 12,
    futureMonths: 6,
  });

  return {
    received12m,
    expectedUpcoming,
    monthlyEstimate,
    averageYield,
    events: allEvents,
    monthlyBreakdown,
  };
}
