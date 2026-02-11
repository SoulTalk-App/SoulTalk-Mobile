import { useState, useCallback } from 'react';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';

const config = Constants.expoConfig?.extra?.googleClientId || {};

GoogleSignin.configure({
  iosClientId: config.iosClientId,
  webClientId: config.webClientId,
  offlineAccess: false,
});

interface UseGoogleAuthReturn {
  response: { type: 'success'; idToken: string } | { type: 'error'; error?: { message: string } } | null;
  promptAsync: () => Promise<any>;
  getIdToken: () => string | null;
  isLoading: boolean;
  error: string | null;
}

export const useGoogleAuth = (): UseGoogleAuthReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<UseGoogleAuthReturn['response']>(null);

  const getIdToken = useCallback((): string | null => {
    if (response?.type === 'success') {
      return response.idToken;
    }
    return null;
  }, [response]);

  const promptAsync = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await GoogleSignin.hasPlayServices();
      const result = await GoogleSignin.signIn();
      const idToken = result.data?.idToken ?? null;

      if (idToken) {
        setResponse({ type: 'success', idToken });
      } else {
        setResponse({ type: 'error', error: { message: 'No ID token received' } });
        setError('No ID token received');
      }
      return result;
    } catch (err: any) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        setResponse(null);
      } else if (err.code === statusCodes.IN_PROGRESS) {
        // Sign-in already in progress
      } else {
        const message = err.message || 'Failed to initiate Google sign-in';
        setError(message);
        setResponse({ type: 'error', error: { message } });
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    response,
    promptAsync,
    getIdToken,
    isLoading,
    error,
  };
};

export default useGoogleAuth;
