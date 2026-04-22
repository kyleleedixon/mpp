'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Tranche, ModelParams, runModel, fmt$, fmtPct, getScaleFactor } from '@/lib/model';
import ParametersPanel from '@/components/ParametersPanel';
import AnnualTable from '@/components/AnnualTable';

const CashflowChart = dynamic(() => import('@/components/CashflowChart'), { ssr: false });

const DEFAULT_TRANCHES: Tranche[] = [
  {
    id: 't2024',
    year: 2024,
    amount: 75000,
    label: '2024 Wells',
    color: '#3b82f6',
    isReinvestment: false,
    actualMonthly: 3325.42,
    actualMonth: '2026-03',
  },
  {
    id: 't2025',
    year: 2025,
    amount: 125000,
    label: '2025 Wells',
    color: '#10b981',
    isReinvestment: false,
    actualMonthly: 1578.56,
    actualMonth: '2026-03',
  },
  {
    id: 't2026',
    year: 2026,
    amount: 125000,
    label: '2026 Wells',
    color: '#f59e0b',
    isReinvestment: false,
  },
  {
    id: 't2027',
    year: 2027,
    amount: 125000,
    label: '2027 Wells',
    color: '#8b5cf6',
    isReinvestment: false,
  },
];

const DEFAULT_PARAMS: ModelParams = {
  milestones: { year3: 1.0, year8: 2.25, year15: 3.0 },
  incomeTaxRate: 0.30,
  hysaAPY: 0.045,
  reinvestStartYear: 2028,
  simulationEndYear: 2042,
};

function StatCard({ label, value, sub, highlight = false }: {
  label: string; value: string; sub?: string; highlight?: boolean;
}) {
  return (
    <div className={[
      'bg-slate-900 border rounded-xl p-4',
      highlight ? 'border-blue-500/50' : 'border-slate-700',
    ].join(' ')}>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={['text-xl font-bold', highlight ? 'text-blue-400' : 'text-white'].join(' ')}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function Home() {
  const [tranches, setTranches] = useState<Tranche[]>(DEFAULT_TRANCHES);
  const [params, setParams] = useState<ModelParams>(DEFAULT_PARAMS);
  const [showNet, setShowNet] = useState(false);

  const manualTranches = tranches.filter(t => !t.isReinvestment);

  // Always start reinvesting the year after the last planned investment
  const derivedParams = useMemo(() => ({
    ...params,
    reinvestStartYear: Math.max(...manualTranches.map(t => t.year)) + 1,
  }), [params, manualTranches]);

  const { monthly, annual, tranches: allTranches } = useMemo(
    () => runModel(manualTranches, derivedParams),
    [manualTranches, derivedParams]
  );

  const now = new Date();
  const totalInvested = manualTranches.reduce((s, t) => s + t.amount, 0);

  // Use actual confirmed distributions where available; ignore planned-but-not-yet-invested tranches
  const confirmedGross = manualTranches.reduce((s, t) => s + (t.actualMonthly ?? 0), 0);
  const confirmedNet = confirmedGross * (1 - params.incomeTaxRate);
  const lastAnnual = annual[annual.length - 1];
  const totalNetEver = lastAnnual?.cumulativeNet ?? 0;
  const breakEvenRow = annual.find(r => r.cashROI >= 0);

  // Plain-English performance notes for tranches with actual data
  const performanceNotes = manualTranches
    .filter(t => t.actualMonthly && t.actualMonth)
    .map(t => {
      const sf = getScaleFactor(t, params.milestones);
      const pct = Math.abs((sf - 1) * 100).toFixed(0);
      const direction = sf >= 1 ? 'above' : 'below';
      const color = sf >= 1 ? 'text-green-400' : 'text-amber-400';
      return { t, sf, pct, direction, color };
    });

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">MPP Dashboard</h1>
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Total Invested"
            value={fmt$(totalInvested)}
            sub="across all years"
          />
          <StatCard
            label="Confirmed Monthly Income"
            value={fmt$(confirmedGross, 0)}
            sub={`${fmt$(confirmedNet, 0)} after tax`}
            highlight
          />
          <StatCard
            label="Projected Total Income"
            value={fmt$(totalNetEver, 0)}
            sub="lifetime after-tax, incl. reinvestment"
          />
          <StatCard
            label="Break-even Year"
            value={breakEvenRow ? String(breakEvenRow.year) : '—'}
            sub={breakEvenRow
              ? `${fmtPct(breakEvenRow.cashROI)} return on your $${(manualTranches.reduce((s,t)=>s+t.amount,0)/1000).toFixed(0)}k cash`
              : 'when your net income covers your out-of-pocket cash'}
          />
        </div>

        {/* Performance callouts — plain English */}
        {performanceNotes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {performanceNotes.map(({ t, pct, direction, color }) => (
              <div key={t.id} className="flex items-start gap-3 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3">
                <div className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0" style={{ background: t.color }} />
                <div>
                  <span className="text-white font-medium">{t.label}</span>
                  <span className="text-slate-400"> is paying </span>
                  <span className={`${color} font-medium`}>{fmt$(t.actualMonthly ?? 0, 0)}/mo</span>
                  <span className="text-slate-400"> — </span>
                  <span className={color}>{pct}% {direction}</span>
                  <span className="text-slate-400"> the baseline projection. Future distributions are scaled accordingly.</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Parameters */}
        <ParametersPanel
          tranches={manualTranches}
          params={derivedParams}
          onTranchesChange={next => setTranches(next)}
          onParamsChange={setParams}
        />

        {/* Chart */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-semibold text-white">Monthly Income Over Time</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Each color is one year of wells. Hover to see exact amounts.
              </p>
            </div>
            <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setShowNet(false)}
                className={['px-3 py-1.5 rounded text-xs font-medium transition-colors',
                  !showNet ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white',
                ].join(' ')}
              >
                Before tax
              </button>
              <button
                onClick={() => setShowNet(true)}
                className={['px-3 py-1.5 rounded text-xs font-medium transition-colors',
                  showNet ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white',
                ].join(' ')}
              >
                After tax
              </button>
            </div>
          </div>
          <CashflowChart
            monthly={monthly}
            tranches={allTranches}
            showNet={showNet}
            taxRate={params.incomeTaxRate}
          />
        </div>

        {/* Annual table */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
          <h2 className="text-base font-semibold text-white mb-1">Year-by-Year Summary</h2>
          <p className="text-xs text-slate-500 mb-4">
            Green rows are reinvestment years — your accumulated savings fund that year&apos;s new wells.
          </p>
          <AnnualTable rows={annual} />
        </div>

      </div>
    </div>
  );
}
