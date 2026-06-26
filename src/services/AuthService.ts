import SecureStorage from '../utils/SecureStorage';
import * as LocalAuthentication from 'expo-local-authentication';
import { AuthRequest, AuthRequestConfig, AuthSessionResult } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import axios, { AxiosResponse } from 'axios';
import { installAuthInterceptors, refreshAccessToken } from '../utils/authClient';
import { normalizeError } from '../utils/normalizeError';

WebBrowser.maybeCompleteAuthSession();

interface KeycloakConfig {
  url: string;
  realm: string;
  clientId: string;
}

interface ApiConfig {
  baseUrl: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface UserRegistration {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  // so-byw: IANA timezone (e.g. "Asia/Kolkata"). Optional on the wire;
  // we always send it so the user row has it from row-zero.
  timezone?: string;
  // so-8nem: Apple 5.1.1(v) — replaced required date_of_birth with an 18+
  // affirmation checkbox. BE accepts is_18_plus (boolean); false blocks with
  // the neutral under-18 message. country_code is ISO 3166-1 alpha-2.
  is_18_plus: boolean;
  country_code: string;
}

interface UserLogin {
  email: string;
  password: string;
}

interface UserInfo {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  display_first_name?: string | null;
  display_name?: string | null;
  username?: string | null;
  bio?: string | null;
  pronoun?: string | null;
  country_code?: string | null;
  // so-byw: IANA timezone string or null when never set (BE falls back to UTC).
  timezone?: string | null;
  email_verified: boolean;
  providers: string[];  // ['google', 'facebook', 'email']
}

interface ProfileUpdate {
  first_name?: string;
  last_name?: string;
  display_first_name?: string | null;
  display_name?: string | null;
  username?: string | null;
  bio?: string | null;
  pronoun?: string | null;
  country_code?: string | null;
  // so-byw: empty string "" or null both clear back to NULL on the BE.
  timezone?: string | null;
}

interface LinkedAccount {
  provider: string;
  provider_email: string;
  linked_at: string;
}

// so-por9: Apple 5.1.1(i) — explicit in-app AI-data-sharing consent.
// Contract from so-mc2k. GET /auth/ai-consent-status returns current status;
// POST /auth/ai-consent records consent idempotently.
// Mirrors the so-cywf TermsStatus shape (acceptance_required → consent_required).
interface AiConsentStatus {
  consent_required: boolean;
  current_version: number;
}

// so-cywf / so-fqgr contract: server-authoritative terms-of-service consent.
// terms_version is the user's last-accepted version (0 = never accepted);
// trust acceptance_required directly (no client-side version comparison).
interface TermsStatus {
  terms_version: number;
  current_version: number;
  acceptance_required: boolean;
  terms_accepted_at: string | null;
}

// so-piu2: the BE social age gate (so-4cvq) replies to a NEW social user with
// no age confirmation with { detail: { code: 'dob_required' } }. After so-e0aw
// the BE prefers is_18_plus; DobRequiredError is kept as a transition-period
// fallback for LoginScreen's new-social-user path.
export class DobRequiredError extends Error {
  constructor() {
    super('dob_required');
    this.name = 'DobRequiredError';
  }
}

// Shared error mapping for the social endpoints. dob_required -> typed error;
// otherwise preserve the raw BE detail string (so isUnder18Error still matches
// the neutral under-18 copy, same as the email path) and fall back to
// normalizeError for everything else.
const mapSocialAuthError = (error: any): Error => {
  const detail = error?.response?.data?.detail;
  if (detail && typeof detail === 'object' && detail.code === 'dob_required') {
    return new DobRequiredError();
  }
  if (typeof detail === 'string') return new Error(detail);
  return new Error(normalizeError(error));
};

class AuthService {
  private keycloakConfig: KeycloakConfig;
  private apiConfig: ApiConfig;
  private axiosInstance;

