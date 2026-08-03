import { formatCurrency } from '@/lib/utils';
import type { ChatContextPayload } from '@/services/ai/chat-context';
import type { EnhancedChatContext } from '@/services/ai/enhanced-chat-context';
import type { CompanyResearchSnapshot } from '@/services/ai/company-research';

export type ChatContext = ChatContextPayload | EnhancedChatContext;

function hasMercado(ctx: ChatContext): ctx is EnhancedChatContext {
  return 'mercado' in ctx && ctx.mercado != null;
}

/** Evita falso positivo: "carteira" contém "ir" */
function matchesIntent(message: string, patterns: readonly RegExp[]): boolean {
  const text = message.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  return patterns.some((re) => re.test(text));
}

const INTENTS = {
  portfolio: [
    /\bcarteira\b/,
    /\bmeus?\s+ativos\b/,
    /\bquais\s+a[cç][oõ]es\b.*\b(tenho|possuo|est[aã]o)\b/,
    /\b(tenho|possuo)\b.*\ba[cç][oõ]es\b/,
    /\blistar?\s+(minha\s+)?carteira\b/,
    /\bo\s+que\s+tenho\b/,
  ],
  dividendsMonthly: [
    /\bdividendos?\b.*\b(m[eê]s|mensal|todo\s+m[eê]s)\b/,
    /\b(m[eê]s|mensal|todo\s+m[eê]s)\b.*\bdividendos?\b/,
    /\brenda\s+mensal\b/,
    /\bpagam\b.*\bm[eê]s\b/,
    /\bquais\s+a[cç][oõ]es\b.*\b(comprar|ter|teria|devo)\b/,
    /\bdevo\s+ter\b.*\bdividendos?\b/,
  ],
  dividends: [
    /\bdividendos?\b/,
    /\bproventos?\b/,
    /\brend[aá]\s+passiv/,
    /\bquanto\s+recebi\b/,
  ],
  ir: [
    /\bimposto\s+de\s+renda\b/,
    /\bdeclar(ar|a[cç][aã]o)\b/,
    /\bdarf\b/,
    /\b(isen[cç][aã]o|tribut)\b.*\bvendas?\b/,
    /\bir\b(?:\s|$|[.,!?])/,
    /\bir\b.*\bdeclar/,
  ],
  patrimony: [
    /\bcomo\s+est[aá]\b.*\bcarteira\b/,
    /\bpatrim[oô]nio\b/,
    /\blucro\b.*\bcarteira\b/,
    /\bresumo\b.*\bcarteira\b/,
  ],
  events: [
    /\bcalend[aá]rio\b/,
    /\bdata\s+com\b/,
    /\beventos?\b/,
    /\bpr[oó]ximos?\b.*\b(pagamento|com)\b/,
  ],
  recommendation: [
    /\brecomend/,
    /\bnota\b.*\bcompra\b/,
    /\bdeve\s+comprar\b/,
    /\boportunidade\b/,
  ],
  company: [
    /\b[A-Z]{4}\d{1,2}\b/,
    /\bpreco\s+teto\b/,
    /\bpre[cç]o\s+teto\b/,
    /\bquanto\s+pagar\b/,
    /\bqual\s+o\s+pre[cç]o\b/,
    /\brendimento\s+de\s+\d/,
    /\byield\s+de\s+\d/,
    /\bdy\s+de\s+\d/,
    /\bdividendos?\s+(de|da|do)\b/,
    /\bproventos?\s+(de|da|do)\b/,
    /\bcomo\s+est[aá]\b.*\b(acao|a[cç][aã]o|empresa)\b/,
  ],
} as const;

function detectIntent(message: string): keyof typeof INTENTS | 'general' {
  const order: (keyof typeof INTENTS)[] = [
    'portfolio',
    'company',
    'dividendsMonthly',
    'ir',
    'events',
    'dividends',
    'patrimony',
    'recommendation',
  ];
  for (const intent of order) {
    if (matchesIntent(message, INTENTS[intent])) return intent;
  }
  return 'general';
}

