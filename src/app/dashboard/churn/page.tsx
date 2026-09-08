import { getChurnSummary } from '@/lib/queries/churn';
import { REGION_LABELS } from '@/lib/types';
import { FilterBar } from '@/components/ui/FilterBar';
import { StatTile } from '@/components/ui/StatTile';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { RangeProvider, PageRangeBar } from '@/components/dashboard/RangeContext';

import { usd, pct, count } from '@/lib/format';

export const dynamic = 'force-dynamic';

function watchlistStatus(utilizationPct: number): 'warning' | 'critical' {
  return utilizationPct < 60 ? 'critical' : 'warning';
}

const CHURN_TEAMS = ['Team Ironwood', 'Team Cascade', 'Team Redwood', 'Team Summit', 'Team Harbor', 'Team Alder'];

export default async function ChurnPage() {
  const data = await getChurnSummary();

  return (
    <RangeProvider>
      <div>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Churn</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Deep churn breakdown — by service segment, by assigned delivery team, by delivery center,
          and by how long the unit had been active when it churned. Built at Phil's request for the
          Aug 17 leadership sync.
        </p>

        <div className="mt-6">
          <FilterBar />
        </div>
        <PageRangeBar months={data.churnTrend.map((p) => p.label)} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Monthly Churn Rate"
            value={pct(data.monthlyChurnRatePct)}
            deltaPct={data.monthlyChurnRatePctDeltaPct}
            deltaGoodDirection="down"
            sparklineData={data.churnTrend.slice(-12).map((p) => p.value)}
            sparklineColor="var(--status-critical)"
          />
          <StatTile label="Units Churned" value={count(data.unitsChurnedThisPeriod)} hint="This month" />
          <StatTile label="MRR Churned" value={usd(data.mrrChurnedThisPeriod)} hint="This month" />
          <StatTile
            label="Avg. Tenure at Churn"
            value={`${Math.round(data.avgTenureAtChurnDays / 30)} months`}
            hint={`${data.avgTenureAtChurnDays} days`}
          />
        </div>

        <div className="mt-6">
          <SectionCard
            title="Churn rate trend"
            rows={data.churnTrend}
            chart={{ kind: 'trend', format: 'pct', color: 'var(--status-critical)' }}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard
            title="Units churned, by segment"
            subtitle="Summed across the selected range. See the detail table below for the latest-period churn rate by segment."
            rows={data.bySegmentMonthly}
            chart={{
              kind: 'categoryBreakdown',
              series: [
                { key: 'FTD', label: 'FTD' },
                { key: 'Fractional', label: 'Fractional' },
                { key: 'Enterprise', label: 'Enterprise' },
              ],
              agg: 'sum',
              format: 'count',
            }}
          />
          <SectionCard
            title="Units churned, by delivery center"
            subtitle="Summed across the selected range. See the detail table below for the latest-period churn rate by center."
            rows={data.byCenterMonthly}
            chart={{
              kind: 'categoryBreakdown',
              series: [
                { key: 'GT', label: `GT — ${REGION_LABELS.GT}` },
                { key: 'PH', label: `PH — ${REGION_LABELS.PH}` },
                { key: 'KE', label: `KE — ${REGION_LABELS.KE}` },
              ],
              agg: 'sum',
              format: 'count',
            }}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard
            title="Units churned, by assigned delivery team"
            rows={data.byTeamMonthly}
            chart={{
              kind: 'categoryBreakdown',
              series: CHURN_TEAMS.map((team) => ({ key: team, label: team })),
              agg: 'sum',
              format: 'count',
              horizontal: true,
            }}
          />
          <SectionCard
            title="Churn, by tenure at churn"
            subtitle="How long the unit had been active when it churned — the age-bracket view Akhil asked for."
            rows={data.byAgeBracketMonthly}
            chart={{
              kind: 'categoryBreakdown',
              series: [
                { key: '<90 days', label: '<90 days' },
                { key: '90-180 days', label: '90-180 days' },
                { key: '180-365 days', label: '180-365 days' },
                { key: '1-2 years', label: '1-2 years' },
                { key: '2-3 years', label: '2-3 years' },
                { key: '3+ years', label: '3+ years' },
              ],
              agg: 'sum',
              format: 'count',
              horizontal: true,
            }}
          />
        </div>

        <div className="mt-4">
          <h2 className="mb-2 text-sm font-medium text-[var(--text-primary)]">Detail by breakdown</h2>
          <p className="mb-2 text-xs text-[var(--text-secondary)]">
            Latest-period churn rate by breakdown — not yet windowed to the range controls above (rate needs an
            active-base denominator per window, which isn't wired up yet).
          </p>
          <DataTable
            caption="Churn detail by segment, team, and center"
            rows={[
              ...data.bySegment.map((s) => ({ dimension: 'Segment', label: s.segment, unitsChurned: s.unitsChurned, churnRatePct: s.churnRatePct })),
              ...data.byTeam.map((t) => ({ dimension: 'Team', label: t.team, unitsChurned: t.unitsChurned, churnRatePct: t.churnRatePct })),
              ...data.byCenter.map((c) => ({ dimension: 'Center', label: `${c.region} — ${REGION_LABELS[c.region]}`, unitsChurned: c.unitsChurned, churnRatePct: c.churnRatePct })),
            ]}
            columns={[
              { header: 'Breakdown', accessor: (r) => r.dimension },
              { header: 'Segment / Team / Center', accessor: (r) => r.label },
              { header: 'Units Churned', accessor: (r) => count(r.unitsChurned), align: 'right' },
              { header: 'Churn Rate', accessor: (r) => pct(r.churnRatePct), align: 'right' },
            ]}
          />
        </div>

        <div className="mt-4">
          <h2 className="mb-2 text-sm font-medium text-[var(--text-primary)]">At-risk watchlist</h2>
          <p className="mb-2 text-xs text-[var(--text-secondary)]">
            Clients showing the same low-utilization pattern that historically precedes churn.
          </p>
          <DataTable
            caption="Clients at risk of churning, based on utilization pattern"
            rows={data.atRiskWatchlist}
            columns={[
              { header: 'Client', accessor: (r) => r.client },
              { header: 'Segment', accessor: (r) => r.segment },
              { header: 'Team', accessor: (r) => r.team },
              { header: 'Center', accessor: (r) => r.region },
              { header: 'Tenure', accessor: (r) => `${Math.round(r.tenureDays / 30)} mo`, align: 'right' },
              {
                header: 'Utilization',
                accessor: (r) => <Badge status={watchlistStatus(r.utilizationPct)}>{pct(r.utilizationPct)}</Badge>,
                align: 'right',
              },
            ]}
          />
        </div>
      </div>
    </RangeProvider>
  );
}
