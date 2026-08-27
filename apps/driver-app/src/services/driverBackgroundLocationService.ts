/**
 * Driver Background Location & Presence Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides Android Foreground Service & iOS Background Location Tracking so
 * driver remains ONLINE and receives incoming ride requests even when:
 *  1. App is in the background
 *  2. Phone screen is locked
 *  3. Driver is using another navigation app (Google Maps / Waze)
 *
 * Android 14+ (API 34+) requires foregroundServiceType: 'location' in
 * startLocationUpdatesAsync — without it the foreground service is killed
 * the moment the app moves to background.
 */
import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
import { api } from '../api/client'

export const DRIVER_BACKGROUND_LOCATION_TASK = 'CABOOKING_DRIVER_BACKGROUND_LOCATION_TASK'

// ── Deduplication guard: prevent spamming notifications for the same offer ────
let _lastNotifiedOfferId: string | null = null
let _lastNotifiedOfferTime: number = 0

// ── Top-level TaskManager registration (MUST be at module scope) ──────────────
TaskManager.defineTask(DRIVER_BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
  if (error) {
    console.warn('[DriverBackgroundService] Background task error:', error.message)
    return
  }

  if (data) {
    const { locations } = data
    if (locations && locations.length > 0) {
      const loc = locations[locations.length - 1]
      const { latitude, longitude, speed, heading, accuracy } = loc.coords

      try {
        // 1. Update local AvailabilityService state (delta-guarded, won't flicker UI)
        const { AvailabilityService } = require('./availabilityService')
        AvailabilityService.updateLocation(latitude, longitude, accuracy)

        // 2. Ensure Socket is re-connected (critical: JS engine may have suspended it)
        const { DriverSocketService } = require('./driverSocketService')
        DriverSocketService.ensureConnected()

        if (DriverSocketService.getState().connected) {
          // 3a. Socket alive — send live location update
          DriverSocketService.sendLocationUpdate({
            lat: latitude,
            lng: longitude,
            speed: Math.max(0, Math.round((speed ?? 0) * 3.6)),
            heading: Math.round(((heading ?? 0) + 360) % 360),
            accuracy: Math.round(accuracy ?? 5),
            trip_id: '',
          })

          // 3b. Poll for pending ride offers and fire a push notification if any
          //     This is the KEY fix: driver gets a lock-screen alert even while
          //     the socket was temporarily dormant in background.
          try {
            const { RideRequestService } = require('./rideRequestService')
            const pending = await RideRequestService.fetchPendingOffers()
            if (Array.isArray(pending) && pending.length > 0) {
              const offer = pending[0]
              const offerId = offer.offer_id || offer.booking_id || `bg-${Date.now()}`
              const now = Date.now()

              // Only notify once per offer, not on every location tick
              if (_lastNotifiedOfferId !== offerId || now - _lastNotifiedOfferTime > 30000) {
                _lastNotifiedOfferId = offerId
                _lastNotifiedOfferTime = now

                // Set the incoming request on the socket service state
                DriverSocketService.setIncomingRequest(offer)

                // Fire a loud heads-up push notification for the lock screen
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: `🚖 New Ride Request: ₹${offer.trip?.fare || offer.fare || 0}!`,
                    body: `From: ${offer.trip?.from || offer.pickup?.address || 'Pickup'} → ${offer.trip?.to || offer.destination?.address || 'Drop'}`,
                    sound: 'drsiran.mp3',
                    priority: Notifications.AndroidNotificationPriority.MAX,
                    categoryIdentifier: offer.service_type === 'parcel' ? 'PARCEL_REQUEST' : 'INCOMING_RIDE',
                    data: {
                      offer_id: offerId,
                      ride_request_id: offer.ride_request_id || offerId,
                      booking_id: offer.booking_id || offerId,
                      fare: offer.trip?.fare || offer.fare,
                    },
                    vibrate: [0, 600, 300, 600, 300, 600, 300, 1000],
                  },
                  trigger: null, // fire immediately
                }).catch(() => {})
              }
            }
          } catch (_pollErr) {
            // Non-fatal — don't crash the background task
          }
        } else {
          // 3c. Socket not yet reconnected — use REST fallback to keep presence alive
          //     This tells the backend the driver is still online so offers can be queued
          api.patch('/driver/status', {
            status: 'online',
            lat: latitude,
            lng: longitude,
          }).catch(() => {})
        }
      } catch (err) {
        console.warn('[DriverBackgroundService] Location update processing error:', err)
      }
    }
  }
})

