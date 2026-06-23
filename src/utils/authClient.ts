import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import SecureStorage from './SecureStorage';
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
 */

const getApiBaseUrl = (): string =>
  Constants.expoConfig?.extra?.apiConfig?.baseUrl || 'https://soultalkapp.com/api';

// Module-level single-flight latch. Null when no refresh is in flight.
// While non-null, every caller awaits the same promise — guaranteeing one
// network call, one SecureStorage write, and one resolved access token.
let inflightRefresh: Promise<string | null> | null = null;

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
 * not possible (no stored refresh token, or the call failed).
 *
 * On failure, stored tokens are NOT cleared here — callers (interceptors,
 * AuthService) decide whether the failure is terminal (auth error → clear
 * and route to login) or transient (network blip → keep tokens, retry later).
 */
export const refreshAccessToken = (): Promise<string | null> => {
  if (inflightRefresh) return inflightRefresh;

  inflightRefresh = (async () => {
    try {
      const refreshToken = await SecureStorage.getItem('refresh_token');
      if (!refreshToken) return null;

      // Use a bare axios call (no interceptors) — this request must not
      // be subject to the 401-retry interceptor it would otherwise trigger.
      const resp = await axios.post(`${getApiBaseUrl()}/auth/refresh`, {
        refresh_token: refreshToken,
      });
      const { access_token, refresh_token: newRefresh } = resp.data;

      await SecureStorage.setItem('access_token', access_token);
      await SecureStorage.setItem('refresh_token', newRefresh);

      return access_token as string;
    } catch (err) {
      // Best-effort: log and return null. Callers decide what to do.
      // eslint-disable-next-line no-console
      console.error('Token refresh failed:', err);
      return null;
    } finally {
      // Always release the latch so the NEXT 401 can attempt a fresh refresh.
      inflightRefresh = null;
    }
  })();

  return inflightRefresh;
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
        if (!newToken) return Promise.reject(error);

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
      if (
        error?.response?.status === 402 &&
        error?.response?.data?.code === 'subscription_required' &&
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
