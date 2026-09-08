import { prisma } from '@/lib/db';
import { getUtilizationSummary as getMockUtilizationSummary } from '@/lib/mock-data';
import type { DeliveryRegion, Filters, UtilizationSummary } from '@/lib/types';

const USE_MOCK_DATA = process.env.USE_MOCK_DATA !== 'false';

/**
 * Utilization & delivery-cost summary — hours billed vs. hours actually
 * delivered per Time Doctor, the clearest early-warning signal for churn risk
 * (a client paying for 4 units but only receiving 2.5 units of delivered work).
 */
export async function getUtilizationSummary(_filters?: Partial<Filters>): Promise<UtilizationSummary> {
  if (USE_MOCK_DATA) return getMockUtilizationSummary();

  const [snapshots, trendRows] = await Promise.all([
    prisma.utilizationSnapshot.findMany({
      orderBy: { periodStart: 'desc' },
      take: 200,
    }),
    prisma.monthlyMetric.findMany({
      where: { metric: 'utilization_pct', dimensions: '{}' },
      orderBy: { month: 'asc' },
      take: 12,
    }),
  ]);

  const hoursIncludedTotal = snapshots.reduce((s, r) => s + r.hoursIncluded, 0);
  const hoursDeliveredTotal = snapshots.reduce((s, r) => s + r.hoursDelivered, 0);
  const overallUtilizationPct = hoursIncludedTotal ? (hoursDeliveredTotal / hoursIncludedTotal) * 100 : 0;

  const utilizationTrend = trendRows.map((r) => ({
    label: r.month.toISOString().slice(0, 7),
    value: r.value,
  }));

  const byRegion = new Map<string, { hoursIncluded: number; hoursDelivered: number }>();
  for (const s of snapshots) {
    if (!s.deliveryRegion) continue;
    const cur = byRegion.get(s.deliveryRegion) ?? { hoursIncluded: 0, hoursDelivered: 0 };
    cur.hoursIncluded += s.hoursIncluded;
    cur.hoursDelivered += s.hoursDelivered;
    byRegion.set(s.deliveryRegion, cur);
  }
  const utilizationByRegion = Array.from(byRegion.entries()).map(([region, v]) => ({
    region: region as DeliveryRegion,
    hoursIncluded: v.hoursIncluded,
    hoursDelivered: v.hoursDelivered,
    utilizationPct: v.hoursIncluded ? (v.hoursDelivered / v.hoursIncluded) * 100 : 0,
  }));

  return {
    overallUtilizationPct,
    utilizationDeltaPct: 0, // TODO: prior-period comparison once >=2 months of snapshots exist
    hoursIncludedTotal,
    hoursDeliveredTotal,
    utilizationTrend,
    utilizationByRegion,
    utilizationByTier: [], // TODO: join UtilizationSnapshot -> Unit.tier once snapshots carry clientId consistently
    atRiskClients: [], // TODO: snapshots grouped by client, filtered utilizationPct < threshold (e.g. 70%)
    overUtilizedClients: [], // TODO: snapshots grouped by client, filtered utilizationPct > threshold (e.g. 100%)
    costPerDeliveredHourByRegion: [], // TODO: FinancialStatementLine payroll-by-region / hoursDelivered-by-region
    nonBilledBreakdown: [], // TODO: needs Time Doctor to tag non-billed hours as Admin/Hold/Unused — confirm with Phil whether that tagging exists today
    utilizationByRegionMonthly: [], // TODO: group UtilizationSnapshot by month + region once snapshots reliably carry both
    costPerDeliveredHourByRegionMonthly: [], // TODO: same FinancialStatementLine dependency as costPerDeliveredHourByRegion, applied per month
    nonBilledBreakdownMonthly: [], // TODO: same Time Doctor tagging dependency as nonBilledBreakdown above, applied per month
  };
}
