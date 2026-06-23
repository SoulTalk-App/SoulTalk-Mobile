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
        // so-iiw8: user-facing copy — raw "No ID token received" was an
        // SDK-internal phrase ("ID token" reads as jargon). Match the
        // friendly tone of the rest of the auth surface.
        const friendly = "Google sign-in didn't complete. Please try again.";
        setResponse({ type: 'error', error: { message: friendly } });
        setError(friendly);
      }
      return result;
    } catch (err: any) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        setResponse(null);
      } else if (err.code === statusCodes.IN_PROGRESS) {
        // Sign-in already in progress
      } else {
        // so-iiw8: don't expose raw SDK err.message to the screen — it
        // surfaces things like "DEVELOPER_ERROR" verbatim. The actual
        // message rendered to the user goes through normalizeError +
        // useAppAlert at the call site; this just keeps an internal
        // signal for the hook state machine.
        const friendly =
          "Google sign-in didn't complete. Please try again.";
        setError(friendly);
        setResponse({ type: 'error', error: { message: friendly } });
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
