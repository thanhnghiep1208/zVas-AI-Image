import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  loadMonthlyDashboardBundle,
  type MonthlyAnalytics,
  type MonthlyErrorBreakdownItem,
  type MonthlyTokenStats,
  type MonthlyTopModelStats,
} from '../services/analyticsService';
import { describeApiOrNetworkError } from '../utils/userFacingError';
import { readCacheEntry, writeCache, clearCache } from '../components/analytics/analyticsCache';
import { ANALYTICS_AUTO_REFRESH_MS } from '../components/analytics/constants';
import type { TrendMetric } from '../services/analyticsTypes';

const EMPTY_TOKEN_STATS: MonthlyTokenStats = {
  avgTotal: 0,
  avgInput: 0,
  avgOutput: 0,
  totalMonth: 0,
  costPer1k: 0,
  avgTotalTrend: 0,
  avgInputTrend: 0,
  avgOutputTrend: 0,
  totalMonthTrend: 0,
};

const EMPTY_TOP_MODEL: MonthlyTopModelStats = {
  modelName: 'N/A',
  requestCount: 0,
  modelBreakdown: [],
};

export function useAnalyticsDashboardData() {
  const [monthKey, setMonthKey] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [analytics, setAnalytics] = useState<MonthlyAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTrendMetric, setActiveTrendMetric] = useState<TrendMetric>('generations');
  const [errorBreakdown, setErrorBreakdown] = useState<MonthlyErrorBreakdownItem[]>([]);
  const [isErrorBreakdownOpen, setIsErrorBreakdownOpen] = useState(false);
  const [tokenStats, setTokenStats] = useState<MonthlyTokenStats>(EMPTY_TOKEN_STATS);
  const [topModelStats, setTopModelStats] = useState<MonthlyTopModelStats>(EMPTY_TOP_MODEL);
  const [budgetLimit, setBudgetLimit] = useState<number>(10);
  const [budgetInput, setBudgetInput] = useState<string>('10');
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [requestVersion, setRequestVersion] = useState(0);
  const [loadedMonthKey, setLoadedMonthKey] = useState<string | null>(null);
  const [dashboardBundleFetchedAt, setDashboardBundleFetchedAt] = useState<number | null>(null);

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
      setTokenStats(EMPTY_TOKEN_STATS);
      setTopModelStats(EMPTY_TOP_MODEL);
      setIsErrorBreakdownOpen(false);
      setDashboardBundleFetchedAt(null);
    }
  }, [loadedMonthKey, monthKey]);

  const handleRequestData = useCallback(
    async (forceRefresh = false, options?: { background?: boolean }) => {
      const background = options?.background ?? false;
      if (!background) {
        setIsLoading(true);
      }
      try {
        const cacheKey = `analytics_dashboard_${monthKey}`;
        if (!forceRefresh) {
          const cached = readCacheEntry<{
            analytics: MonthlyAnalytics;
            errorBreakdown: MonthlyErrorBreakdownItem[];
            tokenStats: MonthlyTokenStats;
            topModelStats: MonthlyTopModelStats;
          }>(cacheKey);
          if (cached) {
            setAnalytics(cached.data.analytics);
            setErrorBreakdown(cached.data.errorBreakdown);
            setTokenStats(cached.data.tokenStats);
            setTopModelStats(cached.data.topModelStats);
            setLoadedMonthKey(monthKey);
            setDashboardBundleFetchedAt(cached.savedAt);
            setRequestVersion((v) => v + 1);
            return;
          }
        } else {
          clearCache(cacheKey);
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
        setDashboardBundleFetchedAt(Date.now());
      } catch (error) {
        console.error('Error loading analytics:', error);
        const raw = error instanceof Error ? error.message : String(error);
        toast.error('Không tải được dữ liệu analytics', {
          description: describeApiOrNetworkError(raw),
        });
      } finally {
        if (!background) {
          setIsLoading(false);
        }
      }
    },
    [monthKey]
  );

  useEffect(() => {
    void handleRequestData(false);
  }, [monthKey, handleRequestData]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void handleRequestData(true, { background: true });
    }, ANALYTICS_AUTO_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [monthKey, handleRequestData]);

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

  return {
    monthKey,
    setMonthKey,
    analytics,
    isLoading,
    activeTrendMetric,
    setActiveTrendMetric,
    errorBreakdown,
    isErrorBreakdownOpen,
    setIsErrorBreakdownOpen,
    tokenStats,
    topModelStats,
    budgetLimit,
    budgetInput,
    setBudgetInput,
    isEditingBudget,
    setIsEditingBudget,
    requestVersion,
    loadedMonthKey,
    dashboardBundleFetchedAt,
    handleRequestData,
    formatCurrency,
    formatNumber,
    handleSaveBudget,
  };
}
