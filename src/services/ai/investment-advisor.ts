import OpenAI from 'openai';
import { aggregatePortfolioPositions } from '@/lib/portfolio-aggregate';
import type {
  InvestmentAdviceReport,
  InvestmentRecommendation,
  OpportunitySituation,
  SectorAllocationRow,
  TickerMarketSnapshot,
} from '@/lib/investment-advice-types';
import {
  OPPORTUNITY_SITUATION_LABELS,
} from '@/lib/investment-advice-types';
import {
  ANALYST_SYSTEM_PERSONA,
  CORE_SECTOR_TARGET_PERCENT,
  INVESTMENT_STRATEGY,
  STRATEGY_UNIVERSE,
  classifyTickerBucket,
  getStrategySector,
  type CoreSector,
} from '@/lib/investment-strategy';
import { PLAIN_LANGUAGE_RULES } from '@/lib/plain-language';
import { scoreCoreCandidate, scoreOpportunity } from '@/lib/opportunity-scoring';
import { enrichPortfolio } from '@/lib/portfolio';
import {
  currentYield12m,
  sumDividendsLast12Months,
} from '@/lib/dividend-price-target';
import {
  SECTOR_DIVIDEND_UNIVERSE,
  SECTOR_ORDER,
} from '@/lib/sector-dividend-universe';
import { buildDividendHistoryReport } from '@/services/market/dividend-history';
import { getFundamentals, getQuotes } from '@/services/market';
import { cacheKey, getCache, setCache, CACHE_TTL } from '@/services/market/cache';
import type { AggregatedPosition } from '@/lib/portfolio-aggregate';
import type { PortfolioItem } from '@/types';

export type { InvestmentAdviceReport, InvestmentRecommendation, TickerMarketSnapshot };

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function buildMarketSnapshots(
  tickers: { ticker: string; sector: string; bucket: 'core' | 'opportunity'; name?: string }[],
  positions: AggregatedPosition[]
): Promise<TickerMarketSnapshot[]> {
  const symbols = [...new Set(tickers.map((t) => t.ticker))];
  const quotes = await getQuotes(symbols);
  const posByTicker = new Map(positions.map((p) => [p.ticker.toUpperCase(), p]));
  const metaByTicker = new Map(tickers.map((t) => [t.ticker.toUpperCase(), t]));

  const snapshots: TickerMarketSnapshot[] = [];

  await Promise.all(
    symbols.map(async (ticker) => {
      const q = quotes.get(ticker.toUpperCase());
      if (!q) return;

      const meta = metaByTicker.get(ticker.toUpperCase());
      const pos = posByTicker.get(ticker.toUpperCase());
      const fund = await getFundamentals(ticker);

      let nextComDate: string | undefined;
      let dividendScore: number | undefined;
      let dy12: number | undefined;
      let div12 = 0;

      try {
        const div = await buildDividendHistoryReport(ticker);
        nextComDate = div?.payments.find(
          (p) => p.comDate && p.comDate >= new Date().toISOString().split('T')[0]
        )?.comDate;
        dividendScore = div?.analytics.dividendScore;
        div12 = sumDividendsLast12Months(div?.payments ?? []);
        const y = currentYield12m(div12, q.price);
        if (y != null) dy12 = Math.round(y * 10) / 10;
      } catch {
        /* skip */
      }

      snapshots.push({
        ticker: q.ticker,
        name: meta?.name,
        sector:
          meta?.sector ??
          STRATEGY_UNIVERSE.find((u) => u.ticker === ticker)?.sector ??
          'Outros',
        bucket: meta?.bucket ?? classifyTickerBucket(ticker),
        price: q.price,
        changePercent: q.changePercent,
        pe: fund?.pe ?? q.pe,
        dividendYield: dy12 ?? fund?.dividendYield ?? q.dividendYield,
        dividends12mPerShare: div12 || undefined,
        nextComDate,
        dividendScore,
        userAveragePrice: pos?.averagePrice,
        userQuantity: pos?.totalQuantity,
      });
    })
  );

  return snapshots;
}

