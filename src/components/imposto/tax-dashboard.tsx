'use client';

import { useState } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  AlertCircle,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useTax } from '@/hooks/use-tax';
import {
  calculateIRTax,
  getDarfDeadline,
  IR_EXEMPTION_LIMIT,
} from '@/lib/ir-tax';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function TaxDashboard() {
  const year = new Date().getFullYear();
  const { report, loading, saving, isDemo, refresh, addOperation, removeOperation } =
    useTax(year);

  const [showForm, setShowForm] = useState(false);
  const [manualSales, setManualSales] = useState('');
  const [manualProfit, setManualProfit] = useState('');
  const [form, setForm] = useState({
    ticker: '',
    operation_type: 'sell' as 'buy' | 'sell',
    quantity: '',
    price: '',
    fees: '0',
    operation_date: new Date().toISOString().split('T')[0],
  });

  const cm = report?.currentMonth;
  const manualCalc =
    manualSales || manualProfit
      ? calculateIRTax(
          parseFloat(manualSales) || 0,
          parseFloat(manualProfit) || 0
        )
      : null;

  const handleAddOp = async (e: React.FormEvent) => {
    e.preventDefault();
    await addOperation({
      ticker: form.ticker,
      operation_type: form.operation_type,
      quantity: parseFloat(form.quantity),
      price: parseFloat(form.price),
      fees: parseFloat(form.fees) || 0,
      operation_date: form.operation_date,
    });
    setShowForm(false);
    setForm({
      ticker: '',
      operation_type: 'sell',
      quantity: '',
      price: '',
      fees: '0',
      operation_date: form.operation_date,
    });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500">IR do mês atual</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {formatCurrency(cm?.taxDue ?? 0)}
            </p>
            {cm && (
              <Badge variant={cm.isExempt ? 'success' : 'warning'} className="mt-2">
                {cm.isExempt ? 'Isento' : 'Tributável'}
              </Badge>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500">Vendas no mês</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(cm?.totalSales ?? 0)}</p>
            <p className="text-xs text-zinc-600 mt-1">
              Limite isenção: {formatCurrency(IR_EXEMPTION_LIMIT)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500">IR acumulado {year}</p>
            <p className="text-2xl font-bold mt-1">
              {formatCurrency(report?.annual.totalTaxDue ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Lucro não realizado
            </p>
            <p className="text-lg font-bold mt-1">
              {formatCurrency(report?.unrealizedGain ?? 0)}
            </p>
            <p className="text-xs text-zinc-600">Só tributa ao vender</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </Button>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="h-4 w-4" />
          Registrar operação
        </Button>
      </div>

      {isDemo && (
        <p className="text-xs text-zinc-500">
          Modo demo — operações salvas no navegador.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-400" />
            Simulador rápido (mês)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Vendas no mês (R$)</Label>
              <Input
                type="number"
                value={manualSales}
                onChange={(e) => setManualSales(e.target.value)}
                placeholder={String(cm?.totalSales ?? 15000)}
              />
            </div>
            <div>
              <Label>Lucro tributável (R$)</Label>
              <Input
                type="number"
                value={manualProfit}
                onChange={(e) => setManualProfit(e.target.value)}
                placeholder={String(cm?.totalProfit ?? 3000)}
              />
            </div>
          </div>
          {manualCalc && (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-wrap justify-between gap-3">
              <span>
                DARF estimada:{' '}
                <strong className="text-emerald-400">
                  {formatCurrency(manualCalc.taxDue)}
                </strong>
              </span>
              <Badge variant={manualCalc.isExempt ? 'success' : 'warning'}>
                {manualCalc.isExempt ? 'Isento' : `Alíquota ${(manualCalc.rate * 100).toFixed(0)}%`}
              </Badge>
            </div>
          )}
          <p className="text-xs text-zinc-500 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            Regra simplificada para ações em bolsa (swing trade): vendas até R$ 20.000/mês
            são isentas. Acima disso, 15% sobre o lucro. Day trade: 20%. FIIs e dividendos
            têm regras próprias.
          </p>
        </CardContent>
      </Card>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nova operação</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddOp} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Ticker</Label>
                <Input
                  value={form.ticker}
                  onChange={(e) => setForm({ ...form, ticker: e.target.value.toUpperCase() })}
                  required
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <select
                  className="flex h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white"
                  value={form.operation_type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      operation_type: e.target.value as 'buy' | 'sell',
                    })
                  }
                >
                  <option value="sell">Venda</option>
                  <option value="buy">Compra</option>
                </select>
              </div>
              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  value={form.operation_date}
                  onChange={(e) => setForm({ ...form, operation_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Preço (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Taxas (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.fees}
                  onChange={(e) => setForm({ ...form, fees: e.target.value })}
                />
              </div>
              <div className="md:col-span-3">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
                </Button>
              </div>
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

      {!loading && report && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Resumo mensal {year}
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] text-zinc-500">
                    <th className="text-left py-2 pr-4">Mês</th>
                    <th className="text-right py-2 px-2">Vendas</th>
                    <th className="text-right py-2 px-2">Lucro</th>
                    <th className="text-right py-2 px-2">DARF</th>
                    <th className="text-right py-2 pl-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.monthly.map((row) => (
                    <tr
                      key={row.month}
                      className={cn(
                        'border-b border-white/[0.04]',
                        row.month === new Date().getMonth() + 1 && 'bg-emerald-500/5'
                      )}
                    >
                      <td className="py-2.5 pr-4 font-medium">{row.label}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums">
                        {row.totalSales > 0 ? formatCurrency(row.totalSales) : '—'}
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-emerald-400">
                        {row.totalProfit > 0 ? formatCurrency(row.totalProfit) : '—'}
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums font-semibold">
                        {row.taxDue > 0 ? formatCurrency(row.taxDue) : '—'}
                      </td>
                      <td className="py-2.5 pl-2 text-right">
                        <Badge variant={row.isExempt ? 'success' : row.taxDue > 0 ? 'warning' : 'secondary'}>
                          {row.isExempt ? 'Isento' : row.taxDue > 0 ? 'DARF' : '—'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td className="py-3">Total {year}</td>
                    <td className="py-3 text-right">{formatCurrency(report.annual.totalSales)}</td>
                    <td className="py-3 text-right text-emerald-400">
                      {formatCurrency(report.annual.totalProfit)}
                    </td>
                    <td className="py-3 text-right text-emerald-400">
                      {formatCurrency(report.annual.totalTaxDue)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
              {cm && cm.taxDue > 0 && (
                <p className="text-xs text-zinc-500 mt-4">
                  Prazo DARF mês atual: até{' '}
                  {formatDate(
                    getDarfDeadline(cm.year, cm.month)
                  )}{' '}
                  (último dia útil do mês seguinte — verifique no calendário da Receita).
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Operações registradas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {report.operations.length === 0 ? (
                <p className="text-sm text-zinc-500">Nenhuma operação. Registre compras e vendas.</p>
              ) : (
                report.operations.map((op) => (
                  <div
                    key={op.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-white/[0.06]"
                  >
                    <div>
                      <span className="font-bold">{op.ticker}</span>
                      <Badge variant="secondary" className="ml-2">
                        {op.operation_type === 'sell' ? 'Venda' : 'Compra'}
                      </Badge>
                      <p className="text-xs text-zinc-500 mt-1">
                        {op.quantity} × {formatCurrency(op.price)} · {formatDate(op.operation_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatCurrency(op.total)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={saving}
                        onClick={() => removeOperation(op.id)}
                      >
                        <Trash2 className="h-4 w-4 text-zinc-500" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
