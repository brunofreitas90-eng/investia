'use client';

import Link from 'next/link';
import {
  TrendingDown,
  TrendingUp,
  Coins,
  Sprout,
  Flame,
  Moon,
  ArrowRight,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  OPPORTUNITY_TYPE_LABELS,
  OPPORTUNITY_TYPE_DESCRIPTIONS,
} from '@/lib/radar-rules';
import { cn, formatCurrency, formatPercent } from '@/lib/utils';
import type { Opportunity, OpportunityType } from '@/types';

const TYPE_ICONS: Record<OpportunityType, typeof TrendingUp> = {
  discounted: TrendingDown,
  high_dividend: Coins,
  growth: Sprout,
  trending: Flame,
  forgotten: Moon,
};

const TYPE_VARIANTS: Record<
  OpportunityType,
  'success' | 'warning' | 'secondary' | 'danger'
> = {
  discounted: 'warning',
  high_dividend: 'success',
  growth: 'success',
  trending: 'success',
  forgotten: 'secondary',
};

function scoreColor(score: number) {
  if (score >= 75) return 'text-emerald-400';
  if (score >= 60) return 'text-lime-400';
  if (score >= 45) return 'text-amber-400';
  return 'text-zinc-400';
}

export function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  const Icon = TYPE_ICONS[opportunity.type];
  const price = Number(opportunity.metrics.price ?? 0);
  const currency = (opportunity.metrics.currency as 'BRL' | 'USD') || 'BRL';
  const change = Number(opportunity.metrics.changePercent ?? 0);
  const yield_ = opportunity.metrics.dividendYield;
  const pe = opportunity.metrics.pe;

  return (
    <Card className="group hover:border-emerald-500/30 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="font-semibold text-white text-lg">{opportunity.ticker}</h3>
              {opportunity.name && (
                <span className="text-sm text-zinc-500 truncate">{opportunity.name}</span>
              )}
            </div>
            <Badge variant={TYPE_VARIANTS[opportunity.type]} className="gap-1 mb-3">
              <Icon className="h-3 w-3" />
              {OPPORTUNITY_TYPE_LABELS[opportunity.type]}
            </Badge>
            <p className="text-sm text-zinc-300 leading-relaxed">{opportunity.reason}</p>
            <p className="text-xs text-zinc-600 mt-1">
              {OPPORTUNITY_TYPE_DESCRIPTIONS[opportunity.type]}
            </p>
          </div>
          <div className="text-center shrink-0">
            <p
              className={cn(
                'text-3xl font-bold tabular-nums',
                scoreColor(opportunity.score)
              )}
            >
              {opportunity.score}
            </p>
            <span className="text-xs text-zinc-500">score</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/[0.06]">
          {price > 0 && (
            <Metric label="Preço" value={formatCurrency(price, currency)} />
          )}
          <Metric
            label="Variação"
            value={formatPercent(change)}
            valueClass={change >= 0 ? 'text-emerald-400' : 'text-red-400'}
          />
          {yield_ != null && (
            <Metric label="Yield" value={`${Number(yield_).toFixed(1)}%`} />
          )}
          {pe != null && <Metric label="P/L" value={Number(pe).toFixed(1)} />}
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="sm" asChild className="gap-1.5">
            <Link href={`/analise?ticker=${opportunity.ticker}`}>
              <BarChart3 className="h-3.5 w-3.5" />
              Análise completa
              <ArrowRight className="h-3.5 w-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={cn('text-sm font-medium text-zinc-200', valueClass)}>{value}</p>
    </div>
  );
}
