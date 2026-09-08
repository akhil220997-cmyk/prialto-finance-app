'use client';

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { resolveFormat, type FormatKey } from '@/lib/format';
import { sumOf, pctOfTotal } from '@/lib/rangeAggregate';

interface TrendLineChartProps {
  data: { label: string; value: number }[];
  format?: FormatKey;
  color?: string;
  height?: number;
}

// Single-series trend line. One axis, one hue (--series-1), thin 2px line,
// no markers except on hover, crosshair tooltip — per the dataviz skill's
// mark spec for line/area forms. A single series needs no legend box.
export function TrendLineChart({ data, format, color = 'var(--series-1)', height = 240 }: TrendLineChartProps) {
  const formatValue = resolveFormat(format);
  const periodTotal = sumOf(data.map((d) => d.value));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--gridline)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
          axisLine={{ stroke: 'var(--baseline)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatValue}
          width={64}
        />
        <Tooltip
          cursor={{ stroke: 'var(--baseline)', strokeWidth: 1 }}
          contentStyle={{
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--text-primary)',
          }}
          formatter={(value: number) => [
            `${formatValue(value)} (${pctOfTotal(value, periodTotal).toFixed(1)}% of shown period)`,
            '',
          ]}
          labelStyle={{ color: 'var(--text-secondary)' }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: color, stroke: 'var(--surface-1)', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
