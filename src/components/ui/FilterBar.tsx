'use client';

// Filters sit in one row above the charts (per the dataviz skill's interaction
// spec). Wired to be extended with real query-param-driven filtering once
// live data (with real client/region/tier dimensions) is flowing; for now the
// mock dataset already reflects a "last 18 months" default range.
export function FilterBar() {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <select className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-sm text-[var(--text-primary)]" defaultValue="18m">
        <option value="6m">Last 6 months</option>
        <option value="12m">Last 12 months</option>
        <option value="18m">Last 18 months</option>
        <option value="ytd">Year to date</option>
      </select>
      <select className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-sm text-[var(--text-primary)]" defaultValue="all">
        <option value="all">All tiers</option>
        <option value="Fractional">Fractional</option>
        <option value="Full-Time">Full-Time</option>
        <option value="Enterprise">Enterprise</option>
      </select>
      <select className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-sm text-[var(--text-primary)]" defaultValue="all">
        <option value="all">All delivery centers</option>
        <option value="GT">GT — Guatemala</option>
        <option value="PH">PH — Philippines</option>
        <option value="KE">KE — Kenya</option>
      </select>
      <span className="ml-auto text-xs text-[var(--text-muted)]">
        Showing demo data — connect live sources in Data Health
      </span>
    </div>
  );
}
