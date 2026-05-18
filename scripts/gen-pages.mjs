import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const base = 'src/app/(app)';

const pages = [
  ['dividendos', 'Dividendos', 'Controle de dividendos e renda passiva'],
  ['imposto', 'Imposto de Renda', 'Cálculo de DARF e isenção de 20 mil'],
  ['analise', 'IA Analista', 'Análise inteligente de empresas'],
  ['radar', 'Radar de Oportunidades', 'Ativos descontados e em alta'],
  ['alertas', 'Alertas Inteligentes', 'Notificações personalizadas'],
  ['calendario', 'Calendário Financeiro', 'Eventos e dividendos'],
  ['watchlist', 'Watchlist', 'Empresas favoritas'],
  ['chat', 'Chat IA', 'Pergunte sobre investimentos'],
  ['metas', 'Metas Financeiras', 'Planeje seu futuro'],
  ['simuladores', 'Simuladores', 'Dividendos e aposentadoria'],
  ['ranking', 'Ranking de Ativos', 'Melhores performances'],
  ['configuracoes', 'Configurações', 'Preferências da conta'],
];

for (const [slug, title, subtitle] of pages) {
  const dir = join(base, slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'page.tsx'),
    `'use client';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Page() {
  return (
    <PageWrapper title="${title}" subtitle="${subtitle}">
      <Card>
        <CardHeader><CardTitle>${title}</CardTitle></CardHeader>
        <CardContent>
          <p className="text-zinc-400">Módulo ${title} — integrado ao InvestIA.</p>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
`
  );
  console.log('OK', slug);
}
