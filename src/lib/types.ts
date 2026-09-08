import type { MonthlyCategoryRow, MonthlyDimensionRow } from './rangeAggregate';

export type Tier = 'Fractional' | 'Full-Time' | 'Enterprise';
// Prialto-internal delivery center codes — how the business actually refers
// to these sites day to day (never the city names in-app).
export type DeliveryRegion = 'GT' | 'PH' | 'KE';
export const REGION_LABELS: Record<DeliveryRegion, string> = {
  GT: 'Guatemala',
  PH: 'Philippines',
  KE: 'Kenya',
};
export type Segment = 'Individual' | 'Small Business' | 'Enterprise';

// A single month's MRR, split by tier — a type alias (not an interface) so
// it structurally satisfies chart components typed against
// Record<string, unknown>[] (see RegionHeadcount below for the same fix).
export type MrrTierPoint = { label: string } & Record<Tier, number>;

export interface KpiPoint {
  label: string; // e.g. "2026-01"
  value: number;
}

export type ActivityType = 'new_unit' | 'churn' | 'upsell' | 'downgrade';

export interface ActivityEvent {
  date: string; // ISO date, day granularity
  type: ActivityType;
  label: string;
  client: string;
  mrrImpact: number; // signed — positive for new/upsell, negative for churn/downgrade
}

export interface MrrMovement {
  startingMrr: number;
  newMrr: number;
  expansionMrr: number;
  churnedMrr: number; // negative
  contractionMrr: number; // negative
  endingMrr: number;
}

export interface RevenueSummary {
  mrr: number;
  arr: number;
  mrrDeltaPct: number; // vs prior month
  activeUnits: number;
  activeUnitsDeltaPct: number;
  avgRevenuePerClient: number;
  arpu: number; // average revenue per active client, current month
  avgRevenuePerUnit: number; // mrr / active Prialto Units — Phil's requested per-unit view, alongside ARPU
  netRevenueRetentionPct: number;
  churnRatePct: number; // monthly, unit-based
  newUnitsThisPeriod: number;
  churnedUnitsThisPeriod: number;
  netNewUnitsThisPeriod: number;
  mrrMovement: MrrMovement;
  dailyActivity: ActivityEvent[];
  mrrTrend: KpiPoint[];
  // MRR trend split by tier, for the stacked-bar view (Phil asked for this
  // instead of a single line). Flat per-month objects so recharts can read
  // each tier straight off as a dataKey.
  mrrTrendByTier: MrrTierPoint[];
  unitsByTier: { tier: Tier; units: number; mrr: number }[];
  revenueByRegionOfClient: { region: string; mrr: number }[];
  topClientsByRevenue: { client: string; mrr: number; tier: Tier; segment: Segment }[];
  bookingsByStage: { stage: string; amount: number; count: number }[];
  // Age/tenure profile of active units (Phil's ask) — bucket boundaries here
  // are a reasonable placeholder pending the actual leadership slide he
  // referenced; swap the buckets once we have it.
  unitAgeProfile: { bracket: string; units: number }[];
  // Pipeline over time against near-term sales targets (Phil's ask) — target
  // values are a placeholder until we confirm where quotas actually live.
  salesPipelineTrend: { label: string; pipeline: number; target: number }[];
  // Monthly-granular versions of the breakdown charts above, so every chart
  // can be recomputed (not just sliced) for whatever date range is selected
  // — see src/lib/rangeAggregate.ts and SectionCard for how these are used.
  unitsByTierMonthly: MonthlyCategoryRow[];
  bookingsByStageMonthly: MonthlyCategoryRow[];
  unitAgeProfileMonthly: MonthlyCategoryRow[];
}

