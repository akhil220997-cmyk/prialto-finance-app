'use client';

import { useMemo, useState } from 'react';
import type { FinancialsSummary } from '@/lib/types';
import { usdSigned as usd, pct } from '@/lib/format';
import { DataTable } from '@/components/ui/DataTable';

interface PeriodPnlTableProps {
  periods: FinancialsSummary['periodPnl'];
}

// P&L table with a period toggle (this month / last month / QTD / last
// quarter — Phil's ask) and a % of revenue column alongside the $ amount,
// so a leader can read cost structure independent of scale.
export function PeriodPnlTable({ periods }: PeriodPnlTableProps) {
  const [periodKey, setPeriodKey] = useState<FinancialsSummary['periodPnl'][number]['key']>('thisMonth');
  const active = periods.find((p) => p.key === periodKey) ?? periods[0];

  const rows = useMemo(() => {
    if (!active) return [];
    return active.pnl.map((r) => ({
      ...r,
      pctOfRevenue: active.revenue ? (r.amount / active.revenue) * 100 : 0,
    }));
  }, [active]);

  if (!active) {
    return <p className="text-sm text-[var(--text-secondary)]">No P&amp;L data for this period yet.</p>;
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriodKey(p.key)}
            className={
              p.key === periodKey
                ? 'rounded-lg border border-[var(--series-1)] bg-[var(--series-1)]/15 px-3 py-1 text-xs font-medium text-[var(--text-primary)]'
                : 'rounded-lg border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-white/5'
            }
          >
            {p.label}
          </button>
        ))}
      </div>
      <DataTable
        caption={`Profit and loss statement — ${active.label}`}
        rows={rows}
        columns={[
          { header: 'Category', accessor: (r) => r.category },
          { header: 'Account', accessor: (r) => r.account },
          { header: 'Amount', accessor: (r) => usd(r.amount), align: 'right' },
          { header: '% of Revenue', accessor: (r) => pct(r.pctOfRevenue), align: 'right' },
        ]}
      />
    </div>
  );
}
