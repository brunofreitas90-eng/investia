'use client';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { SettingsDashboard } from '@/components/configuracoes/settings-dashboard';

export default function ConfiguracoesPage() {
  return (
    <PageWrapper title="Configurações" subtitle="Perfil, preferências e conta">
      <SettingsDashboard />
    </PageWrapper>
  );
}
