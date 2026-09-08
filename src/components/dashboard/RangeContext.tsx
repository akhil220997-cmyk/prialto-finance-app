'use client';

import { createContext, useContext, useState, useMemo } from 'react';
import { DEFAULT_RANGE, type RangeSelection } from '@/lib/rangeAggregate';
import { RangeControl } from '@/components/ui/RangeControl';

interface RangeContextValue {
  globalRange: RangeSelection;
  setGlobalRange: (r: RangeSelection) => void;
}

const RangeContext = createContext<RangeContextValue | null>(null);

// Wraps an entire dashboard page. Every SectionCard on the page reads the
// shared "global" range from here by default; an individual card can still
// break away and pick its own range (see SectionCard's `following` toggle).
export function RangeProvider({ children }: { children: React.ReactNode }) {
  const [globalRange, setGlobalRange] = useState<RangeSelection>(DEFAULT_RANGE);
  const value = useMemo(() => ({ globalRange, setGlobalRange }), [globalRange]);
  return <RangeContext.Provider value={value}>{children}</RangeContext.Provider>;
}

export function useRangeContext(): RangeContextValue {
  const ctx = useContext(RangeContext);
  if (!ctx) throw new Error('useRangeContext must be used within a RangeProvider');
  return ctx;
}

// Small control meant to sit near the page's FilterBar — sets the range
// every SectionCard on the page uses unless that card has been switched to
// its own custom range.
export function PageRangeBar({ months }: { months: string[] }) {
  const { globalRange, setGlobalRange } = useRangeContext();
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2">
      <span className="text-xs font-medium text-[var(--text-secondary)]">Apply to all charts:</span>
      <RangeControl months={months} value={globalRange} onChange={setGlobalRange} label="this page" />
      <span className="ml-auto text-xs text-[var(--text-muted)]">
        Any chart can still be set to its own range individually.
      </span>
    </div>
  );
}
