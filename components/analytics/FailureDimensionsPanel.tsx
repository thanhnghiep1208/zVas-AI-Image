import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import type { MonthlyFailureStats } from '../../services/analyticsService';
import {
  GENERATION_ERROR_SOURCE_LABELS,
  type GenerationErrorSource,
} from '../../lib/generationErrors';

/** Một user chiếm từ ngưỡng này trở lên → tỉ lệ lỗi chung có thể bị lệch bởi một người. */
const DOMINANT_USER_SHARE = 30;

const SOURCE_ORDER: GenerationErrorSource[] = ['system', 'user', 'client'];

const SOURCE_STYLES: Record<GenerationErrorSource, { text: string; bar: string; hint: string }> = {
  system: { text: 'text-red-300', bar: 'bg-red-500/60', hint: 'Server, Gemini, cấu hình — đội vận hành xử lý' },
  user: { text: 'text-amber-300', bar: 'bg-amber-500/60', hint: 'Ảnh quá nặng, bị bộ lọc, tham số sai — cải thiện UX' },
  client: { text: 'text-sky-300', bar: 'bg-sky-500/60', hint: 'Mất mạng, thiết bị user' },
};

const formatNumber = (val: number) => new Intl.NumberFormat('en-US').format(val);

type UserLabel = { name: string; email: string };

function useUserLabels(userIds: string[]): Record<string, UserLabel> {
  const [labels, setLabels] = useState<Record<string, UserLabel>>({});
  const key = userIds.join(',');

  useEffect(() => {
    if (userIds.length === 0) return;
    let cancelled = false;
    void Promise.all(
      userIds.map(async (uid) => {
        try {
          const snap = await getDoc(doc(db, 'users', uid));
          const d = snap.exists() ? (snap.data() as { displayName?: string; email?: string }) : {};
          return [uid, { name: d.displayName ?? '', email: d.email ?? '' }] as const;
        } catch {
          return [uid, { name: '', email: '' }] as const;
        }
      })
    ).then((entries) => {
      if (!cancelled) setLabels(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` là bản ổn định của userIds
  }, [key]);

  return labels;
}

export const FailureDimensionsPanel = ({ failureStats }: { failureStats: MonthlyFailureStats }) => {
  const { bySource, byModel, byUser } = failureStats;
  const totalFailed = bySource.user + bySource.client + bySource.system;
  const userLabels = useUserLabels(byUser.map((u) => u.userId));

  if (totalFailed === 0) return null;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-sm">
      <h3 className="text-lg font-semibold tracking-tight text-white">Phân tích lỗi theo nguồn, model và user</h3>
      <p className="mt-0.5 text-xs text-gray-500">Giúp biết lỗi nào cần đội vận hành xử lý, lỗi nào do cách dùng.</p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {SOURCE_ORDER.map((source) => {
          const count = bySource[source];
          const pct = totalFailed > 0 ? (count / totalFailed) * 100 : 0;
          const style = SOURCE_STYLES[source];
          return (
            <div key={source} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-xs text-gray-400">{GENERATION_ERROR_SOURCE_LABELS[source]}</p>
              <p className={`mt-1 text-2xl font-bold tabular-nums ${style.text}`}>
                {formatNumber(count)}
                <span className="ml-1.5 text-sm font-medium text-gray-500">{pct.toFixed(0)}%</span>
              </p>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2 text-[11px] leading-snug text-gray-500">{style.hint}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section>
          <h4 className="mb-2 text-sm font-medium text-gray-300">Theo model</h4>
          <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.02]">
            <table className="w-full whitespace-nowrap text-sm">
              <thead className="bg-white/[0.04] text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Model</th>
                  <th className="px-3 py-2 text-right font-medium">Lỗi / lượt</th>
                  <th className="px-3 py-2 text-right font-medium">Tỉ lệ lỗi</th>
                  <th className="px-3 py-2 text-left font-medium">Lỗi chính</th>
                </tr>
              </thead>
              <tbody>
                {byModel.map((row) => (
                  <tr key={row.modelName} className="border-t border-white/[0.06]">
                    <td className="max-w-[12rem] truncate px-3 py-2 text-gray-200" title={row.modelName}>
                      {row.modelName}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-300">
                      {formatNumber(row.failed)} / {formatNumber(row.attempts)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-medium tabular-nums ${
                        row.failRate >= 5 ? 'text-red-300' : row.failRate >= 2 ? 'text-amber-300' : 'text-gray-300'
                      }`}
                    >
                      {row.failRate.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-400">{row.topErrorType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h4 className="mb-2 text-sm font-medium text-gray-300">Theo user (top {byUser.length})</h4>
          <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.02]">
            <table className="w-full whitespace-nowrap text-sm">
              <thead className="bg-white/[0.04] text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">User</th>
                  <th className="px-3 py-2 text-right font-medium">Lỗi / lượt</th>
                  <th className="px-3 py-2 text-right font-medium">% tổng lỗi</th>
                  <th className="px-3 py-2 text-left font-medium">Lỗi chính</th>
                </tr>
              </thead>
              <tbody>
                {byUser.map((row) => {
                  const label = userLabels[row.userId];
                  const dominant = row.shareOfFailures >= DOMINANT_USER_SHARE;
                  return (
                    <tr key={row.userId} className={`border-t border-white/[0.06] ${dominant ? 'bg-amber-500/[0.06]' : ''}`}>
                      <td className="max-w-[14rem] px-3 py-2">
                        <div className="truncate text-gray-200" title={row.userId}>
                          {label?.name || label?.email || `${row.userId.slice(0, 8)}…`}
                        </div>
                        {label?.name && label.email && (
                          <div className="truncate text-xs text-gray-500">{label.email}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-300">
                        {formatNumber(row.failed)} / {formatNumber(row.attempts)}
                      </td>
                      <td className={`px-3 py-2 text-right font-medium tabular-nums ${dominant ? 'text-amber-300' : 'text-gray-300'}`}>
                        {row.shareOfFailures.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-400">{row.topErrorType}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {byUser.some((row) => row.shareOfFailures >= DOMINANT_USER_SHARE) && (
            <p className="mt-2 text-xs text-amber-300/80">
              Một user chiếm từ {DOMINANT_USER_SHARE}% số lỗi trở lên. Nếu đó là tài khoản test, tỉ lệ lỗi chung đang
              bị đẩy lên so với trải nghiệm thật của user.
            </p>
          )}
        </section>
      </div>
    </div>
  );
};
