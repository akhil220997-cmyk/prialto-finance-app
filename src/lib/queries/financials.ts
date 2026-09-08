import { prisma } from '@/lib/db';
import { getFinancialsSummary as getMockFinancialsSummary } from '@/lib/mock-data';
import type { FinancialsSummary, Filters } from '@/lib/types';

const USE_MOCK_DATA = process.env.USE_MOCK_DATA !== 'false';

/**
 * Core financials — P&L, balance sheet, cash flow, AR aging. Sourced from
 * FinancialStatementLine, which the sync job populates from QuickBooks'
 * documented Accounting API entities (Invoice/Bill/Payment/JournalEntry/Account)
 * rather than the legacy Reports API (being retired June 30, 2026 — see
 * docs/CREDENTIALS.md).
 */
export async function getFinancialsSummary(filters?: Partial<Filters>): Promise<FinancialsSummary> {
  if (USE_MOCK_DATA) return getMockFinancialsSummary();

  const periodEnd = filters?.to ? new Date(filters.to) : new Date();
  const periodStart = filters?.from
    ? new Date(filters.from)
    : new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1);

  const [pnlLines, bsLines, cfLines, invoices, trendRows] = await Promise.all([
    prisma.financialStatementLine.findMany({
      where: { statement: 'P&L', periodStart: { gte: periodStart }, periodEnd: { lte: periodEnd } },
    }),
    prisma.financialStatementLine.findMany({ where: { statement: 'BalanceSheet' }, orderBy: { periodEnd: 'desc' }, take: 50 }),
    prisma.financialStatementLine.findMany({
      where: { statement: 'CashFlow', periodStart: { gte: periodStart }, periodEnd: { lte: periodEnd } },
    }),
    prisma.invoice.findMany({ where: { balance: { gt: 0 } } }),
    prisma.monthlyMetric.findMany({ where: { metric: 'revenue', dimensions: '{}' }, orderBy: { month: 'asc' }, take: 12 }),
  ]);

  const revenue = pnlLines.filter((l) => l.category === 'Revenue').reduce((s, l) => s + l.amount, 0);
  const cogs = Math.abs(pnlLines.filter((l) => l.category === 'COGS').reduce((s, l) => s + l.amount, 0));
  const opex = Math.abs(pnlLines.filter((l) => l.category === 'Opex').reduce((s, l) => s + l.amount, 0));
  const grossMarginPct = revenue ? ((revenue - cogs) / revenue) * 100 : 0;
  const operatingMarginPct = revenue ? ((revenue - cogs - opex) / revenue) * 100 : 0;

  const cashBalance = bsLines.find((l) => l.account === 'Cash & Equivalents')?.amount ?? 0;

  const now = new Date();
  const bucketOf = (dueDate: Date) => {
    const days = Math.floor((now.getTime() - dueDate.getTime()) / 86_400_000);
    if (days <= 30) return '0-30' as const;
    if (days <= 60) return '31-60' as const;
    if (days <= 90) return '61-90' as const;
    return '90+' as const;
  };
  const arAgingMap = new Map<string, number>();
  for (const inv of invoices) {
    const bucket = bucketOf(inv.dueDate);
    arAgingMap.set(bucket, (arAgingMap.get(bucket) ?? 0) + inv.balance);
  }

  return {
    revenueTrend: trendRows.map((r) => ({ label: r.month.toISOString().slice(0, 7), value: r.value })),
    grossMarginPct,
    grossMarginDeltaPct: 0, // TODO: prior-period comparison from MonthlyMetric "gross_margin_pct"
    operatingMarginPct,
    cashBalance,
    cashRunwayMonths: null, // TODO: compute from trailing-3mo net burn once >=3 periods of CashFlow lines exist
    netMonthlyCashChange: 0, // TODO: same trailing-3mo CashFlow dependency as cashRunwayMonths above
    pnl: pnlLines.map((l) => ({ category: l.category, account: l.account, amount: l.amount })),
    balanceSheet: bsLines.map((l) => ({ category: l.category, account: l.account, amount: l.amount })),
    cashFlow: cfLines.map((l) => ({ category: l.category, amount: l.amount })),
    arAging: (['0-30', '31-60', '61-90', '90+'] as const).map((bucket) => ({
      bucket,
      amount: arAgingMap.get(bucket) ?? 0,
    })),
    opexByDepartment: [], // TODO: requires a QBO class/department dimension on Opex lines
    ebitdaMarginPct: 0, // TODO: operatingMarginPct + D&A addback once FinancialStatementLine tags D&A accounts
    ebitdaAmount: 0, // TODO: same D&A-tagging dependency as ebitdaMarginPct above
    ruleOf40Score: 0, // TODO: yoyRevenueGrowthPct + ebitdaMarginPct once both are live
    yoyRevenueGrowthPct: 0, // TODO: needs >=13mo of MonthlyMetric "revenue" history
    dsoDays: 0, // TODO: (open AR / monthly revenue) * 30 once both are live
    revenuePerEmployee: 0, // TODO: needs a headcount source (not yet synced from any connected system)
    burnMultiple: null, // TODO: net burn / net new ARR once >=2 periods of CashFlow + MonthlyMetric "arr" exist
    ebitdaTrend: [], // TODO: derive from FinancialStatementLine once D&A accounts are tagged
    netIncomeTrend: [], // TODO: derive from FinancialStatementLine P&L lines once >=12mo of history exist
    periodPnl: [], // TODO: this month / last month / QTD / last quarter, once periodStart/periodEnd queries per-bucket are wired up
    arAgingMonthly: [], // TODO: bucket Invoice.dueDate by month once >=12mo of invoice history exists, same as arAging above
    opexByDepartmentMonthly: [], // TODO: same QBO class/department dimension dependency as opexByDepartment above, applied per month
  };
}
