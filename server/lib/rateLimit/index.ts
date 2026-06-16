import { resolveRateLimitBackend } from './config';
import { tryConsumeRateLimitFirestore } from './firestoreStore';
import { tryConsumeRateLimitMemory } from './memoryStore';

let cachedBackend = resolveRateLimitBackend();

/** Re-read env when running tests with different RATE_LIMIT_BACKEND. */
export function resetRateLimitBackendForTests(): void {
  cachedBackend = resolveRateLimitBackend();
}

/**
 * Returns false when the user exceeded the per-minute limit.
 * Throws if the configured backend (Firestore in production) is unavailable —
 * callers must handle this as a 503 rather than silently bypassing the limit.
 */
export async function tryConsumeRateLimit(userId: string): Promise<boolean> {
  if (cachedBackend === 'firestore') {
    return tryConsumeRateLimitFirestore(userId);
  }
  return tryConsumeRateLimitMemory(userId);
}