function computeBucketPercents(positions: AggregatedPosition[]): {
  core: number;
  opportunity: number;
} {
  const total = positions.reduce((s, p) => s + p.currentValue, 0);
  if (total <= 0) return { core: 0, opportunity: 0 };

  let core = 0;
  let opp = 0;
  for (const p of positions) {
    if (classifyTickerBucket(p.ticker) === 'core') core += p.currentValue;
    else opp += p.currentValue;
  }
  return { core: (core / total) * 100, opportunity: (opp / total) * 100 };
}

function computeSectorPercents(positions: AggregatedPosition[]): Record<string, number> {
  const total = positions.reduce((s, p) => s + p.currentValue, 0);
  if (total <= 0) return {};

  const bySector: Record<string, number> = {};
  for (const p of positions) {
    const sector = getStrategySector(p.ticker);
    bySector[sector] = (bySector[sector] ?? 0) + p.currentValue;
  }

  return Object.fromEntries(
    Object.entries(bySector).map(([k, v]) => [k, (v / total) * 100])
  );
}

function pickTopDyInSector(
  sector: CoreSector,
  snapshots: TickerMarketSnapshot[]
): TickerMarketSnapshot | null {
  const rows = snapshots
    .filter((s) => s.sector === sector && (s.dividendYield ?? 0) > 0)
    .sort((a, b) => {
      const dyDiff = (b.dividendYield ?? 0) - (a.dividendYield ?? 0);
      if (Math.abs(dyDiff) > 0.15) return dyDiff;
      // empate: preferir preço abaixo do médio do usuário
      const aBelow =
        a.userAveragePrice != null && a.price < a.userAveragePrice ? 1 : 0;
      const bBelow =
        b.userAveragePrice != null && b.price < b.userAveragePrice ? 1 : 0;
      return bBelow - aBelow;
    });
  return rows[0] ?? null;
}

function computeSectorAllocation(
  capital: number,
  positions: AggregatedPosition[],
  snapshots: TickerMarketSnapshot[]
): SectorAllocationRow[] {
  const current = computeSectorPercents(positions);
  const rows: SectorAllocationRow[] = [];

  for (const sector of SECTOR_ORDER) {
    const targetPercent = CORE_SECTOR_TARGET_PERCENT[sector];
    const currentPercent = Math.round((current[sector] ?? 0) * 10) / 10;
    const gapPercent = Math.round((targetPercent - currentPercent) * 10) / 10;
    const suggestedAmount = Math.round(capital * (targetPercent / 100));
    const status: SectorAllocationRow['status'] =
      Math.abs(gapPercent) <= 5 ? 'ok' : gapPercent > 0 ? 'abaixo' : 'acima';

    const top = pickTopDyInSector(sector, snapshots);

    let note = '';
    if (status === 'abaixo') {
      note = `Reforçar ${sector} — ${Math.abs(gapPercent).toFixed(1)} p.p. abaixo da meta. Priorize a maior pagadora do setor.`;
    } else if (status === 'acima') {
      note = `${sector} acima da meta — evite concentrar; foque setores abaixo.`;
    } else {
      note = `${sector} próximo da meta (${targetPercent}%).`;
    }
    if (top?.dividendYield != null) {
      note += ` Melhor DY agora: ${top.ticker} (~${top.dividendYield.toFixed(1)}%).`;
    }

    rows.push({
      sector,
      targetPercent,
      currentPercent,
      gapPercent,
      suggestedAmount,
      status,
      note,
      topDividendTicker: top?.ticker,
      topDividendYield: top?.dividendYield,
    });
  }

  const oppTarget = INVESTMENT_STRATEGY.opportunityAllocationPercent;
  const total = positions.reduce((s, p) => s + p.currentValue, 0);
  const oppValue = positions
    .filter((p) => classifyTickerBucket(p.ticker) === 'opportunity')
    .reduce((s, p) => s + p.currentValue, 0);
  const oppCurrent = total > 0 ? Math.round((oppValue / total) * 1000) / 10 : 0;
  const oppGap = Math.round((oppTarget - oppCurrent) * 10) / 10;

  rows.push({
    sector: 'Oportunidades (commodities)',
    targetPercent: oppTarget,
    currentPercent: oppCurrent,
    gapPercent: oppGap,
    suggestedAmount: Math.round(capital * (oppTarget / 100)),
    status: oppCurrent > oppTarget + 5 ? 'acima' : 'ok',
    note:
      '15% para commodities/oportunidades: descontada+dividendos, alto DY seguro ou crescimento rápido — senão, caixa.',
  });

  return rows;
}

