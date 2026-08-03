'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AppBrand } from '@/components/app-brand';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { isAuthClientAvailable, createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type Tab = 'cloud' | 'device';

async function enterCloudMode() {
  await fetch('/api/auth/enter-cloud', { method: 'POST' });
}

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>('cloud');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [devicePassword, setDevicePassword] = useState('');
  const [loading, setLoading] = useState(false);
  const cloudAvailable = isAuthClientAvailable();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('auth_callback_failed')) {
      toast.error('Falha na autenticação. Tente novamente.');
    }
    if (!cloudAvailable) setTab('device');
  }, [cloudAvailable]);

  const handleCloudLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error('Preencha email e senha.');
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        toast.error(
          error.message === 'Invalid login credentials'
            ? 'Email ou senha incorretos.'
            : error.message
        );
        return;
      }
      if (!data.session) {
        toast.error('Não foi possível iniciar a sessão.');
        return;
      }
      await enterCloudMode();
      toast.success('Login na nuvem realizado!');
      window.location.href = '/dashboard';
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao conectar.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devicePassword) {
      toast.error('Digite a senha de acesso.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: devicePassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Senha incorreta.');
        return;
      }
      toast.success('Acesso liberado neste aparelho.');
      window.location.href = '/dashboard';
    } catch {
      toast.error('Erro ao conectar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050506] grid-bg p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AppBrand href="/" width={200} priority />
          </div>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>
            Conta na nuvem sincroniza celular e PC. Senha do aparelho fica só neste navegador.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex rounded-lg border border-white/10 p-1">
            <button
              type="button"
              disabled={!cloudAvailable}
              onClick={() => setTab('cloud')}
              className={cn(
                'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                tab === 'cloud'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'text-zinc-400 hover:text-white'
              )}
            >
              Nuvem
            </button>
            <button
              type="button"
              onClick={() => setTab('device')}
              className={cn(
                'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                tab === 'device'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'text-zinc-400 hover:text-white'
              )}
            >
              Este aparelho
            </button>
          </div>

          {tab === 'cloud' && cloudAvailable ? (
            <>
              <form onSubmit={handleCloudLogin} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha da conta</Label>
                  <PasswordInput
                    id="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar na nuvem'
                  )}
                </Button>
              </form>
              <p className="text-center text-sm text-zinc-500">
                Não tem conta?{' '}
                <Link href="/register" className="text-emerald-400 hover:underline">
                  Criar conta
                </Link>
              </p>
            </>
          ) : (
            <form onSubmit={handleDeviceLogin} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="device-password">Senha de acesso</Label>
                <PasswordInput
                  id="device-password"
                  autoComplete="current-password"
                  value={devicePassword}
                  onChange={(e) => setDevicePassword(e.target.value)}
                  placeholder="Senha de acesso"
                  disabled={loading}
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar neste aparelho'
                )}
              </Button>
              <p className="text-xs text-zinc-500 text-center">
                Os dados ficam só neste navegador. Para sincronizar com o PC, use a aba Nuvem.
              </p>
            </form>
          )}

          <p className="text-center text-xs text-zinc-600">
            <Link href="/" className="hover:text-zinc-400">
              Voltar ao início
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
