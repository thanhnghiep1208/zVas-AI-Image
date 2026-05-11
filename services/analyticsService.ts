import {
  addAnalyticsEvent,
  getAnalyticsEventsByDateRange,
  getAnalyticsEventsByDateRangeAndName,
  getAnalyticsMonthlyRollupRaw,
  getMonthlyCostsRecord,
  saveMonthlyCostsRecord,
} from '../repositories/analyticsRepository';
import type { AnalyticsEventRecord } from '../repositories/analyticsRepository';

export type AnalyticsEventName =
  | 'user_login'
  | 'image_generation_started'
  | 'image_generation_succeeded'
  | 'image_generation_failed'
  | 'image_downloaded';

export interface AnalyticsEventPayload {
  user_id: string;
  model_name?: string;
  generation_type?: string;
  image_count?: number;
  estimated_api_cost?: number;
  duration_ms?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  status?: string;
  error_code?: string;
  error_message_short?: string;
  export_type?: 'jpg' | 'png';
  remove_background?: boolean;
}

const MAX_ERROR_CODE_LENGTH = 96;
const MAX_ERROR_MESSAGE_LENGTH = 280;

function normalizeErrorCode(raw: unknown): string {
  const text = String(raw ?? '').toLowerCase();
  if (!text) return 'unknown_error';
  if (text.includes('permission_denied') || text.includes('missing or insufficient permissions')) return 'permission_denied';
  if (text.includes('timeout') || text.includes('deadline exceeded') || text.includes('timed out')) return 'timeout';
  if (text.includes('invalid') || text.includes('prompt')) return 'invalid_prompt';
  if (text.includes('filter') || text.includes('safety')) return 'content_filter';
  if (text.includes('quota') || text.includes('rate limit') || text.includes('too many requests')) return 'rate_limit';
  if (text.includes('auth') || text.includes('api_key') || text.includes('unregistered callers')) return 'auth_error';
  return text.replace(/[^a-z0-9_]+/g, '_').slice(0, MAX_ERROR_CODE_LENGTH) || 'unknown_error';
}

