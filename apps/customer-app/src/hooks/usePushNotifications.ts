/**
 * usePushNotifications — Customer App
 *
 * Deep-fixed version:
 *  1. Uses getDevicePushTokenAsync() to get the raw FCM token directly.
 *     This does NOT need an EAS project ID and works in all local/bare builds.
 *  2. Prints the FCM token clearly to console so you can test manually.
 *  3. Sends the FCM token to the backend device-token endpoint.
 *  4. Never crashes the app — all errors are caught silently.
 */
import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import type * as NotificationsType from 'expo-notifications';
import { useAuthStore } from '../store/auth.store';
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
  const authToken = useAuthStore((s) => s.token);

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
        if (authToken) {
          api.post('/auth/device-token', { token, platform: Platform.OS })
            .then(() => console.log('[PushNotif] FCM token registered with backend ✅'))
            .catch((err) => console.warn('[PushNotif] Backend token registration failed:', err?.response?.data || err?.message));
        }
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
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, [authToken]);

  return { fcmToken, notification };
}

async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  if (!Notifications || !Device.isDevice) {
    console.log('[PushNotif] Skipping — not a physical device or Notifications unavailable');
    return undefined;
  }

  // Set Android notification channel
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'CabBooking Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
        sound: 'customer_siren.mp3',
      });
      console.log('[PushNotif] Android notification channel created ✅');
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
  } catch (e) {
    console.warn('[PushNotif] Could not get device FCM token:', e);
    return undefined;
  }
}
