// Deterministic mock data generator.
//
// Used whenever USE_MOCK_DATA=true (the default) so the app is fully interactive
// and demo-able before any real Salesforce/QuickBooks/Time Doctor credentials
// exist. Numbers are shaped to be *directionally* consistent with Prialto's public
// unit-economics (the "Prialto Unit" = 55 hrs/mo, three delivery regions, roughly
// $38M -> $101M ARR growth 2023-2024 per third-party estimates) — they are NOT real
// financial data. Swap USE_MOCK_DATA=false + real credentials to replace this
// entirely with live-synced numbers (see lib/queries/*.ts).

import type {
  ActivityEvent,
  ActivityType,
  CapacityStaffingSummary,
  ChurnAgeBracket,
  ChurnSegment,
  ChurnSummary,
  DeliveryRegion,
  FinancialsSummary,
  RegionHeadcount,
  RevenueSummary,
  Segment,
  Tier,
  TrainingStage,
  UtilizationSummary,
  VarianceDataset,
} from './types';
import { REGION_LABELS } from './types';

// Simple seeded PRNG (mulberry32) so numbers are stable across requests/renders.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(1104);

// Shared helper: turns one "current" breakdown (a set of categories with
// known shares of some total) into a full monthly history, by re-weighting
// the shares with a little month-to-month jitter and applying them against
// a per-month total. This is the exact pattern the original mrrTrendByTier
// used (tier shares wiggling slightly around the real mix, renormalized so
// they always sum back to that month's true total) — generalized here so
// every breakdown chart on every dashboard can be windowed/recomputed for
// whatever date range someone picks, not just MRR-by-tier.
//
// Returned rows are `{ label: "2026-03", ...categoryKey: number }` — see
// the MonthlyCategoryRow note in src/lib/rangeAggregate.ts for why the
// shape is `[key: string]: string | number` rather than a plain
// `Record<string, number>` intersection.
function monthlyBreakdown(
  months: string[],
  categories: { key: string; share: number }[],
  totalByMonth: number[],
  jitterAmt = 0.08,
): { label: string; [key: string]: string | number }[] {
  return months.map((label, i) => {
    const jitter = categories.map(() => 1 + (rand() - 0.5) * jitterAmt);
    const weighted = categories.map((c, idx) => c.share * jitter[idx]);
    const weightSum = weighted.reduce((s, w) => s + w, 0);
    const shares = weighted.map((w) => w / weightSum);
    const row: { label: string; [key: string]: string | number } = { label };
    categories.forEach((c, idx) => {
      row[c.key] = Math.round((totalByMonth[i] ?? 0) * shares[idx]);
    });
    return row;
  });
}

// Same idea, but for "breakdown by dimension" charts (headcount by region,
// hours billed vs delivered by region) where each month has its own
// multi-series row per dimension value, not a single flat category value.
function monthlyDimensionBreakdown(
  months: string[],
  dims: { key: string; share: number }[],
  seriesTotalsByMonth: { key: string; totalByMonth: number[] }[],
  jitterAmt = 0.08,
): { month: string; rows: { dim: string; [key: string]: string | number }[] }[] {
  return months.map((month, i) => ({
    month,
    rows: dims.map((d) => {
      const row: { dim: string; [key: string]: string | number } = { dim: d.key };
      for (const series of seriesTotalsByMonth) {
        const jitter = 1 + (rand() - 0.5) * jitterAmt;
        row[series.key] = Math.round((series.totalByMonth[i] ?? 0) * d.share * jitter);
      }
      return row;
    }),
  }));
}

const TIERS: Tier[] = ['Fractional', 'Full-Time', 'Enterprise'];
// Delivery center codes — GT (Guatemala), PH (Philippines), KE (Kenya) — the
// internal shorthand Prialto uses day to day, never the city/country name.
const REGIONS: DeliveryRegion[] = ['GT', 'PH', 'KE'];
const SEGMENTS: Segment[] = ['Individual', 'Small Business', 'Enterprise'];

const CLIENT_NAMES = [
  'Meridian Capital Advisors', 'Northgate Realty Group', 'Bluewater Consulting',
  'Harborview Financial', 'Summit Peak Nonprofit', 'Cascade Tax & Accounting',
  'Ironwood Partners', 'Silverline Wealth Mgmt', 'Redwood Ventures', 'Pacific Rim Logistics',
  'Alder Street Law', 'Beacon Hill Insurance', 'Crestline Realty', 'Elm & Oak Advisory',
  'Foxglove Nonprofit Alliance', 'Granite Peak Capital', 'Hawthorne Consulting',
  'Ivywood Family Office', 'Juniper Health Systems', 'Kestrel Financial Group',
];

function monthLabels(n: number): string[] {
  const labels: string[] = [];
  const now = new Date(2026, 7, 1); // Aug 2026
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return labels;
}

// ARR trend: ~$19M (Apr 2021) -> ~$38M (2023) -> ~$101M (end 2024) -> continued
// growth into 2026, tapering slightly as the base gets bigger.
function arrTrend(months: string[]): number[] {
  const arr: number[] = [];
  let base = 101_300_000; // Dec 2024 anchor
  // walk backward from a known point isn't needed here — just build forward curve.
  let v = 108_000_000; // Jan of trend window, approx
  for (let i = 0; i < months.length; i++) {
    const monthly = i === 0 ? 0 : 0.006 + rand() * 0.01; // ~0.6%-1.6% MoM growth, decelerating
    v = i === 0 ? v : v * (1 + monthly);
    arr.push(Math.round(v));
  }
  return arr;
}

