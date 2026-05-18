import type { PortfolioItem } from '@/types';

export interface PatrimonyChartPoint {
  date: string;
  value: number;
}

/** Série simplificada: aportes por mês de compra + patrimônio atual */
export function buildPatrimonyChartFromPortfolio(
  items: PortfolioItem[],
  currentValue: number
): PatrimonyChartPoint[] {
  if (items.length === 0) {
    return [{ date: new Date().toISOString().slice(0, 7), value: currentValue }];
  }

  const byMonth = new Map<string, number>();

  for (const item of items) {
    const month = item.purchase_date.slice(0, 7);
    const invested = item.quantity * item.average_price;
    byMonth.set(month, (byMonth.get(month) ?? 0) + invested);
  }

  const months = [...byMonth.keys()].sort();
  const points: PatrimonyChartPoint[] = [];
  let cumulative = 0;

  for (const month of months) {
    cumulative += byMonth.get(month) ?? 0;
    points.push({ date: month, value: Math.round(cumulative) });
  }

  const today = new Date().toISOString().slice(0, 7);
  const last = points[points.length - 1];
  if (!last || last.date !== today) {
    points.push({ date: today, value: Math.round(currentValue) });
  } else {
    last.value = Math.round(currentValue);
  }

  return points.length >= 2
    ? points
    : [
        { date: months[0] ?? today, value: Math.round(cumulative || currentValue) },
        { date: today, value: Math.round(currentValue) },
      ];
}
