import { useState, useEffect, useRef } from 'react';
import { db, collection, query, where, onSnapshot } from '../firebase';
import { toast } from 'sonner';

export function usePendingUsersNotifier(
  isAdmin: boolean,
  onOpenAdminDashboard: () => void
) {
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (!isAdmin) {
      setPendingUsersCount(0);
      return;
    }

    const q = query(collection(db, 'users'), where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setPendingUsersCount(snapshot.size);

        if (!isInitialLoad.current) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const newUser = change.doc.data();
              toast.info(`Yêu cầu truy cập mới`, {
                description: `${newUser.email} đang chờ phê duyệt.`,
                action: {
                  label: 'Xem',
                  onClick: onOpenAdminDashboard,
                },
                duration: 5000,
              });
            }
          });
        }
        isInitialLoad.current = false;
      },
      (error) => {
        console.error('Error listening for pending users:', error);
      }
    );

    return () => unsubscribe();
  }, [isAdmin, onOpenAdminDashboard]);

  return pendingUsersCount;
}
