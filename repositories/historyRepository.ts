import {
  addDoc,
  collection,
  db,
  deleteDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where
} from '../firebase';

export interface HistoryRecord {
  id: string;
  prompt: string;
  imageUrl: string;
  text?: string | null;
}

export async function listRecentHistoryByUser(userId: string, maxItems = 10): Promise<HistoryRecord[]> {
  const historyRef = collection(db, 'history');
  const q = query(
    historyRef,
    where('uid', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(maxItems)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as { prompt?: string; imageUrl?: string; text?: string | null };
    return {
      id: docSnap.id,
      prompt: data.prompt ?? '',
      imageUrl: data.imageUrl ?? 'error',
      text: data.text ?? null
    };
  });
}

export async function createHistoryEntry(params: {
  userId: string;
  prompt: string;
  text?: string | null;
}): Promise<string> {
  const historyRef = collection(db, 'history');
  const docRef = await addDoc(historyRef, {
    uid: params.userId,
    prompt: params.prompt,
    imageUrl: 'idb',
    createdAt: serverTimestamp(),
    ...(params.text ? { text: params.text } : {})
  });
  return docRef.id;
}

export async function clearHistoryByUser(userId: string): Promise<string[]> {
  const historyRef = collection(db, 'history');
  const q = query(historyRef, where('uid', '==', userId));
  const snapshot = await getDocs(q);
  await Promise.all(snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)));
  return snapshot.docs.map((docSnap) => docSnap.id);
}
