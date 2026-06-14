/**
 * useDriverNotifications — Driver App FCM + Expo Push Notifications
 * Phase 3: P3.2
 *
 * Usage: Call once inside the root _layout.tsx
 *   import { useDriverNotifications } from '../src/hooks/useDriverNotifications'
 *   useDriverNotifications()
 *
 * IMPORTANT: Fill EXPO_PUBLIC_FCM_SERVER_KEY in apps/driver-app/.env before deploying.
 */
import { useEffect, useRef, useCallback } from 'react'
import { Platform, Alert } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { api } from '../api/client'

// ── Notification display behaviour ───────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

// ── Android notification channel (required for Android 8+) ───────────────────
async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync('ride-requests', {
    name: 'Ride Requests',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#22C55E',
    enableVibrate: true,
    sound: 'siren.mp3',
  })
  await Notifications.setNotificationChannelAsync('trips', {
    name: 'Trip Updates',
    importance: Notifications.AndroidImportance.HIGH,
  })
}

// ── Register push token with backend ─────────────────────────────────────────
async function registerTokenWithBackend(token: string) {
  try {
    await api.post('/auth/device-token', { token, platform: Platform.OS })
    console.log('[DriverNotifications] Token registered with backend:', token.slice(0, 20) + '...')
  } catch (e: any) {
    // Non-fatal — retry handled on next app launch
    console.warn('[DriverNotifications] Token registration failed:', e?.response?.data?.detail || e.message)
  }
}

// ── Main hook ────────────────────────────────────────────────────────────────
export function useDriverNotifications() {
  const notifListenerRef     = useRef<any>(null)
  const responseListenerRef  = useRef<any>(null)

  const requestPermissionsAndRegister = useCallback(async () => {
    // Notifications don't work on simulators / expo-go without a real device check
    if (!Device.isDevice) {
      console.warn('[DriverNotifications] Push notifications require a physical device.')
      return
    }

    await ensureAndroidChannel()

    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') {
      Alert.alert(
        'Notifications Disabled',
        'Enable notifications in your device settings to receive ride requests.',
        [{ text: 'OK' }]
      )
      return
    }

    try {
      // getDevicePushTokenAsync() contacts Firebase Installation Service.
      // If google-services.json is not properly configured it throws FIS_AUTH_ERROR.
      // This is non-fatal — the app still receives ride requests via WebSocket.
      // FCM push is only a backup channel (for background / killed-app state).
      const devicePushToken = await Notifications.getDevicePushTokenAsync()
      const token = devicePushToken.data as string

      console.log('')
      console.log('╔══════════════════════════════════════════════════╗')
      console.log('║           FCM TOKEN (for manual testing)         ║')
      console.log('╠══════════════════════════════════════════════════╣')
      console.log('║ ' + token.substring(0, 48))
      if (token.length > 48) console.log('║ ' + token.substring(48))
      console.log('╚══════════════════════════════════════════════════╝')
      console.log('')

      await registerTokenWithBackend(token)
    } catch (e: any) {
      const msg: string = e?.message || String(e)
      if (
        msg.includes('FIS_AUTH_ERROR') ||
        msg.includes('FIS_') ||
        msg.includes('ExecutionException') ||
        msg.includes('IOException')
      ) {
        // Firebase Installation Service failed — almost always caused by an
        // invalid / placeholder google-services.json.
        // Download the real file from:
        //   Firebase Console → Project Settings → General → Your Apps → google-services.json
        // This does NOT affect WebSocket-based ride dispatch — the app still works.
        console.log(
          '[DriverNotifications] FCM unavailable (invalid Firebase config) — ' +
          'ride requests will still arrive via WebSocket. ' +
          'To enable push: download a real google-services.json from Firebase Console.'
        )
      } else {
        console.warn('[DriverNotifications] Could not get push token:', msg)
      }
    }
  }, [])

  useEffect(() => {
    requestPermissionsAndRegister()

    // ── Foreground notification listener ────────────────────────────────────
    notifListenerRef.current = Notifications.addNotificationReceivedListener(notification => {
      const { title, body } = notification.request.content
      console.log('[DriverNotifications] Foreground notification:', title, body)
      // Foreground alerts are handled by the WebSocket overlay (incoming-request.tsx)
      // No duplicate alert shown here — the WS handler already takes care of it
    })

    // ── Notification tap/response listener ──────────────────────────────────
    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as any
      console.log('[DriverNotifications] Notification tapped, data:', data)
      // Deep link: if notification carries a booking_id, driver app can navigate
      // Navigation is handled by expo-router via URL scheme — see _layout.tsx
    })

    return () => {
      notifListenerRef.current?.remove()
      responseListenerRef.current?.remove()
    }
  }, [requestPermissionsAndRegister])
}

// ── Utility: schedule a local notification (for testing without real FCM) ────
export async function scheduleLocalRideRequest(pickup: string, destination: string, fare: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🚨 New Ride Request',
      body: `${pickup} → ${destination} • ₹${fare}`,
      sound: 'siren.mp3',
      data: { type: 'RIDE_REQUEST' },
      categoryIdentifier: 'ride-requests',
    },
    trigger: null, // Show immediately
  })
}
