import { useState, useEffect, useCallback } from 'react';
import {
  auth,
  collection,
  db,
  deleteDoc,
  doc,
  getDocs,
  handleFirestoreError,
  limit,
  OperationType,
  orderBy,
  query,
  updateDoc,
  where,
} from '../firebase';
import { toast } from 'sonner';
import { describeApiOrNetworkError } from '../utils/userFacingError';
import type { AdminUserProfile } from '../components/admin/types';

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUserHistory, setSelectedUserHistory] = useState<{
    uid: string;
    email: string;
  } | null>(null);
  const [userHistoryImages, setUserHistoryImages] = useState<
    Array<{ id: string; prompt?: string; imageUrl?: string; createdAt?: { toDate?: () => Date } }>
  >([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const loadUsersFromFirestore = useCallback(async () => {
    setIsLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const usersData: AdminUserProfile[] = [];
      snapshot.forEach((d) => {
        usersData.push(d.data() as AdminUserProfile);
      });
      setUsers(usersData);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('Quota exceeded')) {
        console.warn('Users list fetch quota exceeded.');
        toast.warning('Hết hạn mức đọc Firestore', {
          description: 'Danh sách người dùng có thể chưa cập nhật. Thử lại sau vài phút.',
        });
      } else {
        handleFirestoreError(error, OperationType.LIST, 'users');
        toast.error('Không tải được danh sách người dùng', {
          description: describeApiOrNetworkError(msg),
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedUserHistory) {
      setUserHistoryImages([]);
      return undefined;
    }

    let cancelled = false;
    setIsHistoryLoading(true);
    const historyRef = collection(db, 'history');
    const q = query(
      historyRef,
      where('uid', '==', selectedUserHistory.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    void (async () => {
      try {
        const snapshot = await getDocs(q);
        if (!cancelled) {
          setUserHistoryImages(
            snapshot.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            }))
          );
        }
      } catch (error) {
        if (!cancelled) {
          handleFirestoreError(error, OperationType.GET, 'history');
          setUserHistoryImages([]);
          const msg = error instanceof Error ? error.message : String(error);
          toast.error('Không tải được lịch sử ảnh', {
            description: describeApiOrNetworkError(msg),
          });
        }
      } finally {
        if (!cancelled) {
          setIsHistoryLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedUserHistory]);

  const handleUpdateStatus = async (userId: string, newStatus: 'approved' | 'rejected') => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { status: newStatus });
      await loadUsersFromFirestore();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Chưa cập nhật được trạng thái', {
        description: describeApiOrNetworkError(msg),
      });
    }
  };

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'editor' | 'advice') => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role: newRole });
      await loadUsersFromFirestore();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Chưa cập nhật được vai trò', {
        description: describeApiOrNetworkError(msg),
      });
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (userId === auth.currentUser?.uid) {
      toast.error('Không thể tự xóa chính mình', {
        description: 'Chọn một tài khoản khác để xóa.',
      });
      return;
    }

    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa người dùng ${userEmail}? Hành động này không thể hoàn tác.`
      )
    ) {
      return;
    }

    try {
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);
      toast.success('Đã xóa người dùng.');
      await loadUsersFromFirestore();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Chưa xóa được người dùng', {
        description: describeApiOrNetworkError(msg),
      });
    }
  };

  return {
    users,
    isLoading,
    loadUsersFromFirestore,
    handleUpdateStatus,
    handleUpdateRole,
    handleDeleteUser,
    selectedUserHistory,
    setSelectedUserHistory,
    userHistoryImages,
    isHistoryLoading,
  };
}
