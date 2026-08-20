/**
 * Location Service
 * ─────────────────────────────────────────────────────────────
 * Battery-optimized, production-grade GPS tracking service.
 * Handles foreground + background location updates and emits
 * real-time location payloads via WebSocket.
 *
 * Location Payload Format (emitted every 3–5 seconds):
 * {
 *   driver_id: string,
 *   lat: number,
 *   lng: number,
 *   speed: number,       // km/h
 *   heading: number,     // degrees 0–360
 *   accuracy: number,    // meters
 *   trip_id: string
 * }
 */
import * as Location from 'expo-location'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { calculateBearing, type Coordinate } from './googleMaps'

// ─── Types ────────────────────────────────────────────────────
export interface LocationPayload {
  driver_id: string
  lat: number
  lng: number
  speed: number
  heading: number
  accuracy: number
  trip_id: string
  timestamp: number
}

export type LocationUpdateCallback = (payload: LocationPayload) => void

// ─── Service State ────────────────────────────────────────────
let _watcher: Location.LocationSubscription | null = null
let _lastCoord: Coordinate | null = null
let _driverId: string | null = null
let _tripId: string | null = null
let _onUpdate: LocationUpdateCallback | null = null
let _isTracking = false

// Minimum distance (meters) before emitting update (battery optimization)
const MIN_DISTANCE_METERS = 15

// ─── Permission Check ─────────────────────────────────────────
export async function requestLocationPermissions(): Promise<boolean> {
  const { status: fg } = await Location.requestForegroundPermissionsAsync()
  if (fg !== 'granted') return false

  // Request background (needed for Android background tracking)
  try {
    const { status: bg } = await Location.requestBackgroundPermissionsAsync()
    if (bg !== 'granted') {
      console.warn('[LocationService] Background permission denied — foreground only')
    }
  } catch {
    // Background permission not available on this platform
  }

  return true
}

// ─── Distance Calculator ──────────────────────────────────────
function haversineDistance(a: Coordinate, b: Coordinate): number {
  const R = 6371000 // Earth radius in meters
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2)
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

// ─── Core Tracking ───────────────────────────────────────────
/**
 * Start GPS tracking for a specific trip.
 * Calls onUpdate every 3–5 seconds with the current location payload.
 *
 * @param tripId  - The active trip ID
 * @param onUpdate - Callback that receives LocationPayload (use to emit via WebSocket)
 */
export async function startTracking(
  tripId: string,
  onUpdate: LocationUpdateCallback
): Promise<boolean> {
  if (_isTracking) stopTracking()

  const permitted = await requestLocationPermissions()
  if (!permitted) {
    console.warn('[LocationService] Location permission denied')
    return false
  }

  _tripId = tripId
  _onUpdate = onUpdate
  _isTracking = true

  // Load driver ID from storage
  try {
    const token = await AsyncStorage.getItem('access_token')
    const userData = await AsyncStorage.getItem('user_data')
    if (userData) {
      const user = JSON.parse(userData)
      _driverId = user.id || user.driver_id || 'unknown'
    }
  } catch { _driverId = 'unknown' }

  _watcher = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 3000,       // Update every 3 seconds
      distanceInterval: MIN_DISTANCE_METERS,
    },
    (location) => {
      const { latitude, longitude, speed, heading, accuracy } = location.coords

      const currentCoord: Coordinate = { lat: latitude, lng: longitude }

      // Calculate heading from movement if device doesn't provide it
      let finalHeading = heading ?? 0
      if (!heading && _lastCoord) {
        finalHeading = calculateBearing(_lastCoord, currentCoord)
      }

      // Skip if not moved enough (battery optimization)
      if (
        _lastCoord &&
        haversineDistance(_lastCoord, currentCoord) < MIN_DISTANCE_METERS
      ) {
        return
      }

      _lastCoord = currentCoord

      const payload: LocationPayload = {
        driver_id: _driverId || 'unknown',
        lat: latitude,
        lng: longitude,
        speed: Math.round((speed ?? 0) * 3.6), // m/s → km/h
        heading: Math.round(finalHeading),
        accuracy: Math.round(accuracy ?? 5),
        trip_id: _tripId || tripId,
        timestamp: Date.now(),
      }

      _onUpdate?.(payload)
    }
  )

  console.log('[LocationService] Tracking started for trip:', tripId)
  return true
}

/**
 * Stop all GPS tracking and clean up watchers.
 * Call this when the trip ends or the screen unmounts.
 */
export function stopTracking(): void {
  _watcher?.remove()
  _watcher = null
  _isTracking = false
  _onUpdate = null
  _lastCoord = null
  _tripId = null
  console.log('[LocationService] Tracking stopped')
}

/**
 * Get the current device location (one-shot, non-watching).
 * Useful for initial map centering.
 */
export async function getCurrentLocation(): Promise<Coordinate | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync()
    if (status !== 'granted') return null

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    })
    return { lat: loc.coords.latitude, lng: loc.coords.longitude }
  } catch (err) {
    console.error('[LocationService] getCurrentLocation error:', err)
    return null
  }
}

/** True if tracking is currently active */
export function isTracking(): boolean {
  return _isTracking
}

/** Returns the last known coordinate */
export function getLastCoordinate(): Coordinate | null {
  return _lastCoord
}
