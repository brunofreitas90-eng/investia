'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Radar, RefreshCw, Sparkles, Cpu } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OpportunityCard } from '@/components/radar/opportunity-card';
import { OPPORTUNITY_TYPE_LABELS } from '@/lib/radar-rules';
import type { Opportunity, OpportunityType } from '@/types';
import type { RadarScanResult, RadarSource } from '@/services/radar/scan';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const SOURCE_OPTIONS: { value: RadarSource; label: string }[] = [
  { value: 'all', label: 'Todos os ativos' },
  { value: 'popular', label: 'Mais negociados' },
  { value: 'portfolio', label: 'Minha carteira' },
];

const TYPE_FILTERS: { value: OpportunityType | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  ...(
    Object.entries(OPPORTUNITY_TYPE_LABELS) as [OpportunityType, string][]
  ).map(([value, label]) => ({ value, label })),
];

export function RadarDashboard() {
  const [source, setSource] = useState<RadarSource>('all');
  const [typeFilter, setTypeFilter] = useState<OpportunityType | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<RadarScanResult | null>(null);

  const scan = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ source, type: typeFilter });
      const res = await fetch(`/api/radar/opportunities?${params}`);
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Erro ao escanear mercado');
        return;
      }

      setResult(data);
    } catch {
      toast.error('Falha na conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [source, typeFilter]);

  useEffect(() => {
    scan();
  }, [scan]);

  const opportunities: Opportunity[] = result?.opportunities ?? [];

  return (
    <div className="space-y-6 max-w-5xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Radar className="h-5 w-5 text-emerald-400" />
            Configuração do scan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="text-xs text-zinc-500 mb-2">Universo de ativos</p>
            <div className="flex flex-wrap gap-2">
              {SOURCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSource(opt.value)}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-lg border transition-colors',
                    source === opt.value
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-white/[0.02] border-white/[0.08] text-zinc-400 hover:text-white'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-zinc-500 mb-2">Tipo de oportunidade</p>
            <div className="flex flex-wrap gap-2">
              {TYPE_FILTERS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTypeFilter(opt.value)}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-lg border transition-colors',
                    typeFilter === opt.value
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-white/[0.02] border-white/[0.08] text-zinc-400 hover:text-white'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            {result && (
              <p className="text-xs text-zinc-500 flex items-center gap-2">
                {result.mode === 'ai' ? (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                    Análise com IA · {result.scannedCount} ativos escaneados
                  </>
                ) : (
                  <>
                    <Cpu className="h-3.5 w-3.5 text-zinc-400" />
                    Regras automáticas · {result.scannedCount} ativos escaneados
                  </>
                )}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={scan}
              disabled={loading}
              className="gap-2 ml-auto"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Atualizar radar
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto mb-4" />
            <p className="text-zinc-400">
              Buscando cotações e cruzando indicadores...
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && opportunities.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center">
            <Radar className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400">
              Nenhuma oportunidade encontrada com os filtros atuais.
            </p>
            <p className="text-sm text-zinc-600 mt-1">
              Tente outro tipo ou amplie o universo de ativos.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && opportunities.length > 0 && (
        <div className="grid gap-4">
          {opportunities.map((opp) => (
            <OpportunityCard key={`${opp.ticker}-${opp.type}`} opportunity={opp} />
          ))}
        </div>
      )}
    </div>
  );
}

