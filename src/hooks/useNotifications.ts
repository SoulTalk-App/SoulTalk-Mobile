import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import NotificationService from '../services/NotificationService';

/**
 * Hook to set up push notification listeners.
 * Call this once in a top-level authenticated component (e.g. main tab navigator).
 *
 * Handles:
 * - Registering for push notifications on mount
 * - Navigating to journal entry when a notification is tapped
 * - Cleaning up listeners on unmount
 */
export function useNotifications() {
  const navigation = useNavigation<any>();
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    // Register for push notifications
    NotificationService.registerForPushNotifications();

    // Handle notification taps (app in background or killed)
    responseListener.current = NotificationService.addNotificationResponseListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.type === 'journal_ai_complete' && data?.entry_id) {
          // Navigate to the journal entry screen
          navigation.navigate('JournalEntry', { entryId: data.entry_id });
        }
      },
    );

    // Handle notifications received while app is in foreground (optional logging)
    notificationListener.current = NotificationService.addNotificationReceivedListener(
      (notification) => {
        console.log('[Push] Foreground notification:', notification.request.content.title);
      },
    );

    // Check if the app was opened by tapping a notification (cold start)
    NotificationService.getLastNotificationResponse().then((response) => {
      if (response) {
        const data = response.notification.request.content.data;
        if (data?.type === 'journal_ai_complete' && data?.entry_id) {
          navigation.navigate('JournalEntry', { entryId: data.entry_id });
        }
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [navigation]);
}
