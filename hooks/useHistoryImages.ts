import { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import type { GeneratedImage } from '../types';
import * as idb from 'idb-keyval';
import {
  db,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  deleteDoc,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import { toast } from 'sonner';

export function useHistoryImages(user: User | null) {
  const [historyImages, setHistoryImages] = useState<GeneratedImage[]>([]);

  const fetchHistory = useCallback(async (userId: string) => {
    const historyRef = collection(db, 'history');
    const q = query(
      historyRef,
      where('uid', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    try {
      const snapshot = await getDocs(q);
      const images: GeneratedImage[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        let imageUrl = data.imageUrl;
        if (!imageUrl || imageUrl === 'idb') {
          try {
            imageUrl = (await idb.get(`img_${docSnap.id}`)) || 'error';
          } catch {
            imageUrl = 'error';
          }
        }
        images.push({
          prompt: data.prompt,
          imageUrl: imageUrl,
          text: data.text,
        });
      }
      setHistoryImages(images);
      return images;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('Quota exceeded')) {
        console.warn('History fetch quota exceeded.');
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
      const historyRef = collection(db, path);
      const q = query(historyRef, where('uid', '==', user.uid));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(async (docSnap) => {
        await deleteDoc(docSnap.ref);
        await idb.del(`img_${docSnap.id}`);
      });
      await Promise.all(deletePromises);

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
