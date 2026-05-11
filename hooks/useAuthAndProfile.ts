import { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  db,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  handleFirestoreError,
  OperationType,
} from '../firebase';

const DEFAULT_ADMIN_EMAIL = 'thanhnghiep1208@gmail.com';

/** Polling profile — giảm read so với onSnapshot liên tục. */
const PROFILE_POLL_INTERVAL_MS = 90_000;
/** Khi quay lại tab, không refetch quá dày. */
const PROFILE_FOCUS_MIN_GAP_MS = 45_000;

/** `advice`: chỉ xem Analytics (Firestore rules + UI); không quản lý user / cấu hình. */
export type AppUserRole = 'admin' | 'editor' | 'advice';

export interface UserProfile {
  uid?: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  role?: AppUserRole | string;
  status?: string;
  createdAt?: unknown;
  [key: string]: unknown;
}

export interface UseAuthAndProfileOptions {
  onSignedOut: () => void;
  onLoginError?: (message: string) => void;
  onLoginSuccess?: (userId: string) => void;
}

export function useAuthAndProfile({
  onSignedOut,
  onLoginError,
  onLoginSuccess,
}: UseAuthAndProfileOptions) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let lastFetchAt = 0;

    const fetchUserProfile = async (currentUser: User, options?: { isInitial?: boolean }) => {
      const userRef = doc(db, 'users', currentUser.uid);
      const path = `users/${currentUser.uid}`;
      try {
        const docSnap = await getDoc(userRef);
        lastFetchAt = Date.now();
        if (docSnap.exists()) {
          setUserProfile(docSnap.data() as UserProfile);
          return;
        }
        const isDefaultAdmin = currentUser.email === DEFAULT_ADMIN_EMAIL;
        const initialProfile = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
          role: isDefaultAdmin ? 'admin' : 'editor',
          status: 'approved',
          createdAt: serverTimestamp(),
        };
        try {
          await setDoc(userRef, initialProfile);
          setUserProfile(initialProfile as unknown as UserProfile);
        } catch (writeErr) {
          handleFirestoreError(writeErr, OperationType.WRITE, path);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('Quota exceeded')) {
          console.warn('Profile fetch quota exceeded, keeping last known profile.');
        } else if (options?.isInitial) {
          handleFirestoreError(err, OperationType.GET, path);
        } else {
          console.warn('Profile refetch failed:', err);
        }
      } finally {
        setIsAuthLoading(false);
      }
    };

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = undefined;
      }

      if (!currentUser) {
        setUserProfile(null);
        onSignedOut();
        setIsAuthLoading(false);
        return;
      }

      setIsAuthLoading(true);
      void fetchUserProfile(currentUser, { isInitial: true });

      pollTimer = setInterval(() => {
        const u = auth.currentUser;
        if (u) void fetchUserProfile(u);
      }, PROFILE_POLL_INTERVAL_MS);
    });

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const u = auth.currentUser;
      if (!u) return;
      if (Date.now() - lastFetchAt < PROFILE_FOCUS_MIN_GAP_MS) return;
      void fetchUserProfile(u);
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      unsubscribeAuth();
      if (pollTimer) clearInterval(pollTimer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [onSignedOut]);

  const handleLogin = useCallback(async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        onLoginSuccess?.(result.user.uid);
      }
    } catch (err: unknown) {
      console.error('Login failed', err);
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code?: string }).code)
          : '';
      if (code === 'auth/requests-from-referer-blocked') {
        onLoginError?.(
          "Lỗi: Tên miền này chưa được cho phép trong Firebase. Vui lòng thêm '" +
            window.location.hostname +
            "' vào danh sách 'Authorized domains' trong Firebase Console."
        );
      } else {
        onLoginError?.('Đăng nhập thất bại. Vui lòng thử lại.');
      }
    }
  }, [onLoginError, onLoginSuccess]);

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout failed', err);
    }
  }, []);

  return {
    user,
    userProfile,
    isAuthLoading,
    handleLogin,
    handleLogout,
  };
}
