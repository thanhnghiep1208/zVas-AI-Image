import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Pencil,
  Trash2,
  Users,
} from 'lucide-react';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import type { MonthlyAnalytics, MonthlyErrorBreakdownItem, MonthlyTokenStats } from '../../services/analyticsService';

export const KpiCard = ({
  title,
  value,
  icon,
  subValue,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subValue?: string;
}) => (
  <div className="flex items-center rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-sm">
    <div className="mr-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{title}</p>
      <p className="mt-1 truncate text-2xl font-semibold tabular-nums text-white">{value}</p>
      {subValue && <p className="mt-1 text-xs text-gray-500">{subValue}</p>}
    </div>
  </div>
);

export const LatencyCard = ({
  latencyStats,
}: {
  latencyStats?: { avg: number; p95: number; sparkline: number[] };
}) => {
  const stats = latencyStats ?? { avg: 0, p95: 0, sparkline: [] };
  const sparklineData = (stats.sparkline ?? []).slice(-7).map((value, idx) => ({
    point: idx + 1,
    value,
  }));

  return (
    <div className="flex flex-col rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Độ trễ TB</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{stats.avg.toFixed(1)}s</p>
          <p className="mt-1 text-xs text-gray-500">p95: {stats.p95.toFixed(1)}s</p>
        </div>
        <div className="w-24 h-12 min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={sparklineData}>
              <Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export const MonthlyBudgetCard = ({
  currentSpend,
  budgetLimit,
  budgetInput,
  isEditingBudget,
  onBudgetInputChange,
  onToggleEditing,
  onSaveBudget,
  readOnly = false,
}: {
  currentSpend: number;
  budgetLimit: number;
  budgetInput: string;
  isEditingBudget: boolean;
  onBudgetInputChange: (value: string) => void;
  onToggleEditing: () => void;
  onSaveBudget: () => void;
  readOnly?: boolean;
}) => {
  const ratio = budgetLimit > 0 ? currentSpend / budgetLimit : 0;
  const percent = Math.round(ratio * 100);
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const barColorClass =
    percent < 70 ? 'bg-emerald-500' : percent <= 90 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center">
          <div className="mr-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <DollarSign className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
              Ngân sách tháng
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-white">
              ${currentSpend.toFixed(2)} / ${budgetLimit.toFixed(2)} ({percent}%)
            </p>
          </div>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={onToggleEditing}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            title="Edit budget limit"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full transition-all duration-300 ${barColorClass}`}
          style={{ width: `${clampedPercent}%` }}
        />
      </div>

      {!readOnly && isEditingBudget && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={budgetInput}
            onChange={(e) => onBudgetInputChange(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
            placeholder="Budget limit"
          />
          <button
            type="button"
            onClick={onSaveBudget}
            className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:brightness-110"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
};

export const TokenUsageSection = ({ tokenStats }: { tokenStats: MonthlyTokenStats }) => (
  <section className="space-y-3">
    <h3 className="text-lg font-semibold tracking-tight text-white">Dùng token</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <TokenUsageCard
        title="Avg tokens / request"
        value={tokenStats.avgTotal.toFixed(1)}
        trend={tokenStats.avgTotalTrend ?? 0}
      />
      <TokenUsageCard
        title="Avg input tokens"
        value={tokenStats.avgInput.toFixed(1)}
        trend={tokenStats.avgInputTrend ?? 0}
      />
      <TokenUsageCard
        title="Avg output tokens"
        value={tokenStats.avgOutput.toFixed(1)}
        trend={tokenStats.avgOutputTrend ?? 0}
      />
      <TokenUsageCard
        title="Total tokens (month)"
        value={new Intl.NumberFormat('en-US').format(tokenStats.totalMonth)}
        trend={tokenStats.totalMonthTrend ?? 0}
      />
    </div>
  </section>
);

const TokenUsageCard = ({
  title,
  value,
  trend,
}: {
  title: string;
  value: string;
  trend: number;
}) => {
  const isUp = trend > 0;
  const isDown = trend < 0;
  const trendLabel = isUp
    ? `↑ ${Math.abs(trend).toFixed(1)}%`
    : isDown
      ? `↓ ${Math.abs(trend).toFixed(1)}%`
      : '→ 0.0%';
  const trendColorClass = isUp ? 'text-amber-400' : isDown ? 'text-emerald-400' : 'text-gray-400';

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{value}</p>
      <p className={`mt-2 text-xs ${trendColorClass}`}>{trendLabel} so với tháng trước</p>
    </div>
  );
};

export const ModelUsageCard = ({
  modelBreakdown,
}: {
  modelBreakdown: Array<{ modelName: string; requestCount: number; successCount: number }>;
}) => (
  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-sm">
    <h3 className="mb-4 text-lg font-semibold tracking-tight text-white">Model dùng nhiều (tháng)</h3>
    {modelBreakdown.length === 0 ? (
      <div className="text-sm text-gray-500">Chưa có dữ liệu model trong tháng này.</div>
    ) : (
      <div className="space-y-2">
        {modelBreakdown.map((item) => (
          <div
            key={item.modelName}
            className="flex items-center justify-between border-b border-white/[0.06] py-2 last:border-0"
          >
            <span className="text-sm text-gray-200 truncate pr-3">{item.modelName}</span>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-gray-400">
                {new Intl.NumberFormat('en-US').format(item.requestCount)} attempts
              </span>
              <span className="text-sm font-semibold text-cyan-300">
                {new Intl.NumberFormat('en-US').format(item.successCount ?? 0)} ok
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

export const TrendSkeleton = () => (
  <div className="h-72 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
    <div className="h-full flex items-end gap-2">
      {Array.from({ length: 24 }).map((_, idx) => (
        <div
          key={`trend-skeleton-${idx}`}
          className="flex-1 animate-pulse rounded-t bg-white/10"
          style={{ height: `${20 + ((idx * 11) % 65)}%` }}
        />
      ))}
    </div>
  </div>
);

export const AnalyticsPageSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 10 }).map((_, idx) => (
        <div
          key={`kpi-skeleton-${idx}`}
          className="animate-pulse rounded-xl border border-white/[0.08] bg-white/[0.03] p-4"
        >
          <div className="mb-3 h-3 w-24 rounded bg-white/10" />
          <div className="h-8 w-32 rounded bg-white/10" />
        </div>
      ))}
    </div>

    <section className="space-y-3">
      <div className="h-5 w-28 animate-pulse rounded bg-white/10" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={`token-skeleton-${idx}`}
            className="animate-pulse rounded-xl border border-white/[0.08] bg-white/[0.03] p-4"
          >
            <div className="mb-3 h-3 w-24 rounded bg-white/10" />
            <div className="mb-2 h-7 w-20 rounded bg-white/10" />
            <div className="h-3 w-16 rounded bg-white/10" />
          </div>
        ))}
      </div>
    </section>

    <div className="animate-pulse rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
      <div className="mb-4 h-5 w-44 rounded bg-white/10" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={`model-skeleton-${idx}`} className="h-8 rounded bg-white/10" />
        ))}
      </div>
    </div>

    <TrendSkeleton />

    <div className="animate-pulse overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
      <div className="border-b border-white/[0.08] px-5 py-4">
        <div className="mb-2 h-5 w-64 rounded bg-white/10" />
        <div className="h-3 w-72 rounded bg-white/10" />
      </div>
      <div className="space-y-3 px-5 py-4">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div key={`user-count-skeleton-${idx}`} className="h-10 rounded bg-white/10" />
        ))}
      </div>
    </div>

    <div className="animate-pulse rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
      <div className="mb-4 h-5 w-40 rounded bg-white/10" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={`metric-row-skeleton-${idx}`} className="h-6 rounded bg-white/10" />
        ))}
      </div>
    </div>
  </div>
);

export const MetricRow = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex items-center justify-between border-b border-white/[0.06] py-2.5 last:border-0">
    <span className="text-sm text-gray-400">{label}</span>
    <span className="font-medium tabular-nums text-white">{value}</span>
  </div>
);

export const ExpandableErrorBreakdown = ({
  totalFailedGenerations,
  isOpen,
  items,
  onToggle,
  onErrorClick,
}: {
  totalFailedGenerations: number;
  isOpen: boolean;
  items: MonthlyErrorBreakdownItem[];
  onToggle: () => void;
  onErrorClick?: (errorType: string) => void;
}) => (
  <div className="border-b border-white/[0.06] py-2">
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/[0.04]"
    >
      <span className="text-sm text-gray-400">Lượt tạo thất bại</span>
      <span className="flex items-center gap-2">
        <span className="font-semibold text-white">
          {new Intl.NumberFormat('en-US').format(totalFailedGenerations)}
        </span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </span>
    </button>

    {isOpen && (
      <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03]">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.04] text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Loại lỗi</th>
              <th className="px-3 py-2 text-right font-medium">Số lần</th>
              <th className="px-3 py-2 text-right font-medium">Lần cuối</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-gray-500" colSpan={3}>
                  Không có chi tiết lỗi cho tháng này.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.errorType}
                  onClick={() => onErrorClick?.(item.errorType)}
                  className="cursor-pointer border-t border-white/[0.06] transition-colors hover:bg-white/[0.04]"
                >
                  <td className="px-3 py-2">
                    <div className="group relative inline-flex items-center gap-1.5">
                      <span
                        className={item.severity === 'critical' ? 'text-red-400' : 'text-amber-400'}
                      >
                        {item.errorType}
                      </span>
                      {item.sampleMessages && item.sampleMessages.length > 0 && (
                        <>
                          <span className="cursor-help text-xs text-gray-600 select-none">ⓘ</span>
                          <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-1.5 hidden w-72 rounded-lg border border-white/[0.12] bg-gray-900 p-2.5 shadow-xl group-hover:block">
                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Ví dụ message gốc</p>
                            {item.sampleMessages.map((msg, i) => (
                              <p key={i} className={`break-words text-[11px] leading-snug text-gray-300${i > 0 ? ' mt-1.5 border-t border-white/[0.06] pt-1.5' : ''}`}>
                                {msg}
                              </p>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-white">{item.count}</td>
                  <td className="px-3 py-2 text-right text-gray-300">
                    {item.lastOccurred ? item.lastOccurred.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

export const FailedGenerationsBox = ({
  analytics,
  errorBreakdown,
  onClearLog,
  onErrorClick,
  monthKey,
}: {
  analytics: MonthlyAnalytics;
  errorBreakdown: MonthlyErrorBreakdownItem[];
  onClearLog: () => void;
  onErrorClick?: (errorType: string) => void;
  monthKey?: string;
}) => {
  const [logCleared, setLogCleared] = useState(false);

  const totalFailed = analytics.failed_generations;
  const failRate =
    analytics.total_generations > 0
      ? ((totalFailed / analytics.total_generations) * 100).toFixed(1)
      : '0.0';

  const handleClear = () => {
    onClearLog();
    setLogCleared(true);
  };

  const hasErrors = totalFailed > 0;
  const borderColor = hasErrors ? 'border-red-500/20' : 'border-white/[0.08]';
  const bgColor = hasErrors ? 'bg-red-500/[0.03]' : 'bg-white/[0.03]';

  return (
    <div className={`rounded-2xl border ${borderColor} ${bgColor} p-5 backdrop-blur-sm`}>
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
              hasErrors
                ? 'border-red-500/25 bg-red-500/10'
                : 'border-emerald-500/25 bg-emerald-500/10'
            }`}
          >
            <AlertTriangle
              className={`h-4 w-4 ${hasErrors ? 'text-red-400' : 'text-emerald-400'}`}
            />
          </span>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-white">
              Lượt tạo thất bại
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              {monthKey ? `Tháng ${monthKey} · ` : ''}Tỉ lệ lỗi:{' '}
              <span className={hasErrors ? 'text-red-400' : 'text-emerald-400'}>{failRate}%</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p
              className={`text-2xl font-bold tabular-nums ${hasErrors ? 'text-red-400' : 'text-emerald-400'}`}
            >
              {new Intl.NumberFormat('en-US').format(totalFailed)}
            </p>
            <p className="text-[10px] text-gray-600">lượt thất bại</p>
          </div>
          {!logCleared && hasErrors && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs text-gray-400 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
            >
              <Trash2 className="h-3 w-3" />
              Xóa log
            </button>
          )}
        </div>
      </div>

      {/* Failure rate bar */}
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`h-full rounded-full transition-all duration-700 ${hasErrors ? 'bg-red-500/60' : 'bg-emerald-500/60'}`}
          style={{ width: `${Math.min(parseFloat(failRate), 100)}%` }}
        />
      </div>

      {/* Content */}
      {logCleared ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] py-7 text-center">
          <p className="text-sm text-gray-400">Log đã được xóa khỏi hiển thị.</p>
          <p className="mt-1 text-xs text-gray-600">
            Nhấn <span className="text-gray-400">Tải dữ liệu mới</span> để khôi phục.
          </p>
        </div>
      ) : !hasErrors ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] py-7 text-center">
          <p className="text-sm text-emerald-400">Không có lỗi nào trong tháng này.</p>
        </div>
      ) : errorBreakdown.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] py-7 text-center">
          <p className="text-sm text-gray-500">Không có chi tiết lỗi cho tháng này.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04]">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">
                  Loại lỗi
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500">
                  Số lần
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500">
                  % tổng lỗi
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500">
                  Lần cuối
                </th>
              </tr>
            </thead>
            <tbody>
              {errorBreakdown.map((item) => {
                const pct =
                  totalFailed > 0
                    ? `${((item.count / totalFailed) * 100).toFixed(1)}%`
                    : '—';
                return (
                  <tr
                    key={item.errorType}
                    onClick={() => onErrorClick?.(item.errorType)}
                    className="cursor-pointer border-t border-white/[0.06] transition-colors hover:bg-white/[0.04]"
                  >
                    <td className="px-3 py-2.5">
                      <div className="group relative flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${
                            item.severity === 'critical'
                              ? 'bg-red-500/15 text-red-300 ring-red-500/25'
                              : 'bg-amber-500/15 text-amber-300 ring-amber-500/25'
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {item.severity === 'critical' ? 'Critical' : 'Warning'}
                        </span>
                        <span className="text-gray-200">{item.errorType}</span>
                        {item.sampleMessages && item.sampleMessages.length > 0 && (
                          <>
                            <span className="cursor-help select-none text-xs text-gray-600">ⓘ</span>
                            <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 hidden w-80 rounded-xl border border-white/[0.12] bg-gray-900 p-3 shadow-2xl group-hover:block">
                              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                Sample error messages
                              </p>
                              {item.sampleMessages.map((msg, i) => (
                                <p
                                  key={i}
                                  className={`break-words text-[11px] leading-snug text-gray-300${i > 0 ? ' mt-1.5 border-t border-white/[0.06] pt-1.5' : ''}`}
                                >
                                  {msg}
                                </p>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums text-white">
                      {new Intl.NumberFormat('en-US').format(item.count)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-400">{pct}</td>
                    <td className="px-3 py-2.5 text-right text-xs text-gray-400">
                      {item.lastOccurred
                        ? item.lastOccurred.toLocaleString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'N/A'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
