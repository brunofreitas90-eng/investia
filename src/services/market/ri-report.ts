import type { RIAnalysisReport, RIFinancialMetrics, DividendCalendarInfo } from '@/types';
import { formatDateBR } from '@/lib/utils';
import { isBrazilianTicker, normalizeTicker } from '@/lib/utils';
import { fetchBrapiFullData } from './brapi-extended';
import { fetchYahooHistory } from './yahoo';
import { getQuote } from './index';
import { calculateReturns } from './returns';
import { parseDividendCalendar } from './dividends';

function brapiHistoryToSeries(
  raw?: { date: number; close: number }[]
): { date: string; close: number }[] {
  if (!raw?.length) return [];
  return raw
    .map((h) => ({
      date: new Date(h.date * 1000).toISOString().split('T')[0],
      close: h.close,
    }))
    .filter((h) => h.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function buildRIReport(ticker: string): Promise<RIAnalysisReport | null> {
  const t = normalizeTicker(ticker);
  const sources: string[] = [];

  if (isBrazilianTicker(t)) {
    const brapi = await fetchBrapiFullData(t);
    if (!brapi) return buildRIReportFromYahoo(t);

    sources.push('Brapi', 'Dados públicos B3');

    const priceHistory = brapiHistoryToSeries(brapi.historicalDataPrice);
    const price = brapi.regularMarketPrice;
    const dividends = brapi.dividendsData?.cashDividends ?? [];

    const returns = calculateReturns({
      currentPrice: price,
      priceHistory,
      dividends,
      pe: brapi.priceEarnings,
      roe: brapi.returnOnEquity,
      dividendYield: brapi.dividendYield,
      eps: brapi.earningsPerShare,
    });

    const dividendCalendar = parseDividendCalendar(dividends, price);

    const metrics: RIFinancialMetrics = {
      price,
      marketCap: brapi.marketCap,
      pe: brapi.priceEarnings,
      pb: brapi.priceToBook,
      roe: brapi.returnOnEquity,
      eps: brapi.earningsPerShare,
      dividendYield: brapi.dividendYield,
      profitMargin: brapi.profitMargins,
      revenueGrowth: brapi.revenueGrowth,
      debtToEquity: brapi.debtToEquity,
      fiftyTwoWeekLow: brapi.fiftyTwoWeekLow,
      fiftyTwoWeekHigh: brapi.fiftyTwoWeekHigh,
      dividendsLast12m: dividendCalendar.totalDividendsLast12m,
      currency: 'BRL',
    };

    return {
      ticker: t,
      companyName: brapi.longName || brapi.shortName || t,
      sector: brapi.sector,
      dataSource: sources,
      metrics,
      dividendCalendar,
      ...returns,
      growthAnalysis: buildGrowthText(metrics, returns, dividendCalendar),
      numbersAnalysis: buildNumbersText(metrics, dividendCalendar),
      priceHistory,
      highlights: buildHighlights(metrics, returns, dividendCalendar),
    };
  }

  return buildRIReportFromYahoo(t);
}

async function buildRIReportFromYahoo(ticker: string): Promise<RIAnalysisReport | null> {
  const [quote, history] = await Promise.all([
    getQuote(ticker),
    fetchYahooHistory(ticker, '1y'),
  ]);

  if (!quote || quote.price <= 0) return null;

  const returns = calculateReturns({
    currentPrice: quote.price,
    priceHistory: history,
    dividendYield: quote.dividendYield,
    pe: quote.pe,
  });

  const metrics: RIFinancialMetrics = {
    price: quote.price,
    marketCap: quote.marketCap,
    pe: quote.pe,
    dividendYield: quote.dividendYield,
    currency: quote.currency,
  };

  return {
    ticker,
    companyName: quote.name || ticker,
    dataSource: ['Yahoo Finance'],
    metrics,
    ...returns,
    growthAnalysis: buildGrowthText(metrics, returns),
    numbersAnalysis: buildNumbersText(metrics),
    priceHistory: history,
    highlights: buildHighlights(metrics, returns),
  };
}

function buildGrowthText(
  m: RIFinancialMetrics,
  r: { annualReturnPercent: number; annualPriceReturnPercent: number; annualDividendReturnPercent: number; projectedReturnPercent: number },
  div?: DividendCalendarInfo
): string {
  const parts: string[] = [];
  if (m.revenueGrowth != null) {
    parts.push(`Receita com crescimento de ${m.revenueGrowth.toFixed(2)}% no período recente.`);
  }
  if (m.roe != null) {
    parts.push(`ROE de ${m.roe.toFixed(2)}% indica eficiência na geração de lucro.`);
  }
  parts.push(
    `Retorno total no último ano: ${r.annualReturnPercent.toFixed(2)}% ` +
      `(valorização ${r.annualPriceReturnPercent.toFixed(2)}% + dividendos ${r.annualDividendReturnPercent.toFixed(2)}%).`
  );
  if (div) {
    parts.push(`Frequência de pagamento: ${div.paymentFrequency} (${div.paymentsLast12Months} pagamentos em 12 meses).`);
  }
  parts.push(`Projeção próximos 12 meses: ${r.projectedReturnPercent.toFixed(2)}% (estimativa).`);
  return parts.join(' ');
}

function buildNumbersText(
  m: RIFinancialMetrics,
  div?: DividendCalendarInfo
): string {
  const fmt = (n?: number, suffix = '') =>
    n != null ? `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}${suffix}` : 'N/D';
  const fmtMoney = (n?: number) =>
    n != null ? `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : 'N/D';

  const lines = [
    `Preço: ${fmt(m.price, m.currency === 'USD' ? ' USD' : ' R$')}`,
    `P/L: ${fmt(m.pe)} | P/VP: ${fmt(m.pb)} | ROE: ${m.roe != null ? fmt(m.roe, '%') : 'N/D'}`,
    `LPA (EPS): ${fmt(m.eps)} | Dividend Yield: ${m.dividendYield != null ? fmt(m.dividendYield, '%') : 'N/D'}`,
    m.marketCap ? `Valor de mercado: R$ ${(m.marketCap / 1e9).toFixed(1)} bi` : '',
  ];

  if (div) {
    if (div.nextComDate) lines.push(`Próxima data COM: ${formatDateBR(div.nextComDate)}`);
    if (div.lastDividend?.paymentDate) {
      lines.push(
        `Último dividendo: ${fmtMoney(div.lastDividend.amountPerShare)} por ação em ${formatDateBR(div.lastDividend.paymentDate)}` +
          (div.lastDividend.comDate ? ` (COM: ${formatDateBR(div.lastDividend.comDate)})` : '')
      );
    }
    if (div.nextDividend?.paymentDate) {
      lines.push(
        `Próximo dividendo: ${fmtMoney(div.nextDividend.amountPerShare)} por ação em ${formatDateBR(div.nextDividend.paymentDate)}` +
          (div.nextDividend.comDate ? ` (COM: ${formatDateBR(div.nextDividend.comDate)})` : '')
      );
    }
    lines.push(`Frequência: ${div.paymentFrequency}`);
  }

  return lines.filter(Boolean).join(' · ');
}

function buildHighlights(
  m: RIFinancialMetrics,
  r: { annualReturnPercent: number; annualPriceReturnPercent: number; annualDividendReturnPercent: number; projectedReturnPercent: number },
  div?: DividendCalendarInfo
) {
  const items = [
    {
      label: 'Retorno último ano',
      value: `${r.annualReturnPercent.toFixed(2)}%`,
      trend: (r.annualReturnPercent >= 0 ? 'up' : 'down') as 'up' | 'down',
    },
    {
      label: 'Retorno projetado (12m)',
      value: `~${r.projectedReturnPercent.toFixed(2)}%`,
      trend: (r.projectedReturnPercent >= 0 ? 'up' : 'down') as 'up' | 'down',
    },
    {
      label: 'Valorização (preço)',
      value: `${r.annualPriceReturnPercent >= 0 ? '+' : ''}${r.annualPriceReturnPercent.toFixed(2)}%`,
      trend: (r.annualPriceReturnPercent >= 0 ? 'up' : 'down') as 'up' | 'down',
    },
    {
      label: 'Dividendos (12m)',
      value: `${r.annualDividendReturnPercent.toFixed(2)}%`,
      trend: 'neutral' as const,
    },
    { label: 'P/L', value: m.pe?.toFixed(2) ?? 'N/D', trend: 'neutral' as const },
    { label: 'ROE', value: m.roe != null ? `${m.roe.toFixed(1)}%` : 'N/D', trend: 'neutral' as const },
  ];

  if (div?.paymentFrequency) {
    items.push({
      label: 'Frequência pagamento',
      value: div.paymentFrequency,
      trend: 'neutral' as const,
    });
  }

  return items;
}
