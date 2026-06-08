export interface AnalyticsDashboardProps {
  onErrorClick?: (errorType: string) => void;
  latencyStats?: { avg: number; p95: number; sparkline: number[] };
  /** Role `advice`: không chỉnh chi phí / ngân sách (Firestore chỉ admin ghi) */
  readOnly?: boolean;
}

export interface AnalyticsUserRow {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}

export type UserHistoryScanMode = 'precomputed' | 'paginated' | 'missing_precomputed';

export interface UserHistoryScanInfo {
  mode: UserHistoryScanMode;
  docCount?: number;
}
