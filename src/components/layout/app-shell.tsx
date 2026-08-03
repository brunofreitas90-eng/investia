'use client';

import { cn } from '@/lib/utils';
import { MobileNavProvider, useMobileNav } from './mobile-nav-context';
import { Sidebar } from './sidebar';

function MobileDrawer() {
  const nav = useMobileNav();
  if (!nav) return null;

  return (
    <>
      {nav.open && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => nav.setOpen(false)}
        />
      )}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 lg:hidden transition-transform duration-200 ease-out',
          nav.open ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        )}
      >
        <Sidebar
          className="flex h-full w-64 shadow-2xl"
          onNavigate={() => nav.setOpen(false)}
        />
      </div>
    </>
  );
}

export function AppShell({
  children,
  banner,
}: {
  children: React.ReactNode;
  banner?: React.ReactNode;
}) {
  return (
    <MobileNavProvider>
      <div className="flex min-h-screen bg-[#050506]">
        <Sidebar />
        <MobileDrawer />
        <main className="flex flex-1 flex-col min-w-0 overflow-hidden">
          {banner}
          {children}
        </main>
      </div>
    </MobileNavProvider>
  );
}
