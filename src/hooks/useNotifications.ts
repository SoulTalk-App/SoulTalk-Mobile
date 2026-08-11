import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import NotificationService from '../services/NotificationService';

/**
 * Route a tapped notification to the correct screen.
 *
 * so-3gty: handles two notification types:
 *  - journal_ai_complete  → JournalEntry (existing entry, requires entry_id)
 *  - daily_reflection_nudge / data.screen === 'JournalEntry' with no entry_id
 *                         → CreateJournal (open the write flow for a new entry)
 *
 * This runs from both the warm listener and the cold-start
 * getLastNotificationResponse check, so keep it pure (no hooks).
 */
function routeNotificationResponse(
  navigation: any,
  data: Record<string, any> | null | undefined,
) {
  if (!data) return;
  if (data.type === 'journal_ai_complete' && data.entry_id) {
    navigation.navigate('JournalEntry', { entryId: data.entry_id });
  } else if (
    data.type === 'daily_reflection_nudge' ||
    (data.screen === 'JournalEntry' && !data.entry_id)
  ) {
    // so-3gty: daily reflection nudge — open the write flow, not a specific entry.
    // JournalEntryScreen requires entryId; CreateJournal is the correct target
    // for "tap here to write today's reflection".
    navigation.navigate('CreateJournal');
  }
}

/**
 * Hook to set up push notification listeners.
 * Call this once in a top-level authenticated component (e.g. main tab navigator).
 *
 * Handles:
 * - Registering for push notifications on mount
 * - Navigating on notification tap (warm + cold start)
 * - Cleaning up listeners on unmount
 */
export function useNotifications() {
  const navigation = useNavigation<any>();
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    // so-3gty: permission request + Expo token registration fires every time
    // the authenticated AppStack mounts. registerForPushNotifications() is
    // idempotent (checks existing permission before requesting).
    NotificationService.registerForPushNotifications().catch((err) => {
      console.log('[Push] Registration error:', err);
    });

    // Handle notification taps while app is foregrounded or backgrounded (warm).
    responseListener.current = NotificationService.addNotificationResponseListener(
      (response) => {
        if (!isMounted.current) return;
        const data = response.notification.request.content.data as Record<string, any>;
        routeNotificationResponse(navigation, data);
      },
    );

    // Handle notifications received while app is in foreground (optional logging).
    notificationListener.current = NotificationService.addNotificationReceivedListener(
      (notification) => {
        console.log('[Push] Foreground notification:', notification.request.content.title);
      },
    );

    // so-3gty: cold-start deep link — tapping the notification from a killed
    // app sets the last response before JS boots. This hook runs inside AppStack
    // (authenticated, nav tree fully mounted), so navigation is safe here.
    NotificationService.getLastNotificationResponse().then((response) => {
      if (!isMounted.current) return;
      if (response) {
        const data = response.notification.request.content.data as Record<string, any>;
        routeNotificationResponse(navigation, data);
      }
    });

    return () => {
      isMounted.current = false;
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [navigation]);
}
