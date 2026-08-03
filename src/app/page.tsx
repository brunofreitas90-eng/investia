'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Brain, Shield, TrendingUp, Zap } from 'lucide-react';
import { AppBrand } from '@/components/app-brand';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: Brain,
    title: 'IA Analista',
    desc: 'Análises em linguagem simples sobre valuation, dívida, dividendos e tendências.',
  },
  {
    icon: TrendingUp,
    title: 'Carteira Inteligente',
    desc: 'Acompanhe ações BR, EUA, FIIs e ETFs com cálculos automáticos.',
  },
  {
    icon: Shield,
    title: 'Imposto de Renda',
    desc: 'Calcule DARF, isenção de 20 mil e entenda quanto pagar com a IA.',
  },
  {
    icon: Zap,
    title: 'Dados em Tempo Real',
    desc: 'Múltiplas APIs gratuitas com fallback automático e cache inteligente.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050506] grid-bg overflow-hidden">
      <nav className="flex items-center justify-between px-6 lg:px-12 py-6 border-b border-white/[0.06]">
        <AppBrand href="/" width={140} priority />
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button>Entrar</Button>
          </Link>
        </div>
      </nav>

      <section className="px-6 lg:px-12 py-20 lg:py-32 text-center max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 mb-6">
            Powered by OpenAI
          </span>
          <h1 className="text-4xl lg:text-7xl font-bold tracking-tight text-white mb-6">
            Invista com{' '}
            <span className="gradient-text">inteligência artificial</span>
          </h1>
          <p className="text-lg lg:text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
            Analise empresas, controle dividendos, calcule impostos e tome decisões
            simples sobre ações brasileiras e americanas.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="gap-2">
                Entrar <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="px-6 lg:px-12 pb-24 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-2xl p-6"
            >
              <f.icon className="h-8 w-8 text-emerald-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-zinc-400">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/[0.06] py-8 text-center text-sm text-zinc-500">
        © 2026 DelfoInvestIA.
      </footer>
    </div>
  );
}
