import { prisma } from '@/lib/db';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';

export const dynamic = 'force-dynamic';

const USE_MOCK_DATA = process.env.USE_MOCK_DATA !== 'false';

const SOURCES = [
  { key: 'salesforce', label: 'Salesforce', feeds: 'Revenue & Unit Economics (bookings/pipeline)' },
  { key: 'quickbooks', label: 'QuickBooks Online', feeds: 'Core Financials, Revenue (realized)' },
  { key: 'timedoctor', label: 'Time Doctor', feeds: 'Utilization & Delivery Cost' },
];

export default async function DataHealthPage() {
  const runs = USE_MOCK_DATA
    ? []
    : await prisma.syncRun.findMany({ orderBy: { startedAt: 'desc' }, take: 20 });

  const latestBySource = new Map<string, (typeof runs)[number]>();
  for (const run of runs) {
    if (!latestBySource.has(run.source)) latestBySource.set(run.source, run);
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">Data Health</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Integration status for each connected system. Admins only — see docs/CREDENTIALS.md to
        connect a real source.
      </p>

      {USE_MOCK_DATA && (
        <div className="mt-4 rounded-lg border border-[var(--status-warning)]/40 bg-[var(--status-warning)]/10 px-4 py-3 text-sm text-[var(--status-warning-text)]">
          Running on demo data (<code>USE_MOCK_DATA=true</code>). Every dashboard is fully
          interactive, but nothing here reflects real Prialto numbers yet.
        </div>
      )}

      <div className="mt-4">
        <DataTable
          caption="Integration sync status"
          rows={SOURCES}
          columns={[
            { header: 'Source', accessor: (s) => s.label },
            { header: 'Feeds', accessor: (s) => s.feeds },
            {
              header: 'Status',
              accessor: (s) => {
                if (USE_MOCK_DATA) return <Badge status="neutral">Demo data</Badge>;
                const run = latestBySource.get(s.key);
                if (!run) return <Badge status="critical">Not connected</Badge>;
                if (run.status === 'success') return <Badge status="good">Synced</Badge>;
                if (run.status === 'running') return <Badge status="warning">Syncing…</Badge>;
                return <Badge status="critical">Failed</Badge>;
              },
              align: 'right',
            },
            {
              header: 'Last synced',
              accessor: (s) => {
                const run = latestBySource.get(s.key);
                return run?.finishedAt ? new Date(run.finishedAt).toLocaleString() : '—';
              },
              align: 'right',
            },
          ]}
        />
      </div>
    </div>
  );
}
