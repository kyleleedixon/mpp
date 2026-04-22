'use client';

import { useState } from 'react';
import { Tranche, ModelParams, fmt$ } from '@/lib/model';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  tranches: Tranche[];
  params: ModelParams;
  onTranchesChange: (t: Tranche[]) => void;
  onParamsChange: (p: ModelParams) => void;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-300">{label}</label>
      {hint && <p className="text-xs text-slate-500 -mt-0.5">{hint}</p>}
      {children}
    </div>
  );
}

function NumberInput({
  value, onChange, prefix, suffix, step = '1', min = '0',
}: {
  value: number | string; onChange: (v: string) => void;
  prefix?: string; suffix?: string; step?: string; min?: string;
}) {
  return (
    <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 gap-1 focus-within:border-blue-500 transition-colors">
      {prefix && <span className="text-slate-400 text-sm select-none">{prefix}</span>}
      <input
        type="number"
        step={step}
        min={min}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-transparent text-white text-sm flex-1 outline-none min-w-0"
      />
      {suffix && <span className="text-slate-400 text-sm select-none">{suffix}</span>}
    </div>
  );
}

export default function ParametersPanel({ tranches, params, onTranchesChange, onParamsChange }: Props) {
  const [open, setOpen] = useState(false);

  // Derive YTD month count from the calibration month (e.g. 2026-03 → 3 months)
  const ytdMonths = (actualMonth: string | undefined) =>
    actualMonth ? parseInt(actualMonth.split('-')[1]) || 1 : 1;

  const updateTranche = (id: string, field: keyof Tranche, raw: string) => {
    onTranchesChange(tranches.map(t => {
      if (t.id !== id) return t;
      if (field === 'amount' || field === 'ltdGross') {
        return { ...t, [field]: parseFloat(raw) || 0 };
      }
      // YTD input: store as actualMonthly = ytd / months
      if (field === 'actualMonthly') {
        const ytd = parseFloat(raw) || 0;
        return { ...t, actualMonthly: ytd / ytdMonths(t.actualMonth) };
      }
      // When calibration month changes, recompute actualMonthly from existing YTD
      if (field === 'actualMonth') {
        const months = ytdMonths(raw);
        const ytd = (t.actualMonthly ?? 0) * ytdMonths(t.actualMonth);
        return { ...t, actualMonth: raw, actualMonthly: ytd / months };
      }
      return { ...t, [field]: raw };
    }));
  };

  // Display YTD as the gross total (actualMonthly × ytdMonths)
  const ytdDisplay = (t: Tranche) =>
    t.actualMonthly ? +(t.actualMonthly * ytdMonths(t.actualMonth)).toFixed(2) : '';

  const addTranche = () => {
    const maxYear = Math.max(...tranches.filter(t => !t.isReinvestment).map(t => t.year));
    const newYear = maxYear + 1;
    onTranchesChange([...tranches, {
      id: `t${newYear}`,
      year: newYear,
      amount: 125000,
      label: `${newYear} Wells`,
      color: '#94a3b8',
      isReinvestment: false,
    }]);
  };

  const removeTranche = (id: string) => {
    if (tranches.length <= 1) return;
    onTranchesChange(tranches.filter(t => t.id !== id));
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium text-white hover:bg-slate-800/50 transition-colors"
      >
        <span>Edit Assumptions</span>
        <div className="flex items-center gap-2 text-slate-400">
          <span className="text-xs font-normal">tax rate, HYSA yield, milestones, investments</span>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-700 p-5 space-y-8">

          {/* Investment tranches */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">Your Investments</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter the amount invested each year. If you know your most recent monthly distribution, enter it — the model will use it to fine-tune projections.
            </p>
            <div className="space-y-3">
              {tranches.map(t => (
                <div key={t.id} className="bg-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: t.color }} />
                      <span className="text-sm font-medium text-white">{t.label}</span>
                    </div>
                    {tranches.length > 1 && (
                      <button onClick={() => removeTranche(t.id)} className="text-xs text-slate-500 hover:text-red-400 transition-colors">
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-5">
                    <Field label="Year">
                      <NumberInput value={t.year} onChange={v => updateTranche(t.id, 'year', v)} step="1" min="2020" />
                    </Field>
                    <Field label="Amount Invested">
                      <NumberInput value={t.amount} onChange={v => updateTranche(t.id, 'amount', v)} prefix="$" step="5000" />
                    </Field>
                    <Field label="YTD Distributions">
                      <NumberInput value={ytdDisplay(t)} onChange={v => updateTranche(t.id, 'actualMonthly', v)} prefix="$" step="100" />
                    </Field>
                    <Field label="Total Received (LTD)">
                      <NumberInput value={t.ltdGross ?? ''} onChange={v => updateTranche(t.id, 'ltdGross', v)} prefix="$" step="100" />
                    </Field>
                    <Field label="As Of">
                      <input
                        type="month"
                        value={t.actualMonth ?? ''}
                        onChange={e => updateTranche(t.id, 'actualMonth', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500 transition-colors"
                      />
                    </Field>
                  </div>
                  {t.actualMonthly && t.actualMonth && (
                    <p className="text-xs text-slate-500 mt-2">
                      Avg monthly (calibration): <span className="text-white font-medium">{fmt$(t.actualMonthly, 0)}/mo</span>
                      {' '}over {ytdMonths(t.actualMonth)} months
                    </p>
                  )}
                </div>
              ))}
            </div>
            <button onClick={addTranche} className="mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors">
              + Add another year
            </button>
          </div>

          {/* Tax & savings */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">Tax &amp; Savings Rate</h3>
            <p className="text-xs text-slate-500 mb-4">
              Distributions are taxed as ordinary income. Your HYSA rate is used to estimate interest earned while waiting to reinvest.
            </p>
            <div className="grid grid-cols-2 gap-4 max-w-sm">
              <Field label="Your income tax rate">
                <NumberInput
                  value={(params.incomeTaxRate * 100).toFixed(0)}
                  onChange={v => onParamsChange({ ...params, incomeTaxRate: (parseFloat(v) || 0) / 100 })}
                  suffix="%" step="1"
                />
              </Field>
              <Field label="HYSA annual yield">
                <NumberInput
                  value={(params.hysaAPY * 100).toFixed(1)}
                  onChange={v => onParamsChange({ ...params, hysaAPY: (parseFloat(v) || 0) / 100 })}
                  suffix="%" step="0.1"
                />
              </Field>
            </div>
          </div>

          {/* Reinvestment */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">Reinvestment Strategy</h3>
            <p className="text-xs text-slate-500 mb-4">
              Reinvestment starts automatically the year after your last planned investment ({params.reinvestStartYear}).
              Add or remove investment years above to change when reinvestment begins.
            </p>
            <div className="grid grid-cols-1 gap-4 max-w-sm">
              <Field label="Show projections through">
                <NumberInput
                  value={params.simulationEndYear}
                  onChange={v => onParamsChange({ ...params, simulationEndYear: parseInt(v) || 2042 })}
                  step="1"
                />
              </Field>
            </div>
          </div>

          {/* Program milestones */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">Program Milestones</h3>
            <p className="text-xs text-slate-500 mb-4">
              These are the program&apos;s stated targets — how much of your original investment you&apos;ll have received back by each milestone year.
              100% means you&apos;ve gotten your money back; 300% means you&apos;ve tripled it.
            </p>
            <div className="grid grid-cols-3 gap-4 max-w-lg">
              <Field label="Returned by Year 3">
                <NumberInput
                  value={(params.milestones.year3 * 100).toFixed(0)}
                  onChange={v => onParamsChange({ ...params, milestones: { ...params.milestones, year3: (parseFloat(v) || 0) / 100 } })}
                  suffix="%" step="5"
                />
              </Field>
              <Field label="Returned by Year 8">
                <NumberInput
                  value={(params.milestones.year8 * 100).toFixed(0)}
                  onChange={v => onParamsChange({ ...params, milestones: { ...params.milestones, year8: (parseFloat(v) || 0) / 100 } })}
                  suffix="%" step="5"
                />
              </Field>
              <Field label="Returned by Year 15">
                <NumberInput
                  value={(params.milestones.year15 * 100).toFixed(0)}
                  onChange={v => onParamsChange({ ...params, milestones: { ...params.milestones, year15: (parseFloat(v) || 0) / 100 } })}
                  suffix="%" step="5"
                />
              </Field>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
