import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import SecureStorage from './SecureStorage';
import { logHandledError } from './logger';
import {
  presentPaywall,
  wasUnlocked,
  checkAdaptyPro,
} from '../services/paywall';

/**
 * Shared single-flight refresh-token helper + axios interceptor installer.
 *
 * so-605p: every authed axios client in the app (AuthService, JournalService,
 * PersonalityService, SoulShiftsService, SoulSightService, SoulSignalsService)
 * plus the WS reconnect path must share ONE in-flight POST /auth/refresh so
 * concurrent 401s coalesce. Cold app-open fires 5+ services in parallel; the
 * first refresh rotates the refresh_token, the rest would otherwise send the
 * now-consumed token and fail. The audit also flagged that the losers' late
 * responses could clobber SecureStorage with a stale token, risking spurious
 * forced logout. A module-level promise (single JS VM in RN) coalesces all
 * callers onto the same network round-trip and the same SecureStorage write.
 *
 * so-u0c9: extended with:
 *  - decodeJwtExp / getValidToken — WS always connects with a fresh token.
 *  - proactiveTokenRefresh — called by AuthContext on every AppState 'active'
 *    so the token is refreshed BEFORE HTTP/WS requests fire on foreground.
 *  - registerLogoutCallback — terminal refresh failures (401 from /auth/refresh
 *    or missing refresh token) call the registered logout fn to force re-login.
 *  - _suppressToast on transient failures — the response interceptor marks
 *    rejected errors as suppressed when the refresh was a network blip, so
 *    AppAlertProvider never shows "session expired" for auto-recoverable failures.
 */

const getApiBaseUrl = (): string =>
  Constants.expoConfig?.extra?.apiConfig?.baseUrl || 'https://soultalkapp.com/api';

// Module-level single-flight latch. Null when no refresh is in flight.
// While non-null, every caller awaits the same promise — guaranteeing one
// network call, one SecureStorage write, and one resolved access token.
let inflightRefresh: Promise<string | null> | null = null;

// so-u0c9: number of seconds before expiry at which we proactively refresh.
// 120 s gives a 2-minute safety window; the BE access token TTL is 15 min.
const TOKEN_REFRESH_BUFFER_SEC = 120;

/**
 * so-u0c9: decode the `exp` Unix timestamp from a JWT without a library.
 * JWT payload is the middle segment, base64url-encoded JSON. Returns null on
 * any parse error (malformed token, no exp claim).
 */
const decodeJwtExp = (token: string): number | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // base64url → standard base64: replace URL-safe chars, then pad to a
    // multiple of 4 so atob() never throws on an unpadded segment.
    // Formula: '==='.slice((len + 3) % 4) adds exactly (4 - len%4)%4 chars.
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '==='.slice((b64.length + 3) % 4);
    const json = atob(padded);
    const payload = JSON.parse(json);
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
};

/**
 * so-u0c9: module-level logout callback. AuthContext registers its `logout`
 * function here on mount so that terminal refresh failures (refresh token
 * expired / revoked → 401 from /auth/refresh) can force a re-login without
 * importing React state into this module.
 *
 * Re-entrancy guard (MAJOR-1 fix): isLogoutInFlight prevents the /auth/logout
 * POST (which goes through the auth interceptor with a now-dead token, returns
 * 401, and would re-enter this path) from triggering a second logoutCallback
 * invocation. The flag is cleared when an authenticated session is established
 * (registerLogoutCallback called with isAuthenticated=true), so the next
 * session's terminal failures are guarded correctly.
 */
let logoutCallback: (() => void) | null = null;
let isLogoutInFlight = false;

export const registerLogoutCallback = (fn: () => void, isAuthenticated: boolean): void => {
  logoutCallback = fn;
  // A new authenticated session clears the re-entrancy guard so that a
  // terminal failure in this session correctly triggers a fresh logout.
  if (isAuthenticated) {
    isLogoutInFlight = false;
  }
};

/**
 * so-fwva: post-purchase hook. The React layer registers a callback that
 * refetches /auth/me (the server is the trial-clock + access authority)
 * so the EntitlementContext immediately picks up the unlock without
 * waiting for the next natural refresh. The 402 interceptor invokes it
 * after a successful paywall unlock, before retrying the original
 * request.
 *
 * Held at module level so the interceptor doesn't import React state.
 * Null when no listener is registered (rare — only in cold-boot before
 * the EntitlementProvider mounts, where no API call has fired yet
 * anyway).
 */
