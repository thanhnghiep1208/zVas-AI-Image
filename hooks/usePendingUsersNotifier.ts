import { useState, useEffect, useRef } from 'react';
import { db, collection, query, where, getCountFromServer } from '../firebase';
import { toast } from 'sonner';

const PENDING_POLL_MS = 45_000;
const PENDING_FOCUS_MIN_GAP_MS = 30_000;

export function usePendingUsersNotifier(
  isAdmin: boolean,
  onOpenAdminDashboard: () => void
) {
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const isInitialLoad = useRef(true);
  const lastCount = useRef(0);
  const lastFetchAt = useRef(0);

  useEffect(() => {
    if (!isAdmin) {
      setPendingUsersCount(0);
      lastCount.current = 0;
      isInitialLoad.current = true;
      return undefined;
    }

    let pollTimer: ReturnType<typeof setInterval> | undefined;

    const fetchPendingCount = async () => {
      try {
        const q = query(collection(db, 'users'), where('status', '==', 'pending'));
        const countSnap = await getCountFromServer(q);
        const n = countSnap.data().count;
        lastFetchAt.current = Date.now();

        if (!isInitialLoad.current && n > lastCount.current) {
          toast.info('Yêu cầu truy cập mới', {
            description: `Có ${n - lastCount.current} tài khoản đang chờ phê duyệt.`,
            action: {
              label: 'Xem',
              onClick: onOpenAdminDashboard,
            },
            duration: 5000,
          });
        }

        lastCount.current = n;
        setPendingUsersCount(n);
        isInitialLoad.current = false;
      } catch (error) {
        console.error('Error fetching pending users count:', error);
      }
    };

    void fetchPendingCount();
    pollTimer = setInterval(() => void fetchPendingCount(), PENDING_POLL_MS);

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastFetchAt.current < PENDING_FOCUS_MIN_GAP_MS) return;
      void fetchPendingCount();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (pollTimer) clearInterval(pollTimer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isAdmin, onOpenAdminDashboard]);

  return pendingUsersCount;
}
