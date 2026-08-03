import type { CompanyAutoRating, DividendHistoryAnalytics, RIAnalysisReport } from '@/types';

export function calculateCompanyAutoRating(
  ticker: string,
  ri: RIAnalysisReport | null,
  dividendAnalytics?: DividendHistoryAnalytics | null
): CompanyAutoRating {
  const m = ri?.metrics;
  const name = ri?.companyName ?? ticker;
  const sources = [...(ri?.dataSource ?? []), 'Análise DelfoInvestIA'];

  const dividends = scoreDividends(m?.dividendYield, dividendAnalytics);
  const growth = scoreGrowth(m?.revenueGrowth, ri?.annualReturnPercent);
  const profit = scoreProfit(m?.roe, m?.profitMargin, m?.pe);
  const debt = scoreDebt(m?.debtToEquity);
  const governance = scoreGovernance(ri);
  const consistency = scoreConsistency(dividendAnalytics, ri);

  const finalScore = Math.round(
    ((dividends + growth + profit + debt + governance + consistency) / 6) * 10
  ) / 10;

  const explanation = buildExplanation(name, finalScore, {
    dividends,
    growth,
    profit,
    debt,
    governance,
    consistency,
  });

  return {
    ticker,
    companyName: name,
    finalScore,
    dimensions: { dividends, growth, profit, debt, governance, consistency },
    explanation,
    dataSources: sources,
  };
}

function scoreDividends(dy?: number, div?: DividendHistoryAnalytics | null): number {
  let s = 5;
  if (div?.dividendScore) s = div.dividendScore;
  else if (dy != null) {
    if (dy >= 8) s = 9;
    else if (dy >= 5) s = 7;
    else if (dy >= 3) s = 6;
    else s = 4;
  }
  return clamp(s);
}

function scoreGrowth(revenueGrowth?: number, annualReturn?: number): number {
  let s = 5;
  if (revenueGrowth != null) {
    if (revenueGrowth > 15) s += 2;
    else if (revenueGrowth > 5) s += 1;
    else if (revenueGrowth < 0) s -= 1.5;
  }
  if (annualReturn != null) {
    if (annualReturn > 15) s += 1;
    else if (annualReturn < -10) s -= 1.5;
  }
  return clamp(s);
}

function scoreProfit(roe?: number, margin?: number, pe?: number): number {
  let s = 5;
  if (roe != null) {
    if (roe >= 18) s += 1.5;
    else if (roe >= 12) s += 0.8;
    else if (roe < 8) s -= 1;
  }
  if (margin != null && margin > 0.15) s += 0.5;
  if (pe != null) {
    if (pe < 10) s += 0.5;
    if (pe > 25) s -= 0.8;
  }
  return clamp(s);
}

function scoreDebt(dte?: number): number {
  if (dte == null) return 5;
  if (dte < 0.5) return 8.5;
  if (dte < 1) return 7;
  if (dte < 2) return 5.5;
  if (dte < 3) return 4;
  return 3;
}

function scoreGovernance(ri: RIAnalysisReport | null): number {
  if (!ri) return 5;
  let s = 6;
  if (ri.sector) s += 0.5;
  if (ri.dataSource.length >= 2) s += 0.5;
  return clamp(s);
}

function scoreConsistency(
  div?: DividendHistoryAnalytics | null,
  ri?: RIAnalysisReport | null
): number {
  if (div?.consistencyScore) return clamp(div.consistencyScore);
  const freq = ri?.dividendCalendar?.paymentFrequency ?? '';
  if (freq.includes('Mensal')) return 8;
  if (freq.includes('Trimestral')) return 7;
  if (freq.includes('Semestral')) return 6;
  return 5;
}

function clamp(n: number): number {
  return Math.min(10, Math.max(0, Math.round(n * 10) / 10));
}

function buildExplanation(
  name: string,
  final: number,
  d: CompanyAutoRating['dimensions']
): string {
  const lines = [`${name} recebeu nota ${final.toFixed(1)}/10.`];

  const best = Object.entries(d).sort((a, b) => b[1] - a[1])[0];
  const worst = Object.entries(d).sort((a, b) => a[1] - b[1])[0];

  const labels: Record<string, string> = {
    dividends: 'dividendos',
    growth: 'crescimento',
    profit: 'lucratividade',
    debt: 'endividamento',
    governance: 'governança',
    consistency: 'consistência',
  };

  lines.push(`Ponto forte: ${labels[best[0]]} (${best[1]}/10).`);
  if (worst[1] < 6) {
    lines.push(`Atenção em ${labels[worst[0]]} (${worst[1]}/10).`);
  }
  if (final >= 8) lines.push('Perfil sólido para investidor de longo prazo.');
  else if (final >= 6) lines.push('Empresa equilibrada, com riscos moderados.');
  else lines.push('Exige cautela — analise antes de aumentar posição.');

  return lines.join(' ');
}
