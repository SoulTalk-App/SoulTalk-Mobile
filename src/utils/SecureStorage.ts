import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * so-cjre: web has no real secure-storage primitive. The previous
 * implementation fell back to localStorage, which is XSS-readable —
 * the chunk-1 audit flagged that as MAJOR if web ever shipped to
 * production. SoulTalk-Mobile ships iOS + Android; the `web` target
 * exists only for dev-server hot-reload and is NEVER a production
 * target. So this layer now hard-rejects every read/write on web
 * with a clear error.
 *
 * Effect: AuthContext.checkAuthState's call to AuthService.isAuthenticated
 * → getStoredAccessToken → SecureStorage.getItem throws on web, which
 * routes the user to the unauthenticated branch (login screen). Login
 * itself then fails when AuthService.storeTokens tries to write — the
 * error surfaces in the LoginScreen catch, blocking entry instead of
 * silently leaking credentials into localStorage. No screen-side guard
 * is required.
 *
 * If web becomes a real shipping target, replace this with a proper
 * sessionStorage + WebCrypto encryption path and re-prioritize the
 * bead to P1.
 */
const WEB_DISABLED_MESSAGE =
  'SoulTalk does not support web login. Please use the iOS or Android app.';

class SecureStorage {
  private isWeb: boolean;

  constructor() {
    this.isWeb = Platform.OS === 'web';
  }

  async setItem(key: string, value: string): Promise<void> {
    if (this.isWeb) {
      throw new Error(WEB_DISABLED_MESSAGE);
    }
    await SecureStore.setItemAsync(key, value);
  }

  async getItem(key: string): Promise<string | null> {
    if (this.isWeb) {
      // Read-side: returning null is the closest analogue to "no stored
      // token" and lets isAuthenticated / getStoredAccessToken etc. fall
      // through to their unauthenticated branches cleanly. Throwing here
      // would crash auth bootstrap at app start; null + the setItem throw
      // together still block any persisted-session path on web.
      return null;
    }
    return await SecureStore.getItemAsync(key);
  }

  async deleteItem(key: string): Promise<void> {
    if (this.isWeb) {
      // Idempotent on web — nothing was stored, nothing to delete.
      return;
    }
    await SecureStore.deleteItemAsync(key);
  }

  async isAvailable(): Promise<boolean> {
    if (this.isWeb) {
      return false;
    }
    return await SecureStore.isAvailableAsync();
  }
}

export default new SecureStorage();
