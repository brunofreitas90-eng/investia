'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TrendingUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('auth_callback_failed')) {
      toast.error('Falha na autenticação. Tente novamente.');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
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
        toast.error('Não foi possível iniciar a sessão. Tente novamente.');
        return;
      }

      toast.success('Login realizado!');
      router.refresh();
      // Navegação completa garante que o middleware leia os cookies
      window.location.href = '/dashboard';
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao conectar. Verifique sua internet.';
      toast.error(message);
      console.error('[login]', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        toast.error('Google Login não configurado. Use email e senha.');
      }
    } catch {
      toast.error('Erro ao abrir login com Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050506] grid-bg p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="inline-flex items-center justify-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-black" />
            </div>
            <span className="text-2xl font-bold text-white">
              Invest<span className="text-emerald-400">IA</span>
            </span>
          </Link>
          <CardTitle>Bem-vindo de volta</CardTitle>
          <CardDescription>Entre na sua conta para continuar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="secondary"
            className="w-full"
            onClick={handleGoogle}
            type="button"
            disabled={loading}
          >
            Continuar com Google
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <span className="relative flex justify-center text-xs text-zinc-500 px-2">
              ou email
            </span>
          </div>
          <form onSubmit={handleLogin} className="space-y-4" noValidate>
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
              <Label htmlFor="password">Senha</Label>
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
                'Entrar'
              )}
            </Button>
          </form>
          <p className="text-center text-sm text-zinc-500">
            Não tem conta?{' '}
            <Link href="/register" className="text-emerald-400 hover:underline">
              Cadastre-se
            </Link>
          </p>
          <Link
            href="/api/demo/start"
            className="block text-center text-sm text-zinc-600 hover:text-zinc-400"
          >
            Continuar em modo demo →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
