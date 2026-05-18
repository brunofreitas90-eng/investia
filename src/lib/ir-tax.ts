import type { Operation, PortfolioItem } from '@/types';

export const IR_EXEMPTION_LIMIT = 20000;
export const IR_SWING_RATE = 0.15;
export const IR_DAYTRADE_RATE = 0.2;

export function calculateIRTax(
  monthlySales: number,
  monthlyProfit: number,
  isDayTrade = false
): { taxDue: number; isExempt: boolean; rate: number } {
  const isExempt = monthlySales <= IR_EXEMPTION_LIMIT;

  if (isExempt || monthlyProfit <= 0) {
    return { taxDue: 0, isExempt, rate: 0 };
  }

  const rate = isDayTrade ? IR_DAYTRADE_RATE : IR_SWING_RATE;
  return { taxDue: monthlyProfit * rate, isExempt: false, rate };
}

export interface MonthlyTaxRow {
  year: number;
  month: number;
  label: string;
  totalSales: number;
  totalProfit: number;
  taxDue: number;
  isExempt: boolean;
  operationCount: number;
}

export interface TaxReport {
  operations: Operation[];
  monthly: MonthlyTaxRow[];
  annual: {
    year: number;
    totalSales: number;
    totalProfit: number;
    totalTaxDue: number;
    exemptMonths: number;
    taxableMonths: number;
  };
  currentMonth: MonthlyTaxRow;
  unrealizedGain: number;
  portfolioPatrimony: number;
}

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

function monthKey(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function computeSellProfit(
  op: Operation,
  portfolioItems: PortfolioItem[]
): number {
  if (op.operation_type !== 'sell') return 0;
  const item = portfolioItems.find((p) => p.ticker === op.ticker);
  const costBasis = item?.average_price ?? op.price;
  const gross = op.price * op.quantity;
  const cost = costBasis * op.quantity;
  return Math.max(0, gross - cost - (op.fees ?? 0));
}

export function buildTaxReport(
  operations: Operation[],
  portfolioItems: PortfolioItem[] = [],
  year = new Date().getFullYear()
): TaxReport {
  const sells = operations.filter((o) => o.operation_type === 'sell');
  const byMonth = new Map<string, { sales: number; profit: number; count: number }>();

  for (const op of sells) {
    const key = monthKey(op.operation_date);
    const bucket = byMonth.get(key) ?? { sales: 0, profit: 0, count: 0 };
    bucket.sales += op.total ?? op.price * op.quantity;
    bucket.profit += computeSellProfit(op, portfolioItems);
    bucket.count += 1;
    byMonth.set(key, bucket);
  }

  const monthly: MonthlyTaxRow[] = [];

  for (let m = 1; m <= 12; m++) {
    const key = `${year}-${String(m).padStart(2, '0')}`;
    const data = byMonth.get(key) ?? { sales: 0, profit: 0, count: 0 };
    const { taxDue, isExempt } = calculateIRTax(data.sales, data.profit);
    monthly.push({
      year,
      month: m,
      label: `${MONTH_NAMES[m - 1]}/${year}`,
      totalSales: data.sales,
      totalProfit: data.profit,
      taxDue,
      isExempt,
      operationCount: data.count,
    });
  }

  const annual = monthly.reduce(
    (acc, row) => ({
      totalSales: acc.totalSales + row.totalSales,
      totalProfit: acc.totalProfit + row.totalProfit,
      totalTaxDue: acc.totalTaxDue + row.taxDue,
      exemptMonths: acc.exemptMonths + (row.isExempt && row.totalProfit > 0 ? 1 : row.isExempt ? 1 : 0),
      taxableMonths: acc.taxableMonths + (!row.isExempt && row.taxDue > 0 ? 1 : 0),
    }),
    {
      totalSales: 0,
      totalProfit: 0,
      totalTaxDue: 0,
      exemptMonths: 0,
      taxableMonths: 0,
    }
  );

  const now = new Date();
  const currentMonth =
    monthly.find((r) => r.month === now.getMonth() + 1 && r.year === now.getFullYear()) ??
    monthly[now.getMonth()];

  const unrealizedGain = portfolioItems.reduce((s, i) => s + (i.profit_loss ?? 0), 0);
  const portfolioPatrimony = portfolioItems.reduce(
    (s, i) => s + (i.current_value ?? i.quantity * i.average_price),
    0
  );

  return {
    operations: [...operations].sort((a, b) =>
      b.operation_date.localeCompare(a.operation_date)
    ),
    monthly,
    annual: { year, ...annual },
    currentMonth,
    unrealizedGain,
    portfolioPatrimony,
  };
}

export function getDarfDeadline(year: number, month: number): string {
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const lastDay = new Date(nextYear, nextMonth, 0).getDate();
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}
