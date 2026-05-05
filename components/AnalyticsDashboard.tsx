import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { calculateMonthlyAnalytics, MonthlyAnalytics, getMonthlyErrorBreakdown, MonthlyErrorBreakdownItem, getMonthlyTokenStats, MonthlyTokenStats, getMonthlyTopModelStats, MonthlyTopModelStats } from '../services/analyticsService';
import { db, collection, query, where, getCountFromServer, onSnapshot, handleFirestoreError, OperationType } from '../firebase';
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
  const ANALYTICS_CACHE_TTL_MS = 5 * 60 * 1000;

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

  useEffect(() => {
    const saved = window.localStorage.getItem('analytics_monthly_budget_limit');
    const parsed = saved ? Number(saved) : NaN;
    const safeLimit = Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
    setBudgetLimit(safeLimit);
    setBudgetInput(String(safeLimit));
  }, []);

  useEffect(() => {
    const loadData = async () => {
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
          setIsLoading(false);
          return;
        }

        const data = await calculateMonthlyAnalytics(monthKey);
        setAnalytics(data);
        const monthlyErrorBreakdown = await getMonthlyErrorBreakdown(monthKey);
        setErrorBreakdown(monthlyErrorBreakdown);
        const monthlyTokenStats = await getMonthlyTokenStats(monthKey);
        setTokenStats(monthlyTokenStats);
        const monthlyTopModelStats = await getMonthlyTopModelStats(monthKey);
        setTopModelStats(monthlyTopModelStats);

        writeCache(cacheKey, {
          analytics: data,
          errorBreakdown: monthlyErrorBreakdown,
          tokenStats: monthlyTokenStats,
          topModelStats: monthlyTopModelStats,
        });
      } catch (error) {
        console.error('Error loading analytics:', error);
        toast.error('Failed to load analytics data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
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
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white flex items-center">
          <BarChart3 className="w-6 h-6 mr-2 text-cyan-400" />
          Internal Analytics
        </h2>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-400">Month:</label>
          <input 
            type="month" 
            value={monthKey}
            onChange={(e) => setMonthKey(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {isLoading ? (
        <AnalyticsPageSkeleton />
      ) : analytics ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

          <TrendsSection
            activeMetric={activeTrendMetric}
            onMetricChange={setActiveTrendMetric}
          />

          <UserHistoryCountsPanel monthKey={monthKey} />

          <div className="grid grid-cols-1 gap-6">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-white mb-4">Generation Metrics</h3>
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
        <div className="text-center py-12 text-gray-400">
          No data available for this month.
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

const UserHistoryCountsPanel: React.FC<{ monthKey: string }> = ({ monthKey }) => {
  const [users, setUsers] = useState<AnalyticsUserRow[]>([]);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [isCountsLoading, setIsCountsLoading] = useState(false);

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

  useEffect(() => {
    const usersRef = collection(db, 'users');
    const unsub = onSnapshot(
      usersRef,
      (snapshot) => {
        const list: AnalyticsUserRow[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data() as Partial<AnalyticsUserRow>;
          list.push({
            uid: d.uid ?? docSnap.id,
            email: d.email ?? '',
            displayName: d.displayName ?? '',
            photoURL: d.photoURL ?? ''
          });
        });
        setUsers(list);
        setIsUsersLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
        setIsUsersLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const loadCounts = useCallback(async (userList: AnalyticsUserRow[]) => {
    if (userList.length === 0) {
      setUserCounts({});
      setIsCountsLoading(false);
      return;
    }
    setIsCountsLoading(true);
    const counts: Record<string, number> = {};
    try {
      for (const user of userList) {
        try {
          const historyQ = query(
            collection(db, 'history'),
            where('uid', '==', user.uid),
            where('createdAt', '>=', monthRange.startDate),
            where('createdAt', '<', monthRange.endDate),
          );
          const countSnapshot = await getCountFromServer(historyQ);
          counts[user.uid] = countSnapshot.data().count;
        } catch (err) {
          console.error(`Error fetching count for user ${user.uid}:`, err);
        }
      }
      setUserCounts(counts);
    } finally {
      setIsCountsLoading(false);
    }
  }, [monthRange.endDate, monthRange.startDate]);

  const usersKey = useMemo(() => [...users].map((u) => u.uid).sort().join(','), [users]);

  useEffect(() => {
    if (!usersKey) {
      setUserCounts({});
      return;
    }
    loadCounts(users);
  }, [usersKey, users, loadCounts, monthKey]);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const ca = userCounts[a.uid] ?? 0;
      const cb = userCounts[b.uid] ?? 0;
      return cb - ca;
    });
  }, [users, userCounts]);

  const handleRefreshCounts = () => {
    loadCounts(users);
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-gray-700">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-cyan-400" />
            Số ảnh đã tạo theo người dùng
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Đếm theo tháng đang chọn từ collection <code className="text-gray-400">history</code> trên Firestore.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefreshCounts}
          disabled={isCountsLoading || users.length === 0}
          className="text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:pointer-events-none text-gray-300 px-3 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-2 shrink-0"
        >
          <Clock className="w-3 h-3" />
          <span>Cập nhật số ảnh</span>
        </button>
      </div>

      {isUsersLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500" />
        </div>
      ) : sortedUsers.length === 0 ? (
        <div className="px-5 py-8 text-sm text-gray-500">Chưa có người dùng.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-900/50 border-b border-gray-700">
                <th className="px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Người dùng</th>
                <th className="px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Số ảnh đã tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/80">
              {sortedUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-gray-700/20">
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}`}
                        alt=""
                        className="w-9 h-9 rounded-full border border-gray-700 shrink-0"
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
      <h3 className="text-lg font-semibold text-white">Token Usage</h3>
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
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{title}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      <p className={`text-xs mt-2 ${trendColorClass}`}>{trendLabel} vs last month</p>
    </div>
  );
};

const ModelUsageCard = ({
  modelBreakdown
}: {
  modelBreakdown: Array<{ modelName: string; requestCount: number }>;
}) => (
  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5">
    <h3 className="text-lg font-semibold text-white mb-4">Model Usage (month)</h3>
    {modelBreakdown.length === 0 ? (
      <div className="text-sm text-gray-500">No model usage data this month.</div>
    ) : (
      <div className="space-y-2">
        {modelBreakdown.map((item) => (
          <div key={item.modelName} className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-0">
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
  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center">
    <div className="p-3 bg-gray-900 rounded-lg mr-4">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{title}</p>
      <p className="text-2xl font-bold text-white mt-1 truncate">{value}</p>
      {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
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
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Avg latency</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.avg.toFixed(1)}s</p>
          <p className="text-xs text-gray-400 mt-1">p95: {stats.p95.toFixed(1)}s</p>
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
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <div className="p-3 bg-gray-900 rounded-lg mr-4">
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Monthly Budget</p>
            <p className="text-lg font-bold text-white mt-1">
              ${currentSpend.toFixed(2)} / ${budgetLimit.toFixed(2)} ({percent}%)
            </p>
          </div>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={onToggleEditing}
            className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            title="Edit budget limit"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="w-full h-2 rounded-full bg-gray-700 overflow-hidden">
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
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            placeholder="Budget limit"
          />
          <button
            type="button"
            onClick={onSaveBudget}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
          >
            Save
          </button>
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
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <h3 className="text-lg font-semibold text-white">Trends</h3>
        <div className="inline-flex bg-gray-900/70 border border-gray-700 rounded-lg p-1">
          {(Object.keys(TREND_METRIC_CONFIG) as TrendMetric[]).map((metric) => (
            <button
              key={metric}
              onClick={() => onMetricChange(metric)}
              className={`px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors ${
                activeMetric === metric
                  ? 'bg-cyan-600 text-white'
                  : 'text-gray-400 hover:text-gray-200'
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
  <div className="h-72 rounded-lg border border-gray-700/60 bg-gray-900/40 p-4">
    <div className="h-full flex items-end gap-2">
      {Array.from({ length: 24 }).map((_, idx) => (
        <div
          key={`trend-skeleton-${idx}`}
          className="flex-1 rounded-t bg-gray-700/50 animate-pulse"
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
          className="bg-gray-800 border border-gray-700 rounded-lg p-4 animate-pulse"
        >
          <div className="h-3 w-24 bg-gray-700 rounded mb-3" />
          <div className="h-8 w-32 bg-gray-700 rounded" />
        </div>
      ))}
    </div>

    <section className="space-y-3">
      <div className="h-5 w-28 bg-gray-700 rounded animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={`token-skeleton-${idx}`}
            className="bg-gray-800 border border-gray-700 rounded-lg p-4 animate-pulse"
          >
            <div className="h-3 w-24 bg-gray-700 rounded mb-3" />
            <div className="h-7 w-20 bg-gray-700 rounded mb-2" />
            <div className="h-3 w-16 bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    </section>

    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 animate-pulse">
      <div className="h-5 w-44 bg-gray-700 rounded mb-4" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={`model-skeleton-${idx}`} className="h-8 bg-gray-700/80 rounded" />
        ))}
      </div>
    </div>

    <TrendSkeleton />

    <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden animate-pulse">
      <div className="px-5 py-4 border-b border-gray-700">
        <div className="h-5 w-64 bg-gray-700 rounded mb-2" />
        <div className="h-3 w-72 bg-gray-700 rounded" />
      </div>
      <div className="px-5 py-4 space-y-3">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div key={`user-count-skeleton-${idx}`} className="h-10 bg-gray-700/70 rounded" />
        ))}
      </div>
    </div>

    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 animate-pulse">
      <div className="h-5 w-40 bg-gray-700 rounded mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={`metric-row-skeleton-${idx}`} className="h-6 bg-gray-700/80 rounded" />
        ))}
      </div>
    </div>
  </div>
);

const MetricRow = ({ label, value }: { label: string, value: string | number }) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-700/50 last:border-0">
    <span className="text-gray-300">{label}</span>
    <span className="font-semibold text-white">{value}</span>
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
  <div className="py-2 border-b border-gray-700/50">
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between text-left hover:bg-gray-700/30 rounded px-2 py-1 transition-colors"
    >
      <span className="text-gray-300">Failed Generations</span>
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
      <div className="mt-3 overflow-hidden rounded border border-gray-700 bg-gray-900/40">
        <table className="w-full text-sm">
          <thead className="bg-gray-800/70 text-gray-400">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Error Type</th>
              <th className="px-3 py-2 text-right font-medium">Count</th>
              <th className="px-3 py-2 text-right font-medium">Last occurred</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-gray-500" colSpan={3}>
                  No failure details for this month.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.errorType}
                  onClick={() => onErrorClick(item.errorType)}
                  className="border-t border-gray-800 hover:bg-gray-700/30 cursor-pointer"
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

