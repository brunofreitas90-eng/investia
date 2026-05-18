import type { Dividend } from '@/types';

export interface MonthlyDividendRow {
  monthKey: string;
  label: string;
  received: number;
  expected: number;
  total: number;
}

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

function monthKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function labelFromKey(key: string): string {
  const [y, m] = key.split('-');
  const idx = parseInt(m, 10) - 1;
  return `${MONTH_NAMES[idx] ?? m}/${y}`;
}

function parsePaymentDate(iso?: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso + 'T12:00:00');
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Agrupa proventos mês a mês: recebidos (pagos) e previstos */
export function groupDividendsByMonth(
  events: Dividend[],
  options?: { pastMonths?: number; futureMonths?: number }
): MonthlyDividendRow[] {
  const pastMonths = options?.pastMonths ?? 12;
  const futureMonths = options?.futureMonths ?? 6;
  const now = new Date();

  const start = new Date(now.getFullYear(), now.getMonth() - (pastMonths - 1), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + futureMonths, 1);

  const buckets = new Map<string, MonthlyDividendRow>();

  for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
    const key = monthKeyFromDate(d);
    buckets.set(key, {
      monthKey: key,
      label: labelFromKey(key),
      received: 0,
      expected: 0,
      total: 0,
    });
  }

  for (const e of events) {
    const payment = parsePaymentDate(e.payment_date);
    if (!payment) continue;

    const key = monthKeyFromDate(payment);
    let row = buckets.get(key);
    if (!row) {
      row = {
        monthKey: key,
        label: labelFromKey(key),
        received: 0,
        expected: 0,
        total: 0,
      };
      buckets.set(key, row);
    }

    if (e.status === 'paid') {
      row.received += e.amount;
    } else {
      row.expected += e.amount;
    }
    row.total = row.received + row.expected;
  }

  return Array.from(buckets.values()).sort((a, b) =>
    a.monthKey.localeCompare(b.monthKey)
  );
}
