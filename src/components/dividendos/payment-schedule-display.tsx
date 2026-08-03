'use client';

import { CalendarDays } from 'lucide-react';
import { MONTH_LABELS } from '@/lib/payment-schedule';
import { cn } from '@/lib/utils';

export interface PaymentScheduleDisplayProps {
  frequency: string;
  paymentsPerYear: number;
  paymentsLast12m?: number;
  typicalMonths: string[] | number[];
  scheduleSummary?: string;
  compact?: boolean;
}

function monthLabel(m: string | number): string {
  if (typeof m === 'string') return m;
  return MONTH_LABELS[m - 1] ?? '';
}

function monthNumber(m: string | number, index: number): number {
  if (typeof m === 'number') return m;
  const idx = MONTH_LABELS.indexOf(m as (typeof MONTH_LABELS)[number]);
  return idx >= 0 ? idx + 1 : index + 1;
}

export function PaymentScheduleDisplay({
  frequency,
  paymentsPerYear,
  paymentsLast12m,
  typicalMonths,
  scheduleSummary,
  compact = false,
}: PaymentScheduleDisplayProps) {
  const activeMonths = new Set(typicalMonths.map((m, i) => monthNumber(m, i)));

  return (
    <div className={cn('space-y-3', compact && 'space-y-2')}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
          <CalendarDays className="h-4 w-4" />
          {frequency}
        </span>
        <span className="text-zinc-500">·</span>
        <span className="text-zinc-300">
          <strong className="text-white">{paymentsPerYear}x</strong>/ano
        </span>
        {paymentsLast12m != null && (
          <>
            <span className="text-zinc-500">·</span>
            <span className="text-zinc-500 text-xs">
              {paymentsLast12m} pagamento{paymentsLast12m !== 1 ? 's' : ''} nos últimos 12m
            </span>
          </>
        )}
      </div>

      {scheduleSummary && !compact && (
        <p className="text-sm text-zinc-400">{scheduleSummary}</p>
      )}

      <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
        {MONTH_LABELS.map((label, i) => {
          const monthNum = i + 1;
          const active =
            activeMonths.has(monthNum) ||
            typicalMonths.some((m) => monthLabel(m) === label);
          return (
            <div
              key={label}
              title={active ? `${label} — mês típico de pagamento` : label}
              className={cn(
                'text-center rounded-md py-1.5 text-[10px] sm:text-xs font-medium transition-colors',
                active
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-white/[0.03] text-zinc-600 border border-white/[0.04]'
              )}
            >
              {label}
            </div>
          );
        })}
      </div>

      {typicalMonths.length > 0 && (
        <p className="text-xs text-zinc-500">
          Meses em destaque: {typicalMonths.map(monthLabel).join(', ')}
        </p>
      )}
    </div>
  );
}