export function getRevenueSummary(): RevenueSummary {
  const months = monthLabels(18);
  const arr = arrTrend(months);
  const mrrTrend = months.map((label, i) => ({ label, value: Math.round(arr[i] / 12) }));
  const mrr = mrrTrend[mrrTrend.length - 1].value;
  const prevMrr = mrrTrend[mrrTrend.length - 2].value;
  const arrNow = arr[arr.length - 1];

  const activeUnits = Math.round(arrNow / (12 * 1750)); // blended ~$1,750/unit/mo
  const prevUnits = Math.round(arr[arr.length - 2] / (12 * 1750));

  const tierMix: { tier: Tier; share: number; rate: number }[] = [
    { tier: 'Fractional', share: 0.35, rate: 1600 },
    { tier: 'Full-Time', share: 0.4, rate: 1500 },
    { tier: 'Enterprise', share: 0.25, rate: 1350 },
  ];
  const unitsByTier = tierMix.map((t) => {
    const units = Math.round(activeUnits * t.share);
    return { tier: t.tier, units, mrr: Math.round(units * t.rate) };
  });

  const regionShare: { region: string; share: number }[] = [
    { region: 'North America', share: 0.62 },
    { region: 'EMEA', share: 0.18 },
    { region: 'LATAM', share: 0.12 },
    { region: 'APAC', share: 0.08 },
  ];
  const revenueByRegionOfClient = regionShare.map((r) => ({
    region: r.region,
    mrr: Math.round(mrr * r.share),
  }));

  const topClientsByRevenue = CLIENT_NAMES.slice(0, 10)
    .map((client) => {
      const tier = TIERS[Math.floor(rand() * TIERS.length)];
      const segment = SEGMENTS[Math.floor(rand() * SEGMENTS.length)];
      const units = 1 + Math.floor(rand() * 12);
      const rate = tier === 'Enterprise' ? 1350 : tier === 'Fractional' ? 1600 : 1500;
      return { client, mrr: units * rate, tier, segment };
    })
    .sort((a, b) => b.mrr - a.mrr);

  const bookingsByStage = [
    { stage: 'Prospecting', amount: 1_450_000, count: 34 },
    { stage: 'Proposal', amount: 890_000, count: 19 },
    { stage: 'Negotiation', amount: 520_000, count: 11 },
    { stage: 'Closed Won', amount: 610_000, count: 14 },
  ];

  // Age/tenure profile of active units — placeholder bucket boundaries until
  // we have Phil's actual leadership slide to match his convention against.
  const ageShape = [0.16, 0.19, 0.22, 0.24, 0.12, 0.07]; // skews toward newer units, consistent with a growing base
  const ageBrackets = ['0-3 months', '3-6 months', '6-12 months', '1-2 years', '2-3 years', '3+ years'];
  const unitAgeProfile = ageBrackets.map((bracket, i) => ({
    bracket,
    units: Math.round(activeUnits * ageShape[i]),
  }));

  // Sales pipeline vs. near-term targets — target is a placeholder (~8% MoM
  // growth on pipeline) until we confirm where quotas actually live.
  const salesPipelineTrend = months.slice(-12).map((label, i) => {
    const basePipeline = 2_400_000 * (1 + i * 0.025) * (0.94 + rand() * 0.12);
    const target = 2_500_000 * (1 + i * 0.028);
    return { label, pipeline: Math.round(basePipeline), target: Math.round(target) };
  });

  const activeClientCount = 340; // rough, matches avgRevenuePerClient below
  const arpu = Math.round(mrr / activeClientCount);
  const avgRevenuePerUnit = Math.round(mrr / activeUnits);

  // Monthly-granular versions of the breakdown charts above, so every chart
  // on the page — not just the trend lines — can be recomputed for
  // whatever date range someone picks (see monthlyBreakdown's docstring).
  const activeUnitsTrend = arr.map((a) => Math.round(a / (12 * 1750)));
  const unitsByTierMonthly = monthlyBreakdown(
    months,
    tierMix.map((t) => ({ key: t.tier, share: t.share })),
    activeUnitsTrend,
  );
  const BOOKINGS_TOTAL_NOW = 1_450_000 + 890_000 + 520_000 + 610_000;
  const bookingsTotalTrend = arr.map((a) => Math.round(BOOKINGS_TOTAL_NOW * (a / arrNow)));
  const bookingsByStageMonthly = monthlyBreakdown(
    months,
    [
      { key: 'Prospecting', share: 1_450_000 / BOOKINGS_TOTAL_NOW },
      { key: 'Proposal', share: 890_000 / BOOKINGS_TOTAL_NOW },
      { key: 'Negotiation', share: 520_000 / BOOKINGS_TOTAL_NOW },
      { key: 'Closed Won', share: 610_000 / BOOKINGS_TOTAL_NOW },
    ],
    bookingsTotalTrend,
  );
  const unitAgeProfileMonthly = monthlyBreakdown(
    months,
    ageBrackets.map((bracket, i) => ({ key: bracket, share: ageShape[i] })),
    activeUnitsTrend,
  );

  // MRR trend split by tier — same tier shares as unitsByTier/tierMix,
  // walked back across the trend window with a little month-to-month jitter
  // so the mix isn't perfectly static, then renormalized so tiers sum back
  // to that month's total MRR exactly.
  const mrrTrendByTier = mrrTrend.map(({ label, value }) => {
    const jitter = tierMix.map(() => 1 + (rand() - 0.5) * 0.1);
    const weighted = tierMix.map((t, i) => t.share * jitter[i]);
    const weightSum = weighted.reduce((s, w) => s + w, 0);
    const shares = weighted.map((w) => w / weightSum);
    return {
      label,
      Fractional: Math.round(value * shares[0]),
      'Full-Time': Math.round(value * shares[1]),
      Enterprise: Math.round(value * shares[2]),
    };
  });

  // Churn / new-unit-add mechanics — reconciled so churn + new adds explain the
  // month-over-month net change in active units (netNewUnits = activeUnits - prevUnits).
  const churnRatePct = Math.round((2.1 + rand() * 1.4) * 10) / 10; // ~2.1%-3.5% monthly, unit-based
  const churnedUnitsThisPeriod = Math.max(1, Math.round(prevUnits * (churnRatePct / 100)));
  const netNewUnitsThisPeriod = activeUnits - prevUnits;
  const newUnitsThisPeriod = Math.max(0, netNewUnitsThisPeriod + churnedUnitsThisPeriod);

  const blendedRate = Math.round(mrr / activeUnits);
  const newMrr = Math.round(newUnitsThisPeriod * blendedRate * (0.92 + rand() * 0.12));
  const churnedMrr = -Math.round(churnedUnitsThisPeriod * blendedRate * (0.9 + rand() * 0.15));
  const expansionMrr = Math.round(mrr * (0.01 + rand() * 0.012)); // existing clients adding units/upgrading tier
  const contractionMrr = -Math.round(mrr * (0.004 + rand() * 0.008)); // existing clients trimming units
  const mrrMovement = {
    startingMrr: prevMrr,
    newMrr,
    expansionMrr,
    churnedMrr,
    contractionMrr,
    endingMrr: prevMrr + newMrr + expansionMrr + churnedMrr + contractionMrr,
  };

  // Daily activity feed — last ~30 days of unit-level changes, the "what changed
  // today" view behind the monthly MRR movement above.
  const ACTIVITY_WEIGHTS: { type: ActivityType; label: string; weight: number }[] = [
    { type: 'new_unit', label: 'New unit added', weight: 0.38 },
    { type: 'upsell', label: 'Upgraded tier', weight: 0.28 },
    { type: 'downgrade', label: 'Downgraded tier', weight: 0.16 },
    { type: 'churn', label: 'Unit churned', weight: 0.18 },
  ];
  function pickActivity() {
    const r = rand();
    let acc = 0;
    for (const a of ACTIVITY_WEIGHTS) {
      acc += a.weight;
      if (r <= acc) return a;
    }
    return ACTIVITY_WEIGHTS[0];
  }
  const today = new Date(2026, 7, 14); // matches monthLabels' "now" anchor
  const dailyActivity: ActivityEvent[] = Array.from({ length: 26 }, () => {
    const daysAgo = Math.floor(rand() * 30);
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysAgo);
    const activity = pickActivity();
    const client = CLIENT_NAMES[Math.floor(rand() * CLIENT_NAMES.length)];
    const mrrImpact =
      activity.type === 'new_unit'
        ? Math.round((1 + Math.floor(rand() * 3)) * blendedRate)
        : activity.type === 'churn'
          ? -Math.round((1 + Math.floor(rand() * 2)) * blendedRate)
          : activity.type === 'upsell'
            ? Math.round(400 + rand() * 900)
            : -Math.round(300 + rand() * 700);
    return {
      date: date.toISOString().slice(0, 10),
      type: activity.type,
      label: activity.label,
      client,
      mrrImpact,
    };
  }).sort((a, b) => b.date.localeCompare(a.date));

  return {
    mrr,
    arr: arrNow,
    mrrDeltaPct: ((mrr - prevMrr) / prevMrr) * 100,
    activeUnits,
    activeUnitsDeltaPct: ((activeUnits - prevUnits) / prevUnits) * 100,
    avgRevenuePerClient: arpu,
    arpu,
    avgRevenuePerUnit,
    netRevenueRetentionPct: 108.4,
    churnRatePct,
    newUnitsThisPeriod,
    churnedUnitsThisPeriod,
    netNewUnitsThisPeriod,
    mrrMovement,
    dailyActivity,
    mrrTrend,
    mrrTrendByTier,
    unitsByTier,
    revenueByRegionOfClient,
    topClientsByRevenue,
    bookingsByStage,
    unitAgeProfile,
    salesPipelineTrend,
    unitsByTierMonthly,
    bookingsByStageMonthly,
    unitAgeProfileMonthly,
  };
}

