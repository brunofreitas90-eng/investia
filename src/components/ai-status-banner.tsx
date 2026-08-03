'use client';

import { useEffect, useState } from 'react';
import { Sparkles, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Health = { openai?: boolean };

export function AiStatusBanner() {
  const [openai, setOpenai] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/health', { cache: 'no-store' })
      .then((r) => r.json())
      .then((h: Health) => setOpenai(h.openai === true))
      .catch(() => setOpenai(false));
  }, []);

  if (openai !== false) return null;

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardContent className="p-4 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <Sparkles className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-medium text-amber-200">IA completa ainda não configurada</p>
            <p className="text-zinc-400 leading-relaxed">
              Com a chave OpenAI, o Chat, Assessor e Análise passam a usar o consultor inteligente
              (recomendações mais detalhadas e explicações passo a passo). Sem a chave, o app usa
              regras automáticas — funciona, mas com menos profundidade.
            </p>
            <ol className="text-zinc-500 text-xs space-y-1 list-decimal list-inside">
              <li>
                Crie a chave em{' '}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:underline"
                >
                  platform.openai.com/api-keys
                </a>
              </li>
              <li>
                No PowerShell, na pasta do projeto:{' '}
                <code className="text-amber-400/90 bg-black/30 px-1 rounded block mt-1">
                  .\scripts\setup-openai-vercel.ps1 -ApiKey &quot;sk-...&quot;
                </code>
              </li>
              <li>
                Confirme em{' '}
                <a
                  href="https://investia-nu.vercel.app/api/health"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:underline"
                >
                  investia-nu.vercel.app/api/health
                </a>{' '}
                → deve mostrar <code className="text-emerald-400">&quot;openai&quot;: true</code>
              </li>
            </ol>
          </div>
        </div>
        <Button variant="outline" size="sm" className="shrink-0" asChild>
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
          >
            Criar chave OpenAI
            <ExternalLink className="h-3.5 w-3.5 ml-1" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
