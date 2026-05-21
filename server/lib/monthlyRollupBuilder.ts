import { db } from '../firebaseAdmin';
import {
  fetchAnalyticsEventsByDateRangeAdmin,
  getMonthlyCostsAdmin,
  saveAnalyticsMonthlyRollupAdmin,
} from '../repositories/analyticsAdminRepository';
import {
  buildMonthlyDashboardBundleFromEvents,
  buildMonthlyRollupDocument,
  monthBounds,
} from '../../services/analyticsAggregation';

/**
 * Rebuild `analytics_monthly_rollups/{YYYY-MM}` from paginated `analytics_events`.
 * Intended for admin jobs / Cloud Scheduler — not called per user request.
 */
export async function rebuildMonthlyAnalyticsRollup(monthKey: string): Promise<void> {
  const { currentStart, currentEnd, prevStart, prevEnd } = monthBounds(monthKey);
  const [currentEvents, prevEvents, costs] = await Promise.all([
    fetchAnalyticsEventsByDateRangeAdmin(db, currentStart, currentEnd),
    fetchAnalyticsEventsByDateRangeAdmin(db, prevStart, prevEnd),
    getMonthlyCostsAdmin(db, monthKey),
  ]);

  const bundle = buildMonthlyDashboardBundleFromEvents(monthKey, currentEvents, prevEvents, costs);
  const doc = buildMonthlyRollupDocument(monthKey, bundle);
  await saveAnalyticsMonthlyRollupAdmin(db, monthKey, doc);
}