  constructor() {
    this.keycloakConfig = Constants.expoConfig?.extra?.keycloakConfig || {
      url: 'https://soultalkapp.com',
      realm: 'soultalk',
      clientId: 'soultalk-mobile'
    };

    this.apiConfig = Constants.expoConfig?.extra?.apiConfig || {
      baseUrl: 'https://soultalkapp.com/api'
    };

    this.axiosInstance = axios.create({
      baseURL: this.apiConfig.baseUrl,
      timeout: 10000,
    });

    // so-605p: shared single-flight refresh — every authed axios client in
    // the app (and the WS reconnect) coalesces onto one /auth/refresh round-
    // trip. AuthService previously kept its own per-instance mutex; that
    // protected concurrent calls on this client but didn't help JournalService
    // et al. when they all 401'd at cold-app-open.
    installAuthInterceptors(this.axiosInstance);
  }

  // Password grant flow (as requested)
  async login(email: string, password: string): Promise<TokenResponse> {
    try {
      const response: AxiosResponse<TokenResponse> = await this.axiosInstance.post('/auth/login', {
        email,
        password
      });

      const tokenData = response.data;
      
      // Store tokens securely
      await this.storeTokens(tokenData.access_token, tokenData.refresh_token);
      
      return tokenData;
    } catch (error: any) {
      throw new Error(normalizeError(error));
    }
  }

  async register(userData: UserRegistration): Promise<{ message: string; user_id: string }> {
    try {
      const response = await this.axiosInstance.post('/auth/register', userData);
      return response.data;
    } catch (error: any) {
      throw new Error(normalizeError(error));
    }
  }

