import type { BrapiDividend } from './brapi-extended';

export interface ReturnBreakdown {
  annualReturnPercent: number;
  annualPriceReturnPercent: number;
  annualDividendReturnPercent: number;
  projectedReturnPercent: number;
  projectedReturnExplanation: string;
}

export function calculateReturns(params: {
  currentPrice: number;
  priceHistory: { date: string; close: number }[];
  dividends?: BrapiDividend[];
  pe?: number;
  roe?: number;
  dividendYield?: number;
  eps?: number;
}): ReturnBreakdown {
  const { currentPrice, priceHistory, dividends = [], pe, roe, dividendYield, eps } = params;

  let annualPriceReturnPercent = 0;
  if (priceHistory.length >= 2 && currentPrice > 0) {
    const sorted = [...priceHistory].sort((a, b) => a.date.localeCompare(b.date));
    const firstPrice = sorted[0].close;
    if (firstPrice > 0) {
      annualPriceReturnPercent = ((currentPrice - firstPrice) / firstPrice) * 100;
    }
  }

  const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const dividendsLast12m = dividends
    .filter((d) => {
      if (!d.paymentDate) return true;
      return new Date(d.paymentDate).getTime() >= oneYearAgo;
    })
    .reduce((sum, d) => sum + (d.rate || 0), 0);

  const annualDividendReturnPercent =
    currentPrice > 0 ? (dividendsLast12m / currentPrice) * 100 : dividendYield ?? 0;

  const annualReturnPercent = annualPriceReturnPercent + annualDividendReturnPercent;

  // Projeção: yield + crescimento dos lucros (ROE × retenção) + ajuste de tendência
  const dy = dividendYield ?? annualDividendReturnPercent;
  const roeVal = roe ?? 15;
  const earningsGrowthEstimate = (roeVal / 100) * 0.55 * 100; // ~55% retenção
  const peAdjustment = pe && pe < 10 ? 2 : pe && pe > 25 ? -2 : 0;
  const momentumFactor = annualPriceReturnPercent * 0.25;

  const projectedReturnPercent = Math.min(
    50,
    Math.max(-25, dy + earningsGrowthEstimate * 0.4 + peAdjustment + momentumFactor)
  );

  const projectedReturnExplanation =
    `Projeção baseada em dividend yield (~${dy.toFixed(1)}%), ` +
    `crescimento estimado dos lucros (ROE ${roeVal.toFixed(0)}%), ` +
    `múltiplo P/L${pe ? ` ${pe.toFixed(1)}` : ''} e tendência recente. ` +
    `Não é garantia de retorno futuro.`;

  return {
    annualReturnPercent: round2(annualReturnPercent),
    annualPriceReturnPercent: round2(annualPriceReturnPercent),
    annualDividendReturnPercent: round2(annualDividendReturnPercent),
    projectedReturnPercent: round2(projectedReturnPercent),
    projectedReturnExplanation,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
