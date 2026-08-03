import type {
  OpportunitySituation,
  TickerMarketSnapshot,
} from '@/lib/investment-advice-types';

export interface OpportunityScore {
  ticker: string;
  score: number;
  isClear: boolean;
  signals: string[];
  summary: string;
  situation: OpportunitySituation;
}

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00');
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / 86400000);
}

/** Oportunidade (15%): commodities / desconto / alto DY / crescimento — com segurança mínima. */
export function scoreOpportunity(snapshot: TickerMarketSnapshot): OpportunityScore {
  let score = 0;
  const signals: string[] = [];
  const dy = snapshot.dividendYield ?? 0;
  const drop = snapshot.changePercent;
  const pe = snapshot.pe;
  const divScore = snapshot.dividendScore ?? 0;

  let situation: OpportunitySituation = 'aguardar';

  // Segurança mínima: DY histórico ou P/L não absurdo
  const hasMinSafety =
    (dy >= 3 && (divScore >= 5 || dy >= 5)) ||
    (pe != null && pe > 0 && pe < 18) ||
    drop <= -8;

  if (drop <= -5 && dy >= 4 && hasMinSafety) {
    score += 5;
    situation = 'descontada_dividendos';
    signals.push(
      `Preço descontado (${drop.toFixed(1)}% no dia) e ainda paga ~${dy.toFixed(1)}% de dividendos — combinação clássica de oportunidade.`
    );
  } else if (dy >= 7 && hasMinSafety) {
    score += 4;
    situation = 'alto_dividendo_seguro';
    signals.push(
      `Alto dividend yield (~${dy.toFixed(1)}% s/ preço atual) com sinais mínimos de segurança.`
    );
  } else if (
    (drop <= -3 && pe != null && pe > 0 && pe < 14) ||
    (snapshot.sector === 'Crescimento' && drop <= -4)
  ) {
    score += 3;
    situation = 'crescimento_rapido';
    signals.push(
      `Perfil de crescimento com preço mais atrativo agora${pe != null ? ` (P/L ~${pe.toFixed(1)})` : ''}.`
    );
  }

  if (snapshot.sector === 'Commodities') {
    score += 1;
    signals.push('Setor de commodities — encaixa no bucket de oportunidades.');
  }

  if (drop <= -5 && situation === 'aguardar') {
    score += 2;
    situation = 'descontada_dividendos';
    signals.push(`Queda relevante de ${Math.abs(drop).toFixed(1)}% — possível entrada se fundamentos ok.`);
  }

  if (dy >= 6 && situation === 'aguardar') {
    score += 2;
    situation = 'alto_dividendo_seguro';
    signals.push(`Yield atrativo (~${dy.toFixed(1)}%).`);
  }

  if (divScore >= 6.5) {
    score += 1;
    signals.push(`Histórico de proventos razoável (nota ${divScore}/10).`);
  }

  if (pe != null && pe > 25) {
    score -= 2;
    signals.push(`P/L elevado (~${pe.toFixed(1)}) — exige mais cautela.`);
  }

  if (snapshot.nextComDate) {
    const days = daysUntil(snapshot.nextComDate);
    if (days >= 0 && days <= 14) {
      score += 1;
      signals.push(`Data COM em ${days} dia(s) — timing de provento.`);
    }
  }

  const isClear = score >= 4 && hasMinSafety && situation !== 'aguardar';

  return {
    ticker: snapshot.ticker,
    score,
    isClear,
    signals,
    situation: isClear ? situation : 'aguardar',
    summary: isClear
      ? `Oportunidade classificada: ${situation}.`
      : 'Sem oportunidade clara com segurança mínima — preferir caixa.',
  };
}

/** Núcleo: prioriza maior DY s/ preço atual; bônus se baixa o preço médio. */
export function scoreCoreCandidate(snapshot: TickerMarketSnapshot): OpportunityScore {
  const dy = snapshot.dividendYield ?? 0;
  const signals: string[] = [];
  let score = dy * 10; // DY é o critério principal

  if (dy > 0) {
    signals.push(
      `Dividend yield ~${dy.toFixed(1)}% em relação ao preço atual (proventos 12m ÷ cotação).`
    );
  }

  const avg = snapshot.userAveragePrice;
  if (avg != null && avg > 0 && snapshot.price > 0) {
    if (snapshot.price < avg) {
      score += 8;
      signals.push(
        `Cotação R$ ${snapshot.price.toFixed(2)} abaixo do seu preço médio R$ ${avg.toFixed(2)} — ajuda a baixar a média.`
      );
    } else if (snapshot.price <= avg * 1.03) {
      score += 3;
      signals.push(`Preço próximo do seu médio (R$ ${avg.toFixed(2)}) — reforço sem encarecer muito.`);
    } else {
      signals.push(
        `Preço atual acima do seu médio (R$ ${avg.toFixed(2)}) — se comprar, a média sobe; só vale se o DY for o melhor do setor.`
      );
    }
  } else {
    signals.push('Você ainda não tem esse ativo — entrada nova no núcleo.');
  }

  if (snapshot.changePercent <= -3) {
    score += 2;
    signals.push(`Queda de ${Math.abs(snapshot.changePercent).toFixed(1)}% favorece entrada.`);
  }

  if (snapshot.nextComDate) {
    const days = daysUntil(snapshot.nextComDate);
    if (days >= 0 && days <= 10) {
      score += 1;
      signals.push(`COM em ${days} dia(s).`);
    }
  }

  const isClear = dy >= 2.5;

  return {
    ticker: snapshot.ticker,
    score,
    isClear,
    signals,
    situation: avg != null && snapshot.price < avg ? 'baixa_preco_medio' : 'maior_dy_setor',
    summary: isClear
      ? 'Candidata do núcleo pelo DY sobre o preço atual.'
      : 'DY baixo demais para priorizar no núcleo agora.',
  };
}
