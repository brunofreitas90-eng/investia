import { popularTickers } from '@/lib/demo-data';
import { mergeSourceLabels } from '@/lib/market-sources';
import type { DropClassification, MarketDropOpportunity, MarketDropsScanResult } from '@/types';
import { getQuotes, getPriceHistory } from '@/services/market';
import { cacheKey, getCache, setCache, CACHE_TTL } from '@/services/market/cache';
import OpenAI from 'openai';

const CLASS_LABELS: Record<DropClassification, string> = {
  oportunidade_forte: 'Oportunidade Forte',
  possivel_oportunidade: 'Possível Oportunidade',
  neutro: 'Neutro',
  atencao: 'Atenção',
  alto_risco: 'Alto Risco',
};

function changeOverDays(
  history: { date: string; close: number }[],
  days: number
): number | null {
  if (history.length < 2) return null;
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1];
  const target = new Date(last.date);
  target.setDate(target.getDate() - days);
  const targetStr = target.toISOString().split('T')[0];

  let ref = sorted[0];
  for (const h of sorted) {
    if (h.date <= targetStr) ref = h;
    else break;
  }
  if (ref.close <= 0) return null;
  return ((last.close - ref.close) / ref.close) * 100;
}

function classifyDrop(
  change: number,
  dy?: number,
  pe?: number
): { classification: DropClassification; reason: string; analysis: string } {
  const abs = Math.abs(change);

  if (change > -3) {
    return {
      classification: 'neutro',
      reason: 'Movimento dentro da normalidade do mercado.',
      analysis: 'Sem queda relevante para oportunidade.',
    };
  }

  if (change <= -12 && (pe == null || pe > 22)) {
    return {
      classification: 'alto_risco',
      reason: `Queda forte de ${abs.toFixed(1)}% — pode refletir problema estrutural.`,
      analysis: 'Investigue notícias e resultados antes de comprar.',
    };
  }

  if (change <= -8 && dy != null && dy >= 5 && (pe == null || pe < 18)) {
    return {
      classification: 'oportunidade_forte',
      reason: `Queda de ${abs.toFixed(1)}% em empresa com bons proventos (DY ~${dy.toFixed(1)}%).`,
      analysis: 'Fundamentos de dividendos ainda atrativos — possível entrada.',
    };
  }

  if (change <= -5 && (pe == null || pe < 20)) {
    return {
      classification: 'possivel_oportunidade',
      reason: `Mercado precificou queda de ${abs.toFixed(1)}% — valuation pode ter melhorado.`,
      analysis: 'Acompanhe próximo resultado e notícias do setor.',
    };
  }

  if (change <= -5) {
    return {
      classification: 'atencao',
      reason: `Queda de ${abs.toFixed(1)}% — volatilidade elevada.`,
      analysis: 'Espere confirmação de recuperação antes de aumentar posição.',
    };
  }

  return {
    classification: 'neutro',
    reason: `Queda moderada de ${abs.toFixed(1)}%.`,
    analysis: 'Movimento comum — sem sinal claro de oportunidade.',
  };
}

async function enrichWithAI(opp: MarketDropOpportunity): Promise<MarketDropOpportunity> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return opp;

  try {
    const openai = new OpenAI({ apiKey: key });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Investigador DelfoInvestIA. Explique queda de ação em linguagem simples (3 frases). JSON: { "reason": string, "analysis": string, "classification": "oportunidade_forte"|"possivel_oportunidade"|"neutro"|"atencao"|"alto_risco" }',
        },
        {
          role: 'user',
          content: JSON.stringify(opp),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
      max_tokens: 400,
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    const cls = parsed.classification as DropClassification;
    if (cls && CLASS_LABELS[cls]) {
      return {
        ...opp,
        classification: cls,
        classificationLabel: CLASS_LABELS[cls],
        reason: String(parsed.reason || opp.reason),
        analysis: String(parsed.analysis || opp.analysis),
      };
    }
  } catch {
    /* fallback */
  }
  return opp;
}

export async function scanMarketDrops(
  tickers: string[] = popularTickers,
  useAI = true
): Promise<MarketDropsScanResult> {
  const cacheK = cacheKey('drops', tickers.slice(0, 5).join(','));
  const cached = getCache<MarketDropsScanResult>(cacheK);
  if (cached) return cached;

  const quotes = await getQuotes(tickers);
  const dayDrops: MarketDropOpportunity[] = [];
  const weekDrops: MarketDropOpportunity[] = [];
  const monthDrops: MarketDropOpportunity[] = [];

  await Promise.all(
    tickers.map(async (ticker) => {
      const q = quotes.get(ticker.toUpperCase());
      if (!q) return;

      const history = await getPriceHistory(ticker, '3mo');
      const weekChange = changeOverDays(history, 7);
      const monthChange = changeOverDays(history, 30);
      const dayChange = q.changePercent;

      const pe = q.pe;
      const dy = q.dividendYield;

      const make = async (
        change: number,
        period: 'day' | 'week' | 'month'
      ): Promise<MarketDropOpportunity | null> => {
        if (change > -3) return null;
        const { classification, reason, analysis } = classifyDrop(change, dy, pe);
        let opp: MarketDropOpportunity = {
          ticker: q.ticker,
          name: q.name,
          changePercent: Math.round(change * 100) / 100,
          period,
          price: q.price,
          classification,
          classificationLabel: CLASS_LABELS[classification],
          reason,
          analysis,
        };
        if (useAI && change <= -5) {
          opp = await enrichWithAI(opp);
        }
        return opp;
      };

      const d = await make(dayChange, 'day');
      if (d) dayDrops.push(d);
      if (weekChange != null) {
        const w = await make(weekChange, 'week');
        if (w) weekDrops.push(w);
      }
      if (monthChange != null) {
        const m = await make(monthChange, 'month');
        if (m) monthDrops.push(m);
      }
    })
  );

  const sort = (a: MarketDropOpportunity, b: MarketDropOpportunity) =>
    a.changePercent - b.changePercent;

  const result: MarketDropsScanResult = {
    day: dayDrops.sort(sort).slice(0, 10),
    week: weekDrops.sort(sort).slice(0, 10),
    month: monthDrops.sort(sort).slice(0, 10),
    scannedAt: new Date().toISOString(),
    dataSources: mergeSourceLabels('brapi', 'yahoo', 'b3'),
  };

  setCache(cacheK, result, CACHE_TTL.marketScan);
  return result;
}
