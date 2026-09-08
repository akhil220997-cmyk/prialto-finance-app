// Shared value formatters for chart tick/tooltip labels.
//
// Server Components (the dashboard pages) cannot pass functions as props to
// Client Components (the recharts wrappers below) — React Server Components
// can only serialize plain data across that boundary. So pages pass a format
// *key* (a string) instead of a formatter function, and each client chart
// component looks the function up here itself, entirely client-side.

export const usd = (v: number) => `$${Math.round(v).toLocaleString()}`;
export const usdSigned = (v: number) => `${v < 0 ? '-' : ''}$${Math.abs(Math.round(v)).toLocaleString()}`;
export const usdCompact = (v: number) =>
  `$${v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + 'M' : (v / 1000).toFixed(0) + 'K'}`;
export const usdCompactM = (v: number) => `$${(v / 1_000_000).toFixed(2)}M`;
export const pct = (v: number) => `${v.toFixed(1)}%`;
export const pctSigned = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
export const hrs = (v: number) => `${Math.round(v).toLocaleString()} hrs`;
export const count = (v: number) => v.toLocaleString();
export const countSigned = (v: number) => `${v >= 0 ? '+' : ''}${Math.round(v).toLocaleString()}`;

export type FormatKey =
  | 'usd'
  | 'usdSigned'
  | 'usdCompact'
  | 'usdCompactM'
  | 'pct'
  | 'pctSigned'
  | 'hrs'
  | 'count'
  | 'countSigned';

export const FORMATTERS: Record<FormatKey, (v: number) => string> = {
  usd,
  usdSigned,
  usdCompact,
  usdCompactM,
  pct,
  pctSigned,
  hrs,
  count,
  countSigned,
};

export function resolveFormat(key?: FormatKey): (v: number) => string {
  return (key && FORMATTERS[key]) || count;
}