function sanitizePayload(eventName: AnalyticsEventName, payload: AnalyticsEventPayload): AnalyticsEventPayload {
  const sanitized: AnalyticsEventPayload = { ...payload };

  if (eventName === 'image_generation_failed') {
    const raw = payload.error_code;
    sanitized.error_code = normalizeErrorCode(raw);
    sanitized.error_message_short = String(raw ?? '').slice(0, MAX_ERROR_MESSAGE_LENGTH);
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

export interface MonthlyCosts {
  storage_cost: number;
  server_cost: number;
  bandwidth_cost: number;
  other_cost: number;
}

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

export interface MonthlyAnalytics {
  monthly_active_users: number;
  generating_users: number;
  total_generations: number;
  successful_generations: number;
  failed_generations: number;
  success_rate: number;
  total_variable_ai_cost: number;
  total_manual_infra_cost: number;
  total_monthly_cost: number;
  cost_per_successful_image: number;
  cost_per_generating_user: number;
  average_generations_per_user: number;
}

export interface MonthlyErrorBreakdownItem {
  errorType: string;
  count: number;
  lastOccurred: Date | null;
  severity: 'warning' | 'critical';
}

export interface MonthlyTokenStats {
  avgTotal: number;
  avgInput: number;
  avgOutput: number;
  totalMonth: number;
  costPer1k: number;
  avgTotalTrend: number;
  avgInputTrend: number;
  avgOutputTrend: number;
  totalMonthTrend: number;
}

export interface MonthlyTopModelStats {
  modelName: string;
  requestCount: number;
  modelBreakdown: Array<{ modelName: string; requestCount: number }>;
}

export interface MonthlyDashboardBundle {
  analytics: MonthlyAnalytics;
  errorBreakdown: MonthlyErrorBreakdownItem[];
  tokenStats: MonthlyTokenStats;
  topModelStats: MonthlyTopModelStats;
}

const toDateValue = (value: Date | { toDate?: () => Date } | null | undefined): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  return null;
};

const mapErrorType = (errorCode?: string): { errorType: string; severity: 'warning' | 'critical' } => {
  const normalized = (errorCode || '').toLowerCase();
  if (normalized.includes('timeout')) {
    return { errorType: 'API Timeout', severity: 'critical' };
  }
  if (normalized.includes('filter') || normalized.includes('safety')) {
    return { errorType: 'Content Filter', severity: 'warning' };
  }
  if (normalized.includes('prompt') || normalized.includes('invalid')) {
    return { errorType: 'Invalid Prompt', severity: 'warning' };
  }
  return { errorType: 'Unknown', severity: 'critical' };
};

const percentTrend = (current: number, previous: number): number => {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return ((current - previous) / previous) * 100;
};

function monthBounds(monthKey: string): {
  currentStart: Date;
  currentEnd: Date;
  prevStart: Date;
  prevEnd: Date;
} {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const currentStart = new Date(year, month, 1);
  const currentEnd = new Date(year, month + 1, 1);
  const prevStart = new Date(year, month - 1, 1);
  const prevEnd = new Date(year, month, 1);
  return { currentStart, currentEnd, prevStart, prevEnd };
}

function buildMonthlyAnalyticsFromEvents(
  events: AnalyticsEventRecord[],
  costs: MonthlyCosts | null
): MonthlyAnalytics {
  const activeUsers = new Set<string>();
  const generatingUsers = new Set<string>();
  let totalGenerations = 0;
  let successfulGenerations = 0;
  let failedGenerations = 0;
  let totalVariableAiCost = 0;

  events.forEach((data) => {
    const userId = data.user_id;
    const eventName = data.event_name;

    if (userId) activeUsers.add(userId);

    if (eventName === 'image_generation_started') {
      totalGenerations += data.image_count || 1;
      if (userId) generatingUsers.add(userId);
    } else if (eventName === 'image_generation_succeeded') {
      successfulGenerations += data.image_count || 1;
      totalVariableAiCost += data.estimated_api_cost || 0;
    } else if (eventName === 'image_generation_failed') {
      failedGenerations += data.image_count || 1;
    }
  });

  const totalManualInfraCost = costs
    ? (costs.storage_cost || 0) + (costs.server_cost || 0) + (costs.bandwidth_cost || 0) + (costs.other_cost || 0)
    : 0;

  const totalMonthlyCost = totalVariableAiCost + totalManualInfraCost;

  return {
    monthly_active_users: activeUsers.size,
    generating_users: generatingUsers.size,
    total_generations: totalGenerations,
    successful_generations: successfulGenerations,
    failed_generations: failedGenerations,
    success_rate: totalGenerations > 0 ? (successfulGenerations / totalGenerations) * 100 : 0,
    total_variable_ai_cost: totalVariableAiCost,
    total_manual_infra_cost: totalManualInfraCost,
    total_monthly_cost: totalMonthlyCost,
    cost_per_successful_image: successfulGenerations > 0 ? totalMonthlyCost / successfulGenerations : 0,
    cost_per_generating_user: generatingUsers.size > 0 ? totalMonthlyCost / generatingUsers.size : 0,
    average_generations_per_user: generatingUsers.size > 0 ? totalGenerations / generatingUsers.size : 0,
  };
}

function buildMonthlyErrorBreakdownFromEvents(events: AnalyticsEventRecord[]): MonthlyErrorBreakdownItem[] {
  const grouped = new Map<string, MonthlyErrorBreakdownItem>();

  events.forEach((data) => {
    if (data.event_name !== 'image_generation_failed') return;

    const { errorType, severity } = mapErrorType(data.error_code);
    const count = data.image_count || 1;
    const eventDate = toDateValue(data.timestamp);

    const current = grouped.get(errorType);
    if (!current) {
      grouped.set(errorType, {
        errorType,
        count,
        lastOccurred: eventDate,
        severity,
      });
      return;
    }

    current.count += count;
    if (eventDate && (!current.lastOccurred || eventDate > current.lastOccurred)) {
      current.lastOccurred = eventDate;
    }
  });

  return Array.from(grouped.values()).sort((a, b) => b.count - a.count);
}

interface TokenEventDoc {
  event_name?: string;
  estimated_api_cost?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

function summarizeTokenEvents(events: TokenEventDoc[]) {
  let totalTokens = 0;
  let totalInput = 0;
  let totalOutput = 0;
  let totalCost = 0;
  let requestCount = 0;

  events.forEach((data) => {
    if (data.event_name !== 'image_generation_succeeded') return;

    requestCount += 1;
    totalCost += data.estimated_api_cost || 0;

    const total = data.total_tokens ?? ((data.prompt_tokens || 0) + (data.completion_tokens || 0));
    totalTokens += total || 0;
    totalInput += data.prompt_tokens || 0;
    totalOutput += data.completion_tokens || 0;
  });

  const avgTotal = requestCount > 0 ? totalTokens / requestCount : 0;
  const avgInput = requestCount > 0 ? totalInput / requestCount : 0;
  const avgOutput = requestCount > 0 ? totalOutput / requestCount : 0;
  const costPer1k = totalTokens > 0 ? (totalCost / totalTokens) * 1000 : 0;

  return {
    totalTokens,
    avgTotal,
    avgInput,
    avgOutput,
    costPer1k,
  };
}

function buildMonthlyTokenStatsFromEvents(
  currentEvents: AnalyticsEventRecord[],
  prevEvents: AnalyticsEventRecord[]
): MonthlyTokenStats {
  const current = summarizeTokenEvents(currentEvents as TokenEventDoc[]);
  const previous = summarizeTokenEvents(prevEvents as TokenEventDoc[]);

  return {
    avgTotal: current.avgTotal,
    avgInput: current.avgInput,
    avgOutput: current.avgOutput,
    totalMonth: current.totalTokens,
    costPer1k: current.costPer1k,
    avgTotalTrend: percentTrend(current.avgTotal, previous.avgTotal),
    avgInputTrend: percentTrend(current.avgInput, previous.avgInput),
    avgOutputTrend: percentTrend(current.avgOutput, previous.avgOutput),
    totalMonthTrend: percentTrend(current.totalTokens, previous.totalTokens),
  };
}

const ROLLUP_VERSION = 1;

function applyMonthlyCostsToAnalytics(analytics: MonthlyAnalytics, costs: MonthlyCosts | null): MonthlyAnalytics {
  const totalManualInfraCost = costs
    ? (costs.storage_cost || 0) + (costs.server_cost || 0) + (costs.bandwidth_cost || 0) + (costs.other_cost || 0)
    : 0;
  const totalVariableAiCost = analytics.total_variable_ai_cost;
  const totalMonthlyCost = totalVariableAiCost + totalManualInfraCost;
  const { successful_generations, generating_users } = analytics;

  return {
    ...analytics,
    total_manual_infra_cost: totalManualInfraCost,
    total_monthly_cost: totalMonthlyCost,
    cost_per_successful_image: successful_generations > 0 ? totalMonthlyCost / successful_generations : 0,
    cost_per_generating_user: generating_users > 0 ? totalMonthlyCost / generating_users : 0,
  };
}

function normalizeErrorBreakdownFromRollup(items: unknown): MonthlyErrorBreakdownItem[] {
  if (!Array.isArray(items)) return [];
  return items.map((row: unknown) => {
    const r = row as MonthlyErrorBreakdownItem & { lastOccurred?: unknown };
    let last: Date | null = r.lastOccurred ?? null;
    if (last && !(last instanceof Date) && typeof (last as { toDate?: () => Date }).toDate === 'function') {
      last = (last as { toDate: () => Date }).toDate();
    } else if (last && !(last instanceof Date) && typeof last === 'string') {
      const d = new Date(last);
      last = Number.isNaN(d.getTime()) ? null : d;
    } else if (last && !(last instanceof Date)) {
      last = null;
    }
    return {
      errorType: String(r.errorType ?? ''),
      count: Number(r.count ?? 0),
      lastOccurred: last,
      severity: r.severity === 'warning' || r.severity === 'critical' ? r.severity : 'critical',
    };
  });
}

function isDashboardRollupPayload(raw: Record<string, unknown> | null): raw is {
  version: number;
  analytics: MonthlyAnalytics;
  errorBreakdown: unknown;
  tokenStats: MonthlyTokenStats;
  topModelStats: MonthlyTopModelStats;
} {
  if (!raw || raw.version !== ROLLUP_VERSION) return false;
  if (typeof raw.analytics !== 'object' || raw.analytics === null) return false;
  if (!Array.isArray(raw.errorBreakdown)) return false;
  if (typeof raw.tokenStats !== 'object' || raw.tokenStats === null) return false;
  if (typeof raw.topModelStats !== 'object' || raw.topModelStats === null) return false;
  return true;
}

function buildMonthlyTopModelStatsFromEvents(events: AnalyticsEventRecord[]): MonthlyTopModelStats {
  const modelCounts = new Map<string, number>();

  events.forEach((data) => {
    if (data.event_name !== 'image_generation_started') return;
    const modelName = data.model_name || 'unknown';
    const count = data.image_count || 1;
    modelCounts.set(modelName, (modelCounts.get(modelName) || 0) + count);
  });

  let topModelName = 'N/A';
  let topModelCount = 0;
  modelCounts.forEach((count, modelName) => {
    if (count > topModelCount) {
      topModelCount = count;
      topModelName = modelName;
    }
  });

  const modelBreakdown = Array.from(modelCounts.entries())
    .map(([modelName, requestCount]) => ({ modelName, requestCount }))
    .sort((a, b) => b.requestCount - a.requestCount);

  return {
    modelName: topModelName,
    requestCount: topModelCount,
    modelBreakdown,
  };
}

/**
 * Tải bundle dashboard tháng:
 * - Nếu có doc `analytics_monthly_rollups/{YYYY-MM}` (`version: 1`) thì đọc 1 doc + `monthly_costs` (cập nhật phần chi phí thủ công).
 * - Ngược lại: quét `analytics_events` theo trang (repository) cho tháng hiện tại + tháng trước.
 *
 * Schema rollup gợi ý (ghi bằng Cloud Function / scheduled job):
 * `{ version: 1, analytics, errorBreakdown, tokenStats, topModelStats }` — cùng shape với `MonthlyDashboardBundle`.
 */
export async function loadMonthlyDashboardBundle(monthKey: string): Promise<MonthlyDashboardBundle> {
  const [rollupRaw, costs] = await Promise.all([getAnalyticsMonthlyRollupRaw(monthKey), getMonthlyCosts(monthKey)]);

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

  return {
    analytics: buildMonthlyAnalyticsFromEvents(currentEvents, costs),
    errorBreakdown: buildMonthlyErrorBreakdownFromEvents(currentEvents),
    tokenStats: buildMonthlyTokenStatsFromEvents(currentEvents, prevEvents),
    topModelStats: buildMonthlyTopModelStatsFromEvents(currentEvents),
  };
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
