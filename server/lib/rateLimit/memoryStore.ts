import {
  RATE_LIMIT_REQUESTS_PER_MINUTE,
  RATE_LIMIT_WINDOW_MS,
} from './config';

const CLEANUP_THRESHOLD = 1000;
const CLEANUP_MAX_AGE_MS = 5 * 60 * 1000;

const memoryRateLimit = new Map<string, number[]>();

function pruneOldTimestamps(timestamps: number[], cutoff: number): number[] {
  return timestamps.filter((t) => t > cutoff);
}

function maybeCleanupStore(now: number): void {
  if (memoryRateLimit.size <= CLEANUP_THRESHOLD) return;
  const oldestAllowed = now - CLEANUP_MAX_AGE_MS;
  for (const [id, times] of memoryRateLimit.entries()) {
    const filtered = pruneOldTimestamps(times, oldestAllowed);
    if (filtered.length === 0) memoryRateLimit.delete(id);
    else memoryRateLimit.set(id, filtered);
  }
}

export function tryConsumeRateLimitMemory(userId: string): boolean {
  const now = Date.now();
  const oneMinuteAgo = now - RATE_LIMIT_WINDOW_MS;

  let userRequests = pruneOldTimestamps(memoryRateLimit.get(userId) || [], oneMinuteAgo);
  if (userRequests.length >= RATE_LIMIT_REQUESTS_PER_MINUTE) {
    return false;
  }

  userRequests.push(now);
  memoryRateLimit.set(userId, userRequests);
  maybeCleanupStore(now);
  return true;
}
