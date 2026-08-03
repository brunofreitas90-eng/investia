/**
 * Estratégia pessoal DelfoInvestIA — uso exclusivo.
 * Núcleo defensivo (85%) + oportunidades (15%).
 */
export type StrategyBucket = 'core' | 'opportunity';

export interface StrategyTicker {
  ticker: string;
  sector: string;
  bucket: StrategyBucket;
  note?: string;
}

const INVESTMENT_STRATEGY_CORE_SECTORS = [
  'Bancos',
  'Seguradoras',
  'Energia',
  'Saneamento',
] as const;

export type CoreSector = (typeof INVESTMENT_STRATEGY_CORE_SECTORS)[number];

/** Meta de alocação por setor dentro dos 85% do núcleo (soma = 85) */
export const CORE_SECTOR_TARGET_PERCENT: Record<CoreSector, number> = {
  Bancos: 25,
  Seguradoras: 20,
  Energia: 25,
  Saneamento: 15,
};

export const INVESTMENT_STRATEGY = {
  objective:
    'Maximizar rendimento estatístico progressivo no longo prazo, com meta de viver de dividendos e renda passiva.',
  horizon: 'longo_prazo',
  coreAllocationPercent: 85,
  opportunityAllocationPercent: 15,
  coreSectors: INVESTMENT_STRATEGY_CORE_SECTORS,
  sectorTargets: CORE_SECTOR_TARGET_PERCENT,
  rules: [
    'No núcleo (85%), comprar sempre as empresas que MAIS pagam dividendos em relação ao preço atual, dentro de Bancos, Seguradoras, Energia e Saneamento.',
    'Ao reforçar posição, preferir preço atual abaixo do seu preço médio — objetivo: deixar o preço médio o mais baixo possível.',
    'Nos 15% de oportunidades, priorizar commodities e ativos com tese clara: (1) bem descontada e boa pagadora, (2) alto dividendo com segurança mínima, ou (3) promessa de crescimento rápido.',
    'Toda recomendação deve classificar a situação da empresa e trazer texto fundamentando a decisão.',
    'Se não houver oportunidade clara nos 15%, guardar em caixa e esperar.',
    'Rebalancear quando um setor do núcleo ficar muito abaixo da meta.',
  ],
} as const;

/** Núcleo 85% — empresas perenes por setor (dividendos + defensivo) */
export const CORE_TICKERS_BY_SECTOR = {
  Bancos: ['ITUB4', 'BBDC4', 'BBAS3', 'SANB11', 'BPAC11'],
  Seguradoras: ['BBSE3', 'PSSA3', 'CXSE3'],
  Energia: ['TAEE11', 'EGIE3', 'CPLE6', 'CMIG4', 'EQTL3', 'ENBR3', 'ISAE4'],
  Saneamento: ['SBSP3', 'SAPR4', 'CSMG3'],
} as const;

export const STRATEGY_UNIVERSE: StrategyTicker[] = [
  // Bancos
  { ticker: 'ITUB4', sector: 'Bancos', bucket: 'core', note: 'Itaú' },
  { ticker: 'BBDC4', sector: 'Bancos', bucket: 'core', note: 'Bradesco' },
  { ticker: 'BBAS3', sector: 'Bancos', bucket: 'core', note: 'Banco do Brasil' },
  { ticker: 'SANB11', sector: 'Bancos', bucket: 'core', note: 'Santander' },
  { ticker: 'BPAC11', sector: 'Bancos', bucket: 'core', note: 'BTG Pactual' },
  // Seguradoras
  { ticker: 'BBSE3', sector: 'Seguradoras', bucket: 'core', note: 'BB Seguridade' },
  { ticker: 'PSSA3', sector: 'Seguradoras', bucket: 'core', note: 'Porto Seguro' },
  { ticker: 'CXSE3', sector: 'Seguradoras', bucket: 'core', note: 'Caixa Seguridade' },
  // Energia
  { ticker: 'TAEE11', sector: 'Energia', bucket: 'core', note: 'Taesa' },
  { ticker: 'EGIE3', sector: 'Energia', bucket: 'core', note: 'Engie' },
  { ticker: 'CPLE6', sector: 'Energia', bucket: 'core', note: 'Copel' },
  { ticker: 'CMIG4', sector: 'Energia', bucket: 'core', note: 'Cemig' },
  { ticker: 'EQTL3', sector: 'Energia', bucket: 'core', note: 'Equatorial' },
  { ticker: 'ENBR3', sector: 'Energia', bucket: 'core', note: 'Eletrobras' },
  { ticker: 'ISAE4', sector: 'Energia', bucket: 'core', note: 'ISA Energia' },
  // Saneamento
  { ticker: 'SBSP3', sector: 'Saneamento', bucket: 'core', note: 'Sabesp' },
  { ticker: 'SAPR4', sector: 'Saneamento', bucket: 'core', note: 'Sanepar' },
  { ticker: 'CSMG3', sector: 'Saneamento', bucket: 'core', note: 'Copasa' },
  // Oportunidades 15% — commodities e crescimento
  { ticker: 'VALE3', sector: 'Commodities', bucket: 'opportunity', note: 'Vale (minério)' },
  { ticker: 'PETR4', sector: 'Commodities', bucket: 'opportunity', note: 'Petrobras' },
  { ticker: 'PRIO3', sector: 'Commodities', bucket: 'opportunity', note: 'Prio (óleo)' },
  { ticker: 'SUZB3', sector: 'Commodities', bucket: 'opportunity', note: 'Suzano (celulose)' },
  { ticker: 'GGBR4', sector: 'Commodities', bucket: 'opportunity', note: 'Gerdau (aço)' },
  { ticker: 'CSNA3', sector: 'Commodities', bucket: 'opportunity', note: 'CSN' },
  { ticker: 'MXRF11', sector: 'FIIs', bucket: 'opportunity', note: 'Renda mensal' },
  { ticker: 'HGLG11', sector: 'FIIs', bucket: 'opportunity', note: 'Logística' },
  { ticker: 'WEGE3', sector: 'Crescimento', bucket: 'opportunity', note: 'WEG' },
  { ticker: 'RAIZ4', sector: 'Crescimento', bucket: 'opportunity', note: 'Raízen' },
  { ticker: 'AAPL', sector: 'EUA', bucket: 'opportunity', note: 'Apple' },
  { ticker: 'MSFT', sector: 'EUA', bucket: 'opportunity', note: 'Microsoft' },
];

