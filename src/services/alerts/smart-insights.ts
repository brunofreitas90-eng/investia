import { aggregatePortfolioPositions } from '@/lib/portfolio-aggregate';
import {
  INVESTMENT_STRATEGY,
  STRATEGY_UNIVERSE,
  classifyTickerBucket,
} from '@/lib/investment-strategy';
import { scoreOpportunity } from '@/lib/opportunity-scoring';
import { dividendsToCalendarEvents } from '@/lib/calendar-events';
import { enrichPortfolio } from '@/lib/portfolio';
import { calculatePortfolioDividends } from '@/services/dividends/portfolio-dividends';
import { buildDividendHistoryReport } from '@/services/market/dividend-history';
import { getQuotes } from '@/services/market';
import { cacheKey, getCache, setCache, CACHE_TTL } from '@/services/market/cache';
import type { TickerMarketSnapshot } from '@/lib/investment-advice-types';
import type { SmartInsight, SmartInsightsResult } from '@/lib/investment-advice-types';
import type { PortfolioItem } from '@/types';

export type { SmartInsight, SmartInsightsResult };

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00');
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

export async function generateSmartInsights(
  portfolioItems: PortfolioItem[]
): Promise<SmartInsightsResult> {
  const key = cacheKey('insights', String(portfolioItems.length));
  const cached = getCache<SmartInsightsResult>(key);
  if (cached) return cached;

  const insights: SmartInsight[] = [];
  const tickers = [
    ...new Set([
      ...portfolioItems.map((p) => p.ticker),
      ...STRATEGY_UNIVERSE.filter((t) => t.bucket === 'opportunity').map((t) => t.ticker),
    ]),
  ];

  const quotes = await getQuotes(tickers);
  const enriched = enrichPortfolio(portfolioItems, quotes);
  const positions = aggregatePortfolioPositions(enriched);
  const dividends = await calculatePortfolioDividends(enriched, 'insights');
  const events = dividendsToCalendarEvents(dividends.events);

  // COM dates — próximos 7 dias
  for (const e of events) {
    if (e.event_type !== 'dividend_com') continue;
    const days = daysUntil(e.event_date);
    if (days < 0 || days > 7) continue;
    insights.push({
      id: `com-${e.ticker}-${e.event_date}`,
      type: 'com_date',
      priority: days <= 3 ? 'alta' : 'media',
      title: `Data COM chegando — ${e.ticker}`,
      message: `Em ${days} dia(s) (${e.event_date}) é a data COM de ${e.ticker}. Se quiser receber o próximo provento, precisa comprar antes dessa data.`,
      howWeDecided: [
        '1) Consultamos o calendário de dividendos da sua carteira.',
        `2) A data COM é o último dia para comprar com direito ao provento.`,
        `3) Faltam ${days} dias — por isso avisamos com antecedência.`,
      ].join('\n'),
      ticker: e.ticker,
      suggestedAction: 'Verificar se vale aumentar posição antes da COM',
    });
  }

  // Oportunidades de compra — universo oportunidade
  const oppSnapshots: TickerMarketSnapshot[] = [];
  for (const u of STRATEGY_UNIVERSE.filter((t) => t.bucket === 'opportunity')) {
    const q = quotes.get(u.ticker);
    if (!q) continue;
    let nextComDate: string | undefined;
    try {
      const div = await buildDividendHistoryReport(u.ticker);
      nextComDate = div?.payments.find(
        (p) => p.comDate && p.comDate >= new Date().toISOString().split('T')[0]
      )?.comDate;
    } catch {
      /* skip */
    }
    oppSnapshots.push({
      ticker: u.ticker,
      sector: u.sector,
      bucket: 'opportunity',
      price: q.price,
      changePercent: q.changePercent,
      dividendYield: q.dividendYield,
      nextComDate,
    });
  }

  const clearOpps = oppSnapshots
    .map((s) => ({ snap: s, scored: scoreOpportunity(s) }))
    .filter((x) => x.scored.isClear);

  if (clearOpps.length > 0) {
    for (const { snap, scored } of clearOpps.slice(0, 3)) {
      insights.push({
        id: `opp-${snap.ticker}`,
        type: 'buy_opportunity',
        priority: snap.changePercent <= -5 ? 'alta' : 'media',
        title: `Oportunidade — ${snap.ticker}`,
        message: `${snap.ticker} pode ser boa compra no bucket de oportunidades (15%). ${scored.summary}`,
        howWeDecided: ['1) Monitoramos ativos de oportunidade da sua estratégia.', ...scored.signals.map((s, i) => `${i + 2}) ${s}`)].join('\n'),
        ticker: snap.ticker,
        suggestedAction: 'Avaliar compra no Assessor IA',
      });
    }
  } else {
    insights.push({
      id: 'guard-cash',
      type: 'guard_cash',
      priority: 'media',
      title: 'Guarde os 15% de oportunidades',
      message:
        'Não há oportunidade clara agora em FIIs, ETFs ou ativos internacionais. O mais inteligente é guardar essa parcela e esperar um momento melhor.',
      howWeDecided: [
        '1) Monitoramos os ativos de oportunidade da sua estratégia.',
        '2) Nenhum está com queda relevante ou preço claramente atrativo.',
        '3) Comprar sem oportunidade costuma piorar o rendimento no longo prazo.',
        '4) Reserve cerca de 15% do próximo aporte em caixa e acompanhe este painel.',
      ].join('\n'),
      suggestedAction: 'Aguardar — veja Oportunidades e Assessor IA',
    });
  }

  // Rebalanceamento núcleo vs oportunidade
  const total = positions.reduce((s, p) => s + p.currentValue, 0);
  if (total > 0) {
    let coreVal = 0;
    let oppVal = 0;
    for (const p of positions) {
      if (classifyTickerBucket(p.ticker) === 'core') coreVal += p.currentValue;
      else oppVal += p.currentValue;
    }
    const corePct = (coreVal / total) * 100;
    const oppPct = (oppVal / total) * 100;
    const coreTarget = INVESTMENT_STRATEGY.coreAllocationPercent;
    const oppTarget = INVESTMENT_STRATEGY.opportunityAllocationPercent;

    if (corePct < coreTarget - 10) {
      insights.push({
        id: 'rebalance-core',
        type: 'rebalance',
        priority: 'media',
        title: 'Carteira abaixo do núcleo ideal',
        message: `Hoje ${corePct.toFixed(0)}% está em bancos, energia e saneamento — o alvo é cerca de ${coreTarget}%. Considere reforçar o núcleo nas próximas compras.`,
        howWeDecided: [
          `1) Sua estratégia prevê ~${coreTarget}% em empresas perenes (núcleo).`,
          `2) Hoje o núcleo representa ${corePct.toFixed(0)}% do patrimônio.`,
          '3) Abaixo do ideal aumenta o risco de depender só de ativos mais voláteis.',
        ].join('\n'),
        suggestedAction: 'Priorizar bancos, energia e saneamento no Assessor IA',
      });
    }

    if (oppPct > oppTarget + 8) {
      insights.push({
        id: 'rebalance-opp',
        type: 'rebalance',
        priority: 'baixa',
        title: 'Oportunidades acima do limite',
        message: `Você tem ${oppPct.toFixed(0)}% em oportunidades — o teto sugerido é ${oppTarget}%. Nas próximas compras, prefira o núcleo.`,
        howWeDecided: [
          `1) O limite de oportunidades é ${oppTarget}% para controlar risco.`,
          `2) Você está em ${oppPct.toFixed(0)}%.`,
          '3) Excesso em ativos mais voláteis pode prejudicar a renda passiva estável.',
        ].join('\n'),
        suggestedAction: 'Redirecionar novos aportes para o núcleo',
      });
    }
  }

  const sorted = insights.sort((a, b) => {
    const p = { alta: 0, media: 1, baixa: 2 };
    return p[a.priority] - p[b.priority];
  });

  const result: SmartInsightsResult = {
    insights: sorted,
    generatedAt: new Date().toISOString(),
  };

  setCache(key, result, CACHE_TTL.marketScan);
  return result;
}
