import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import {
  loadMonthlyDashboardBundle,
  MonthlyAnalytics,
  MonthlyErrorBreakdownItem,
  MonthlyTokenStats,
  MonthlyTopModelStats,
} from '../services/analyticsService';
import { db, collection, query, where, getDocs, doc, getDoc, orderBy, limit, startAfter } from '../firebase';
import { BarChart3, Users, Image as ImageIcon, CheckCircle, XCircle, DollarSign, Activity, Pencil, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { useTrendData } from '../hooks/useTrendData';

type TrendMetric = 'generations' | 'activeUsers' | 'cost';

const TREND_METRIC_CONFIG: Record<TrendMetric, { label: string; range: '30d' | '8w'; color: string }> = {
  generations: { label: 'Generations per day (last 30 days)', range: '30d', color: '#22d3ee' },
  activeUsers: { label: 'Active users per week (last 8 weeks)', range: '8w', color: '#818cf8' },
  cost: { label: 'Cost per day (last 30 days)', range: '30d', color: '#f59e0b' }
};

interface AnalyticsDashboardProps {
  onErrorClick?: (errorType: string) => void;
  latencyStats?: { avg: number; p95: number; sparkline: number[] };
  /** Role `advice`: không chỉnh chi phí / ngân sách (Firestore chỉ admin ghi) */
  readOnly?: boolean;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  onErrorClick,
  latencyStats,
  readOnly = false,
}) => {
  const ANALYTICS_CACHE_TTL_MS = 15 * 60 * 1000;

  const readCache = <T,>(key: string): T | null => {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { savedAt: number; data: T };
      if (!parsed || typeof parsed.savedAt !== 'number') return null;
      if (Date.now() - parsed.savedAt > ANALYTICS_CACHE_TTL_MS) {
        sessionStorage.removeItem(key);
        return null;
      }
      return parsed.data;
    } catch (error) {
      return null;
    }
  };

  const writeCache = (key: string, value: unknown) => {
    try {
      sessionStorage.setItem(
        key,
        JSON.stringify({
          savedAt: Date.now(),
          data: value
        })
      );
    } catch (error) {
      // Ignore cache failures silently
    }
  };

  const [monthKey, setMonthKey] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [analytics, setAnalytics] = useState<MonthlyAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTrendMetric, setActiveTrendMetric] = useState<TrendMetric>('generations');
  const [errorBreakdown, setErrorBreakdown] = useState<MonthlyErrorBreakdownItem[]>([]);
  const [isErrorBreakdownOpen, setIsErrorBreakdownOpen] = useState(false);
  const [tokenStats, setTokenStats] = useState<MonthlyTokenStats>({
    avgTotal: 0,
    avgInput: 0,
    avgOutput: 0,
    totalMonth: 0,
    costPer1k: 0,
    avgTotalTrend: 0,
    avgInputTrend: 0,
    avgOutputTrend: 0,
    totalMonthTrend: 0
  });
  const [topModelStats, setTopModelStats] = useState<MonthlyTopModelStats>({
    modelName: 'N/A',
    requestCount: 0,
    modelBreakdown: []
  });
  const [budgetLimit, setBudgetLimit] = useState<number>(10);
  const [budgetInput, setBudgetInput] = useState<string>('10');
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [requestVersion, setRequestVersion] = useState(0);
  const [loadedMonthKey, setLoadedMonthKey] = useState<string | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem('analytics_monthly_budget_limit');
    const parsed = saved ? Number(saved) : NaN;
    const safeLimit = Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
    setBudgetLimit(safeLimit);
    setBudgetInput(String(safeLimit));
  }, []);

  useEffect(() => {
    if (loadedMonthKey !== monthKey) {
      setAnalytics(null);
      setErrorBreakdown([]);
      setTokenStats({
        avgTotal: 0,
        avgInput: 0,
        avgOutput: 0,
        totalMonth: 0,
        costPer1k: 0,
        avgTotalTrend: 0,
        avgInputTrend: 0,
        avgOutputTrend: 0,
        totalMonthTrend: 0
      });
      setTopModelStats({
        modelName: 'N/A',
        requestCount: 0,
        modelBreakdown: []
      });
      setIsErrorBreakdownOpen(false);
    }
  }, [loadedMonthKey, monthKey]);

  const handleRequestData = useCallback(async () => {
    setIsLoading(true);
    try {
      const cacheKey = `analytics_dashboard_${monthKey}`;
      const cached = readCache<{
        analytics: MonthlyAnalytics;
        errorBreakdown: MonthlyErrorBreakdownItem[];
        tokenStats: MonthlyTokenStats;
        topModelStats: MonthlyTopModelStats;
      }>(cacheKey);
      if (cached) {
        setAnalytics(cached.analytics);
        setErrorBreakdown(cached.errorBreakdown);
        setTokenStats(cached.tokenStats);
        setTopModelStats(cached.topModelStats);
        setLoadedMonthKey(monthKey);
        setRequestVersion((v) => v + 1);
        return;
      }

      const bundle = await loadMonthlyDashboardBundle(monthKey);
      setAnalytics(bundle.analytics);
      setErrorBreakdown(bundle.errorBreakdown);
      setTokenStats(bundle.tokenStats);
      setTopModelStats(bundle.topModelStats);
      setLoadedMonthKey(monthKey);
      setRequestVersion((v) => v + 1);

      writeCache(cacheKey, {
        analytics: bundle.analytics,
        errorBreakdown: bundle.errorBreakdown,
        tokenStats: bundle.tokenStats,
        topModelStats: bundle.topModelStats,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  }, [monthKey]);

  const formatCurrency = (val: number) => `$${val.toFixed(2)}`;
  const formatNumber = (val: number) => new Intl.NumberFormat('en-US').format(val);

  const handleSaveBudget = () => {
    const parsed = Number(budgetInput);
    const safeLimit = Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
    setBudgetLimit(safeLimit);
    setBudgetInput(String(safeLimit));
    window.localStorage.setItem('analytics_monthly_budget_limit', String(safeLimit));
    setIsEditingBudget(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/25 bg-cyan-500/10">
              <BarChart3 className="h-5 w-5 text-cyan-300" aria-hidden />
            </span>
            Tổng quan analytics
          </h2>
          <p className="mt-1 max-w-lg text-sm text-gray-500">
            Số liệu nội bộ theo tháng — tập trung vào người dùng, lượt tạo và chi phí.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="analytics-month" className="text-sm text-gray-500">
            Tháng
          </label>
          <input
            id="analytics-month"
            type="month"
            value={monthKey}
            onChange={(e) => setMonthKey(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
          />
          <button
            type="button"
            onClick={() => void handleRequestData()}
            disabled={isLoading}
            className="rounded-xl border border-cyan-500/30 bg-cyan-500/15 px-3 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Đang tải...' : 'Yêu cầu dữ liệu'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <AnalyticsPageSkeleton />
      ) : analytics ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard 
              title="Monthly Active Users" 
              value={formatNumber(analytics.monthly_active_users)} 
              icon={<Users className="w-5 h-5 text-blue-400" />} 
            />
            <KpiCard 
              title="Generating Users" 
              value={formatNumber(analytics.generating_users)} 
              icon={<Activity className="w-5 h-5 text-green-400" />} 
            />
            <KpiCard 
              title="Total Generations" 
              value={formatNumber(analytics.total_generations)} 
              icon={<ImageIcon className="w-5 h-5 text-purple-400" />} 
            />
            <KpiCard 
              title="Success Rate" 
              value={`${analytics.success_rate.toFixed(1)}%`} 
              icon={<CheckCircle className="w-5 h-5 text-emerald-400" />} 
            />
            <KpiCard
              title="Top Model Used"
              value={topModelStats.modelName}
              icon={<Activity className="w-5 h-5 text-amber-400" />}
              subValue={`${formatNumber(topModelStats.requestCount)} requests`}
            />
            <KpiCard 
              title="Total Monthly Cost" 
              value={formatCurrency(analytics.total_monthly_cost)} 
              icon={<DollarSign className="w-5 h-5 text-yellow-400" />} 
            />
            <KpiCard 
              title="Variable AI Cost" 
              value={formatCurrency(analytics.total_variable_ai_cost)} 
              icon={<DollarSign className="w-5 h-5 text-orange-400" />} 
            />
            <LatencyCard latencyStats={latencyStats} />
            <KpiCard 
              title="Cost / Success Image" 
              value={formatCurrency(analytics.cost_per_successful_image)} 
              icon={<DollarSign className="w-5 h-5 text-cyan-400" />} 
            />
            <KpiCard 
              title="Cost / Gen User" 
              value={formatCurrency(analytics.cost_per_generating_user)} 
              icon={<DollarSign className="w-5 h-5 text-indigo-400" />} 
            />
            <MonthlyBudgetCard
              currentSpend={analytics.total_monthly_cost}
              budgetLimit={budgetLimit}
              budgetInput={budgetInput}
              isEditingBudget={isEditingBudget}
              onBudgetInputChange={setBudgetInput}
              onToggleEditing={() => setIsEditingBudget((prev) => !prev)}
              onSaveBudget={handleSaveBudget}
              readOnly={readOnly}
            />
          </div>

          <TokenUsageSection tokenStats={tokenStats} />

          <ModelUsageCard modelBreakdown={topModelStats.modelBreakdown} />

          <DeferredTrendsSection
            key={`trend-${monthKey}-${requestVersion}`}
            activeMetric={activeTrendMetric}
            onMetricChange={setActiveTrendMetric}
          />

          <UserHistoryCountsPanel key={`uh-${monthKey}-${requestVersion}`} monthKey={monthKey} />

          <div className="grid grid-cols-1 gap-6">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-sm">
              <h3 className="mb-4 text-lg font-semibold tracking-tight text-white">Chỉ số tạo ảnh</h3>
              <div className="space-y-3">
                <MetricRow label="Successful Generations" value={formatNumber(analytics.successful_generations)} />
                <ExpandableErrorBreakdown
                  totalFailedGenerations={analytics.failed_generations}
                  isOpen={isErrorBreakdownOpen}
                  items={errorBreakdown}
                  onToggle={() => setIsErrorBreakdownOpen((prev) => !prev)}
                  onErrorClick={(errorType) => onErrorClick?.(errorType)}
                />
                <MetricRow
                  label="Cost / 1K tokens"
                  value={`$${(tokenStats?.costPer1k ?? 0).toFixed(4)}`}
                />
                <MetricRow
                  label="Most Used Model"
                  value={topModelStats.modelName}
                />
                <MetricRow
                  label="Model Requests (month)"
                  value={formatNumber(topModelStats.requestCount)}
                />
                <MetricRow label="Avg Gens / User" value={analytics.average_generations_per_user.toFixed(1)} />
              </div>
            </div>
          </div>

        </>
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-14 text-center text-sm text-gray-500">
          Chưa tải dữ liệu cho tháng này. Nhấn <span className="font-semibold text-gray-300">Yêu cầu dữ liệu</span> để cập nhật.
        </div>
      )}
    </div>
  );
};

interface AnalyticsUserRow {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}

const STATS_BY_USER_MONTH_COLLECTION = 'stats_by_user_month';
const HISTORY_AGG_PAGE_SIZE = 500;

interface UserHistoryScanInfo {
  mode: 'precomputed' | 'paginated' | 'missing_precomputed';
  docCount?: number;
}

const UserHistoryCountsPanel: React.FC<{ monthKey: string }> = ({ monthKey }) => {
  const [users, setUsers] = useState<AnalyticsUserRow[]>([]);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [isCountsLoading, setIsCountsLoading] = useState(false);
  const [scanInfo, setScanInfo] = useState<UserHistoryScanInfo | null>(null);

  const monthRange = useMemo(() => {
    const [yearStr, monthStr] = monthKey.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    if (!Number.isFinite(year) || !Number.isFinite(month)) {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return { startDate, endDate };
    }
    return {
      startDate: new Date(year, month, 1),
      endDate: new Date(year, month + 1, 1),
    };
  }, [monthKey]);

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
            /* fall through to client aggregation */
          }

          // Không tự động quét toàn bộ history nếu thiếu doc tổng hợp
          // để tránh đốt read quota Firestore trên màn hình analytics.
          setUserCounts({});
          setScanInfo({ mode: 'missing_precomputed' });
          setIsCountsLoading(false);
          return;
        }

        const counts: Record<string, number> = {};
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
          const historyQ = lastDoc
            ? query(...base, startAfter(lastDoc))
            : query(...base);
          const historySnap = await getDocs(historyQ);
          if (historySnap.empty) break;

          totalDocs += historySnap.size;
          historySnap.forEach((docSnap) => {
            const data = docSnap.data() as { uid?: string };
            const uid = data.uid;
            if (typeof uid === 'string') {
              counts[uid] = (counts[uid] ?? 0) + 1;
            }
          });

          lastDoc = historySnap.docs[historySnap.docs.length - 1];
          if (historySnap.size < HISTORY_AGG_PAGE_SIZE) break;
        }

        setUserCounts(counts);
        setScanInfo({ mode: 'paginated', docCount: totalDocs });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes('Quota exceeded')) {
          toast.warning('Hết quota đọc Firestore — thử lại sau.');
        } else {
          console.error('UserHistoryCountsPanel:', error);
          toast.error('Không tải được bảng đếm ảnh.');
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

  const handleRefreshCounts = () => {
    void loadPanelData(true);
  };

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
          onClick={handleRefreshCounts}
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
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Người dùng</th>
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
                        src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}`}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-full border border-white/10 object-cover ring-1 ring-white/5"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-white truncate">{user.displayName || '—'}</span>
                        <span className="text-xs text-gray-500 truncate">{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="text-sm font-mono font-bold text-cyan-400">
                      {isCountsLoading ? '…' : userCounts[user.uid] ?? 0}
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

const TokenUsageSection = ({
  tokenStats
}: {
  tokenStats: MonthlyTokenStats;
}) => {
  const stats = tokenStats;

  return (
    <section className="space-y-3">
      <h3 className="text-lg font-semibold tracking-tight text-white">Dùng token</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <TokenUsageCard title="Avg tokens / request" value={stats.avgTotal.toFixed(1)} trend={stats.avgTotalTrend ?? 0} />
        <TokenUsageCard title="Avg input tokens" value={stats.avgInput.toFixed(1)} trend={stats.avgInputTrend ?? 0} />
        <TokenUsageCard title="Avg output tokens" value={stats.avgOutput.toFixed(1)} trend={stats.avgOutputTrend ?? 0} />
        <TokenUsageCard
          title="Total tokens (month)"
          value={new Intl.NumberFormat('en-US').format(stats.totalMonth)}
          trend={stats.totalMonthTrend ?? 0}
        />
      </div>
    </section>
  );
};

const TokenUsageCard = ({ title, value, trend }: { title: string; value: string; trend: number }) => {
  const isUp = trend > 0;
  const isDown = trend < 0;
  const trendLabel = isUp ? `↑ ${Math.abs(trend).toFixed(1)}%` : isDown ? `↓ ${Math.abs(trend).toFixed(1)}%` : '→ 0.0%';
  const trendColorClass = isUp ? 'text-amber-400' : isDown ? 'text-emerald-400' : 'text-gray-400';

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{value}</p>
      <p className={`mt-2 text-xs ${trendColorClass}`}>{trendLabel} so với tháng trước</p>
    </div>
  );
};

const ModelUsageCard = ({
  modelBreakdown
}: {
  modelBreakdown: Array<{ modelName: string; requestCount: number }>;
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
            <span className="text-sm font-semibold text-cyan-300">
              {new Intl.NumberFormat('en-US').format(item.requestCount)} requests
            </span>
          </div>
        ))}
      </div>
    )}
  </div>
);

const KpiCard = ({
  title,
  value,
  icon,
  subValue
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

const LatencyCard = ({
  latencyStats
}: {
  latencyStats?: { avg: number; p95: number; sparkline: number[] };
}) => {
  const stats = latencyStats ?? { avg: 0, p95: 0, sparkline: [] };
  const sparklineData = (stats.sparkline ?? []).slice(-7).map((value, idx) => ({
    point: idx + 1,
    value
  }));

  return (
    <div className="flex flex-col rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Độ trễ TB</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{stats.avg.toFixed(1)}s</p>
          <p className="mt-1 text-xs text-gray-500">p95: {stats.p95.toFixed(1)}s</p>
        </div>
        <div className="w-24 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData}>
              <Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const MonthlyBudgetCard = ({
  currentSpend,
  budgetLimit,
  budgetInput,
  isEditingBudget,
  onBudgetInputChange,
  onToggleEditing,
  onSaveBudget,
  readOnly = false
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
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Ngân sách tháng</p>
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

/** Chỉ mount TrendsSection (và hook useTrendData / Firestore) khi gần viewport — giảm tải khi vừa mở Analytics. */
const DeferredTrendsSection = ({
  activeMetric,
  onMetricChange,
}: {
  activeMetric: TrendMetric;
  onMetricChange: (metric: TrendMetric) => void;
}) => {
  const [mountChart, setMountChart] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = anchorRef.current;
    if (!el || mountChart) return undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setMountChart(true);
      },
      { root: null, rootMargin: '160px 0px', threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [mountChart]);

  return (
    <div>
      <div ref={anchorRef} className="h-px w-full" aria-hidden />
      {mountChart ? (
        <TrendsSection activeMetric={activeMetric} onMetricChange={onMetricChange} />
      ) : (
        <div className="flex h-72 flex-col items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 text-center text-sm text-gray-500">
          <span>Cuộn tới mục xu hướng để tải biểu đồ</span>
          <span className="text-xs text-gray-600">(tránh gọi Firestore trend khi chưa cần)</span>
        </div>
      )}
    </div>
  );
};

const TrendsSection = ({
  activeMetric,
  onMetricChange
}: {
  activeMetric: TrendMetric;
  onMetricChange: (metric: TrendMetric) => void;
}) => {
  const config = TREND_METRIC_CONFIG[activeMetric];
  const { data, isLoading, error } = useTrendData(activeMetric, config.range);

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-sm">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold tracking-tight text-white">Xu hướng</h3>
        <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.04] p-1">
          {(Object.keys(TREND_METRIC_CONFIG) as TrendMetric[]).map((metric) => (
            <button
              key={metric}
              type="button"
              onClick={() => onMetricChange(metric)}
              className={`rounded-lg px-3 py-1.5 text-xs transition-all sm:text-sm ${
                activeMetric === metric
                  ? 'bg-gradient-to-r from-cyan-500/30 to-blue-600/25 font-medium text-white ring-1 ring-cyan-500/30'
                  : 'text-gray-400 hover:bg-white/[0.06] hover:text-gray-200'
              }`}
            >
              {TREND_METRIC_CONFIG[metric].label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <TrendSkeleton />
      ) : error ? (
        <div className="h-72 flex items-center justify-center text-sm text-red-400">{error}</div>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 8, left: -15, bottom: 8 }}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" opacity={0.55} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={{ stroke: '#475569' }}
                tickLine={{ stroke: '#475569' }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={{ stroke: '#475569' }}
                tickLine={{ stroke: '#475569' }}
                width={40}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                labelStyle={{ color: '#cbd5e1' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={config.color}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: config.color }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

const TrendSkeleton = () => (
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

const AnalyticsPageSkeleton = () => (
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

const MetricRow = ({ label, value }: { label: string, value: string | number }) => (
  <div className="flex items-center justify-between border-b border-white/[0.06] py-2.5 last:border-0">
    <span className="text-sm text-gray-400">{label}</span>
    <span className="font-medium tabular-nums text-white">{value}</span>
  </div>
);

const ExpandableErrorBreakdown = ({
  totalFailedGenerations,
  isOpen,
  items,
  onToggle,
  onErrorClick
}: {
  totalFailedGenerations: number;
  isOpen: boolean;
  items: MonthlyErrorBreakdownItem[];
  onToggle: () => void;
  onErrorClick: (errorType: string) => void;
}) => (
  <div className="border-b border-white/[0.06] py-2">
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/[0.04]"
    >
      <span className="text-sm text-gray-400">Lượt tạo thất bại</span>
      <span className="flex items-center gap-2">
        <span className="font-semibold text-white">{new Intl.NumberFormat('en-US').format(totalFailedGenerations)}</span>
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
                  onClick={() => onErrorClick(item.errorType)}
                  className="cursor-pointer border-t border-white/[0.06] transition-colors hover:bg-white/[0.04]"
                >
                  <td className="px-3 py-2">
                    <span className={item.severity === 'critical' ? 'text-red-400' : 'text-amber-400'}>
                      {item.errorType}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-white">{item.count}</td>
                  <td className="px-3 py-2 text-right text-gray-300">
                    {item.lastOccurred ? item.lastOccurred.toLocaleString() : 'N/A'}
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

