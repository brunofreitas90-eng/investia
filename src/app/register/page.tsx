'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
        const msg =
          error.message.includes('Database error')
            ? 'Erro no banco ao criar conta. Tente novamente ou use outro email.'
            : error.message.includes('already registered')
              ? 'Este email já está cadastrado. Faça login.'
              : error.message;
        toast.error(msg);
        return;
      }

      if (data.session) {
        toast.success('Conta criada com sucesso!');
        router.refresh();
        window.location.href = '/dashboard';
      } else {
        toast.success('Conta criada! Faça login com seu email e senha.');
        window.location.href = '/login';
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar conta.';
      toast.error(message);
      console.error('[register]', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050506] grid-bg p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Criar conta</CardTitle>
          <CardDescription>Comece a investir com inteligência</CardDescription>
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
                'Criar conta'
              )}
            </Button>
          </form>
          <p className="text-center text-sm text-zinc-500 mt-4">
            Já tem conta?{' '}
            <Link href="/login" className="text-emerald-400 hover:underline">
              Entrar
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
