'use client';

import { useState } from 'react';
import {
  Bell,
  BellRing,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAlerts } from '@/hooks/use-alerts';
import { ALERT_TYPE_OPTIONS, getAlertTypeLabel } from '@/lib/alert-config';
import { popularTickers } from '@/lib/demo-data';
import type { AlertType } from '@/types';
import { cn } from '@/lib/utils';

export function AlertsDashboard() {
  const {
    alerts,
    triggeredCount,
    total,
    loading,
    saving,
    isDemo,
    refresh,
    addAlert,
    toggleAlert,
    removeAlert,
  } = useAlerts();

  const [showForm, setShowForm] = useState(false);
  const [ticker, setTicker] = useState('');
  const [alertType, setAlertType] = useState<AlertType>('price_target');
  const [targetPrice, setTargetPrice] = useState('');
  const [percent, setPercent] = useState('10');
  const [daysBefore, setDaysBefore] = useState('3');

  const typeConfig = ALERT_TYPE_OPTIONS.find((o) => o.value === alertType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const symbol = ticker.toUpperCase().trim();
    if (!symbol) return;

    await addAlert({
      ticker: symbol,
      alert_type: alertType,
      targetPrice: typeConfig?.needsPrice ? parseFloat(targetPrice) : undefined,
      percent: typeConfig?.needsPercent ? parseFloat(percent) : undefined,
      daysBefore: parseInt(daysBefore, 10) || 3,
    });

    setShowForm(false);
    setTicker('');
    setTargetPrice('');
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Bell className="h-8 w-8 text-emerald-400" />
            <div>
              <p className="text-xs text-zinc-500">Alertas ativos</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <BellRing className="h-8 w-8 text-amber-400" />
            <div>
              <p className="text-xs text-zinc-500">Disparados agora</p>
              <p className="text-2xl font-bold text-amber-400">{triggeredCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500">Modo</p>
            <p className="text-sm font-medium mt-1 text-zinc-300">
              {isDemo ? 'Demo (navegador)' : 'Conta logada'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap justify-between gap-3">
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo alerta
        </Button>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          <span className="ml-2">Verificar alertas</span>
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Criar alerta</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Ticker</Label>
                  <Input
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    placeholder="PETR4"
                    required
                  />
                </div>
                <div>
                  <Label>Tipo de alerta</Label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white"
                    value={alertType}
                    onChange={(e) => setAlertType(e.target.value as AlertType)}
                  >
                    {ALERT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {typeConfig && (
                    <p className="text-xs text-zinc-600 mt-1">{typeConfig.description}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {typeConfig?.needsPrice && (
                  <div>
                    <Label>Preço (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value)}
                      required
                    />
                  </div>
                )}
                {typeConfig?.needsPercent && (
                  <div>
                    <Label>Percentual (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={percent}
                      onChange={(e) => setPercent(e.target.value)}
                      required
                    />
                  </div>
                )}
                {(alertType === 'com_date' ||
                  alertType === 'payment' ||
                  alertType === 'dividend') && (
                  <div>
                    <Label>Avisar com antecedência (dias)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={daysBefore}
                      onChange={(e) => setDaysBefore(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {popularTickers.slice(0, 6).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTicker(t)}
                    className="px-2 py-1 text-xs rounded-full bg-white/5 text-zinc-400 hover:text-white"
                  >
                    {t}
                  </button>
                ))}
              </div>

              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar alerta'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto" />
          </CardContent>
        </Card>
      )}

      {!loading && alerts.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center text-zinc-400">
            Nenhum alerta configurado. Crie regras de preço, lucro ou datas de proventos.
          </CardContent>
        </Card>
      )}

      {!loading && alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Card
              key={alert.id}
              className={cn(
                'transition-colors',
                alert.triggered && 'border-amber-500/40 bg-amber-500/5',
                !alert.is_active && 'opacity-60'
              )}
            >
              <CardContent className="p-5 flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-lg">{alert.ticker ?? '—'}</span>
                    <Badge variant="secondary">{getAlertTypeLabel(alert.alert_type)}</Badge>
                    {alert.triggered && (
                      <Badge variant="warning" className="gap-1">
                        <BellRing className="h-3 w-3" />
                        Disparado
                      </Badge>
                    )}
                    {!alert.is_active && <Badge variant="secondary">Pausado</Badge>}
                  </div>
                  <p className="text-sm text-zinc-300">{alert.statusMessage}</p>
                  {alert.currentPrice != null && (
                    <p className="text-xs text-zinc-500">
                      Preço atual: R$ {alert.currentPrice.toFixed(2)}
                    </p>
                  )}
                  {alert.currentPercent != null && (
                    <p className="text-xs text-zinc-500">
                      Resultado na carteira: {alert.currentPercent.toFixed(1)}%
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={saving}
                    onClick={() => toggleAlert(alert.id, !alert.is_active)}
                    title={alert.is_active ? 'Pausar' : 'Ativar'}
                  >
                    {alert.is_active ? (
                      <ToggleRight className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-zinc-500" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={saving}
                    onClick={() => removeAlert(alert.id)}
                  >
                    <Trash2 className="h-4 w-4 text-zinc-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

