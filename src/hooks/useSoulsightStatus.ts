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

// so-v22au: normalize BE error_message before it reaches the UI.
// The BE today sets user-grade constant strings in error_message, but that
// is an implementation detail — any future BE path that writes raw exception
// text into the field would silently surface it to the user via showAlert
// (regression channel identified in so-sjgfs PII audit).
// Fix: whitelist messages that are verified user-grade; everything else maps
// to a safe generic. Re-audit SOULSIGHT_ERROR_PASSTHROUGH whenever the BE gains
// an error_message writer.
const SOULSIGHT_ERROR_GENERIC = 'Generation failed. Please try again.';
// Verified user-grade BE error_message constants. THREE backend files write
// soulsight.error_message, so audit all three — not just the service:
//   app/services/ai/soulsight_service.py — SOULSIGHT_ERROR_STALE,
//       SOULSIGHT_ERROR_GENERIC, "AI data-sharing consent required"
//   app/api/soulsight.py                 — SOULSIGHT_ERROR_STALE
//   app/workers/ai_pipeline.py           — SOULSIGHT_ERROR_GENERIC
// The three strings below are the complete set those writers produce, byte-verified
// against backend main AND the held release pin. Any string NOT in this set falls
// back to SOULSIGHT_ERROR_GENERIC — string drift on the BE side stays safe.
const SOULSIGHT_ERROR_PASSTHROUGH = new Set<string>([
  'SoulSight generation failed. Please try again.',
  'SoulSight generation timed out. Please try again.',
  'AI data-sharing consent required',
]);
function normalizeStatusError(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (SOULSIGHT_ERROR_PASSTHROUGH.has(raw)) return raw;
  return SOULSIGHT_ERROR_GENERIC;
}

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
        errorMessage: normalizeStatusError(s.error_message),
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
    // so-ui3zp (P1 fix): per-effect-run cancellation flag. mountedRef alone is
    // component-scoped (stays true on dep changes, not just on unmount), so a
    // dep change (e.g. id change) without unmount left the in-flight poll free
    // to reschedule after cleanup ran — orphan chain polling the OLD id forever.
    // `cancelled` is closure-scoped to each effect run; setting it true in the
    // cleanup stops the old tick even when mountedRef is still true. `timer` is
    // also declared outside tick() so the cleanup can always clearTimeout the
    // handle, even when the previous run had already fired.
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function tick() {
      await poll();
      if (cancelled || !mountedRef.current) return;
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
    return () => { cancelled = true; clearTimeout(timer); };
  }, [id, enabled, intervalMs, poll]);

  return result;
}
