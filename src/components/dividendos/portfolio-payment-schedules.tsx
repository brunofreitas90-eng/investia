'use client';

import { CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PaymentScheduleDisplay } from '@/components/dividendos/payment-schedule-display';
import type { TickerPaymentSchedule } from '@/services/dividends/portfolio-dividends';

export function PortfolioPaymentSchedulesTable({
  schedules,
}: {
  schedules: TickerPaymentSchedule[];
}) {
  if (schedules.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-5 w-5 text-emerald-400" />
          Calendário de pagamentos — sua carteira
        </CardTitle>
        <p className="text-sm text-zinc-500">
          Períodos em que cada empresa costuma pagar proventos e quantas vezes por ano (histórico
          real BRAPI/B3)
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08] text-zinc-500">
              <th className="text-left py-3 pr-4 font-medium">Ativo</th>
              <th className="text-left py-3 px-2 font-medium">Frequência</th>
              <th className="text-center py-3 px-2 font-medium">Vezes/ano</th>
              <th className="text-left py-3 pl-2 font-medium">Meses típicos</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((s) => (
              <tr key={s.ticker} className="border-b border-white/[0.04]">
                <td className="py-3 pr-4">
                  <span className="font-bold text-zinc-200">{s.ticker}</span>
                  {s.companyName && s.companyName !== s.ticker && (
                    <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-[140px]">
                      {s.companyName}
                    </p>
                  )}
                </td>
                <td className="py-3 px-2 text-emerald-400/90">{s.frequency}</td>
                <td className="py-3 px-2 text-center text-white font-medium tabular-nums">
                  {s.paymentsPerYear}x
                </td>
                <td className="py-3 pl-2 text-zinc-400">
                  {s.typicalMonthLabels.length > 0
                    ? s.typicalMonthLabels.join(', ')
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export function PortfolioPaymentSchedulesExpanded({
  schedules,
}: {
  schedules: TickerPaymentSchedule[];
}) {
  if (schedules.length === 0) return null;

  return (
    <div className="space-y-4">
      <PortfolioPaymentSchedulesTable schedules={schedules} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {schedules.slice(0, 6).map((s) => (
          <Card key={s.ticker}>
            <CardContent className="p-4">
              <p className="font-bold text-zinc-200 mb-3">{s.ticker}</p>
              <PaymentScheduleDisplay
                frequency={s.frequency}
                paymentsPerYear={s.paymentsPerYear}
                paymentsLast12m={s.paymentsLast12m}
                typicalMonths={s.typicalMonthLabels}
                scheduleSummary={s.scheduleSummary}
                compact
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
