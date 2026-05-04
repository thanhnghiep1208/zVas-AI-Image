import { db, collection, addDoc, serverTimestamp, getDocs, query, where, orderBy, setDoc, doc, getDoc } from '../firebase';

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
}

export const trackEvent = async (eventName: AnalyticsEventName, payload: AnalyticsEventPayload) => {
  try {
    const eventsRef = collection(db, 'analytics_events');
    await addDoc(eventsRef, {
      event_name: eventName,
      timestamp: serverTimestamp(),
      ...payload
    });
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
    const docRef = doc(db, 'monthly_costs', monthKey);
    await setDoc(docRef, costs);
  } catch (error) {
    console.error('Failed to save monthly costs:', error);
    throw error;
  }
};

export const getMonthlyCosts = async (monthKey: string): Promise<MonthlyCosts | null> => {
  try {
    const docRef = doc(db, 'monthly_costs', monthKey);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as MonthlyCosts;
    }
    return null;
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

export const calculateMonthlyAnalytics = async (monthKey: string): Promise<MonthlyAnalytics> => {
  // monthKey format: 'YYYY-MM'
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-indexed for Date

  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 1);

  const eventsRef = collection(db, 'analytics_events');
  const q = query(
    eventsRef,
    where('timestamp', '>=', startDate),
    where('timestamp', '<', endDate)
  );

  const snapshot = await getDocs(q);
  
  const activeUsers = new Set<string>();
  const generatingUsers = new Set<string>();
  let totalGenerations = 0;
  let successfulGenerations = 0;
  let failedGenerations = 0;
  let totalVariableAiCost = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    const userId = data.user_id;
    const eventName = data.event_name;

    if (userId) activeUsers.add(userId);

    if (eventName === 'image_generation_started') {
      totalGenerations += (data.image_count || 1);
      if (userId) generatingUsers.add(userId);
    } else if (eventName === 'image_generation_succeeded') {
      successfulGenerations += (data.image_count || 1);
      totalVariableAiCost += (data.estimated_api_cost || 0);
    } else if (eventName === 'image_generation_failed') {
      failedGenerations += (data.image_count || 1);
    }
  });

  const costs = await getMonthlyCosts(monthKey);
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
    average_generations_per_user: generatingUsers.size > 0 ? totalGenerations / generatingUsers.size : 0
  };
};

export const getMonthlyErrorBreakdown = async (monthKey: string): Promise<MonthlyErrorBreakdownItem[]> => {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;

  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 1);

  const eventsRef = collection(db, 'analytics_events');
  const q = query(
    eventsRef,
    where('timestamp', '>=', startDate),
    where('timestamp', '<', endDate),
    where('event_name', '==', 'image_generation_failed')
  );

  const snapshot = await getDocs(q);
  const grouped = new Map<string, MonthlyErrorBreakdownItem>();

  snapshot.forEach((eventDoc) => {
    const data = eventDoc.data();
    const { errorType, severity } = mapErrorType(data.error_code);
    const count = data.image_count || 1;
    const eventDate: Date | null = data.timestamp?.toDate ? data.timestamp.toDate() : null;

    const current = grouped.get(errorType);
    if (!current) {
      grouped.set(errorType, {
        errorType,
        count,
        lastOccurred: eventDate,
        severity
      });
      return;
    }

    current.count += count;
    if (eventDate && (!current.lastOccurred || eventDate > current.lastOccurred)) {
      current.lastOccurred = eventDate;
    }
  });

  return Array.from(grouped.values()).sort((a, b) => b.count - a.count);
};

export const getMonthlyTokenStats = async (monthKey: string): Promise<MonthlyTokenStats> => {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;

  const currentStart = new Date(year, month, 1);
  const currentEnd = new Date(year, month + 1, 1);
  const prevStart = new Date(year, month - 1, 1);
  const prevEnd = new Date(year, month, 1);

  const eventsRef = collection(db, 'analytics_events');
  const currentQuery = query(
    eventsRef,
    where('timestamp', '>=', currentStart),
    where('timestamp', '<', currentEnd)
  );
  const prevQuery = query(
    eventsRef,
    where('timestamp', '>=', prevStart),
    where('timestamp', '<', prevEnd)
  );

  const [currentSnap, prevSnap] = await Promise.all([getDocs(currentQuery), getDocs(prevQuery)]);

  interface TokenEventDoc {
    event_name?: string;
    estimated_api_cost?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  }

  const summarize = (snapshot: Awaited<ReturnType<typeof getDocs>>) => {
    let totalTokens = 0;
    let totalInput = 0;
    let totalOutput = 0;
    let totalCost = 0;
    let requestCount = 0;

    snapshot.forEach((eventDoc) => {
      const data = eventDoc.data() as TokenEventDoc;
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
      costPer1k
    };
  };

  const current = summarize(currentSnap);
  const previous = summarize(prevSnap);

  return {
    avgTotal: current.avgTotal,
    avgInput: current.avgInput,
    avgOutput: current.avgOutput,
    totalMonth: current.totalTokens,
    costPer1k: current.costPer1k,
    avgTotalTrend: percentTrend(current.avgTotal, previous.avgTotal),
    avgInputTrend: percentTrend(current.avgInput, previous.avgInput),
    avgOutputTrend: percentTrend(current.avgOutput, previous.avgOutput),
    totalMonthTrend: percentTrend(current.totalTokens, previous.totalTokens)
  };
};

export const getMonthlyTopModelStats = async (monthKey: string): Promise<MonthlyTopModelStats> => {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;

  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 1);

  const eventsRef = collection(db, 'analytics_events');
  const q = query(
    eventsRef,
    where('timestamp', '>=', startDate),
    where('timestamp', '<', endDate),
    where('event_name', '==', 'image_generation_started')
  );

  const snapshot = await getDocs(q);
  const modelCounts = new Map<string, number>();

  snapshot.forEach((eventDoc) => {
    const data = eventDoc.data() as { model_name?: string; image_count?: number };
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
    modelBreakdown
  };
};
