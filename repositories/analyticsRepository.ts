import {
  addDoc,
  collection,
  db,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where
} from '../firebase';

export interface AnalyticsEventRecord {
  event_name?: string;
  user_id?: string;
  model_name?: string;
  generation_type?: string;
  image_count?: number;
  estimated_api_cost?: number;
  duration_ms?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  status?: string;
  error_code?: string;
  timestamp?: { toDate?: () => Date } | Date | null;
}

export interface MonthlyCostsRecord {
  storage_cost: number;
  server_cost: number;
  bandwidth_cost: number;
  other_cost: number;
}

export async function addAnalyticsEvent(
  eventName: string,
  payload: Record<string, unknown>
): Promise<void> {
  const eventsRef = collection(db, 'analytics_events');
  await addDoc(eventsRef, {
    event_name: eventName,
    timestamp: serverTimestamp(),
    ...payload
  });
}

export async function getAnalyticsEventsByDateRange(
  startDate: Date,
  endDate: Date
): Promise<AnalyticsEventRecord[]> {
  const eventsRef = collection(db, 'analytics_events');
  const q = query(
    eventsRef,
    where('timestamp', '>=', startDate),
    where('timestamp', '<', endDate)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((eventDoc) => eventDoc.data() as AnalyticsEventRecord);
}

export async function getAnalyticsEventsByDateRangeAndName(
  startDate: Date,
  endDate: Date,
  eventName: string
): Promise<AnalyticsEventRecord[]> {
  const eventsRef = collection(db, 'analytics_events');
  const q = query(
    eventsRef,
    where('timestamp', '>=', startDate),
    where('timestamp', '<', endDate),
    where('event_name', '==', eventName)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((eventDoc) => eventDoc.data() as AnalyticsEventRecord);
}

export async function saveMonthlyCostsRecord(
  monthKey: string,
  costs: MonthlyCostsRecord
): Promise<void> {
  const docRef = doc(db, 'monthly_costs', monthKey);
  await setDoc(docRef, costs);
}

export async function getMonthlyCostsRecord(monthKey: string): Promise<MonthlyCostsRecord | null> {
  const docRef = doc(db, 'monthly_costs', monthKey);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    return null;
  }
  return snap.data() as MonthlyCostsRecord;
}
