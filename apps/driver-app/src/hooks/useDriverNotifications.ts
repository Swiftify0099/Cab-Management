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
import { RideRequestService } from '../services/rideRequestService'
import { RideQueueService } from '../services/rideQueueService'
import { DriverSocketService } from '../services/driverSocketService'

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
      sound: 'dr_siran',
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
      sound: 'dr_siran',
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
      sound: 'dr_siran',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    })
    await Notifications.setNotificationChannelAsync('hotel-transfers', {
      name: 'Hotel & Airport Transfers',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#8B5CF6',
      enableVibrate: true,
      sound: 'dr_siran',
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

    const channelId = params.isParcel ? 'parcel-requests' : 'ride-requests'

    await Notifications.scheduleNotificationAsync({
      content: {
        title: params.title || 'New Ride Request! 🚖',
        body: params.body || 'Tap to view details or choose Accept/Reject.',
        sound: 'dr_siran.mp3',
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: params.isParcel ? 'PARCEL_REQUEST' : 'INCOMING_RIDE',
        data: params.data || {},
        vibrate: [0, 600, 300, 600, 300, 600, 300, 1000],
        // @ts-ignore — channelId is valid on Android
        channelId: channelId,
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
    try {
      await ensureNotificationCategories().catch(() => {})
      await ensureAndroidChannel().catch(() => {})

      if (!Device.isDevice) {
        console.log('[DriverNotifications] Push notifications require a physical device.')
        return
      }

      const existingStatus = await Notifications.getPermissionsAsync().catch(() => ({ status: 'undetermined' }))
      let finalStatus = existingStatus.status

      if (existingStatus.status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync().catch(() => ({ status: 'denied' }))
        finalStatus = req.status
      }

      if (finalStatus !== 'granted') {
        console.log('[DriverNotifications] Notification permission not granted')
        return
      }

      try {
        const devicePushToken = await Notifications.getDevicePushTokenAsync()
        const token = devicePushToken.data as string
        if (token) {
          await registerTokenWithBackend(token)
        }
      } catch (e: any) {
        console.warn('[DriverNotifications] FCM registration check:', e?.message || e)
      }
    } catch (err: any) {
      console.warn('[DriverNotifications] Setup error (handled):', err?.message || err)
    }
  }, [])

  useEffect(() => {
    requestPermissionsAndRegister()

    // ── Foreground notification listener ────────────────────────────────────
    notifListenerRef.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('[DriverNotifications] Notification received in app:', notification.request.content.title)
    })

    // ── Push Token Refresh Listener ──────────────────────────────────────────
    const pushTokenSub = Notifications.addPushTokenListener((tokenData) => {
      const refreshedToken = tokenData.data as string
      if (refreshedToken) {
        console.log('[DriverNotifications] FCM token refreshed:', refreshedToken.substring(0, 24) + '...')
        registerTokenWithBackend(refreshedToken)
      }
    })

    // ── Common Notification Action Button / Tap Handler ─────────────────────
    let lastHandledResponseTime = 0
    const handleNotificationResponse = async (response: Notifications.NotificationResponse) => {
      if (!response) return
      const now = Date.now()
      // Guard against duplicate execution within 2 seconds
      if (now - lastHandledResponseTime < 2000) return
      lastHandledResponseTime = now

      const actionId = response.actionIdentifier
      const data = (response.notification?.request?.content?.data || {}) as any
      console.log('[DriverNotifications] Action pressed:', actionId, 'data:', data)

      // Always stop ringing siren and stop looping vibration
      try {
        DriverSoundService.stopIncomingAlert()
        Vibration.cancel()
        await Notifications.dismissAllNotificationsAsync()
      } catch {}

      const offerId = data?.offer_id
      const bookingId = data?.booking_id || data?.ride_request_id

      if (actionId === 'ACCEPT_RIDE' || actionId === 'ACCEPT_PARCEL') {
        // ── ACCEPT from notification action button ──────────────────────────────
        if (!offerId && !bookingId) {
          Alert.alert('Error', 'No offer ID in notification. Please open the app to respond.')
          return
        }
        try {
          DriverSoundService.playAcceptedSound()
          const payload = {
            offer_id: offerId || bookingId,
            ride_request_id: bookingId,
            accepted: true,
          }
          let resp: any
          try {
            resp = await api.post('/matching/rides/respond', payload)
          } catch {
            resp = await api.post('/rides/respond', payload)
          }
          const result = resp?.data?.data || resp?.data || {}

          if (result.status === 'superseded' || result.status === 'already_assigned') {
            Alert.alert('Ride Taken', 'Another driver accepted this ride. Check the app for new requests.')
            await DriverSocketService.reconcileStateWithBackend()
            return
          }
          if (result.status === 'driver_busy') {
            Alert.alert(
              '⚠️ Active Ride In Progress',
              'You already have an active ride. Please complete it before accepting a new one.',
              [{ text: 'OK' }],
            )
            return
          }
          if (result.status === 'expired') {
            Alert.alert('Request Expired', 'This ride request has expired.')
            if (offerId) RideQueueService.removeByOfferId(offerId)
            else if (bookingId) RideQueueService.removeByRideRequestId(bookingId)
            return
          }
          if (result.success) {
            const rideId = result.ride_request_id || bookingId || offerId
            if (rideId) {
              router.push({
                pathname: '/active-trip',
                params: {
                  bookingId: rideId,
                  fare: data?.fare,
                  pickupAddress: data?.pickup?.address || data?.pickup_address,
                  destinationAddress: data?.destination?.address || data?.destination_address,
                },
              })
            }
          } else {
            Alert.alert('Accept Failed', result.message || 'Could not accept ride. Please try in the app.')
          }
        } catch (err: any) {
          const errMsg = err?.response?.data?.detail || err?.message || 'Network error'
          Alert.alert('Error', errMsg)
          console.warn('[DriverNotifications] Error accepting from notification action:', err)
        }

      } else if (actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        // ── Driver TAPPED the notification body ──────────────────────────────────
        // Core rule: NEVER blindly navigate. Verify backend state first.
        console.log('[DriverNotifications] Notification tapped — verifying backend state')
        try {
          const pendingOffers = await RideRequestService.fetchPendingOffers()

          if (pendingOffers && pendingOffers.length > 0) {
            RideQueueService.reconcileWithBackend(pendingOffers)
            if (offerId) {
              const matching = pendingOffers.find(o => o.offer_id === offerId)
              if (matching) RideQueueService.upsertRequest(matching)
            }
            router.replace('/(tabs)')
          } else {
            try {
              const activeRide = await RideRequestService.getActiveRide()
              if (activeRide?.is_active) {
                const rideId = activeRide.ride_request_id || bookingId
                if (rideId) router.push({ pathname: '/active-trip', params: { bookingId: rideId } })
                else router.replace('/(tabs)')
              } else {
                Alert.alert(
                  'Request No Longer Available',
                  'This ride was accepted by another driver or has expired.',
                  [{ text: 'OK', onPress: () => router.replace('/(tabs)') }],
                )
              }
            } catch {
              router.replace('/(tabs)')
            }
          }
        } catch (err: any) {
          console.warn('[DriverNotifications] Error verifying notification tap:', err)
          router.replace('/(tabs)')
        }

      } else if (actionId === 'REJECT_RIDE' || actionId === 'REJECT_PARCEL') {
        // ── REJECT from notification action button ──────────────────────────────
        if (offerId) {
          try {
            await api.post('/rides/respond', {
              offer_id: offerId,
              accepted: false,
              rejection_reason: 'REJECTED_FROM_NOTIFICATION',
            })
            RideQueueService.removeByOfferId(offerId)
          } catch {}
        } else if (bookingId) {
          RideQueueService.removeByRideRequestId(bookingId)
        }
      }
    }

    // ── 1. Active / Background notification response listener ────────────────
    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse)

    // ── 2. Cold-Start notification response (App was completely CLOSED/KILLED)
    Notifications.getLastNotificationResponseAsync()
      .then(lastResponse => {
        if (lastResponse) {
          console.log('[DriverNotifications] Cold-start launch detected from notification tap')
          handleNotificationResponse(lastResponse)
        }
      })
      .catch(err => {
        console.warn('[DriverNotifications] getLastNotificationResponseAsync error:', err)
      })

    return () => {
      pushTokenSub?.remove?.()
      notifListenerRef.current?.remove()
      responseListenerRef.current?.remove()
    }
  }, [requestPermissionsAndRegister])
}