const fmt = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function formatCompanyResearch(empresa: CompanyResearchSnapshot, yieldAlvo?: number): string {
  const lines = [
    `${empresa.ticker} (${empresa.companyName}) — ${empresa.setor}`,
    `• Preço atual: ${formatCurrency(empresa.precoAtual)} (${empresa.variacaoDia >= 0 ? '+' : ''}${empresa.variacaoDia.toFixed(2)}% hoje)`,
    `• Proventos pagos por ação (últimos 12 meses): ${formatCurrency(empresa.proventos12mPorAcao)}`,
  ];

  if (empresa.dyAtual12m != null) {
    lines.push(`• Yield atual (12m): ${empresa.dyAtual12m.toFixed(2)}%`);
  }
  if (empresa.frequenciaPagamento) {
    lines.push(`• Frequência: ${empresa.frequenciaPagamento}`);
  }
  if (empresa.pagamentosPorAno != null) {
    lines.push(`• Pagamentos por ano: ${empresa.pagamentosPorAno}x`);
  }
  if (empresa.calendarioResumo) {
    lines.push(`• Calendário: ${empresa.calendarioResumo}`);
  }
  if (empresa.mesesTipicosPagamento?.length) {
    lines.push(`• Meses típicos: ${empresa.mesesTipicosPagamento.join(', ')}`);
  }
  if (empresa.proximaDataCom) {
    lines.push(`• Próxima data COM: ${empresa.proximaDataCom}`);
  }

  const teto = yieldAlvo
    ? empresa.precosTeto.find((p) => p.yieldAlvoPercent === yieldAlvo)
    : empresa.precosTeto[0];

  if (teto) {
    lines.push(
      '',
      `Preço teto para ${teto.yieldAlvoPercent}% a.a.: ${formatCurrency(teto.precoMaximo)}`,
      `Cálculo: ${teto.formula}`,
      empresa.precoAtual <= teto.precoMaximo
        ? `✓ Preço atual está dentro do teto (${formatCurrency(empresa.precoAtual)} ≤ ${formatCurrency(teto.precoMaximo)}).`
        : `⚠ Preço atual acima do teto — yield seria menor que ${teto.yieldAlvoPercent}%.`
    );
  }

  if (empresa.proventos12mDetalhe.length > 0) {
    lines.push('', 'Pagamentos nos últimos 12 meses:');
    for (const p of empresa.proventos12mDetalhe.slice(0, 8)) {
      lines.push(`  · ${p.data}: ${formatCurrency(p.valor)} (${p.tipo})`);
    }
  }

  lines.push('', `Fontes: ${empresa.fontes.join(', ')}`);
  return lines.join('\n');
}

