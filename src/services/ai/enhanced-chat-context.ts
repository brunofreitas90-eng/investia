import { popularTickers } from '@/lib/demo-data';
import { extractTargetYieldPercent, extractTickersFromMessage } from '@/lib/ticker-extract';
import { buildChatContext, type ChatContextPayload } from './chat-context';
import { researchCompanies, type CompanyResearchSnapshot } from './company-research';
import { buildDividendHistoryReport } from '@/services/market/dividend-history';
import { scanMarketDrops } from '@/services/radar/market-drops';
import { getFundamentals, getQuotes } from '@/services/market';
import type { PortfolioItem } from '@/types';

export interface EnhancedChatContext extends ChatContextPayload {
  mercado: {
    maioresQuedasDia: { ticker: string; queda: number; classificacao: string }[];
    topDividendYield: { ticker: string; dy: number }[];
    pagadoresMensais: string[];
  };
  /** Dados reais pesquisados para tickers mencionados na pergunta */
  empresasPesquisadas: CompanyResearchSnapshot[];
  yieldAlvoPergunta?: number;
  fontes: string[];
}

export async function buildEnhancedChatContext(
  items: PortfolioItem[],
  message?: string
): Promise<EnhancedChatContext> {
  const base = await buildChatContext(items);

  const [drops, quotes] = await Promise.all([
    scanMarketDrops(popularTickers.slice(0, 8), false),
    getQuotes(popularTickers.slice(0, 10)),
  ]);

  const snapshots: { ticker: string; dy: number }[] = [];
  await Promise.all(
    popularTickers.slice(0, 8).map(async (t) => {
      const q = quotes.get(t);
      const f = await getFundamentals(t);
      const dy = f?.dividendYield ?? q?.dividendYield;
      if (dy != null && dy > 0) snapshots.push({ ticker: t, dy });
    })
  );

  snapshots.sort((a, b) => b.dy - a.dy);

  const pagadoresMensais: string[] = [];
  for (const t of popularTickers.slice(0, 5)) {
    try {
      const hist = await buildDividendHistoryReport(t);
      if (hist?.analytics.frequency.includes('Mensal')) {
        pagadoresMensais.push(t);
      }
    } catch {
      /* skip */
    }
  }

  const portfolioTickers = new Set(items.map((i) => i.ticker.toUpperCase()));
  const mentionedTickers = message
    ? extractTickersFromMessage(message).filter((t) => !portfolioTickers.has(t))
    : [];

  const portfolioMentioned = message
    ? extractTickersFromMessage(message).filter((t) => portfolioTickers.has(t))
    : [];

  const allResearchTickers = [...new Set([...mentionedTickers, ...portfolioMentioned])];
  const yieldAlvo = message ? extractTargetYieldPercent(message) : null;

  const empresasPesquisadas =
    allResearchTickers.length > 0
      ? await researchCompanies(allResearchTickers, yieldAlvo)
      : [];

  return {
    ...base,
    mercado: {
      maioresQuedasDia: drops.day.slice(0, 5).map((d) => ({
        ticker: d.ticker,
        queda: d.changePercent,
        classificacao: d.classificationLabel,
      })),
      topDividendYield: snapshots.slice(0, 6),
      pagadoresMensais,
    },
    empresasPesquisadas,
    yieldAlvoPergunta: yieldAlvo ?? undefined,
    fontes: ['BRAPI', 'Yahoo Finance', 'B3', 'Carteira do usuário'],
  };
}

export function formatEnhancedContextForPrompt(ctx: EnhancedChatContext): string {
  return JSON.stringify(ctx, null, 2);
}
