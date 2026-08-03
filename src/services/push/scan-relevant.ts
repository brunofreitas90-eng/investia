import { buildDividendHistoryReport } from '@/services/market/dividend-history';
import { getQuotes } from '@/services/market';

export interface RelevantPushEvent {
  key: string;
  title: string;
  body: string;
  url: string;
  tag: string;
}

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00');
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / 86400000);
}

const MOVE_THRESHOLD = 3; // % diário
const COM_WINDOW_DAYS = 2;
const PAY_WINDOW_DAYS = 2;
const GAIN_LOSS_THRESHOLD = 8; // % vs preço médio

/**
 * Varre carteira + watchlist e gera eventos relevantes para notificação.
 */
export async function scanRelevantEvents(input: {
  tickers: string[];
  avgPrices?: Record<string, number>;
  alreadyNotified?: Record<string, string>;
}): Promise<RelevantPushEvent[]> {
  const tickers = [...new Set(input.tickers.map((t) => t.toUpperCase()).filter(Boolean))];
  if (tickers.length === 0) return [];

  const avg = input.avgPrices ?? {};
  const notified = input.alreadyNotified ?? {};
  const events: RelevantPushEvent[] = [];

  const quotes = await getQuotes(tickers);

  for (const ticker of tickers) {
    const q = quotes.get(ticker);
    if (!q) continue;

    const change = q.changePercent ?? 0;
    if (Math.abs(change) >= MOVE_THRESHOLD) {
      const key = `${ticker}:move:${new Date().toISOString().slice(0, 10)}:${change >= 0 ? 'up' : 'down'}`;
      if (!notified[key]) {
        const dir = change >= 0 ? 'alta' : 'queda';
        events.push({
          key,
          title: `${ticker} em ${dir} de ${Math.abs(change).toFixed(1)}%`,
          body: `Cotação atual R$ ${q.price.toFixed(2)}. Movimento relevante no dia.`,
          url: `/analise?ticker=${ticker}`,
          tag: `move-${ticker}`,
        });
      }
    }

    const avgPrice = avg[ticker];
    if (avgPrice != null && avgPrice > 0) {
      const pnl = ((q.price - avgPrice) / avgPrice) * 100;
      if (pnl >= GAIN_LOSS_THRESHOLD) {
        const key = `${ticker}:gain:${Math.floor(pnl / 5) * 5}`;
        if (!notified[key]) {
          events.push({
            key,
            title: `${ticker} com lucro de ${pnl.toFixed(1)}%`,
            body: `Preço R$ ${q.price.toFixed(2)} vs seu médio R$ ${avgPrice.toFixed(2)}.`,
            url: '/carteira',
            tag: `gain-${ticker}`,
          });
        }
      } else if (pnl <= -GAIN_LOSS_THRESHOLD) {
        const key = `${ticker}:loss:${Math.floor(Math.abs(pnl) / 5) * 5}`;
        if (!notified[key]) {
          events.push({
            key,
            title: `${ticker} com queda de ${Math.abs(pnl).toFixed(1)}% vs médio`,
            body: `Preço R$ ${q.price.toFixed(2)} abaixo do seu preço médio R$ ${avgPrice.toFixed(2)}.`,
            url: '/carteira',
            tag: `loss-${ticker}`,
          });
        }
      }
    }
  }

  // Dividendos / COM / pagamento — histórico por ticker (em paralelo, limitado)
  const batch = tickers.slice(0, 25);
  const reports = await Promise.all(
    batch.map(async (ticker) => {
      try {
        return [ticker, await buildDividendHistoryReport(ticker)] as const;
      } catch {
        return [ticker, null] as const;
      }
    })
  );

  for (const [ticker, report] of reports) {
    if (!report?.payments?.length) continue;

    for (const p of report.payments) {
      if (p.comDate) {
        const days = daysUntil(p.comDate);
        if (days >= 0 && days <= COM_WINDOW_DAYS) {
          const key = `${ticker}:com:${p.comDate}`;
          if (!notified[key]) {
            events.push({
              key,
              title: `Data COM — ${ticker}`,
              body:
                days === 0
                  ? `Hoje é o último dia com direito a proventos${p.amountPerShare ? ` (~R$ ${p.amountPerShare.toFixed(2)}/ação)` : ''}.`
                  : `Faltam ${days} dia(s) para a data COM (${p.comDate})${p.amountPerShare ? ` · ~R$ ${p.amountPerShare.toFixed(2)}/ação` : ''}.`,
              url: '/calendario',
              tag: `com-${ticker}`,
            });
          }
        }
      }

      if (p.paymentDate) {
        const days = daysUntil(p.paymentDate);
        if (days >= 0 && days <= PAY_WINDOW_DAYS) {
          const key = `${ticker}:pay:${p.paymentDate}`;
          if (!notified[key]) {
            events.push({
              key,
              title: `Pagamento — ${ticker}`,
              body:
                days === 0
                  ? `Pagamento de proventos previsto para hoje${p.amountPerShare ? ` (~R$ ${p.amountPerShare.toFixed(2)}/ação)` : ''}.`
                  : `Pagamento em ${days} dia(s) (${p.paymentDate})${p.amountPerShare ? ` · ~R$ ${p.amountPerShare.toFixed(2)}/ação` : ''}.`,
              url: '/dividendos',
              tag: `pay-${ticker}`,
            });
          }
        }

        // Anúncio recente: pagamento futuro anunciado (COM já passou ou está próxima, pagamento > 2d)
        if (p.comDate) {
          const comDays = daysUntil(p.comDate);
          const payDays = daysUntil(p.paymentDate);
          // Novo anúncio: COM nos últimos 3 dias ou nos próximos 7, e ainda não notificado
          if (comDays >= -3 && comDays <= 7 && payDays > PAY_WINDOW_DAYS) {
            const key = `${ticker}:announce:${p.comDate}:${p.paymentDate}`;
            if (!notified[key]) {
              events.push({
                key,
                title: `Provento anunciado — ${ticker}`,
                body: `COM ${p.comDate}${p.paymentDate ? ` · pagamento ${p.paymentDate}` : ''}${p.amountPerShare ? ` · R$ ${p.amountPerShare.toFixed(2)}/ação` : ''}.`,
                url: '/dividendos',
                tag: `ann-${ticker}`,
              });
            }
          }
        }
      }
    }
  }

  // no máximo 5 por ciclo para não spammar
  return events.slice(0, 5);
}
