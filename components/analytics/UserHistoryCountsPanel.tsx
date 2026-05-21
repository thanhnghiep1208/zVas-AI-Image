import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import {
  db,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
  limit,
  startAfter,
} from '../../firebase';
import { Clock, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { describeApiOrNetworkError } from '../../utils/userFacingError';
import { aggregateHistoryCountsByUid, monthBoundsFromKey } from '../../services/analyticsAggregation';
import {
  STATS_BY_USER_MONTH_COLLECTION,
  HISTORY_AGG_PAGE_SIZE,
} from './constants';
import type { AnalyticsUserRow, UserHistoryScanInfo } from './types';

export const UserHistoryCountsPanel: React.FC<{ monthKey: string }> = ({ monthKey }) => {
  const [users, setUsers] = useState<AnalyticsUserRow[]>([]);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [isCountsLoading, setIsCountsLoading] = useState(false);
  const [scanInfo, setScanInfo] = useState<UserHistoryScanInfo | null>(null);

  const monthRange = useMemo(() => monthBoundsFromKey(monthKey), [monthKey]);

  const loadPanelData = useCallback(
    async (forceClientScan: boolean) => {
      setIsUsersLoading(true);
      setIsCountsLoading(true);
      setUserCounts({});
      setScanInfo(null);

      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const list: AnalyticsUserRow[] = [];
        usersSnap.forEach((docSnap) => {
          const d = docSnap.data() as Partial<AnalyticsUserRow>;
          list.push({
            uid: d.uid ?? docSnap.id,
            email: d.email ?? '',
            displayName: d.displayName ?? '',
            photoURL: d.photoURL ?? '',
          });
        });
        setUsers(list);
        setIsUsersLoading(false);

        if (list.length === 0) {
          setUserCounts({});
          setIsCountsLoading(false);
          return;
        }

        if (!forceClientScan) {
          try {
            const statsSnap = await getDoc(doc(db, STATS_BY_USER_MONTH_COLLECTION, monthKey));
            if (statsSnap.exists()) {
              const raw = statsSnap.data() as { counts?: unknown };
              const c = raw.counts;
              if (c && typeof c === 'object' && !Array.isArray(c)) {
                setUserCounts(c as Record<string, number>);
                setScanInfo({ mode: 'precomputed' });
                setIsCountsLoading(false);
                return;
              }
            }
          } catch {
            /* fall through */
          }

          setUserCounts({});
          setScanInfo({ mode: 'missing_precomputed' });
          setIsCountsLoading(false);
          return;
        }

        const historyRows: Array<{ uid?: string }> = [];
        let lastDoc: QueryDocumentSnapshot | undefined;
        let totalDocs = 0;

        while (true) {
          const base = [
            collection(db, 'history'),
            where('createdAt', '>=', monthRange.startDate),
            where('createdAt', '<', monthRange.endDate),
            orderBy('createdAt', 'asc'),
            limit(HISTORY_AGG_PAGE_SIZE),
          ] as const;
          const historyQ = lastDoc ? query(...base, startAfter(lastDoc)) : query(...base);
          const historySnap = await getDocs(historyQ);
          if (historySnap.empty) break;

          totalDocs += historySnap.size;
          historySnap.forEach((docSnap) => {
            historyRows.push(docSnap.data() as { uid?: string });
          });

          lastDoc = historySnap.docs[historySnap.docs.length - 1];
          if (historySnap.size < HISTORY_AGG_PAGE_SIZE) break;
        }

        setUserCounts(aggregateHistoryCountsByUid(historyRows));
        setScanInfo({ mode: 'paginated', docCount: totalDocs });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes('Quota exceeded')) {
          toast.warning('Hết quota đọc Firestore — thử lại sau.');
        } else {
          console.error('UserHistoryCountsPanel:', error);
          toast.error('Không tải được bảng đếm ảnh', {
            description: describeApiOrNetworkError(msg),
          });
        }
        setUsers([]);
        setUserCounts({});
        setScanInfo(null);
      } finally {
        setIsUsersLoading(false);
        setIsCountsLoading(false);
      }
    },
    [monthKey, monthRange.endDate, monthRange.startDate]
  );

  useEffect(() => {
    void loadPanelData(false);
  }, [loadPanelData]);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const ca = userCounts[a.uid] ?? 0;
      const cb = userCounts[b.uid] ?? 0;
      return cb - ca;
    });
  }, [users, userCounts]);

  const scanHint =
    scanInfo?.mode === 'precomputed'
      ? 'Nguồn: doc stats_by_user_month/{tháng} (1 lần đọc). Bấm cập nhật để quét lại history trên client.'
      : scanInfo?.mode === 'missing_precomputed'
        ? 'Chưa có doc stats_by_user_month/{tháng}. Bấm "Cập nhật số ảnh" để quét history thủ công.'
        : scanInfo?.mode === 'paginated' && typeof scanInfo.docCount === 'number'
          ? `Đã quét ${scanInfo.docCount.toLocaleString('vi-VN')} bản ghi history (pagination ${HISTORY_AGG_PAGE_SIZE}/trang).`
          : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm">
      <div className="flex flex-col gap-3 border-b border-white/[0.08] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10">
              <ImageIcon className="h-4 w-4 text-cyan-300" aria-hidden />
            </span>
            Số ảnh đã tạo theo người dùng
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Một lần đọc <code className="text-gray-400">users</code>
            {scanInfo?.mode === 'precomputed'
              ? ' + doc tổng hợp theo tháng (Cloud Function / job có thể ghi sẵn).'
              : ' + history theo tháng (pagination getDocs + orderBy createdAt).'}
            {scanHint ? <span className="mt-1 block text-gray-500">{scanHint}</span> : null}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadPanelData(true)}
          disabled={isUsersLoading || isCountsLoading || users.length === 0}
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-medium text-gray-200 transition hover:bg-white/10 disabled:pointer-events-none disabled:opacity-50"
        >
          <Clock className="w-3 h-3" />
          <span>Cập nhật số ảnh</span>
        </button>
      </div>

      {isUsersLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500/25 border-t-cyan-400" />
        </div>
      ) : sortedUsers.length === 0 ? (
        <div className="px-5 py-8 text-sm text-gray-500">Chưa có người dùng.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Người dùng
                </th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Số ảnh đã tạo
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {sortedUsers.map((user) => (
                <tr key={user.uid} className="transition-colors hover:bg-white/[0.03]">
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={
                          user.photoURL ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}`
                        }
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-full border border-white/10 object-cover ring-1 ring-white/5"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-white truncate">
                          {user.displayName || '—'}
                        </span>
                        <span className="text-xs text-gray-500 truncate">{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="text-sm font-mono font-bold text-cyan-400">
                      {isCountsLoading ? '…' : (userCounts[user.uid] ?? 0)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
