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
      console.error('Firestore rate limit failed, falling back to memory:', error);
      return tryConsumeRateLimitMemory(userId);
    }
  }
  return tryConsumeRateLimitMemory(userId);
}
