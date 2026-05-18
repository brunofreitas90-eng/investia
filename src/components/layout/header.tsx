'use client';

import { Bell, Menu, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
}

export function Header({ title, subtitle, onMenuClick }: HeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4 px-4 lg:px-8 py-4 border-b border-white/[0.06] bg-[#0a0a0b]/50 backdrop-blur-xl sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>
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
