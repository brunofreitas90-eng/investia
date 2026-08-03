'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AppBrand } from '@/components/app-brand';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient, isAuthClientAvailable } from '@/lib/supabase/client';
import { hasLocalPersonalData } from '@/lib/migrate-personal-to-cloud';

export default function RegisterPage() {
  const upgrade = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('upgrade') === '1';
  }, []);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isAuthClientAvailable()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050506] p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Nuvem indisponível</CardTitle>
            <CardDescription>
              Configure o Supabase para criar conta sincronizada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/login">Voltar ao login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || password.length < 6) {
      toast.error('Email obrigatório e senha com mínimo 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name } },
      });

      if (error) {
        const msg = error.message.includes('already registered')
          ? 'Este email já está cadastrado. Faça login.'
          : error.message;
        toast.error(msg);
        return;
      }

      if (data.session) {
        await fetch('/api/auth/enter-cloud', { method: 'POST' });
        const keepLocal = hasLocalPersonalData();
        toast.success(
          keepLocal
            ? 'Conta criada! Em seguida sincronize os dados deste aparelho.'
            : 'Conta criada com sucesso!'
        );
        window.location.href = '/dashboard';
        return;
      }

      toast.success('Conta criada! Faça login com seu email e senha.');
      window.location.href = upgrade ? '/login?upgrade=1' : '/login';
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Erro ao criar conta.';
      const message =
        /failed to fetch|networkerror|load failed/i.test(raw)
          ? 'Não foi possível conectar ao Supabase. O projeto pode estar pausado — reative em supabase.com/dashboard e tente de novo.'
          : raw;
      toast.error(message);
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
          <CardTitle>{upgrade ? 'Criar conta na nuvem' : 'Criar conta'}</CardTitle>
          <CardDescription>
            {upgrade
              ? 'Seus dados deste aparelho serão mantidos e poderão ser sincronizados em seguida.'
              : 'Mesma carteira no celular e no PC'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar conta na nuvem'
              )}
            </Button>
          </form>
          <p className="text-center text-sm text-zinc-500 mt-4">
            Já tem conta?{' '}
            <Link
              href={upgrade ? '/login?upgrade=1' : '/login'}
              className="text-emerald-400 hover:underline"
            >
              Entrar
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
