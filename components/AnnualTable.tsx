'use client';

import { AnnualRow, fmt$, fmtPct } from '@/lib/model';

interface Props {
  rows: AnnualRow[];
}

export default function AnnualTable({ rows }: Props) {
  const now = new Date();
  const currentYear = now.getFullYear();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-400 border-b border-slate-700">
            <th className="pb-2 pr-3 font-medium">Year</th>
            <th className="pb-2 pr-3 font-medium text-right hidden sm:table-cell">New Investment</th>
            <th className="pb-2 pr-3 font-medium text-right hidden sm:table-cell">Gross Income</th>
            <th className="pb-2 pr-3 font-medium text-right hidden sm:table-cell">Est. Tax</th>
            <th className="pb-2 pr-3 font-medium text-right">Gross / Mo</th>
            <th className="pb-2 pr-3 font-medium text-right">Net / Mo</th>
            <th className="pb-2 pr-3 font-medium text-right hidden sm:table-cell">Net Income</th>
            <th className="pb-2 pr-3 font-medium text-right">Cum. Net</th>
            <th className="pb-2 font-medium text-right">Return</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const isPast = row.year < currentYear;
            const isCurrent = row.year === currentYear;
            const isBreakEven = row.cashROI >= 0 && (i === 0 || rows[i - 1].cashROI < 0);

            return (
              <tr
                key={row.year}
                className={[
                  'border-b border-slate-800 transition-colors',
                  isCurrent ? 'bg-blue-950/40' : '',
                  isPast ? 'opacity-70' : '',
                  isBreakEven ? 'bg-green-950/30' : '',
                ].join(' ')}
              >
                <td className="py-2 pr-4">
                  <span className="font-medium text-white">{row.year}</span>
                  {isCurrent && (
                    <span className="ml-2 text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">now</span>
                  )}
                  {row.isReinvestmentYear && (
                    <span className="ml-2 text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">reinvest</span>
                  )}
                  {isBreakEven && (
                    <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-medium">break-even ✓</span>
                  )}
                </td>
                <td className="py-2 pr-3 text-right hidden sm:table-cell">
                  {row.newInvestment > 0 ? (
                    <span className={row.isReinvestmentYear ? 'text-emerald-400' : 'text-amber-400'}>
                      {fmt$(row.newInvestment)}
                    </span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
                <td className="py-2 pr-3 text-right text-slate-200 hidden sm:table-cell">
                  {fmt$(row.grossDistributions)}
                </td>
                <td className="py-2 pr-3 text-right text-red-400/80 hidden sm:table-cell">
                  ({fmt$(row.taxWithheld)})
                </td>
                <td className="py-2 pr-3 text-right text-slate-200">
                  {fmt$(row.grossDistributions / 12, 0)}
                </td>
                <td className="py-2 pr-3 text-right text-white font-medium">
                  {fmt$(row.netDistributions / 12, 0)}
                </td>
                <td className="py-2 pr-3 text-right text-green-400 hidden sm:table-cell">
                  {fmt$(row.netDistributions)}
                </td>
                <td className="py-2 pr-3 text-right text-slate-300">
                  {fmt$(row.cumulativeNet)}
                </td>
                <td className="py-2 text-right">
                  <span className={[
                    'font-medium',
                    row.cashROI >= 1 ? 'text-emerald-400' :
                    row.cashROI >= 0 ? 'text-green-400' : 'text-red-400',
                  ].join(' ')}>
                    {fmtPct(row.cashROI)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-xs text-slate-600 mt-3">
        &ldquo;Return on Cash&rdquo; = cumulative net income vs. your out-of-pocket cash only (excludes reinvested distributions).
        Break-even is when you&apos;ve received back everything you personally invested.
      </p>
    </div>
  );
}