type PostUnlockHook = () => Promise<void> | void;
let postUnlockHook: PostUnlockHook | null = null;

export const registerPostUnlockHook = (hook: PostUnlockHook | null): void => {
  postUnlockHook = hook;
};

/**
 * Refresh the access token, coalescing concurrent callers onto one in-flight
 * POST /auth/refresh. Returns the new access token, or null when refresh is
 * not possible.
 *
 * so-u0c9: failure handling is now split:
 *  - TERMINAL (no refresh token stored, or 401 from /auth/refresh): the
 *    registered logoutCallback is called to force re-login. Returns null.
 *  - TRANSIENT (network error, 5xx): logged and returns null without touching
 *    auth state. The caller (interceptor) marks the rejected promise with
 *    _suppressToast so the user never sees a spurious "session expired" alert.
 */
export const refreshAccessToken = (): Promise<string | null> => {
  if (inflightRefresh) return inflightRefresh;

  inflightRefresh = (async () => {
    try {
      const refreshToken = await SecureStorage.getItem('refresh_token');
      if (!refreshToken) {
        // No stored refresh token — treat as terminal, force re-login.
        // Guard: only fire once per logout sequence (isLogoutInFlight prevents
        // the /auth/logout POST from re-entering this path via the interceptor).
        if (!isLogoutInFlight) {
          isLogoutInFlight = true;
          logoutCallback?.();
        }
        return null;
      }

      // Use a bare axios call (no interceptors) — this request must not
      // be subject to the 401-retry interceptor it would otherwise trigger.
      const resp = await axios.post(`${getApiBaseUrl()}/auth/refresh`, {
        refresh_token: refreshToken,
      });
      const { access_token, refresh_token: newRefresh } = resp.data;

      await SecureStorage.setItem('access_token', access_token);
      await SecureStorage.setItem('refresh_token', newRefresh);

      return access_token as string;
    } catch (err: any) {
      if (err?.response?.status === 401) {
        // so-u0c9: refresh token itself is invalid / expired — terminal.
        // Guard: only fire once per logout sequence (same isLogoutInFlight
        // guard as the no-token path — prevents re-entry via /auth/logout 401).
        if (!isLogoutInFlight) {
          isLogoutInFlight = true;
          // eslint-disable-next-line no-console
          console.warn('[authClient] Refresh token rejected (401) — forcing logout');
          logoutCallback?.();
        }
      } else {
        // Transient (network down, 5xx, etc.) — log status/message ONLY.
        // SECURITY: never pass err or err.config — they contain the refresh_token
        // in the request body and must never reach logs or crash-reporters.
        logHandledError(
          `[authClient] Token refresh failed (transient): ${err?.response?.status} ${err?.message}`,
        );
      }
      return null;
    } finally {
      // Always release the latch so the NEXT 401 can attempt a fresh refresh.
      inflightRefresh = null;
    }
  })();

  return inflightRefresh;
};

/**
 * so-u0c9: return the stored access token if it is still valid (not expired
 * and not within TOKEN_REFRESH_BUFFER_SEC of expiry), otherwise call
 * refreshAccessToken() first and return the new token.
 *
 * Used by the WS connect() path so the socket always authenticates with a
 * fresh token — eliminating the stale-token 4001 close that previously
 * triggered a second, uncoordinated refresh.
 *
 * Callers must handle null (no stored token or refresh failed).
 */
export const getValidToken = async (): Promise<string | null> => {
  const token = await SecureStorage.getItem('access_token');
  if (!token) return null;
  const exp = decodeJwtExp(token);
  if (exp !== null) {
    const nowSec = Date.now() / 1000;
    if (nowSec >= exp - TOKEN_REFRESH_BUFFER_SEC) {
      // Expired or near-expired — refresh (coalesces if already in flight).
      return refreshAccessToken();
    }
  }
  return token;
};

/**
 * so-u0c9: proactive foreground refresh. Call on every AppState → 'active'
 * transition when authenticated. If the stored access token is expired or
 * within TOKEN_REFRESH_BUFFER_SEC of expiry, trigger refreshAccessToken()
 * now — BEFORE any HTTP requests or WS reconnects fire — so the token is
 * warm by the time callers need it.
 *
 * Fire-and-forget: callers should .catch(() => {}) since a transient
 * network failure is handled inside refreshAccessToken().
 */