export interface UtilizationSummary {
  overallUtilizationPct: number;
  utilizationDeltaPct: number;
  hoursIncludedTotal: number;
  hoursDeliveredTotal: number;
  utilizationTrend: KpiPoint[];
  utilizationByRegion: { region: DeliveryRegion; hoursIncluded: number; hoursDelivered: number; utilizationPct: number }[];
  utilizationByTier: { tier: Tier; utilizationPct: number }[];
  atRiskClients: { client: string; utilizationPct: number; hoursIncluded: number; hoursDelivered: number }[];
  // Dramatic OVER-utilization (client using meaningfully more hours than
  // billed) — Phil's ask: signals an upsell opportunity or assistant burnout
  // risk, not just under-utilization.
  overUtilizedClients: { client: string; utilizationPct: number; hoursIncluded: number; hoursDelivered: number }[];
  costPerDeliveredHourByRegion: { region: DeliveryRegion; costPerHour: number }[];
  // Non-billed hours split by reason (Phil's ask) — placeholder categorization
  // until we confirm whether Time Doctor already tags hours this way.
  nonBilledBreakdown: { category: 'Admin' | 'Hold' | 'Unused'; hours: number }[];
  // Monthly-granular versions — see RevenueSummary's note above.
  utilizationByRegionMonthly: MonthlyDimensionRow[];
  costPerDeliveredHourByRegionMonthly: MonthlyDimensionRow[];
  nonBilledBreakdownMonthly: MonthlyCategoryRow[];
}

export interface FinancialsSummary {
  revenueTrend: KpiPoint[];
  grossMarginPct: number;
  grossMarginDeltaPct: number;
  operatingMarginPct: number;
  cashBalance: number;
  cashRunwayMonths: number | null;
  // Signed net monthly cash change — negative when burning, positive when
  // generating cash. Shown alongside cashRunwayMonths so "cash-flow
  // positive" still comes with an actual number, per Phil's ask.
  netMonthlyCashChange: number;
  pnl: { category: string; account: string; amount: number }[];
  balanceSheet: { category: string; account: string; amount: number }[];
  cashFlow: { category: string; amount: number }[];
  arAging: { bucket: '0-30' | '31-60' | '61-90' | '90+'; amount: number }[];
  opexByDepartment: { department: string; amount: number }[];
  // Additional finance metrics — the leadership-level health checks that sit
  // alongside gross/operating margin.
  ebitdaMarginPct: number;
  ebitdaAmount: number; // $ EBITDA, shown together with the margin % (Phil's ask)
  ruleOf40Score: number; // YoY revenue growth % + EBITDA margin %
  yoyRevenueGrowthPct: number;
  dsoDays: number; // days sales outstanding — AR collection speed
  revenuePerEmployee: number; // trailing-12mo revenue / headcount
  burnMultiple: number | null; // net burn / net new ARR — null when cash-flow positive
  ebitdaTrend: KpiPoint[];
  netIncomeTrend: KpiPoint[]; // P&L trend over time, alongside the existing revenue/EBITDA trends
  // Period toggle for the P&L table: this month / last month / QTD / last
  // quarter, each with its own revenue anchor and % of revenue is computed
  // client-side from amount/revenue.
  periodPnl: {
    key: 'thisMonth' | 'lastMonth' | 'qtd' | 'lastQuarter';
    label: string;
    revenue: number;
    pnl: { category: string; account: string; amount: number }[];
  }[];
  // Monthly-granular versions — see RevenueSummary's note above.
  arAgingMonthly: MonthlyCategoryRow[];
  opexByDepartmentMonthly: MonthlyCategoryRow[];
}

// ---------- Capacity & Staffing ----------
// Grounded in the actual delivery model: assistants are hired and trained
// per delivery center (~4-week onboarding pipeline), then assigned to
// client units; a "bench" of trained-but-unassigned assistants and a
// backup-coverage ratio absorb attrition/leave without a client-visible gap.

export interface TrainingStage {
  stage: string; // e.g. "Week 1 — Orientation" ... "Certified — Ready to Deploy"
  count: number;
}

export type RegionHeadcount = {
  region: DeliveryRegion;
  active: number; // deployed against a client unit
  bench: number; // certified, available, unassigned
  inTraining: number;
  attritionRatePct: number; // trailing-90-day annualized
};

