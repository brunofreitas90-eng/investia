import type { RIAnalysisReport } from '@/types';

export type BuyRecommendationLabel =
  | 'compra_forte'
  | 'compra'
  | 'neutro'
  | 'cautela'
  | 'evitar';

export interface BuyScoreResult {
  buyScore: number;
  buyRecommendation: string;
  buyRecommendationLabel: BuyRecommendationLabel;
  recommendation: 'buy' | 'hold' | 'sell' | 'neutral';
}

export function calculateBuyScore(ri?: RIAnalysisReport | null): BuyScoreResult {
  if (!ri) {
    return {
      buyScore: 5,
      buyRecommendation: 'Dados insuficientes para nota precisa.',
      buyRecommendationLabel: 'neutro',
      recommendation: 'neutral',
    };
  }

  let score = 5;
  const m = ri.metrics;

  if (m.pe != null) {
    if (m.pe < 8) score += 1.5;
    else if (m.pe < 12) score += 1;
    else if (m.pe > 25) score -= 1.2;
    else if (m.pe > 18) score -= 0.5;
  }

  if (m.roe != null) {
    if (m.roe >= 18) score += 1.2;
    else if (m.roe >= 12) score += 0.6;
    else if (m.roe < 8) score -= 1;
  }

  if (m.dividendYield != null && m.dividendYield >= 6) score += 0.5;
  if (m.revenueGrowth != null && m.revenueGrowth > 10) score += 0.8;
  if (m.revenueGrowth != null && m.revenueGrowth < 0) score -= 0.8;

  if (ri.annualReturnPercent > 20) score += 1;
  else if (ri.annualReturnPercent > 5) score += 0.4;
  else if (ri.annualReturnPercent < -15) score -= 1.5;
  else if (ri.annualReturnPercent < 0) score -= 0.7;

  if (ri.projectedReturnPercent > 15) score += 0.6;
  else if (ri.projectedReturnPercent < 0) score -= 0.5;

  if (m.fiftyTwoWeekHigh && m.fiftyTwoWeekLow && m.price) {
    const range = m.fiftyTwoWeekHigh - m.fiftyTwoWeekLow;
    if (range > 0) {
      const position = (m.price - m.fiftyTwoWeekLow) / range;
      if (position < 0.35) score += 0.5;
      if (position > 0.9) score -= 0.4;
    }
  }

  const buyScore = Math.round(Math.min(10, Math.max(0, score)) * 10) / 10;
  return scoreToRecommendation(buyScore);
}

export function scoreToRecommendation(buyScore: number): BuyScoreResult {
  const s = Math.min(10, Math.max(0, buyScore));

  if (s >= 8.5) {
    return {
      buyScore: s,
      buyRecommendationLabel: 'compra_forte',
      buyRecommendation: 'Compra forte — fundamentos sólidos e bom potencial de retorno.',
      recommendation: 'buy',
    };
  }
  if (s >= 7) {
    return {
      buyScore: s,
      buyRecommendationLabel: 'compra',
      buyRecommendation: 'Compra — empresa com indicadores favoráveis para entrada.',
      recommendation: 'buy',
    };
  }
  if (s >= 5.5) {
    return {
      buyScore: s,
      buyRecommendationLabel: 'neutro',
      buyRecommendation: 'Neutro — pode manter na carteira, mas sem urgência de compra.',
      recommendation: 'hold',
    };
  }
  if (s >= 4) {
    return {
      buyScore: s,
      buyRecommendationLabel: 'cautela',
      buyRecommendation: 'Cautela — aguarde melhor preço ou mais clareza nos resultados.',
      recommendation: 'neutral',
    };
  }
  return {
    buyScore: s,
    buyRecommendationLabel: 'evitar',
    buyRecommendation: 'Evitar compra — riscos e indicadores desfavoráveis no momento.',
    recommendation: 'sell',
  };
}

export function normalizeBuyScore(raw: unknown, fallback = 5): number {
  const n = Number(raw);
  if (Number.isNaN(n)) return fallback;
  if (n > 10 && n <= 100) return Math.round((n / 10) * 10) / 10;
  return Math.min(10, Math.max(0, Math.round(n * 10) / 10));
}
