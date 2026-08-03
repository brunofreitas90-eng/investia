import type { PortfolioItem, PortfolioSummary, DashboardStats } from '@/types';
import type { Quote } from '@/types';
import {
  currentYield12m,
  sumDividendsLast12Months,
} from '@/lib/dividend-price-target';
import type { AggregatedPosition } from '@/lib/portfolio-aggregate';
import { buildDividendHistoryReport } from '@/services/market/dividend-history';
import { calculateProfitLoss } from './utils';

export function enrichPortfolio(
  items: PortfolioItem[],
  quotes: Map<string, Quote>
): PortfolioItem[] {
  return items.map((item) => {
    const quote = quotes.get(item.ticker.toUpperCase());
    const currentPrice = quote?.price ?? item.average_price;
    const { value, percent } = calculateProfitLoss(
      item.quantity,
      item.average_price,
      currentPrice
    );
    return {
      ...item,
      current_price: currentPrice,
      current_value: item.quantity * currentPrice,
      profit_loss: value,
      profit_loss_percent: percent,
      dividend_yield: quote?.dividendYield ?? item.dividend_yield,
    };
  });
}

/** Enriquece posições com % de dividendos (12m) sobre o preço médio de compra. */
export async function enrichPositionsWith5yDividends(
  positions: AggregatedPosition[]
): Promise<AggregatedPosition[]> {
  if (positions.length === 0) return positions;

  const uniqueTickers = [...new Set(positions.map((p) => p.ticker.toUpperCase()))];
  const reports = await Promise.all(
    uniqueTickers.map(async (ticker) => {
      try {
        const report = await buildDividendHistoryReport(ticker);
        return [ticker, report] as const;
      } catch {
        return [ticker, null] as const;
      }
    })
  );
  const byTicker = new Map(reports);

  return positions.map((pos) => {
    const report = byTicker.get(pos.ticker.toUpperCase());
    if (!report?.payments?.length || pos.averagePrice <= 0) return pos;

    const paid12m = sumDividendsLast12Months(report.payments);
    const yieldOnCost = currentYield12m(paid12m, pos.averagePrice);
    if (yieldOnCost == null || yieldOnCost <= 0) return pos;

    const rounded = Math.round(yieldOnCost * 10) / 10;

    return {
      ...pos,
      dividends5yAvgPerShare: paid12m,
      dividends5yAnnualAmount: paid12m * pos.totalQuantity,
      dividendYieldOnCost: rounded,
      dividendYield: rounded,
    };
  });
}

export function summarizePortfolio(items: PortfolioItem[]): PortfolioSummary {
  const enriched = items;
  const totalInvested = enriched.reduce(
    (s, i) => s + i.quantity * i.average_price,
    0
  );
  const currentValue = enriched.reduce(
    (s, i) => s + (i.current_value ?? i.quantity * i.average_price),
    0
  );
  const totalProfitLoss = currentValue - totalInvested;
  const totalProfitLossPercent =
    totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

  const byType = new Map<string, number>();
  enriched.forEach((i) => {
    const v = i.current_value ?? i.quantity * i.average_price;
    byType.set(i.asset_type, (byType.get(i.asset_type) || 0) + v);
  });

  const allocation = Array.from(byType.entries()).map(([type, value]) => ({
    type: type as PortfolioItem['asset_type'],
    value,
    percent: currentValue > 0 ? (value / currentValue) * 100 : 0,
  }));

  return {
    items: enriched,
    totalInvested,
    currentValue,
    totalProfitLoss,
    totalProfitLossPercent,
    allocation,
  };
}

export function buildDashboardStats(
  summary: PortfolioSummary,
  dividendsTotal = 0
): DashboardStats {
  const sorted = [...summary.items].sort(
    (a, b) => (b.profit_loss_percent ?? 0) - (a.profit_loss_percent ?? 0)
  );
  return {
    totalInvested: summary.totalInvested,
    currentPatrimony: summary.currentValue,
    profitLoss: summary.totalProfitLoss,
    profitLossPercent: summary.totalProfitLossPercent,
    dividendsReceived: dividendsTotal,
    monthlyReturn: summary.totalProfitLossPercent / 12,
    annualReturn: summary.totalProfitLossPercent,
    bestAssets: sorted.slice(0, 3).map((i) => ({
      ticker: i.ticker,
      return: i.profit_loss_percent ?? 0,
    })),
    worstAssets: sorted
      .slice(-3)
      .reverse()
      .map((i) => ({ ticker: i.ticker, return: i.profit_loss_percent ?? 0 })),
  };
}
