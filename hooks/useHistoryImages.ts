import { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import type { GeneratedImage } from '../types';
import * as idb from 'idb-keyval';
import { handleFirestoreError, isFirestoreOfflineOrTransient, OperationType } from '../firebase';
import { toast } from 'sonner';
import { clearHistoryByUser, listRecentHistoryByUser } from '../repositories/historyRepository';

export function useHistoryImages(user: User | null) {
  const [historyImages, setHistoryImages] = useState<GeneratedImage[]>([]);

  const fetchHistory = useCallback(async (userId: string) => {
    try {
      const records = await listRecentHistoryByUser(userId, 10);
      const images: GeneratedImage[] = [];
      for (const record of records) {
        let imageUrl = record.imageUrl;
        if (!imageUrl || imageUrl === 'idb') {
          try {
            imageUrl = (await idb.get(`img_${record.id}`)) || 'error';
          } catch {
            imageUrl = 'error';
          }
        }
        images.push({
          prompt: record.prompt,
          imageUrl: imageUrl,
          text: record.text,
        });
      }
      setHistoryImages(images);
      return images;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('Quota exceeded') || isFirestoreOfflineOrTransient(error)) {
        if (isFirestoreOfflineOrTransient(error)) {
          console.warn('History fetch unavailable (offline/transient).');
        } else {
          console.warn('History fetch quota exceeded.');
        }
      } else {
        handleFirestoreError(error, OperationType.GET, 'history');
      }
      return [];
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchHistory(user.uid);
    } else {
      setHistoryImages([]);
    }
  }, [user, fetchHistory]);

  const handleClearHistory = useCallback(async () => {
    if (!user || !window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử?')) return;
    const path = 'history';
    try {
      const deletedIds = await clearHistoryByUser(user.uid);
      const deleteCachePromises = deletedIds.map(async (historyId) => {
        await idb.del(`img_${historyId}`);
      });
      await Promise.all(deleteCachePromises);

      setHistoryImages([]);
      toast.success('Lịch sử đã được xóa sạch.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }, [user]);

  return {
    historyImages,
    setHistoryImages,
    handleClearHistory,
  };
}
