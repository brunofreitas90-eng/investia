'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  User,
  Bell,
  Palette,
  Loader2,
  RefreshCw,
  Trash2,
  LogOut,
  Shield,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/hooks/use-settings';
import { clearAllDemoLocalData } from '@/lib/demo-reset';
import { formatDate, cn } from '@/lib/utils';
import type { UserPreferences } from '@/types';
import { toast } from 'sonner';

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer py-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 rounded-full transition-colors shrink-0',
          checked ? 'bg-emerald-500' : 'bg-white/15'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform',
            checked && 'translate-x-5'
          )}
        />
      </button>
    </label>
  );
}

export function SettingsDashboard() {
  const { settings, loading, saving, isDemo, refresh, saveSettings } = useSettings();
  const [fullName, setFullName] = useState('');
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);

  useEffect(() => {
    if (!settings) return;
    setFullName(settings.fullName ?? '');
    setPrefs(settings.preferences);
  }, [settings]);

  const updatePref = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPrefs((p) => (p ? { ...p, [key]: value } : p));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettings({ fullName, preferences: prefs ?? undefined });
  };

  const handleClearDemo = () => {
    if (!confirm('Apagar todos os dados locais do modo demo? Esta ação não pode ser desfeita.')) {
      return;
    }
    clearAllDemoLocalData();
    toast.success('Dados demo apagados. Recarregue a página.');
    refresh();
  };

  if (loading && !settings) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-5 w-5 text-emerald-400" />
            Conta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDemo ? (
            <Badge variant="warning">Modo demonstração</Badge>
          ) : (
            <Badge variant="success">Conta conectada</Badge>
          )}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome"
                disabled={isDemo}
              />
              {isDemo && (
                <p className="text-xs text-zinc-500 mt-1">
                  Crie uma conta para personalizar o perfil.
                </p>
              )}
            </div>
            <div>
              <Label>E-mail</Label>
              <Input value={settings?.email ?? ''} disabled className="opacity-70" />
            </div>
            {settings?.memberSince && !isDemo && (
              <p className="text-xs text-zinc-500">
                Membro desde {formatDate(settings.memberSince)}
              </p>
            )}
            {!isDemo && (
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar perfil'}
              </Button>
            )}
          </form>
          {isDemo && (
            <div className="flex flex-wrap gap-2 pt-2">
              <Button asChild>
                <Link href="/register">Criar conta</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/login">Entrar</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {prefs && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-5 w-5 text-emerald-400" />
              Notificações e exibição
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 divide-y divide-white/[0.06]">
            <ToggleRow
              label="Alertas por e-mail"
              description="Receber avisos de preço e dividendos no e-mail"
              checked={prefs.notifyEmail}
              onChange={(v) => updatePref('notifyEmail', v)}
            />
            <ToggleRow
              label="Notificações no app"
              description="Alertas dentro do InvestIA"
              checked={prefs.notifyApp}
              onChange={(v) => updatePref('notifyApp', v)}
            />
            <ToggleRow
              label="Gráfico de patrimônio no dashboard"
              checked={prefs.showPatrimonyChart}
              onChange={(v) => updatePref('showPatrimonyChart', v)}
            />
            <ToggleRow
              label="Dashboard compacto"
              description="Menos espaçamento entre cards"
              checked={prefs.compactDashboard}
              onChange={(v) => updatePref('compactDashboard', v)}
            />
            <div className="pt-4 space-y-2">
              <Label>Moeda padrão</Label>
              <select
                className="flex h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white"
                value={prefs.defaultCurrency}
                onChange={(e) =>
                  updatePref('defaultCurrency', e.target.value as 'BRL' | 'USD')
                }
              >
                <option value="BRL" className="bg-zinc-900">
                  Real (BRL)
                </option>
                <option value="USD" className="bg-zinc-900">
                  Dólar (USD)
                </option>
              </select>
            </div>
            <div className="pt-4 space-y-2">
              <Label>Perfil de risco padrão (metas)</Label>
              <select
                className="flex h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white"
                value={prefs.defaultRiskProfile}
                onChange={(e) =>
                  updatePref(
                    'defaultRiskProfile',
                    e.target.value as UserPreferences['defaultRiskProfile']
                  )
                }
              >
                <option value="conservative" className="bg-zinc-900">
                  Conservador
                </option>
                <option value="moderate" className="bg-zinc-900">
                  Moderado
                </option>
                <option value="aggressive" className="bg-zinc-900">
                  Arrojado
                </option>
              </select>
            </div>
            <Button
              className="mt-4"
              onClick={() => saveSettings({ preferences: prefs })}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar preferências'}
            </Button>
          </CardContent>
        </Card>
      )}

      {isDemo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-5 w-5 text-amber-400" />
              Modo demo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-zinc-500">
              Os dados da carteira, watchlist, alertas e metas ficam salvos apenas neste
              navegador.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleClearDemo} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Apagar dados locais
              </Button>
              <Button variant="outline" asChild className="gap-2">
                <a href="/api/demo/exit">
                  <ExternalLink className="h-4 w-4" />
                  Sair do demo
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5 text-zinc-400" />
            Sessão
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            <span className="ml-2">Recarregar</span>
          </Button>
          {!isDemo && (
            <form action="/auth/signout" method="post">
              <Button
                type="submit"
                variant="outline"
                className="gap-2 text-red-400 border-red-500/20 hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4" />
                Sair da conta
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