export function answerFromContext(message: string, ctx: ChatContext): string {
  const intent = detectIntent(message);

  if (
    intent === 'company' &&
    'empresasPesquisadas' in ctx &&
    ctx.empresasPesquisadas.length > 0
  ) {
    const yieldAlvo = 'yieldAlvoPergunta' in ctx ? ctx.yieldAlvoPergunta : undefined;
    return ctx.empresasPesquisadas
      .map((e) => formatCompanyResearch(e, yieldAlvo))
      .join('\n\n---\n\n');
  }

  if (ctx.qtdAtivos === 0 && intent !== 'company') {
    return 'Sua carteira está vazia. Adicione ativos em Carteira para eu personalizar as respostas com seus dados reais.';
  }

  if (intent === 'portfolio') {
    const lines = ctx.ativos.map((a) => {
      const dy = a.dividendYield != null ? ` · DY ~${a.dividendYield.toFixed(1)}%` : '';
      return `• ${a.ticker}: ${a.quantidade} ações · valor ${fmt(a.valorAtual)} · lucro ${(a.lucroPercent ?? 0).toFixed(1)}%${dy}`;
    });
    return [
      `Você tem ${ctx.qtdAtivos} ativos na carteira (patrimônio ${fmt(ctx.patrimonio)}):`,
      '',
      ...lines,
      '',
      `Lucro total: ${fmt(ctx.lucro)} (${ctx.lucroPercent.toFixed(1)}%).`,
    ].join('\n');
  }

  if (intent === 'dividendsMonthly') {
    const monthly = hasMercado(ctx) ? ctx.mercado.pagadoresMensais : [];
    const topDy = hasMercado(ctx) ? ctx.mercado.topDividendYield : [];
    const lines: string[] = [
      'Para buscar dividendos com frequência mensal, combine FIIs e ações com histórico de pagamentos frequentes. Exemplos com bom histórico (mercado BR, dados públicos):',
    ];
    if (monthly.length > 0) {
      lines.push('', `Pagadores com perfil mensal (amostra): ${monthly.join(', ')}.`);
    }
    if (topDy.length > 0) {
      lines.push(
        '',
        'Maiores yields na amostra monitorada:',
        ...topDy.slice(0, 5).map((t) => `• ${t.ticker}: ~${t.dy.toFixed(1)}% a.a.`)
      );
    }
    lines.push(
      '',
      `Na sua carteira, renda passiva estimada: ${fmt(ctx.rendaPassivaMensal)}/mês · proventos 12m: ${fmt(ctx.dividendosRecebidos12m)}.`,
      '',
      'Use Renda Mensal (/renda-mensal) para simular meta em R$/mês e Dividendos (/dividendos) para histórico por empresa.',
      '',
      'Isso não é recomendação de compra — diversifique e confira o histórico de cada ticker antes de investir.'
    );
    return lines.join('\n');
  }

  if (intent === 'dividends') {
    return [
      `Proventos na sua carteira:`,
      `• Recebidos (12 meses): ${fmt(ctx.dividendosRecebidos12m)}`,
      `• Previstos (próximos): ${fmt(ctx.dividendosPrevistos)}`,
      `• Renda passiva estimada: ${fmt(ctx.rendaPassivaMensal)}/mês`,
      `• Yield médio: ${ctx.yieldMedio > 0 ? `${ctx.yieldMedio.toFixed(1)}%` : '—'}`,
      '',
      'Veja o calendário de datas COM/EX em Calendário ou o histórico completo em Dividendos.',
    ].join('\n');
  }

  if (intent === 'ir') {
    return [
      'Imposto de Renda (ações na B3):',
      '• Vendas até R$ 20.000/mês em ações são isentas de IR no mês.',
      '• Acima disso, o ganho de capital é tributado (alíquota conforme regras vigentes).',
      '• Dividendos de ações brasileiras costumam ser isentos para pessoa física (empresa já pagou IR).',
      '',
      'Use o módulo Imposto de Renda (/imposto) para acompanhar vendas e estimar DARF.',
    ].join('\n');
  }

  if (intent === 'events') {
    if (ctx.proximosEventos.length === 0) {
      return 'Não há eventos de dividendos nos próximos dias na sua carteira. Confira Calendário (/calendario).';
    }
    const evs = ctx.proximosEventos
      .slice(0, 6)
      .map((e) => `• ${e.data}: ${e.titulo} (${e.ticker})`);
    return ['Próximos eventos da carteira:', '', ...evs].join('\n');
  }

  if (intent === 'patrimony') {
    const lista = ctx.ativos.map((a) => a.ticker).join(', ');
    const best = ctx.melhoresAtivos[0];
    const worst = ctx.pioresAtivos[0];
    return [
      `Resumo da carteira:`,
      `• Patrimônio: ${fmt(ctx.patrimonio)} (investido ${fmt(ctx.investido)})`,
      `• Lucro: ${fmt(ctx.lucro)} (${ctx.lucroPercent.toFixed(1)}%)`,
      `• Ativos: ${lista}`,
      best ? `• Melhor desempenho: ${best.ticker} (${best.retorno.toFixed(1)}%)` : '',
      worst ? `• Pior desempenho: ${worst.ticker} (${worst.retorno.toFixed(1)}%)` : '',
      `• Dividendos 12m: ${fmt(ctx.dividendosRecebidos12m)}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (intent === 'recommendation') {
    return [
      'Para recomendações de compra e venda com sua estratégia (85% núcleo / 15% oportunidades), use o Assessor IA (/assessoria).',
      '',
      'Como funciona:',
      '1) Você informa quanto tem para investir.',
      '2) O assessor analisa bancos, energia, saneamento e oportunidades.',
      '3) Se não houver oportunidade clara nos 15%, ele orienta guardar em caixa e esperar.',
      '4) Cada sugestão explica o passo a passo do raciocínio.',
      '',
      `Sua carteira hoje: ${ctx.ativos.map((a) => a.ticker).join(', ')}.`,
    ].join('\n');
  }

  const lista = ctx.ativos.map((a) => `${a.ticker} (${a.quantidade} ações)`).join(', ');
  return [
    'Posso falar sobre o mercado de ações em geral (conceitos, setores, empresas, dividendos, IR, FIIs, exterior) e também sobre a sua carteira neste app.',
    '',
    `Sua carteira agora: ${ctx.qtdAtivos} ativos (${lista || 'vazia'}) · patrimônio ${fmt(ctx.patrimonio)}.`,
    '',
    'Exemplos: "o que é P/L?", "como funciona data COM?", "vale a pena Petrobras?", "quais ações tenho?", "quanto recebi de dividendos?".',
    '',
    'Com a IA ativa (OpenAI), as respostas gerais ficam bem mais completas — configure OPENAI_API_KEY se ainda não estiver.',
  ].join('\n');
}

export function isOpenAIAvailable(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}
