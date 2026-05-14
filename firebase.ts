import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
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
  enableMultiTabIndexedDbPersistence,
} from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

/**
 * IndexedDB persistence — **multi-tab only** (shared cache across tabs).
 * Không dùng `enableIndexedDbPersistence` (single-tab) để tránh failed-precondition khi mở nhiều tab.
 * Gọi sớm sau `getFirestore`; lỗi chỉ log — app vẫn chạy ở chế độ memory cache.
 */
void enableMultiTabIndexedDbPersistence(db).catch((err: unknown) => {
  const code =
    typeof err === 'object' && err !== null && 'code' in err ? String((err as { code?: string }).code) : '';
  if (code === 'failed-precondition') {
    console.warn(
      '[Firestore] Multi-tab persistence: failed-precondition (môi trường hoặc client khác đã chiếm persistence).',
    );
  } else if (code === 'unimplemented') {
    console.warn('[Firestore] Multi-tab persistence: không được trình duyệt hỗ trợ (ví dụ chế độ riêng tư).');
  } else {
    console.warn('[Firestore] Multi-tab persistence không bật được:', err);
  }
});

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
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

/** Firestore / network conditions where rethrowing would surface as unhandled rejections in void async hooks. */
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
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

export { signInWithPopup, signOut, onAuthStateChanged, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where, orderBy, limit, startAfter, addDoc, onSnapshot, serverTimestamp, getDocFromServer, getCountFromServer };
