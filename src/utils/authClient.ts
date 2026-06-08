import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import SecureStorage from './SecureStorage';

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
        | (InternalAxiosRequestConfig & { _retry?: boolean })
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

      return Promise.reject(error);
    },
  );
};
