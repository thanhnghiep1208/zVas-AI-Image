import { useState, useEffect, useRef, useCallback } from 'react';
import { db, collection, query, where, getCountFromServer } from '../firebase';
import { toast } from 'sonner';
import { usePolling } from './usePolling';

const POLL_INTERVAL_MS = 5 * 60_000;

export function usePendingUsersNotifier(
  isAdmin: boolean,
  onOpenAdminDashboard: () => void
) {
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const isInitialLoad = useRef(true);
  const lastCount = useRef(0);
  const onOpenRef = useRef(onOpenAdminDashboard);
  onOpenRef.current = onOpenAdminDashboard;

  // Reset state when admin status is lost
  useEffect(() => {
    if (isAdmin) return;
    setPendingUsersCount(0);
    lastCount.current = 0;
    isInitialLoad.current = true;
  }, [isAdmin]);

  const check = useCallback(async () => {
    try {
      const q = query(collection(db, 'users'), where('status', '==', 'pending'));
      const snap = await getCountFromServer(q);
      const n = snap.data().count;

      if (!isInitialLoad.current && n > lastCount.current) {
        toast.info('Yêu cầu truy cập mới', {
          description: `Có ${n - lastCount.current} tài khoản đang chờ phê duyệt.`,
          action: {
            label: 'Xem',
            onClick: () => onOpenRef.current(),
          },
          duration: 5000,
        });
      }

      lastCount.current = n;
      setPendingUsersCount(n);
      isInitialLoad.current = false;
    } catch (error) {
      console.error('Error checking pending users:', error);
    }
  }, []);

  usePolling(check, POLL_INTERVAL_MS, { enabled: isAdmin });

  return pendingUsersCount;
}
