import {
  addAnalyticsEvent,
  addAnalyticsEventBatch,
  getAnalyticsEventsByDateRange,
  getAnalyticsEventsByDateRangeAndName,
  getAnalyticsMonthlyRollupRaw,
  getMonthlyCostsRecord,
  saveMonthlyCostsRecord,
} from '../data/analyticsRepository';
import {
  applyMonthlyCostsToAnalytics,
  buildMonthlyAnalyticsFromEvents,
  buildMonthlyDashboardBundleFromEvents,
  buildMonthlyErrorBreakdownFromEvents,
  buildMonthlyTokenStatsFromEvents,
  buildMonthlyTopModelStatsFromEvents,
  isDashboardRollupPayload,
  monthBounds,
  normalizeErrorBreakdownFromRollup,
} from './analyticsAggregation';
import type {
  AnalyticsEventName,
  AnalyticsEventPayload,
  MonthlyAnalytics,
  MonthlyCosts,
  MonthlyDashboardBundle,
  MonthlyErrorBreakdownItem,
  MonthlyTokenStats,
  MonthlyTopModelStats,
} from './analyticsTypes';

export type {
  AnalyticsEventName,
  AnalyticsEventPayload,
  MonthlyAnalytics,
  MonthlyCosts,
  MonthlyDashboardBundle,
  MonthlyErrorBreakdownItem,
  MonthlyTokenStats,
  MonthlyTopModelStats,
  TrendMetric,
  TrendPoint,
  TrendRange,
} from './analyticsTypes';

const MAX_ERROR_CODE_LENGTH = 96;
const MAX_ERROR_MESSAGE_LENGTH = 280;

function normalizeErrorCode(raw: unknown): string {
  const text = String(raw ?? '').toLowerCase();
  if (!text || text === 'unknown') return 'unknown_error';
  // Already-normalized codes — pass through directly
  const CLEAN_CODES = ['quota_exceeded', 'forbidden', 'not_found', 'rate_limit', 'timeout',
    'network_error', 'no_output', 'server_error', 'service_unavailable', 'auth_error',
    'content_filter', 'invalid_prompt', 'unknown_error'];
  if (CLEAN_CODES.includes(text)) return text;
  // Keyword matching for raw messages
  if (text.includes('permission_denied') || text.includes('missing or insufficient permissions'))
    return 'permission_denied';
  if (text.includes('timeout') || text.includes('deadline exceeded') || text.includes('timed out'))
    return 'timeout';
  if (text.includes('429') || text.includes('quota') || text.includes('rate limit') || text.includes('too many requests') || text.includes('resource_exhausted'))
    return 'quota_exceeded';
  if (text.includes('403') || text.includes('forbidden')) return 'forbidden';
  if (text.includes('401') || text.includes('unauthorized')) return 'auth_error';
  if (text.includes('500') || text.includes('internal server error') || text.includes('502') || text.includes('bad gateway'))
    return 'server_error';
  if (text.includes('503') || text.includes('service unavailable')) return 'service_unavailable';
  if (text.includes('filter') || text.includes('safety') || text.includes('blocked')) return 'content_filter';
  if (text.includes('invalid') || text.includes('prompt')) return 'invalid_prompt';
  if (text.includes('auth') || text.includes('api_key') || text.includes('unregistered callers'))
    return 'auth_error';
  if (text.includes('failed to fetch') || text.includes('network')) return 'network_error';
  const slug = text.replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, MAX_ERROR_CODE_LENGTH);
  return slug || 'unknown_error';
}

function sanitizePayload(eventName: AnalyticsEventName, payload: AnalyticsEventPayload): AnalyticsEventPayload {
  const sanitized: AnalyticsEventPayload = { ...payload };

  if (eventName === 'image_generation_failed') {
    const raw = payload.error_code;
    sanitized.error_code = normalizeErrorCode(raw);
    sanitized.error_message_short = String(payload.error_message_short ?? raw ?? '').slice(0, MAX_ERROR_MESSAGE_LENGTH);
  }

  if (eventName === 'image_downloaded') {
    sanitized.image_count = payload.image_count ?? 1;
  }

  return sanitized;
}

export const trackEvent = async (eventName: AnalyticsEventName, payload: AnalyticsEventPayload) => {
  try {
    const sanitizedPayload = sanitizePayload(eventName, payload);
    await addAnalyticsEvent(eventName, sanitizedPayload as unknown as Record<string, unknown>);
  } catch (error) {
    console.error('Failed to track analytics event:', error);
  }
};

