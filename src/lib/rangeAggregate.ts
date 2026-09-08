// Shared range-selection + windowing logic used by every chart/section on
// every dashboard page. Pure functions only (no React) so they're safe to
// import from both client components and, if ever needed, server code.
//
// Design: every chart/table on a page is fed the FULL monthly series,
// already fetched once server-side (no re-fetch on range change). Changing
// a range is a pure client-side slice-and-aggregate over that data, mirroring
// the pattern the original ChartCard used for trend lines, extended to also
// cover category/dimension breakdown charts (AR aging, units by tier, etc.)
// that need their totals recomputed for the selected window rather than
// just sliced.

export type RangePreset = '3m' | '6m' | '12m' | 'ytd' | 'lastYear' | 'all' | 'custom';

export interface RangeSelection {
  preset: RangePreset;
  // Only used when preset === 'custom'. Both are "YYYY-MM" labels, inclusive.
  customFrom?: string;
  customTo?: string;
}

export const DEFAULT_RANGE: RangeSelection = { preset: '12m' };

export const RANGE_PRESET_LABELS: Record<RangePreset, string> = {
  '3m': 'Last 3 months',
  '6m': 'Last 6 months',
  '12m': 'Last 12 months',
  ytd: 'Year to date',
  lastYear: 'Last calendar year',
  all: 'All',
  custom: 'Custom range',
};

// `months` must be ascending "YYYY-MM" labels, the full set available for
// this dataset. Returns the subset actually in range (still ascending).
export function resolveMonths(months: string[], selection: RangeSelection): string[] {
  if (months.length === 0) return [];
  const lastLabel = months[months.length - 1];
  const [lastYear] = lastLabel.split('-').map(Number);

  switch (selection.preset) {
    case '3m':
      return months.slice(-3);
    case '6m':
      return months.slice(-6);
    case '12m':
      return months.slice(-12);
    case 'all':
      return months;
    case 'ytd':
      return months.filter((m) => m.startsWith(`${lastYear}-`));
    case 'lastYear':
      return months.filter((m) => m.startsWith(`${lastYear - 1}-`));
    case 'custom': {
      const from = selection.customFrom ?? months[0];
      const to = selection.customTo ?? lastLabel;
      const lo = from <= to ? from : to;
      const hi = from <= to ? to : from;
      return months.filter((m) => m >= lo && m <= hi);
    }
    default:
      return months.slice(-12);
  }
}

export type AggMode = 'sum' | 'avg' | 'last';

function aggregate(values: number[], mode: AggMode): number {
  if (values.length === 0) return 0;
  if (mode === 'last') return values[values.length - 1];
  const sum = values.reduce((s, v) => s + v, 0);
  return mode === 'avg' ? sum / values.length : sum;
}

// A monthly row shaped like { label: "2026-03", Fractional: 120, ... } —
// the same shape mrrTrendByTier already used, generalized to any set of
// category keys sharing one monthly time series.
//
// NOTE: this is deliberately `{ label: string; [key: string]: string |
// number }` rather than `{ label: string } & Record<string, number>`. The
// latter looks equivalent but isn't: a wildcard `Record<string, number>`
// index signature requires EVERY string key — including `label` — to be
// assignable to `number`, which conflicts with `label`'s own `string` type
// and makes the intersection unconstructible. Using one shared `string |
// number` index signature covers both the label and the numeric category
// fields without that conflict. (Same underlying footgun as the
// `RegionHeadcount` interface-vs-type bug fixed earlier — a data shape
// that looks fine at a glance but fails a stricter TS check we can't run
// locally in this sandbox, so it's called out explicitly here.)
export type MonthlyCategoryRow = { label: string; [key: string]: string | number };

// Aggregate a set of category keys across the selected window's months.
// Returns one { name, value } pair per category, in the order given —
// ready to feed straight into CategoryBarChart / ShareDonut.
export function aggregateCategories(
  rows: MonthlyCategoryRow[],
  selectedMonths: string[],
  categories: { key: string; label: string }[],
  mode: AggMode,
): { name: string; value: number }[] {
  const selected = rows.filter((r) => selectedMonths.includes(r.label));
  return categories.map((c) => ({
    name: c.label,
    value: aggregate(
      selected.map((r) => (typeof r[c.key] === 'number' ? r[c.key] : 0)),
      mode,
    ),
  }));
}

// A monthly-dimensioned row: one month's worth of a breakdown-by-dimension
// chart (e.g. headcount by delivery center), holding one sub-row per
// dimension value (region) with its own series fields. Same `string |
// number` index-signature shape as MonthlyCategoryRow above, and for the
// same reason — see the note there.
export interface MonthlyDimensionRow {
  month: string; // "YYYY-MM"
  rows: { dim: string; [key: string]: string | number }[];
}

// Aggregate a dimensioned breakdown (e.g. active/bench/inTraining per
// region) across the selected window. Returns one row per dimension value,
// ready to feed into ComparisonBarChart with categoryKey="dim".
export function aggregateDimensions(
  monthly: MonthlyDimensionRow[],
  selectedMonths: string[],
  seriesKeys: string[],
  mode: AggMode,
): Record<string, unknown>[] {
  const selected = monthly.filter((m) => selectedMonths.includes(m.month));
  const dims = selected[0]?.rows.map((r) => r.dim) ?? [];
  return dims.map((dim) => {
    const out: Record<string, unknown> = { dim };
    for (const key of seriesKeys) {
      const values = selected.map((m) => {
        const found = m.rows.find((r) => r.dim === dim);
        return found && typeof found[key] === 'number' ? found[key] : 0;
      });
      out[key] = aggregate(values, mode);
    }
    return out;
  });
}

// Sum of a plain array of numbers — used by chart primitives to compute
// "% of total" for hover tooltips.
export function sumOf(values: number[]): number {
  return values.reduce((s, v) => s + v, 0);
}

export function pctOfTotal(value: number, total: number): number {
  if (!total) return 0;
  return (value / total) * 100;
}
