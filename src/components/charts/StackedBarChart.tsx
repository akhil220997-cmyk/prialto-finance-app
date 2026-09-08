'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { resolveFormat, type FormatKey } from '@/lib/format';
import { pctOfTotal } from '@/lib/rangeAggregate';

const SERIES_COLORS = [
  'var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)',
  'var(--series-5)', 'var(--series-6)', 'var(--series-7)', 'var(--series-8)',
];

interface StackedBarChartProps {
  data: Record<string, unknown>[];
  categoryKey: string;
  series: { key: string; label: string }[];
  format?: FormatKey;
  height?: number;
}

// A whole-composition-over-time chart — one measure (e.g. MRR) split into a
// fixed set of categories (e.g. tier) and stacked per period. Same fixed
// categorical color order as every other chart, a 2px surface gap between
// segments (thin border + radius on the top segment only), legend always
// present since this is always >=2 series by definition.
export function StackedBarChart({ data, categoryKey, series, format, height = 260 }: StackedBarChartProps) {
  const formatValue = resolveFormat(format);
  // % shown on hover is this segment's share of ITS OWN category's stack
  // total (e.g. Fractional's share of that month's total MRR) — the
  // reading that actually matters for a stacked composition chart.
  const rowTotal = (row: Record<string, unknown> | undefined) =>
    row ? series.reduce((s, ser) => s + (typeof row[ser.key] === 'number' ? (row[ser.key] as number) : 0), 0) : 0;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }} barCategoryGap={8}>
        <CartesianGrid stroke="var(--gridline)" vertical={false} />
        <XAxis dataKey={categoryKey} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={{ stroke: 'var(--baseline)' }} tickLine={false} />
        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={formatValue} width={64} />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
          contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }}
          formatter={(value: number, name: string, entry: unknown) => {
            const payload = (entry as { payload?: Record<string, unknown> } | undefined)?.payload;
            const pct = pctOfTotal(value, rowTotal(payload));
            return [`${formatValue(value)} (${pct.toFixed(1)}% of this bar)`, name];
          }}
          labelStyle={{ color: 'var(--text-secondary)' }}
        />
        <Legend
          verticalAlign="top"
          height={28}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }}
        />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId="stack"
            fill={SERIES_COLORS[i % SERIES_COLORS.length]}
            radius={i === series.length - 1 ? [4, 4, 0, 0] : 0}
            maxBarSize={40}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
