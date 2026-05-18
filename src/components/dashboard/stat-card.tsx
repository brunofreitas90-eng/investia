'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn, formatCurrency, formatPercent } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number;
  format?: 'currency' | 'percent' | 'number';
  change?: number;
  icon: LucideIcon;
  currency?: 'BRL' | 'USD';
}

export function StatCard({
  title,
  value,
  format = 'currency',
  change,
  icon: Icon,
  currency = 'BRL',
}: StatCardProps) {
  const display =
    format === 'currency'
      ? formatCurrency(value, currency)
      : format === 'percent'
        ? formatPercent(value)
        : value.toLocaleString('pt-BR');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-500">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{display}</p>
          {change !== undefined && (
            <p
              className={cn(
                'text-sm mt-1 font-medium',
                change >= 0 ? 'text-emerald-400' : 'text-red-400'
              )}
            >
              {formatPercent(change)}
            </p>
          )}
        </div>
        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-emerald-400" />
        </div>
      </div>
    </motion.div>
  );
}
