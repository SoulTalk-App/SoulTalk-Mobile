import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

interface AppleAuthSuccess {
  type: 'success';
  identityToken: string;
  fullName: string | null;
}

interface AppleAuthError {
  type: 'error';
  error?: { message: string };
}

type AppleAuthResponse = AppleAuthSuccess | AppleAuthError | null;

interface UseAppleAuthReturn {
  response: AppleAuthResponse;
  promptAsync: () => Promise<void>;
  getIdentityToken: () => string | null;
  getFullName: () => string | null;
  isAvailable: boolean;
  isLoading: boolean;
  error: string | null;
}

const formatFullName = (
  fullName: AppleAuthentication.AppleAuthenticationCredential['fullName'],
): string | null => {
  if (!fullName) return null;
  const parts = [fullName.givenName, fullName.familyName].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(' ') : null;
};

export const useAppleAuth = (): UseAppleAuthReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AppleAuthResponse>(null);

  // Apple sign-in is iOS-only per Apple Guideline 4.8.
  const isAvailable = Platform.OS === 'ios';

  const getIdentityToken = useCallback((): string | null => {
    if (response?.type === 'success') return response.identityToken;
    return null;
  }, [response]);

  const getFullName = useCallback((): string | null => {
    if (response?.type === 'success') return response.fullName;
    return null;
  }, [response]);

  const promptAsync = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        setResponse({
          type: 'success',
          identityToken: credential.identityToken,
          fullName: formatFullName(credential.fullName),
        });
      } else {
        const message = 'No identity token received from Apple';
        setError(message);
        setResponse({ type: 'error', error: { message } });
      }
    } catch (err: any) {
      // ERR_REQUEST_CANCELED: user dismissed the sheet — silent reset.
      if (err?.code === 'ERR_REQUEST_CANCELED') {
        setResponse(null);
      } else {
        const message = err?.message || 'Failed to sign in with Apple';
        setError(message);
        setResponse({ type: 'error', error: { message } });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    response,
    promptAsync,
    getIdentityToken,
    getFullName,
    isAvailable,
    isLoading,
    error,
  };
};

export default useAppleAuth;
