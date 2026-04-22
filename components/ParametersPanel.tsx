'use client';

import { useState } from 'react';
import { Tranche, ModelParams, fmt$, getMonthlyRate, getScaleFactor } from '@/lib/model';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';

interface Props {
  tranches: Tranche[];
  params: ModelParams;
  onTranchesChange: (t: Tranche[]) => void;
  onParamsChange: (p: ModelParams) => void;
}

function Input({
  label, value, onChange, prefix = '', suffix = '', step = '1', min = '0', tooltip,
}: {
  label: string; value: string | number; onChange: (v: string) => void;
  prefix?: string; suffix?: string; step?: string; min?: string; tooltip?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-400 flex items-center gap-1">
        {label}
        {tooltip && (
          <span className="group relative cursor-help">
            <Info className="w-3 h-3" />
            <span className="hidden group-hover:block absolute left-4 bottom-4 bg-slate-800 text-xs text-slate-300 p-2 rounded shadow-lg w-48 z-10">{tooltip}</span>
          </span>
        )}
      </label>
      <div className="flex items-center bg-slate-800 border border-slate-700 rounded px-2 py-1.5 gap-1 focus-within:border-blue-500">
        {prefix && <span className="text-slate-400 text-sm">{prefix}</span>}
        <input
          type="number"
          step={step}
          min={min}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="bg-transparent text-white text-sm flex-1 outline-none w-full"
        />
        {suffix && <span className="text-slate-400 text-sm">{suffix}</span>}
      </div>
    </div>
  );
}

