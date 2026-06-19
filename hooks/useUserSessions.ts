import { useCallback, useEffect, useRef, useState } from 'react';
import {
  listUserSessions,
  registerOrTouchUserSession,
  revokeUserSession,
  subscribeUserSession,
  touchUserSession,
  toSessionDate,
  type UserSessionRecord,
} from '../data/userSessionRepository';
import { getOrCreateLocalSessionId, clearLocalSessionId } from '../utils/authSessionId';
import { isFirestorePermissionDenied, waitForAuthReady } from '../firebase';
import { usePolling } from './usePolling';

const HEARTBEAT_MS = 5 * 60_000;
const STALE_MS = 7 * 24 * 60 * 60 * 1000;

export interface UserSessionView extends UserSessionRecord {
  isCurrent: boolean;
  isRevoked: boolean;
  isStale: boolean;
  lastActiveLabel: string;
}

export interface UseUserSessionsOptions {
  uid: string | null;
  enabled: boolean;
  onRemoteRevoke?: () => void;
}

function formatRelativeVi(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return 'Vừa xong';
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return date.toLocaleString('vi-VN');
}

function mapSession(row: UserSessionRecord, currentId: string): UserSessionView {
  const last = toSessionDate(row.lastActiveAt);
  const isRevoked = Boolean(row.revokedAt);
  const isStale = last ? Date.now() - last.getTime() > STALE_MS : false;
  return {
    ...row,
    isCurrent: row.sessionId === currentId,
    isRevoked,
    isStale,
    lastActiveLabel: last ? formatRelativeVi(last) : '—',
  };
}

export function useUserSessions({ uid, enabled, onRemoteRevoke }: UseUserSessionsOptions) {
  const [sessions, setSessions] = useState<UserSessionView[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRevokingId, setIsRevokingId] = useState<string | null>(null);
  const onRemoteRevokeRef = useRef(onRemoteRevoke);
  onRemoteRevokeRef.current = onRemoteRevoke;

  const refresh = useCallback(async () => {
    if (!uid) {
      setSessions([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const currentId = getOrCreateLocalSessionId();
      setCurrentSessionId(currentId);
      const rows = await listUserSessions(uid);
      setSessions(rows.map((r) => mapSession(r, currentId)));
    } catch (err) {
      console.error('listUserSessions failed', err);
      setError(
        isFirestorePermissionDenied(err)
          ? 'Không đọc được phiên (Firestore rules). Chạy: firebase deploy --only firestore:rules,firestore:indexes --project zvas-ai-image'
          : 'Không tải được danh sách phiên. Thử lại sau.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    if (!uid || !enabled) return;

    let cancelled = false;
    let unsubSnapshot: (() => void) | undefined;

    const start = async () => {
      try {
        await waitForAuthReady();
        const sessionId = await registerOrTouchUserSession(uid);
        if (cancelled) return;
        setCurrentSessionId(sessionId);
        unsubSnapshot = subscribeUserSession(
          uid,
          sessionId,
          (revoked) => {
            if (revoked) onRemoteRevokeRef.current?.();
          },
          (err) => {
            if (isFirestorePermissionDenied(err)) {
              console.warn('session snapshot permission denied', err);
              setError('Không theo dõi phiên (Firestore rules). Deploy firestore:rules.');
            }
          },
        );
        await refresh();
      } catch (err) {
        if (err instanceof Error && err.message === 'SESSION_REVOKED') {
          onRemoteRevokeRef.current?.();
          return;
        }
        console.error('registerOrTouchUserSession failed', err);
        if (isFirestorePermissionDenied(err)) {
          setError(
            'Không ghi phiên đăng nhập (Firestore rules). Chạy: firebase deploy --only firestore:rules,firestore:indexes --project zvas-ai-image',
          );
        }
      }
    };

    void start();

    const onVisible = () => {
      if (document.visibilityState !== 'visible' || !uid) return;
      void (async () => {
        await waitForAuthReady();
        return registerOrTouchUserSession(uid);
      })().catch((e) => {
        if (e instanceof Error && e.message === 'SESSION_REVOKED') {
          onRemoteRevokeRef.current?.();
        }
      });
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      unsubSnapshot?.();
    };
  }, [uid, enabled, refresh]);

  const heartbeatCallback = useCallback(() => {
    if (document.visibilityState !== 'visible') return;
    const id = getOrCreateLocalSessionId();
    void touchUserSession(uid!, id).catch((e) => {
      if (!isFirestorePermissionDenied(e)) console.warn('session heartbeat', e);
    });
  }, [uid]);

  usePolling(heartbeatCallback, HEARTBEAT_MS, {
    enabled: !!uid && enabled,
    runOnFocus: false,
    runImmediately: false,
  });

  const revokeSession = useCallback(
    async (sessionId: string, options?: { isCurrent?: boolean }) => {
      setIsRevokingId(sessionId);
      setError(null);
      try {
        await revokeUserSession(uid, sessionId);
        if (options?.isCurrent) {
          clearLocalSessionId();
        }
        await refresh();
        return true;
      } catch (err) {
        console.error('revokeUserSession failed', err);
        setError('Không đăng xuất được phiên. Thử lại.');
        return false;
      } finally {
        setIsRevokingId(null);
      }
    },
    [refresh],
  );

  const revokeOtherSessions = useCallback(async () => {
    const currentId = getOrCreateLocalSessionId();
    const others = sessions.filter((s) => s.sessionId !== currentId && !s.isRevoked);
    if (others.length === 0) return true;
    setError(null);
    try {
      await Promise.all(others.map((s) => revokeUserSession(uid, s.sessionId)));
      await refresh();
      return true;
    } catch (err) {
      console.error('revokeOtherSessions failed', err);
      setError('Không đăng xuất hết phiên khác. Thử lại.');
      return false;
    }
  }, [sessions, refresh]);

  return {
    sessions,
    currentSessionId,
    isLoading,
    error,
    isRevokingId,
    refresh,
    revokeSession,
    revokeOtherSessions,
  };
}
