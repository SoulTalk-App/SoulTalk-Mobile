import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import AuthService from '../services/AuthService';
import NotificationService from '../services/NotificationService';
import { getDeviceTimezone } from '../utils/timezone';
import { clearLocalDraft, purgeLegacyGlobalDraft } from '../hooks/useLocalDraft';

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
  timezone?: string | null;
  email_verified: boolean;
  providers: string[];
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
  timezone?: string | null;
}

interface LinkedAccount {
  provider: string;
  provider_email: string;
  linked_at: string;
}

interface AuthContextType {
  user: UserInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    // so-8nem: is_18_plus replaces date_of_birth (Apple 5.1.1(v) rejection).
    is_18_plus: boolean;
    country_code: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: ProfileUpdate) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  // Social auth methods
  // so-8nem: optional is18Plus replaces dateOfBirth — sent on new-social-user
  // confirmation (DobRequiredError resubmit) and on RegisterScreen (checkbox confirmed).
  loginWithGoogle: (idToken: string, is18Plus?: boolean) => Promise<void>;
  loginWithFacebook: (accessToken: string, is18Plus?: boolean) => Promise<void>;
  loginWithApple: (identityToken: string, fullName?: string | null, is18Plus?: boolean) => Promise<void>;
  // Account linking
  linkGoogleAccount: (idToken: string) => Promise<void>;
  linkFacebookAccount: (accessToken: string) => Promise<void>;
  unlinkProvider: (provider: 'google' | 'facebook') => Promise<void>;
  getLinkedAccounts: () => Promise<LinkedAccount[]>;
  // Email verification
  verifyOTP: (email: string, code: string) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
  // Password management
  confirmPasswordReset: (token: string, newPassword: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  setPassword: (password: string) => Promise<void>;
  // Logout all devices
  logoutAllDevices: () => Promise<void>;
  // Account deletion
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const initializingRef = useRef(false);

  const ensureCountryCode = useCallback(async (userInfo: UserInfo) => {
    if (!userInfo.country_code) {
      try {
        const locales = getLocales();
        const region = locales?.[0]?.regionCode;
        if (region) {
          const updated = await AuthService.updateProfile({ country_code: region });
          setUser(updated);
        }
      } catch (_e) {
        // Silent — don't block auth flow for country detection
      }
    }
  }, []);

  // so-byw: keep users.timezone aligned with the device. Backfills NULLs
  // (existing users from before this PR) and re-syncs after travel.
  // Idempotent: only fires PUT when stored TZ differs from device TZ.
  const ensureTimezone = useCallback(async (userInfo: UserInfo) => {
    const deviceTz = getDeviceTimezone();
    if (userInfo.timezone === deviceTz) return;
    try {
      const updated = await AuthService.updateProfile({ timezone: deviceTz });
      setUser(updated);
    } catch (_e) {
      // Silent — don't block auth flow for TZ sync. Will retry on next
      // cold-start. 422 surfaces here for unknown IANA strings (shouldn't
      // happen with Intl-derived values).
    }
  }, []);

  const checkAuthState = useCallback(async () => {
    if (initializingRef.current) {
      return; // Prevent multiple simultaneous auth checks
    }

    try {
      initializingRef.current = true;
      setIsLoading(true);

      // Clear any stale local auth data from dev testing
      await AsyncStorage.multiRemove(['@soultalk_local_auth', '@soultalk_username']);

      const authenticated = await AuthService.isAuthenticated();

      if (authenticated) {
        try {
          const userInfo = await AuthService.getCurrentUser();
          setUser(userInfo);
          setIsAuthenticated(true);
          ensureCountryCode(userInfo);
          ensureTimezone(userInfo);
        } catch (userError) {
          console.error('Failed to get user info:', userError);
          // If we can't get user info, clear auth state
          setUser(null);
          setIsAuthenticated(false);
          // so-hq98: mirror logout()'s cleanup — without this the offline
          // "logged_in" flag set during sign-in lingers, and offline gating
          // can route a signed-out user as if they were still authenticated.
          await AsyncStorage.removeItem('user_logged_in');
          await AuthService.logout();
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth state check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
      initializingRef.current = false;
    }
  }, []);

  useEffect(() => {
    checkAuthState();
  }, [checkAuthState]);

  // so-u0w1: existing-logged-in users on TF≤34 may have NULL users.timezone.
  // The 6 auth-completion call sites only fire when the user signs in again,
  // so users who just resume a stored session never get backfilled. Re-run
  // ensureTimezone on every foreground transition — idempotent (helper
  // early-returns when device TZ already matches the stored value).
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      ensureTimezone(user);
    });
    return () => sub.remove();
  }, [isAuthenticated, user, ensureTimezone]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      await AuthService.login(email, password);

      // Get user info after successful login
      const userInfo = await AuthService.getCurrentUser();
      setUser(userInfo);
      setIsAuthenticated(true);
      ensureCountryCode(userInfo);
      ensureTimezone(userInfo);

      // Store login state for offline check
      await AsyncStorage.setItem('user_logged_in', 'true');
    } catch (error) {
      // Ensure we clear any partial state on login failure
      setUser(null);
      setIsAuthenticated(false);
      throw error;
    }
  }, []);

  const register = useCallback(async (userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    // so-8nem: is_18_plus replaces date_of_birth (Apple 5.1.1(v) rejection).
    // BE accepts boolean; false / absent → 422 age_confirmation_required.
    is_18_plus: boolean;
    country_code: string;
  }) => {
    try {
      // so-byw: include device TZ from row-zero so daily rollovers are
      // local-correct on first login (no need to wait for the cold-start
      // backfill cycle).
      await AuthService.register({ ...userData, timezone: getDeviceTimezone() });
      // Note: User will need to verify email via OTP before they can login
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    // so-1k32: capture the id before clearing state so we can drop this user's
    // namespaced local journal draft — otherwise it would linger and be offered
    // to the next user on a shared device (cross-user PII leak).
    const uid = user?.id;
    try {
      // Deactivate push token before logout (best-effort, don't block logout)
      try {
        await NotificationService.unregisterPushToken();
      } catch (_e) {
        console.log('Push token unregister failed, continuing logout');
      }
      setUser(null);
      setIsAuthenticated(false);
      await AsyncStorage.removeItem('user_logged_in');
      await clearLocalDraft(uid);
      await purgeLegacyGlobalDraft(); // so-1k32: purge legacy device-global draft
      await AuthService.logout();
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
      setIsAuthenticated(false);
      await AsyncStorage.removeItem('user_logged_in');
      await clearLocalDraft(uid);
      await purgeLegacyGlobalDraft(); // so-1k32: purge legacy device-global draft
    }
  }, [user]);

  const refreshUser = useCallback(async () => {
    try {
      if (isAuthenticated && !initializingRef.current) {
        const userInfo = await AuthService.getCurrentUser();
        setUser(userInfo);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      // If refresh fails, user might need to re-authenticate
      setUser(null);
      setIsAuthenticated(false);
      // so-hq98: mirror logout()'s cleanup — see checkAuthState branch above.
      await AsyncStorage.removeItem('user_logged_in');
      await AuthService.logout();
    }
  }, [isAuthenticated]);

  const updateProfile = useCallback(async (data: ProfileUpdate) => {
    try {
      const updated = await AuthService.updateProfile(data);
      setUser(updated);
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await AuthService.resetPassword(email);
    } catch (error) {
      console.error('Password reset failed:', error);
      throw error;
    }
  }, []);

  // Social auth methods
  const loginWithGoogle = useCallback(async (idToken: string, is18Plus?: boolean) => {
    try {
      setIsLoading(true);
      await AuthService.loginWithGoogle(idToken, is18Plus);

      const userInfo = await AuthService.getCurrentUser();
      setUser(userInfo);
      setIsAuthenticated(true);
      ensureCountryCode(userInfo);
      ensureTimezone(userInfo);

      await AsyncStorage.setItem('user_logged_in', 'true');
    } catch (error) {
      console.error('Google login failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithApple = useCallback(async (identityToken: string, fullName?: string | null, is18Plus?: boolean) => {
    try {
      setIsLoading(true);
      await AuthService.loginWithApple(identityToken, fullName, is18Plus);

      const userInfo = await AuthService.getCurrentUser();
      setUser(userInfo);
      setIsAuthenticated(true);
      ensureCountryCode(userInfo);
      ensureTimezone(userInfo);

      await AsyncStorage.setItem('user_logged_in', 'true');
    } catch (error) {
      console.error('Apple login failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithFacebook = useCallback(async (accessToken: string, is18Plus?: boolean) => {
    try {
      setIsLoading(true);
      await AuthService.loginWithFacebook(accessToken, is18Plus);

      const userInfo = await AuthService.getCurrentUser();
      setUser(userInfo);
      setIsAuthenticated(true);
      ensureCountryCode(userInfo);
      ensureTimezone(userInfo);

      await AsyncStorage.setItem('user_logged_in', 'true');
    } catch (error) {
      console.error('Facebook login failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Account linking methods
  const linkGoogleAccount = useCallback(async (idToken: string) => {
    try {
      await AuthService.linkGoogleAccount(idToken);
      await refreshUser();
    } catch (error) {
      console.error('Failed to link Google account:', error);
      throw error;
    }
  }, [refreshUser]);

  const linkFacebookAccount = useCallback(async (accessToken: string) => {
    try {
      await AuthService.linkFacebookAccount(accessToken);
      await refreshUser();
    } catch (error) {
      console.error('Failed to link Facebook account:', error);
      throw error;
    }
  }, [refreshUser]);

  const unlinkProvider = useCallback(async (provider: 'google' | 'facebook') => {
    try {
      await AuthService.unlinkProvider(provider);
      await refreshUser();
    } catch (error) {
      console.error(`Failed to unlink ${provider}:`, error);
      throw error;
    }
  }, [refreshUser]);

  const getLinkedAccounts = useCallback(async (): Promise<LinkedAccount[]> => {
    try {
      return await AuthService.getLinkedAccounts();
    } catch (error) {
      console.error('Failed to get linked accounts:', error);
      throw error;
    }
  }, []);

  // Email verification (OTP-based, auto-login on success)
  // Note: no setIsLoading here — the OTP screen manages its own loading state.
  // Setting isLoading on the auth context unmounts the entire nav tree via Navigation.
  const verifyOTP = useCallback(async (email: string, code: string) => {
    try {
      await AuthService.verifyOTP(email, code);

      // Auto-login: fetch user info and set authenticated state
      const userInfo = await AuthService.getCurrentUser();
      setUser(userInfo);
      setIsAuthenticated(true);
      ensureCountryCode(userInfo);
      ensureTimezone(userInfo);
      await AsyncStorage.setItem('user_logged_in', 'true');
    } catch (error) {
      console.error('Email verification failed:', error);
      throw error;
    }
  }, []);

  const resendVerificationEmail = useCallback(async (email: string) => {
    try {
      await AuthService.resendVerificationEmail(email);
    } catch (error) {
      console.error('Failed to resend verification email:', error);
      throw error;
    }
  }, []);

  // Password management
  const confirmPasswordReset = useCallback(async (token: string, newPassword: string) => {
    try {
      await AuthService.confirmPasswordReset(token, newPassword);
    } catch (error) {
      console.error('Password reset failed:', error);
      throw error;
    }
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    try {
      await AuthService.changePassword(currentPassword, newPassword);
      // Backend revokes all tokens — force logout
      await logout();
    } catch (error) {
      console.error('Password change failed:', error);
      throw error;
    }
  }, [logout]);

  const setPassword = useCallback(async (password: string) => {
    try {
      await AuthService.setPassword(password);
    } catch (error) {
      console.error('Failed to set password:', error);
      throw error;
    }
  }, []);

  // Logout all devices
  const logoutAllDevices = useCallback(async () => {
    const uid = user?.id; // so-1k32: clear this user's local journal draft too
    try {
      setIsLoading(true);
      await AuthService.logoutAllDevices();
    } catch (error) {
      console.error('Logout all devices error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      await AsyncStorage.removeItem('user_logged_in');
      await clearLocalDraft(uid);
      await purgeLegacyGlobalDraft(); // so-1k32: purge legacy device-global draft
      setIsLoading(false);
    }
  }, [user]);

  const deleteAccount = useCallback(async () => {
    try {
      try {
        await NotificationService.unregisterPushToken();
      } catch (_e) {
        console.log('Push token unregister failed, continuing delete');
      }
      await AuthService.deleteAccount();
      setUser(null);
      setIsAuthenticated(false);
      await AsyncStorage.removeItem('user_logged_in');
    } catch (error) {
      console.error('Account deletion failed:', error);
      throw error;
    }
  }, []);

  // so-2lcs: memoize so consumer subtrees don't re-render on every parent
  // render. All callbacks are already stable (useCallback); only user,
  // isLoading, and isAuthenticated change observably. AuthProvider is the
  // app-root provider, so the fan-out savings here are large.
  const value: AuthContextType = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated,
      login,
      register,
      logout,
      refreshUser,
      updateProfile,
      resetPassword,
      loginWithGoogle,
      loginWithFacebook,
      loginWithApple,
      linkGoogleAccount,
      linkFacebookAccount,
      unlinkProvider,
      getLinkedAccounts,
      verifyOTP,
      resendVerificationEmail,
      confirmPasswordReset,
      changePassword,
      setPassword,
      logoutAllDevices,
      deleteAccount,
    }),
    [
      user,
      isLoading,
      isAuthenticated,
      login,
      register,
      logout,
      refreshUser,
      updateProfile,
      resetPassword,
      loginWithGoogle,
      loginWithFacebook,
      loginWithApple,
      linkGoogleAccount,
      linkFacebookAccount,
      unlinkProvider,
      getLinkedAccounts,
      verifyOTP,
      resendVerificationEmail,
      confirmPasswordReset,
      changePassword,
      setPassword,
      logoutAllDevices,
      deleteAccount,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};