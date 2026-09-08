import clsx from 'clsx';
import { Sparkline } from './Sparkline';

interface StatTileProps {
  label: string;
  value: string;
  deltaPct?: number;
  deltaGoodDirection?: 'up' | 'down';
  hint?: string;
  // Optional trailing trend — a quick "which way is this moving" glance
  // alongside the headline number, using the same series already fetched
  // for the page's trend chart (no extra data fetch).
  sparklineData?: number[];
  sparklineColor?: string;
}

export function StatTile({
  label,
  value,
  deltaPct,
  deltaGoodDirection = 'up',
  hint,
  sparklineData,
  sparklineColor,
}: StatTileProps) {
  const isGood =
    deltaPct === undefined
      ? undefined
      : deltaGoodDirection === 'up'
        ? deltaPct >= 0
        : deltaPct <= 0;

  return (
    <div className="hover-card group rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm text-[var(--text-secondary)]">{label}</div>
        {sparklineData && sparklineData.length > 1 && (
          <Sparkline
            data={sparklineData}
            color={sparklineColor ?? (isGood === false ? 'var(--status-critical)' : 'var(--series-1)')}
          />
        )}
      </div>
      <div className="mt-2 text-3xl font-semibold tabular-nums text-[var(--text-primary)] transition-colors duration-200 group-hover:text-[var(--brand-strong)]">
        {value}
      </div>
      {deltaPct !== undefined && (
        <div
          className={clsx(
            'mt-1 text-sm tabular-nums transition-transform duration-200 group-hover:translate-x-0.5',
            isGood ? 'text-[var(--status-good)]' : 'text-[var(--status-critical)]',
          )}
        >
          {deltaPct >= 0 ? '▲' : '▼'} {Math.abs(deltaPct).toFixed(1)}% vs. prior period
        </div>
      )}
      {hint && <div className="mt-1 text-xs text-[var(--text-muted)]">{hint}</div>}
    </div>
  );
}
