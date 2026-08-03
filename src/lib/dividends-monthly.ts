import type { Dividend } from '@/types';

export interface MonthlyDividendRow {
  monthKey: string;
  label: string;
  received: number;
  expected: number;
  total: number;
}

export interface DividendYearSummary {
  year: number;
  monthsInYear: number;
  monthsWithReceived: number;
  monthsWithExpected: number;
  totalReceived: number;
  totalExpected: number;
  totalCombined: number;
  /** Média mensal de proventos já recebidos no ano */
  avgReceivedPerMonth: number;
  /** Média mensal de proventos previstos no ano */
  avgExpectedPerMonth: number;
  /** Média mensal total (recebidos + previstos) */
  avgTotalPerMonth: number;
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

/** Resumo por ano civil com médias mensais */
export function computeYearSummaries(rows: MonthlyDividendRow[]): DividendYearSummary[] {
  const byYear = new Map<number, MonthlyDividendRow[]>();

  for (const row of rows) {
    const year = parseInt(row.monthKey.split('-')[0], 10);
    const list = byYear.get(year) ?? [];
    list.push(row);
    byYear.set(year, list);
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  return Array.from(byYear.entries())
    .map(([year, yearRows]) => {
      const totalReceived = yearRows.reduce((s, r) => s + r.received, 0);
      const totalExpected = yearRows.reduce((s, r) => s + r.expected, 0);
      const monthsWithReceived = yearRows.filter((r) => r.received > 0).length;
      const monthsWithExpected = yearRows.filter((r) => r.expected > 0).length;

      const elapsedMonths =
        year === currentYear ? currentMonth : year < currentYear ? 12 : 0;
      const divisorReceived = Math.max(monthsWithReceived, elapsedMonths, 1);
      const divisorExpected = Math.max(monthsWithExpected, 1);
      const divisorTotal = Math.max(yearRows.filter((r) => r.total > 0).length, elapsedMonths, 1);

      return {
        year,
        monthsInYear: yearRows.length,
        monthsWithReceived,
        monthsWithExpected,
        totalReceived,
        totalExpected,
        totalCombined: totalReceived + totalExpected,
        avgReceivedPerMonth: totalReceived / divisorReceived,
        avgExpectedPerMonth: totalExpected / divisorExpected,
        avgTotalPerMonth: (totalReceived + totalExpected) / divisorTotal,
      };
    })
    .sort((a, b) => b.year - a.year);
}

export function filterRowsByYear(
  rows: MonthlyDividendRow[],
  year: number
): MonthlyDividendRow[] {
  const prefix = `${year}-`;
  return rows.filter((r) => r.monthKey.startsWith(prefix));
}
