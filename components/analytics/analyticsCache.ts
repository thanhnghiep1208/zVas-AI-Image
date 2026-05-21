import { ANALYTICS_CACHE_TTL_MS } from './constants';

export function readCacheEntry<T>(key: string): { data: T; savedAt: number } | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt: number; data: T };
    if (!parsed || typeof parsed.savedAt !== 'number') return null;
    if (Date.now() - parsed.savedAt > ANALYTICS_CACHE_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }
    return { data: parsed.data, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

export function writeCache(key: string, value: unknown) {
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({
        savedAt: Date.now(),
        data: value,
      })
    );
  } catch {
    // Ignore cache failures silently
  }
}

export function clearCache(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
