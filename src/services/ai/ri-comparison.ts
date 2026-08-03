import OpenAI from 'openai';
import { buildRIReport } from '@/services/market/ri-report';
import type { RIComparisonReport, RIComparisonSentiment, RIAnalysisReport } from '@/types';
import { mergeSourceLabels } from '@/lib/market-sources';
import { cacheKey, getCache, setCache, CACHE_TTL } from '@/services/market/cache';

const SENTIMENT_LABELS: Record<RIComparisonSentiment, string> = {
  muito_positivo: 'Muito Positivo',
  positivo: 'Positivo',
  neutro: 'Neutro',
  negativo: 'Negativo',
  muito_negativo: 'Muito Negativo',
};

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

/** Estima período anterior usando metade do histórico de preços */
function buildPreviousPeriodSnapshot(current: RIAnalysisReport): Record<string, number | string> {
  const hist = current.priceHistory;
  if (hist.length < 20) {
    return { nota: 'Histórico curto — comparação limitada' };
  }

  const mid = Math.floor(hist.length / 2);
  const oldSlice = hist.slice(0, mid);
  const newSlice = hist.slice(mid);

  const avg = (arr: typeof hist) =>
    arr.reduce((s, h) => s + h.close, 0) / Math.max(arr.length, 1);

  const oldPrice = avg(oldSlice);
  const newPrice = avg(newSlice);
  const priceChange = oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 0;

  return {
    precoMedioPeriodoAnterior: oldPrice.toFixed(2),
    precoMedioPeriodoAtual: newPrice.toFixed(2),
    variacaoPrecoPercent: priceChange.toFixed(1),
    dyAtual: current.metrics.dividendYield ?? 'N/D',
    plAtual: current.metrics.pe ?? 'N/D',
    roeAtual: current.metrics.roe ?? 'N/D',
    retorno12m: current.annualReturnPercent.toFixed(1),
    proventos12m: current.dividendCalendar?.totalDividendsLast12m ?? 0,
  };
}

function ruleBasedComparison(
  ticker: string,
  current: RIAnalysisReport,
  previous: Record<string, number | string>
): RIComparisonReport {
  const positives: string[] = [];
  const negatives: string[] = [];

  const m = current.metrics;
  if (m.revenueGrowth != null && m.revenueGrowth > 0) {
    positives.push(`Receita em crescimento (~${m.revenueGrowth.toFixed(0)}%).`);
  } else if (m.revenueGrowth != null && m.revenueGrowth < 0) {
    negatives.push('Receita em queda no último período.');
  }

  if (current.annualReturnPercent > 5) {
    positives.push(`Retorno nos últimos 12 meses de ${current.annualReturnPercent.toFixed(1)}%.`);
  } else if (current.annualReturnPercent < -5) {
    negatives.push(`Retorno negativo de ${current.annualReturnPercent.toFixed(1)}% no ano.`);
  }

  if (m.debtToEquity != null && m.debtToEquity < 1) {
    positives.push('Endividamento em nível controlado.');
  } else if (m.debtToEquity != null && m.debtToEquity > 2) {
    negatives.push('Dívida elevada em relação ao patrimônio.');
  }

  const div12 = current.dividendCalendar?.totalDividendsLast12m ?? 0;
  if (div12 > 0) {
    positives.push(`Pagou R$ ${div12.toFixed(2)} em proventos por ação nos últimos 12 meses.`);
  }

  const priceVar = Number(previous.variacaoPrecoPercent);
  if (!Number.isNaN(priceVar)) {
    if (priceVar > 5) positives.push('Preço médio subiu em relação ao período anterior.');
    else if (priceVar < -5) negatives.push('Preço médio caiu em relação ao período anterior.');
  }

  let sentiment: RIComparisonSentiment = 'neutro';
  if (positives.length >= 3 && negatives.length <= 1) sentiment = 'positivo';
  if (positives.length >= 4 && negatives.length === 0) sentiment = 'muito_positivo';
  if (negatives.length >= 3 && positives.length <= 1) sentiment = 'negativo';
  if (negatives.length >= 4) sentiment = 'muito_negativo';

  const plainLanguage = [
    'Pontos positivos:',
    ...positives.map((p) => `• ${p}`),
    '',
    'Pontos negativos:',
    ...(negatives.length ? negatives.map((n) => `• ${n}`) : ['• Nenhum destaque negativo forte.']),
    '',
    'Resumo:',
    sentiment === 'positivo' || sentiment === 'muito_positivo'
      ? 'Resultado favorável em relação ao período anterior.'
      : sentiment === 'negativo' || sentiment === 'muito_negativo'
        ? 'Resultado com sinais de deterioração — exige cautela.'
        : 'Resultado misto — acompanhe os próximos trimestres.',
  ].join('\n');

  return {
    ticker,
    companyName: current.companyName,
    sentiment,
    sentimentLabel: SENTIMENT_LABELS[sentiment],
    positives,
    negatives,
    summary: plainLanguage.split('Resumo:')[1]?.trim() ?? '',
    plainLanguage,
    dataSources: [...current.dataSource, ...mergeSourceLabels('brapi', 'ri')],
  };
}

export async function compareRIReports(ticker: string): Promise<RIComparisonReport | null> {
  const key = cacheKey('ricmp', ticker.toUpperCase());
  const cached = getCache<RIComparisonReport>(key);
  if (cached) return cached;

  const current = await buildRIReport(ticker);
  if (!current) return null;

  const previous = buildPreviousPeriodSnapshot(current);
  const openai = getOpenAI();

  if (!openai) {
    const report = ruleBasedComparison(ticker, current, previous);
    setCache(key, report, CACHE_TTL.aiAnalysis);
    return report;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Você é analista da DelfoInvestIA. Compare o período atual com o anterior.
Linguagem SIMPLES para investidor iniciante. NÃO use jargão técnico.
Responda APENAS JSON:
{ "sentiment": "muito_positivo"|"positivo"|"neutro"|"negativo"|"muito_negativo",
  "positives": string[], "negatives": string[], "summary": string, "plainLanguage": string }
plainLanguage deve ter seções: Pontos positivos, Pontos negativos, Resumo.`,
        },
        {
          role: 'user',
          content: JSON.stringify({
            ticker,
            periodoAtual: current.metrics,
            periodoAnteriorEstimado: previous,
            retorno12m: current.annualReturnPercent,
            dividendos: current.dividendCalendar,
          }),
        },
      ],
      temperature: 0.4,
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    const sentiment = (parsed.sentiment as RIComparisonSentiment) || 'neutro';

    const report: RIComparisonReport = {
      ticker,
      companyName: current.companyName,
      sentiment,
      sentimentLabel: SENTIMENT_LABELS[sentiment] ?? 'Neutro',
      positives: Array.isArray(parsed.positives) ? parsed.positives.map(String) : [],
      negatives: Array.isArray(parsed.negatives) ? parsed.negatives.map(String) : [],
      summary: String(parsed.summary || ''),
      plainLanguage: String(parsed.plainLanguage || parsed.summary || ''),
      dataSources: [...current.dataSource, 'OpenAI', ...mergeSourceLabels('ri')],
    };

    setCache(key, report, CACHE_TTL.aiAnalysis);
    return report;
  } catch {
    const report = ruleBasedComparison(ticker, current, previous);
    setCache(key, report, CACHE_TTL.aiAnalysis);
    return report;
  }
}
