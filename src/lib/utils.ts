import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  value: number,
  currency: 'BRL' | 'USD' = 'BRL'
): string {
  return new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number, decimals = 2): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/** Porcentagem exata com 2 casas decimais, sem sinal + */
export function formatPercentExact(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatDateBR(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date + 'T12:00:00') : date;
  return new Intl.DateTimeFormat('pt-BR').format(d);
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
}

export function isBrazilianTicker(ticker: string): boolean {
  return /^[A-Z]{4}[0-9]{1,2}$/.test(ticker.toUpperCase()) ||
    ticker.toUpperCase().endsWith('11') ||
    ticker.toUpperCase().endsWith('34');
}

export function normalizeTicker(ticker: string): string {
  return ticker.toUpperCase().trim();
}

export function calculateProfitLoss(
  quantity: number,
  averagePrice: number,
  currentPrice: number
): { value: number; percent: number } {
  const invested = quantity * averagePrice;
  const current = quantity * currentPrice;
  const value = current - invested;
  const percent = invested > 0 ? (value / invested) * 100 : 0;
  return { value, percent };
}

export function calculateDividendYield(
  annualDividend: number,
  price: number
): number {
  if (!price || price <= 0) return 0;
  return (annualDividend / price) * 100;
}

export {
  calculateIRTax,
  IR_EXEMPTION_LIMIT,
  IR_SWING_RATE,
  IR_DAYTRADE_RATE,
} from './ir-tax';

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}
