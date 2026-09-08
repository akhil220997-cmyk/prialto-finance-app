'use client';

import { useState } from 'react';
import { TrendLineChart } from '@/components/charts/TrendLineChart';
import { StackedBarChart } from '@/components/charts/StackedBarChart';
import { ComparisonBarChart } from '@/components/charts/ComparisonBarChart';
import { CategoryBarChart } from '@/components/charts/CategoryBarChart';
import { ShareDonut } from '@/components/charts/ShareDonut';
import { RangeControl } from '@/components/ui/RangeControl';
import { useRangeContext } from '@/components/dashboard/RangeContext';
import {
  resolveMonths,
  aggregateCategories,
  aggregateDimensions,
  type RangeSelection,
  type MonthlyCategoryRow,
  type MonthlyDimensionRow,
  type AggMode,
} from '@/lib/rangeAggregate';
import type { FormatKey } from '@/lib/format';

// SectionCard is the ONE chart wrapper used everywhere on every dashboard —
// it replaces the old ChartCard and every raw chart block that previously
// had no date control at all. Every chart on every page gets:
//  1. its own range control (following the page-level range by default,
//     or broken out to its own via the "Following page range" toggle), and
//  2. the right windowing/aggregation behavior for its data shape, computed
//     entirely client-side from data already fetched once server-side.
//
// Two data shapes come in, matching the two things a range can do:
//  - Genuinely time-series charts (trend / stackedBar / comparisonBarTrend)
//    get WINDOWED — the selected months are sliced straight out of `rows`.
//  - Breakdown charts (categoryBreakdown / donutBreakdown / dimensionBreakdown)
//    get RECOMPUTED — every category's total is re-aggregated (sum/avg/last,
//    per `agg`) across whichever months are selected, so picking a
//    different window actually changes AR aging, units-by-tier, etc.,
//    not just what's visible.
export type ChartSpec =
  | { kind: 'trend'; format?: FormatKey; color?: string }
  | { kind: 'stackedBar'; series: { key: string; label: string }[]; format?: FormatKey }
  | { kind: 'comparisonBarTrend'; series: { key: string; label: string; color: string }[]; format?: FormatKey }
  | {
      kind: 'categoryBreakdown';
      series: { key: string; label: string }[];
      agg: AggMode;
      format?: FormatKey;
      horizontal?: boolean;
    }
  | { kind: 'donutBreakdown'; series: { key: string; label: string }[]; agg: AggMode; format?: FormatKey }
  | {
      kind: 'dimensionBreakdown';
      series: { key: string; label: string; color: string }[];
      agg: AggMode;
      format?: FormatKey;
    };

interface SectionCardProps {
  title: string;
  subtitle?: string;
  chart: ChartSpec;
  // Provide ONE of these depending on chart.kind — see ChartSpec above.
  rows?: MonthlyCategoryRow[];
  monthlyDimensions?: MonthlyDimensionRow[];
  className?: string;
}

export function SectionCard({ title, subtitle, chart, rows, monthlyDimensions, className }: SectionCardProps) {
  const { globalRange } = useRangeContext();
  const [localRange, setLocalRange] = useState<RangeSelection | null>(null);
  const activeRange = localRange ?? globalRange;
  const isFollowing = localRange === null;

  const months =
    chart.kind === 'dimensionBreakdown'
      ? (monthlyDimensions ?? []).map((m) => m.month)
      : (rows ?? []).map((r) => r.label);
  const selectedMonths = resolveMonths(months, activeRange);

  return (
    <div className={`hover-card group rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5 ${className ?? ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-[var(--text-primary)]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{subtitle}</p>}
        </div>
        <RangeControl
          months={months}
          value={activeRange}
          onChange={(next) => setLocalRange(next)}
          label={title}
          following={isFollowing}
          onStopFollowing={() => setLocalRange(globalRange)}
        />
      </div>
      {/* Keying on the resolved months forces a clean remount (and the fade-in
          below) whenever the selected range actually changes the underlying
          data — a real transition, not just an inert opacity class. */}
      <div key={selectedMonths.join('|')} className="mt-3 animate-section-fade">
        <SectionChart chart={chart} rows={rows} monthlyDimensions={monthlyDimensions} selectedMonths={selectedMonths} />
      </div>
    </div>
  );
}

function SectionChart({
  chart,
  rows,
  monthlyDimensions,
  selectedMonths,
}: {
  chart: ChartSpec;
  rows?: MonthlyCategoryRow[];
  monthlyDimensions?: MonthlyDimensionRow[];
  selectedMonths: string[];
}) {
  if (chart.kind === 'trend') {
    const windowed = (rows ?? []).filter((r) => selectedMonths.includes(r.label));
    const asTrend = windowed.map((r) => ({ label: r.label, value: (r as unknown as { value: number }).value }));
    return <TrendLineChart data={asTrend} format={chart.format} color={chart.color} />;
  }

  if (chart.kind === 'stackedBar') {
    const windowed = (rows ?? []).filter((r) => selectedMonths.includes(r.label));
    return (
      <StackedBarChart
        data={windowed as unknown as Record<string, unknown>[]}
        categoryKey="label"
        series={chart.series}
        format={chart.format}
      />
    );
  }

  if (chart.kind === 'comparisonBarTrend') {
    const windowed = (rows ?? []).filter((r) => selectedMonths.includes(r.label));
    return (
      <ComparisonBarChart
        data={windowed as unknown as Record<string, unknown>[]}
        categoryKey="label"
        series={chart.series}
        format={chart.format}
      />
    );
  }

  if (chart.kind === 'categoryBreakdown') {
    const aggregated = aggregateCategories(rows ?? [], selectedMonths, chart.series, chart.agg);
    return <CategoryBarChart data={aggregated} format={chart.format} horizontal={chart.horizontal} />;
  }

  if (chart.kind === 'donutBreakdown') {
    const aggregated = aggregateCategories(rows ?? [], selectedMonths, chart.series, chart.agg);
    return <ShareDonut data={aggregated} format={chart.format} />;
  }

  // dimensionBreakdown
  const aggregated = aggregateDimensions(
    monthlyDimensions ?? [],
    selectedMonths,
    chart.series.map((s) => s.key),
    chart.agg,
  );
  return (
    <ComparisonBarChart
      data={aggregated}
      categoryKey="dim"
      series={chart.series}
      format={chart.format}
    />
  );
}
