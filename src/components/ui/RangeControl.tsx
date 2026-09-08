'use client';

import { RANGE_PRESET_LABELS, type RangePreset, type RangeSelection } from '@/lib/rangeAggregate';

const PRESET_ORDER: RangePreset[] = ['3m', '6m', '12m', 'ytd', 'lastYear', 'all', 'custom'];

interface RangeControlProps {
  months: string[]; // ascending "YYYY-MM", full available set for this data
  value: RangeSelection;
  onChange: (next: RangeSelection) => void;
  label: string; // aria-label context, e.g. "Revenue trend"
  // When this card is following a page-level global range, show a small
  // "Custom for this chart" toggle instead of the full control, so the
  // common case (everything follows the page range) stays visually quiet.
  following?: boolean;
  onStopFollowing?: () => void;
}

function monthDisplay(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function RangeControl({ months, value, onChange, label, following, onStopFollowing }: RangeControlProps) {
  if (following) {
    return (
      <button
        onClick={onStopFollowing}
        className="rounded-lg border border-dashed border-[var(--border)] px-2 py-1 text-xs text-[var(--text-muted)] transition-colors hover:border-[var(--brand)]/50 hover:text-[var(--text-secondary)]"
        title="This chart is following the page-level date range. Click to set its own."
      >
        Following page range
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <select
        value={value.preset}
        onChange={(e) => onChange({ ...value, preset: e.target.value as RangePreset })}
        className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--brand)]/40"
        aria-label={`Date range for ${label}`}
      >
        {PRESET_ORDER.map((p) => (
          <option key={p} value={p}>
            {RANGE_PRESET_LABELS[p]}
          </option>
        ))}
      </select>
      {value.preset === 'custom' && (
        <>
          <select
            value={value.customFrom ?? months[0]}
            onChange={(e) => onChange({ ...value, customFrom: e.target.value })}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1 text-xs text-[var(--text-secondary)]"
            aria-label={`Custom range start for ${label}`}
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {monthDisplay(m)}
              </option>
            ))}
          </select>
          <span className="text-[var(--text-muted)]">–</span>
          <select
            value={value.customTo ?? months[months.length - 1]}
            onChange={(e) => onChange({ ...value, customTo: e.target.value })}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1 text-xs text-[var(--text-secondary)]"
            aria-label={`Custom range end for ${label}`}
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {monthDisplay(m)}
              </option>
            ))}
          </select>
        </>
      )}
    </div>
  );
}
