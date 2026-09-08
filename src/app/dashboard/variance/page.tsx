import { getVarianceDataset } from '@/lib/queries/variance';
import { VarianceExplorer } from '@/components/dashboard/VarianceExplorer';

export const dynamic = 'force-dynamic';

export default async function VariancePage() {
  const dataset = await getVarianceDataset();

  return (
    <div>
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">Variance (Month-over-Month)</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Pick any two periods and see how every key metric moved between them — not locked to
        last-month-vs-this-month. Useful for a clean MoM read, a YoY comparison, or checking
        movement since a specific board or budget month.
      </p>

      <div className="mt-6">
        <VarianceExplorer dataset={dataset} />
      </div>
    </div>
  );
}
