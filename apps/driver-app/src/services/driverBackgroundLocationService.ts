/**
 * Driver Background Location & Presence Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides Android Foreground Service & iOS Background Location Tracking so
 * driver remains ONLINE and receives incoming ride requests even when:
 *  1. App is in the background
 *  2. Phone screen is locked
 *  3. Driver is using another navigation app (Google Maps / Waze)
 */
import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
import { api } from '../api/client'

export const DRIVER_BACKGROUND_LOCATION_TASK = 'CABOOKING_DRIVER_BACKGROUND_LOCATION_TASK'

// ── Top-level TaskManager registration (MUST be at module scope) ───────────────
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
        // 1. Update local AvailabilityService state
        const { AvailabilityService } = require('./availabilityService')
        AvailabilityService.updateLocation(latitude, longitude, accuracy)

        // 2. Ensure Socket is connected & send live location
        const { DriverSocketService } = require('./driverSocketService')
        DriverSocketService.ensureConnected()

        if (DriverSocketService.getState().connected) {
          DriverSocketService.sendLocationUpdate({
            lat: latitude,
            lng: longitude,
            speed: Math.max(0, Math.round((speed ?? 0) * 3.6)),
            heading: Math.round(((heading ?? 0) + 360) % 360),
            accuracy: Math.round(accuracy ?? 5),
            trip_id: '',
          })
        } else {
          // Fallback REST location ping to backend if socket reconnecting
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
      // 1. Check permissions
      const { status: fgStatus } = await Location.getForegroundPermissionsAsync().catch(() => ({ status: 'denied' }))
      if (fgStatus !== 'granted') {
        const { status: reqFg } = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: 'denied' }))
        if (reqFg !== 'granted') return false
      }

      // Background permission
      const { status: bgStatus } = await Location.getBackgroundPermissionsAsync().catch(() => ({ status: 'denied' }))
      if (bgStatus !== 'granted') {
        await Location.requestBackgroundPermissionsAsync().catch(() => {})
      }

      // 2. Check if task is already running
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(DRIVER_BACKGROUND_LOCATION_TASK).catch(() => false)
      if (hasStarted) {
        this.isTrackingStarted = true
        return true
      }

      // 3. Start background location with Android Foreground Service notification
      await Location.startLocationUpdatesAsync(DRIVER_BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 8000,       // 8-second interval
        distanceInterval: 10,     // 10 meters threshold
        deferredUpdatesInterval: 5000,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'CabBooking Partner • You are Online',
          notificationBody: 'Searching for nearby passenger and parcel rides...',
          notificationColor: '#10B981',
          killServiceOnDestroy: false,
        },
        pausesUpdatesAutomatically: false,
        activityType: Location.ActivityType.AutomotiveNavigation,
      })

      this.isTrackingStarted = true
      await AsyncStorage.setItem('@driver_bg_tracking_active', 'true')
      console.log('[DriverBackgroundService] Background location updates started')
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
