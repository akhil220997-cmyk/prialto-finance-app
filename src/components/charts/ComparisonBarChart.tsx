'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { resolveFormat, type FormatKey } from '@/lib/format';
import { sumOf, pctOfTotal } from '@/lib/rangeAggregate';

interface ComparisonBarChartProps {
  data: Record<string, unknown>[];
  categoryKey: string;
  series: { key: string; label: string; color: string }[];
  format?: FormatKey;
  height?: number;
}

// Two related measures on ONE shared axis/unit (hours included vs. hours
// delivered — never a dual-axis chart). Legend always present for >=2 series,
// each direct-labeled in the legend rather than on every bar.
export function ComparisonBarChart({ data, categoryKey, series, format, height = 260 }: ComparisonBarChartProps) {
  const formatValue = resolveFormat(format);
  const total = sumOf(
    data.flatMap((row) => series.map((s) => (typeof row[s.key] === 'number' ? (row[s.key] as number) : 0))),
  );
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }} barGap={2}>
        <CartesianGrid stroke="var(--gridline)" vertical={false} />
        <XAxis dataKey={categoryKey} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={{ stroke: 'var(--baseline)' }} tickLine={false} />
        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={formatValue} width={64} />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
          contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }}
          formatter={(value: number, name: string) => [
            `${formatValue(value)} (${pctOfTotal(value, total).toFixed(1)}% of total)`,
            name,
          ]}
          labelStyle={{ color: 'var(--text-secondary)' }}
        />
        <Legend
          verticalAlign="top"
          height={28}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }}
        />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={28} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
