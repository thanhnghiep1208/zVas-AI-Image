import { useEffect, useRef } from 'react';

interface UsePollingOptions {
  /** Stop all polling while false. Default: true */
  enabled?: boolean;
  /** Min ms since last run before a focus-triggered call fires. Default: 0 */
  minFocusGapMs?: number;
  /** Call immediately on mount (and on re-enable). Default: true */
  runImmediately?: boolean;
  /** Add a visibilitychange listener to re-fire on tab focus. Default: true */
  runOnFocus?: boolean;
}

/**
 * Runs `callback` on a fixed interval and optionally when the tab regains focus.
 *
 * The callback ref is always kept up-to-date, so the callback can change without
 * restarting the interval.
 */
export function usePolling(
  callback: () => void,
  intervalMs: number,
  options?: UsePollingOptions,
): void {
  const {
    enabled = true,
    minFocusGapMs = 0,
    runImmediately = true,
    runOnFocus = true,
  } = options ?? {};

  const cbRef = useRef(callback);
  cbRef.current = callback;

  const lastRanRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const run = () => {
      lastRanRef.current = Date.now();
      cbRef.current();
    };

    if (runImmediately) run();

    const timer = setInterval(run, intervalMs);

    if (!runOnFocus) {
      return () => clearInterval(timer);
    }

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      if (minFocusGapMs > 0 && Date.now() - lastRanRef.current < minFocusGapMs) return;
      run();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, intervalMs, minFocusGapMs, runImmediately, runOnFocus]);
}
