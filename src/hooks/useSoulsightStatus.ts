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

/**
 * so-9t3d systemic fix: shared resumable status-polling hook used by both the
 * list "forming" card and the Detail screen.
 *
 * Polls GET /{id}/status every `intervalMs` ms so generation progress survives
 * nav-away and app restarts (M-3). Calling /status is also the stale-heal —
 * the BE heals wedged rows when polled (no separate endpoint needed).
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
      setResult({
        status: (s.status || '').toLowerCase(),
        isFinal: s.final ?? false,
        retriesRemaining: s.retries_remaining ?? null,
        errorMessage: s.error_message ?? null,
      });
    } catch {
      // Polling errors are transient — keep last known status, retry next tick.
    }
  }, [id, enabled]);

  useEffect(() => {
    if (!id || !enabled) {
      setResult(INITIAL);
      return;
    }
    // Poll immediately on mount / id change so the UI responds right away
    // rather than waiting for the first interval tick.
    poll();
    const timer = setInterval(poll, intervalMs);
    return () => clearInterval(timer);
  }, [id, enabled, intervalMs, poll]);

  return result;
}