export const proactiveTokenRefresh = async (): Promise<void> => {
  const token = await SecureStorage.getItem('access_token');
  if (!token) return;
  const exp = decodeJwtExp(token);
  if (exp === null) return;
  const nowSec = Date.now() / 1000;
  if (nowSec >= exp - TOKEN_REFRESH_BUFFER_SEC) {
    await refreshAccessToken();
  }
};

/**
 * Install the standard auth interceptors on an axios instance:
 *
 * - Request: attach `Authorization: Bearer <access_token>` from SecureStorage.
 * - Response: on a 401 with no prior `_retry`, await the shared refresh
 *   helper and retry the original request once with the new token. On refresh
 *   failure (null), the original error is rejected.
 *
 * Replaces the per-service inline interceptors that each shipped their own
 * non-coalesced refresh path (so-605p).
 */
export const installAuthInterceptors = (instance: AxiosInstance): void => {
  instance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const token = await SecureStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error) => {
      const originalRequest = error?.config as
        | (InternalAxiosRequestConfig & {
            _retry?: boolean;
            _paywallRetry?: boolean;
          })
        | undefined;

      if (
        error?.response?.status === 401 &&
        originalRequest &&
        !originalRequest._retry
      ) {
        originalRequest._retry = true;
        const newToken = await refreshAccessToken();
        if (!newToken) {
          // so-u0c9: null means either terminal (logoutCallback already called)
          // or transient (network blip). Either way, suppress the alert — the
          // terminal path shows a re-login screen; the transient path is silent
          // (draft is preserved via useLocalDraft, user can retry).
          const transientErr = Object.assign(
            new Error('[authClient] Token refresh failed — please try again'),
            { _suppressToast: true },
          );
          return Promise.reject(transientErr);
        }

        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return instance.request(originalRequest);
      }

      // so-fwva: HTTP 402 with code='subscription_required' is the BE
      // (so-r964) telling us the trial is over and the user isn't Pro.
      // Present the Adapty paywall as a blocking gate; on a successful
      // unlock, refetch /auth/me and retry the request once. Otherwise
      // reject so the caller surfaces nothing (the paywall WAS the
      // user feedback — no inline error).
      // so-3w4h: the BE nests the code under `detail` (access.py raises
      // detail={message, code}), so FastAPI serialises it as
      // data.detail.code — NOT data.code. Read detail.code first; keep
      // data.code as a fallback in case the shape is ever flattened.
      const subscriptionCode =
        error?.response?.data?.detail?.code ?? error?.response?.data?.code;
      // so-sh1y S-m5/AM-m4: HTTP 403 with code='subscription_required' is the
      // same premium gate as 402 but returned from already-open screens when
      // the trial expires mid-session (the nav-layer accessLocked gate only
      // updates on /auth/me refresh, so a 403 can land before the gate
      // re-evaluates). Treat it identically: present the Adapty paywall, retry
      // once on unlock. Falls through to the generic reject if the code doesn't
      // match (i.e. a real auth 403), keeping non-paywall 403 behaviour intact.
      if (
        (error?.response?.status === 402 || error?.response?.status === 403) &&
        subscriptionCode === 'subscription_required' &&
        originalRequest &&
        !originalRequest._paywallRetry
      ) {
        originalRequest._paywallRetry = true;
        const outcome = await presentPaywall();
        // Also poll Adapty's profile in case the purchase landed but
        // the webhook→/auth/me round-trip lags slightly behind the
        // local SDK state — wasUnlocked covers explicit
        // purchase/restore; checkAdaptyPro covers the lag window.
        const unlocked = wasUnlocked(outcome) || (await checkAdaptyPro());
        if (!unlocked) return Promise.reject(error);

        if (postUnlockHook) {
          try {
            await postUnlockHook();
          } catch (hookErr) {
            // Don't fail the retry just because the hook threw — log
            // and continue. /auth/me will refresh on the next natural
            // tick.
            // eslint-disable-next-line no-console
            console.warn('postUnlockHook threw:', hookErr);
          }
        }
        return instance.request(originalRequest);
      }

      return Promise.reject(error);
    },
  );
};
