import { demoPortfolio, popularTickers } from '@/lib/demo-data';
import { findOpportunitiesByRules, snapshotFromQuote, type TickerSnapshot } from '@/lib/radar-rules';
import { findOpportunities } from '@/services/ai/openai';
import { getFundamentals, getQuotes } from '@/services/market';
import { isBrazilianTicker } from '@/lib/utils';
import type { Opportunity, OpportunityType, Quote } from '@/types';

export type RadarSource = 'popular' | 'portfolio' | 'all';

export interface RadarScanResult {
  opportunities: Opportunity[];
  scannedCount: number;
  source: RadarSource;
  scannedAt: string;
  mode: 'ai' | 'rules';
}

function resolveTickers(source: RadarSource): string[] {
  const portfolio = demoPortfolio.map((p) => p.ticker);
  const popular = [...popularTickers];

  if (source === 'portfolio') return [...new Set(portfolio)];
  if (source === 'popular') return [...new Set(popular)];
  return [...new Set([...popular, ...portfolio])];
}

async function buildSnapshots(tickers: string[], quotes: Map<string, Quote>): Promise<TickerSnapshot[]> {
  const snapshots: TickerSnapshot[] = [];

  await Promise.all(
    tickers.map(async (ticker) => {
      const quote = quotes.get(ticker.toUpperCase());
      if (!quote) return;

      let pe = quote.pe;
      let dividendYield = quote.dividendYield;

      const portfolioItem = demoPortfolio.find((p) => p.ticker === ticker);
      if (portfolioItem?.dividend_yield != null) {
        dividendYield = portfolioItem.dividend_yield;
      }

      if (isBrazilianTicker(ticker)) {
        const fund = await getFundamentals(ticker);
        if (fund) {
          pe = fund.pe ?? pe;
          dividendYield = fund.dividendYield ?? dividendYield;
        }
      }

      snapshots.push(snapshotFromQuote(quote, { pe, dividendYield }));
    })
  );

  return snapshots;
}

interface RawOpportunity {
  ticker: string;
  type?: string;
  score?: number;
  reason?: string;
  name?: string;
}

function enrichOpportunities(
  raw: RawOpportunity[],
  snapshots: TickerSnapshot[]
): Opportunity[] {
  const snapMap = new Map(snapshots.map((s) => [s.ticker, s]));

  const validTypes: OpportunityType[] = [
    'discounted',
    'high_dividend',
    'growth',
    'trending',
    'forgotten',
  ];

  const enriched: Opportunity[] = [];

  for (const opp of raw) {
    const snap = snapMap.get(opp.ticker?.toUpperCase() ?? '');
    if (!snap) continue;

    const type = (opp.type as OpportunityType) || 'growth';

    enriched.push({
      ticker: snap.ticker,
      name: snap.name ?? opp.name,
      type: validTypes.includes(type) ? type : 'growth',
      score: Math.round(Math.min(100, Math.max(0, Number(opp.score) || 50))),
      reason: String(opp.reason || 'Oportunidade identificada pela IA'),
      metrics: {
        ...(snap.price != null ? { price: snap.price } : {}),
        ...(snap.pe != null ? { pe: snap.pe } : {}),
        ...(snap.dividendYield != null ? { dividendYield: snap.dividendYield } : {}),
        ...(snap.changePercent != null ? { changePercent: snap.changePercent } : {}),
        currency: snap.currency ?? 'BRL',
      },
    });
  }

  return enriched.sort((a, b) => b.score - a.score).slice(0, 8);
}

export async function scanOpportunities(
  source: RadarSource = 'all',
  typeFilter?: OpportunityType | 'all'
): Promise<RadarScanResult> {
  const tickers = resolveTickers(source);
  const quotes = await getQuotes(tickers);
  const snapshots = await buildSnapshots(
    tickers.filter((t) => quotes.has(t.toUpperCase())),
    quotes
  );

  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  let opportunities: Opportunity[];
  let mode: 'ai' | 'rules';

  if (hasOpenAI && snapshots.length > 0) {
    const aiInput = snapshots.map((s) => ({
      ticker: s.ticker,
      name: s.name,
      pe: s.pe,
      dividendYield: s.dividendYield,
      changePercent: s.changePercent,
    }));

    const raw = await findOpportunities(aiInput);
    opportunities =
      raw.length > 0 ? enrichOpportunities(raw, snapshots) : findOpportunitiesByRules(snapshots);
    mode = raw.length > 0 ? 'ai' : 'rules';
  } else {
    opportunities = findOpportunitiesByRules(snapshots);
    mode = 'rules';
  }

  if (typeFilter && typeFilter !== 'all') {
    opportunities = opportunities.filter((o) => o.type === typeFilter);
  }

  return {
    opportunities,
    scannedCount: snapshots.length,
    source,
    scannedAt: new Date().toISOString(),
    mode,
  };
}
