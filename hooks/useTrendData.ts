import { useEffect, useState } from 'react';
import { getAnalyticsEventsByDateRange } from '../repositories/analyticsRepository';
import type { AnalyticsEventRecord } from '../repositories/analyticsRepository';
import { aggregateTrendPoints } from '../services/analyticsAggregation';
import type { TrendMetric, TrendPoint, TrendRange } from '../services/analyticsTypes';
import { describeApiOrNetworkError } from '../utils/userFacingError';

export type { TrendMetric, TrendPoint, TrendRange };

interface UseTrendDataResult {
  data: TrendPoint[];
  isLoading: boolean;
  error: string | null;
}

type CachedEventsEntry = {
  savedAt: number;
  data: AnalyticsEventRecord[];
  pending?: Promise<AnalyticsEventRecord[]>;
};

const TREND_CACHE_TTL_MS = 15 * 60 * 1000;
const trendEventsCache = new Map<string, CachedEventsEntry>();

const getWeekStart = (date: Date): Date => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

function trendEventsRangeStart(range: TrendRange, now: Date): Date {
  const startDate = new Date(now);
  if (range === '30d') {
    startDate.setDate(now.getDate() - 29);
    startDate.setHours(0, 0, 0, 0);
    return startDate;
  }
  const currentWeekStart = getWeekStart(now);
  startDate.setTime(currentWeekStart.getTime());
  startDate.setDate(startDate.getDate() - 7 * 7);
  return startDate;
}

export const useTrendData = (metric: string, range: TrendRange): UseTrendDataResult => {
  const [data, setData] = useState<TrendPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrendData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const todayKey = new Date().toISOString().slice(0, 10);
        const cacheKey = `trend_data_${metric}_${range}_${todayKey}`;
        try {
          const cached = sessionStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached) as { savedAt: number; data: TrendPoint[] };
            if (parsed && typeof parsed.savedAt === 'number' && Array.isArray(parsed.data)) {
              if (Date.now() - parsed.savedAt <= TREND_CACHE_TTL_MS) {
                setData(parsed.data);
                setIsLoading(false);
                return;
              }
            }
            sessionStorage.removeItem(cacheKey);
          }
        } catch {
          // Ignore cache read issues
        }

        const now = new Date();
        const startDate = trendEventsRangeStart(range, now);

        const eventsCacheKey = `trend_events_${range}_${todayKey}`;
        const nowMs = Date.now();
        const cachedEvents = trendEventsCache.get(eventsCacheKey);
        let events: AnalyticsEventRecord[];

        if (cachedEvents && nowMs - cachedEvents.savedAt <= TREND_CACHE_TTL_MS && cachedEvents.data.length > 0) {
          events = cachedEvents.data;
        } else if (cachedEvents?.pending) {
          events = await cachedEvents.pending;
        } else {
          const pending = getAnalyticsEventsByDateRange(startDate, new Date(now.getTime() + 1));
          trendEventsCache.set(eventsCacheKey, {
            savedAt: nowMs,
            data: [],
            pending,
          });
          events = await pending;
          trendEventsCache.set(eventsCacheKey, {
            savedAt: Date.now(),
            data: events,
          });
        }

        const normalizedMetric = metric as TrendMetric;
        const trendData = aggregateTrendPoints(events, normalizedMetric, range, now);
        setData(trendData);
        try {
          sessionStorage.setItem(
            cacheKey,
            JSON.stringify({
              savedAt: Date.now(),
              data: trendData,
            })
          );
        } catch {
          // Ignore cache write issues
        }
      } catch (err) {
        console.error('Failed to load trend data:', err);
        const raw = err instanceof Error ? err.message : String(err);
        setError(describeApiOrNetworkError(raw));
      } finally {
        setIsLoading(false);
      }
    };

    const normalizedMetric = metric as TrendMetric;
    if (normalizedMetric !== 'generations' && normalizedMetric !== 'activeUsers' && normalizedMetric !== 'cost') {
      setData([]);
      setError('Chỉ số không được hỗ trợ.');
      return;
    }

    fetchTrendData();
  }, [metric, range]);

  return { data, isLoading, error };
};
