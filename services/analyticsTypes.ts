import type { AnalyticsEventRecord } from '../repositories/analyticsRepository';

export type { AnalyticsEventRecord };

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

export interface MonthlyCosts {
  storage_cost: number;
  server_cost: number;
  bandwidth_cost: number;
  other_cost: number;
}

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

export type TrendMetric = 'generations' | 'activeUsers' | 'cost';
export type TrendRange = '30d' | '8w';

export interface TrendPoint {
  date: string;
  value: number;
}

export const ANALYTICS_ROLLUP_VERSION = 1;
