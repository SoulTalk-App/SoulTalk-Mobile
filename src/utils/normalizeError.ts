/**
 * so-fntk: centralized error normalization for SoulTalk-Mobile.
 *
 * Goal (Overseer direction): every user-facing failure shows a friendly
 * message — NEVER a raw axios stack ("Network Error", "timeout of 10000ms
 * exceeded"), status code, stack trace, or unflattened Pydantic detail
 * array. Caller picks the surface (Alert, inline copy, toast); this util
 * supplies the message body.
 *
 * Path is stable at src/utils/normalizeError — so-73pj (rn_features) will
 * import the same module for the Shifts/Signals surfaces.
 *
 * Order of checks matters (matches the lead spec hq-wisp-feje7):
 *   1. Pydantic array detail.
 *   2. BE string detail (so-4ax7 keeps these user-safe).
 *   3. Status-based friendly copy.
 *   4. Network / timeout heuristics.
 *   5. Default fallback.
 *
 * We do NOT return raw err.message or String(err) — but a pre-normalized
 * Error.message (e.g. thrown by AuthService.login which already routed
 * through this util) passes through cleanly because the upstream caller
 * built the message via these same paths.
 */

const DEFAULT_FALLBACK = 'Something went wrong. Please try again.';

const NETWORK_FALLBACK =
  'Connection problem. Check your internet and try again.';

const STATUS_COPY: Record<number, string> = {
  401: 'Your session has expired. Please log in again.',
  403: "You don't have permission to do that.",
  404: "We couldn't find that.",
  // 409 prefers BE detail when present; this is the fallback the wrapper
  // function reaches for if extractDetail returned null.
  409: 'That action is no longer valid — please refresh.',
  429: "You're doing that a bit too fast. Please wait a moment.",
};

const FOUR_XX_FALLBACK = 'Something went wrong. Please try again.';
const FIVE_XX_FALLBACK = 'Something went wrong on our end. Please try again.';

const isLikelyNetworkOrTimeout = (
  hasResponse: boolean,
  code: string | undefined,
  msg: string | undefined,
): boolean => {
  if (!hasResponse) return true; // axios sets response only when one came back
  if (code === 'ECONNABORTED' || code === 'ERR_NETWORK') return true;
  if (!msg) return false;
  const m = msg.toLowerCase();
  return (
    m.includes('network') ||
    m.includes('timeout') ||
    m.includes('failed to fetch') ||
    m.includes('network request failed')
  );
};

const looksLikeRawAxios = (msg: string): boolean => {
  if (/^request failed with status code \d+$/i.test(msg.trim())) return true;
  if (msg === '[object Object]') return true;
  // Bare axios network/timeout: covered by the network branch above; this
  // catches the case where err.message slips through with a raw stack.
  if (/^timeout of \d+ms exceeded$/i.test(msg.trim())) return true;
  return false;
};

const extractDetail = (data: any): string | null => {
  if (data == null) return null;
  if (typeof data === 'string') {
    const t = data.trim();
    if (!t) return null;
    // so-n30r: reject HTML/gateway bodies (nginx 502/503/504 pages).
    const lower = t.toLowerCase();
    if (t.startsWith('<') || lower.includes('<html') || lower.includes('<!doctype')) return null;
    // so-n30r: real BE user messages are short; reject suspiciously long strings.
    if (t.length > 200) return null;
    return t;
  }
  if (typeof data !== 'object') return null;
  const detail = (data as any).detail;
  if (detail == null) return null;

  // Pydantic 422 detail array.
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((d: any) => (d && typeof d === 'object' ? d?.msg : d))
      .filter(
        (m: unknown): m is string =>
          typeof m === 'string' && m.trim().length > 0,
      );
    return msgs.length > 0 ? msgs.join('; ') : null;
  }

  // BE string detail — preserved verbatim because the BE keeps these
  // user-safe (so-4ax7 hardens this contract).
  if (typeof detail === 'string') {
    return detail.trim() || null;
  }

  if (typeof detail === 'object' && typeof (detail as any).message === 'string') {
    return ((detail as any).message as string).trim() || null;
  }

  return null;
};

export const normalizeError = (err: unknown): string => {
  if (err == null) return DEFAULT_FALLBACK;

  if (typeof err === 'string') {
    const t = err.trim();
    if (!t || looksLikeRawAxios(t)) return DEFAULT_FALLBACK;
    return t;
  }

  if (typeof err !== 'object') return DEFAULT_FALLBACK;

  const e = err as any;
  const response = e?.response;
  const data = response?.data;
  const status: number | undefined =
    typeof response?.status === 'number' ? response.status : undefined;
  const code: string | undefined =
    typeof e?.code === 'string' ? e.code : undefined;
  const message: string | undefined =
    typeof e?.message === 'string' ? e.message : undefined;

  // 3a. so-n30r: gateway / server errors (5xx) — ALWAYS use the safe
  // fallback, checked BEFORE extractDetail. Nginx 502/503/504 bodies are
  // HTML/plaintext and must NEVER reach the UI, so we short-circuit here
  // before any body extraction runs.
  if (typeof status === 'number' && status >= 500) {
    return FIVE_XX_FALLBACK;
  }

  // 1 + 2: BE-provided detail (Pydantic array or string).
  // Only reached for non-5xx responses whose body may carry a user-safe
  // FastAPI detail message (so-4ax7 hardens the BE contract for those).
  const detailMsg = extractDetail(data);
  if (detailMsg) return detailMsg;

  // 3b. Status-based friendly copy for known codes and 4xx fallback.
  if (typeof status === 'number') {
    const known = STATUS_COPY[status];
    if (known) return known;
    if (status >= 400) return FOUR_XX_FALLBACK;
  }

  // 4. Network / timeout.
  if (isLikelyNetworkOrTimeout(!!response, code, message)) {
    return NETWORK_FALLBACK;
  }

  // 5. A pre-normalized upstream Error.message — let it through ONLY when
  //    it doesn't look like a raw axios stack line. (AuthService now
  //    throws strings that already passed through normalizeError, so this
  //    is the path that surfaces them to screens.)
  if (message) {
    const t = message.trim();
    if (t && !looksLikeRawAxios(t)) return t;
  }

  return DEFAULT_FALLBACK;
};

// so-1zn0: dropped the Alert.alert-backed showError() helper that used
// to live here. The user-facing presentation surface is now
// useAppAlert().showError from src/components/AppAlertProvider — it
// runs the same normalizeError under the hood and renders inside the
// themed in-app alert instead of iOS's gray system modal. Importers
// of the legacy helper switched to useAppAlert in the same change.

export default normalizeError;
