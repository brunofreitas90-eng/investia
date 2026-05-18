'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { cn } from '@/lib/utils';

interface DashboardShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function DashboardShell({ children, title, subtitle }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#050506]">
      <Sidebar />
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 lg:hidden transition-transform',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Sidebar />
      </div>
      <main className="flex-1 flex flex-col min-w-0">
        <Header title={title} subtitle={subtitle} onMenuClick={() => setMobileOpen(true)} />
        <div className="flex-1 p-4 lg:p-8 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
