import { getFinancialsSummary } from '@/lib/queries/financials';
import { FilterBar } from '@/components/ui/FilterBar';
import { StatTile } from '@/components/ui/StatTile';
import { DataTable } from '@/components/ui/DataTable';
import { PeriodPnlTable } from '@/components/dashboard/PeriodPnlTable';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { RangeProvider, PageRangeBar } from '@/components/dashboard/RangeContext';

import { usdSigned as usd, usdCompactM as usdCompact, pctSigned } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function FinancialsPage() {
  const data = await getFinancialsSummary();

  return (
    <RangeProvider>
      <div>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Core Financials</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          P&amp;L, balance sheet, cash flow, and AR aging — sourced from QuickBooks' documented
          Accounting API entities (Invoice/Bill/Payment/JournalEntry), not the legacy Reports API.
        </p>

        <div className="mt-6">
          <FilterBar />
        </div>
        <PageRangeBar months={data.revenueTrend.map((p) => p.label)} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Gross Margin" value={`${data.grossMarginPct.toFixed(1)}%`} deltaPct={data.grossMarginDeltaPct} />
          <StatTile label="Operating Margin" value={`${data.operatingMarginPct.toFixed(1)}%`} />
          <StatTile label="Cash Balance" value={usd(data.cashBalance)} />
          <StatTile
            label="Cash Runway"
            value={data.cashRunwayMonths === null ? 'Cash flow positive' : `${data.cashRunwayMonths} months`}
            hint={
              data.cashRunwayMonths === null
                ? `${usd(data.netMonthlyCashChange)}/mo net cash added`
                : `Cash ÷ current monthly burn (${usd(data.netMonthlyCashChange)}/mo)`
            }
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="EBITDA"
            value={`${usdCompact(data.ebitdaAmount)} (${data.ebitdaMarginPct.toFixed(1)}%)`}
            hint={`YoY revenue growth ${pctSigned(data.yoyRevenueGrowthPct)}`}
            sparklineData={data.ebitdaTrend.map((p) => p.value)}
          />
          <StatTile
            label="Rule of 40"
            value={data.ruleOf40Score.toFixed(0)}
            hint={data.ruleOf40Score >= 40 ? 'Above the 40 threshold' : 'Below the 40 threshold'}
            deltaGoodDirection="up"
          />
          <StatTile
            label="DSO"
            value={`${data.dsoDays} days`}
            hint="Days sales outstanding — AR collection speed"
          />
          <StatTile
            label="Revenue per Employee"
            value={usdCompact(data.revenuePerEmployee)}
            hint={data.burnMultiple === null ? 'Cash-flow positive — burn multiple n/a' : `Burn multiple ${data.burnMultiple.toFixed(1)}x`}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard title="Revenue trend" rows={data.revenueTrend} chart={{ kind: 'trend', format: 'usdCompactM' }} />
          <SectionCard
            title="EBITDA trend"
            rows={data.ebitdaTrend}
            chart={{ kind: 'trend', format: 'usdCompactM', color: 'var(--series-4)' }}
          />
        </div>

        <div className="mt-4">
          <SectionCard
            title="Net income trend"
            subtitle="Revenue net of COGS and Opex, month over month."
            rows={data.netIncomeTrend}
            chart={{ kind: 'trend', format: 'usdCompactM', color: 'var(--series-2)' }}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard
            title="AR aging"
            rows={data.arAgingMonthly}
            chart={{
              kind: 'categoryBreakdown',
              series: [
                { key: '0-30', label: '0-30' },
                { key: '31-60', label: '31-60' },
                { key: '61-90', label: '61-90' },
                { key: '90+', label: '90+' },
              ],
              agg: 'last',
              format: 'usdCompactM',
            }}
          />
          <SectionCard
            title="Opex by department"
            rows={data.opexByDepartmentMonthly}
            chart={{
              kind: 'categoryBreakdown',
              series: [
                { key: 'Sales', label: 'Sales' },
                { key: 'Marketing', label: 'Marketing' },
                { key: 'G&A', label: 'G&A' },
                { key: 'Technology', label: 'Technology' },
                { key: 'Engagement Management', label: 'Engagement Management' },
              ],
              agg: 'sum',
              format: 'usdCompactM',
              horizontal: true,
            }}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <h2 className="mb-2 text-sm font-medium text-[var(--text-primary)]">P&amp;L</h2>
            <PeriodPnlTable periods={data.periodPnl} />
          </div>
          <div>
            <h2 className="mb-2 text-sm font-medium text-[var(--text-primary)]">Balance sheet (latest)</h2>
            <DataTable
              caption="Balance sheet"
              rows={data.balanceSheet}
              columns={[
                { header: 'Category', accessor: (r) => r.category },
                { header: 'Account', accessor: (r) => r.account },
                { header: 'Amount', accessor: (r) => usd(r.amount), align: 'right' },
              ]}
            />
          </div>
        </div>
      </div>
    </RangeProvider>
  );
}
