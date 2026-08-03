import type { DividendHistoryPayment, DividendHistoryAnalytics } from '@/types';
import { analyzePaymentSchedule } from '@/lib/payment-schedule';

export function classifyPaymentKind(label?: string): DividendHistoryPayment['kind'] {
  const l = (label ?? '').toLowerCase();
  if (
    l.includes('jcp') ||
    l.includes('jscp') ||
    l.includes('juros sobre capital')
  ) {
    return 'jcp';
  }
  if (l.includes('rendimento') || l.includes('fii')) return 'rendimento';
  if (l.includes('dividendo') || l.includes('dividend')) return 'dividendo';
  return 'outro';
}

export function analyzeDividendHistory(
  payments: DividendHistoryPayment[],
  currentPrice: number
): DividendHistoryAnalytics {
  const paid = payments.filter((p) => p.paymentDate);
  const byYear = new Map<number, { total: number; count: number }>();

  for (const p of paid) {
    const y = new Date(p.paymentDate!).getFullYear();
    const row = byYear.get(y) ?? { total: 0, count: 0 };
    row.total += p.amountPerShare;
    row.count += 1;
    byYear.set(y, row);
  }

  const yearlyTotals = Array.from(byYear.entries())
    .map(([year, v]) => ({ year, total: v.total, count: v.count }))
    .sort((a, b) => a.year - b.year);

  const years = yearlyTotals.map((y) => y.year);
  const now = new Date().getFullYear();

  const last3 = yearlyTotals.filter((y) => y.year >= now - 3);
  const last5 = yearlyTotals.filter((y) => y.year >= now - 5);

  const avg3yPerShare =
    last3.length > 0 ? last3.reduce((s, y) => s + y.total, 0) / last3.length : undefined;
  const avg5yPerShare =
    last5.length > 0 ? last5.reduce((s, y) => s + y.total, 0) / last5.length : undefined;

  let growth3yAvgPercent: number | undefined;
  let growth5yAvgPercent: number | undefined;

  if (last3.length >= 2) {
    const first = last3[0].total;
    const last = last3[last3.length - 1].total;
    if (first > 0) growth3yAvgPercent = ((last / first) ** (1 / (last3.length - 1)) - 1) * 100;
  }
  if (last5.length >= 2) {
    const first = last5[0].total;
    const last = last5[last5.length - 1].total;
    if (first > 0) growth5yAvgPercent = ((last / first) ** (1 / (last5.length - 1)) - 1) * 100;
  }

  const paymentsLast12m = paid.filter((p) => {
    const d = new Date(p.paymentDate! + 'T12:00:00');
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    return d >= cutoff;
  }).length;

  const schedule = analyzePaymentSchedule(payments);
  const frequency = schedule.frequency;

  const uniqueYears = new Set(years);
  const consistencyScore = Math.min(
    10,
    Math.round((uniqueYears.size / Math.max(1, years.length > 0 ? now - years[0] + 1 : 1)) * 10)
  );

  let growthScore = 5;
  if (growth3yAvgPercent != null) {
    if (growth3yAvgPercent > 10) growthScore = 9;
    else if (growth3yAvgPercent > 5) growthScore = 7.5;
    else if (growth3yAvgPercent > 0) growthScore = 6;
    else if (growth3yAvgPercent < -5) growthScore = 3;
    else growthScore = 4.5;
  }

  const dy12 =
    currentPrice > 0 && avg3yPerShare
      ? (paid
          .filter((p) => new Date(p.paymentDate!).getFullYear() === now)
          .reduce((s, p) => s + p.amountPerShare, 0) /
          currentPrice) *
        100
      : 0;

  let dividendScore = 5;
  if (dy12 >= 8) dividendScore += 2;
  else if (dy12 >= 5) dividendScore += 1;
  else if (dy12 >= 3) dividendScore += 0.5;
  if (consistencyScore >= 7) dividendScore += 1;
  if (growthScore >= 7) dividendScore += 0.8;
  dividendScore = Math.min(10, Math.max(0, Math.round(dividendScore * 10) / 10));

  const dividendScoreExplanation = buildDividendExplanation(
    dividendScore,
    schedule.scheduleSummary,
    growth3yAvgPercent,
    consistencyScore,
    dy12
  );

  return {
    growth3yAvgPercent,
    growth5yAvgPercent,
    avg3yPerShare,
    avg5yPerShare,
    frequency,
    paymentsLast12m,
    paymentsPerYear: schedule.paymentsPerYear,
    typicalMonths: schedule.typicalMonthLabels,
    scheduleSummary: schedule.scheduleSummary,
    growthScore,
    consistencyScore,
    dividendScore,
    dividendScoreExplanation,
    yearlyTotals,
  };
}

function buildDividendExplanation(
  score: number,
  scheduleSummary: string,
  growth?: number,
  consistency?: number,
  dy?: number
): string {
  const parts: string[] = [];
  if (score >= 8) parts.push('Empresa com histórico sólido de proventos.');
  else if (score >= 6) parts.push('Pagamentos razoáveis, com alguns pontos de atenção.');
  else parts.push('Histórico de dividendos fraco ou irregular.');

  parts.push(`Calendário: ${scheduleSummary}.`);
  if (growth != null) parts.push(`Crescimento médio dos proventos: ${growth.toFixed(1)}% a.a. (últimos anos).`);
  if (consistency != null) parts.push(`Consistência: ${consistency}/10.`);
  if (dy != null && dy > 0) parts.push(`Yield últimos 12 meses: ~${dy.toFixed(1)}%.`);
  return parts.join(' ');
}

export function buildYieldHistory(
  yearlyTotals: { year: number; total: number }[],
  priceByYear?: Map<number, number>
): { year: number; yieldPercent: number }[] {
  return yearlyTotals
    .map((y) => {
      const price = priceByYear?.get(y.year);
      if (!price || price <= 0) return null;
      return { year: y.year, yieldPercent: (y.total / price) * 100 };
    })
    .filter((x): x is { year: number; yieldPercent: number } => x != null);
}

/** Soma dos proventos/ação nos últimos 5 anos civis (inclui o ano atual). */
export function sumDividendsLast5YearsPerShare(
  yearlyTotals: { year: number; total: number }[]
): number {
  const now = new Date().getFullYear();
  return yearlyTotals
    .filter((y) => y.year >= now - 4)
    .reduce((s, y) => s + y.total, 0);
}

/**
 * Yield médio a.a. dos últimos 5 anos sobre o preço médio de compra.
 * Retorna também a média anual por ação e o total pago no período.
 */
export function yieldOnAverageCostFrom5y(
  yearlyTotals: { year: number; total: number }[],
  averagePrice: number
): {
  avg5yPerShare: number;
  total5yPerShare: number;
  yieldOnCostPercent: number;
  yearsWithData: number;
} | null {
  if (averagePrice <= 0) return null;
  const now = new Date().getFullYear();
  const last5 = yearlyTotals.filter((y) => y.year >= now - 4);
  if (last5.length === 0) return null;

  const total5yPerShare = last5.reduce((s, y) => s + y.total, 0);
  const avg5yPerShare = total5yPerShare / last5.length;
  return {
    avg5yPerShare,
    total5yPerShare,
    yieldOnCostPercent: (avg5yPerShare / averagePrice) * 100,
    yearsWithData: last5.length,
  };
}
