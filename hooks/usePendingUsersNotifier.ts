import { useState, useEffect, useRef } from 'react';
import { db, collection, query, where, onSnapshot } from '../firebase';
import { toast } from 'sonner';

export function usePendingUsersNotifier(
  isAdmin: boolean,
  onOpenAdminDashboard: () => void
) {
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const isInitialLoad = useRef(true);
  const lastCount = useRef(0);

  useEffect(() => {
    if (!isAdmin) {
      setPendingUsersCount(0);
      lastCount.current = 0;
      isInitialLoad.current = true;
      return undefined;
    }

    const q = query(collection(db, 'users'), where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const n = snap.size;

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
    }, (error) => {
      console.error('Error watching pending users:', error);
    });

    return unsubscribe;
  }, [isAdmin, onOpenAdminDashboard]);

  return pendingUsersCount;
}
