import type { TrendMetric } from '../../services/analyticsTypes';

export const ANALYTICS_CACHE_TTL_MS = 15 * 60 * 1000;
export const ANALYTICS_AUTO_REFRESH_MS = 6 * 60 * 60 * 1000;

export const TREND_METRIC_CONFIG: Record<
  TrendMetric,
  { label: string; range: '30d' | '8w'; color: string }
> = {
  generations: { label: 'Generations per day (last 30 days)', range: '30d', color: '#22d3ee' },
  activeUsers: { label: 'Active users per week (last 8 weeks)', range: '8w', color: '#818cf8' },
  cost: { label: 'Cost per day (last 30 days)', range: '30d', color: '#f59e0b' },
};

export function formatAnalyticsBundleFetchedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export const STATS_BY_USER_MONTH_COLLECTION = 'stats_by_user_month';
export const HISTORY_AGG_PAGE_SIZE = 500;
