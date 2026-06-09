import admin from 'firebase-admin';
import { db } from '../../firebaseAdmin';
import {
  RATE_LIMIT_FIRESTORE_COLLECTION,
  RATE_LIMIT_REQUESTS_PER_MINUTE,
  RATE_LIMIT_WINDOW_MS,
} from './config';

function windowDocId(userId: string, now = Date.now()): string {
  const windowIndex = Math.floor(now / RATE_LIMIT_WINDOW_MS);
  return `${userId}_${windowIndex}`;
}

/**
 * Fixed-window counter in Firestore — safe across multiple Cloud Run instances.
 */
export async function tryConsumeRateLimitFirestore(userId: string): Promise<boolean> {
  const now = Date.now();
  const docId = windowDocId(userId, now);
  const ref = db.collection(RATE_LIMIT_FIRESTORE_COLLECTION).doc(docId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = snap.exists ? Number(snap.data()?.count ?? 0) : 0;
    if (count >= RATE_LIMIT_REQUESTS_PER_MINUTE) {
      return false;
    }
    tx.set(
      ref,
      {
        userId,
        count: count + 1,
        windowMs: RATE_LIMIT_WINDOW_MS,
        windowIndex: Math.floor(now / RATE_LIMIT_WINDOW_MS),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        expireAt: new Date(now + 2 * RATE_LIMIT_WINDOW_MS),
      },
      { merge: true }
    );
    return true;
  });
}