export function getUtilizationSummary(): UtilizationSummary {
  const months = monthLabels(12);
  const utilizationTrend = months.map((label, i) => ({
    label,
    value: Math.round((84 + rand() * 10 + i * 0.15) * 10) / 10,
  }));
  const overallUtilizationPct = utilizationTrend[utilizationTrend.length - 1].value;
  const prev = utilizationTrend[utilizationTrend.length - 2].value;

  const regionRates: Record<DeliveryRegion, { util: number; costPerHour: number }> = {
    GT: { util: 91.2, costPerHour: 9.4 },
    PH: { util: 88.6, costPerHour: 7.1 },
    KE: { util: 85.3, costPerHour: 6.8 },
  };

  const hoursIncludedTotal = 118_500;
  const hoursDeliveredTotal = Math.round(hoursIncludedTotal * (overallUtilizationPct / 100));

  const utilizationByRegion = REGIONS.map((region) => {
    const r = regionRates[region];
    const hoursIncluded = Math.round(hoursIncludedTotal / 3 + (rand() - 0.5) * 4000);
    const hoursDelivered = Math.round(hoursIncluded * (r.util / 100));
    return { region, hoursIncluded, hoursDelivered, utilizationPct: r.util };
  });

  // Monthly-granular versions so "Hours billed vs. delivered by region" and
  // "Non-billed hours by reason" can be recomputed (summed) for any
  // selected window, not just the latest month.
  const hoursIncludedByMonth = months.map((_, i) => Math.round(hoursIncludedTotal * (0.85 + (i / months.length) * 0.3)));
  const hoursDeliveredByMonth = months.map((_, i) => Math.round(hoursIncludedByMonth[i] * (utilizationTrend[i].value / 100)));
  const utilizationByRegionMonthly = months.map((month, i) => ({
    month,
    rows: REGIONS.map((region) => {
      const r = regionRates[region];
      const hoursIncluded = Math.round(hoursIncludedByMonth[i] / 3 + (rand() - 0.5) * 3000);
      const hoursDelivered = Math.round(hoursIncluded * (r.util / 100));
      return { dim: region, hoursIncluded, hoursDelivered };
    }),
  }));
  const costPerDeliveredHourByRegionMonthly = months.map((month) => ({
    month,
    rows: REGIONS.map((region) => ({
      dim: region,
      costPerHour: Math.round(regionRates[region].costPerHour * (0.96 + rand() * 0.08) * 100) / 100,
    })),
  }));

  const utilizationByTier = TIERS.map((tier) => ({
    tier,
    utilizationPct: Math.round((82 + rand() * 14) * 10) / 10,
  }));

  const atRiskClients = CLIENT_NAMES.slice(10, 16).map((client) => {
    const hoursIncluded = 55 * (1 + Math.floor(rand() * 4));
    const utilizationPct = Math.round((55 + rand() * 20) * 10) / 10;
    const hoursDelivered = Math.round(hoursIncluded * (utilizationPct / 100));
    return { client, utilizationPct, hoursIncluded, hoursDelivered };
  }).sort((a, b) => a.utilizationPct - b.utilizationPct);

  // Dramatic OVER-utilization — clients burning meaningfully more hours than
  // billed (Phil's ask: signals an upsell opportunity, or assistant burnout
  // risk if it's sustained).
  const overUtilizedClients = CLIENT_NAMES.slice(16, 20).map((client) => {
    const hoursIncluded = 55 * (1 + Math.floor(rand() * 3));
    const utilizationPct = Math.round((104 + rand() * 32) * 10) / 10;
    const hoursDelivered = Math.round(hoursIncluded * (utilizationPct / 100));
    return { client, utilizationPct, hoursIncluded, hoursDelivered };
  }).sort((a, b) => b.utilizationPct - a.utilizationPct);

  const costPerDeliveredHourByRegion = REGIONS.map((region) => ({
    region,
    costPerHour: regionRates[region].costPerHour,
  }));

  // Non-billed hours split by reason (Phil's ask) — placeholder categorization
  // (Admin / Hold / Unused) until we confirm whether Time Doctor already
  // tags hours this way or this needs to become a new tracking convention.
  const nonBilledTotal = hoursIncludedTotal - hoursDeliveredTotal;
  const nonBilledShape: { category: 'Admin' | 'Hold' | 'Unused'; share: number }[] = [
    { category: 'Admin', share: 0.22 }, // internal/admin time logged against the account
    { category: 'Hold', share: 0.33 }, // client asked to pause/hold hours
    { category: 'Unused', share: 0.45 }, // billed but simply not used
  ];
  const nonBilledBreakdown = nonBilledShape.map((s) => ({
    category: s.category,
    hours: Math.round(nonBilledTotal * s.share),
  }));
  const nonBilledTotalByMonth = months.map((_, i) => hoursIncludedByMonth[i] - hoursDeliveredByMonth[i]);
  const nonBilledBreakdownMonthly = monthlyBreakdown(
    months,
    nonBilledShape.map((s) => ({ key: s.category, share: s.share })),
    nonBilledTotalByMonth,
  );

  return {
    overallUtilizationPct,
    utilizationDeltaPct: overallUtilizationPct - prev,
    hoursIncludedTotal,
    hoursDeliveredTotal,
    utilizationTrend,
    utilizationByRegion,
    utilizationByTier,
    atRiskClients,
    overUtilizedClients,
    costPerDeliveredHourByRegion,
    nonBilledBreakdown,
    utilizationByRegionMonthly,
    costPerDeliveredHourByRegionMonthly,
    nonBilledBreakdownMonthly,
  };
}

