'use client';



import { useState } from 'react';

import Link from 'next/link';

import { Loader2 } from 'lucide-react';

import { toast } from 'sonner';

import { AppBrand } from '@/components/app-brand';

import { Button } from '@/components/ui/button';

import { PasswordInput } from '@/components/ui/password-input';

import { Label } from '@/components/ui/label';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';



export default function LoginPage() {

  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);



  const handleLogin = async (e: React.FormEvent) => {

    e.preventDefault();



    if (!password) {

      toast.error('Digite a senha de acesso.');

      return;

    }



    setLoading(true);



    try {

      const res = await fetch('/api/auth/login', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ password }),

      });

      const data = await res.json();



      if (!res.ok) {

        toast.error(data.error || 'Senha incorreta.');

        return;

      }



      toast.success('Acesso liberado!');

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

          <CardTitle>Acesso privado</CardTitle>

          <CardDescription>Digite a senha para entrar no DelfoInvestIA</CardDescription>

        </CardHeader>

        <CardContent className="space-y-4">

          <form onSubmit={handleLogin} className="space-y-4" noValidate>

            <div className="space-y-2">

              <Label htmlFor="password">Senha</Label>

              <PasswordInput

                id="password"

                autoComplete="current-password"

                value={password}

                onChange={(e) => setPassword(e.target.value)}

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

                'Entrar'

              )}

            </Button>

          </form>

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

