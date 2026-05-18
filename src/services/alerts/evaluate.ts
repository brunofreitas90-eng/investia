import { describeAlert } from '@/lib/alert-config';
import { dividendsToCalendarEvents } from '@/lib/calendar-events';
import { enrichPortfolio } from '@/lib/portfolio';
import { calculatePortfolioDividends } from '@/services/dividends/portfolio-dividends';
import { getQuotes } from '@/services/market';
import type { Alert, AlertType, PortfolioItem } from '@/types';

export interface AlertWithStatus extends Alert {
  triggered: boolean;
  statusMessage: string;
  currentPrice?: number;
  currentPercent?: number;
}

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00');
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (86400000));
}

function normalizeAlertType(alert: Alert): AlertType {
  const cond = alert.condition;
  if (alert.alert_type === 'price_target' && cond.direction === 'below') {
    return 'price_drop';
  }
  return alert.alert_type;
}

async function evaluateOne(
  alert: Alert,
  quotes: Map<string, { price: number; changePercent?: number }>,
  portfolioMap: Map<string, PortfolioItem>,
  calendarEvents: { ticker: string; event_type: string; event_date: string }[]
): Promise<AlertWithStatus> {
  const type = normalizeAlertType(alert);
  const ticker = alert.ticker?.toUpperCase();
  const cond = alert.condition;

  let triggered = false;
  let statusMessage = 'Monitorando';
  let currentPrice: number | undefined;
  let currentPercent: number | undefined;

  if (!alert.is_active) {
    return {
      ...alert,
      triggered: false,
      statusMessage: 'Alerta pausado',
    };
  }

  if (type === 'price_target' || type === 'price_drop') {
    if (ticker) {
      const q = quotes.get(ticker);
      currentPrice = q?.price;
      const target = Number(cond.targetPrice);
      if (currentPrice != null && target > 0) {
        if (type === 'price_target') {
          triggered = currentPrice >= target;
          statusMessage = triggered
            ? `Disparado: ${currentPrice.toFixed(2)} ≥ ${target.toFixed(2)}`
            : `Atual ${currentPrice.toFixed(2)} · alvo ${target.toFixed(2)}`;
        } else {
          triggered = currentPrice <= target;
          statusMessage = triggered
            ? `Disparado: ${currentPrice.toFixed(2)} ≤ ${target.toFixed(2)}`
            : `Atual ${currentPrice.toFixed(2)} · piso ${target.toFixed(2)}`;
        }
      }
    }
  }

  if ((type === 'gain' || type === 'loss') && ticker) {
    const item = portfolioMap.get(ticker);
    const threshold = Number(cond.percent) || 10;
    if (item) {
      currentPercent = item.profit_loss_percent ?? 0;
      if (type === 'gain') {
        triggered = currentPercent >= threshold;
        statusMessage = triggered
          ? `Lucro de ${currentPercent.toFixed(1)}% atingido`
          : `Lucro atual ${currentPercent.toFixed(1)}% · meta ${threshold}%`;
      } else {
        triggered = currentPercent <= -threshold;
        statusMessage = triggered
          ? `Prejuízo de ${currentPercent.toFixed(1)}% atingido`
          : `Resultado ${currentPercent.toFixed(1)}% · limite -${threshold}%`;
      }
    } else {
      statusMessage = 'Ativo não está na carteira';
    }
  }

  if (type === 'com_date' || type === 'payment' || type === 'dividend') {
    const daysBefore = Number(cond.daysBefore) || 3;
    const eventType =
      type === 'com_date' ? 'dividend_com' : type === 'payment' ? 'payment' : 'payment';

    const match = calendarEvents.find(
      (e) =>
        (!ticker || e.ticker === ticker) &&
        (type === 'com_date'
          ? e.event_type === 'dividend_com'
          : e.event_type === 'payment') &&
        daysUntil(e.event_date) >= 0 &&
        daysUntil(e.event_date) <= daysBefore
    );

    if (match) {
      triggered = true;
      statusMessage = `Evento em ${daysUntil(match.event_date)} dia(s) · ${match.event_date}`;
    } else {
      statusMessage = `Nenhum evento nos próximos ${daysBefore} dias`;
    }
  }

  if (statusMessage === 'Monitorando') {
    statusMessage = describeAlert(type, cond, ticker);
  }

  return {
    ...alert,
    alert_type: type,
    triggered,
    statusMessage,
    currentPrice,
    currentPercent,
  };
}

export async function evaluateAlerts(
  alerts: Alert[],
  portfolioItems: PortfolioItem[]
): Promise<AlertWithStatus[]> {
  const tickers = [
    ...new Set([
      ...alerts.map((a) => a.ticker).filter(Boolean) as string[],
      ...portfolioItems.map((p) => p.ticker),
    ]),
  ];

  const quotes = await getQuotes(tickers);
  const quoteMap = new Map(
    [...quotes.entries()].map(([t, q]) => [t, { price: q.price, changePercent: q.changePercent }])
  );

  const enriched = enrichPortfolio(portfolioItems, quotes);
  const portfolioMap = new Map(enriched.map((p) => [p.ticker.toUpperCase(), p]));

  const dividends = await calculatePortfolioDividends(enriched, 'demo');
  const calendarEvents = dividendsToCalendarEvents(dividends.events).map((e) => ({
    ticker: e.ticker,
    event_type: e.event_type,
    event_date: e.event_date,
  }));

  return Promise.all(
    alerts.map((a) => evaluateOne(a, quoteMap, portfolioMap, calendarEvents))
  );
}
