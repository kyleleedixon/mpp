'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { MonthlyPoint, Tranche, fmt$ } from '@/lib/model';
import { useMemo } from 'react';

interface Props {
  monthly: MonthlyPoint[];
  tranches: Tranche[];
  showNet: boolean;
}

const TICK_YEARS = new Set([2024, 2026, 2028, 2030, 2032, 2034, 2036, 2038, 2040]);

const now = new Date();
const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label, tranches, showNet }: any) {
  if (!active || !payload?.length) return null;
  const taxRate = payload[0]?.payload?.taxRate ?? 0;
  const total = payload.reduce((s: number, p: { value: number }) => s + p.value, 0);
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm shadow-xl">
      <p className="text-slate-400 mb-2">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }) => {
        const t = tranches.find((tr: Tranche) => tr.id === p.name);
        return (
          <div key={p.name} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="text-slate-300">{t?.label ?? p.name}:</span>
            <span className="text-white font-medium ml-auto pl-4">
              {fmt$(showNet ? p.value * (1 - taxRate) : p.value, 0)}
            </span>
          </div>
        );
      })}
      <div className="border-t border-slate-700 mt-2 pt-2 flex justify-between">
        <span className="text-slate-400">Total {showNet ? 'net' : 'gross'}</span>
        <span className="text-white font-bold">{fmt$(showNet ? total * (1 - taxRate) : total, 0)}</span>
      </div>
    </div>
  );
}

export default function CashflowChart({ monthly, tranches, showNet }: Props) {
  const chartData = useMemo(() => {
    // Aggregate monthly → quarterly for performance, keep labels as "Q1 2024" etc.
    // Actually just use monthly but thin to every 3rd point after 2 years
    return monthly.map(pt => {
      const base: Record<string, number | string | boolean> = {
        date: pt.date,
        label: (() => {
          if (pt.month === 1) return String(pt.year);
          if (pt.month === 7) return `'${String(pt.year).slice(2)}`;
          return '';
        })(),
        isProjected: pt.isProjected,
        taxRate: 0, // placeholder; we compute net in tooltip from gross
      };
      for (const t of tranches) {
        base[t.id] = pt.byTranche[t.id] ?? 0;
      }
      return base;
    });
  }, [monthly, tranches]);

  const yFormatter = (v: number) => `$${(v / 1000).toFixed(0)}k`;

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
          <defs>
            {tranches.map(t => (
              <linearGradient key={t.id} id={`g-${t.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={t.color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={t.color} stopOpacity={0.05} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.5} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
            interval={0}
          />
          <YAxis
            tickFormatter={yFormatter}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            content={<CustomTooltip tranches={tranches} showNet={showNet} />}
          />
          <Legend
            formatter={(value) => {
              const t = tranches.find(tr => tr.id === value);
              return <span style={{ color: '#94a3b8', fontSize: 12 }}>{t?.label ?? value}</span>;
            }}
          />
          <ReferenceLine
            x={todayStr === chartData.find(d => d.date === todayStr)?.date ? todayStr : undefined}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            label={{ value: 'Today', fill: '#f59e0b', fontSize: 11 }}
          />
          {tranches.map(t => (
            <Area
              key={t.id}
              type="monotone"
              dataKey={t.id}
              stackId="1"
              stroke={t.color}
              strokeWidth={1.5}
              fill={`url(#g-${t.id})`}
              fillOpacity={1}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
