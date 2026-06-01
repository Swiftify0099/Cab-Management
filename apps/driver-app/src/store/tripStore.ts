/**
 * Trip Store — Zustand Global State
 * ─────────────────────────────────────────────────────────────
 * Manages the active trip state across all driver app screens:
 *  - Current route data (polyline, steps, ETA)
 *  - Real-time driver location
 *  - Trip status (idle / active / completed)
 *  - Multi-stop management
 */
import { create } from 'zustand'
import type { RouteData, Coordinate } from '../services/googleMaps'

// ─── Types ────────────────────────────────────────────────────
export type TripStatus = 'idle' | 'searching' | 'en_route' | 'active' | 'completed'

export interface Stop {
  id: string
  label: string
  address: string
  lat: number
  lng: number
  type: 'pickup' | 'dropoff' | 'hotel' | 'fuel' | 'food' | 'parcel_pickup' | 'parcel_drop'
  completed: boolean
  eta?: string
}

export interface ActiveTrip {
  tripId: string
  bookingId: string
  customerId: string
  customerName: string
  from: string
  to: string
  stops: Stop[]
  vehicleType: string
  fareAmount: number
  hasParcel: boolean
  departureTime: string
  totalSeats: number
}

export interface DriverLocation {
  lat: number
  lng: number
  speed: number    // km/h
  heading: number  // degrees
  accuracy: number // meters
}

// ─── Store ────────────────────────────────────────────────────
interface TripState {
  // Status
  status: TripStatus
  activeTrip: ActiveTrip | null

  // Route data from Google Directions API
  route: RouteData | null
  currentStepIndex: number

  // Real-time driver GPS
  driverLocation: DriverLocation | null

  // Accumulated trip stats
  totalDistanceDriven: number  // km
  driveStartTime: number | null

  // ─── Actions ──────────────────────────────────────────────
  setStatus: (status: TripStatus) => void
  setActiveTrip: (trip: ActiveTrip | null) => void
  setRoute: (route: RouteData | null) => void
  updateDriverLocation: (loc: DriverLocation) => void
  advanceStep: () => void
  markStopCompleted: (stopId: string) => void
  startTrip: (trip: ActiveTrip) => void
  endTrip: () => void
  reset: () => void
}

// ─── Initial State ────────────────────────────────────────────
const initialState = {
  status:              'idle' as TripStatus,
  activeTrip:          null,
  route:               null,
  currentStepIndex:    0,
  driverLocation:      null,
  totalDistanceDriven: 0,
  driveStartTime:      null,
}

// ─── Zustand Store ────────────────────────────────────────────
export const useTripStore = create<TripState>((set, get) => ({
  ...initialState,

  setStatus: (status) => set({ status }),

  setActiveTrip: (activeTrip) => set({ activeTrip }),

  setRoute: (route) =>
    set({ route, currentStepIndex: 0 }),

  updateDriverLocation: (loc) =>
    set({ driverLocation: loc }),

  advanceStep: () =>
    set((state) => ({
      currentStepIndex: Math.min(
        state.currentStepIndex + 1,
        (state.route?.steps?.length ?? 1) - 1
      ),
    })),

  markStopCompleted: (stopId) =>
    set((state) => ({
      activeTrip: state.activeTrip
        ? {
            ...state.activeTrip,
            stops: state.activeTrip.stops.map((s) =>
              s.id === stopId ? { ...s, completed: true } : s
            ),
          }
        : null,
    })),

  startTrip: (trip) =>
    set({
      status:         'active',
      activeTrip:     trip,
      driveStartTime: Date.now(),
      currentStepIndex: 0,
    }),

  endTrip: () =>
    set({
      status:      'completed',
      activeTrip:  null,
      route:       null,
      currentStepIndex: 0,
    }),

  reset: () => set(initialState),
}))
