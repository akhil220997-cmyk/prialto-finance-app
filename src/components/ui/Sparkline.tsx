interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}

// A minimal inline trend line for a StatTile — not a full chart (no axes,
// no tooltip, no legend; a single glance at "which way is this moving").
// Pure presentational, no interactivity, so it's safe inside a Server
// Component StatTile without a 'use client' boundary.
export function Sparkline({ data, color = 'var(--series-1)', height = 28, width = 84 }: SparklineProps) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data
    .map((v, i) => `${(i * stepX).toFixed(1)},${(height - ((v - min) / range) * height).toFixed(1)}`)
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
