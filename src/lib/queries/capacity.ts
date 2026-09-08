import { getCapacityStaffingSummary as getMockCapacityStaffingSummary } from '@/lib/mock-data';
import type { CapacityStaffingSummary, Filters } from '@/lib/types';

const USE_MOCK_DATA = process.env.USE_MOCK_DATA !== 'false';

/**
 * Capacity & Staffing summary — headcount, bench coverage, the ~4-week
 * training pipeline, and hiring pace vs. unit growth, broken out by delivery
 * center (GT/PH/KE). There is no live source for this yet: headcount and
 * training-cohort status live in the HR/ATS system, which isn't one of the
 * three systems currently synced (Salesforce, QuickBooks, Time Doctor).
 * Ships on mock data until that connection exists; the shape here is the
 * target contract for whatever feeds it next.
 */
export async function getCapacityStaffingSummary(_filters?: Partial<Filters>): Promise<CapacityStaffingSummary> {
  if (USE_MOCK_DATA) return getMockCapacityStaffingSummary();

  // TODO: no live source connected yet (see docstring above) — once an HR/ATS
  // system is added to the integrations list, replace this with a real query
  // the same way lib/queries/financials.ts reads from FinancialStatementLine.
  // That includes availableCapacityByTimeZone (needs assistant time-zone
  // tracking, unconfirmed today) and hiringLeadTimeWeeks/Trend (needs a real
  // hire-start-date field, also HR/ATS-sourced).
  return getMockCapacityStaffingSummary();
}
