import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppDataBootstrap } from '@/components/app-data-bootstrap';
import { CloudSyncBanner } from '@/components/cloud-sync-banner';
import { DemoModeBanner } from '@/components/demo-mode-banner';
import { PersonalModeBanner } from '@/components/personal-mode-banner';
import { AppShell } from '@/components/layout/app-shell';
import { getAuthUser } from '@/lib/supabase/get-auth-user';

function hasCookieAccess(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  if (cookieStore.get('app_access')?.value === '1') return true;
  if (cookieStore.get('personal_mode')?.value === '1') return true;
  if (cookieStore.get('demo_mode')?.value === '1') return true;
  return false;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const cloudUser = await getAuthUser();

  if (!hasCookieAccess(cookieStore) && !cloudUser) {
    redirect('/login');
  }

  return (
    <AppDataBootstrap>
      <AppShell
        banner={
          <>
            <CloudSyncBanner />
            <PersonalModeBanner />
            <DemoModeBanner />
          </>
        }
      >
        {children}
      </AppShell>
    </AppDataBootstrap>
  );
}
