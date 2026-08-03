'use client';

import Link from 'next/link';
import { Calculator, TrendingUp, PiggyBank } from 'lucide-react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const tools = [
  {
    href: '/juros-compostos',
    title: 'Juros Compostos',
    description: 'Simule montante final com aportes mensais e diferentes taxas de capitalização.',
    icon: Calculator,
    featured: true,
  },
  {
    href: '/renda-mensal',
    title: 'Renda Mensal',
    description: 'Simule capital e carteira para atingir sua meta de dividendos por mês.',
    icon: PiggyBank,
    featured: true,
  },
  {
    href: '/dividendos',
    title: 'Dividendos',
    description: 'Histórico completo, gráficos e proventos da carteira.',
    icon: TrendingUp,
    featured: false,
  },
  {
    href: '/metas',
    title: 'Metas Financeiras',
    description: 'Planeje objetivos e acompanhe o progresso dos seus investimentos.',
    icon: TrendingUp,
    featured: false,
  },
];

export default function SimuladoresPage() {
  return (
    <PageWrapper title="Simuladores" subtitle="Ferramentas para planejar seu futuro financeiro">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl">
        {tools.map((tool) => (
          <Card
            key={tool.href}
            className={tool.featured ? 'border-emerald-500/30 bg-emerald-500/5' : undefined}
          >
            <CardHeader>
              <tool.icon className={`h-8 w-8 mb-2 ${tool.featured ? 'text-emerald-400' : 'text-zinc-500'}`} />
              <CardTitle className="text-lg">{tool.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-zinc-400">{tool.description}</p>
              <Link href={tool.href}>
                <Button variant={tool.featured ? 'default' : 'secondary'} className="w-full">
                  Abrir calculadora
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageWrapper>
  );
}
