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
  setDoc,
  onSnapshot,
  serverTimestamp,
  handleFirestoreError,
  OperationType,
} from '../firebase';

const DEFAULT_ADMIN_EMAIL = 'thanhnghiep1208@gmail.com';

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
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = undefined;
      }

      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const path = `users/${currentUser.uid}`;
        unsubscribeProfile = onSnapshot(
          userRef,
          async (docSnap) => {
            try {
              if (docSnap.exists()) {
                setUserProfile(docSnap.data() as UserProfile);
              } else {
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
                await setDoc(userRef, initialProfile);
                setUserProfile(initialProfile as unknown as UserProfile);
              }
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, path);
            } finally {
              setIsAuthLoading(false);
            }
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, path);
            setIsAuthLoading(false);
          }
        );
      } else {
        setUserProfile(null);
        onSignedOut();
        setIsAuthLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
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
