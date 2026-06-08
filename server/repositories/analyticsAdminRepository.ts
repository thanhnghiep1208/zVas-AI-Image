import type { Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import type { AnalyticsEventRecord } from '../../data/analyticsRepository';
import { ANALYTICS_MONTHLY_ROLLUPS_COLLECTION } from '../../data/analyticsRepository';

const ANALYTICS_EVENTS_PAGE_SIZE = 500;

export async function fetchAnalyticsEventsByDateRangeAdmin(
  db: Firestore,
  startDate: Date,
  endDate: Date
): Promise<AnalyticsEventRecord[]> {
  const out: AnalyticsEventRecord[] = [];
  let lastDoc: QueryDocumentSnapshot | undefined;

  const baseQuery = db
    .collection('analytics_events')
    .where('timestamp', '>=', startDate)
    .where('timestamp', '<', endDate)
    .orderBy('timestamp', 'asc')
    .limit(ANALYTICS_EVENTS_PAGE_SIZE);

  while (true) {
    const q = lastDoc ? baseQuery.startAfter(lastDoc) : baseQuery;
    const snapshot = await q.get();
    if (snapshot.empty) break;

    snapshot.docs.forEach((eventDoc) => {
      out.push(eventDoc.data() as AnalyticsEventRecord);
    });

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < ANALYTICS_EVENTS_PAGE_SIZE) break;
  }

  return out;
}

export async function saveAnalyticsMonthlyRollupAdmin(
  db: Firestore,
  monthKey: string,
  payload: Record<string, unknown>
): Promise<void> {
  await db.collection(ANALYTICS_MONTHLY_ROLLUPS_COLLECTION).doc(monthKey).set(payload, { merge: true });
}

export async function getMonthlyCostsAdmin(
  db: Firestore,
  monthKey: string
): Promise<{
  storage_cost: number;
  server_cost: number;
  bandwidth_cost: number;
  other_cost: number;
} | null> {
  const snap = await db.collection('monthly_costs').doc(monthKey).get();
  if (!snap.exists) return null;
  return snap.data() as {
    storage_cost: number;
    server_cost: number;
    bandwidth_cost: number;
    other_cost: number;
  };
}