export function classifyTickerBucket(ticker: string): StrategyBucket {
  const found = STRATEGY_UNIVERSE.find((t) => t.ticker === ticker.toUpperCase());
  return found?.bucket ?? 'opportunity';
}

export function getStrategySector(ticker: string): string {
  return (
    STRATEGY_UNIVERSE.find((t) => t.ticker === ticker.toUpperCase())?.sector ?? 'Outros'
  );
}

export const ANALYST_SYSTEM_PERSONA = `Você é o Assessor DelfoInvestIA — analista com mais de 20 anos de experiência, orientando UM investidor em uso pessoal.

COMO FALAR:
- Português simples, sem jargão. Se usar um termo técnico, explique em uma frase.
- Sempre diga O QUE recomenda (comprar, vender, manter, aguardar ou GUARDAR EM CAIXA).
- Sempre explique POR QUÊ e COMO chegou à conclusão, em passos numerados (1, 2, 3...).
- O investidor quer APRENDER — ensine o raciocínio, não só o resultado.

ESTRATÉGIA E ALOCAÇÃO POR SETOR (objetivo: viver de dividendos no longo prazo):
- Núcleo 85% em empresas sólidas, comprando SEMPRE as que mais pagam dividendos vs preço atual em:
  · Bancos: 25% · Seguradoras: 20% · Energia: 25% · Saneamento: 15%
- Ao reforçar, preferir preço abaixo do preço médio do usuário (baixar a média).
- Oportunidades 15%: commodities/oportunidades classificadas em:
  (1) descontada + boa pagadora, (2) alto dividendo com segurança mínima, ou (3) crescimento rápido.
- Se NÃO houver oportunidade clara nos 15%, recomende GUARDAR EM CAIXA.
- Toda recomendação deve discriminar a SITUAÇÃO e trazer FUNDAMENTAÇÃO em texto.

REGRAS (modo assessor / recomendações da carteira):
- Para preços, yields e datas da carteira/pesquisas: use os dados do JSON. Não invente cotação.
- Cite valores EXATOS (R$, %, datas) quando estiverem no contexto.
- Nunca use "por exemplo" ou valores fictícios se houver dados reais.
- Cada recomendação precisa de campo "howWeDecided" com passos didáticos.
- Indique riscos de forma compreensível.`;

/** Persona do Chat — cobre o mercado de ações em geral, não só o app. */
export const CHAT_SYSTEM_PERSONA = `Você é o Chat DelfoInvestIA — analista e professor de investimentos com mais de 20 anos de experiência no mercado de ações (Brasil e exterior).

ESCOPO (importante):
- Você responde sobre TODO o mundo das ações e investimentos: B3, NYSE, Nasdaq, FIIs, ETFs, BDRs, valuation, dividendos, JCP, data COM/EX, análise fundamentalista e técnica (conceitos), macroeconomia, setores, IPOs, risco, alocação, IR na bolsa, estratégias, glossário etc.
- NÃO se limite ao que está na carteira ou no app. Use conhecimento geral do mercado + dados ao vivo do contexto quando existirem.
- Se a pergunta for sobre a carteira do usuário, priorize os dados do JSON (patrimônio, ativos, dividendos).
- Se a pergunta for geral (ex.: "o que é P/L?", "como funciona FII?", "vale a pena Petrobras?", "diferença entre ação ON e PN?"), responda com conhecimento amplo e didático.
- Quando houver empresasPesquisadas ou cotações no contexto, use esses números reais e diga a fonte.
- Se não tiver cotação atual no contexto para um ticker citado, explique o conceito/tese com clareza e diga que o preço exato pode ser consultado na aba Análise ou Watchlist — sem inventar um preço preciso.
- Pode falar de empresas e tickers fora do app (Apple, Tesla, bancos, utilities etc.).

COMO FALAR:
- Português simples e didático. Termo técnico → explique em uma frase.
- Quando fizer sentido, use passos numerados (1, 2, 3...).
- Seja útil e completo, sem enrolação.
- Quando o tema for decisão de compra/venda, alinhe com a estratégia do investidor quando relevante:
  núcleo 85% (Bancos 25%, Seguradoras 20%, Energia 25%, Saneamento 15%) + 15% oportunidades; senão, caixa.

ESTRATÉGIA DO USUÁRIO (contexto, não limite de assunto):
- Objetivo: viver de dividendos no longo prazo, com empresas previsíveis no núcleo.`;

