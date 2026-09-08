import { prisma } from '@/lib/db';
import { getRevenueSummary as getMockRevenueSummary } from '@/lib/mock-data';
import type { Filters, RevenueSummary, Tier } from '@/lib/types';

const USE_MOCK_DATA = process.env.USE_MOCK_DATA !== 'false';

/**
 * Revenue & unit-economics summary.
 *
 * Mock mode returns realistic generated data so the dashboard is fully
 * interactive with zero setup. Live mode reads current state from Units/
 * Opportunities (synced from Salesforce + QuickBooks — see lib/integrations/)
 * and trend lines from the MonthlyMetric rollup table the nightly sync job
 * writes to (see scripts/sync-all.ts).
 */
export async function getRevenueSummary(_filters?: Partial<Filters>): Promise<RevenueSummary> {
  if (USE_MOCK_DATA) return getMockRevenueSummary();

  const [activeUnits, mrrTrendRows, tierRows, topClients, bookingsByStage] = await Promise.all([
    prisma.unit.findMany({ where: { status: 'active' } }),
    prisma.monthlyMetric.findMany({
      where: { metric: 'mrr', dimensions: '{}' },
      orderBy: { month: 'asc' },
      take: 18,
    }),
    prisma.unit.groupBy({
      by: ['tier'],
      where: { status: 'active' },
      _count: { _all: true },
      _sum: { monthlyRate: true },
    }),
    prisma.client.findMany({
      take: 10,
      include: { units: { where: { status: 'active' } } },
    }),
    prisma.opportunity.groupBy({
      by: ['stage'],
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  const mrr = activeUnits.reduce((sum, u) => sum + u.monthlyRate, 0);
  const mrrTrend = mrrTrendRows.map((r) => ({
    label: r.month.toISOString().slice(0, 7),
    value: r.value,
  }));
  const prevMrr = mrrTrend.length > 1 ? mrrTrend[mrrTrend.length - 2].value : mrr;

  const unitsByTier = tierRows.map((r) => ({
    tier: r.tier as Tier,
    units: r._count._all,
    mrr: r._sum.monthlyRate ?? 0,
  }));

  const topClientsByRevenue = topClients
    .map((c) => ({
      client: c.name,
      mrr: c.units.reduce((s, u) => s + u.monthlyRate, 0),
      tier: (c.units[0]?.tier ?? 'Fractional') as Tier,
      segment: (c.segment ?? 'Small Business') as RevenueSummary['topClientsByRevenue'][number]['segment'],
    }))
    .sort((a, b) => b.mrr - a.mrr);

  const arpu = topClients.length ? mrr / topClients.length : 0;
  const avgRevenuePerUnit = activeUnits.length ? mrr / activeUnits.length : 0;

  return {
    mrr,
    arr: mrr * 12,
    mrrDeltaPct: prevMrr ? ((mrr - prevMrr) / prevMrr) * 100 : 0,
    activeUnits: activeUnits.length,
    activeUnitsDeltaPct: 0, // requires a prior-period unit count snapshot; see MonthlyMetric "active_units"
    avgRevenuePerClient: arpu,
    arpu,
    avgRevenuePerUnit,
    netRevenueRetentionPct: 0, // TODO: compute from cohort-over-cohort MRR once >=13mo of live data exists
    churnRatePct: 0, // TODO: requires unit-status-change history; see IntegrationCredential/SyncRun once Time Doctor + Salesforce churn events are synced
    newUnitsThisPeriod: 0, // TODO: count Unit rows created this period once sync writes createdAt reliably from source system timestamps
    churnedUnitsThisPeriod: 0, // TODO: count Unit rows with status 'cancelled' and endDate in this period
    netNewUnitsThisPeriod: 0,
    mrrMovement: {
      startingMrr: prevMrr,
      newMrr: 0,
      expansionMrr: 0,
      churnedMrr: 0,
      contractionMrr: 0,
      endingMrr: mrr,
    }, // TODO: derive from Unit status-change events once the sync job tracks them
    dailyActivity: [], // TODO: populate from a Unit/Opportunity change-event log once the nightly sync writes one
    mrrTrend,
    mrrTrendByTier: [], // TODO: needs a monthly, tier-dimensioned MonthlyMetric rollup ("mrr" by tier) — not written by the sync job yet
    unitsByTier,
    revenueByRegionOfClient: [], // TODO: populate once Client.region is backfilled from Salesforce
    topClientsByRevenue,
    bookingsByStage: bookingsByStage.map((b) => ({
      stage: b.stage,
      amount: b._sum.amount ?? 0,
      count: b._count._all,
    })),
    unitAgeProfile: [], // TODO: bucket Unit.createdAt -> now once createdAt is reliably backfilled from source systems
    salesPipelineTrend: [], // TODO: needs a sales-targets/quota source — not yet identified (see feature backlog)
    unitsByTierMonthly: [], // TODO: needs a monthly, tier-dimensioned MonthlyMetric rollup, same as mrrTrendByTier above
    bookingsByStageMonthly: [], // TODO: needs a monthly Opportunity-stage rollup rather than the current snapshot groupBy
    unitAgeProfileMonthly: [], // TODO: same Unit.createdAt backfill dependency as unitAgeProfile above, applied per month
  };
}
