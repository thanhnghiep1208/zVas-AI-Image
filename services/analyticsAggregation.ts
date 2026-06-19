import type { AnalyticsEventRecord } from '../data/analyticsRepository';
import type {
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
import { ANALYTICS_ROLLUP_VERSION } from './analyticsTypes';

export { ANALYTICS_ROLLUP_VERSION };

const toDateValue = (value: Date | { toDate?: () => Date } | null | undefined): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  return null;
};

const mapErrorType = (errorCode?: string): { errorType: string; severity: 'warning' | 'critical' } => {
  const normalized = (errorCode || '').toLowerCase();
  // Clean codes (new)
  if (normalized === 'quota_exceeded') return { errorType: 'Quota Exceeded (429)', severity: 'critical' };
  if (normalized === 'forbidden') return { errorType: 'API Key / Permission (403)', severity: 'critical' };
  if (normalized === 'auth_error') return { errorType: 'Auth Error (401)', severity: 'critical' };
  if (normalized === 'not_found') return { errorType: 'Model Not Found', severity: 'warning' };
  if (normalized === 'rate_limit') return { errorType: 'Rate Limit', severity: 'warning' };
  if (normalized === 'timeout') return { errorType: 'API Timeout', severity: 'critical' };
  if (normalized === 'network_error') return { errorType: 'Network Error', severity: 'critical' };
  if (normalized === 'no_output') return { errorType: 'No Output', severity: 'warning' };
  if (normalized === 'server_error') return { errorType: 'Server Error (500/502)', severity: 'critical' };
  if (normalized === 'service_unavailable') return { errorType: 'Service Unavailable (503)', severity: 'critical' };
  if (normalized === 'content_filter') return { errorType: 'Content Filter', severity: 'warning' };
  if (normalized === 'invalid_prompt') return { errorType: 'Invalid Prompt', severity: 'warning' };
  if (normalized === 'permission_denied') return { errorType: 'Permission Denied', severity: 'critical' };
  // Fallback keyword matching for legacy events
  if (normalized.includes('timeout') || normalized.includes('timed out')) return { errorType: 'API Timeout', severity: 'critical' };
  if (normalized.includes('429') || normalized.includes('quota') || normalized.includes('resource_exhausted')) return { errorType: 'Quota Exceeded (429)', severity: 'critical' };
  if (normalized.includes('403') || normalized.includes('forbidden')) return { errorType: 'API Key / Permission (403)', severity: 'critical' };
  if (normalized.includes('401') || normalized.includes('unauthorized')) return { errorType: 'Auth Error (401)', severity: 'critical' };
  if (normalized.includes('500') || normalized.includes('internal server error') || normalized.includes('502') || normalized.includes('bad gateway')) return { errorType: 'Server Error (500/502)', severity: 'critical' };
  if (normalized.includes('503') || normalized.includes('service unavailable')) return { errorType: 'Service Unavailable (503)', severity: 'critical' };
  if (normalized.includes('not found') || normalized.includes('entity was not found')) return { errorType: 'Model Not Found', severity: 'warning' };
  if (normalized.includes('rate limit')) return { errorType: 'Rate Limit', severity: 'warning' };
  if (normalized.includes('filter') || normalized.includes('safety') || normalized.includes('blocked')) return { errorType: 'Content Filter', severity: 'warning' };
  if (normalized.includes('failed to fetch') || normalized.includes('network')) return { errorType: 'Network Error', severity: 'critical' };
  if (normalized.includes('no image was generated')) return { errorType: 'No Output', severity: 'warning' };
  if (normalized.includes('prompt') || normalized.includes('invalid')) return { errorType: 'Invalid Prompt', severity: 'warning' };
  return { errorType: 'Unknown', severity: 'critical' };
};

export const percentTrend = (current: number, previous: number): number => {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return ((current - previous) / previous) * 100;
};

/** Inclusive calendar month from `YYYY-MM`. */
export function monthBoundsFromKey(monthKey: string): { startDate: Date; endDate: Date } {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    const now = new Date();
    return {
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      endDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    };
  }
  return {
    startDate: new Date(year, month, 1),
    endDate: new Date(year, month + 1, 1),
  };
}

export function monthBounds(monthKey: string): {
  currentStart: Date;
  currentEnd: Date;
  prevStart: Date;
  prevEnd: Date;
} {
  const { startDate, endDate } = monthBoundsFromKey(monthKey);
  const prevStart = new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1);
  const prevEnd = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  return { currentStart: startDate, currentEnd: endDate, prevStart, prevEnd };
}

export function buildMonthlyAnalyticsFromEvents(
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
    ? (costs.storage_cost || 0) +
      (costs.server_cost || 0) +
      (costs.bandwidth_cost || 0) +
      (costs.other_cost || 0)
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
    average_generations_per_user:
      generatingUsers.size > 0 ? totalGenerations / generatingUsers.size : 0,
  };
}

