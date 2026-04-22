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
  taxRate: number;
}

const now = new Date();
const todayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

export default function CashflowChart({ monthly, tranches, showNet, taxRate }: Props) {
  const multiplier = showNet ? (1 - taxRate) : 1;

  const chartData = useMemo(() => {
    return monthly.map(pt => {
      const base: Record<string, number | string | boolean> = {
        date: pt.date,
        label: pt.month === 1 ? String(pt.year) : pt.month === 7 ? `'${String(pt.year).slice(2)}` : '',
        isProjected: pt.isProjected,
      };
      for (const t of tranches) {
        base[t.id] = (pt.byTranche[t.id] ?? 0) * multiplier;
      }
      return base;
    });
  }, [monthly, tranches, multiplier]);

  const todayIndex = chartData.findIndex(d => d.date === todayDate);
  const todayLabel = todayIndex >= 0 ? chartData[todayIndex].label : undefined;

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
          <defs>
            {tranches.map(t => (
              <linearGradient key={t.id} id={`g-${t.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={t.color} stopOpacity={0.4} />
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
            tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            content={(props) => {
              const { active, payload } = props;
              if (!active || !payload?.length) return null;
              const date = payload[0]?.payload?.date as string;
              const [y, m] = (date ?? '').split('-');
              const dateLabel = date
                ? new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                : '';
              const isProjected = payload[0]?.payload?.isProjected as boolean;
              const total = payload.reduce((s, p) => s + (Number(p.value) || 0), 0);
              const visibleRows = payload.filter(p => Number(p.value) > 0.5);
              return (
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm shadow-xl min-w-48">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-slate-300 font-medium">{dateLabel}</p>
                    {isProjected && <span className="text-xs text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">projected</span>}
                  </div>
                  {visibleRows.map(p => {
                    const t = tranches.find(tr => tr.id === String(p.dataKey));
                    if (!t) return null;
                    return (
                      <div key={String(p.dataKey)} className="flex items-center gap-2 mb-1.5">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: t.color }} />
                        <span className="text-slate-400 flex-1">{t.label}</span>
                        <span className="text-white font-medium">{fmt$(Number(p.value), 0)}</span>
                      </div>
                    );
                  })}
                  <div className="border-t border-slate-700 mt-2 pt-2 flex justify-between">
                    <span className="text-slate-400">Total / month</span>
                    <span className="text-white font-bold">{fmt$(total, 0)}</span>
                  </div>
                </div>
              );
            }}
          />
          <Legend
            formatter={(value) => {
              const t = tranches.find(tr => tr.id === value);
              return <span style={{ color: '#94a3b8', fontSize: 12 }}>{t?.label ?? value}</span>;
            }}
          />
          {todayIndex >= 0 && (
            <ReferenceLine
              x={todayLabel as string}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              label={{ value: 'Today', fill: '#f59e0b', fontSize: 11, position: 'insideTopRight' }}
            />
          )}
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
              name={t.label}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