function foundationCore(snap: TickerMarketSnapshot, sector: string): string {
  const dy = snap.dividendYield ?? 0;
  const parts = [
    `${snap.ticker} foi escolhida no setor ${sector} porque, neste momento, apresenta um dos melhores (ou o melhor) dividend yield em relação ao preço atual (~${dy.toFixed(1)}% = proventos dos últimos 12 meses ÷ cotação R$ ${snap.price.toFixed(2)}).`,
  ];
  if (snap.userAveragePrice != null && snap.userAveragePrice > 0) {
    if (snap.price < snap.userAveragePrice) {
      parts.push(
        `Como a cotação (R$ ${snap.price.toFixed(2)}) está abaixo do seu preço médio (R$ ${snap.userAveragePrice.toFixed(2)}), reforçar a posição ajuda a baixar a média de compra — alinhado ao objetivo de manter o preço médio o mais baixo possível.`
      );
    } else {
      parts.push(
        `Atenção: o preço atual (R$ ${snap.price.toFixed(2)}) está acima do seu médio (R$ ${snap.userAveragePrice.toFixed(2)}). Ainda assim priorizamos pelo DY do setor; compre aos poucos se quiser não subir demais a média.`
      );
    }
  } else {
    parts.push(
      'Você ainda não tem esse papel no núcleo — é uma entrada alinhada à regra de comprar as melhores pagadoras de cada setor.'
    );
  }
  parts.push(
    'Isso fortalece a renda passiva do núcleo (85%) em Bancos, Seguradoras, Energia e Saneamento.'
  );
  return parts.join(' ');
}

function foundationOpp(
  snap: TickerMarketSnapshot,
  situation: OpportunitySituation,
  signals: string[]
): string {
  const label = OPPORTUNITY_SITUATION_LABELS[situation];
  return [
    `${snap.ticker} entra nos 15% de oportunidades na situação “${label}”.`,
    signals.join(' '),
    'Exigimos um mínimo de segurança (yield, histórico de proventos ou valuation) para não comprar só por queda.',
    'Se a tese enfraquecer, o capital deste bucket deve voltar para caixa até nova oportunidade clara.',
  ].join(' ');
}