export function buildMonthlyErrorBreakdownFromEvents(
  events: AnalyticsEventRecord[]
): MonthlyErrorBreakdownItem[] {
  const grouped = new Map<string, MonthlyErrorBreakdownItem>();

  events.forEach((data) => {
    if (data.event_name !== 'image_generation_failed') return;

    const { errorType, severity } = mapErrorType(data.error_code);
    const count = data.image_count || 1;
    const eventDate = toDateValue(data.timestamp);
    const rawMsg = data.error_message_short?.trim() || '';

    const current = grouped.get(errorType);
    if (!current) {
      grouped.set(errorType, {
        errorType, count, lastOccurred: eventDate, severity,
        sampleMessages: rawMsg ? [rawMsg] : [],
      });
      return;
    }

    current.count += count;
    if (eventDate && (!current.lastOccurred || eventDate > current.lastOccurred)) {
      current.lastOccurred = eventDate;
    }
    if (rawMsg && current.sampleMessages && current.sampleMessages.length < 3 && !current.sampleMessages.includes(rawMsg)) {
      current.sampleMessages.push(rawMsg);
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

  return { totalTokens, avgTotal, avgInput, avgOutput, costPer1k };
}

export function buildMonthlyTokenStatsFromEvents(
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

export function buildMonthlyTopModelStatsFromEvents(
  events: AnalyticsEventRecord[]
): MonthlyTopModelStats {
  const attemptCounts = new Map<string, number>();
  const successCounts = new Map<string, number>();

  events.forEach((data) => {
    const modelName = data.model_name || 'unknown';
    const count = data.image_count || 1;
    if (data.event_name === 'image_generation_started') {
      attemptCounts.set(modelName, (attemptCounts.get(modelName) ?? 0) + count);
    } else if (data.event_name === 'image_generation_succeeded') {
      successCounts.set(modelName, (successCounts.get(modelName) ?? 0) + count);
    }
  });

  const allModels = new Set([...attemptCounts.keys(), ...successCounts.keys()]);

  let topModelName = 'N/A';
  let topModelCount = 0;
  allModels.forEach((modelName) => {
    const count = attemptCounts.get(modelName) ?? 0;
    if (count > topModelCount) {
      topModelCount = count;
      topModelName = modelName;
    }
  });

  const modelBreakdown = Array.from(allModels)
    .map((modelName) => ({
      modelName,
      requestCount: attemptCounts.get(modelName) ?? 0,
      successCount: successCounts.get(modelName) ?? 0,
    }))
    .sort((a, b) => b.requestCount - a.requestCount);

  return { modelName: topModelName, requestCount: topModelCount, modelBreakdown };
}

export function applyMonthlyCostsToAnalytics(
  analytics: MonthlyAnalytics,
  costs: MonthlyCosts | null
): MonthlyAnalytics {
  const totalManualInfraCost = costs
    ? (costs.storage_cost || 0) +
      (costs.server_cost || 0) +
      (costs.bandwidth_cost || 0) +
      (costs.other_cost || 0)
    : 0;
  const totalVariableAiCost = analytics.total_variable_ai_cost;
  const totalMonthlyCost = totalVariableAiCost + totalManualInfraCost;
  const { successful_generations, generating_users } = analytics;

  return {
    ...analytics,
    total_manual_infra_cost: totalManualInfraCost,
    total_monthly_cost: totalMonthlyCost,
    cost_per_successful_image:
      successful_generations > 0 ? totalMonthlyCost / successful_generations : 0,
    cost_per_generating_user: generating_users > 0 ? totalMonthlyCost / generating_users : 0,
  };
}

export function normalizeErrorBreakdownFromRollup(items: unknown): MonthlyErrorBreakdownItem[] {
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

export function isDashboardRollupPayload(raw: Record<string, unknown> | null): raw is {
  version: number;
  analytics: MonthlyAnalytics;
  errorBreakdown: unknown;
  tokenStats: MonthlyTokenStats;
  topModelStats: MonthlyTopModelStats;
} {
  if (!raw || raw.version !== ANALYTICS_ROLLUP_VERSION) return false;
  if (typeof raw.analytics !== 'object' || raw.analytics === null) return false;
  if (!Array.isArray(raw.errorBreakdown)) return false;
  if (typeof raw.tokenStats !== 'object' || raw.tokenStats === null) return false;
  if (typeof raw.topModelStats !== 'object' || raw.topModelStats === null) return false;
  return true;
}

/** Firestore document shape for `analytics_monthly_rollups/{YYYY-MM}`. */
export function buildMonthlyRollupDocument(
  monthKey: string,
  bundle: MonthlyDashboardBundle
): Record<string, unknown> {
  return {
    version: ANALYTICS_ROLLUP_VERSION,
    monthKey,
    analytics: bundle.analytics,
    errorBreakdown: bundle.errorBreakdown.map((row) => ({
      ...row,
      lastOccurred: row.lastOccurred ?? null,
    })),
    tokenStats: bundle.tokenStats,
    topModelStats: bundle.topModelStats,
  };
}

/** Pure bundle from event arrays (no Firestore). */
export function buildMonthlyDashboardBundleFromEvents(
  monthKey: string,
  currentEvents: AnalyticsEventRecord[],
  prevEvents: AnalyticsEventRecord[],
  costs: MonthlyCosts | null
): MonthlyDashboardBundle {
  return {
    analytics: buildMonthlyAnalyticsFromEvents(currentEvents, costs),
    errorBreakdown: buildMonthlyErrorBreakdownFromEvents(currentEvents),
    tokenStats: buildMonthlyTokenStatsFromEvents(currentEvents, prevEvents),
    topModelStats: buildMonthlyTopModelStatsFromEvents(currentEvents),
  };
}

/** Count history rows per uid (client or server scan). */
export function aggregateHistoryCountsByUid(
  historyRows: Array<{ uid?: string }>
): Record<string, number> {
  const counts: Record<string, number> = {};
  historyRows.forEach((row) => {
    const uid = row.uid;
    if (typeof uid === 'string') {
      counts[uid] = (counts[uid] ?? 0) + 1;
    }
  });
  return counts;
}

const getWeekStart = (date: Date): Date => {
  const result = new Date(date);
  const day = result.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setUTCDate(result.getUTCDate() + diff);
  result.setUTCHours(0, 0, 0, 0);
  return result;
};

const formatDayLabel = (date: Date): string =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const formatWeekLabel = (date: Date): string =>
  `Wk ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

const eventTimestamp = (event: AnalyticsEventRecord): Date | null => toDateValue(event.timestamp);

/** Aggregate trend chart points from raw analytics events. */
export function aggregateTrendPoints(
  events: AnalyticsEventRecord[],
  metric: TrendMetric,
  range: TrendRange,
  referenceDate: Date = new Date()
): TrendPoint[] {
  const now = referenceDate;
  const startDate = new Date(now);

  if (range === '30d') {
    startDate.setUTCDate(now.getUTCDate() - 29);
    startDate.setUTCHours(0, 0, 0, 0);

    const dayMap = new Map<string, number>();
    for (let i = 0; i < 30; i += 1) {
      const day = new Date(startDate);
      day.setUTCDate(startDate.getUTCDate() + i);
      dayMap.set(day.toISOString().slice(0, 10), 0);
    }

    const activeUserDayMap = new Map<string, Set<string>>();
    if (metric === 'activeUsers') {
      for (const key of dayMap.keys()) activeUserDayMap.set(key, new Set());
    }

    events.forEach((event) => {
      const eventDate = eventTimestamp(event);
      if (!eventDate) return;
      const key = eventDate.toISOString().slice(0, 10);
      if (!dayMap.has(key)) return;
      if (metric === 'generations' && event.event_name === 'image_generation_started') {
        dayMap.set(key, (dayMap.get(key) ?? 0) + (event.image_count ?? 1));
      } else if (metric === 'cost' && event.event_name === 'image_generation_succeeded') {
        dayMap.set(key, (dayMap.get(key) ?? 0) + (event.estimated_api_cost ?? 0));
      } else if (metric === 'activeUsers' && event.user_id) {
        activeUserDayMap.get(key)?.add(event.user_id);
      }
    });

    if (metric === 'activeUsers') {
      for (const [key, users] of activeUserDayMap.entries()) {
        dayMap.set(key, users.size);
      }
    }

    return Array.from(dayMap.entries()).map(([key, value]) => {
      const day = new Date(`${key}T00:00:00`);
      return { date: formatDayLabel(day), value };
    });
  }

  const currentWeekStart = getWeekStart(now);
  startDate.setTime(currentWeekStart.getTime());
  startDate.setUTCDate(startDate.getUTCDate() - 7 * 7);

  const weekStarts: Date[] = [];
  const weekMap = new Map<string, Set<string>>();
  const generationWeekMap = new Map<string, number>();
  const costWeekMap = new Map<string, number>();
  const firstWeekStart = new Date(startDate);

  for (let i = 0; i < 8; i += 1) {
    const weekStart = new Date(firstWeekStart);
    weekStart.setUTCDate(firstWeekStart.getUTCDate() + i * 7);
    const weekKey = weekStart.toISOString().slice(0, 10);
    weekStarts.push(weekStart);
    weekMap.set(weekKey, new Set<string>());
    generationWeekMap.set(weekKey, 0);
    costWeekMap.set(weekKey, 0);
  }

  events.forEach((event) => {
    const eventDate = eventTimestamp(event);
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

  return weekStarts.map((weekStart) => {
    const weekKey = weekStart.toISOString().slice(0, 10);
    let value = 0;
    if (metric === 'activeUsers') value = weekMap.get(weekKey)?.size ?? 0;
    if (metric === 'generations') value = generationWeekMap.get(weekKey) ?? 0;
    if (metric === 'cost') value = costWeekMap.get(weekKey) ?? 0;
    return { date: formatWeekLabel(weekStart), value };
  });
}
