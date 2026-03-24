import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AuthService from './AuthService';

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
    // Only works on physical devices
    if (!Constants.isDevice) {
      console.log('[Push] Must use physical device for push notifications');
      return null;
    }

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
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      this.pushToken = tokenData.data;

      // Register with backend
      await this.sendTokenToBackend(this.pushToken);

      console.log('[Push] Registered token:', this.pushToken);
      return this.pushToken;
    } catch (error) {
      console.error('[Push] Failed to get push token:', error);
      return null;
    }
  }

  /**
   * Send the push token to the backend for storage.
   */
  private async sendTokenToBackend(token: string): Promise<void> {
    try {
      const axiosInstance = (AuthService as any).axiosInstance;
      await axiosInstance.put('/notifications/token', {
        push_token: token,
        platform: Platform.OS as 'ios' | 'android',
      });
    } catch (error) {
      console.error('[Push] Failed to register token with backend:', error);
    }
  }

  /**
   * Deactivate the current push token on the backend (call before logout).
   */
  async unregisterPushToken(): Promise<void> {
    if (!this.pushToken) return;

    try {
      const axiosInstance = (AuthService as any).axiosInstance;
      await axiosInstance.delete('/notifications/token', {
        data: { push_token: this.pushToken },
      });
    } catch (error) {
      console.error('[Push] Failed to unregister token:', error);
    }

    this.pushToken = null;
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
