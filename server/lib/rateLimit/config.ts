export const RATE_LIMIT_REQUESTS_PER_MINUTE = 10;
export const RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const RATE_LIMIT_FIRESTORE_COLLECTION = 'rate_limit_windows';

export type RateLimitBackend = 'memory' | 'firestore';

export function resolveRateLimitBackend(): RateLimitBackend {
  const raw = (process.env.RATE_LIMIT_BACKEND || '').trim().toLowerCase();
  if (raw === 'memory') return 'memory';
  if (raw === 'firestore') return 'firestore';
  // Production default: shared store for multi-instance Cloud Run.
  if (process.env.NODE_ENV === 'production') return 'firestore';
  return 'memory';
}
