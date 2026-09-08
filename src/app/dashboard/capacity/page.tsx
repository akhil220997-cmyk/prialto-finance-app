import { getCapacityStaffingSummary } from '@/lib/queries/capacity';
import { REGION_LABELS } from '@/lib/types';
import { FilterBar } from '@/components/ui/FilterBar';
import { StatTile } from '@/components/ui/StatTile';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { RangeProvider, PageRangeBar } from '@/components/dashboard/RangeContext';

import { pct, count } from '@/lib/format';

export const dynamic = 'force-dynamic';

function attritionStatus(ratePct: number): 'good' | 'warning' | 'critical' {
  if (ratePct <= 10) return 'good';
  if (ratePct <= 13) return 'warning';
  return 'critical';
}

const REGION_SERIES = [
  { key: 'active', label: 'Active', color: 'var(--series-1)' },
  { key: 'bench', label: 'Bench', color: 'var(--series-3)' },
  { key: 'inTraining', label: 'In training', color: 'var(--series-4)' },
];

export default async function CapacityPage() {
  const data = await getCapacityStaffingSummary();

  return (
    <RangeProvider>
      <div>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Capacity &amp; Staffing</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Assistant headcount, bench buffer, and the ~4-week training pipeline across our three
          delivery centers — GT (Guatemala), PH (Philippines), and KE (Kenya) — plus whether hiring
          is keeping pace with unit growth.
        </p>

        <div className="mt-6">
          <FilterBar />
        </div>
        <PageRangeBar months={data.headcountTrend.map((p) => p.label)} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Active Assistants"
            value={count(data.totalActiveAssistants)}
            deltaPct={data.totalActiveAssistantsDeltaPct}
            sparklineData={data.headcountTrend.map((p) => p.value)}
          />
          <StatTile
            label="Bench Coverage"
            value={pct(data.benchCoveragePct)}
            hint={`${count(data.totalBenchAssistants)} certified & available`}
          />
          <StatTile
            label="In Training"
            value={count(data.totalInTraining)}
            hint={`~${data.avgTrainingWeeks}-week onboarding pipeline`}
          />
          <StatTile
            label="Attrition Rate"
            value={pct(data.attritionRatePct)}
            deltaPct={data.attritionDeltaPct}
            deltaGoodDirection="down"
            hint="Trailing 90-day, annualized"
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Client Backup Coverage"
            value={pct(data.clientBackupCoveragePct)}
            hint="Active units with a named backup assistant on file"
          />
          <StatTile
            label="Assistants per Unit"
            value={data.assistantsPerUnit.toFixed(2)}
            hint="Company-wide staffing ratio"
          />
          <StatTile
            label="Hiring Lead Time"
            value={`${data.hiringLeadTimeWeeks.toFixed(1)} weeks`}
            hint={`~${data.avgTrainingWeeks}-week training pipeline + ramp buffer`}
            sparklineData={data.hiringLeadTimeTrend.map((p) => p.value)}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard
            title="Headcount trend"
            rows={data.headcountTrend}
            chart={{ kind: 'trend', format: 'count', color: 'var(--series-1)' }}
          />
          <SectionCard
            title="Attrition trend"
            rows={data.attritionTrend}
            chart={{ kind: 'trend', format: 'pct', color: 'var(--series-8)' }}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard
            title="Headcount by delivery center"
            subtitle="Headcount is a stock, not a flow — shown as of the end of the selected window."
            monthlyDimensions={data.headcountByRegionMonthly}
            chart={{ kind: 'dimensionBreakdown', series: REGION_SERIES, agg: 'last', format: 'count' }}
          />
          <SectionCard
            title="Training pipeline (this cohort)"
            subtitle="As of the end of the selected window."
            rows={data.trainingPipelineMonthly}
            chart={{
              kind: 'categoryBreakdown',
              series: [
                { key: 'Week 1 — Orientation & Systems', label: 'Week 1 — Orientation & Systems' },
                { key: 'Week 2 — Core Skills Training', label: 'Week 2 — Core Skills Training' },
                { key: 'Week 3 — Live Shadowing', label: 'Week 3 — Live Shadowing' },
                { key: 'Week 4 — Certification', label: 'Week 4 — Certification' },
              ],
              agg: 'last',
              format: 'count',
              horizontal: true,
            }}
          />
        </div>

        <div className="mt-4">
          <SectionCard
            title="Hiring pace vs. unit growth"
            subtitle="Assistants hired each month against net-new units added — hiring needs to track slightly
              ahead of demand to keep the bench buffer and backup coverage intact."
            rows={data.hiringVsDemandTrend}
            chart={{
              kind: 'comparisonBarTrend',
              series: [
                { key: 'unitsAdded', label: 'Units added', color: 'var(--series-1)' },
                { key: 'assistantsHired', label: 'Assistants hired', color: 'var(--series-3)' },
              ],
              format: 'count',
            }}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard
            title="Available (bench) capacity, by segment"
            subtitle="Averaged across the selected window."
            rows={data.availableCapacityBySegmentMonthly}
            chart={{
              kind: 'categoryBreakdown',
              series: [
                { key: 'Fractional', label: 'Fractional' },
                { key: 'Full-Time', label: 'Full-Time' },
                { key: 'Enterprise', label: 'Enterprise' },
              ],
              agg: 'avg',
              format: 'hrs',
            }}
          />
          <SectionCard
            title="Available (bench) capacity, by assistant time zone"
            subtitle="Placeholder pending confirmation we track assistant time zone today. Averaged across the selected window."
            rows={data.availableCapacityByTimeZoneMonthly}
            chart={{
              kind: 'categoryBreakdown',
              series: [
                { key: 'US Eastern', label: 'US Eastern' },
                { key: 'US Central', label: 'US Central' },
                { key: 'US Pacific', label: 'US Pacific' },
                { key: 'GMT-6 (Guatemala)', label: 'GMT-6 (Guatemala)' },
                { key: 'GMT+8 (Philippines)', label: 'GMT+8 (Philippines)' },
                { key: 'GMT+3 (Kenya)', label: 'GMT+3 (Kenya)' },
              ],
              agg: 'avg',
              format: 'hrs',
              horizontal: true,
            }}
          />
        </div>

        <div className="mt-4">
          <SectionCard
            title="Hiring lead time trend"
            subtitle="Weeks a hire needs to start ahead of the revenue they'll support."
            rows={data.hiringLeadTimeTrend}
            chart={{ kind: 'trend', format: 'count', color: 'var(--series-4)' }}
          />
        </div>

        <div className="mt-4">
          <h2 className="mb-2 text-sm font-medium text-[var(--text-primary)]">Delivery center detail</h2>
          <DataTable
            caption="Headcount and attrition by delivery center"
            rows={data.headcountByRegion}
            columns={[
              { header: 'Center', accessor: (r) => `${r.region} — ${REGION_LABELS[r.region]}` },
              { header: 'Active', accessor: (r) => count(r.active), align: 'right' },
              { header: 'Bench', accessor: (r) => count(r.bench), align: 'right' },
              { header: 'In training', accessor: (r) => count(r.inTraining), align: 'right' },
              {
                header: 'Attrition',
                accessor: (r) => <Badge status={attritionStatus(r.attritionRatePct)}>{pct(r.attritionRatePct)}</Badge>,
                align: 'right',
              },
            ]}
          />
        </div>
      </div>
    </RangeProvider>
  );
}
