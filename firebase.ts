import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  addDoc,
  onSnapshot,
  serverTimestamp,
  getDocFromServer,
  getCountFromServer,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

function logFirestoreCacheFallback(err: unknown): void {
  const code =
    typeof err === 'object' && err !== null && 'code' in err ? String((err as { code?: string }).code) : '';
  if (code === 'failed-precondition') {
    console.warn(
      '[Firestore] Multi-tab cache: failed-precondition (tab khác hoặc client cũ đã chiếm IndexedDB).',
    );
  } else if (code === 'unimplemented') {
    console.warn('[Firestore] Persistent cache: trình duyệt không hỗ trợ (ví dụ chế độ riêng tư).');
  } else {
    console.warn('[Firestore] Persistent cache không bật được, dùng cache mặc định:', err);
  }
}

/**
 * IndexedDB persistence — multi-tab (Firebase 12+ `localCache` API).
 * Fallback `getFirestore` nếu init cache thất bại (private mode, xung đột tab cũ).
 */
function createFirestore() {
  try {
    return initializeFirestore(
      app,
      {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      },
      firebaseConfig.firestoreDatabaseId
    );
  } catch (err: unknown) {
    logFirestoreCacheFallback(err);
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
}

export const db = createFirestore();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo?: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

/** Firestore / network conditions where rethrowing would surface as unhandled rejections in void async hooks. */
export function isFirestorePermissionDenied(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String((error as { code?: unknown }).code) === 'permission-denied';
  }
  const msg = error instanceof Error ? error.message : String(error);
  return /permission.denied|insufficient permissions/i.test(msg);
}

/** Chờ Auth init + ID token trước khi gọi Firestore (tránh permission-denied race). */
export async function waitForAuthReady(): Promise<void> {
  await new Promise<void>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      unsubscribe();
      resolve();
    });
  });
  const current = auth.currentUser;
  if (current) {
    await current.getIdToken();
  }
}

export function isFirestoreOfflineOrTransient(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  if (/client is offline|Failed to get document because the client is offline/i.test(msg)) return true;
  if (/network|UNAVAILABLE|unavailable|offline|Failed to fetch/i.test(msg)) return true;
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const c = String((error as { code?: unknown }).code);
    return ['unavailable', 'deadline-exceeded', 'resource-exhausted', 'aborted'].includes(c);
  }
  return false;
}

/** Structured log for Firestore failures. Does not throw — callers often use `void` async and must not create unhandled rejections. */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const authInfo = import.meta.env.DEV
    ? {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo: auth.currentUser?.providerData.map(provider => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
      }
    : { userId: auth.currentUser?.uid };
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo,
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

export { signInWithEmailAndPassword, signOut, onAuthStateChanged, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where, orderBy, limit, startAfter, addDoc, onSnapshot, serverTimestamp, getDocFromServer, getCountFromServer, writeBatch };
