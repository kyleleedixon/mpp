export const TRANCHE_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#a855f7', // purple
];

export interface Tranche {
  id: string;
  year: number;
  amount: number;
  label: string;
  color: string;
  isReinvestment: boolean;
  actualMonthly?: number;
  actualMonth?: string; // YYYY-MM
}

export interface Milestones {
  year3: number;  // cumulative fraction returned by year 3 (default 1.0)
  year8: number;  // cumulative fraction by year 8 (default 2.25)
  year15: number; // cumulative fraction by year 15 (default 3.0)
}

export interface ModelParams {
  milestones: Milestones;
  incomeTaxRate: number;
  hysaAPY: number;
  reinvestStartYear: number;
  simulationEndYear: number;
}

export interface MonthlyPoint {
  date: string; // YYYY-MM
  year: number;
  month: number;
  byTranche: Record<string, number>;
  totalGross: number;
  totalNet: number;
  hysaBalance: number;
  isProjected: boolean;
}

export interface AnnualRow {
  year: number;
  newInvestment: number;
  cumulativeInvested: number;       // includes reinvested amounts
  originalCashInvested: number;     // only out-of-pocket cash (excludes reinvestments)
  grossDistributions: number;
  taxWithheld: number;
  netDistributions: number;
  hysaEndBalance: number;
  cumulativeGross: number;
  cumulativeNet: number;
  cashROI: number;  // (cumulativeNet - originalCashInvested) / originalCashInvested — the one that matters
  isReinvestmentYear: boolean;
}

export function getMonthlyRate(monthN: number, m: Milestones): number {
  if (monthN < 1 || monthN > 180) return 0;
  if (monthN <= 36) return m.year3 / 36;
  if (monthN <= 96) return (m.year8 - m.year3) / 60;
  return (m.year15 - m.year8) / 84;
}

export function getScaleFactor(t: Tranche, m: Milestones): number {
  if (!t.actualMonthly || !t.actualMonth) return 1.0;
  const [y, mo] = t.actualMonth.split('-').map(Number);
  const monthN = (y - t.year) * 12 + mo;
  const rate = getMonthlyRate(monthN, m);
  if (rate === 0 || t.amount === 0) return 1.0;
  return t.actualMonthly / (t.amount * rate);
}

export function runModel(
  inputTranches: Tranche[],
  params: ModelParams
): { monthly: MonthlyPoint[]; annual: AnnualRow[]; tranches: Tranche[] } {
  const tranches: Tranche[] = inputTranches.map(t => ({ ...t }));
  const scales: Record<string, number> = {};
  for (const t of tranches) {
    scales[t.id] = getScaleFactor(t, params.milestones);
  }

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const hysaMonthlyRate = params.hysaAPY / 12;
  let hysaBalance = 0;
  let cumulativeInvested = 0;
  let originalCashInvested = 0; // only money you personally put in
  let cumulativeGross = 0;
  let cumulativeNet = 0;

  const monthly: MonthlyPoint[] = [];
  const annual: AnnualRow[] = [];

  const startYear = Math.min(...tranches.map(t => t.year));

  for (let year = startYear; year <= params.simulationEndYear; year++) {
    const existingTranche = tranches.find(t => t.year === year);
    let newInvestment = existingTranche ? existingTranche.amount : 0;
    let isReinvestmentYear = false;

    if (!existingTranche && year >= params.reinvestStartYear && hysaBalance > 500) {
      newInvestment = Math.round(hysaBalance);
      isReinvestmentYear = true;
      const colorIdx = tranches.length % TRANCHE_COLORS.length;
      const newTranche: Tranche = {
        id: `auto-${year}`,
        year,
        amount: newInvestment,
        label: `${year} (Reinvest)`,
        color: TRANCHE_COLORS[colorIdx],
        isReinvestment: true,
      };
      tranches.push(newTranche);
      scales[newTranche.id] = 1.0;
      hysaBalance = 0;
    }

    cumulativeInvested += newInvestment;
    if (!isReinvestmentYear) originalCashInvested += newInvestment;

    let yearGross = 0;
    let yearNet = 0;

    for (let month = 1; month <= 12; month++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}`;
      const isProjected = dateStr > todayStr;

      const byTranche: Record<string, number> = {};
      let monthGross = 0;

      for (const t of tranches) {
        const monthN = (year - t.year) * 12 + month;
        const rate = getMonthlyRate(monthN, params.milestones);
        if (rate === 0) continue;
        const dist = t.amount * rate * (scales[t.id] ?? 1.0);
        if (dist > 0.01) {
          byTranche[t.id] = dist;
          monthGross += dist;
        }
      }

      const monthNet = monthGross * (1 - params.incomeTaxRate);
      yearGross += monthGross;
      yearNet += monthNet;

      hysaBalance += monthNet;
      hysaBalance *= 1 + hysaMonthlyRate;

      monthly.push({
        date: dateStr,
        year,
        month,
        byTranche,
        totalGross: monthGross,
        totalNet: monthNet,
        hysaBalance,
        isProjected,
      });
    }

    cumulativeGross += yearGross;
    cumulativeNet += yearNet;

    annual.push({
      year,
      newInvestment,
      cumulativeInvested,
      originalCashInvested,
      grossDistributions: yearGross,
      taxWithheld: yearGross - yearNet,
      netDistributions: yearNet,
      hysaEndBalance: hysaBalance,
      cumulativeGross,
      cumulativeNet,
      cashROI: originalCashInvested > 0 ? (cumulativeNet - originalCashInvested) / originalCashInvested : 0,
      isReinvestmentYear,
    });
  }

  return { monthly, annual, tranches };
}

export function fmt$(n: number, decimals = 0): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });
}

export function fmtPct(n: number): string {
  return (n * 100).toFixed(1) + '%';
}