  async logout(): Promise<void> {
    try {
      const refreshToken = await this.getStoredRefreshToken();
      if (refreshToken) {
        await this.axiosInstance.post('/auth/logout', {
          refresh_token: refreshToken
        });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Clear stored tokens regardless of API call success
      await this.clearStoredTokens();
    }
  }

  async deleteAccount(): Promise<void> {
    try {
      await this.axiosInstance.delete('/auth/me');
      await this.clearStoredTokens();
    } catch (error: any) {
      throw new Error(normalizeError(error));
    }
  }

  // so-sjua / so-ruvl: CCPA data-portability. Authenticated POST that triggers
  // a background export job; the backend bundles all user-owned data, uploads
  // it, and emails a time-limited secure download link. The call returns once
  // the job is *queued* (not when the file is ready).
  //
  // so-ehk7: path confirmed against so-ruvl — the route is POST /api/data-export
  // and the axios baseURL already ends in /api, so this must be '/data-export'
  // (the earlier provisional '/privacy/export' 404'd).
  async requestDataExport(): Promise<void> {
    try {
      await this.axiosInstance.post('/data-export');
    } catch (error: any) {
      throw new Error(normalizeError(error));
    }
  }

  async refreshTokens(): Promise<boolean> {
    // so-605p: delegate to the shared single-flight helper. Concurrent
    // refreshTokens() calls (e.g. from AuthContext app-resume + an
    // interceptor) coalesce onto one network round-trip.
    const newToken = await refreshAccessToken();
    return newToken !== null;
  }

  async getCurrentUser(): Promise<UserInfo> {
    try {
      const response: AxiosResponse<UserInfo> = await this.axiosInstance.get('/auth/me');
      return response.data;
    } catch (error: any) {
      throw new Error(normalizeError(error));
    }
  }

  async updateProfile(data: ProfileUpdate): Promise<UserInfo> {
    try {
      const response: AxiosResponse<UserInfo> = await this.axiosInstance.put('/auth/me', data);
      return response.data;
    } catch (error: any) {
      throw new Error(normalizeError(error));
    }
  }

  // so-cywf / so-fqgr: terms-of-service consent (proof-of-consent on the server).
  // Flow: getTermsStatus() first to read current_version + acceptance_required;
  // if required, prompt, then acceptTerms(current_version). Never hardcode the
  // version — always echo current_version from getTermsStatus().
  async getTermsStatus(): Promise<TermsStatus> {
    try {
      const response: AxiosResponse<TermsStatus> =
        await this.axiosInstance.get('/auth/terms-status');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to get terms status');
    }
  }

  // version MUST equal the server's current_version (from getTermsStatus) — a
  // mismatch returns 4xx StaleTermsVersionError. accepted_at is the optional
  // device timestamp (ISO-8601); the server records an immutable audit row.
  async acceptTerms(version: number, acceptedAt?: string): Promise<TermsStatus> {
    try {
      const response: AxiosResponse<TermsStatus> =
        await this.axiosInstance.post('/auth/terms-accept', {
          version,
          accepted_at: acceptedAt ?? null,
        });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to record terms acceptance');
    }
  }

  // so-por9: AI-data-sharing consent gate (Apple 5.1.1(i)).
  // GET /auth/ai-consent-status — returns the user's current consent status.
  async getAiConsentStatus(): Promise<AiConsentStatus> {
    try {
      const response: AxiosResponse<AiConsentStatus> =
        await this.axiosInstance.get('/auth/ai-consent-status');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to get AI consent status');
    }
  }

  // so-por9: POST /auth/ai-consent — idempotent; records consent at
  // current_version echoed from getAiConsentStatus(). Always pass the
  // server's current_version (never hardcode) — a version bump would 409.
  async recordAiConsent(version: number): Promise<void> {
    try {
      await this.axiosInstance.post('/auth/ai-consent', { version });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to record AI consent');
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      await this.axiosInstance.post('/auth/reset-password', { email });
    } catch (error: any) {
      throw new Error(normalizeError(error));
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await this.axiosInstance.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
    } catch (error: any) {
      throw new Error(normalizeError(error));
    }
  }

  async verifyToken(): Promise<boolean> {
    try {
      await this.axiosInstance.get('/auth/verify-token');
      return true;
    } catch (error) {
      return false;
    }
  }

  // so-opaq: route check-username through the shared axiosInstance so it
  // gets the auth interceptors (single-flight refresh) instead of a raw
  // fetch that would 401 on an expired access token.
  async checkUsernameAvailability(username: string): Promise<{ available: boolean }> {
    const response: AxiosResponse<{ available: boolean }> =
      await this.axiosInstance.get('/auth/check-username', { params: { username } });
    return response.data;
  }

  // Social Auth Methods
  async loginWithGoogle(idToken: string, is18Plus?: boolean): Promise<TokenResponse> {
    try {
      const body: { id_token: string; is_18_plus?: boolean } = { id_token: idToken };
      if (is18Plus) body.is_18_plus = is18Plus; // so-8nem: send age affirmation
      const response: AxiosResponse<TokenResponse> = await this.axiosInstance.post('/auth/google', body);

      const tokenData = response.data;
      await this.storeTokens(tokenData.access_token, tokenData.refresh_token);

      return tokenData;
    } catch (error: any) {
      throw mapSocialAuthError(error);
    }
  }

  async loginWithApple(
    identityToken: string,
    fullName?: string | null,
    is18Plus?: boolean,
  ): Promise<TokenResponse> {
    try {
      const body: { identity_token: string; full_name: string | null; is_18_plus?: boolean } = {
        identity_token: identityToken,
        full_name: fullName ?? null,
      };
      if (is18Plus) body.is_18_plus = is18Plus; // so-8nem: send age affirmation
      const response: AxiosResponse<TokenResponse> = await this.axiosInstance.post('/auth/apple', body);

      const tokenData = response.data;
      await this.storeTokens(tokenData.access_token, tokenData.refresh_token);

      return tokenData;
    } catch (error: any) {
      throw mapSocialAuthError(error);
    }
  }

  async loginWithFacebook(accessToken: string, is18Plus?: boolean): Promise<TokenResponse> {
    try {
      const body: { id_token: string; is_18_plus?: boolean } = { id_token: accessToken };
      if (is18Plus) body.is_18_plus = is18Plus; // so-8nem: send age affirmation
      const response: AxiosResponse<TokenResponse> = await this.axiosInstance.post('/auth/facebook', body);

      const tokenData = response.data;
      await this.storeTokens(tokenData.access_token, tokenData.refresh_token);

      return tokenData;
    } catch (error: any) {
      throw mapSocialAuthError(error);
    }
  }

  async linkGoogleAccount(idToken: string): Promise<{ message: string }> {
    try {
      const response = await this.axiosInstance.post('/auth/link/google', {
        id_token: idToken
      });
      return response.data;
    } catch (error: any) {
      throw new Error(normalizeError(error));
    }
  }

  async linkFacebookAccount(accessToken: string): Promise<{ message: string }> {
    try {
      const response = await this.axiosInstance.post('/auth/link/facebook', {
        id_token: accessToken
      });
      return response.data;
    } catch (error: any) {
      throw new Error(normalizeError(error));
    }
  }

  async unlinkProvider(provider: 'google' | 'facebook'): Promise<{ message: string }> {
    try {
      const response = await this.axiosInstance.delete(`/auth/link/${provider}`);
      return response.data;
    } catch (error: any) {
      throw new Error(normalizeError(error));
    }
  }

  async getLinkedAccounts(): Promise<LinkedAccount[]> {
    try {
      const response = await this.axiosInstance.get('/auth/linked-accounts');
      return response.data;
    } catch (error: any) {
      throw new Error(normalizeError(error));
    }
  }

  // Email Verification Methods
  async verifyOTP(email: string, code: string): Promise<TokenResponse> {
    try {
      const response: AxiosResponse<TokenResponse> = await this.axiosInstance.post('/auth/verify-email', {
        email,
        code
      });
      const tokenData = response.data;
      await this.storeTokens(tokenData.access_token, tokenData.refresh_token);
      return tokenData;
    } catch (error: any) {
      throw new Error(normalizeError(error));
    }
  }

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    try {
      const response = await this.axiosInstance.post('/auth/resend-verification', { email });
      return response.data;
    } catch (error: any) {
      throw new Error(normalizeError(error));
    }
  }

