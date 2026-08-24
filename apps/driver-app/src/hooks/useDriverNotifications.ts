/**
 * useDriverNotifications — Driver App FCM + Interactive Push & Heads-up Notifications
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides:
 *  1. Background and outside-app loud ringing siren + continuous looping vibration.
 *  2. Interactive Notification Categories with "ACCEPT RIDE 🚖" and "REJECT ❌" buttons.
 *  3. Instant 1-tap accept/reject execution from lock screen / heads-up notification.
 */
import { useEffect, useRef, useCallback } from 'react'
import { Platform, Alert, Vibration } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { router } from 'expo-router'
import { api } from '../api/client'
import { DriverSoundService } from '../services/driverSoundService'

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

// ── Notification Categories with Interactive Action Buttons ──────────────────
export async function ensureNotificationCategories() {
  try {
    await Notifications.setNotificationCategoryAsync('INCOMING_RIDE', [
      {
        identifier: 'ACCEPT_RIDE',
        buttonTitle: 'ACCEPT RIDE 🚖',
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: 'REJECT_RIDE',
        buttonTitle: 'REJECT ❌',
        options: {
          opensAppToForeground: false,
          isDestructive: true,
        },
      },
    ])

    await Notifications.setNotificationCategoryAsync('PARCEL_REQUEST', [
      {
        identifier: 'ACCEPT_PARCEL',
        buttonTitle: 'ACCEPT PARCEL 📦',
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: 'REJECT_PARCEL',
        buttonTitle: 'REJECT ❌',
        options: {
          opensAppToForeground: false,
          isDestructive: true,
        },
      },
    ])
  } catch (e) {
    console.warn('[DriverNotifications] Error setting notification categories:', e)
  }
}

// ── Android notification channels (MAX Importance & Heads-Up Alerts) ──────────
export async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return
  try {
    await Notifications.setNotificationChannelAsync('ride-requests', {
      name: 'Cab Booking & Ride Requests',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 600, 300, 600, 300, 600, 300, 1000],
      lightColor: '#10B981',
      enableVibrate: true,
      enableLights: true,
      sound: 'drsiran.mp3',
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    })
    await Notifications.setNotificationChannelAsync('parcel-requests', {
      name: 'Parcel Delivery Requests',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500, 250, 500],
      lightColor: '#F59E0B',
      enableVibrate: true,
      enableLights: true,
      sound: 'drsiran.mp3',
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    })
    await Notifications.setNotificationChannelAsync('transport-requests', {
      name: 'Intercity & Transport Requests',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500, 250, 500],
      lightColor: '#0EA5E9',
      enableVibrate: true,
      sound: 'drsiran.mp3',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    })
    await Notifications.setNotificationChannelAsync('hotel-transfers', {
      name: 'Hotel & Airport Transfers',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#8B5CF6',
      enableVibrate: true,
      sound: 'drsiran.mp3',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    })
    await Notifications.setNotificationChannelAsync('trips', {
      name: 'Trip Updates',
      importance: Notifications.AndroidImportance.HIGH,
    })
  } catch (e) {
    console.warn('[DriverNotifications] Error setting notification channels:', e)
  }
}

// ── Register push token with backend ─────────────────────────────────────────
async function registerTokenWithBackend(token: string) {
  try {
    await api.post('/auth/device-token', { token, platform: Platform.OS })
    console.log('[DriverNotifications] Push token registered with backend')
  } catch (e: any) {
    console.warn('[DriverNotifications] Token registration failed:', e?.response?.data?.detail || e.message)
  }
}

// ── Schedule Actionable Notification with Ringing & Vibration ────────────────
export async function triggerActionableRideNotification(params: {
  title: string
  body: string
  isParcel?: boolean
  data?: any
}) {
  try {
    await ensureNotificationCategories()
    await ensureAndroidChannel()

    // Start loud siren ringing & continuous vibration
    DriverSoundService.playIncomingAlert({ loop: true })

    await Notifications.scheduleNotificationAsync({
      content: {
        title: params.title || 'New Ride Request! 🚖',
        body: params.body || 'Tap to view details or choose Accept/Reject.',
        sound: 'drsiran.mp3',
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: params.isParcel ? 'PARCEL_REQUEST' : 'INCOMING_RIDE',
        data: params.data || {},
        vibrate: [0, 600, 300, 600, 300, 600, 300, 1000],
      },
      trigger: null, // trigger immediately
    })
  } catch (e) {
    console.warn('[DriverNotifications] Failed to schedule actionable notification:', e)
  }
}

// ── Main hook ────────────────────────────────────────────────────────────────
export function useDriverNotifications() {
  const notifListenerRef    = useRef<any>(null)
  const responseListenerRef = useRef<any>(null)

  const requestPermissionsAndRegister = useCallback(async () => {
    await ensureNotificationCategories()
    await ensureAndroidChannel()

    if (!Device.isDevice) {
      console.warn('[DriverNotifications] Push notifications require a physical device.')
      return
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') {
      console.warn('[DriverNotifications] Notification permission denied')
      return
    }

    try {
      const devicePushToken = await Notifications.getDevicePushTokenAsync()
      const token = devicePushToken.data as string
      await registerTokenWithBackend(token)
    } catch (e: any) {
      console.warn('[DriverNotifications] FCM registration check:', e?.message || e)
    }
  }, [])

  useEffect(() => {
    requestPermissionsAndRegister()

    // ── Foreground notification listener ────────────────────────────────────
    notifListenerRef.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('[DriverNotifications] Notification received in app:', notification.request.content.title)
    })

    // ── Notification Action Button / Tap Listener (Works outside app!) ───────
    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(async response => {
      const actionId = response.actionIdentifier
      const data = response.notification.request.content.data as any
      console.log('[DriverNotifications] Action pressed:', actionId, 'data:', data)

      // Always stop ringing siren and stop looping vibration
      try {
        DriverSoundService.stopIncomingAlert()
        Vibration.cancel()
        await Notifications.dismissAllNotificationsAsync()
      } catch {}

      const offerId = data?.offer_id
      const bookingId = data?.booking_id || data?.ride_request_id

      if (
        actionId === 'ACCEPT_RIDE' ||
        actionId === 'ACCEPT_PARCEL' ||
        actionId === Notifications.DEFAULT_ACTION_IDENTIFIER
      ) {
        // Driver accepted or tapped notification
        if (actionId === 'ACCEPT_RIDE' || actionId === 'ACCEPT_PARCEL') {
          try {
            DriverSoundService.playAcceptedSound()
            if (offerId) {
              await api.post('/rides/respond', { offer_id: offerId, accepted: true })
            } else if (bookingId) {
              await api.post('/matching/rides/claim-pending', { ride_request_id: bookingId })
            }
          } catch (err: any) {
            console.warn('[DriverNotifications] Error accepting from notification action:', err)
          }
        }

        // Navigate to active trip
        if (bookingId) {
          router.push({
            pathname: '/active-trip',
            params: { bookingId },
          })
        }
      } else if (actionId === 'REJECT_RIDE' || actionId === 'REJECT_PARCEL') {
        // Driver tapped REJECT button directly on the notification
        if (offerId) {
          try {
            await api.post('/rides/respond', {
              offer_id: offerId,
              accepted: false,
              rejection_reason: 'REJECTED_FROM_NOTIFICATION',
            })
          } catch {}
        }
      }
    })

    return () => {
      notifListenerRef.current?.remove()
      responseListenerRef.current?.remove()
    }
  }, [requestPermissionsAndRegister])
}
