/**
 * Textos didáticos — linguagem simples, explicando o raciocínio.
 */
export const PLAIN_LANGUAGE_RULES = `
Use linguagem simples, como se explicasse para um amigo.
Evite siglas sem explicar (se usar P/L, diga "preço em relação ao lucro").
Sempre explique POR QUE e COMO chegou à conclusão, em passos numerados quando possível.
Não use jargão de mercado sem traduzir.
`;

export function explainCoreBuy(
  ticker: string,
  sector: string,
  dy: number,
  amount: number,
  comDate?: string
): { reason: string; howWeDecided: string } {
  const steps = [
    `1) Este ativo (${ticker}) faz parte do núcleo seguro — setor de ${sector}.`,
    `2) Empresas assim costumam pagar dividendos de forma mais estável no longo prazo.`,
    dy > 0
      ? `3) Hoje paga cerca de ${dy.toFixed(1)}% ao ano em proventos — ajuda na meta de renda passiva.`
      : `3) Verifique o histórico de dividendos antes de aumentar posição.`,
    `4) Por isso sugeri alocar cerca de ${formatBRL(amount)} aqui (parte dos 85% do núcleo).`,
  ];
  if (comDate) {
    steps.push(
      `5) A data COM (${comDate}) está próxima — se comprar antes, você pode receber o próximo provento.`
    );
  }

  return {
    reason: `${ticker} combina com sua estratégia de longo prazo em ${sector}, com foco em dividendos.`,
    howWeDecided: steps.join('\n'),
  };
}

export function explainGuardCash(
  reservedAmount: number,
  whyNoOpportunity: string
): { reason: string; howWeDecided: string } {
  return {
    reason: `Não há oportunidade clara agora. É melhor guardar ${formatBRL(reservedAmount)} (15%) e esperar um momento mais favorável.`,
    howWeDecided: [
      '1) Separamos 15% do valor para oportunidades (FIIs, exterior, etc.).',
      `2) ${whyNoOpportunity}`,
      '3) Comprar sem oportunidade clara costuma reduzir o rendimento no longo prazo.',
      `4) Recomendação: mantenha ${formatBRL(reservedAmount)} em caixa e acompanhe o módulo Oportunidades e Alertas.`,
    ].join('\n'),
  };
}

export function explainOpportunityBuy(
  ticker: string,
  signals: string[],
  amount: number
): { reason: string; howWeDecided: string } {
  return {
    reason: `${ticker} aparece como oportunidade no momento — dentro dos 15% reservados para investimentos mais arrojados.`,
    howWeDecided: [
      '1) Analisamos ativos de oportunidade (FIIs, ETFs, ações internacionais).',
      ...signals.map((s, i) => `${i + 2}) ${s}`),
      `${signals.length + 2}) Valor sugerido: ${formatBRL(amount)} (parte dos 15%).`,
    ].join('\n'),
  };
}

export function explainWaitPosition(
  ticker: string,
  lossPercent: number
): { reason: string; howWeDecided: string } {
  return {
    reason: `${ticker} está com prejuízo de ${lossPercent.toFixed(1)}%. Não recomendo vender no pânico — espere e reavalie.`,
    howWeDecided: [
      `1) A posição em ${ticker} caiu ${Math.abs(lossPercent).toFixed(1)}% em relação ao que você pagou.`,
      '2) Vender agora pode cristalizar o prejuízo.',
      '3) Verifique se os fundamentos da empresa pioraram ou se é apenas movimento do mercado.',
      '4) Se o negócio continua sólido, manter pode ser mais inteligente no longo prazo.',
    ].join('\n'),
  };
}

function formatBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
