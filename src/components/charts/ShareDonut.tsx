'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { resolveFormat, type FormatKey } from '@/lib/format';
import { sumOf, pctOfTotal } from '@/lib/rangeAggregate';

const SERIES_COLORS = [
  'var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)',
  'var(--series-5)', 'var(--series-6)', 'var(--series-7)', 'var(--series-8)',
];

interface ShareDonutProps {
  data: { name: string; value: number }[];
  format?: FormatKey;
  height?: number;
}

// Composition / share-of-whole — capped at the palette's first-three-slots
// all-pairs-safe rule for scatter/pie-like forms; beyond that we'd fold extra
// categories into "Other" rather than add a 4th+ hue here.
export function ShareDonut({ data, format, height = 220 }: ShareDonutProps) {
  const formatValue = resolveFormat(format);
  const capped = data.length > 4 ? [...data.slice(0, 3), {
    name: 'Other',
    value: data.slice(3).reduce((s, d) => s + d.value, 0),
  }] : data;
  const total = sumOf(capped.map((d) => d.value));

  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={height} height={height}>
        <PieChart>
          <Pie data={capped} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="90%" paddingAngle={2} strokeWidth={2} stroke="var(--surface-1)">
            {capped.map((_, i) => (
              <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }}
            formatter={(value: number) => [`${formatValue(value)} (${pctOfTotal(value, total).toFixed(1)}% of total)`, '']}
          />
        </PieChart>
      </ResponsiveContainer>
      <ul className="flex flex-col gap-2 text-sm">
        {capped.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} aria-hidden />
            <span className="text-[var(--text-secondary)]">{d.name}</span>
            <span className="ml-auto tabular-nums text-[var(--text-primary)]">{formatValue(d.value)}</span>
            <span className="tabular-nums text-xs text-[var(--text-muted)]">({pctOfTotal(d.value, total).toFixed(0)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