export function getFinancialsSummary(): FinancialsSummary {
  const months = monthLabels(12);
  const arr = arrTrend(monthLabels(30)).slice(-12);
  const revenueTrend = months.map((label, i) => ({ label, value: Math.round(arr[i] / 12) }));

  const monthlyRevenue = revenueTrend[revenueTrend.length - 1].value;
  const cogsPct = 0.46; // delivery payroll + engagement mgmt across 3 regions
  const opexPct = 0.34; // sales, marketing, G&A, tech
  const cogs = monthlyRevenue * cogsPct;
  const opex = monthlyRevenue * opexPct;
  const grossProfit = monthlyRevenue - cogs;
  const operatingIncome = grossProfit - opex;

  const grossMarginPct = (grossProfit / monthlyRevenue) * 100;
  const prevRevenue = revenueTrend[revenueTrend.length - 2].value;
  const prevGrossMarginPct = grossMarginPct - (rand() - 0.5) * 1.5;

  // Shared shape for a P&L breakdown at any revenue level — used for the
  // current-month table below and for each period-toggle option (Phil asked
  // for a this month / last month / QTD / last quarter toggle).
  function buildPnl(revenue: number) {
    const periodCogs = revenue * cogsPct;
    const periodOpex = revenue * opexPct;
    return [
      { category: 'Revenue', account: 'Service Revenue — Prialto Units', amount: revenue },
      { category: 'COGS', account: `Delivery Payroll — GT (${REGION_LABELS.GT})`, amount: -periodCogs * 0.33 },
      { category: 'COGS', account: `Delivery Payroll — PH (${REGION_LABELS.PH})`, amount: -periodCogs * 0.4 },
      { category: 'COGS', account: `Delivery Payroll — KE (${REGION_LABELS.KE})`, amount: -periodCogs * 0.27 },
      { category: 'Opex', account: 'Sales & Marketing', amount: -periodOpex * 0.42 },
      { category: 'Opex', account: 'G&A', amount: -periodOpex * 0.33 },
      { category: 'Opex', account: 'Technology & Tools', amount: -periodOpex * 0.25 },
    ];
  }
  const pnl = buildPnl(monthlyRevenue);

  const n = revenueTrend.length;
  const sumRevenue = (fromEnd: number, count: number) =>
    revenueTrend.slice(n - fromEnd, n - fromEnd + count).reduce((s, p) => s + p.value, 0);
  const qtdRevenue = sumRevenue(3, 3); // this month + prior 2
  const lastQuarterRevenue = sumRevenue(6, 3); // the 3 months before that
  const periodPnl: FinancialsSummary['periodPnl'] = [
    { key: 'thisMonth', label: 'This month', revenue: monthlyRevenue, pnl },
    { key: 'lastMonth', label: 'Last month', revenue: revenueTrend[n - 2].value, pnl: buildPnl(revenueTrend[n - 2].value) },
    { key: 'qtd', label: 'QTD', revenue: qtdRevenue, pnl: buildPnl(qtdRevenue) },
    { key: 'lastQuarter', label: 'Last quarter', revenue: lastQuarterRevenue, pnl: buildPnl(lastQuarterRevenue) },
  ];

  const netIncomeTrend = revenueTrend.map((pt) => ({
    label: pt.label,
    value: Math.round(pt.value * (1 - cogsPct - opexPct)),
  }));

  const cashBalance = 8_400_000;
  const netBurnOrProfit = operatingIncome; // positive here (profitable), so runway is n/a

  const balanceSheet = [
    { category: 'Assets', account: 'Cash & Equivalents', amount: cashBalance },
    { category: 'Assets', account: 'Accounts Receivable', amount: 3_150_000 },
    { category: 'Assets', account: 'Prepaid Expenses', amount: 410_000 },
    { category: 'Liabilities', account: 'Accounts Payable', amount: -890_000 },
    { category: 'Liabilities', account: 'Accrued Payroll', amount: -2_240_000 },
    { category: 'Liabilities', account: 'Deferred Revenue', amount: -1_120_000 },
    { category: 'Equity', account: "Owner's Equity", amount: -7_610_000 },
  ];

  const cashFlow = [
    { category: 'Operating', amount: operatingIncome * 0.92 },
    { category: 'Investing', amount: -180_000 },
    { category: 'Financing', amount: -60_000 },
  ];

  const arAging: FinancialsSummary['arAging'] = [
    { bucket: '0-30', amount: 2_050_000 },
    { bucket: '31-60', amount: 640_000 },
    { bucket: '61-90', amount: 280_000 },
    { bucket: '90+', amount: 180_000 },
  ];

  const opexByDepartment = [
    { department: 'Sales', amount: opex * 0.28 },
    { department: 'Marketing', amount: opex * 0.14 },
    { department: 'G&A', amount: opex * 0.33 },
    { department: 'Technology', amount: opex * 0.16 },
    { department: 'Engagement Management', amount: opex * 0.09 },
  ];

  // Monthly-granular versions so AR Aging (a balance — windowed via "as of
  // the end of the selected range") and Opex by Department (a spend flow —
  // windowed via "summed across the selected range") can both be
  // recomputed for whatever date range someone picks.
  const AR_TOTAL_NOW = 2_050_000 + 640_000 + 280_000 + 180_000;
  const arTotalByMonth = revenueTrend.map((pt) => Math.round((pt.value / monthlyRevenue) * AR_TOTAL_NOW));
  const arAgingMonthly = monthlyBreakdown(
    months,
    [
      { key: '0-30', share: 2_050_000 / AR_TOTAL_NOW },
      { key: '31-60', share: 640_000 / AR_TOTAL_NOW },
      { key: '61-90', share: 280_000 / AR_TOTAL_NOW },
      { key: '90+', share: 180_000 / AR_TOTAL_NOW },
    ],
    arTotalByMonth,
  );
  const opexByMonth = revenueTrend.map((pt) => Math.round(pt.value * opexPct));
  const opexByDepartmentMonthly = monthlyBreakdown(
    months,
    [
      { key: 'Sales', share: 0.28 },
      { key: 'Marketing', share: 0.14 },
      { key: 'G&A', share: 0.33 },
      { key: 'Technology', share: 0.16 },
      { key: 'Engagement Management', share: 0.09 },
    ],
    opexByMonth,
  );

  // ---- Additional finance metrics ----
  // EBITDA: operating income + D&A addback (small — mostly a services business,
  // light on depreciable capex).
  const daAddback = monthlyRevenue * 0.015;
  const ebitda = operatingIncome + daAddback;
  const ebitdaMarginPct = (ebitda / monthlyRevenue) * 100;

  // YoY growth off a 24-month ARR trend so "a year ago" is a real anchor,
  // not an estimate.
  const arrFull = arrTrend(monthLabels(24));
  const yoyRevenueGrowthPct = ((arrFull[23] - arrFull[11]) / arrFull[11]) * 100;
  const ruleOf40Score = yoyRevenueGrowthPct + ebitdaMarginPct;

  // DSO — AR aging total against the monthly revenue run rate.
  const totalAR = arAging.reduce((s, b) => s + b.amount, 0);
  const dsoDays = Math.round((totalAR / monthlyRevenue) * 30);

  // Revenue per employee — implied delivery headcount (~1 assistant per
  // active unit, net of bench buffer) plus a corporate/overhead layer.
  const impliedUnits = monthlyRevenue / 1750;
  const impliedDeliveryHeadcount = Math.round(impliedUnits * 0.95);
  const impliedCorporateHeadcount = Math.round(impliedDeliveryHeadcount * 0.15);
  const revenuePerEmployee = Math.round(
    (monthlyRevenue * 12) / (impliedDeliveryHeadcount + impliedCorporateHeadcount),
  );

  const ebitdaTrend = revenueTrend.map((pt, i) => ({
    label: pt.label,
    value: Math.round(pt.value * ((ebitdaMarginPct - 4 + rand() * 3 + i * 0.05) / 100)),
  }));

  return {
    revenueTrend,
    grossMarginPct,
    grossMarginDeltaPct: grossMarginPct - prevGrossMarginPct,
    operatingMarginPct: (operatingIncome / monthlyRevenue) * 100,
    cashBalance,
    cashRunwayMonths: netBurnOrProfit > 0 ? null : Math.round(cashBalance / Math.abs(netBurnOrProfit)),
    netMonthlyCashChange: Math.round(netBurnOrProfit),
    pnl,
    balanceSheet,
    cashFlow,
    arAging,
    opexByDepartment,
    ebitdaMarginPct,
    ebitdaAmount: Math.round(ebitda),
    ruleOf40Score,
    yoyRevenueGrowthPct,
    dsoDays,
    revenuePerEmployee,
    burnMultiple: netBurnOrProfit > 0 ? null : Math.abs(netBurnOrProfit) / (monthlyRevenue * 0.01),
    ebitdaTrend,
    netIncomeTrend,
    periodPnl,
    arAgingMonthly,
    opexByDepartmentMonthly,
  };
}

