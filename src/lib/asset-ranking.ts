import type { PortfolioItem, Quote, WatchlistItem } from '@/types';

export type RankingScope = 'portfolio' | 'watchlist' | 'market';
export type RankingMetric = 'return' | 'dividend' | 'value' | 'day_change';

export const RANKING_METRIC_LABELS: Record<RankingMetric, string> = {
  return: 'Rentabilidade',
  dividend: 'Dividendos (DY)',
  value: 'Valor / tamanho',
  day_change: 'Variação do dia',
};

export const RANKING_SCOPE_LABELS: Record<RankingScope, string> = {
  portfolio: 'Minha carteira',
  watchlist: 'Watchlist',
  market: 'Mercado (populares)',
};

export interface RankedAsset {
  rank: number;
  ticker: string;
  name?: string;
  asset_type?: string;
  metricValue: number;
  metricFormatted: string;
  secondaryLabel?: string;
  secondaryValue?: string;
  changePercent?: number;
  dividendYield?: number;
  currentPrice?: number;
  currentValue?: number;
  profitLoss?: number;
  profitLossPercent?: number;
  inPortfolio: boolean;
}

export interface RankingReport {
  scope: RankingScope;
  metric: RankingMetric;
  items: RankedAsset[];
  summary: {
    best?: RankedAsset;
    worst?: RankedAsset;
    averageMetric: number;
    totalCount: number;
  };
  scannedAt: string;
}

function formatMetricValue(metric: RankingMetric, value: number): string {
  if (metric === 'value') {
    if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(2)} mi`;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function assignRanks(items: RankedAsset[]): RankedAsset[] {
  const sorted = [...items].sort((a, b) => b.metricValue - a.metricValue);
  return sorted.map((item, i) => ({ ...item, rank: i + 1 }));
}

export function buildPortfolioRanking(
  items: PortfolioItem[],
  metric: RankingMetric,
  portfolioTickers: Set<string>
): RankedAsset[] {
  const ranked: RankedAsset[] = items.map((item) => {
    let metricValue = 0;
    switch (metric) {
      case 'return':
        metricValue = item.profit_loss_percent ?? 0;
        break;
      case 'dividend':
        metricValue = item.dividend_yield ?? 0;
        break;
      case 'value':
        metricValue =
          item.current_value ??
          item.quantity * (item.current_price ?? item.average_price);
        break;
      case 'day_change':
        metricValue =
          item.current_price && item.average_price
            ? ((item.current_price - item.average_price) / item.average_price) * 100
            : 0;
        break;
    }

    return {
      rank: 0,
      ticker: item.ticker,
      asset_type: item.asset_type,
      metricValue,
      metricFormatted: formatMetricValue(metric, metricValue),
      changePercent: item.profit_loss_percent,
      dividendYield: item.dividend_yield,
      currentPrice: item.current_price,
      currentValue: item.current_value,
      profitLoss: item.profit_loss,
      profitLossPercent: item.profit_loss_percent,
      secondaryLabel: metric === 'value' ? 'Rentab.' : 'Valor',
      secondaryValue:
        metric === 'value'
          ? formatMetricValue('return', item.profit_loss_percent ?? 0)
          : item.current_value != null
            ? new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(item.current_value)
            : undefined,
      inPortfolio: portfolioTickers.has(item.ticker),
    };
  });

  return assignRanks(ranked);
}

export function buildWatchlistRanking(
  items: WatchlistItem[],
  metric: RankingMetric,
  portfolioTickers: Set<string>
): RankedAsset[] {
  const ranked: RankedAsset[] = items.map((item) => {
    let metricValue = 0;
    switch (metric) {
      case 'return':
      case 'day_change':
        metricValue = item.change_percent ?? 0;
        break;
      case 'dividend':
        metricValue = 0;
        break;
      case 'value':
        metricValue = item.current_price ?? 0;
        break;
    }

    return {
      rank: 0,
      ticker: item.ticker,
      asset_type: item.asset_type,
      metricValue,
      metricFormatted:
        metric === 'value' && item.current_price != null
          ? new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(item.current_price)
          : formatMetricValue(metric, metricValue),
      changePercent: item.change_percent,
      currentPrice: item.current_price,
      secondaryLabel: 'Tipo',
      secondaryValue: item.asset_type,
      inPortfolio: portfolioTickers.has(item.ticker),
    };
  });

  return assignRanks(ranked);
}

export function buildMarketRanking(
  tickers: string[],
  quotes: Map<string, Quote>,
  metric: RankingMetric,
  portfolioTickers: Set<string>
): RankedAsset[] {
  const ranked = tickers
    .map((ticker): RankedAsset | null => {
      const quote = quotes.get(ticker.toUpperCase());
      if (!quote) return null;

      let metricValue = 0;
      switch (metric) {
        case 'return':
        case 'day_change':
          metricValue = quote.changePercent ?? 0;
          break;
        case 'dividend':
          metricValue = quote.dividendYield ?? 0;
          break;
        case 'value':
          metricValue = quote.marketCap ?? quote.price * 1_000_000;
          break;
      }

      return {
        rank: 0,
        ticker: quote.ticker,
        name: quote.name,
        metricValue,
        metricFormatted:
          metric === 'value'
            ? quote.marketCap != null
              ? `R$ ${(quote.marketCap / 1_000_000_000).toFixed(1)} bi`
              : formatMetricValue('value', quote.price)
            : formatMetricValue(metric, metricValue),
        changePercent: quote.changePercent,
        dividendYield: quote.dividendYield,
        currentPrice: quote.price,
        secondaryLabel: 'Preço',
        secondaryValue: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: quote.currency,
        }).format(quote.price),
        inPortfolio: portfolioTickers.has(quote.ticker),
      } satisfies RankedAsset;
    })
    .filter((x): x is RankedAsset => x != null);

  return assignRanks(ranked);
}

export function buildRankingReport(
  scope: RankingScope,
  metric: RankingMetric,
  items: RankedAsset[]
): RankingReport {
  const averageMetric =
    items.length > 0
      ? items.reduce((s, i) => s + i.metricValue, 0) / items.length
      : 0;

  const sorted = [...items].sort((a, b) => b.metricValue - a.metricValue);

  return {
    scope,
    metric,
    items,
    summary: {
      best: sorted[0],
      worst: sorted[sorted.length - 1],
      averageMetric,
      totalCount: items.length,
    },
    scannedAt: new Date().toISOString(),
  };
}
