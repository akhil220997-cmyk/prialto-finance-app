import { getChurnSummary as getMockChurnSummary } from '@/lib/mock-data';
import type { ChurnSummary, Filters } from '@/lib/types';

const USE_MOCK_DATA = process.env.USE_MOCK_DATA !== 'false';

/**
 * Deep churn breakdown — by service segment, by assigned delivery team, by
 * delivery center, and by tenure-at-churn age bracket (Akhil's spec,
 * 2026-08-17). Live mode needs Unit rows to carry a churn date, a
 * tenure-at-churn value, and an assigned-team field, none of which the sync
 * job writes yet — ships on mock data until that schema/sync work lands.
 */
export async function getChurnSummary(_filters?: Partial<Filters>): Promise<ChurnSummary> {
  if (USE_MOCK_DATA) return getMockChurnSummary();

  // TODO: once Unit carries churnedAt + assignedTeam, replace this with a
  // real query the same way lib/queries/revenue.ts reads from Unit/Opportunity —
  // group churned units by segment/team/region and by
  // (churnedAt - createdAt) bucketed into the six age brackets.
  return getMockChurnSummary();
}
