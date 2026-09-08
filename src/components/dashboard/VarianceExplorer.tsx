'use client';

import { useMemo, useState } from 'react';
import type { VarianceDataset } from '@/lib/types';
import { resolveFormat, pctSigned } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { CategoryBarChart } from '@/components/charts/CategoryBarChart';

function monthDisplay(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

const SIGNED_FORMAT: Record<string, 'usdSigned' | 'pctSigned' | 'countSigned'> = {
  usd: 'usdSigned',
  pct: 'pctSigned',
  count: 'countSigned',
};

interface Row {
  key: string;
  label: string;
  baselineValue: number;
  comparisonValue: number;
  deltaAbs: number;
  deltaPct: number;
  isGood: boolean;
  formatted: (v: number) => string;
  formattedSigned: (v: number) => string;
}

// Interactive month-over-month (or any-two-period) variance view. The whole
// dataset is fetched once, server-side; picking either period here is a pure
// client-side recompute — no re-fetch, so the comparison feels instant no
// matter which two months the viewer lands on.
export function VarianceExplorer({ dataset }: { dataset: VarianceDataset }) {
  const { months, metrics } = dataset;
  const [baselineMonth, setBaselineMonth] = useState(months[months.length - 2]);
  const [comparisonMonth, setComparisonMonth] = useState(months[months.length - 1]);

  const rows: Row[] = useMemo(() => {
    return metrics.map((m) => {
      const baselineValue = m.series.find((p) => p.month === baselineMonth)?.value ?? 0;
      const comparisonValue = m.series.find((p) => p.month === comparisonMonth)?.value ?? 0;
      const deltaAbs = comparisonValue - baselineValue;
      const deltaPct = baselineValue !== 0 ? (deltaAbs / Math.abs(baselineValue)) * 100 : 0;
      const isGood = m.goodDirection === 'up' ? deltaAbs >= 0 : deltaAbs <= 0;
      return {
        key: m.key,
        label: m.label,
        baselineValue,
        comparisonValue,
        deltaAbs,
        deltaPct,
        isGood,
        formatted: resolveFormat(m.format),
        formattedSigned: resolveFormat(SIGNED_FORMAT[m.format] ?? m.format),
      };
    });
  }, [metrics, baselineMonth, comparisonMonth]);

  const chartData = rows.map((r) => ({ name: r.label, value: Math.round(r.deltaPct * 10) / 10 }));

  return (
    <div>
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
          Baseline period
          <select
            value={baselineMonth}
            onChange={(e) => setBaselineMonth(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {monthDisplay(m)}
              </option>
            ))}
          </select>
        </label>
        <span className="pb-2 text-[var(--text-muted)]">vs.</span>
        <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
          Comparison period
          <select
            value={comparisonMonth}
            onChange={(e) => setComparisonMonth(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {monthDisplay(m)}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={() => {
            setBaselineMonth(months[months.length - 2]);
            setComparisonMonth(months[months.length - 1]);
          }}
          className="mb-0.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-white/5"
        >
          Reset to latest MoM
        </button>
        <button
          onClick={() => {
            const idx = months.indexOf(comparisonMonth);
            const quarterAgoIdx = idx - 3;
            if (quarterAgoIdx >= 0) {
              setBaselineMonth(months[quarterAgoIdx]);
            }
          }}
          className="mb-0.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-white/5"
        >
          Compare to last quarter (QoQ)
        </button>
        <button
          onClick={() => {
            const idx = months.indexOf(comparisonMonth);
            const yearAgoIdx = idx - 12;
            if (yearAgoIdx >= 0) {
              setBaselineMonth(months[yearAgoIdx]);
            }
          }}
          className="mb-0.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-white/5"
        >
          Compare to same month last year (YoY)
        </button>
      </div>

      <div className="hover-card mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
        <h2 className="text-sm font-medium text-[var(--text-primary)]">
          % change, {monthDisplay(baselineMonth)} → {monthDisplay(comparisonMonth)}
        </h2>
        <div className="mt-3">
          <CategoryBarChart data={chartData} format="pctSigned" horizontal height={280} />
        </div>
      </div>

      <div className="hover-card mt-4 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--gridline)] text-[var(--text-secondary)]">
              <th scope="col" className="px-4 py-2.5 text-left font-medium">Metric</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">{monthDisplay(baselineMonth)}</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">{monthDisplay(comparisonMonth)}</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Δ Absolute</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Δ %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-[var(--gridline)] last:border-0 hover:bg-white/[0.03]">
                <td className="px-4 py-2.5 text-[var(--text-primary)]">{r.label}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-secondary)]">{r.formatted(r.baselineValue)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-primary)]">{r.formatted(r.comparisonValue)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-secondary)]">
                  {r.formattedSigned(r.deltaAbs)}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Badge status={r.isGood ? 'good' : 'critical'}>{pctSigned(r.deltaPct)}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
