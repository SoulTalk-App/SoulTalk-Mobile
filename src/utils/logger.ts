/**
 * logger.ts — dev-friendly logging helpers (so-vrud).
 *
 * logHandledError: for catch blocks that ALSO surface the failure to the user
 * (setError state, toast, alert, throw-to-caller). In dev prints to Metro
 * without triggering a LogBox red-box; in production is a no-op.
 * TODO: wire the production path to a crash/analytics service (Sentry,
 * Crashlytics, etc.) before enabling prod error reporting.
 *
 * logUnexpected: keeps console.error semantics (red-box in dev) for genuinely
 * unexpected situations — use only when the failure is NOT already surfaced to
 * the user and warrants a visible alert during development (e.g. ErrorBoundary
 * catching a component crash, a telemetry sink throwing).
 *
 * Usage:
 *   import { logHandledError } from '../utils/logger';
 *   catch (error) {
 *     logHandledError('MyScreen: fetch failed', error);
 *     setErrorState(true);  // <-- user still sees the error
 *   }
 */

export function logHandledError(context: string, error?: unknown): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[handled]', context, error);
  }
  // Production: no-op.
  // TODO: report to crash/analytics service (Sentry / Crashlytics / etc.)
}

export function logUnexpected(context: string, error?: unknown): void {
  // Keeps console.error semantics — triggers LogBox red-box in dev intentionally.
  // eslint-disable-next-line no-console
  console.error(context, error);
}
