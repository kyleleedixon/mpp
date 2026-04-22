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
            <th className="pb-2 pr-4 font-medium">Year</th>
            <th className="pb-2 pr-4 font-medium text-right">Invested</th>
            <th className="pb-2 pr-4 font-medium text-right">Gross Dist.</th>
            <th className="pb-2 pr-4 font-medium text-right">Tax Est.</th>
            <th className="pb-2 pr-4 font-medium text-right">Net Dist.</th>
            <th className="pb-2 pr-4 font-medium text-right">HYSA Bal.</th>
            <th className="pb-2 pr-4 font-medium text-right">Cum. Invested</th>
            <th className="pb-2 font-medium text-right">Net ROI</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const isPast = row.year < currentYear;
            const isCurrent = row.year === currentYear;
            const breakEvenGross = row.roiGross >= 0;
            const breakEvenNet = row.roiNet >= 0;

            return (
              <tr
                key={row.year}
                className={[
                  'border-b border-slate-800 transition-colors',
                  isCurrent ? 'bg-blue-950/40' : '',
                  isPast ? 'opacity-70' : '',
                  row.isReinvestmentYear ? 'text-emerald-300' : '',
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
                </td>
                <td className="py-2 pr-4 text-right">
                  {row.newInvestment > 0 ? (
                    <span className={row.isReinvestmentYear ? 'text-emerald-400' : 'text-amber-400'}>
                      {fmt$(row.newInvestment)}
                    </span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
                <td className="py-2 pr-4 text-right text-slate-200">
                  {fmt$(row.grossDistributions)}
                </td>
                <td className="py-2 pr-4 text-right text-red-400/80">
                  ({fmt$(row.taxWithheld)})
                </td>
                <td className="py-2 pr-4 text-right text-green-400">
                  {fmt$(row.netDistributions)}
                </td>
                <td className="py-2 pr-4 text-right text-cyan-400">
                  {fmt$(row.hysaEndBalance)}
                </td>
                <td className="py-2 pr-4 text-right text-slate-400">
                  {fmt$(row.cumulativeInvested)}
                </td>
                <td className="py-2 text-right">
                  <span className={[
                    'font-medium',
                    row.roiNet >= 1 ? 'text-emerald-400' :
                    row.roiNet >= 0 ? 'text-green-400' : 'text-red-400',
                  ].join(' ')}>
                    {fmtPct(row.roiNet)}
                  </span>
                  {breakEvenNet && !rows.slice(0, rows.indexOf(row)).some(r => r.roiNet >= 0) && (
                    <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-1 py-0.5 rounded">break-even</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
