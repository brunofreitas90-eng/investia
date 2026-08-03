import { normalizeTicker } from '@/lib/utils';
import { STRATEGY_UNIVERSE } from '@/lib/investment-strategy';
import { allSectorTickers } from '@/lib/sector-dividend-universe';

const BR_TICKER_RE = /\b([A-Z]{4}\d{1,2})\b/gi;
const US_TICKER_RE = /\b([A-Z]{1,5})\b/g;

/** Nomes comuns → ticker (perguntas em português sem código). */
const COMPANY_NAME_TO_TICKER: Record<string, string> = {
  petrobras: 'PETR4',
  vale: 'VALE3',
  itau: 'ITUB4',
  itaú: 'ITUB4',
  bradesco: 'BBDC4',
  'banco do brasil': 'BBAS3',
  bb: 'BBAS3',
  santander: 'SANB11',
  btg: 'BPAC11',
  weg: 'WEGE3',
  ambev: 'ABEV3',
  magalu: 'MGLU3',
  magazine: 'MGLU3',
  sabesp: 'SBSP3',
  sanepar: 'SAPR4',
  copasa: 'CSMG3',
  cemig: 'CMIG4',
  taesa: 'TAEE11',
  engie: 'EGIE3',
  copel: 'CPLE6',
  equatorial: 'EQTL3',
  eletrobras: 'ELET3',
  'bb seguridade': 'BBSE3',
  porto: 'PSSA3',
  'porto seguro': 'PSSA3',
  apple: 'AAPL',
  microsoft: 'MSFT',
  nvidia: 'NVDA',
  tesla: 'TSLA',
  amazon: 'AMZN',
  google: 'GOOGL',
  alphabet: 'GOOGL',
};

const KNOWN_TICKERS = new Set(
  STRATEGY_UNIVERSE.map((t) => t.ticker)
    .concat(allSectorTickers())
    .concat([
      'PETR4',
      'VALE3',
      'WEGE3',
      'ABEV3',
      'MGLU3',
      'RENT3',
      'RADL3',
      'LREN3',
      'B3SA3',
      'PRIO3',
      'SUZB3',
      'VIVT3',
      'AAPL',
      'MSFT',
      'NVDA',
      'GOOGL',
      'GOOG',
      'AMZN',
      'TSLA',
      'META',
    ])
);

const US_STOPWORDS = new Set([
  'A',
  'O',
  'E',
  'DE',
  'DA',
  'DO',
  'EM',
  'UM',
  'UMA',
  'OS',
  'AS',
  'NO',
  'NA',
  'ME',
  'SE',
  'OU',
  'QUE',
  'POR',
  'COM',
  'PARA',
  'THE',
  'AND',
  'OR',
  'FOR',
  'DY',
  'IR',
  'ETF',
  'FII',
  'BDR',
  'IPO',
  'CEO',
]);

export function extractTickersFromMessage(message: string): string[] {
  const found = new Set<string>();
  const upper = message.toUpperCase();
  const lower = message
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');

  for (const match of upper.matchAll(BR_TICKER_RE)) {
    found.add(normalizeTicker(match[1]));
  }

  for (const ticker of KNOWN_TICKERS) {
    const re = new RegExp(`\\b${ticker}\\b`, 'i');
    if (re.test(upper)) found.add(ticker);
  }

  for (const [name, ticker] of Object.entries(COMPANY_NAME_TO_TICKER)) {
    const normalizedName = name.normalize('NFD').replace(/\p{M}/gu, '');
    if (lower.includes(normalizedName)) found.add(ticker);
  }

  // Tickers US curtos só se já conhecidos (evita pegar palavras comuns)
  for (const match of upper.matchAll(US_TICKER_RE)) {
    const t = match[1];
    if (US_STOPWORDS.has(t)) continue;
    if (KNOWN_TICKERS.has(t)) found.add(t);
  }

  return [...found];
}

/** Extrai yield alvo da pergunta (ex.: "rendimento de 8%") */
export function extractTargetYieldPercent(message: string): number | null {
  const text = message.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');

  const patterns = [
    /rendimento\s+(?:de\s+)?(\d+(?:[.,]\d+)?)\s*%/,
    /yield\s+(?:de\s+)?(\d+(?:[.,]\d+)?)\s*%/,
    /\bdy\s+(?:de\s+)?(\d+(?:[.,]\d+)?)\s*%/,
    /(\d+(?:[.,]\d+)?)\s*%\s*(?:de\s+)?(?:rendimento|yield|retorno)/,
    /alcan[cç]ar\s+(\d+(?:[.,]\d+)?)\s*%/,
    /atingir\s+(\d+(?:[.,]\d+)?)\s*%/,
    /com\s+(\d+(?:[.,]\d+)?)\s*%\s*(?:a\.?a\.?)?/,
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const n = parseFloat(m[1].replace(',', '.'));
      if (n > 0 && n <= 50) return n;
    }
  }
  return null;
}

export function isCompanyQuestion(message: string): boolean {
  const text = message.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  if (extractTickersFromMessage(message).length > 0) return true;
  return (
    /\b(preco|pre[cç]o|teto|vale\s+a\s+pena|dividendos?|proventos?|yield|dy|rendimento|como\s+esta)\b/.test(
      text
    ) && /\b(acao|a[cç][aã]o|empresa|fii|ativo)\b/.test(text)
  );
}
