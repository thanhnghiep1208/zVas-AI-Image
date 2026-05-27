import {
  auth,
  db,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  orderBy,
  query,
  onSnapshot,
  serverTimestamp,
  isFirestorePermissionDenied,
  waitForAuthReady,
} from '../firebase';
import { buildDeviceLabel, clearLocalSessionId, getOrCreateLocalSessionId } from '../utils/authSessionId';

/** Subcollection: users/{uid}/sessions/{sessionId} */
export const USER_SESSIONS_SUBCOLLECTION = 'sessions';

export interface UserSessionRecord {
  sessionId: string;
  uid: string;
  deviceLabel: string;
  userAgent: string;
  platform: string;
  createdAt: unknown;
  lastActiveAt: unknown;
  revokedAt?: unknown | null;
}

function sessionRef(uid: string, sessionId: string) {
  return doc(db, 'users', uid, USER_SESSIONS_SUBCOLLECTION, sessionId);
}

function sessionsCollection(uid: string) {
  return collection(db, 'users', uid, USER_SESSIONS_SUBCOLLECTION);
}

async function ensureFirestoreAuth(expectedUid: string): Promise<void> {
  await waitForAuthReady();
  const current = auth.currentUser;
  if (!current) {
    throw new Error('AUTH_REQUIRED');
  }
  await current.getIdToken();
  if (current.uid !== expectedUid) {
    throw new Error('AUTH_UID_MISMATCH');
  }
}

export async function registerOrTouchUserSession(
  uid: string,
  allowRotateIfRevoked = true,
): Promise<string> {
  await ensureFirestoreAuth(uid);
  const sessionId = getOrCreateLocalSessionId();
  const ref = sessionRef(uid, sessionId);
  let snap;
  try {
    snap = await getDoc(ref);
  } catch (err) {
    if (isFirestorePermissionDenied(err)) {
      clearLocalSessionId();
      if (allowRotateIfRevoked) {
        return registerOrTouchUserSession(uid, false);
      }
      throw err;
    }
    throw err;
  }
  const now = serverTimestamp();
  const base = {
    sessionId,
    uid,
    deviceLabel: buildDeviceLabel(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : '',
    platform: typeof navigator !== 'undefined' ? navigator.platform.slice(0, 120) : '',
    lastActiveAt: now,
  };

  try {
    if (!snap.exists()) {
      await setDoc(ref, {
        ...base,
        createdAt: now,
        revokedAt: null,
      });
    } else {
      const data = snap.data() as UserSessionRecord;
      if (data.revokedAt) {
        if (allowRotateIfRevoked) {
          clearLocalSessionId();
          return registerOrTouchUserSession(uid, false);
        }
        throw new Error('SESSION_REVOKED');
      }
      await updateDoc(ref, {
        lastActiveAt: now,
        deviceLabel: base.deviceLabel,
        userAgent: base.userAgent,
        platform: base.platform,
      });
    }
  } catch (err) {
    if (isFirestorePermissionDenied(err)) {
      const e = new Error('SESSION_PERMISSION_DENIED');
      (e as Error & { cause?: unknown }).cause = err;
      throw e;
    }
    throw err;
  }
  return sessionId;
}

export async function touchUserSession(uid: string, sessionId: string): Promise<void> {
  await ensureFirestoreAuth(uid);
  await updateDoc(sessionRef(uid, sessionId), { lastActiveAt: serverTimestamp() });
}

export async function listUserSessions(uid: string): Promise<UserSessionRecord[]> {
  await ensureFirestoreAuth(uid);
  const q = query(sessionsCollection(uid), orderBy('lastActiveAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as UserSessionRecord);
}

export async function revokeUserSession(uid: string, sessionId: string): Promise<void> {
  await ensureFirestoreAuth(uid);
  await updateDoc(sessionRef(uid, sessionId), { revokedAt: serverTimestamp() });
}

export function subscribeUserSession(
  uid: string,
  sessionId: string,
  onChange: (revoked: boolean) => void,
  onError?: (err: unknown) => void,
): () => void {
  return onSnapshot(
    sessionRef(uid, sessionId),
    (snap) => {
      if (!snap.exists()) {
        onChange(false);
        return;
      }
      const data = snap.data() as UserSessionRecord;
      onChange(Boolean(data.revokedAt));
    },
    (err) => {
      onError?.(err);
    },
  );
}

export function toSessionDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const d = (value as { toDate: () => Date }).toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}
