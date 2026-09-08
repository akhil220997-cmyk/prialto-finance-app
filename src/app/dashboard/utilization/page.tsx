import { getUtilizationSummary } from '@/lib/queries/utilization';
import { FilterBar } from '@/components/ui/FilterBar';
import { StatTile } from '@/components/ui/StatTile';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { RangeProvider, PageRangeBar } from '@/components/dashboard/RangeContext';

import { pct, hrs } from '@/lib/format';

export const dynamic = 'force-dynamic';

function riskStatus(utilizationPct: number): 'good' | 'warning' | 'critical' {
  if (utilizationPct >= 85) return 'good';
  if (utilizationPct >= 70) return 'warning';
  return 'critical';
}

// Dramatic over-utilization is its own kind of risk — not a problem in the
// billing sense, but a signal worth a human look: either an upsell
// opportunity (the client would benefit from more units) or, if sustained,
// assistant burnout risk.
function overRiskStatus(utilizationPct: number): 'warning' | 'critical' {
  return utilizationPct >= 120 ? 'critical' : 'warning';
}

export default async function UtilizationPage() {
  const data = await getUtilizationSummary();

  return (
    <RangeProvider>
      <div>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Utilization &amp; Delivery Cost</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Hours billed (per the Prialto Unit) vs. hours actually delivered, per Time Doctor — the
          clearest early signal of at-risk accounts and delivery cost by region.
        </p>

        <div className="mt-6">
          <FilterBar />
        </div>
        <PageRangeBar months={data.utilizationTrend.map((p) => p.label)} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Overall Utilization"
            value={pct(data.overallUtilizationPct)}
            deltaPct={data.utilizationDeltaPct}
            sparklineData={data.utilizationTrend.slice(-12).map((p) => p.value)}
          />
          <StatTile label="Hours Included (billed)" value={hrs(data.hoursIncludedTotal)} />
          <StatTile label="Hours Delivered" value={hrs(data.hoursDeliveredTotal)} />
          <StatTile
            label="Gap (billed - delivered)"
            value={hrs(data.hoursIncludedTotal - data.hoursDeliveredTotal)}
            hint="Hours clients are paying for but not yet using"
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SectionCard
              title="Utilization trend"
              rows={data.utilizationTrend}
              chart={{ kind: 'trend', format: 'pct', color: 'var(--series-3)' }}
            />
          </div>
          <div className="hover-card rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
            <h2 className="text-sm font-medium text-[var(--text-primary)]">Cost per delivered hour by region</h2>
            <ul className="mt-4 flex flex-col gap-3">
              {data.costPerDeliveredHourByRegion.map((r) => (
                <li key={r.region} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">{r.region}</span>
                  <span className="tabular-nums font-medium text-[var(--text-primary)]">${r.costPerHour.toFixed(2)}/hr</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-4">
          <SectionCard
            title="Hours billed vs. delivered, by delivery region"
            monthlyDimensions={data.utilizationByRegionMonthly}
            chart={{
              kind: 'dimensionBreakdown',
              series: [
                { key: 'hoursIncluded', label: 'Hours billed', color: 'var(--series-1)' },
                { key: 'hoursDelivered', label: 'Hours delivered', color: 'var(--series-3)' },
              ],
              agg: 'sum',
              format: 'hrs',
            }}
          />
        </div>

        <div className="mt-4">
          <SectionCard
            title="Non-billed hours, by reason"
            subtitle="Admin, Hold, and Unused are different owners and different meanings — placeholder split
              pending confirmation of whether Time Doctor already tags hours this way."
            rows={data.nonBilledBreakdownMonthly}
            chart={{
              kind: 'categoryBreakdown',
              series: [
                { key: 'Admin', label: 'Admin' },
                { key: 'Hold', label: 'Hold' },
                { key: 'Unused', label: 'Unused' },
              ],
              agg: 'sum',
              format: 'hrs',
              horizontal: true,
            }}
          />
        </div>

        <div className="mt-4">
          <h2 className="mb-2 text-sm font-medium text-[var(--text-primary)]">Clients at risk (lowest utilization)</h2>
          <DataTable
            caption="Clients with the lowest utilization"
            rows={data.atRiskClients}
            columns={[
              { header: 'Client', accessor: (r) => r.client },
              { header: 'Hours billed', accessor: (r) => hrs(r.hoursIncluded), align: 'right' },
              { header: 'Hours delivered', accessor: (r) => hrs(r.hoursDelivered), align: 'right' },
              {
                header: 'Utilization',
                accessor: (r) => (
                  <Badge status={riskStatus(r.utilizationPct)}>{pct(r.utilizationPct)}</Badge>
                ),
                align: 'right',
              },
            ]}
          />
        </div>

        <div className="mt-4">
          <h2 className="mb-2 text-sm font-medium text-[var(--text-primary)]">Clients over-utilizing</h2>
          <p className="mb-2 text-xs text-[var(--text-secondary)]">
            Using meaningfully more hours than billed — either an upsell opportunity, or a burnout
            risk if it holds for more than a month or two.
          </p>
          <DataTable
            caption="Clients using significantly more hours than billed"
            rows={data.overUtilizedClients}
            columns={[
              { header: 'Client', accessor: (r) => r.client },
              { header: 'Hours billed', accessor: (r) => hrs(r.hoursIncluded), align: 'right' },
              { header: 'Hours delivered', accessor: (r) => hrs(r.hoursDelivered), align: 'right' },
              {
                header: 'Utilization',
                accessor: (r) => (
                  <Badge status={overRiskStatus(r.utilizationPct)}>{pct(r.utilizationPct)}</Badge>
                ),
                align: 'right',
              },
            ]}
          />
        </div>
      </div>
    </RangeProvider>
  );
}
