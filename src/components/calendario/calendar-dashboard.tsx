'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Loader2,
  RefreshCw,
  ChevronRight,
  Coins,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCalendar } from '@/hooks/use-calendar';
import { groupEventsByDate } from '@/lib/calendar-events';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import type { CalendarEventFilter, FinancialEvent } from '@/types';

const EVENT_STYLES: Record<string, { color: string; label: string }> = {
  dividend_com: { color: 'bg-violet-500/15 text-violet-300 border-violet-500/30', label: 'COM' },
  dividend: { color: 'bg-blue-500/15 text-blue-300 border-blue-500/30', label: 'EX' },
  payment: { color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', label: 'Pagamento' },
  jcp: { color: 'bg-teal-500/15 text-teal-300 border-teal-500/30', label: 'JSCP' },
  earnings: { color: 'bg-amber-500/15 text-amber-300 border-amber-500/30', label: 'Resultado' },
};

type TimeFilter = 'all' | 'upcoming' | 'past';

const EVENT_FILTERS: { value: CalendarEventFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'dividend', label: 'Dividendos' },
  { value: 'jcp', label: 'JSCP' },
  { value: 'com', label: 'Data COM' },
  { value: 'payment', label: 'Pagamentos' },
  { value: 'fii', label: 'FIIs' },
  { value: 'etf', label: 'ETFs' },
  { value: 'stock', label: 'Ações' },
];

export function CalendarDashboard() {
  const [eventFilter, setEventFilter] = useState<CalendarEventFilter>('all');
  const { data, loading, refresh } = useCalendar(eventFilter);
  const [filter, setFilter] = useState<TimeFilter>('upcoming');

  const today = new Date().toISOString().split('T')[0];

  const filteredEvents = useMemo(() => {
    const events = data?.events ?? [];
    if (filter === 'upcoming') return events.filter((e) => e.event_date >= today);
    if (filter === 'past') return events.filter((e) => e.event_date < today);
    return events;
  }, [data?.events, filter, today]);

  const grouped = useMemo(
    () => groupEventsByDate(filteredEvents),
    [filteredEvents]
  );

  const upcomingCount = (data?.events ?? []).filter((e) => e.event_date >= today).length;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="h-8 w-8 text-emerald-400" />
            <div>
              <p className="text-xs text-zinc-500">Próximos eventos</p>
              <p className="text-2xl font-bold">{upcomingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Coins className="h-8 w-8 text-amber-400" />
            <div>
              <p className="text-xs text-zinc-500">Proventos previstos</p>
              <p className="text-2xl font-bold text-amber-400">
                {formatCurrency(data?.dividendsSummary.expectedUpcoming ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        {EVENT_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setEventFilter(f.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium',
              eventFilter === f.value
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-white/5 text-zinc-400 hover:text-white'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(
            [
              ['upcoming', 'Próximos'],
              ['past', 'Passados'],
              ['all', 'Todos'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg border transition-colors',
                filter === key
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-white/[0.02] border-white/[0.08] text-zinc-400 hover:text-white'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          <span className="ml-2">Atualizar</span>
        </Button>
      </div>

      {loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto" />
            <p className="text-zinc-500 mt-3">Montando calendário da carteira...</p>
          </CardContent>
        </Card>
      )}

      {!loading && grouped.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center">
            <AlertCircle className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400">Nenhum evento no período selecionado.</p>
            <p className="text-sm text-zinc-600 mt-1">
              Adicione ativos na carteira com dividendos programados.
            </p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/carteira">Ir para carteira</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading &&
        grouped.map(({ date, events }) => (
          <Card key={date}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                {formatDate(date)}
                {date === today && (
                  <Badge variant="success" className="ml-2">
                    Hoje
                  </Badge>
                )}
                {date > today && (
                  <Badge variant="warning" className="ml-2">
                    Em breve
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {events.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </CardContent>
          </Card>
        ))}

      {!loading && (data?.allEvents.length ?? 0) > 0 && (
        <p className="text-xs text-zinc-600 text-center">
          Inclui dividendos e JSCP anunciados, além de previsões pelo histórico da ação.
          <Link href="/dividendos" className="text-emerald-400 hover:underline ml-1">
            Ver dividendos
          </Link>
        </p>
      )}
    </div>
  );
}

function EventRow({ event }: { event: FinancialEvent }) {
  const style = EVENT_STYLES[event.event_type] ?? {
    color: 'bg-white/5 text-zinc-300 border-white/10',
    label: event.event_type,
  };

  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/10 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <Badge className={cn('shrink-0 border', style.color)}>{style.label}</Badge>
        <div className="min-w-0">
          <p className="font-medium text-white truncate">{event.title}</p>
          {event.description && (
            <p className="text-xs text-zinc-500 truncate">{event.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-bold text-zinc-300">{event.ticker}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <Link href={`/analise?ticker=${event.ticker}`}>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