export function getCapacityStaffingSummary(): CapacityStaffingSummary {
  const months = monthLabels(12);

  // Company-wide active assistant count — anchored to the same unit base as
  // Revenue/Utilization so the story is internally consistent: roughly one
  // assistant per active unit, since a Prialto Unit (55 hrs/mo) is close to
  // one assistant's full monthly capacity.
  const arr = arrTrend(monthLabels(12));
  const activeUnitsNow = Math.round(arr[arr.length - 1] / (12 * 1750));
  const activeUnitsPrev = Math.round(arr[arr.length - 2] / (12 * 1750));

  const REGION_SHARE: Record<DeliveryRegion, number> = { GT: 0.36, PH: 0.4, KE: 0.24 };
  const REGION_ATTRITION: Record<DeliveryRegion, number> = { GT: 9.8, PH: 11.4, KE: 13.6 };

  const totalActiveAssistants = Math.round(activeUnitsNow * 0.97); // slightly below units — some assistants cover 2 fractional units
  const totalActiveAssistantsPrev = Math.round(activeUnitsPrev * 0.97);
  const totalActiveAssistantsDeltaPct =
    ((totalActiveAssistants - totalActiveAssistantsPrev) / totalActiveAssistantsPrev) * 100;

  const benchCoveragePct = 8.5 + rand() * 2; // target buffer against attrition/leave
  const totalBenchAssistants = Math.round(totalActiveAssistants * (benchCoveragePct / 100));

  const avgTrainingWeeks = 4;
  // In-training pipeline sized to replace attrition + fund net-new hiring for
  // the next ~avgTrainingWeeks, spread across four weekly cohort stages.
  const attritionRatePct =
    REGIONS.reduce((s, r) => s + REGION_ATTRITION[r] * REGION_SHARE[r], 0) / 1; // weighted company avg
  const monthlyReplacementNeed = Math.round((totalActiveAssistants * (attritionRatePct / 100)) / 12);
  const monthlyNetNewNeed = Math.max(0, totalActiveAssistants - totalActiveAssistantsPrev);
  const totalInTraining = Math.round((monthlyReplacementNeed + monthlyNetNewNeed) * 1.15); // slight overhire cushion

  const trainingPipeline: TrainingStage[] = [
    { stage: 'Week 1 — Orientation & Systems', count: Math.round(totalInTraining * 0.3) },
    { stage: 'Week 2 — Core Skills Training', count: Math.round(totalInTraining * 0.27) },
    { stage: 'Week 3 — Live Shadowing', count: Math.round(totalInTraining * 0.24) },
    { stage: 'Week 4 — Certification', count: Math.round(totalInTraining * 0.19) },
  ];

  const headcountByRegion: RegionHeadcount[] = REGIONS.map((region) => {
    const active = Math.round(totalActiveAssistants * REGION_SHARE[region]);
    const bench = Math.round(totalBenchAssistants * REGION_SHARE[region]);
    const inTraining = Math.round(totalInTraining * REGION_SHARE[region]);
    return { region, active, bench, inTraining, attritionRatePct: REGION_ATTRITION[region] };
  });

  const clientBackupCoveragePct = 91 + rand() * 6;
  const assistantsPerUnit = Math.round((totalActiveAssistants / activeUnitsNow) * 1000) / 1000;

  const hiringVsDemandTrend = months.map((label, i) => {
    const unitsAdded = Math.max(2, Math.round(8 + rand() * 14 + i * 0.3));
    const assistantsHired = Math.max(1, Math.round(unitsAdded * (0.9 + rand() * 0.3)));
    return { label, unitsAdded, assistantsHired };
  });

  const headcountTrend = months.map((label, i) => ({
    label,
    value: Math.round(totalActiveAssistants * (0.82 + (i / months.length) * 0.18 + (rand() - 0.5) * 0.02)),
  }));

  const attritionTrend = months.map((label, i) => ({
    label,
    value: Math.round((attritionRatePct - 1.5 + rand() * 3 - i * 0.03) * 10) / 10,
  }));

  // Monthly-granular company-wide totals so "Headcount by delivery center"
  // and "Training pipeline" can be recomputed ("as of" the end of the
  // selected window, since headcount is a stock not a flow) for any range.
  const activeByMonth = headcountTrend.map((p) => p.value);
  const benchByMonth = activeByMonth.map((v) => Math.round(v * (benchCoveragePct / 100)));
  const inTrainingRatio = totalInTraining / totalActiveAssistants;
  const inTrainingByMonth = activeByMonth.map((v) => Math.round(v * inTrainingRatio));
  const headcountByRegionMonthly = months.map((month, i) => ({
    month,
    rows: REGIONS.map((region) => {
      const jitter = 1 + (rand() - 0.5) * 0.06;
      return {
        dim: region,
        active: Math.round(activeByMonth[i] * REGION_SHARE[region] * jitter),
        bench: Math.round(benchByMonth[i] * REGION_SHARE[region] * jitter),
        inTraining: Math.round(inTrainingByMonth[i] * REGION_SHARE[region] * jitter),
      };
    }),
  }));
  const trainingPipelineMonthly = monthlyBreakdown(
    months,
    [
      { key: 'Week 1 — Orientation & Systems', share: 0.3 },
      { key: 'Week 2 — Core Skills Training', share: 0.27 },
      { key: 'Week 3 — Live Shadowing', share: 0.24 },
      { key: 'Week 4 — Certification', share: 0.19 },
    ],
    inTrainingByMonth,
  );

  // Available (bench) capacity split by segment and by assistant time zone
  // (Phil's ask). Time-zone tracking is a placeholder pending confirmation
  // we actually capture it live — bench hours estimated at 55 hrs/mo/assistant.
  const HOURS_PER_ASSISTANT_MONTH = 55;
  const totalBenchHours = totalBenchAssistants * HOURS_PER_ASSISTANT_MONTH;
  const segmentBenchShare: { segment: Tier; share: number }[] = [
    { segment: 'Fractional', share: 0.35 },
    { segment: 'Full-Time', share: 0.4 },
    { segment: 'Enterprise', share: 0.25 },
  ];
  const availableCapacityBySegment = segmentBenchShare.map((s) => ({
    segment: s.segment,
    availableHours: Math.round(totalBenchHours * s.share),
  }));
  const TIME_ZONE_SHARE: { timeZone: string; share: number }[] = [
    { timeZone: 'US Eastern', share: 0.32 },
    { timeZone: 'US Central', share: 0.22 },
    { timeZone: 'US Pacific', share: 0.18 },
    { timeZone: 'GMT-6 (Guatemala)', share: 0.16 },
    { timeZone: 'GMT+8 (Philippines)', share: 0.08 },
    { timeZone: 'GMT+3 (Kenya)', share: 0.04 },
  ];
  const availableCapacityByTimeZone = TIME_ZONE_SHARE.map((t) => ({
    timeZone: t.timeZone,
    availableHours: Math.round(totalBenchHours * t.share),
  }));

  // Monthly bench-hours totals so both capacity breakdowns above can be
  // averaged across whatever window is selected.
  const benchHoursByMonth = benchByMonth.map((v) => v * HOURS_PER_ASSISTANT_MONTH);
  const availableCapacityBySegmentMonthly = monthlyBreakdown(
    months,
    segmentBenchShare.map((s) => ({ key: s.segment, share: s.share })),
    benchHoursByMonth,
  );
  const availableCapacityByTimeZoneMonthly = monthlyBreakdown(
    months,
    TIME_ZONE_SHARE.map((t) => ({ key: t.timeZone, share: t.share })),
    benchHoursByMonth,
  );

  // Hiring lead time — weeks a hire needs to start ahead of the revenue
  // they'll support, given the ~avgTrainingWeeks pipeline plus a short buffer
  // for ramp-up variance. Trend shows this drifting with hiring pressure.
  const hiringLeadTimeWeeks = avgTrainingWeeks + 1.5;
  const hiringLeadTimeTrend = months.map((label, i) => ({
    label,
    value: Math.round((hiringLeadTimeWeeks - 1 + rand() * 2 + Math.sin(i / 3) * 0.6) * 10) / 10,
  }));

  return {
    totalActiveAssistants,
    totalActiveAssistantsDeltaPct,
    totalBenchAssistants,
    benchCoveragePct,
    totalInTraining,
    avgTrainingWeeks,
    attritionRatePct: Math.round(attritionRatePct * 10) / 10,
    attritionDeltaPct: Math.round((rand() - 0.55) * 10) / 10,
    clientBackupCoveragePct: Math.round(clientBackupCoveragePct * 10) / 10,
    assistantsPerUnit,
    headcountByRegion,
    trainingPipeline,
    hiringVsDemandTrend,
    headcountTrend,
    attritionTrend,
    availableCapacityBySegment,
    availableCapacityByTimeZone,
    hiringLeadTimeWeeks: Math.round(hiringLeadTimeWeeks * 10) / 10,
    hiringLeadTimeTrend,
    headcountByRegionMonthly,
    trainingPipelineMonthly,
    availableCapacityBySegmentMonthly,
    availableCapacityByTimeZoneMonthly,
  };
}

