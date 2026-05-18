'use client';

import { useState } from 'react';
import { Plus, Trash2, Loader2, RefreshCw, PieChart } from 'lucide-react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { usePortfolio } from '@/hooks/use-portfolio';
import { formatCurrency, formatPercent } from '@/lib/utils';

export default function CarteiraPage() {
  const { items, summary, loading, saving, isDemo, refresh, addItem, removeItem } =
    usePortfolio();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    ticker: '',
    asset_type: 'stock_br',
    quantity: '',
    average_price: '',
    purchase_date: new Date().toISOString().split('T')[0],
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await addItem({
      ticker: form.ticker.toUpperCase(),
      asset_type: form.asset_type as 'stock_br' | 'stock_us' | 'fii' | 'etf' | 'bdr',
      quantity: parseFloat(form.quantity),
      average_price: parseFloat(form.average_price),
      purchase_date: form.purchase_date,
    });
    setShowForm(false);
    setForm({
      ticker: '',
      asset_type: 'stock_br',
      quantity: '',
      average_price: '',
      purchase_date: form.purchase_date,
    });
  };

  const total = summary?.currentValue ?? 0;
  const invested = summary?.totalInvested ?? 0;
  const pl = summary?.totalProfitLoss ?? 0;
  const plPct = summary?.totalProfitLossPercent ?? 0;

  return (
    <PageWrapper
      title="Carteira"
      subtitle={
        isDemo
          ? 'Modo demo — dados salvos no navegador'
          : 'Gerencie seus investimentos com cotações ao vivo'
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-zinc-500">Patrimônio</p>
              <p className="text-2xl font-bold">{formatCurrency(total)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-zinc-500">Investido</p>
              <p className="text-2xl font-bold">{formatCurrency(invested)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-zinc-500">Lucro / Prejuízo</p>
              <p
                className={`text-2xl font-bold ${pl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
              >
                {formatCurrency(pl)}{' '}
                <span className="text-sm font-normal">({formatPercent(plPct)})</span>
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap justify-between items-center gap-3">
          {summary?.allocation && summary.allocation.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center text-sm text-zinc-500">
              <PieChart className="h-4 w-4" />
              {summary.allocation.map((a) => (
                <Badge key={a.type} variant="secondary">
                  {a.type}: {a.percent.toFixed(0)}%
                </Badge>
              ))}
            </div>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => setShowForm(!showForm)} className="gap-2">
              <Plus className="h-4 w-4" /> Adicionar ativo
            </Button>
          </div>
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Novo ativo</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleAdd}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                <div>
                  <Label>Ticker</Label>
                  <Input
                    value={form.ticker}
                    onChange={(e) => setForm({ ...form, ticker: e.target.value })}
                    placeholder="PETR4"
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
                  <Label>Preço médio</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.average_price}
                    onChange={(e) => setForm({ ...form, average_price: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Data compra</Label>
                  <Input
                    type="date"
                    value={form.purchase_date}
                    onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white"
                    value={form.asset_type}
                    onChange={(e) => setForm({ ...form, asset_type: e.target.value })}
                  >
                    <option value="stock_br">Ação BR</option>
                    <option value="stock_us">Ação US</option>
                    <option value="fii">FII</option>
                    <option value="etf">ETF</option>
                    <option value="bdr">BDR</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full" disabled={saving}>
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
              <p className="text-zinc-500 mt-3">Atualizando cotações...</p>
            </CardContent>
          </Card>
        )}

        {!loading && items.length === 0 && (
          <Card>
            <CardContent className="p-10 text-center text-zinc-400">
              Sua carteira está vazia. Adicione o primeiro ativo.
            </CardContent>
          </Card>
        )}

        {!loading && (
          <div className="grid gap-4">
            {items.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex items-center justify-between p-6 gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold">{item.ticker}</span>
                      <Badge variant="secondary">{item.asset_type}</Badge>
                      {item.dividend_yield != null && item.dividend_yield > 0 && (
                        <Badge variant="success">
                          DY {item.dividend_yield.toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500 mt-1">
                      {item.quantity} un · PM {formatCurrency(item.average_price)} · Atual{' '}
                      {formatCurrency(item.current_price ?? item.average_price)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold">
                      {formatCurrency(item.current_value ?? 0)}
                    </p>
                    <p
                      className={
                        (item.profit_loss_percent ?? 0) >= 0
                          ? 'text-emerald-400 text-sm'
                          : 'text-red-400 text-sm'
                      }
                    >
                      {formatPercent(item.profit_loss_percent ?? 0)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={saving}
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4 text-zinc-500" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

