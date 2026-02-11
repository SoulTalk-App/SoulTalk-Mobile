import SecureStorage from '../utils/SecureStorage';
import * as LocalAuthentication from 'expo-local-authentication';
import { AuthRequest, AuthRequestConfig, AuthSessionResult } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import axios, { AxiosResponse } from 'axios';

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
  email_verified: boolean;
  providers: string[];  // ['google', 'facebook', 'email']
}

interface LinkedAccount {
  provider: string;
  provider_email: string;
  linked_at: string;
}

class AuthService {
  private keycloakConfig: KeycloakConfig;
  private apiConfig: ApiConfig;
  private axiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{ resolve: Function; reject: Function }> = [];

  constructor() {
    this.keycloakConfig = Constants.expoConfig?.extra?.keycloakConfig || {
      url: 'http://localhost:8080',
      realm: 'soultalk',
      clientId: 'soultalk-mobile'
    };

    this.apiConfig = Constants.expoConfig?.extra?.apiConfig || {
      baseUrl: 'http://localhost:8000/api'
    };

    this.axiosInstance = axios.create({
      baseURL: this.apiConfig.baseUrl,
      timeout: 10000,
    });

    // Add request interceptor to include auth token
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        const token = await this.getStoredAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle token refresh
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // If already refreshing, queue the request
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(token => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.axiosInstance.request(originalRequest);
            }).catch(err => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshed = await this.refreshTokens();
            if (refreshed) {
              const token = await this.getStoredAccessToken();
              // Process failed queue
              this.failedQueue.forEach(({ resolve }) => resolve(token));
              this.failedQueue = [];
              
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.axiosInstance.request(originalRequest);
            } else {
              // Refresh failed, reject all queued requests and logout
              this.failedQueue.forEach(({ reject }) => reject(error));
              this.failedQueue = [];
              await this.clearStoredTokens();
              return Promise.reject(error);
            }
          } catch (refreshError) {
            this.failedQueue.forEach(({ reject }) => reject(refreshError));
            this.failedQueue = [];
            await this.clearStoredTokens();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }
        
        return Promise.reject(error);
      }
    );
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
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  }

  async register(userData: UserRegistration): Promise<{ message: string; user_id: string }> {
    try {
      const response = await this.axiosInstance.post('/auth/register', userData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Registration failed');
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

  async refreshTokens(): Promise<boolean> {
    try {
      const refreshToken = await this.getStoredRefreshToken();
      if (!refreshToken) {
        return false;
      }

      const response: AxiosResponse<TokenResponse> = await this.axiosInstance.post('/auth/refresh', {
        refresh_token: refreshToken
      });

      const tokenData = response.data;
      await this.storeTokens(tokenData.access_token, tokenData.refresh_token);
      
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  async getCurrentUser(): Promise<UserInfo> {
    try {
      const response: AxiosResponse<UserInfo> = await this.axiosInstance.get('/auth/me');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to get user info');
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      await this.axiosInstance.post('/auth/reset-password', { email });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Password reset failed');
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

  // Social Auth Methods
  async loginWithGoogle(idToken: string): Promise<TokenResponse> {
    try {
      const response: AxiosResponse<TokenResponse> = await this.axiosInstance.post('/auth/google', {
        id_token: idToken
      });

      const tokenData = response.data;
      await this.storeTokens(tokenData.access_token, tokenData.refresh_token);

      return tokenData;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Google login failed');
    }
  }

  async loginWithFacebook(accessToken: string): Promise<TokenResponse> {
    try {
      const response: AxiosResponse<TokenResponse> = await this.axiosInstance.post('/auth/facebook', {
        id_token: accessToken
      });

      const tokenData = response.data;
      await this.storeTokens(tokenData.access_token, tokenData.refresh_token);

      return tokenData;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Facebook login failed');
    }
  }

  async linkGoogleAccount(idToken: string): Promise<{ message: string }> {
    try {
      const response = await this.axiosInstance.post('/auth/link/google', {
        id_token: idToken
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to link Google account');
    }
  }

  async linkFacebookAccount(accessToken: string): Promise<{ message: string }> {
    try {
      const response = await this.axiosInstance.post('/auth/link/facebook', {
        id_token: accessToken
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to link Facebook account');
    }
  }

  async unlinkProvider(provider: 'google' | 'facebook'): Promise<{ message: string }> {
    try {
      const response = await this.axiosInstance.delete(`/auth/link/${provider}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || `Failed to unlink ${provider} account`);
    }
  }

  async getLinkedAccounts(): Promise<LinkedAccount[]> {
    try {
      const response = await this.axiosInstance.get('/auth/linked-accounts');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to get linked accounts');
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
      throw new Error(error.response?.data?.detail || 'Email verification failed');
    }
  }

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    try {
      const response = await this.axiosInstance.post('/auth/resend-verification', { email });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to resend verification email');
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
      throw new Error(error.response?.data?.detail || 'Password reset failed');
    }
  }

  async setPassword(password: string): Promise<{ message: string }> {
    try {
      const response = await this.axiosInstance.post('/auth/set-password', { password });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to set password');
    }
  }

  // Logout all devices
  async logoutAllDevices(): Promise<{ message: string }> {
    try {
      const response = await this.axiosInstance.post('/auth/logout-all');
      await this.clearStoredTokens();
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to logout from all devices');
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