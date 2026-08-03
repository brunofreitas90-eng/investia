import { normalizeTicker } from '@/lib/utils';
import {
  analyzeDividendHistory,
  buildYieldHistory,
  classifyPaymentKind,
} from '@/lib/dividend-analytics';
import { mergeSourceLabels } from '@/lib/market-sources';
import type { DividendHistoryPayment, DividendHistoryReport } from '@/types';
import { fetchBrapiFullData, type BrapiDividend } from './brapi-extended';
import { cacheKey, getCache, setCache, CACHE_TTL } from './cache';
import { getQuote } from './index';
import {
  fetchYahooDividendPayments,
  mergeDividendPayments,
  toDateOnly,
} from './yahoo-dividends';

function mapBrapiPayment(d: BrapiDividend): DividendHistoryPayment {
  const com = toDateOnly(d.lastDatePrior);
  const paymentDate = toDateOnly(d.paymentDate);
  const ex = com
    ? new Date(new Date(com + 'T12:00:00').getTime() + 86400000)
        .toISOString()
        .split('T')[0]
    : undefined;

  return {
    kind: classifyPaymentKind(d.label),
    amountPerShare: Number(d.rate) || 0,
    comDate: com,
    exDate: ex,
    paymentDate,
    label: d.label,
    sources: mergeSourceLabels('brapi', 'b3'),
  };
}

export async function buildDividendHistoryReport(
  ticker: string
): Promise<DividendHistoryReport | null> {
  const t = normalizeTicker(ticker);
  const key = cacheKey('divhist', 'v2', t);
  const cached = getCache<DividendHistoryReport>(key);
  if (cached) return cached;

  const [brapi, quote, yahooPayments] = await Promise.all([
    fetchBrapiFullData(t, { range: '10y' }),
    getQuote(t),
    fetchYahooDividendPayments(t, 'max'),
  ]);

  const price = brapi?.regularMarketPrice ?? quote?.price ?? 0;
  if (!brapi && !quote && yahooPayments.length === 0) return null;

  const brapiPayments = (brapi?.dividendsData?.cashDividends ?? [])
    .map(mapBrapiPayment)
    .filter((p) => p.amountPerShare > 0 && (p.paymentDate || p.comDate));

  const payments = mergeDividendPayments(brapiPayments, yahooPayments);

  // Se ainda vazio, tenta Yahoo 10y como reforço (já incluso em max; mantém fallback explícito)
  const finalPayments =
    payments.length > 0
      ? payments
      : await fetchYahooDividendPayments(t, '10y');

  if (finalPayments.length === 0 && price <= 0) return null;

  const analytics = analyzeDividendHistory(finalPayments, price);
  const priceByYear = new Map(
    analytics.yearlyTotals.map((y) => [y.year, price] as const)
  );
  const yieldHistory = buildYieldHistory(analytics.yearlyTotals, priceByYear);

  const sourcesUsed: Array<'brapi' | 'b3' | 'yahoo'> = [];
  if (brapiPayments.length) sourcesUsed.push('brapi', 'b3');
  if (yahooPayments.length || finalPayments.some((p) => p.sources?.some((s) => s.includes('Yahoo')))) {
    sourcesUsed.push('yahoo');
  }

  const report: DividendHistoryReport = {
    ticker: t,
    companyName: brapi?.longName || brapi?.shortName || quote?.name || t,
    currentPrice: price,
    payments: finalPayments,
    analytics,
    yieldHistory,
    dataSources:
      sourcesUsed.length > 0
        ? mergeSourceLabels(...sourcesUsed)
        : mergeSourceLabels('brapi', 'b3', 'yahoo'),
  };

  setCache(key, report, CACHE_TTL.dividends);
  return report;
}
