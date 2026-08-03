'use client';

import { Bell, Menu, Search } from 'lucide-react';
import { AppBrand } from '@/components/app-brand';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMobileNav } from '@/components/layout/mobile-nav-context';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
}

export function Header({ title, subtitle, onMenuClick }: HeaderProps) {
  const mobileNav = useMobileNav();

  const openMenu = () => {
    if (onMenuClick) {
      onMenuClick();
      return;
    }
    mobileNav?.setOpen(true);
  };

  return (
    <header className="flex items-center justify-between gap-4 px-4 lg:px-8 py-4 border-b border-white/[0.06] bg-[#0a0a0b]/50 backdrop-blur-xl sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="lg:hidden shrink-0"
          aria-label="Abrir menu"
          onClick={openMenu}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <AppBrand href="/dashboard" variant="mark" className="lg:hidden" />
        <div>
          <h1 className="text-xl font-semibold text-white">{title}</h1>
          {subtitle && <p className="text-sm text-zinc-500">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden md:block relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input placeholder="Buscar ativo..." className="pl-9 w-64" />
        </div>
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
