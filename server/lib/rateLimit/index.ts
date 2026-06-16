import { resolveRateLimitBackend } from './config';
import { tryConsumeRateLimitFirestore } from './firestoreStore';
import { tryConsumeRateLimitMemory } from './memoryStore';

let cachedBackend = resolveRateLimitBackend();

/** Re-read env when running tests with different RATE_LIMIT_BACKEND. */
export function resetRateLimitBackendForTests(): void {
  cachedBackend = resolveRateLimitBackend();
}

/** Returns false when the user exceeded the per-minute limit. */
export async function tryConsumeRateLimit(userId: string): Promise<boolean> {
  if (cachedBackend === 'firestore') {
    try {
      return await tryConsumeRateLimitFirestore(userId);
    } catch (error) {
      // WARNING: memory fallback does not share state across Cloud Run instances —
      // rate limits may be bypassed under load or during Firestore outages.
      console.error(
        '[WARN] Firestore rate limit unavailable — falling back to in-memory store. ' +
          'This is NOT safe in multi-instance deployments.',
        error
      );
      return tryConsumeRateLimitMemory(userId);
    }
  }
  return tryConsumeRateLimitMemory(userId);
}
