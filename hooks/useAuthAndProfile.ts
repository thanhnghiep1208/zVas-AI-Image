import { useState, useEffect, useCallback, useRef } from 'react';
import type { User } from 'firebase/auth';
import {
  auth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  db,
  doc,
  getDoc,
  handleFirestoreError,
  isFirestoreOfflineOrTransient,
  isFirestorePermissionDenied,
  OperationType,
  waitForAuthReady,
} from '../firebase';
import { revokeUserSession } from '../repositories/userSessionRepository';
import { clearLocalSessionId, getOrCreateLocalSessionId } from '../utils/authSessionId';

const PROFILE_POLL_INTERVAL_MS = 90_000;
const PROFILE_FOCUS_MIN_GAP_MS = 45_000;

export type AppUserRole = 'admin' | 'editor' | 'advice';

/** Trạng thái đọc hồ sơ Firestore `users/{uid}` sau khi Firebase Auth đã có user. */
export type ProfileGateState = 'idle' | 'loading' | 'ready' | 'missing' | 'error';

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
  const [profileGate, setProfileGate] = useState<ProfileGateState>('idle');
  const [profileGateMessage, setProfileGateMessage] = useState<string | null>(null);
  const profileGateRef = useRef<ProfileGateState>(profileGate);
  profileGateRef.current = profileGate;
  const profileGateMessageRef = useRef<string | null>(profileGateMessage);
  profileGateMessageRef.current = profileGateMessage;

  useEffect(() => {
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let lastFetchAt = 0;

    const fetchUserProfile = async (currentUser: User) => {
      const userRef = doc(db, 'users', currentUser.uid);
      const path = `users/${currentUser.uid}`;
      try {
        await waitForAuthReady();
        await currentUser.getIdToken();
        const docSnap = await getDoc(userRef);
        lastFetchAt = Date.now();
        if (docSnap.exists()) {
          setUserProfile(docSnap.data() as UserProfile);
          setProfileGate('ready');
          setProfileGateMessage(null);
        } else {
          setUserProfile(null);
          setProfileGate('missing');
          setProfileGateMessage(
            'Đăng nhập thành công nhưng chưa có hồ sơ trên hệ thống. Liên hệ quản trị để được tạo tài khoản (Firestore users/{uid}).',
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('Quota exceeded')) {
          console.warn('Profile fetch quota exceeded, keeping last known profile.');
        } else if (isFirestoreOfflineOrTransient(err)) {
          console.warn('Profile fetch unavailable (offline/transient), keeping last known profile.', msg);
        } else if (isFirestorePermissionDenied(err)) {
          setUserProfile(null);
          setProfileGate('error');
          setProfileGateMessage(
            'Không đọc được hồ sơ người dùng (Firestore rules). Liên hệ quản trị hoặc deploy lại firestore.rules.',
          );
        } else {
          setUserProfile(null);
          setProfileGate('error');
          setProfileGateMessage('Không tải được hồ sơ người dùng. Thử lại sau ít phút.');
          handleFirestoreError(err, OperationType.GET, path);
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
        setProfileGate('idle');
        setProfileGateMessage(null);
        onSignedOut();
        setIsAuthLoading(false);
        return;
      }

      setIsAuthLoading(true);
      setProfileGate('loading');
      setProfileGateMessage(null);
      void fetchUserProfile(currentUser);

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

  const handleLogin = useCallback(async (email: string, password: string): Promise<boolean> => {
    if (!email.trim() || !password) {
      onLoginError?.('Vui lòng nhập tên đăng nhập và mật khẩu.');
      return false;
    }
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (result.user) {
        onLoginSuccess?.(result.user.uid);
        return true;
      }
      onLoginError?.('Đăng nhập không thành công. Thử lại sau ít phút.');
      return false;
    } catch (err: unknown) {
      console.error('Login failed', err);
      onLoginError?.(describeEmailPasswordSignInError(err));
      return false;
    }
  }, [onLoginError, onLoginSuccess]);

  const handleLogout = useCallback(async () => {
    try {
      const current = auth.currentUser;
      const sessionId = getOrCreateLocalSessionId();
      if (current) {
        await revokeUserSession(current.uid, sessionId).catch((err) => {
          console.warn('revokeUserSession on logout', err);
        });
      }
      clearLocalSessionId();
      await signOut(auth);
    } catch (err) {
      console.error('Logout failed', err);
    }
  }, []);

  const waitForProfileGate = useCallback(
    (
      timeoutMs = 15_000,
    ): Promise<{ gate: ProfileGateState; message: string | null }> =>
      new Promise((resolve) => {
        const deadline = Date.now() + timeoutMs;
        const tick = () => {
          const gate = profileGateRef.current;
          if (gate === 'ready' || gate === 'missing' || gate === 'error') {
            resolve({ gate, message: profileGateMessageRef.current });
            return;
          }
          if (Date.now() >= deadline) {
            resolve({
              gate: 'error',
              message: 'Không tải được hồ sơ tài khoản (hết thời gian chờ).',
            });
            return;
          }
          window.setTimeout(tick, 80);
        };
        tick();
      }),
    [],
  );

  return {
    user,
    userProfile,
    isAuthLoading,
    profileGate,
    profileGateMessage,
    waitForProfileGate,
    handleLogin,
    handleLogout,
  };
}

function describeEmailPasswordSignInError(err: unknown): string {
  const code =
    err && typeof err === 'object' && 'code' in err ? String((err as { code?: string }).code) : '';

  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Tên đăng nhập hoặc mật khẩu không đúng. Vui lòng thử lại.';
    case 'auth/invalid-email':
      return 'Tên đăng nhập không hợp lệ. Chỉ dùng chữ, số hoặc email nội bộ @zvas.local.';
    case 'auth/missing-password':
      return 'Vui lòng nhập mật khẩu.';
    case 'auth/operation-not-allowed':
      return 'Đăng nhập email/mật khẩu chưa được bật trên Firebase. Liên hệ quản trị.';
    case 'auth/user-disabled':
      return 'Tài khoản đã bị vô hiệu hóa. Liên hệ quản trị.';
    case 'auth/too-many-requests':
      return 'Đăng nhập sai quá nhiều lần. Đợi vài phút rồi thử lại.';
    case 'auth/network-request-failed':
      return 'Không kết nối được máy chủ. Kiểm tra mạng và thử lại.';
    default:
      return 'Đăng nhập không thành công. Thử lại sau ít phút.';
  }
}
