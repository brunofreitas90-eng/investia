import { dividendsToCalendarEvents, filterEventsByRange } from '@/lib/calendar-events';
import { enrichPortfolio, summarizePortfolio } from '@/lib/portfolio';
import { calculatePortfolioDividends } from '@/services/dividends/portfolio-dividends';
import { getQuotes } from '@/services/market';
import type { PortfolioItem } from '@/types';

export interface ChatContextPayload {
  patrimonio: number;
  investido: number;
  lucro: number;
  lucroPercent: number;
  dividendosRecebidos12m: number;
  dividendosPrevistos: number;
  rendaPassivaMensal: number;
  yieldMedio: number;
  qtdAtivos: number;
  ativos: {
    ticker: string;
    quantidade: number;
    precoMedio: number;
    precoAtual: number;
    valorAtual: number;
    lucroPercent: number;
    dividendYield?: number;
  }[];
  proximosEventos: { ticker: string; titulo: string; data: string }[];
  melhoresAtivos: { ticker: string; retorno: number }[];
  pioresAtivos: { ticker: string; retorno: number }[];
}

export async function buildChatContext(
  items: PortfolioItem[]
): Promise<ChatContextPayload> {
  if (items.length === 0) {
    return {
      patrimonio: 0,
      investido: 0,
      lucro: 0,
      lucroPercent: 0,
      dividendosRecebidos12m: 0,
      dividendosPrevistos: 0,
      rendaPassivaMensal: 0,
      yieldMedio: 0,
      qtdAtivos: 0,
      ativos: [],
      proximosEventos: [],
      melhoresAtivos: [],
      pioresAtivos: [],
    };
  }

  const quotes = await getQuotes(items.map((i) => i.ticker));
  const enriched = enrichPortfolio(items, quotes);
  const summary = summarizePortfolio(enriched);
  const dividends = await calculatePortfolioDividends(enriched, 'chat');

  const calendar = filterEventsByRange(
    dividendsToCalendarEvents(dividends.events),
    7,
    60
  )
    .filter((e) => e.event_date >= new Date().toISOString().split('T')[0])
    .slice(0, 8)
    .map((e) => ({
      ticker: e.ticker,
      titulo: e.title,
      data: e.event_date,
    }));

  const sorted = [...enriched].sort(
    (a, b) => (b.profit_loss_percent ?? 0) - (a.profit_loss_percent ?? 0)
  );

  return {
    patrimonio: summary.currentValue,
    investido: summary.totalInvested,
    lucro: summary.totalProfitLoss,
    lucroPercent: summary.totalProfitLossPercent,
    dividendosRecebidos12m: dividends.received12m,
    dividendosPrevistos: dividends.expectedUpcoming,
    rendaPassivaMensal: dividends.monthlyEstimate,
    yieldMedio: dividends.averageYield,
    qtdAtivos: enriched.length,
    ativos: enriched.map((a) => ({
      ticker: a.ticker,
      quantidade: a.quantity,
      precoMedio: a.average_price,
      precoAtual: a.current_price ?? a.average_price,
      valorAtual: a.current_value ?? a.quantity * a.average_price,
      lucroPercent: a.profit_loss_percent ?? 0,
      dividendYield: a.dividend_yield,
    })),
    proximosEventos: calendar,
    melhoresAtivos: sorted.slice(0, 3).map((a) => ({
      ticker: a.ticker,
      retorno: a.profit_loss_percent ?? 0,
    })),
    pioresAtivos: sorted
      .slice(-3)
      .reverse()
      .map((a) => ({
        ticker: a.ticker,
        retorno: a.profit_loss_percent ?? 0,
      })),
  };
}

export function formatContextForPrompt(ctx: ChatContextPayload): string {
  return JSON.stringify(ctx, null, 2);
}
