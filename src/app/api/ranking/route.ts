import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOrDemo } from '@/lib/api-guard';
import { popularTickers } from '@/lib/demo-data';
import {
  buildMarketRanking,
  buildPortfolioRanking,
  buildRankingReport,
  buildWatchlistRanking,
  type RankingMetric,
  type RankingScope,
} from '@/lib/asset-ranking';
import { enrichPortfolio } from '@/lib/portfolio';
import { enrichWatchlist } from '@/lib/watchlist';
import { resolvePortfolioItems } from '@/lib/resolve-portfolio-items';
import { resolveWatchlistItems } from '@/lib/resolve-watchlist-items';
import { getQuotes } from '@/services/market';
import type { PortfolioItem, WatchlistItem } from '@/types';

const SCOPES: RankingScope[] = ['portfolio', 'watchlist', 'market'];
const METRICS: RankingMetric[] = ['return', 'dividend', 'value', 'day_change'];

async function buildRanking(
  scope: RankingScope,
  metric: RankingMetric,
  portfolioOverride?: PortfolioItem[],
  watchlistOverride?: WatchlistItem[]
) {
  const portfolioRaw = portfolioOverride ?? (await resolvePortfolioItems());
  const portfolioQuotes = await getQuotes(portfolioRaw.map((i) => i.ticker));
  const portfolio = enrichPortfolio(portfolioRaw, portfolioQuotes);
  const portfolioTickers = new Set(portfolio.map((p) => p.ticker.toUpperCase()));

  let items;

  if (scope === 'portfolio') {
    items = buildPortfolioRanking(portfolio, metric, portfolioTickers);
  } else if (scope === 'watchlist') {
    const watchlistRaw = watchlistOverride ?? (await resolveWatchlistItems());
    const watchlistQuotes = await getQuotes(watchlistRaw.map((i) => i.ticker));
    const watchlist = enrichWatchlist(watchlistRaw, watchlistQuotes);
    items = buildWatchlistRanking(watchlist, metric, portfolioTickers);
  } else {
    const tickers = [...new Set([...popularTickers, ...portfolio.map((p) => p.ticker)])];
    const quotes = await getQuotes(tickers);
    items = buildMarketRanking(tickers, quotes, metric, portfolioTickers);
  }

  return buildRankingReport(scope, metric, items);
}

export async function GET(request: NextRequest) {
  const access = await requireAuthOrDemo(request);
  if (!access.ok) return access.response;

  try {
    const scope = (request.nextUrl.searchParams.get('scope') ||
      'portfolio') as RankingScope;
    const metric = (request.nextUrl.searchParams.get('metric') ||
      'return') as RankingMetric;

    if (!SCOPES.includes(scope)) {
      return NextResponse.json({ error: 'Escopo inválido' }, { status: 400 });
    }
    if (!METRICS.includes(metric)) {
      return NextResponse.json({ error: 'Métrica inválida' }, { status: 400 });
    }

    return NextResponse.json(await buildRanking(scope, metric));
  } catch {
    return NextResponse.json({ error: 'Falha ao gerar ranking' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const scope = (body.scope || 'portfolio') as RankingScope;
    const metric = (body.metric || 'return') as RankingMetric;

    if (!SCOPES.includes(scope)) {
      return NextResponse.json({ error: 'Escopo inválido' }, { status: 400 });
    }
    if (!METRICS.includes(metric)) {
      return NextResponse.json({ error: 'Métrica inválida' }, { status: 400 });
    }

    return NextResponse.json(
      await buildRanking(
        scope,
        metric,
        body.portfolioItems as PortfolioItem[] | undefined,
        body.watchlistItems as WatchlistItem[] | undefined
      )
    );
  } catch {
    return NextResponse.json({ error: 'Falha ao gerar ranking' }, { status: 500 });
  }
}
