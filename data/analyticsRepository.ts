import type { QueryDocumentSnapshot } from 'firebase/firestore';
import {
  addDoc,
  collection,
  db,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  where,
  writeBatch,
} from '../firebase';

/** Giới hạn mỗi lần getDocs — tránh một response quá lớn khi analytics_events dày. */
export const ANALYTICS_EVENTS_PAGE_SIZE = 500;

/** Doc `analytics_monthly_rollups/{YYYY-MM}` do Cloud Function / job ghi — dashboard đọc 1 doc thay vì quét events. */
export const ANALYTICS_MONTHLY_ROLLUPS_COLLECTION = 'analytics_monthly_rollups';

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
  error_message_short?: string;
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

export async function addAnalyticsEventBatch(
  events: Array<{ name: string; payload: Record<string, unknown> }>
): Promise<void> {
  if (events.length === 0) return;
  const eventsRef = collection(db, 'analytics_events');
  const batch = writeBatch(db);
  for (const ev of events) {
    const ref = doc(eventsRef);
    batch.set(ref, {
      event_name: ev.name,
      timestamp: serverTimestamp(),
      ...ev.payload,
    });
  }
  await batch.commit();
}

export async function getAnalyticsEventsByDateRange(
  startDate: Date,
  endDate: Date
): Promise<AnalyticsEventRecord[]> {
  const eventsRef = collection(db, 'analytics_events');
  const out: AnalyticsEventRecord[] = [];
  let lastDoc: QueryDocumentSnapshot | undefined;

  while (true) {
    const base = [
      where('timestamp', '>=', startDate),
      where('timestamp', '<', endDate),
      orderBy('timestamp', 'asc'),
      limit(ANALYTICS_EVENTS_PAGE_SIZE),
    ] as const;
    const q = lastDoc ? query(eventsRef, ...base, startAfter(lastDoc)) : query(eventsRef, ...base);
    const snapshot = await getDocs(q);
    if (snapshot.empty) break;
    snapshot.docs.forEach((eventDoc) => {
      out.push(eventDoc.data() as AnalyticsEventRecord);
    });
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < ANALYTICS_EVENTS_PAGE_SIZE) break;
  }

  return out;
}

export async function getAnalyticsEventsByDateRangeAndName(
  startDate: Date,
  endDate: Date,
  eventName: string
): Promise<AnalyticsEventRecord[]> {
  const eventsRef = collection(db, 'analytics_events');
  const out: AnalyticsEventRecord[] = [];
  let lastDoc: QueryDocumentSnapshot | undefined;

  while (true) {
    const base = [
      where('event_name', '==', eventName),
      where('timestamp', '>=', startDate),
      where('timestamp', '<', endDate),
      orderBy('timestamp', 'asc'),
      limit(ANALYTICS_EVENTS_PAGE_SIZE),
    ] as const;
    const q = lastDoc ? query(eventsRef, ...base, startAfter(lastDoc)) : query(eventsRef, ...base);
    const snapshot = await getDocs(q);
    if (snapshot.empty) break;
    snapshot.docs.forEach((eventDoc) => {
      out.push(eventDoc.data() as AnalyticsEventRecord);
    });
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < ANALYTICS_EVENTS_PAGE_SIZE) break;
  }

  return out;
}

/** Dữ liệu rollup thô (Firestore) — service layer kiểm tra `version` và các field bắt buộc. */
export async function getAnalyticsMonthlyRollupRaw(monthKey: string): Promise<Record<string, unknown> | null> {
  const ref = doc(db, ANALYTICS_MONTHLY_ROLLUPS_COLLECTION, monthKey);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as Record<string, unknown>;
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
