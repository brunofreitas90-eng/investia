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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/carteira', label: 'Carteira', icon: Wallet },
  { href: '/dividendos', label: 'Dividendos', icon: Coins },
  { href: '/imposto', label: 'Imposto de Renda', icon: FileText },
  { href: '/analise', label: 'IA Analista', icon: Brain },
  { href: '/radar', label: 'Radar', icon: Radar },
  { href: '/alertas', label: 'Alertas', icon: Bell },
  { href: '/calendario', label: 'Calendário', icon: Calendar },
  { href: '/watchlist', label: 'Watchlist', icon: Star },
  { href: '/chat', label: 'Chat IA', icon: MessageSquare },
  { href: '/metas', label: 'Metas', icon: Target },
  { href: '/juros-compostos', label: 'Juros Compostos', icon: Calculator },
  { href: '/simuladores', label: 'Simuladores', icon: PiggyBank },
  { href: '/ranking', label: 'Ranking', icon: TrendingUp },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-white/[0.06] bg-[#0a0a0b]/80 backdrop-blur-xl h-screen sticky top-0">
      <div className="p-6 border-b border-white/[0.06]">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-black" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">
            Invest<span className="text-emerald-400">IA</span>
          </span>
        </Link>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
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
        <Link href="/configuracoes">
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
