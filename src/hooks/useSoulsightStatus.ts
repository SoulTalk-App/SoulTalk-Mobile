import { useCallback, useEffect, useRef, useState } from 'react';
import SoulSightService from '../services/SoulSightService';

export interface SoulsightStatusResult {
  /** Lowercase raw status string from the BE. */
  status: string;
  /**
   * so-9t3d M-2b: true only when the BE marks this attempt terminal (no more
   * arq retries). Only show "Generation Failed" UI when this is true.
   */
  isFinal: boolean;
  retriesRemaining: number | null;
  errorMessage: string | null;
}

const INITIAL: SoulsightStatusResult = {
  status: 'processing',
  isFinal: false,
  retriesRemaining: null,
  errorMessage: null,
};

// so-tn9x MI-1: cap backoff so a persistent offline state never polls more
// than once per minute.
const MAX_BACKOFF_MS = 60_000;

/**
 * so-9t3d systemic fix: shared resumable status-polling hook used by both the
 * list "forming" card and the Detail screen.
 *
 * Polls GET /{id}/status every `intervalMs` ms so generation progress survives
 * nav-away and app restarts (M-3). Calling /status is also the stale-heal —
 * the BE heals wedged rows when polled (no separate endpoint needed).
 *
 * so-tn9x MI-1: consecutive errors trigger capped exponential backoff so an
 * offline/slow network doesn't hammer /status at the base interval rate.
 * Formula: intervalMs * 2^(errors-1), capped at MAX_BACKOFF_MS. First error
 * retries at the base rate; backoff starts from the second error onward.
 *
 * Passing `id = null` disables polling and returns INITIAL state.
 */
export function useSoulsightStatus(
  id: string | null | undefined,
  {
    intervalMs = 10000,
    enabled = true,
  }: { intervalMs?: number; enabled?: boolean } = {},
): SoulsightStatusResult {
  const [result, setResult] = useState<SoulsightStatusResult>(INITIAL);
  const mountedRef = useRef(true);
  // so-tn9x MI-1: consecutive error counter drives backoff delay.
  const consecutiveErrorsRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const poll = useCallback(async () => {
    if (!id || !enabled) return;
    try {
      const s = await SoulSightService.getStatus(id);
      if (!mountedRef.current) return;
      consecutiveErrorsRef.current = 0;
      setResult({
        status: (s.status || '').toLowerCase(),
        isFinal: s.final ?? false,
        retriesRemaining: s.retries_remaining ?? null,
        errorMessage: s.error_message ?? null,
      });
    } catch {
      if (!mountedRef.current) return;
      // so-tn9x MI-1: count errors; scheduler reads this to compute backoff.
      consecutiveErrorsRef.current += 1;
    }
  }, [id, enabled]);

  useEffect(() => {
    if (!id || !enabled) {
      setResult(INITIAL);
      return;
    }
    // Reset backoff whenever polling context (id / enabled) changes.
    consecutiveErrorsRef.current = 0;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      await poll();
      if (!mountedRef.current) return;
      // so-tn9x MI-1: exponential backoff on consecutive errors.
      const errors = consecutiveErrorsRef.current;
      const delay =
        errors > 0
          ? Math.min(intervalMs * Math.pow(2, errors - 1), MAX_BACKOFF_MS)
          : intervalMs;
      timer = setTimeout(tick, delay);
    }

    // Poll immediately on mount / id change so the UI responds right away
    // rather than waiting for the first interval tick.
    tick();
    return () => clearTimeout(timer);
  }, [id, enabled, intervalMs, poll]);

  return result;
}
