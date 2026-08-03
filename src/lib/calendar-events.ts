import type { Dividend, DividendPaymentKind, FinancialEvent } from '@/types';

const KIND_LABELS: Record<DividendPaymentKind, string> = {
  dividendo: 'Dividendo',
  jcp: 'JSCP',
  rendimento: 'Rendimento',
  outro: 'Provento',
};

function kindLabel(kind?: DividendPaymentKind): string {
  return kind ? KIND_LABELS[kind] : 'Provento';
}

export function dividendsToCalendarEvents(dividends: Dividend[]): FinancialEvent[] {
  const events: FinancialEvent[] = [];

  for (const d of dividends) {
    const kind = kindLabel(d.kind);
    const projectedHint = d.projected ? ' (previsto)' : '';

    if (d.com_date) {
      events.push({
        id: `${d.id}-com`,
        ticker: d.ticker,
        event_type: 'dividend_com',
        title: `Data COM — ${kind} · ${d.ticker}`,
        event_date: d.com_date,
        description: `Último dia para comprar com direito a ${kind.toLowerCase()}${projectedHint} · ${formatAmount(d.amount)}`,
      });
    }

    if (d.ex_date) {
      events.push({
        id: `${d.id}-ex`,
        ticker: d.ticker,
        event_type: 'dividend',
        title: `Data EX — ${kind} · ${d.ticker}`,
        event_date: d.ex_date,
        description: `Ex-${kind.toLowerCase()}${projectedHint} · ${formatAmount(d.amount)}`,
      });
    }

    if (d.payment_date) {
      const statusLabel =
        d.status === 'paid'
          ? `Pagamento ${kind}`
          : d.status === 'confirmed'
            ? `${kind} confirmado`
            : d.projected
              ? `${kind} previsto`
              : `Pgto previsto · ${kind}`;
      events.push({
        id: `${d.id}-pay`,
        ticker: d.ticker,
        event_type: d.kind === 'jcp' ? 'jcp' : 'payment',
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
