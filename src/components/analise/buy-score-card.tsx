'use client';

import { motion } from 'framer-motion';
import { ShoppingCart, Minus, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CompanyAnalysis } from '@/types';

const LABEL_CONFIG = {
  compra_forte: { label: 'Compra forte', variant: 'success' as const, icon: ShoppingCart },
  compra: { label: 'Compra', variant: 'success' as const, icon: ShoppingCart },
  neutro: { label: 'Neutro', variant: 'secondary' as const, icon: Minus },
  cautela: { label: 'Cautela', variant: 'warning' as const, icon: AlertTriangle },
  evitar: { label: 'Evitar compra', variant: 'danger' as const, icon: AlertTriangle },
};

export function BuyScoreCard({ analysis }: { analysis: CompanyAnalysis }) {
  const score = analysis.buyScore ?? analysis.score / 10;
  const config = LABEL_CONFIG[analysis.buyRecommendationLabel ?? 'neutro'];
  const Icon = config.icon;
  const percent = (score / 10) * 100;
  const scoreColor = score >= 8 ? 'text-emerald-400' : score >= 6 ? 'text-lime-400' : score >= 4 ? 'text-amber-400' : 'text-red-400';
  const barColor = score >= 8 ? 'bg-emerald-500' : score >= 6 ? 'bg-lime-500' : score >= 4 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <Card className="overflow-hidden border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
      <CardContent className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
            <p className={cn('text-6xl md:text-7xl font-bold tabular-nums', scoreColor)}>{score.toFixed(1)}</p>
            <span className="text-sm text-zinc-500 mt-1">de 10</span>
            <div className="w-32 h-2 rounded-full bg-white/10 mt-4 overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ duration: 0.8 }} className={cn('h-full rounded-full', barColor)} />
            </div>
          </motion.div>
          <div className="flex-1 text-center md:text-left space-y-3">
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              <Badge variant={config.variant} className="gap-1"><Icon className="h-3.5 w-3.5" />{config.label}</Badge>
              <Badge variant="secondary">{analysis.recommendation === 'buy' ? 'Recomendado comprar' : analysis.recommendation === 'sell' ? 'Nao recomendado' : 'Aguardar'}</Badge>
            </div>
            <h3 className="text-xl font-semibold text-white">Recomendacao de compra</h3>
            <p className="text-zinc-300">{analysis.buyRecommendation}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
