/**
 * Map Store — Zustand Global State
 * ─────────────────────────────────────────────────────────────
 * Manages map UI settings and nearby places data
 * shared across all driver map screens.
 */
import { create } from 'zustand'
import type { Place } from '../services/googleMaps'

// ─── Types ────────────────────────────────────────────────────
export type MapTheme = 'light' | 'dark' | 'auto'

interface MapState {
  // Map Display Settings
  theme: MapTheme
  nightMode: boolean
  trafficEnabled: boolean
  showStops: boolean
  showNearbyPlaces: boolean

  // Nearby places cache
  nearbyHotels:       Place[]
  nearbyFuelStations: Place[]
  nearbyRestaurants:  Place[]
  nearbyHospitals:    Place[]

  // Speed monitoring
  speedLimitKmh: number
  currentSpeedKmh: number
  isOverSpeedLimit: boolean

  // Fatigue monitoring
  driveStartTime:     number | null
  totalDriveMinutes:  number
  continuousDriveMinutes: number
  fatigueAlertShown:  boolean

  // ─── Actions ────────────────────────────────────────────────
  setNightMode: (enabled: boolean) => void
  setTheme: (theme: MapTheme) => void
  toggleTraffic: () => void
  toggleStops: () => void
  setNearbyPlaces: (
    hotels: Place[],
    fuel: Place[],
    restaurants: Place[],
    hospitals: Place[]
  ) => void
  updateSpeed: (speedKmh: number) => void
  setSpeedLimit: (limitKmh: number) => void
  startFatigueTracking: () => void
  tickDriveMinute: () => void
  dismissFatigueAlert: () => void
  resetMap: () => void
}

// ─── Initial State ────────────────────────────────────────────
const initial = {
  theme:                 'dark' as MapTheme,
  nightMode:             false,
  trafficEnabled:        true,
  showStops:             true,
  showNearbyPlaces:      true,
  nearbyHotels:          [] as Place[],
  nearbyFuelStations:    [] as Place[],
  nearbyRestaurants:     [] as Place[],
  nearbyHospitals:       [] as Place[],
  speedLimitKmh:         80,
  currentSpeedKmh:       0,
  isOverSpeedLimit:      false,
  driveStartTime:        null as number | null,
  totalDriveMinutes:     0,
  continuousDriveMinutes: 0,
  fatigueAlertShown:     false,
}

// ─── Thresholds ───────────────────────────────────────────────
const FATIGUE_WARNING_HOURS   = 4  // Alert after 4h continuous driving
const FATIGUE_CRITICAL_HOURS  = 2  // Night driving threshold

export const useTripStore_map = create<MapState>((set, get) => ({
  ...initial,

  setNightMode: (enabled) =>
    set({ nightMode: enabled }),

  setTheme: (theme) =>
    set({ theme, nightMode: theme === 'dark' }),

  toggleTraffic: () =>
    set((s) => ({ trafficEnabled: !s.trafficEnabled })),

  toggleStops: () =>
    set((s) => ({ showStops: !s.showStops })),

  setNearbyPlaces: (hotels, fuel, restaurants, hospitals) =>
    set({
      nearbyHotels:       hotels,
      nearbyFuelStations: fuel,
      nearbyRestaurants:  restaurants,
      nearbyHospitals:    hospitals,
    }),

  updateSpeed: (speedKmh) => {
    const limit = get().speedLimitKmh
    set({
      currentSpeedKmh: speedKmh,
      isOverSpeedLimit: speedKmh > limit,
    })
  },

  setSpeedLimit: (limitKmh) =>
    set({ speedLimitKmh: limitKmh }),

  startFatigueTracking: () =>
    set({ driveStartTime: Date.now(), continuousDriveMinutes: 0 }),

  tickDriveMinute: () =>
    set((s) => {
      const next = s.continuousDriveMinutes + 1
      const alertDue = next >= FATIGUE_WARNING_HOURS * 60
      return {
        totalDriveMinutes:      s.totalDriveMinutes + 1,
        continuousDriveMinutes: next,
        fatigueAlertShown:      alertDue && !s.fatigueAlertShown,
      }
    }),

  dismissFatigueAlert: () =>
    set({ fatigueAlertShown: false, continuousDriveMinutes: 0 }),

  resetMap: () => set(initial),
}))

// Re-export as useMapStore for cleaner import
export { useTripStore_map as useMapStore }
