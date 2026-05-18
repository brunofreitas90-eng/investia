import type { Opportunity, OpportunityType, Quote } from '@/types';

export const OPPORTUNITY_TYPE_LABELS: Record<OpportunityType, string> = {
  discounted: 'Descontado',
  high_dividend: 'Alto dividendo',
  growth: 'Crescimento',
  trending: 'Em alta',
  forgotten: 'Esquecido',
};

export const OPPORTUNITY_TYPE_DESCRIPTIONS: Record<OpportunityType, string> = {
  discounted: 'Caiu recentemente e pode estar barata',
  high_dividend: 'Yield acima da média do mercado',
  growth: 'Valorização consistente no período',
  trending: 'Forte momentum de alta',
  forgotten: 'Estável, com bons proventos',
};

export interface TickerSnapshot {
  ticker: string;
  name?: string;
  price?: number;
  pe?: number;
  dividendYield?: number;
  changePercent?: number;
  currency?: 'BRL' | 'USD';
}

function buildMetrics(s: TickerSnapshot): Record<string, number | string> {
  const metrics: Record<string, number | string> = { ticker: s.ticker };
  if (s.price != null) metrics.price = s.price;
  if (s.pe != null) metrics.pe = s.pe;
  if (s.dividendYield != null) metrics.dividendYield = s.dividendYield;
  if (s.changePercent != null) metrics.changePercent = s.changePercent;
  if (s.currency) metrics.currency = s.currency;
  return metrics;
}

function candidate(
  s: TickerSnapshot,
  type: OpportunityType,
  score: number,
  reason: string
): Opportunity {
  return {
    ticker: s.ticker,
    name: s.name,
    type,
    score: Math.round(Math.min(100, Math.max(0, score))),
    reason,
    metrics: buildMetrics(s),
  };
}

/** Motor de regras — usado sem OpenAI ou como fallback */
export function findOpportunitiesByRules(snapshots: TickerSnapshot[]): Opportunity[] {
  const candidates: Opportunity[] = [];

  for (const s of snapshots) {
    const yield_ = s.dividendYield ?? 0;
    const change = s.changePercent ?? 0;
    const pe = s.pe;

    if (yield_ >= 5) {
      candidates.push(
        candidate(
          s,
          'high_dividend',
          50 + yield_ * 5,
          `Dividend yield de ${yield_.toFixed(1)}% a.a.`
        )
      );
    }

    if (change <= -3 && (pe == null || pe < 18)) {
      candidates.push(
        candidate(
          s,
          'discounted',
          55 + Math.min(25, Math.abs(change) * 2),
          `Queda de ${Math.abs(change).toFixed(1)}% — possível oportunidade de entrada`
        )
      );
    }

    if (change >= 3 && change < 8) {
      candidates.push(
        candidate(
          s,
          'growth',
          50 + change * 3,
          `Alta de ${change.toFixed(1)}% no período recente`
        )
      );
    }

    if (change >= 8) {
      candidates.push(
        candidate(
          s,
          'trending',
          65 + Math.min(20, change),
          `Momentum forte: +${change.toFixed(1)}%`
        )
      );
    }

    if (Math.abs(change) < 1.5 && yield_ >= 3) {
      candidates.push(
        candidate(
          s,
          'forgotten',
          52 + yield_ * 2,
          `Ativo estável com yield de ${yield_.toFixed(1)}%`
        )
      );
    }
  }

  const byTicker = new Map<string, Opportunity>();
  for (const opp of candidates.sort((a, b) => b.score - a.score)) {
    const existing = byTicker.get(opp.ticker);
    if (!existing || opp.score > existing.score) {
      byTicker.set(opp.ticker, opp);
    }
  }

  return Array.from(byTicker.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

export function snapshotFromQuote(
  quote: Quote,
  extras?: { pe?: number; dividendYield?: number }
): TickerSnapshot {
  return {
    ticker: quote.ticker,
    name: quote.name,
    price: quote.price,
    pe: extras?.pe ?? quote.pe,
    dividendYield: extras?.dividendYield ?? quote.dividendYield,
    changePercent: quote.changePercent,
    currency: quote.currency,
  };
}
