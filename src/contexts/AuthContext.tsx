import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../services/AuthService';

interface UserInfo {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  email_verified: boolean;
  groups: string[];
}

interface AuthContextType {
  user: UserInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    username: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
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
      setIsLoading(true);
      await AuthService.login(email, password);
      
      // Get user info after successful login
      const userInfo = await AuthService.getCurrentUser();
      setUser(userInfo);
      setIsAuthenticated(true);
      
      // Store login state for offline check
      await AsyncStorage.setItem('user_logged_in', 'true');
    } catch (error) {
      console.error('Login failed:', error);
      // Ensure we clear any partial state on login failure
      setUser(null);
      setIsAuthenticated(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (userData: {
    email: string;
    password: string;
    username: string;
  }) => {
    try {
      setIsLoading(true);
      // Transform username to first_name and last_name for backend compatibility
      const backendData = {
        email: userData.email,
        password: userData.password,
        first_name: userData.username,
        last_name: ''
      };
      await AuthService.register(backendData);
      // Note: User will need to verify email before they can login
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
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

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshUser,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};