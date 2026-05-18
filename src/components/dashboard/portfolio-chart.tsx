'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface PortfolioChartProps {
  data: { date: string; value: number }[];
}

export function PortfolioChart({ data }: PortfolioChartProps) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            stroke="#52525b"
            fontSize={12}
            tickFormatter={(v) => v.slice(5)}
          />
          <YAxis
            stroke="#52525b"
            fontSize={12}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              background: '#18181b',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
            }}
            formatter={(value) => [formatCurrency(Number(value)), 'Patrimônio']}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#10b981"
            fill="url(#colorValue)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
