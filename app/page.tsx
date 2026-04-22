'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Tranche, ModelParams, runModel, fmt$, fmtPct, getScaleFactor } from '@/lib/model';
import ParametersPanel from '@/components/ParametersPanel';
import AnnualTable from '@/components/AnnualTable';

// Recharts uses browser APIs — load without SSR
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

  const { monthly, annual, tranches: allTranches } = useMemo(
    () => runModel(manualTranches, params),
    [manualTranches, params]
  );

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthData = monthly.find(m => m.date === currentMonthStr);
  const totalInvested = manualTranches.reduce((s, t) => s + t.amount, 0);
  const lastAnnual = annual[annual.length - 1];
  const totalNetEver = lastAnnual?.cumulativeNet ?? 0;
  const breakEvenRow = annual.find(r => r.roiNet >= 0);

  const scaleInfo = manualTranches
    .filter(t => t.actualMonthly && t.actualMonth)
    .map(t => ({ t, sf: getScaleFactor(t, params.milestones) }));

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Oil &amp; Gas Investment Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            Profit-sharing participation plan — cashflow projections &amp; reinvestment modeling
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Total Cash Invested"
            value={fmt$(totalInvested)}
            sub="2024–2027 planned"
          />
          <StatCard
            label="Current Monthly (gross)"
            value={fmt$(currentMonthData?.totalGross ?? 0, 0)}
            sub={`${fmt$(currentMonthData?.totalNet ?? 0, 0)} after ~${(params.incomeTaxRate * 100).toFixed(0)}% tax`}
            highlight
          />
          <StatCard
            label="Projected Lifetime Net"
            value={fmt$(totalNetEver, 0)}
            sub={`${fmtPct(lastAnnual?.roiNet ?? 0)} net ROI on invested capital`}
          />
          <StatCard
            label="Net Break-even Year"
            value={breakEvenRow ? String(breakEvenRow.year) : '—'}
            sub={breakEvenRow ? `${breakEvenRow.year - 2024} yrs from first investment` : 'Not yet in view'}
          />
        </div>

        {scaleInfo.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {scaleInfo.map(({ t, sf }) => (
              <div key={t.id} className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.color }} />
                <span className="text-slate-300">{t.label}</span>
                <span className="text-slate-500">calibrated at</span>
                <span className={sf >= 1 ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                  {sf.toFixed(2)}× model
                </span>
                <span className="text-slate-500">({fmt$(t.actualMonthly ?? 0, 0)}/mo actual vs {fmt$(t.amount * (params.milestones.year3 / 36) * 1, 0)} expected)</span>
              </div>
            ))}
          </div>
        )}

        <ParametersPanel
          tranches={manualTranches}
          params={params}
          onTranchesChange={next => setTranches(next)}
          onParamsChange={setParams}
        />

        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-white">Monthly Distributions by Tranche</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Stacked gross distributions — dashed area = reinvested tranche
              </p>
            </div>
            <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setShowNet(false)}
                className={['px-3 py-1 rounded text-xs font-medium transition-colors',
                  !showNet ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white',
                ].join(' ')}
              >
                Gross
              </button>
              <button
                onClick={() => setShowNet(true)}
                className={['px-3 py-1 rounded text-xs font-medium transition-colors',
                  showNet ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white',
                ].join(' ')}
              >
                Net (after tax)
              </button>
            </div>
          </div>
          <CashflowChart monthly={monthly} tranches={allTranches} showNet={showNet} />
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
          <h2 className="text-base font-semibold text-white mb-4">Annual Summary</h2>
          <AnnualTable rows={annual} />
        </div>

        <p className="text-xs text-slate-600 text-center pb-4">
          Projections are illustrative based on program milestones and calibrated from actual distributions.
          Tax estimates use a flat marginal rate — consult a tax professional regarding depletion allowances and passive income treatment.
        </p>
      </div>
    </div>
  );
}