// ---------- Churn (deep breakdown) ----------
// Akhil's spec, 2026-08-17: churn by segment, by assigned delivery team, by
// delivery center, and by tenure-at-churn age bracket. Independent generator
// (own random draws off the same seeded PRNG) — anchored to the same active-
// unit base as Revenue/Capacity so the order of magnitude is consistent, but
// not tightly reconciled unit-for-unit against those pages' own churn counts.
const CHURN_TEAMS = ['Team Ironwood', 'Team Cascade', 'Team Redwood', 'Team Summit', 'Team Harbor', 'Team Alder'];

export function getChurnSummary(): ChurnSummary {
  const months = monthLabels(18);
  const churnTrend = months.map((label, i) => ({
    label,
    value: Math.round((2.1 + rand() * 1.4 + Math.sin(i / 5) * 0.4) * 10) / 10,
  }));
  const monthlyChurnRatePct = churnTrend[churnTrend.length - 1].value;
  const prevChurnRatePct = churnTrend[churnTrend.length - 2].value;

  const arr = arrTrend(months);
  const activeUnitsNow = Math.round(arr[arr.length - 1] / (12 * 1750));
  const blendedRate = 1750;

  const unitsChurnedThisPeriod = Math.max(1, Math.round(activeUnitsNow * (monthlyChurnRatePct / 100)));
  const mrrChurnedThisPeriod = Math.round(unitsChurnedThisPeriod * blendedRate * (0.9 + rand() * 0.2));
  const avgTenureAtChurnDays = Math.round(240 + rand() * 260); // skews toward the first year, per the age-bracket shape below

  // By segment — Enterprise is stickier (lower relative churn propensity),
  // Fractional churns more readily.
  const segmentMix: { segment: ChurnSegment; share: number; churnMultiplier: number }[] = [
    { segment: 'FTD', share: 0.38, churnMultiplier: 1.0 },
    { segment: 'Fractional', share: 0.37, churnMultiplier: 1.35 },
    { segment: 'Enterprise', share: 0.25, churnMultiplier: 0.55 },
  ];
  const segmentWeights = segmentMix.map((s) => s.share * s.churnMultiplier);
  const segmentWeightSum = segmentWeights.reduce((s, w) => s + w, 0);
  const bySegment = segmentMix.map((s, i) => {
    const unitsChurned = Math.round(unitsChurnedThisPeriod * (segmentWeights[i] / segmentWeightSum));
    const segmentActiveUnits = Math.max(1, Math.round(activeUnitsNow * s.share));
    return {
      segment: s.segment,
      unitsChurned,
      churnRatePct: Math.round((unitsChurned / segmentActiveUnits) * 1000) / 10,
    };
  });

  // By assigned delivery team — fairly even distribution with jitter (no
  // single team is dramatically worse; that would be a red flag worth
  // catching, so a little variance is realistic).
  const teamWeights = CHURN_TEAMS.map(() => 0.7 + rand() * 0.6);
  const teamWeightSum = teamWeights.reduce((s, w) => s + w, 0);
  const byTeam = CHURN_TEAMS.map((team, i) => {
    const unitsChurned = Math.max(0, Math.round(unitsChurnedThisPeriod * (teamWeights[i] / teamWeightSum)));
    const teamActiveUnits = Math.max(1, Math.round(activeUnitsNow / CHURN_TEAMS.length));
    return {
      team,
      unitsChurned,
      churnRatePct: Math.round((unitsChurned / teamActiveUnits) * 1000) / 10,
    };
  });

  // By delivery center (GT/PH/KE).
  const centerShare: Record<DeliveryRegion, number> = { GT: 0.34, PH: 0.38, KE: 0.28 };
  const byCenter = REGIONS.map((region) => {
    const unitsChurned = Math.round(unitsChurnedThisPeriod * centerShare[region]);
    const centerActiveUnits = Math.max(1, Math.round(activeUnitsNow * centerShare[region]));
    return {
      region,
      unitsChurned,
      churnRatePct: Math.round((unitsChurned / centerActiveUnits) * 1000) / 10,
    };
  });

  // By tenure-at-churn age bracket — the six buckets from Akhil's spec.
  // Weighted toward the first year (onboarding-fit churn is the most common
  // failure mode), tapering for units that have proven out over time.
  const ageBracketShape: { bracket: ChurnAgeBracket; weight: number }[] = [
    { bracket: '<90 days', weight: 0.22 },
    { bracket: '90-180 days', weight: 0.2 },
    { bracket: '180-365 days', weight: 0.18 },
    { bracket: '1-2 years', weight: 0.22 },
    { bracket: '2-3 years', weight: 0.12 },
    { bracket: '3+ years', weight: 0.06 },
  ];
  const byAgeBracket = ageBracketShape.map((b) => ({
    bracket: b.bracket,
    unitsChurned: Math.round(unitsChurnedThisPeriod * b.weight),
    sharePct: Math.round(b.weight * 1000) / 10,
  }));

  // Monthly-granular units-churned totals so every breakdown above (by
  // segment / team / center / age bracket) can be summed across whatever
  // window is selected, rather than only reflecting the latest month.
  const unitsChurnedByMonth = months.map((_, i) => {
    const activeUnitsAtI = Math.round(arr[i] / (12 * 1750));
    return Math.max(1, Math.round(activeUnitsAtI * (churnTrend[i].value / 100)));
  });
  const bySegmentMonthly = monthlyBreakdown(
    months,
    segmentMix.map((s, i) => ({ key: s.segment, share: segmentWeights[i] / segmentWeightSum })),
    unitsChurnedByMonth,
  );
  const byTeamMonthly = monthlyBreakdown(
    months,
    CHURN_TEAMS.map((team, i) => ({ key: team, share: teamWeights[i] / teamWeightSum })),
    unitsChurnedByMonth,
  );
  const byCenterMonthly = monthlyBreakdown(
    months,
    REGIONS.map((region) => ({ key: region, share: centerShare[region] })),
    unitsChurnedByMonth,
  );
  const byAgeBracketMonthly = monthlyBreakdown(
    months,
    ageBracketShape.map((b) => ({ key: b.bracket, share: b.weight })),
    unitsChurnedByMonth,
  );

  // At-risk watchlist — clients showing the same low-utilization pattern
  // that historically precedes churn, cross-referenced against segment/team/
  // center so it reads as one connected story with the breakdowns above.
  const atRiskWatchlist = CLIENT_NAMES.slice(4, 10).map((client) => {
    const segment = segmentMix[Math.floor(rand() * segmentMix.length)].segment;
    const team = CHURN_TEAMS[Math.floor(rand() * CHURN_TEAMS.length)];
    const region = REGIONS[Math.floor(rand() * REGIONS.length)];
    const tenureDays = Math.round(30 + rand() * 700);
    const utilizationPct = Math.round((48 + rand() * 22) * 10) / 10;
    return { client, segment, team, region, tenureDays, utilizationPct };
  }).sort((a, b) => a.utilizationPct - b.utilizationPct);

  return {
    monthlyChurnRatePct,
    monthlyChurnRatePctDeltaPct: monthlyChurnRatePct - prevChurnRatePct,
    unitsChurnedThisPeriod,
    mrrChurnedThisPeriod,
    avgTenureAtChurnDays,
    churnTrend,
    bySegment,
    byTeam,
    byCenter,
    byAgeBracket,
    atRiskWatchlist,
    bySegmentMonthly,
    byTeamMonthly,
    byCenterMonthly,
    byAgeBracketMonthly,
  };
}

