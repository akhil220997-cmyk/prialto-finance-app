import { getRevenueSummary } from '@/lib/queries/revenue';
import { FilterBar } from '@/components/ui/FilterBar';
import { StatTile } from '@/components/ui/StatTile';
import { CategoryBarChart } from '@/components/charts/CategoryBarChart';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { RangeProvider, PageRangeBar } from '@/components/dashboard/RangeContext';
import type { ActivityType } from '@/lib/types';

import { usd, usdCompact } from '@/lib/format';

const signedCount = (v: number) => `${v >= 0 ? '+' : ''}${v.toLocaleString()}`;
const signedUsd = (v: number) => `${v >= 0 ? '+' : '-'}$${Math.abs(Math.round(v)).toLocaleString()}`;

const ACTIVITY_BADGE: Record<ActivityType, 'good' | 'warning' | 'critical'> = {
  new_unit: 'good',
  upsell: 'good',
  downgrade: 'warning',
  churn: 'critical',
};

const TIER_SERIES = [
  { key: 'Fractional', label: 'Fractional' },
  { key: 'Full-Time', label: 'Full-Time' },
  { key: 'Enterprise', label: 'Enterprise' },
];

export const dynamic = 'force-dynamic';

export default async function RevenuePage() {
  const data = await getRevenueSummary();

  return (
    <RangeProvider>
      <div>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Revenue &amp; Unit Economics</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          MRR/ARR, Prialto Unit mix, and pipeline — synced from Salesforce (bookings) and QuickBooks (realized revenue).
        </p>

        <div className="mt-6">
          <FilterBar />
        </div>
        <PageRangeBar months={data.mrrTrend.map((p) => p.label)} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="MRR"
            value={usd(data.mrr)}
            deltaPct={data.mrrDeltaPct}
            sparklineData={data.mrrTrend.slice(-12).map((p) => p.value)}
          />
          <StatTile label="ARR (run-rate)" value={usd(data.arr)} />
          <StatTile label="Active Units" value={data.activeUnits.toLocaleString()} deltaPct={data.activeUnitsDeltaPct} />
          <StatTile label="Net Revenue Retention" value={`${data.netRevenueRetentionPct.toFixed(1)}%`} hint="Trailing 12 months" />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatTile label="ARPU" value={usd(data.arpu)} hint="Avg. revenue per active client" />
          <StatTile label="Avg. Revenue / Unit" value={usd(data.avgRevenuePerUnit)} hint="MRR ÷ active Prialto Units" />
          <StatTile
            label="Net New Units"
            value={signedCount(data.netNewUnitsThisPeriod)}
            hint={`${data.newUnitsThisPeriod} added, ${data.churnedUnitsThisPeriod} churned`}
          />
          <StatTile
            label="Churn Rate"
            value={`${data.churnRatePct.toFixed(1)}%`}
            hint={`${data.churnedUnitsThisPeriod} units churned this month`}
          />
          <StatTile label="New Units Added" value={data.newUnitsThisPeriod.toLocaleString()} hint="This month" />
        </div>

        <div className="hover-card mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <h2 className="text-sm font-medium text-[var(--text-primary)]">MRR movement</h2>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            How MRR moved this month — new business, expansion, contraction, and churn. (Reflects the latest month;
            not yet windowed to a custom range.)
          </p>
          <div className="mt-3">
            <CategoryBarChart
              data={[
                { name: 'New', value: data.mrrMovement.newMrr },
                { name: 'Expansion', value: data.mrrMovement.expansionMrr },
                { name: 'Contraction', value: data.mrrMovement.contractionMrr },
                { name: 'Churn', value: data.mrrMovement.churnedMrr },
              ]}
              format="usdCompact"
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SectionCard
              title="MRR trend, by tier"
              subtitle="Stacked so both the total and the tier mix are visible at once."
              rows={data.mrrTrendByTier}
              chart={{ kind: 'stackedBar', series: TIER_SERIES, format: 'usdCompact' }}
            />
          </div>
          <SectionCard
            title="MRR by tier"
            subtitle="Same tier split, aggregated across the selected range."
            rows={data.mrrTrendByTier}
            chart={{ kind: 'donutBreakdown', series: TIER_SERIES, agg: 'last', format: 'usdCompact' }}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard
            title="Units by tier"
            rows={data.unitsByTierMonthly}
            chart={{ kind: 'categoryBreakdown', series: TIER_SERIES, agg: 'last', format: 'count' }}
          />
          <SectionCard
            title="Pipeline by stage (Salesforce)"
            rows={data.bookingsByStageMonthly}
            chart={{
              kind: 'categoryBreakdown',
              series: [
                { key: 'Prospecting', label: 'Prospecting' },
                { key: 'Proposal', label: 'Proposal' },
                { key: 'Negotiation', label: 'Negotiation' },
                { key: 'Closed Won', label: 'Closed Won' },
              ],
              agg: 'last',
              format: 'usdCompact',
              horizontal: true,
            }}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard
            title="Active units by age"
            subtitle="Tenure profile of the active base. Bucket boundaries are a placeholder pending
              the leadership slide Phil referenced — swap once we have his convention."
            rows={data.unitAgeProfileMonthly}
            chart={{
              kind: 'categoryBreakdown',
              series: [
                { key: '0-3 months', label: '0-3 months' },
                { key: '3-6 months', label: '3-6 months' },
                { key: '6-12 months', label: '6-12 months' },
                { key: '1-2 years', label: '1-2 years' },
                { key: '2-3 years', label: '2-3 years' },
                { key: '3+ years', label: '3+ years' },
              ],
              agg: 'last',
              format: 'count',
            }}
          />
          <SectionCard
            title="Sales pipeline vs. target"
            subtitle="Placeholder target line pending confirmation of where quotas actually live (Salesforce field vs. a spreadsheet)."
            rows={data.salesPipelineTrend}
            chart={{
              kind: 'comparisonBarTrend',
              series: [
                { key: 'pipeline', label: 'Pipeline', color: 'var(--series-1)' },
                { key: 'target', label: 'Target', color: 'var(--series-5)' },
              ],
              format: 'usdCompact',
            }}
          />
        </div>

        <div className="mt-4">
          <h2 className="mb-2 text-sm font-medium text-[var(--text-primary)]">Top clients by MRR</h2>
          <DataTable
            caption="Top clients by monthly recurring revenue"
            rows={data.topClientsByRevenue}
            columns={[
              { header: 'Client', accessor: (r) => r.client },
              { header: 'Tier', accessor: (r) => r.tier },
              { header: 'Segment', accessor: (r) => r.segment },
              { header: 'MRR', accessor: (r) => usd(r.mrr), align: 'right' },
            ]}
          />
        </div>

        <div className="mt-4">
          <h2 className="mb-2 text-sm font-medium text-[var(--text-primary)]">Daily activity — last 30 days</h2>
          <p className="mb-2 text-xs text-[var(--text-secondary)]">
            Unit-level changes as they happen — new units, upgrades, downgrades, and churn.
          </p>
          <DataTable
            caption="Daily unit activity for the last 30 days"
            rows={data.dailyActivity}
            columns={[
              { header: 'Date', accessor: (r) => r.date },
              { header: 'Event', accessor: (r) => <Badge status={ACTIVITY_BADGE[r.type]}>{r.label}</Badge> },
              { header: 'Client', accessor: (r) => r.client },
              { header: 'MRR Impact', accessor: (r) => signedUsd(r.mrrImpact), align: 'right' },
            ]}
          />
        </div>
      </div>
    </RangeProvider>
  );
}
