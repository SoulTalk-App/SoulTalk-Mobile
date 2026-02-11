import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../services/AuthService';

interface UserInfo {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  email_verified: boolean;
  providers: string[];
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
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  // Social auth methods
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithFacebook: (accessToken: string) => Promise<void>;
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
  setPassword: (password: string) => Promise<void>;
  // Logout all devices
  logoutAllDevices: () => Promise<void>;
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
        } catch (userError) {
          console.error('Failed to get user info:', userError);
          // If we can't get user info, clear auth state
          setUser(null);
          setIsAuthenticated(false);
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

  const login = useCallback(async (email: string, password: string) => {
    try {
      await AuthService.login(email, password);

      // Get user info after successful login
      const userInfo = await AuthService.getCurrentUser();
      setUser(userInfo);
      setIsAuthenticated(true);

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
  }) => {
    try {
      await AuthService.register(userData);
      // Note: User will need to verify email via OTP before they can login
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      await AuthService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      await AsyncStorage.removeItem('user_logged_in');
      setIsLoading(false);
    }
  }, []);

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
      await AuthService.logout();
    }
  }, [isAuthenticated]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await AuthService.resetPassword(email);
    } catch (error) {
      console.error('Password reset failed:', error);
      throw error;
    }
  }, []);

  // Social auth methods
  const loginWithGoogle = useCallback(async (idToken: string) => {
    try {
      setIsLoading(true);
      await AuthService.loginWithGoogle(idToken);

      const userInfo = await AuthService.getCurrentUser();
      setUser(userInfo);
      setIsAuthenticated(true);

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

  const loginWithFacebook = useCallback(async (accessToken: string) => {
    try {
      setIsLoading(true);
      await AuthService.loginWithFacebook(accessToken);

      const userInfo = await AuthService.getCurrentUser();
      setUser(userInfo);
      setIsAuthenticated(true);

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
  const verifyOTP = useCallback(async (email: string, code: string) => {
    try {
      setIsLoading(true);
      await AuthService.verifyOTP(email, code);

      // Auto-login: fetch user info and set authenticated state
      const userInfo = await AuthService.getCurrentUser();
      setUser(userInfo);
      setIsAuthenticated(true);
      await AsyncStorage.setItem('user_logged_in', 'true');
    } catch (error) {
      console.error('Email verification failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
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
    try {
      setIsLoading(true);
      await AuthService.logoutAllDevices();
    } catch (error) {
      console.error('Logout all devices error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      await AsyncStorage.removeItem('user_logged_in');
      setIsLoading(false);
    }
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshUser,
    resetPassword,
    loginWithGoogle,
    loginWithFacebook,
    linkGoogleAccount,
    linkFacebookAccount,
    unlinkProvider,
    getLinkedAccounts,
    verifyOTP,
    resendVerificationEmail,
    confirmPasswordReset,
    setPassword,
    logoutAllDevices,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};