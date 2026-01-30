import { useEffect, useState } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

interface GoogleAuthConfig {
  iosClientId?: string;
  androidClientId?: string;
  webClientId?: string;
}

interface UseGoogleAuthReturn {
  request: Google.GoogleAuthRequestConfig | null;
  response: any;
  promptAsync: () => Promise<any>;
  getIdToken: () => string | null;
  isLoading: boolean;
  error: string | null;
}

export const useGoogleAuth = (): UseGoogleAuthReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config: GoogleAuthConfig = Constants.expoConfig?.extra?.googleClientId || {};

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: config.iosClientId,
    androidClientId: config.androidClientId,
    webClientId: config.webClientId,
  });

  const getIdToken = (): string | null => {
    if (response?.type === 'success') {
      return response.params.id_token || null;
    }
    return null;
  };

  useEffect(() => {
    if (response?.type === 'error') {
      setError(response.error?.message || 'Google authentication failed');
    } else {
      setError(null);
    }
  }, [response]);

  const wrappedPromptAsync = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await promptAsync();
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to initiate Google sign-in');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    request,
    response,
    promptAsync: wrappedPromptAsync,
    getIdToken,
    isLoading,
    error,
  };
};

export default useGoogleAuth;