function ruleBasedAdvice(
  capital: number,
  positions: AggregatedPosition[],
  snapshots: TickerMarketSnapshot[]
): InvestmentAdviceReport {
  const buckets = computeBucketPercents(positions);
  const sectorPercents = computeSectorPercents(positions);
  const sectorAllocation = computeSectorAllocation(capital, positions, snapshots);
  const coreTarget = INVESTMENT_STRATEGY.coreAllocationPercent;
  const oppTarget = INVESTMENT_STRATEGY.opportunityAllocationPercent;
  const coreCapital = Math.round(capital * (coreTarget / 100));
  const oppCapital = Math.round(capital * (oppTarget / 100));

  const recommendations: InvestmentRecommendation[] = [];

  // Núcleo: 1 melhor DY por setor (prioriza setores abaixo da meta)
  const sectorPriority = [...SECTOR_ORDER].sort((a, b) => {
    const ga = sectorAllocation.find((s) => s.sector === a)?.gapPercent ?? 0;
    const gb = sectorAllocation.find((s) => s.sector === b)?.gapPercent ?? 0;
    return gb - ga;
  });

  const corePicks: { sector: CoreSector; snap: TickerMarketSnapshot }[] = [];
  for (const sector of sectorPriority) {
    const top = pickTopDyInSector(sector, snapshots);
    if (!top) continue;
    const scored = scoreCoreCandidate(top);
    if (!scored.isClear) continue;
    corePicks.push({ sector, snap: top });
  }

  if (corePicks.length > 0) {
    // Peso maior para setores mais abaixo da meta
    const weights = corePicks.map(({ sector }) => {
      const gap = sectorAllocation.find((s) => s.sector === sector)?.gapPercent ?? 0;
      return Math.max(1, gap + 5);
    });
    const weightSum = weights.reduce((a, b) => a + b, 0);

    corePicks.forEach(({ sector, snap }, i) => {
      const scored = scoreCoreCandidate(snap);
      const amount = Math.round(coreCapital * (weights[i] / weightSum));
      const situation: OpportunitySituation =
        snap.userAveragePrice != null && snap.price < snap.userAveragePrice
          ? 'baixa_preco_medio'
          : 'maior_dy_setor';

      recommendations.push({
        action: 'comprar',
        ticker: snap.ticker,
        bucket: 'core',
        sector,
        allocationPercent: Math.round((amount / capital) * 1000) / 10,
        suggestedAmount: amount,
        suggestedQuantity: snap.price > 0 ? Math.floor(amount / snap.price) : undefined,
        situation,
        situationLabel: OPPORTUNITY_SITUATION_LABELS[situation],
        reason: `Comprar ${snap.ticker} (${sector}): maior DY do setor ~${(snap.dividendYield ?? 0).toFixed(1)}% s/ preço atual.`,
        foundation: foundationCore(snap, sector),
        howWeDecided: [
          `1) Olhamos todas as ações do setor ${sector}.`,
          `2) Rankeamos pelo % de dividendos (12m) ÷ preço atual.`,
          `3) ${snap.ticker} ficou no topo (~${(snap.dividendYield ?? 0).toFixed(1)}%).`,
          `4) Cruzamos com seu preço médio para tentar baixar a média quando possível.`,
          ...scored.signals.map((s, idx) => `${idx + 5}) ${s}`),
        ].join('\n'),
        comTiming: snap.nextComDate
          ? `Data COM: ${snap.nextComDate} — comprar antes garante o próximo provento.`
          : undefined,
        risks: [
          'Dividendos passados não garantem futuros.',
          'Mesmo no núcleo, o preço pode cair no curto prazo.',
        ],
        dividendYieldOnPrice: snap.dividendYield,
        currentPrice: snap.price,
        userAveragePrice: snap.userAveragePrice,
      });
    });
  } else {
    recommendations.push({
      action: 'aguardar',
      ticker: 'Núcleo',
      bucket: 'core',
      allocationPercent: coreTarget,
      suggestedAmount: 0,
      situation: 'aguardar',
      situationLabel: OPPORTUNITY_SITUATION_LABELS.aguardar,
      reason: 'Sem DY suficiente nos setores do núcleo neste momento.',
      foundation:
        'Não encontramos, agora, uma pagadora clara o bastante em Bancos, Seguradoras, Energia ou Saneamento. Esperar evita comprar yield fraco.',
      howWeDecided: [
        '1) Consultamos o universo de cada setor.',
        '2) Calculamos DY = proventos 12m ÷ preço atual.',
        '3) Nenhuma passou no filtro mínimo.',
      ].join('\n'),
      risks: ['Caixa perde poder de compra com inflação, mas evita compra ruim.'],
    });
  }

  // Oportunidades 15% — commodities e tese classificada
  const oppScored = snapshots
    .filter((s) => s.bucket === 'opportunity')
    .map((s) => ({ snap: s, scored: scoreOpportunity(s) }))
    .filter((x) => x.scored.isClear)
    .sort((a, b) => b.scored.score - a.scored.score);

  let opportunityReserved = oppCapital;

  if (oppScored.length === 0) {
    recommendations.push({
      action: 'guardar',
      ticker: 'Caixa',
      bucket: 'opportunity',
      allocationPercent: oppTarget,
      suggestedAmount: oppCapital,
      situation: 'caixa',
      situationLabel: OPPORTUNITY_SITUATION_LABELS.caixa,
      reason: `Guardar ${fmt(oppCapital)} (15%) — sem commodity/oportunidade clara com segurança mínima.`,
      foundation:
        'Os 15% só entram em três situações: (1) ação bem descontada e boa pagadora, (2) alto dividendo com segurança mínima, ou (3) promessa de crescimento rápido com preço razoável. Nenhuma passou no filtro agora — caixa é a decisão correta.',
      howWeDecided: [
        '1) Varrermos commodities e oportunidades (VALE, PETR, PRIO, SUZB, crescimento etc.).',
        '2) Exigimos segurança mínima (DY, histórico ou valuation).',
        '3) Nenhuma tese ficou clara → guardar em caixa.',
      ].join('\n'),
      risks: ['Capital parado — revise em alguns dias ou após quedas relevantes.'],
    });
  } else {
    opportunityReserved = 0;
    const picks = oppScored.slice(0, 2);
    const each = Math.round(oppCapital / picks.length);
    for (const { snap, scored } of picks) {
      recommendations.push({
        action: 'comprar',
        ticker: snap.ticker,
        bucket: 'opportunity',
        sector: snap.sector,
        allocationPercent: Math.round((each / capital) * 1000) / 10,
        suggestedAmount: each,
        suggestedQuantity: snap.price > 0 ? Math.floor(each / snap.price) : undefined,
        situation: scored.situation,
        situationLabel: OPPORTUNITY_SITUATION_LABELS[scored.situation],
        reason: `${snap.ticker}: ${OPPORTUNITY_SITUATION_LABELS[scored.situation]}.`,
        foundation: foundationOpp(snap, scored.situation, scored.signals),
        howWeDecided: [
          `1) Situação classificada: ${OPPORTUNITY_SITUATION_LABELS[scored.situation]}.`,
          ...scored.signals.map((s, i) => `${i + 2}) ${s}`),
        ].join('\n'),
        comTiming: snap.nextComDate ? `Data COM: ${snap.nextComDate}` : undefined,
        risks: [
          'Commodities e crescimento oscilam mais que o núcleo.',
          'Não ultrapasse 15% do patrimônio neste bucket.',
        ],
        dividendYieldOnPrice: snap.dividendYield,
        currentPrice: snap.price,
        userAveragePrice: snap.userAveragePrice,
      });
    }
  }

  const calendarTips = snapshots
    .filter((s) => s.nextComDate)
    .slice(0, 5)
    .map(
      (s) =>
        `${s.ticker}: último dia com direito a provento (COM) em ${s.nextComDate}`
    );

  const topCore = recommendations
    .filter((r) => r.bucket === 'core' && r.action === 'comprar')
    .map((r) => `${r.ticker} (${r.sector})`)
    .join(', ');

  return {
    capitalAvailable: capital,
    generatedAt: new Date().toISOString(),
    mode: 'rules',
    summary: [
      `Núcleo ${coreTarget}% (${fmt(coreCapital)}): comprar as maiores pagadoras de dividendos s/ preço atual em Bancos, Seguradoras, Energia e Saneamento${topCore ? ` — foco: ${topCore}` : ''}.`,
      ` Preferimos reforçar quando o preço ajuda a baixar o seu preço médio.`,
      opportunityReserved > 0
        ? ` Oportunidades ${oppTarget}%: ${fmt(opportunityReserved)} em caixa até surgir commodity/tese clara.`
        : ` Oportunidades ${oppTarget}%: commodities/oportunidades classificadas com fundamentação.`,
      ` Carteira hoje: ${buckets.core.toFixed(0)}% núcleo · ${buckets.opportunity.toFixed(0)}% oportunidades.`,
    ].join(''),
    teachingNote:
      'Cada recomendação traz a SITUAÇÃO (ex.: maior DY do setor, descontada+dividendos, crescimento) e um texto fundamentando o porquê.',
    coreAllocation: coreTarget,
    opportunityAllocation: oppTarget,
    opportunityReserved,
    sectorAllocation,
    recommendations,
    portfolioAnalysis: {
      currentCorePercent: Math.round(buckets.core * 10) / 10,
      currentOpportunityPercent: Math.round(buckets.opportunity * 10) / 10,
      sectorPercents,
      positions,
    },
    calendarTips,
    dataSources: ['BRAPI', 'Yahoo Finance', 'B3', 'Estratégia DelfoInvestIA'],
  };
}

