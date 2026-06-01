/**
 * useLiveLocation Hook
 * ─────────────────────────────────────────────────────────────
 * Manages foreground GPS tracking for the active driver.
 * Returns real-time lat/lng, speed, heading, and accuracy.
 * Starts/stops tracking automatically based on React lifecycle.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import * as Location from 'expo-location'
import { calculateBearing, type Coordinate } from '../services/googleMaps'

// ─── Types ────────────────────────────────────────────────────
export interface LiveLocation {
  lat: number
  lng: number
  speed: number      // km/h
  heading: number    // degrees 0–360
  accuracy: number   // meters
  timestamp: number
}

export interface LiveLocationResult {
  location: LiveLocation | null
  isTracking: boolean
  permissionGranted: boolean | null
  startTracking: () => Promise<void>
  stopTracking: () => void
}

// ─── Hook ─────────────────────────────────────────────────────
/**
 * Starts GPS tracking when mounted (if autoStart=true).
 * Updates every 3 seconds with battery-efficient settings.
 */
export function useLiveLocation(
  autoStart: boolean = false,
  onUpdate?: (loc: LiveLocation) => void
): LiveLocationResult {
  const [location, setLocation]       = useState<LiveLocation | null>(null)
  const [isTracking, setTracking]     = useState(false)
  const [permissionGranted, setPerm]  = useState<boolean | null>(null)
  const watcherRef  = useRef<Location.LocationSubscription | null>(null)
  const prevCoordRef = useRef<Coordinate | null>(null)

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync()
    const granted = status === 'granted'
    setPerm(granted)
    return granted
  }, [])

  const startTracking = useCallback(async () => {
    if (isTracking) return
    const ok = await requestPermission()
    if (!ok) return

    setTracking(true)

    watcherRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 3000,
        distanceInterval: 10,
      },
      (loc) => {
        const { latitude, longitude, speed, heading, accuracy } = loc.coords
        const curr: Coordinate = { lat: latitude, lng: longitude }

        // Calculate heading from movement if device doesn't provide it
        let finalHeading = heading ?? 0
        if ((heading === null || heading < 0) && prevCoordRef.current) {
          finalHeading = calculateBearing(prevCoordRef.current, curr)
        }
        prevCoordRef.current = curr

        const update: LiveLocation = {
          lat: latitude,
          lng: longitude,
          speed:   Math.max(0, Math.round((speed ?? 0) * 3.6)), // m/s → km/h
          heading: Math.round(((finalHeading % 360) + 360) % 360),
          accuracy: Math.round(accuracy),
          timestamp: loc.timestamp,
        }

        setLocation(update)
        onUpdate?.(update)
      }
    )
  }, [isTracking, requestPermission, onUpdate])

  const stopTracking = useCallback(() => {
    watcherRef.current?.remove()
    watcherRef.current = null
    setTracking(false)
  }, [])

  // Auto-start if requested
  useEffect(() => {
    if (autoStart) startTracking()
    return () => stopTracking()
  }, [autoStart])

  return { location, isTracking, permissionGranted, startTracking, stopTracking }
}
