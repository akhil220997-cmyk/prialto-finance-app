import clsx from 'clsx';

type Status = 'good' | 'warning' | 'serious' | 'critical' | 'neutral';

const STATUS_STYLES: Record<Status, string> = {
  good: 'text-[var(--status-good)] border-[var(--status-good)]/30 bg-[var(--status-good)]/10',
  warning: 'text-[var(--status-warning-text)] border-[var(--status-warning)]/40 bg-[var(--status-warning)]/15',
  serious: 'text-[var(--status-serious)] border-[var(--status-serious)]/30 bg-[var(--status-serious)]/10',
  critical: 'text-[var(--status-critical)] border-[var(--status-critical)]/30 bg-[var(--status-critical)]/10',
  neutral: 'text-[var(--text-secondary)] border-[var(--border)] bg-white/5',
};

// Status is always paired with an icon + label, never color alone.
const STATUS_ICON: Record<Status, string> = {
  good: '●',
  warning: '▲',
  serious: '▲',
  critical: '■',
  neutral: '●',
};

export function Badge({ status, children }: { status: Status; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        STATUS_STYLES[status],
      )}
    >
      <span aria-hidden>{STATUS_ICON[status]}</span>
      {children}
    </span>
  );
}
