import { useEffect, useState } from 'react';
import * as Facebook from 'expo-auth-session/providers/facebook';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

interface UseFacebookAuthReturn {
  request: Facebook.FacebookAuthRequestConfig | null;
  response: any;
  promptAsync: () => Promise<any>;
  getAccessToken: () => string | null;
  isLoading: boolean;
  error: string | null;
}

export const useFacebookAuth = (): UseFacebookAuthReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const facebookAppId = Constants.expoConfig?.extra?.facebookAppId;

  const [request, response, promptAsync] = Facebook.useAuthRequest({
    clientId: facebookAppId,
  });

  const getAccessToken = (): string | null => {
    if (response?.type === 'success') {
      return response.authentication?.accessToken || null;
    }
    return null;
  };

  useEffect(() => {
    if (response?.type === 'error') {
      setError(response.error?.message || 'Facebook authentication failed');
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
      setError(err.message || 'Failed to initiate Facebook sign-in');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    request,
    response,
    promptAsync: wrappedPromptAsync,
    getAccessToken,
    isLoading,
    error,
  };
};

export default useFacebookAuth;
