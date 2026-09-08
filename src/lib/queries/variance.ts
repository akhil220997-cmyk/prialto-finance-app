import { getVarianceDataset as getMockVarianceDataset } from '@/lib/mock-data';
import type { VarianceDataset } from '@/lib/types';

const USE_MOCK_DATA = process.env.USE_MOCK_DATA !== 'false';

/**
 * Variance dataset — every month's value for a fixed set of key metrics
 * (MRR, margin, utilization, cash, headcount, DSO, ARPU). Fetched once,
 * server-side; the Variance page is a Client Component that lets the viewer
 * pick any two months and computes deltas in the browser with no re-fetch.
 */
export async function getVarianceDataset(): Promise<VarianceDataset> {
  if (USE_MOCK_DATA) return getMockVarianceDataset();

  // TODO: once MonthlyMetric has >=24mo of history for each of these metric
  // keys, read them here the same way lib/queries/revenue.ts reads "mrr".
  return getMockVarianceDataset();
}
