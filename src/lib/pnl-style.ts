import { cn } from '@/lib/utils';

/** Estilos visuais: verde = positivo, vermelho = negativo */
export function pnlText(value: number, neutral = 0): string {
  if (value > neutral) return 'text-emerald-400';
  if (value < neutral) return 'text-red-400';
  return 'text-zinc-400';
}

export function pnlBg(value: number, neutral = 0): string {
  if (value > neutral) return 'bg-emerald-500/10 border-emerald-500/25';
  if (value < neutral) return 'bg-red-500/10 border-red-500/25';
  return 'bg-white/[0.03] border-white/[0.06]';
}

export function pnlRowAccent(value: number): string {
  if (value > 0) return 'border-l-2 border-l-emerald-500/60';
  if (value < 0) return 'border-l-2 border-l-red-500/60';
  return 'border-l-2 border-l-zinc-700';
}

export function priceVsAverageClass(current: number, average: number): string {
  if (current > average) return 'text-emerald-400';
  if (current < average) return 'text-red-400';
  return 'text-zinc-300';
}

export function dyClass(dy?: number | null): string {
  if (dy == null || dy <= 0) return 'text-zinc-500';
  if (dy >= 6) return 'text-emerald-400 font-medium';
  if (dy >= 3) return 'text-emerald-400/80';
  return 'text-zinc-300';
}

export function pnlPillClass(value: number): string {
  return cn(
    'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums',
    value >= 0
      ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
      : 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30'
  );
}
