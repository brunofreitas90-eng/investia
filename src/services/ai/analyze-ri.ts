import type { CompanyAnalysis, RIAnalysisReport } from '@/types';
import { calculateBuyScore, scoreToRecommendation } from '@/lib/buy-score';
import { analyzeCompany } from './openai';

export async function analyzeWithRI(
  ticker: string,
  riReport: RIAnalysisReport,
  fundamentals: Record<string, unknown>,
  quote?: { price: number; name?: string } | null
): Promise<CompanyAnalysis> {
  const base = await analyzeCompany(
    ticker,
    {
      ...fundamentals,
      riMetrics: riReport.metrics,
      returns: {
        annual: riReport.annualReturnPercent,
        projected: riReport.projectedReturnPercent,
      },
    },
    quote
      ? {
          ticker,
          price: quote.price,
          name: quote.name,
          change: 0,
          changePercent: 0,
          currency: riReport.metrics.currency,
          source: 'ri',
          updatedAt: new Date().toISOString(),
        }
      : null
  );

  const computed = calculateBuyScore(riReport);
  const blendedScore =
    Math.round((base.buyScore * 0.45 + computed.buyScore * 0.55) * 10) / 10;
  const finalRec = scoreToRecommendation(blendedScore);

  const riPrompt = buildRISummary(riReport);

  return {
    ...base,
    summary: `${base.summary}\n\n${riPrompt}`,
    growth: riReport.growthAnalysis,
    profit: riReport.numbersAnalysis,
    buyScore: blendedScore,
    buyRecommendation: finalRec.buyRecommendation,
    buyRecommendationLabel: finalRec.buyRecommendationLabel,
    recommendation: finalRec.recommendation,
    score: Math.round(blendedScore * 10),
    plainLanguage: buildPlainLanguage(blendedScore, finalRec.buyRecommendation, riReport, base.plainLanguage),
    riReport,
  };
}

function buildRISummary(ri: RIAnalysisReport): string {
  return (
    `Dados públicos (${ri.dataSource.join(', ')}) — ${ri.companyName}. ` +
    `${ri.growthAnalysis}`
  );
}

function formatPct(n: number): string {
  return `${n.toFixed(2)}%`;
}

function buildPlainLanguage(
  score: number,
  buyRec: string,
  ri: RIAnalysisReport,
  basePlain: string
): string {
  const div = ri.dividendCalendar;
  let text =
    `Nota de compra: ${score}/10 — ${buyRec}\n\n` +
    `Retorno exato no último ano: ${formatPct(ri.annualReturnPercent)} ` +
    `(valorização ${formatPct(ri.annualPriceReturnPercent)} + dividendos ${formatPct(ri.annualDividendReturnPercent)}).\n`;

  if (div) {
    text += `Frequência de pagamento: ${div.paymentFrequency}.\n`;
    if (div.nextComDate) text += `Próxima data COM: ${formatDate(div.nextComDate)}.\n`;
    if (div.lastDividend?.paymentDate) {
      text += `Último dividendo: R$ ${div.lastDividend.amountPerShare?.toFixed(4)} por ação em ${formatDate(div.lastDividend.paymentDate)}.\n`;
    }
    if (div.nextDividend?.paymentDate) {
      text += `Próximo dividendo: R$ ${div.nextDividend.amountPerShare?.toFixed(4)} por ação em ${formatDate(div.nextDividend.paymentDate)}.\n`;
    }
  }

  text += `\nRetorno projetado (12 meses): ${formatPct(ri.projectedReturnPercent)} (estimativa).\n\n${basePlain}`;
  return text;
}

function formatDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR');
}
