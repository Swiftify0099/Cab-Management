/**
 * usePushNotifications — Driver App
 *
 * Deep-fixed version:
 *  1. Uses getDevicePushTokenAsync() to get the raw FCM token directly.
 *     This does NOT need an EAS project ID and works in all local/bare builds.
 *  2. Prints the FCM token clearly to console so you can test manually.
 *  3. Sends the FCM token to the backend device-token endpoint.
 *  4. Never crashes the app — all errors are caught silently.
 *  5. Configured to use custom sound 'siren.mp3'.
 */
import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import type * as NotificationsType from 'expo-notifications';
import { api } from '../api/client';

let Notifications: typeof NotificationsType | null = null;
try {
  Notifications = require('expo-notifications');
  Notifications?.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (e) {
  console.warn('[PushNotif] expo-notifications not available:', e);
}

export function usePushNotifications() {
  const [fcmToken, setFcmToken] = useState<string | undefined>();
  const [notification, setNotification] = useState<NotificationsType.Notification | undefined>();
  const notificationListener = useRef<NotificationsType.Subscription | null>(null);
  const responseListener = useRef<NotificationsType.Subscription | null>(null);

  useEffect(() => {
    if (!Notifications) return;

    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        setFcmToken(token);

        // ── Print FCM token clearly so you can test Firebase manually ──
        console.log('');
        console.log('╔══════════════════════════════════════════════════╗');
        console.log('║           FCM TOKEN (for manual testing)         ║');
        console.log('╠══════════════════════════════════════════════════╣');
        console.log('║ ' + token.substring(0, 48));
        if (token.length > 48) console.log('║ ' + token.substring(48));
        console.log('╚══════════════════════════════════════════════════╝');
        console.log('');

        // ── Send FCM token to backend ──
        api.post('/auth/device-token', { token, platform: Platform.OS })
          .then(() => console.log('[PushNotif] FCM token registered with backend ✅'))
          .catch(() => {
            api.post('/driver/fcm-token', { fcm_token: token })
              .then(() => console.log('[PushNotif] FCM token registered via driver endpoint ✅'))
              .catch((err) => console.warn('[PushNotif] Backend token registration failed:', err?.response?.data || err?.message));
          });
      }
    });

    // ── Token Refresh Handler ──
    const pushTokenSub = Notifications.addPushTokenListener((tokenData) => {
      const refreshedToken = tokenData.data as string;
      if (refreshedToken) {
        console.log('[PushNotif] FCM Token Refreshed:', refreshedToken.substring(0, 24) + '...');
        setFcmToken(refreshedToken);
        api.post('/auth/device-token', { token: refreshedToken, platform: Platform.OS }).catch(() => {});
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(n => {
      console.log('[PushNotif] Notification received:', n);
      setNotification(n);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[PushNotif] Notification tapped:', response);
    });

    return () => {
      if (!Notifications) return;
      pushTokenSub?.remove?.();
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, []);

  return { fcmToken, notification };
}

async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  if (!Notifications || !Device.isDevice) {
    console.log('[PushNotif] Skipping — not a physical device or Notifications unavailable');
    return undefined;
  }

  // Set Android notification channels (ride-requests + default)
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('ride-requests', {
        name: 'Cab Booking & Ride Requests',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 600, 300, 600, 300, 600, 300, 1000],
        lightColor: '#10B981',
        enableVibrate: true,
        enableLights: true,
        sound: 'dr_siran.mp3',
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
      });

      await Notifications.setNotificationChannelAsync('default', {
        name: 'Driver Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F59E0B',
        sound: 'siren.mp3',
        enableVibrate: true,
        showBadge: true,
      });
      console.log('[PushNotif] Android notification channels created ✅');
    } catch (e) {
      console.warn('[PushNotif] Failed to create notification channel:', e);
    }
  }

  // Request permissions
  let finalStatus: string;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[PushNotif] Permission denied — user declined notifications');
      return undefined;
    }
    console.log('[PushNotif] Notification permission granted ✅');
  } catch (e) {
    console.warn('[PushNotif] Permission request failed:', e);
    return undefined;
  }

  // ── Get RAW FCM/APNs device token (no EAS needed) ──
  // getDevicePushTokenAsync() returns the native FCM token directly.
  // This works in ALL bare/local builds without any EAS project ID.
  try {
    const devicePushToken = await Notifications.getDevicePushTokenAsync();
    const token = devicePushToken.data as string;
    console.log('[PushNotif] Raw FCM token obtained ✅ Type:', devicePushToken.type);
    return token;
  } catch (e: any) {
    const msg: string = e?.message || String(e)
    if (
      msg.includes('FIS_AUTH_ERROR') ||
      msg.includes('FIS_') ||
      msg.includes('ExecutionException') ||
      msg.includes('IOException')
    ) {
      // Firebase config is invalid/placeholder — non-fatal, WebSocket still works.
      console.log('[PushNotif] FCM unavailable (invalid Firebase config) — WebSocket dispatch still active.')
    } else {
      console.warn('[PushNotif] Could not get device FCM token:', e)
    }
    return undefined
  }
}