export function getVarianceDataset(): VarianceDataset {
  const months = monthLabels(24);
  const arr = arrTrend(months);
  const mrrSeries = months.map((m, i) => ({ month: m, value: Math.round(arr[i] / 12) }));
  const activeUnitsSeries = months.map((m, i) => ({ month: m, value: Math.round(arr[i] / (12 * 1750)) }));

  const grossMarginSeries = months.map((m, i) => ({
    month: m,
    value: Math.round((53.5 + Math.sin(i / 4) * 1.8 + rand() * 1.2) * 10) / 10,
  }));
  const operatingMarginSeries = months.map((m, i) => ({
    month: m,
    value: Math.round((19 + Math.sin(i / 5) * 2.4 + rand() * 1.4) * 10) / 10,
  }));
  const utilizationSeries = months.map((m, i) => ({
    month: m,
    value: Math.round((84 + rand() * 10 + i * 0.1) * 10) / 10,
  }));
  const cashBalanceSeries = months.map((m, i) => ({
    month: m,
    value: Math.round(5_200_000 + i * 135_000 + (rand() - 0.5) * 400_000),
  }));
  const headcountSeries = months.map((m, i) => ({
    month: m,
    value: Math.round(600 + i * 14 + (rand() - 0.5) * 20),
  }));
  const dsoSeries = months.map((m, i) => ({
    month: m,
    value: Math.round(38 + Math.sin(i / 3) * 4 + rand() * 3),
  }));
  const arpuSeries = months.map((m, i) => ({
    month: m,
    value: Math.round(1520 + i * 4 + (rand() - 0.5) * 40),
  }));

  return {
    months,
    metrics: [
      { key: 'mrr', label: 'MRR', format: 'usd', goodDirection: 'up', series: mrrSeries },
      { key: 'activeUnits', label: 'Active Units', format: 'count', goodDirection: 'up', series: activeUnitsSeries },
      { key: 'grossMargin', label: 'Gross Margin %', format: 'pct', goodDirection: 'up', series: grossMarginSeries },
      {
        key: 'operatingMargin',
        label: 'Operating Margin %',
        format: 'pct',
        goodDirection: 'up',
        series: operatingMarginSeries,
      },
      { key: 'utilization', label: 'Utilization %', format: 'pct', goodDirection: 'up', series: utilizationSeries },
      { key: 'cashBalance', label: 'Cash Balance', format: 'usd', goodDirection: 'up', series: cashBalanceSeries },
      { key: 'headcount', label: 'Total Headcount', format: 'count', goodDirection: 'up', series: headcountSeries },
      { key: 'dso', label: 'DSO (days)', format: 'count', goodDirection: 'down', series: dsoSeries },
      { key: 'arpu', label: 'ARPU', format: 'usd', goodDirection: 'up', series: arpuSeries },
    ],
  };
}
