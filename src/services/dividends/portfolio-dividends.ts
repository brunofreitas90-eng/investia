import { getQuotes } from '@/services/market';
import { buildDividendHistoryReport } from '@/services/market/dividend-history';
import { toDateOnly } from '@/services/market/yahoo-dividends';
import {
  analyzePaymentSchedule,
  forecastUpcomingPayments,
  type PaymentScheduleInfo,
} from '@/lib/payment-schedule';
import { groupDividendsByMonth, type MonthlyDividendRow } from '@/lib/dividends-monthly';
import type { Dividend, PortfolioItem } from '@/types';

export interface TickerPaymentSchedule extends PaymentScheduleInfo {
  ticker: string;
  companyName?: string;
}

export interface DividendsSummary {
  received12m: number;
  expectedUpcoming: number;
  monthlyEstimate: number;
  averageYield: number;
  events: Dividend[];
  monthlyBreakdown: MonthlyDividendRow[];
  paymentSchedules: TickerPaymentSchedule[];
}

export type { MonthlyDividendRow };

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const FIVE_YEARS_MS = 5 * ONE_YEAR_MS;

function parseDateStr(iso?: string | null): Date | null {
  if (!iso) return null;
  const normalized = toDateOnly(iso) ?? iso;
  const d = new Date(
    normalized.includes('T') ? normalized : `${normalized}T12:00:00`
  );
  return Number.isNaN(d.getTime()) ? null : d;
}

function mapHistoryPaymentToDividend(
  item: PortfolioItem,
  userId: string,
  d: {
    kind?: Dividend['kind'];
    amountPerShare: number;
    comDate?: string;
    exDate?: string;
    paymentDate?: string;
    projected?: boolean;
  },
  paymentDate: string,
  payment: Date,
  now: Date
): Dividend {
  const com = parseDateStr(d.comDate);
  const ex =
    parseDateStr(d.exDate) ?? (com ? new Date(com.getTime() + 86400000) : null);
  const amount = d.amountPerShare * item.quantity;

  let status: Dividend['status'] = 'expected';
  if (!d.projected) {
    if (payment <= now) status = 'paid';
    else if (payment.getTime() - now.getTime() < 30 * 86400000) status = 'confirmed';
  }

  return {
    id: `${d.projected ? 'proj-' : ''}${item.ticker}-${paymentDate}-${d.kind ?? 'outro'}-${d.amountPerShare}`,
    user_id: userId,
    ticker: item.ticker,
    amount,
    amount_per_share: d.amountPerShare,
    quantity: item.quantity,
    com_date: com ? com.toISOString().split('T')[0] : undefined,
    ex_date: ex ? ex.toISOString().split('T')[0] : undefined,
    payment_date: paymentDate,
    status,
    kind: d.kind,
    projected: d.projected,
  };
}

/** Proventos reais das fontes públicas (BRAPI/B3 + Yahoo), últimos 5 anos + futuros + previsão JCP/dividendos. */
async function dividendsForItem(
  item: PortfolioItem,
  userId: string
): Promise<Dividend[]> {
  const report = await buildDividendHistoryReport(item.ticker);
  if (!report?.payments?.length) return [];

  const now = new Date();
  const fiveYearsAgo = new Date(now.getTime() - FIVE_YEARS_MS);
  const events: Dividend[] = [];

  for (const d of report.payments) {
    const paymentDate = toDateOnly(d.paymentDate) ?? toDateOnly(d.comDate);
    if (!paymentDate || !d.amountPerShare) continue;

    const payment = parseDateStr(paymentDate);
    if (!payment) continue;

    if (payment < fiveYearsAgo && payment <= now) continue;

    events.push(
      mapHistoryPaymentToDividend(
        item,
        userId,
        {
          kind: d.kind,
          amountPerShare: d.amountPerShare,
          comDate: d.comDate,
          exDate: d.exDate,
          paymentDate,
        },
        paymentDate,
        payment,
        now
      )
    );
  }

  // Previsão de JCP/JSCP (e demais proventos) quando o padrão histórico indica
  // pagamento futuro ainda não anunciado nas fontes.
  const isStock =
    item.asset_type === 'stock_br' ||
    item.asset_type === 'stock_us' ||
    item.asset_type === 'bdr';

  const forecastKinds = isStock
    ? (['jcp', 'dividendo'] as const)
    : (['rendimento', 'dividendo', 'jcp'] as const);

  const forecasts = forecastUpcomingPayments(report.payments, {
    monthsAhead: 14,
    kinds: [...forecastKinds],
  });

  for (const f of forecasts) {
    const payment = parseDateStr(f.paymentDate);
    if (!payment) continue;
    events.push(
      mapHistoryPaymentToDividend(
        item,
        userId,
        {
          kind: f.kind,
          amountPerShare: f.amountPerShare,
          paymentDate: f.paymentDate,
          projected: true,
        },
        f.paymentDate,
        payment,
        now
      )
    );
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
      kind: 'dividendo',
      projected: true,
    },
  ];
}

async function buildPaymentSchedules(
  items: PortfolioItem[]
): Promise<TickerPaymentSchedule[]> {
  const schedules: TickerPaymentSchedule[] = [];

  await Promise.all(
    items.map(async (item) => {
      try {
        const report = await buildDividendHistoryReport(item.ticker);
        if (!report?.payments.length) return;

        const schedule = analyzePaymentSchedule(report.payments);
        schedules.push({
          ticker: item.ticker,
          companyName: report.companyName,
          ...schedule,
        });
      } catch {
        /* skip */
      }
    })
  );

  return schedules.sort((a, b) => a.ticker.localeCompare(b.ticker));
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
      paymentSchedules: [],
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
      const real = await dividendsForItem(item, userId);
      if (real.length > 0) {
        allEvents.push(...real);
        return;
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
    received12m > 0
      ? received12m / 12
      : expectedUpcoming > 0
        ? expectedUpcoming / 12
        : 0;

  allEvents.sort((a, b) => {
    const da = a.payment_date ?? '';
    const db = b.payment_date ?? '';
    return db.localeCompare(da);
  });

  const monthlyBreakdown = groupDividendsByMonth(allEvents, {
    pastMonths: 60,
    futureMonths: 12,
  });

  const paymentSchedules = await buildPaymentSchedules(items);

  return {
    received12m,
    expectedUpcoming,
    monthlyEstimate,
    averageYield,
    events: allEvents,
    monthlyBreakdown,
    paymentSchedules,
  };
}