  // Password Reset Methods
  async confirmPasswordReset(token: string, newPassword: string): Promise<{ message: string }> {
    try {
      const response = await this.axiosInstance.post('/auth/reset-password/confirm', {
        token,
        new_password: newPassword
      });
      return response.data;
    } catch (error: any) {
      throw new Error(normalizeError(error));
    }
  }

  async setPassword(password: string): Promise<{ message: string }> {
    try {
      const response = await this.axiosInstance.post('/auth/set-password', { password });
      return response.data;
    } catch (error: any) {
      throw new Error(normalizeError(error));
    }
  }

  // Logout all devices
  async logoutAllDevices(): Promise<{ message: string }> {
    try {
      const response = await this.axiosInstance.post('/auth/logout-all');
      await this.clearStoredTokens();
      return response.data;
    } catch (error: any) {
      throw new Error(normalizeError(error));
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const accessToken = await this.getStoredAccessToken();
    if (!accessToken) {
      return false;
    }

    // Verify token is still valid
    return await this.verifyToken();
  }

  // Biometric authentication
  async isBiometricAvailable(): Promise<boolean> {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return compatible && enrolled;
  }

  async authenticateWithBiometrics(): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate with SoulTalk',
        fallbackLabel: 'Use password instead',
      });
      return result.success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  }

  async enableBiometricLogin(): Promise<void> {
    const available = await this.isBiometricAvailable();
    if (!available) {
      throw new Error('Biometric authentication not available');
    }

    await SecureStorage.setItem('biometric_enabled', 'true');
  }

  async disableBiometricLogin(): Promise<void> {
    await SecureStorage.deleteItem('biometric_enabled');
  }

  async isBiometricEnabled(): Promise<boolean> {
    const enabled = await SecureStorage.getItem('biometric_enabled');
    return enabled === 'true';
  }

  async loginWithBiometrics(): Promise<boolean> {
    const enabled = await this.isBiometricEnabled();
    if (!enabled) {
      return false;
    }

    const authenticated = await this.authenticateWithBiometrics();
    if (!authenticated) {
      return false;
    }

    // Check if we have valid tokens
    return await this.isAuthenticated();
  }

  // Token storage methods
  private async storeTokens(accessToken: string, refreshToken: string): Promise<void> {
    await SecureStorage.setItem('access_token', accessToken);
    await SecureStorage.setItem('refresh_token', refreshToken);
  }

  private async getStoredAccessToken(): Promise<string | null> {
    return await SecureStorage.getItem('access_token');
  }

  private async getStoredRefreshToken(): Promise<string | null> {
    return await SecureStorage.getItem('refresh_token');
  }

  private async clearStoredTokens(): Promise<void> {
    await SecureStorage.deleteItem('access_token');
    await SecureStorage.deleteItem('refresh_token');
  }
}

export default new AuthService();