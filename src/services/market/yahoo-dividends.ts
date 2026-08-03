import type { DividendHistoryPayment } from '@/types';
import { classifyPaymentKind } from '@/lib/dividend-analytics';
import { mergeSourceLabels } from '@/lib/market-sources';
import { isBrazilianTicker, normalizeTicker } from '@/lib/utils';
import { cacheKey, getCache, setCache, CACHE_TTL } from './cache';

interface YahooDivEvent {
  amount: number;
  date: number;
}

/** Normaliza data para YYYY-MM-DD */
export function toDateOnly(value?: string | null): string | undefined {
  if (!value) return undefined;
  const d = new Date(value.includes('T') ? value : `${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) {
    const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
    return m?.[1];
  }
  return d.toISOString().split('T')[0];
}

/**
 * Histórico de dividendos públicos via Yahoo Finance (chart events).
 * Funciona para B3 (.SA) e ações internacionais.
 */
export async function fetchYahooDividendPayments(
  ticker: string,
  range: '5y' | '10y' | 'max' = 'max'
): Promise<DividendHistoryPayment[]> {
  const t = normalizeTicker(ticker);
  const symbol = isBrazilianTicker(t) ? `${t}.SA` : t;
  const key = cacheKey('yahoodiv', symbol, range);
  const cached = getCache<DividendHistoryPayment[]>(key);
  if (cached) return cached;

  try {
    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
      `?interval=1d&range=${range}&events=div%7Csplit`;
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];

    const json = await res.json();
    const events = json.chart?.result?.[0]?.events?.dividends as
      | Record<string, YahooDivEvent>
      | undefined;
    if (!events) return [];

    const payments: DividendHistoryPayment[] = Object.values(events)
      .filter((e) => e && e.amount > 0 && e.date)
      .map((e) => {
        const paymentDate = new Date(e.date * 1000).toISOString().split('T')[0];
        return {
          kind: classifyPaymentKind('Dividendo'),
          amountPerShare: e.amount,
          paymentDate,
          label: 'Dividendo',
          sources: mergeSourceLabels('yahoo'),
        };
      })
      .sort((a, b) => (b.paymentDate ?? '').localeCompare(a.paymentDate ?? ''));

    setCache(key, payments, CACHE_TTL.dividends);
    return payments;
  } catch {
    return [];
  }
}

/** Une pagamentos de várias fontes, sem duplicar (data ±1d + valor próximo). */
export function mergeDividendPayments(
  ...lists: DividendHistoryPayment[][]
): DividendHistoryPayment[] {
  const out: DividendHistoryPayment[] = [];

  for (const list of lists) {
    for (const p of list) {
      if (!p.amountPerShare || p.amountPerShare <= 0) continue;
      const date = p.paymentDate || p.comDate;
      if (!date) continue;

      const dup = out.find((x) => {
        const xd = x.paymentDate || x.comDate;
        if (!xd) return false;
        const days = Math.abs(
          (new Date(xd + 'T12:00:00').getTime() -
            new Date(date + 'T12:00:00').getTime()) /
            86400000
        );
        if (days > 2) return false;
        const rel =
          Math.abs(x.amountPerShare - p.amountPerShare) /
          Math.max(x.amountPerShare, p.amountPerShare, 1e-9);
        return rel < 0.08;
      });

      if (dup) {
        const sources = [...new Set([...(dup.sources ?? []), ...(p.sources ?? [])])];
        dup.sources = sources;
        if (!dup.comDate && p.comDate) dup.comDate = p.comDate;
        if (!dup.exDate && p.exDate) dup.exDate = p.exDate;
        if (!dup.paymentDate && p.paymentDate) dup.paymentDate = p.paymentDate;
        if ((!dup.label || dup.label === 'Dividendo') && p.label) dup.label = p.label;
        if (p.kind && p.kind !== 'outro') dup.kind = p.kind;
        continue;
      }

      out.push({ ...p });
    }
  }

  return out.sort((a, b) =>
    (b.paymentDate ?? b.comDate ?? '').localeCompare(a.paymentDate ?? a.comDate ?? '')
  );
}