export default function ParametersPanel({ tranches, params, onTranchesChange, onParamsChange }: Props) {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<'tranches' | 'model' | 'plan'>('tranches');

  const updateTranche = (id: string, field: keyof Tranche, raw: string) => {
    const next = tranches.map(t => {
      if (t.id !== id) return t;
      if (field === 'amount' || field === 'actualMonthly') {
        return { ...t, [field]: parseFloat(raw) || 0 };
      }
      return { ...t, [field]: raw };
    });
    onTranchesChange(next);
  };

  const updateMilestone = (key: keyof ModelParams['milestones'], raw: string) => {
    onParamsChange({
      ...params,
      milestones: { ...params.milestones, [key]: parseFloat(raw) || 0 },
    });
  };

  const addTranche = () => {
    const maxYear = Math.max(...tranches.filter(t => !t.isReinvestment).map(t => t.year));
    const newYear = maxYear + 1;
    const newTranche: Tranche = {
      id: `t${newYear}`,
      year: newYear,
      amount: 125000,
      label: `${newYear} Wells`,
      color: '#94a3b8',
      isReinvestment: false,
    };
    onTranchesChange([...tranches, newTranche]);
  };

  const removeTranche = (id: string) => {
    onTranchesChange(tranches.filter(t => t.id !== id && !t.isReinvestment));
  };

  // Scale factor display
  const scale = (t: Tranche) => {
    const sf = getScaleFactor(t, params.milestones);
    return sf === 1.0 ? null : sf;
  };

  const manualTranches = tranches.filter(t => !t.isReinvestment);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
      >
        <span>Parameters</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-slate-700">
          <div className="flex border-b border-slate-700">
            {(['tranches', 'model', 'plan'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={[
                  'px-5 py-2.5 text-sm capitalize transition-colors',
                  tab === t
                    ? 'text-white border-b-2 border-blue-500 font-medium'
                    : 'text-slate-400 hover:text-slate-200',
                ].join(' ')}
              >
                {t === 'tranches' ? 'Investments' : t === 'model' ? 'Model' : 'Strategy'}
              </button>
            ))}
          </div>

          <div className="p-5">
            {tab === 'tranches' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  Enter each investment tranche. If you have an actual recent distribution, enter it and the date — the model will calibrate its scale factor accordingly.
                </p>
                {manualTranches.map(t => {
                  const sf = scale(t);
                  return (
                    <div key={t.id} className="bg-slate-800 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: t.color }} />
                          <span className="text-white font-medium text-sm">{t.label}</span>
                          {sf !== null && (
                            <span className={[
                              'text-xs px-1.5 py-0.5 rounded',
                              sf > 1 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400',
                            ].join(' ')}>
                              {sf > 1 ? '+' : ''}{((sf - 1) * 100).toFixed(0)}% vs model
                            </span>
                          )}
                        </div>
                        {manualTranches.length > 1 && (
                          <button onClick={() => removeTranche(t.id)} className="text-slate-500 hover:text-red-400 text-xs">remove</button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Input label="Investment Year" value={t.year} onChange={v => updateTranche(t.id, 'year', v)} step="1" min="2020" />
                        <Input label="Amount Invested" value={t.amount} onChange={v => updateTranche(t.id, 'amount', v)} prefix="$" step="1000" />
                        <Input label="Last Actual Monthly" value={t.actualMonthly ?? ''} onChange={v => updateTranche(t.id, 'actualMonthly', v)} prefix="$" step="1" tooltip="Most recent monthly distribution received for this tranche. Used to calibrate the model." />
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-400">As Of (YYYY-MM)</label>
                          <input
                            type="month"
                            value={t.actualMonth ?? ''}
                            onChange={e => updateTranche(t.id, 'actualMonth', e.target.value)}
                            className="bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-white text-sm outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                <button
                  onClick={addTranche}
                  className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  + Add investment year
                </button>
              </div>
            )}

            {tab === 'model' && (
              <div className="space-y-5">
                <div>
                  <p className="text-xs text-slate-500 mb-3">
                    Cumulative return milestones — what fraction of the original investment is returned by each year.
                    Default: 100% by year 3, 225% cumulative by year 8, 300% cumulative by year 15.
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <Input
                      label="Year 3 Cumulative"
                      value={params.milestones.year3}
                      onChange={v => updateMilestone('year3', v)}
                      suffix="×"
                      step="0.05"
                      tooltip="Total fraction of investment returned by end of year 3. 1.0 = 100% (principal recovery)."
                    />
                    <Input
                      label="Year 8 Cumulative"
                      value={params.milestones.year8}
                      onChange={v => updateMilestone('year8', v)}
                      suffix="×"
                      step="0.05"
                      tooltip="Total fraction of investment returned by end of year 8. 2.25 = 225%."
                    />
                    <Input
                      label="Year 15 Cumulative"
                      value={params.milestones.year15}
                      onChange={v => updateMilestone('year15', v)}
                      suffix="×"
                      step="0.05"
                      tooltip="Total fraction of investment returned by end of year 15 (well capped). 3.0 = 300%."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Income Tax Rate"
                    value={(params.incomeTaxRate * 100).toFixed(0)}
                    onChange={v => onParamsChange({ ...params, incomeTaxRate: (parseFloat(v) || 0) / 100 })}
                    suffix="%"
                    step="1"
                    tooltip="Marginal income tax rate applied to distributions."
                  />
                  <Input
                    label="HYSA APY"
                    value={(params.hysaAPY * 100).toFixed(1)}
                    onChange={v => onParamsChange({ ...params, hysaAPY: (parseFloat(v) || 0) / 100 })}
                    suffix="%"
                    step="0.1"
                    tooltip="Annual yield on your high-yield savings account where distributions accumulate."
                  />
                </div>
              </div>
            )}

            {tab === 'plan' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  Configure when to start auto-reinvesting distributions. Distributions accumulate in HYSA and are invested at the start of each reinvestment year.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Reinvest Starting Year"
                    value={params.reinvestStartYear}
                    onChange={v => onParamsChange({ ...params, reinvestStartYear: parseInt(v) || 2028 })}
                    step="1"
                    min="2024"
                    tooltip="Year when you start reinvesting HYSA-accumulated distributions instead of adding fresh cash."
                  />
                  <Input
                    label="Simulate Through Year"
                    value={params.simulationEndYear}
                    onChange={v => onParamsChange({ ...params, simulationEndYear: parseInt(v) || 2042 })}
                    step="1"
                    tooltip="Last year to include in the simulation."
                  />
                </div>
                <div className="bg-slate-800 rounded-lg p-3 text-xs text-slate-400">
                  <p className="text-slate-300 font-medium mb-1">How reinvestment works:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Monthly distributions (after tax) go into HYSA and earn {(params.hysaAPY * 100).toFixed(1)}% APY</li>
                    <li>At the start of each reinvestment year, the full HYSA balance is invested in that year's well program</li>
                    <li>HYSA resets to zero after the investment</li>
                    <li>New distributions immediately begin accumulating for the next year</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