export interface CapacityStaffingSummary {
  totalActiveAssistants: number;
  totalActiveAssistantsDeltaPct: number;
  totalBenchAssistants: number;
  benchCoveragePct: number; // bench / active — target buffer against attrition & leave
  totalInTraining: number;
  avgTrainingWeeks: number;
  attritionRatePct: number; // company-wide trailing-90-day annualized
  attritionDeltaPct: number;
  clientBackupCoveragePct: number; // % of active units with a named backup assistant on file
  assistantsPerUnit: number; // company-wide staffing ratio
  headcountByRegion: RegionHeadcount[];
  trainingPipeline: TrainingStage[];
  hiringVsDemandTrend: { label: string; unitsAdded: number; assistantsHired: number }[];
  headcountTrend: KpiPoint[];
  attritionTrend: KpiPoint[];
  // Available capacity by segment and by assistant time zone (Phil's ask) —
  // time-zone tracking is a placeholder pending confirmation we track it live.
  availableCapacityBySegment: { segment: Tier; availableHours: number }[];
  availableCapacityByTimeZone: { timeZone: string; availableHours: number }[];
  // Hiring lead time — how many weeks ahead of new revenue a hire needs to
  // start, given the ~4-week training pipeline (Phil's ask).
  hiringLeadTimeWeeks: number;
  hiringLeadTimeTrend: KpiPoint[];
  // Monthly-granular versions — see RevenueSummary's note above.
  headcountByRegionMonthly: MonthlyDimensionRow[];
  trainingPipelineMonthly: MonthlyCategoryRow[];
  availableCapacityBySegmentMonthly: MonthlyCategoryRow[];
  availableCapacityByTimeZoneMonthly: MonthlyCategoryRow[];
}

// ---------- Variance / month-over-month comparison ----------
// The dataset carries every month's value for a fixed set of key metrics;
// the viewer picks any two months client-side and the page computes deltas
// — no server round-trip needed to change the comparison.

export interface MonthlyMetricPoint {
  month: string; // "YYYY-MM"
  value: number;
}

export interface VarianceMetricSeries {
  key: string;
  label: string;
  format: 'usd' | 'usdSigned' | 'usdCompact' | 'usdCompactM' | 'pct' | 'pctSigned' | 'hrs' | 'count' | 'countSigned';
  goodDirection: 'up' | 'down';
  series: MonthlyMetricPoint[];
}

export interface VarianceDataset {
  months: string[]; // ascending "YYYY-MM"
  metrics: VarianceMetricSeries[];
}

// ---------- Churn (deep breakdown) ----------
// Akhil's spec, 2026-08-17: churn broken out four ways — by service segment,
// by the assigned delivery/engagement team, by delivery center, and by how
// long the unit had been active when it churned. "FTD" is Prialto's
// full-time-dedicated segment label, distinct from the Tier type used
// elsewhere in the app (worth a quick confirm with Phil/Akhil that FTD ==
// the existing "Full-Time" tier, but kept as its own literal here since
// that's the exact term used in the spec).
export type ChurnSegment = 'FTD' | 'Fractional' | 'Enterprise';
export type ChurnAgeBracket = '<90 days' | '90-180 days' | '180-365 days' | '1-2 years' | '2-3 years' | '3+ years';

export interface ChurnSummary {
  monthlyChurnRatePct: number;
  monthlyChurnRatePctDeltaPct: number;
  unitsChurnedThisPeriod: number;
  mrrChurnedThisPeriod: number;
  avgTenureAtChurnDays: number;
  churnTrend: KpiPoint[];
  bySegment: { segment: ChurnSegment; unitsChurned: number; churnRatePct: number }[];
  byTeam: { team: string; unitsChurned: number; churnRatePct: number }[];
  byCenter: { region: DeliveryRegion; unitsChurned: number; churnRatePct: number }[];
  byAgeBracket: { bracket: ChurnAgeBracket; unitsChurned: number; sharePct: number }[];
  atRiskWatchlist: {
    client: string;
    segment: ChurnSegment;
    team: string;
    region: DeliveryRegion;
    tenureDays: number;
    utilizationPct: number;
  }[];
  // Monthly-granular versions — see RevenueSummary's note above.
  bySegmentMonthly: MonthlyCategoryRow[];
  byTeamMonthly: MonthlyCategoryRow[];
  byCenterMonthly: MonthlyCategoryRow[];
  byAgeBracketMonthly: MonthlyCategoryRow[];
}

export interface Filters {
  from: string; // ISO date
  to: string; // ISO date
  segment?: Segment;
  region?: DeliveryRegion;
  tier?: Tier;
}