export const trackEvents = async (
  events: Array<{ name: AnalyticsEventName; payload: AnalyticsEventPayload }>
) => {
  if (events.length === 0) return;
  if (events.length === 1) {
    await trackEvent(events[0].name, events[0].payload);
    return;
  }
  try {
    await addAnalyticsEventBatch(
      events.map((e) => ({
        name: e.name,
        payload: sanitizePayload(e.name, e.payload) as unknown as Record<string, unknown>,
      }))
    );
  } catch (error) {
    console.error('Failed to track analytics events batch:', error);
  }
};

export const saveMonthlyCosts = async (monthKey: string, costs: MonthlyCosts) => {
  try {
    await saveMonthlyCostsRecord(monthKey, costs);
  } catch (error) {
    console.error('Failed to save monthly costs:', error);
    throw error;
  }
};

export const getMonthlyCosts = async (monthKey: string): Promise<MonthlyCosts | null> => {
  try {
    return await getMonthlyCostsRecord(monthKey);
  } catch (error) {
    console.error('Failed to get monthly costs:', error);
    return null;
  }
};

/**
 * Tải bundle dashboard tháng:
 * - Ưu tiên doc `analytics_monthly_rollups/{YYYY-MM}` (version 1).
 * - Fallback: quét `analytics_events` (repository pagination) cho tháng hiện tại + tháng trước.
 */
export async function loadMonthlyDashboardBundle(monthKey: string): Promise<MonthlyDashboardBundle> {
  const [rollupRaw, costs] = await Promise.all([
    getAnalyticsMonthlyRollupRaw(monthKey),
    getMonthlyCosts(monthKey),
  ]);

  if (isDashboardRollupPayload(rollupRaw)) {
    return {
      analytics: applyMonthlyCostsToAnalytics(rollupRaw.analytics, costs),
      errorBreakdown: normalizeErrorBreakdownFromRollup(rollupRaw.errorBreakdown),
      tokenStats: rollupRaw.tokenStats,
      topModelStats: rollupRaw.topModelStats,
    };
  }

  const { currentStart, currentEnd, prevStart, prevEnd } = monthBounds(monthKey);
  const [currentEvents, prevEvents] = await Promise.all([
    getAnalyticsEventsByDateRange(currentStart, currentEnd),
    getAnalyticsEventsByDateRange(prevStart, prevEnd),
  ]);

  return buildMonthlyDashboardBundleFromEvents(monthKey, currentEvents, prevEvents, costs);
}

export const calculateMonthlyAnalytics = async (monthKey: string): Promise<MonthlyAnalytics> => {
  const { currentStart, currentEnd } = monthBounds(monthKey);
  const [events, costs] = await Promise.all([
    getAnalyticsEventsByDateRange(currentStart, currentEnd),
    getMonthlyCosts(monthKey),
  ]);
  return buildMonthlyAnalyticsFromEvents(events, costs);
};

export const getMonthlyErrorBreakdown = async (monthKey: string): Promise<MonthlyErrorBreakdownItem[]> => {
  const { currentStart, currentEnd } = monthBounds(monthKey);
  const events = await getAnalyticsEventsByDateRangeAndName(
    currentStart,
    currentEnd,
    'image_generation_failed'
  );
  return buildMonthlyErrorBreakdownFromEvents(events);
};

export const getMonthlyTokenStats = async (monthKey: string): Promise<MonthlyTokenStats> => {
  const { currentStart, currentEnd, prevStart, prevEnd } = monthBounds(monthKey);
  const [currentEvents, prevEvents] = await Promise.all([
    getAnalyticsEventsByDateRange(currentStart, currentEnd),
    getAnalyticsEventsByDateRange(prevStart, prevEnd),
  ]);
  return buildMonthlyTokenStatsFromEvents(currentEvents, prevEvents);
};

export const getMonthlyTopModelStats = async (monthKey: string): Promise<MonthlyTopModelStats> => {
  const { currentStart, currentEnd } = monthBounds(monthKey);
  const events = await getAnalyticsEventsByDateRangeAndName(
    currentStart,
    currentEnd,
    'image_generation_started'
  );
  return buildMonthlyTopModelStatsFromEvents(events);
};
