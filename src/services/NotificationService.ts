import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AuthService from './AuthService';
import SecureStorage from '../utils/SecureStorage';
import { logHandledError } from '../utils/logger';

// so-3nst: persisted across cold starts so unregisterPushToken() can still
// deactivate the token after a process restart. The in-memory `pushToken`
// alone was lost on app kill; logout/delete-account after a cold start
// then no-op'd the backend deactivate, and notifications kept landing on
// a re-sold/handed-off device — PII leak.
const PUSH_TOKEN_KEY = 'expo_push_token';

/**
 * Manages push notification registration, permission, and handling.
 *
 * Flow:
 * 1. After login, call registerForPushNotifications()
 * 2. This requests permission, gets Expo push token, sends to backend
 * 3. On logout, call unregisterPushToken() to deactivate on backend
 * 4. Incoming notifications are handled via listeners set up in useNotifications hook
 */

// Configure how notifications appear when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowInForeground: true,
  }),
});

class NotificationService {
  private pushToken: string | null = null;

  /**
   * Request notification permissions, get Expo push token,
   * and register it with the backend.
   */
  async registerForPushNotifications(): Promise<string | null> {
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Permission not granted');
      return null;
    }

    // Get the Expo push token
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        logHandledError('[Push] No EAS projectId configured');
        return null;
      }
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      this.pushToken = tokenData.data;
      // so-3nst: persist so a cold-start logout/delete still finds the
      // token and can ask the backend to deactivate it.
      await SecureStorage.setItem(PUSH_TOKEN_KEY, this.pushToken);
      console.log('[Push] Got Expo token');
    } catch (error) {
      logHandledError('[Push] Failed to get push token', error);
      return null;
    }

    // Register with backend (retry up to 3 times with delay)
    await this.sendTokenToBackend(this.pushToken);

    return this.pushToken;
  }

  /**
   * Send the push token to the backend for storage.
   * Retries up to 3 times with increasing delay to handle
   * race conditions where auth token isn't ready yet.
   */
  private async sendTokenToBackend(token: string): Promise<void> {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const axiosInstance = (AuthService as any).axiosInstance;
        await axiosInstance.put('/notifications/token', {
          push_token: token,
          platform: Platform.OS as 'ios' | 'android',
        });
        console.log('[Push] Token registered with backend');
        return;
      } catch (error: any) {
        const status = error?.response?.status;
        console.warn(`[Push] Backend registration attempt ${attempt}/${maxRetries} failed (status: ${status})`);
        // Don't retry on 403 (email not verified) — it won't help
        if (status === 403) {
          console.log('[Push] User email not verified, skipping token registration');
          return;
        }
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, attempt * 2000));
        }
      }
    }
    logHandledError('[Push] Failed to register token with backend after retries');
  }

  /**
   * Deactivate the current push token on the backend (call before logout).
   *
   * so-3nst: hydrate from SecureStorage when in-memory is null (cold start
   * after registration in a prior process). Without this, logout/
   * deleteAccount on a process that never called registerForPushNotifications
   * silently no-ops, leaving the user's notifications routed to a device
   * they've signed out of.
   */
  async unregisterPushToken(): Promise<void> {
    if (!this.pushToken) {
      this.pushToken = await SecureStorage.getItem(PUSH_TOKEN_KEY);
    }
    if (!this.pushToken) return;

    try {
      const axiosInstance = (AuthService as any).axiosInstance;
      await axiosInstance.delete('/notifications/token', {
        data: { push_token: this.pushToken },
      });
    } catch (error) {
      logHandledError('[Push] Failed to unregister token', error);
    }

    // Always clear locally regardless of backend success — on a logout/
    // delete flow we want the device to forget the token so the next
    // session re-registers cleanly. Backend errors will be retried on
    // the next deactivate attempt for that user (BE owns dedup).
    this.pushToken = null;
    await SecureStorage.deleteItem(PUSH_TOKEN_KEY);
  }

  /**
   * Get the current push token (if registered).
   */
  getToken(): string | null {
    return this.pushToken;
  }

  /**
   * Add a listener for when a notification is received while the app is foregrounded.
   */
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void,
  ): Notifications.EventSubscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Add a listener for when a user taps on a notification.
   * Use this to navigate to the relevant screen.
   */
  addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void,
  ): Notifications.EventSubscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  /**
   * Get the notification that launched the app (cold start from notification tap).
   */
  async getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
    return await Notifications.getLastNotificationResponseAsync();
  }
}

export default new NotificationService();
