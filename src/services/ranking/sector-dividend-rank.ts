import {
  currentYield12m,
  sumDividendsLast12Months,
} from '@/lib/dividend-price-target';
import type { CoreSector } from '@/lib/investment-strategy';
import {
  SECTOR_DIVIDEND_UNIVERSE,
  SECTOR_ORDER,
} from '@/lib/sector-dividend-universe';
import { getQuotes } from '@/services/market';
import { buildDividendHistoryReport } from '@/services/market/dividend-history';
import { cacheKey, getCache, setCache, CACHE_TTL } from '@/services/market/cache';

export interface SectorDividendRankItem {
  rank: number;
  ticker: string;
  name: string;
  sector: CoreSector;
  price: number;
  dividendYield12m: number | null;
  dividends12mPerShare: number;
  changePercent?: number;
}

export interface SectorDividendRankGroup {
  sector: CoreSector;
  items: SectorDividendRankItem[];
}

export interface SectorDividendRankReport {
  generatedAt: string;
  groups: SectorDividendRankGroup[];
  dataSources: string[];
}

export async function buildSectorDividendRanking(): Promise<SectorDividendRankReport> {
  const key = cacheKey('sector', 'dy', 'rank', 'v1');
  const cached = getCache<SectorDividendRankReport>(key);
  if (cached) return cached;

  const universe = SECTOR_ORDER.flatMap((sector) =>
    SECTOR_DIVIDEND_UNIVERSE[sector].map((row) => ({ ...row, sector }))
  );
  const tickers = [...new Set(universe.map((u) => u.ticker))];

  const [quotes, reports] = await Promise.all([
    getQuotes(tickers),
    Promise.all(
      tickers.map(async (ticker) => {
        try {
          const report = await buildDividendHistoryReport(ticker);
          return [ticker, report] as const;
        } catch {
          return [ticker, null] as const;
        }
      })
    ),
  ]);

  const reportByTicker = new Map(reports);

  const groups: SectorDividendRankGroup[] = SECTOR_ORDER.map((sector) => {
    const rows = SECTOR_DIVIDEND_UNIVERSE[sector]
      .map((row) => {
        const quote = quotes.get(row.ticker);
        const report = reportByTicker.get(row.ticker);
        const price = quote?.price ?? report?.currentPrice ?? 0;
        const payments = report?.payments ?? [];
        const paid12m = sumDividendsLast12Months(payments);
        const dy = price > 0 ? currentYield12m(paid12m, price) : null;

        return {
          ticker: row.ticker,
          name: row.name,
          sector,
          price,
          dividendYield12m: dy != null ? Math.round(dy * 10) / 10 : null,
          dividends12mPerShare: Math.round(paid12m * 1000) / 1000,
          changePercent: quote?.changePercent,
          rank: 0,
        } satisfies SectorDividendRankItem;
      })
      .filter((r) => r.price > 0)
      .sort((a, b) => (b.dividendYield12m ?? -1) - (a.dividendYield12m ?? -1))
      .map((r, i) => ({ ...r, rank: i + 1 }));

    return { sector, items: rows };
  });

  const result: SectorDividendRankReport = {
    generatedAt: new Date().toISOString(),
    groups,
    dataSources: ['BRAPI (B3)', 'Yahoo Finance'],
  };

  setCache(key, result, CACHE_TTL.marketScan);
  return result;
}