export async function generateInvestmentAdvice(
  capitalAvailable: number,
  portfolioItems: PortfolioItem[]
): Promise<InvestmentAdviceReport> {
  const key = cacheKey(
    'advise',
    'v3',
    String(Math.round(capitalAvailable)),
    String(portfolioItems.length)
  );
  const cached = getCache<InvestmentAdviceReport>(key);
  if (cached) return cached;

  const quotes = await getQuotes(portfolioItems.map((i) => i.ticker));
  const enriched = enrichPortfolio(portfolioItems, quotes);
  const positions = aggregatePortfolioPositions(enriched);

  const coreUniverse = SECTOR_ORDER.flatMap((sector) =>
    SECTOR_DIVIDEND_UNIVERSE[sector].map((row) => ({
      ticker: row.ticker,
      name: row.name,
      sector,
      bucket: 'core' as const,
    }))
  );
  const oppUniverse = STRATEGY_UNIVERSE.filter((t) => t.bucket === 'opportunity').map(
    (t) => ({
      ticker: t.ticker,
      name: t.note,
      sector: t.sector,
      bucket: 'opportunity' as const,
    })
  );

  const snapshots = await buildMarketSnapshots(
    [...coreUniverse, ...oppUniverse],
    positions
  );
  const buckets = computeBucketPercents(positions);
  const sectorPercents = computeSectorPercents(positions);
  const sectorAllocation = computeSectorAllocation(
    capitalAvailable,
    positions,
    snapshots
  );
  const openai = getOpenAI();

  if (!openai) {
    const report = ruleBasedAdvice(capitalAvailable, positions, snapshots);
    setCache(key, report, CACHE_TTL.aiAnalysis);
    return report;
  }

  try {
    const baseline = ruleBasedAdvice(capitalAvailable, positions, snapshots);

    const payload = {
      estrategia: INVESTMENT_STRATEGY,
      regrasObrigatorias: [
        'Núcleo 85%: sempre priorizar a empresa que MAIS paga dividendos vs preço atual em cada setor (Bancos, Seguradoras, Energia, Saneamento).',
        'Considerar preço médio do usuário — preferir compras que baixem a média.',
        'Oportunidades 15%: commodities/oportunidades em uma das situações: descontada_dividendos | alto_dividendo_seguro | crescimento_rapido — senão caixa.',
        'Toda recomendação DEVE ter situation, situationLabel e foundation (texto fundamentando).',
      ],
      capitalDisponivel: capitalAvailable,
      carteiraConsolidada: positions,
      alocacaoAtual: {
        nucleo: buckets.core,
        oportunidades: buckets.opportunity,
        setores: sectorPercents,
      },
      analiseSetores: sectorAllocation,
      mercado: snapshots,
      sugestaoBaseRegras: baseline.recommendations,
    };

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `${ANALYST_SYSTEM_PERSONA}\n${PLAIN_LANGUAGE_RULES}

Você é o Assessor. Siga as regrasObrigatorias do JSON.
Núcleo = maiores DY s/ preço atual por setor + baixar preço médio.
Oportunidades = commodities com classificação explícita e fundamentação.`,
        },
        {
          role: 'user',
          content: `Refine as recomendações. Retorne APENAS JSON:
{
  "summary": "parágrafo",
  "teachingNote": "frase",
  "opportunityReserved": number,
  "recommendations": [{
    "action": "comprar"|"vender"|"manter"|"aguardar"|"guardar",
    "ticker": "string",
    "bucket": "core"|"opportunity",
    "sector": "string",
    "allocationPercent": number,
    "suggestedAmount": number,
    "suggestedQuantity": number,
    "situation": "descontada_dividendos"|"alto_dividendo_seguro"|"crescimento_rapido"|"maior_dy_setor"|"baixa_preco_medio"|"caixa"|"aguardar",
    "situationLabel": "rótulo em português",
    "reason": "frase curta",
    "foundation": "texto fundamentando a recomendação (2-4 frases)",
    "howWeDecided": "passos 1) 2) 3)",
    "comTiming": "opcional",
    "risks": ["..."],
    "dividendYieldOnPrice": number,
    "currentPrice": number,
    "userAveragePrice": number
  }],
  "calendarTips": ["..."]
}
Use sugestaoBaseRegras como base — melhore o texto de foundation, não invente preços.
Dados: ${JSON.stringify(payload)}`,
        },
      ],
      temperature: 0.35,
      response_format: { type: 'json_object' },
      max_tokens: 3200,
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    const recommendations: InvestmentRecommendation[] = Array.isArray(
      parsed.recommendations
    )
      ? parsed.recommendations.map((r: Record<string, unknown>) => {
          const situation = (r.situation as OpportunitySituation) || 'aguardar';
          return {
            action: (r.action as InvestmentRecommendation['action']) || 'aguardar',
            ticker: String(r.ticker || ''),
            bucket: (r.bucket as 'core' | 'opportunity') || 'core',
            sector: r.sector ? String(r.sector) : undefined,
            allocationPercent: Number(r.allocationPercent) || 0,
            suggestedAmount: Number(r.suggestedAmount) || 0,
            suggestedQuantity:
              r.suggestedQuantity != null ? Number(r.suggestedQuantity) : undefined,
            situation,
            situationLabel:
              String(r.situationLabel || '') ||
              OPPORTUNITY_SITUATION_LABELS[situation] ||
              situation,
            reason: String(r.reason || ''),
            foundation: String(r.foundation || r.howWeDecided || r.reason || ''),
            howWeDecided: String(r.howWeDecided || r.foundation || ''),
            comTiming: r.comTiming ? String(r.comTiming) : undefined,
            risks: Array.isArray(r.risks) ? r.risks.map(String) : [],
            dividendYieldOnPrice:
              r.dividendYieldOnPrice != null
                ? Number(r.dividendYieldOnPrice)
                : undefined,
            currentPrice: r.currentPrice != null ? Number(r.currentPrice) : undefined,
            userAveragePrice:
              r.userAveragePrice != null ? Number(r.userAveragePrice) : undefined,
          };
        })
      : baseline.recommendations;

    const report: InvestmentAdviceReport = {
      capitalAvailable,
      generatedAt: new Date().toISOString(),
      mode: 'ai',
      summary: String(parsed.summary || baseline.summary),
      teachingNote: String(
        parsed.teachingNote ||
          'Cada item mostra a situação da empresa e o texto que fundamenta a recomendação.'
      ),
      coreAllocation: INVESTMENT_STRATEGY.coreAllocationPercent,
      opportunityAllocation: INVESTMENT_STRATEGY.opportunityAllocationPercent,
      opportunityReserved:
        Number(parsed.opportunityReserved) || baseline.opportunityReserved,
      sectorAllocation,
      recommendations: recommendations.filter((r) => r.ticker),
      portfolioAnalysis: {
        currentCorePercent: Math.round(buckets.core * 10) / 10,
        currentOpportunityPercent: Math.round(buckets.opportunity * 10) / 10,
        sectorPercents,
        positions,
      },
      calendarTips: Array.isArray(parsed.calendarTips)
        ? parsed.calendarTips.map(String)
        : baseline.calendarTips,
      dataSources: ['OpenAI', 'BRAPI', 'Yahoo Finance', 'B3'],
    };

    setCache(key, report, CACHE_TTL.aiAnalysis);
    return report;
  } catch {
    const report = ruleBasedAdvice(capitalAvailable, positions, snapshots);
    setCache(key, report, CACHE_TTL.aiAnalysis);
    return report;
  }
}
