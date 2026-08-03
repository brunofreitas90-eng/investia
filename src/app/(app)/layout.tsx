import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppDataBootstrap } from '@/components/app-data-bootstrap';
import { DemoModeBanner } from '@/components/demo-mode-banner';
import { PersonalModeBanner } from '@/components/personal-mode-banner';
import { AppShell } from '@/components/layout/app-shell';

function hasAccess(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  if (cookieStore.get('app_access')?.value === '1') return true;
  if (cookieStore.get('personal_mode')?.value === '1') return true;
  if (cookieStore.get('demo_mode')?.value === '1') return true;
  return false;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  if (!hasAccess(cookieStore)) {
    redirect('/login');
  }

  return (
    <AppDataBootstrap>
      <AppShell banner={<><PersonalModeBanner /><DemoModeBanner /></>}>
        {children}
      </AppShell>
    </AppDataBootstrap>
  );
}