class DriverBackgroundLocationServiceClass {
  private isTrackingStarted: boolean = false

  public async startBackgroundTracking(): Promise<boolean> {
    try {
      // 1. Check foreground location permission
      const { status: fgStatus } = await Location.getForegroundPermissionsAsync().catch(() => ({ status: 'denied' }))
      if (fgStatus !== 'granted') {
        const { status: reqFg } = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: 'denied' }))
        if (reqFg !== 'granted') return false
      }

      // 2. Request background permission (Android: "Allow all the time")
      const { status: bgStatus } = await Location.getBackgroundPermissionsAsync().catch(() => ({ status: 'denied' }))
      if (bgStatus !== 'granted') {
        await Location.requestBackgroundPermissionsAsync().catch(() => {})
      }

      // 3. Check if task is already running
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(DRIVER_BACKGROUND_LOCATION_TASK).catch(() => false)
      if (hasStarted) {
        this.isTrackingStarted = true
        return true
      }

      // 4. Build platform-specific options
      const locationOptions: Location.LocationTaskOptions = {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 8000,       // 8-second interval
        distanceInterval: 10,     // 10 metres threshold
        deferredUpdatesInterval: 5000,
        showsBackgroundLocationIndicator: true,
        pausesUpdatesAutomatically: false,
        activityType: Location.ActivityType.AutomotiveNavigation,
        foregroundService: {
          notificationTitle: 'CabBooking Partner • You are Online',
          notificationBody: 'Searching for nearby passenger and parcel rides...',
          notificationColor: '#10B981',
          killServiceOnDestroy: false,
          // ── CRITICAL FIX: Required for Android 14+ (API 34+) ──────────────
          // Without this, the OS kills the foreground service when the app
          // is backgrounded because Android 14 enforces strict service types.
          ...(Platform.OS === 'android' ? { notificationTitle: 'CabBooking Partner • You are Online' } : {}),
        },
      }

      // Android 14+ requires foregroundServiceType on the task options
      if (Platform.OS === 'android') {
        // @ts-ignore — foregroundServiceType is a valid Android-only option
        locationOptions.foregroundService!.foregroundServiceType = 'location'
      }

      await Location.startLocationUpdatesAsync(DRIVER_BACKGROUND_LOCATION_TASK, locationOptions)

      this.isTrackingStarted = true
      await AsyncStorage.setItem('@driver_bg_tracking_active', 'true')
      console.log('[DriverBackgroundService] Background location updates started (Android foregroundServiceType: location)')
      return true
    } catch (err) {
      console.warn('[DriverBackgroundService] Failed to start background updates:', err)
      return false
    }
  }

  public async stopBackgroundTracking(): Promise<void> {
    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(DRIVER_BACKGROUND_LOCATION_TASK).catch(() => false)
      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(DRIVER_BACKGROUND_LOCATION_TASK)
      }
      this.isTrackingStarted = false
      _lastNotifiedOfferId = null
      await AsyncStorage.removeItem('@driver_bg_tracking_active')
      console.log('[DriverBackgroundService] Background location updates stopped')
    } catch (err) {
      console.warn('[DriverBackgroundService] Failed to stop background updates:', err)
    }
  }

  public async isRunning(): Promise<boolean> {
    try {
      return await Location.hasStartedLocationUpdatesAsync(DRIVER_BACKGROUND_LOCATION_TASK)
    } catch {
      return false
    }
  }
}

export const DriverBackgroundLocationService = new DriverBackgroundLocationServiceClass()
