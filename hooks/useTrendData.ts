import { useEffect, useState } from 'react';
import { getAnalyticsEventsByDateRange } from '../repositories/analyticsRepository';

export type TrendMetric = 'generations' | 'activeUsers' | 'cost';
export type TrendRange = '30d' | '8w';

export interface TrendPoint {
  date: string;
  value: number;
}

interface UseTrendDataResult {
  data: TrendPoint[];
  isLoading: boolean;
  error: string | null;
}

interface AnalyticsEventDoc {
  event_name?: string;
  user_id?: string;
  image_count?: number;
  estimated_api_cost?: number;
  timestamp?: { toDate?: () => Date } | Date | null;
}

const toDate = (timestamp: AnalyticsEventDoc['timestamp']): Date | null => {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === 'object' && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  return null;
};

const getWeekStart = (date: Date): Date => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

const formatDayLabel = (date: Date): string =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const formatWeekLabel = (date: Date): string =>
  `Wk ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

export const useTrendData = (metric: string, range: TrendRange): UseTrendDataResult => {
  const TREND_CACHE_TTL_MS = 15 * 60 * 1000;
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
        } catch (error) {
          // Ignore cache read issues
        }

        const now = new Date();
        const startDate = new Date(now);
        if (range === '30d') {
          startDate.setDate(now.getDate() - 29);
          startDate.setHours(0, 0, 0, 0);
        } else {
          const currentWeekStart = getWeekStart(now);
          startDate.setTime(currentWeekStart.getTime());
          startDate.setDate(startDate.getDate() - 7 * 7);
        }

        const events = (await getAnalyticsEventsByDateRange(
          startDate,
          new Date(now.getTime() + 1)
        )) as AnalyticsEventDoc[];

        if (range === '30d') {
          const dayMap = new Map<string, number>();
          for (let i = 0; i < 30; i += 1) {
            const day = new Date(startDate);
            day.setDate(startDate.getDate() + i);
            const key = day.toISOString().slice(0, 10);
            dayMap.set(key, 0);
          }

          events.forEach((event) => {
            const eventDate = toDate(event.timestamp);
            if (!eventDate) return;
            const key = eventDate.toISOString().slice(0, 10);
            if (!dayMap.has(key)) return;

            if (metric === 'generations' && event.event_name === 'image_generation_started') {
              dayMap.set(key, (dayMap.get(key) ?? 0) + (event.image_count ?? 1));
            }
            if (metric === 'cost' && event.event_name === 'image_generation_succeeded') {
              dayMap.set(key, (dayMap.get(key) ?? 0) + (event.estimated_api_cost ?? 0));
            }
          });

          const trendData = Array.from(dayMap.entries()).map(([key, value]) => {
            const day = new Date(`${key}T00:00:00`);
            return { date: formatDayLabel(day), value };
          });
          setData(trendData);
          try {
            sessionStorage.setItem(
              cacheKey,
              JSON.stringify({
                savedAt: Date.now(),
                data: trendData
              })
            );
          } catch (error) {
            // Ignore cache write issues
          }
        } else {
          const weekStarts: Date[] = [];
          const weekMap = new Map<string, Set<string>>();
          const generationWeekMap = new Map<string, number>();
          const costWeekMap = new Map<string, number>();
          const firstWeekStart = new Date(startDate);

          for (let i = 0; i < 8; i += 1) {
            const weekStart = new Date(firstWeekStart);
            weekStart.setDate(firstWeekStart.getDate() + i * 7);
            const weekKey = weekStart.toISOString().slice(0, 10);
            weekStarts.push(weekStart);
            weekMap.set(weekKey, new Set<string>());
            generationWeekMap.set(weekKey, 0);
            costWeekMap.set(weekKey, 0);
          }

          events.forEach((event) => {
            const eventDate = toDate(event.timestamp);
            if (!eventDate) return;
            const weekStart = getWeekStart(eventDate);
            const weekKey = weekStart.toISOString().slice(0, 10);

            if (!weekMap.has(weekKey)) return;
            if (event.user_id) weekMap.get(weekKey)?.add(event.user_id);
            if (event.event_name === 'image_generation_started') {
              generationWeekMap.set(weekKey, (generationWeekMap.get(weekKey) ?? 0) + (event.image_count ?? 1));
            }
            if (event.event_name === 'image_generation_succeeded') {
              costWeekMap.set(weekKey, (costWeekMap.get(weekKey) ?? 0) + (event.estimated_api_cost ?? 0));
            }
          });

          const trendData = weekStarts.map((weekStart) => {
            const weekKey = weekStart.toISOString().slice(0, 10);
            let value = 0;
            if (metric === 'activeUsers') value = weekMap.get(weekKey)?.size ?? 0;
            if (metric === 'generations') value = generationWeekMap.get(weekKey) ?? 0;
            if (metric === 'cost') value = costWeekMap.get(weekKey) ?? 0;
            return { date: formatWeekLabel(weekStart), value };
          });

          setData(trendData);
          try {
            sessionStorage.setItem(
              cacheKey,
              JSON.stringify({
                savedAt: Date.now(),
                data: trendData
              })
            );
          } catch (error) {
            // Ignore cache write issues
          }
        }
      } catch (err) {
        console.error('Failed to load trend data:', err);
        setError('Failed to load trend data');
      } finally {
        setIsLoading(false);
      }
    };

    const normalizedMetric = metric as TrendMetric;
    if (normalizedMetric !== 'generations' && normalizedMetric !== 'activeUsers' && normalizedMetric !== 'cost') {
      setData([]);
      setError('Unknown metric');
      return;
    }

    fetchTrendData();
  }, [metric, range]);

  return { data, isLoading, error };
};
