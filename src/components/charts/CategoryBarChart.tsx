'use client';

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { resolveFormat, type FormatKey } from '@/lib/format';
import { sumOf, pctOfTotal } from '@/lib/rangeAggregate';

// Fixed categorical order — the eight validated series slots, in this order,
// never cycled/re-sorted by filter state.
const SERIES_COLORS = [
  'var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)',
  'var(--series-5)', 'var(--series-6)', 'var(--series-7)', 'var(--series-8)',
];

interface CategoryBarChartProps {
  data: { name: string; value: number }[];
  format?: FormatKey;
  height?: number;
  horizontal?: boolean;
}

// One measure across a small number of categories (units by tier, revenue by
// region, opex by department). Single hue per bar drawn from the fixed
// categorical order; 4px rounded data-end; thin 2px surface gap between bars.
export function CategoryBarChart({ data, format, height = 240, horizontal = false }: CategoryBarChartProps) {
  const formatValue = resolveFormat(format);
  const total = sumOf(data.map((d) => d.value));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 8, right: 12, bottom: 0, left: horizontal ? 8 : 0 }}
        barCategoryGap={8}
      >
        <CartesianGrid stroke="var(--gridline)" vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={formatValue} />
            <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} width={120} />
          </>
        ) : (
          <>
            <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={{ stroke: 'var(--baseline)' }} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={formatValue} width={64} />
          </>
        )}
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
          contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }}
          formatter={(value: number) => [`${formatValue(value)} (${pctOfTotal(value, total).toFixed(1)}% of total)`, '']}
          labelStyle={{ color: 'var(--text-secondary)' }}
        />
        <Bar dataKey="value" radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={48}>
          {data.map((_, i) => (
            <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
