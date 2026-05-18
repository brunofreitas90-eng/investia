import type { Dividend, FinancialEvent } from '@/types';

export function dividendsToCalendarEvents(dividends: Dividend[]): FinancialEvent[] {
  const events: FinancialEvent[] = [];

  for (const d of dividends) {
    if (d.com_date) {
      events.push({
        id: `${d.id}-com`,
        ticker: d.ticker,
        event_type: 'dividend_com',
        title: `Data COM — ${d.ticker}`,
        event_date: d.com_date,
        description: `Último dia para comprar com direito a proventos · ${formatAmount(d.amount)}`,
      });
    }

    if (d.ex_date) {
      events.push({
        id: `${d.id}-ex`,
        ticker: d.ticker,
        event_type: 'dividend',
        title: `Data EX — ${d.ticker}`,
        event_date: d.ex_date,
        description: `Ex-dividendo · ${formatAmount(d.amount)}`,
      });
    }

    if (d.payment_date) {
      const statusLabel =
        d.status === 'paid' ? 'Pagamento' : d.status === 'confirmed' ? 'Pgto confirmado' : 'Pgto previsto';
      events.push({
        id: `${d.id}-pay`,
        ticker: d.ticker,
        event_type: 'payment',
        title: `${statusLabel} — ${d.ticker}`,
        event_date: d.payment_date,
        description: formatAmount(d.amount),
      });
    }
  }

  return events.sort((a, b) => a.event_date.localeCompare(b.event_date));
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
}

export function filterEventsByRange(
  events: FinancialEvent[],
  daysPast = 30,
  daysFuture = 90
): FinancialEvent[] {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - daysPast);
  const end = new Date(now);
  end.setDate(end.getDate() + daysFuture);

  return events.filter((e) => {
    const d = new Date(e.event_date + 'T12:00:00');
    return d >= start && d <= end;
  });
}

export function groupEventsByDate(
  events: FinancialEvent[]
): { date: string; events: FinancialEvent[] }[] {
  const map = new Map<string, FinancialEvent[]>();

  for (const e of events) {
    const list = map.get(e.event_date) ?? [];
    list.push(e);
    map.set(e.event_date, list);
  }

  return Array.from(map.entries())
    .map(([date, evs]) => ({ date, events: evs }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
