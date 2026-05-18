'use client';

import { Header } from './header';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { cn } from '@/lib/utils';

interface PageWrapperProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function PageWrapper({ title, subtitle, children }: PageWrapperProps) {
  const { preferences } = useUserPreferences();

  return (
    <>
      <Header title={title} subtitle={subtitle} />
      <div
        className={cn(
          'flex-1 overflow-auto',
          preferences.compactDashboard ? 'p-3 lg:p-5' : 'p-4 lg:p-8'
        )}
      >
        {children}
      </div>
    </>
  );
}
