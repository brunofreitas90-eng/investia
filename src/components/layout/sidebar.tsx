'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Wallet,
  Coins,
  FileText,
  Brain,
  Radar,
  Bell,
  Calendar,
  Star,
  MessageSquare,
  Target,
  Calculator,
  PiggyBank,
  TrendingUp,
  Settings,
  LogOut,
  Building2,
} from 'lucide-react';
import { AppBrand } from '@/components/app-brand';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/carteira', label: 'Carteira', icon: Wallet },
  { href: '/dividendos', label: 'Dividendos', icon: Coins },
  { href: '/setores', label: 'Ranking Setores', icon: Building2 },
  { href: '/imposto', label: 'Imposto de Renda', icon: FileText },
  { href: '/analise', label: 'IA Analista', icon: Brain },
  { href: '/assessoria', label: 'Assessor IA', icon: TrendingUp },
  { href: '/radar', label: 'Oportunidades', icon: Radar },
  { href: '/renda-mensal', label: 'Renda Mensal', icon: PiggyBank },
  { href: '/alertas', label: 'Alertas', icon: Bell },
  { href: '/calendario', label: 'Calendário', icon: Calendar },
  { href: '/watchlist', label: 'Watchlist', icon: Star },
  { href: '/chat', label: 'Chat IA', icon: MessageSquare },
  { href: '/metas', label: 'Metas', icon: Target },
  { href: '/juros-compostos', label: 'Juros Compostos', icon: Calculator },
  { href: '/simuladores', label: 'Simuladores', icon: Calculator },
  { href: '/ranking', label: 'Ranking', icon: TrendingUp },
];

type SidebarProps = {
  className?: string;
  onNavigate?: () => void;
};

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'flex w-64 flex-col border-r border-white/[0.06] bg-[#0a0a0b]/95 backdrop-blur-xl h-screen',
        className ?? 'hidden lg:flex sticky top-0'
      )}
    >
      <div className="p-4 border-b border-white/[0.06] flex justify-center">
        <AppBrand href="/dashboard" width={152} priority onClick={onNavigate} />
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto overscroll-contain">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate}>
              <motion.div
                whileHover={{ x: 4 }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors',
                  active
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </motion.div>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-white/[0.06] space-y-1">
        <Link href="/configuracoes" onClick={onNavigate}>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-white hover:bg-white/5">
            <Settings className="h-4 w-4" />
            Configurações
          </div>
        </Link>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
