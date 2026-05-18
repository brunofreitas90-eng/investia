import type { DividendCalendarInfo, DividendEventInfo } from '@/types';
import type { BrapiDividend } from './brapi-extended';

function parseDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toDateStr(d: Date | null): string | undefined {
  if (!d) return undefined;
  return d.toISOString().split('T')[0];
}

/** Data COM na Brapi = lastDatePrior (último dia com direito) */
function mapDividend(d: BrapiDividend): DividendEventInfo {
  const com = parseDate(d.lastDatePrior);
  const payment = parseDate(d.paymentDate);
  const ex = com ? new Date(com.getTime() + 86400000) : null;

  return {
    comDate: toDateStr(com),
    exDate: toDateStr(ex),
    paymentDate: toDateStr(payment),
    amountPerShare: d.rate,
    label: d.label,
  };
}

export function parseDividendCalendar(
  dividends: BrapiDividend[],
  currentPrice: number
): DividendCalendarInfo {
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  const mapped = dividends
    .map(mapDividend)
    .filter((d) => d.paymentDate || d.comDate);

  const withPayment = mapped.filter((d) => d.paymentDate);
  const past = withPayment.filter((d) => new Date(d.paymentDate!) <= now);
  const future = withPayment.filter((d) => new Date(d.paymentDate!) > now);

  past.sort((a, b) => (b.paymentDate! > a.paymentDate! ? 1 : -1));
  future.sort((a, b) => (a.paymentDate! > b.paymentDate! ? 1 : -1));

  const lastDividend = past[0];
  const nextDividend = future[0];

  const futureCom = mapped
    .filter((d) => d.comDate && new Date(d.comDate) >= now)
    .sort((a, b) => (a.comDate! > b.comDate! ? 1 : -1));
  const nextComDate = futureCom[0]?.comDate ?? nextDividend?.comDate;

  const paymentsLast12Months = past.filter((d) => {
    const p = new Date(d.paymentDate!);
    return p >= oneYearAgo;
  }).length;

  const totalDividendsLast12m = past
    .filter((d) => new Date(d.paymentDate!) >= oneYearAgo)
    .reduce((s, d) => s + (d.amountPerShare ?? 0), 0);

  return {
    nextComDate,
    lastDividend,
    nextDividend: nextDividend ?? futureCom[0],
    paymentFrequency: detectFrequency(paymentsLast12Months, past),
    paymentsLast12Months,
    totalDividendsLast12m: totalDividendsLast12m,
    dividendYieldLast12mPercent:
      currentPrice > 0 ? (totalDividendsLast12m / currentPrice) * 100 : undefined,
  };
}

function detectFrequency(count12m: number, past: DividendEventInfo[]): string {
  if (count12m === 0) return 'Sem pagamentos no último ano';
  if (count12m >= 10) return 'Mensal (aprox.)';
  if (count12m >= 4) return 'Trimestral (aprox.)';
  if (count12m >= 2) return 'Semestral (aprox.)';
  if (count12m === 1) return 'Anual (aprox.)';

  if (past.length >= 2) {
    const d1 = new Date(past[0].paymentDate!);
    const d2 = new Date(past[1].paymentDate!);
    const months = Math.abs(d1.getMonth() - d2.getMonth() + (d1.getFullYear() - d2.getFullYear()) * 12);
    if (months <= 1) return 'Mensal (aprox.)';
    if (months <= 4) return 'Trimestral (aprox.)';
    if (months <= 7) return 'Semestral (aprox.)';
    return 'Anual (aprox.)';
  }

  return 'Irregular';
}
