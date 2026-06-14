import { useEffect, useRef, useCallback, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import * as SecureStore from 'expo-secure-store'

const WS_URL = (process.env.EXPO_PUBLIC_WS_URL || 'http://10.0.2.2:80').replace(/\/api\/v1$/, '')

// ─── Event Types ──────────────────────────────────────────────────────────────
export type SocketEvent =
  | 'CONNECTED'
  | 'DRIVER_ACCEPTED'
  | 'MATCHING_FAILED'
  | 'LOCATION_UPDATE'
  | 'TRIP_STARTED'
  | 'TRIP_COMPLETED'
  | 'BOOKING_EXPIRED'
  | 'SOS_ACK'
  // New: Full matching flow
  | 'MATCH_FOUND'
  | 'TRIP_REQUEST'
  | 'TRIP_ACCEPTED'
  | 'TRIP_REJECTED'
  | 'ARRIVAL_ALERT'
  | 'SEAT_BOOKED'
  | 'SEAT_FULL'
  // Phase 2: Corridor matching
  | 'CUSTOMER_ENTERED_CORRIDOR'
  | 'CUSTOMER_LOCATION_UPDATE'

// ─── Data shapes ──────────────────────────────────────────────────────────────
export interface DriverInfo {
  driver_id: string
  full_name: string
  rating: number
  vehicle: string
  registration_number: string
  vehicle_type: string
  distance_km: number
  // Phone NOT included here. Only revealed in ArrivalAlertPayload
}

export interface MatchFoundPayload {
  event: 'MATCH_FOUND'
  trip_id: string
  driver_name: string
  vehicle_type: string
  available_seats: number
  departure_time: string
  pickup_address: string
  destination_address: string
  pickup_distance_meters: number
  destination_distance_meters: number
  booking_id: string           // the pending_booking_id
  women_only: boolean
}

export interface TripAcceptedPayload {
  event: 'TRIP_ACCEPTED'
  booking_id: string
  driver: DriverInfo
}

export interface TripRejectedPayload {
  event: 'TRIP_REJECTED'
  booking_id: string
  pending_booking_id?: string
  message: string
}

export interface ArrivalAlertPayload {
  event: 'ARRIVAL_ALERT'
  trip_id: string
  booking_id: string
  distance_km: number
  eta_minutes: number | null
  driver_phone?: string   // Revealed only at 10km threshold
}

export interface LocationUpdatePayload {
  trip_id: string
  driver_id: string
  latitude: number
  longitude: number
  speed_kmh: number
  heading: number
  eta_minutes: number | null
  distance_remaining_km: number | null
}

// ─── Hook return type ──────────────────────────────────────────────────────────
interface UseCustomerSocketReturn {
  connected:       boolean
  socket:          Socket | null

  // Room management
  joinTrip:        (tripId: string) => void
  leaveTrip:       (tripId: string) => void

  // Generic listener
  on:              (event: SocketEvent, handler: (data: any) => void) => void
  off:             (event: SocketEvent, handler: (data: any) => void) => void

  // Stateful reactive events
  matchFound:      MatchFoundPayload | null
  tripAccepted:    TripAcceptedPayload | null
  tripRejected:    TripRejectedPayload | null
  arrivalAlert:    ArrivalAlertPayload | null
  driverLocation:  LocationUpdatePayload | null

  // Clearers
  clearMatchFound:   () => void
  clearTripAccepted: () => void
  clearTripRejected: () => void
  clearArrivalAlert: () => void

  // Phase 2: Location broadcast for corridor matching
  sendLocationUpdate: (lat: number, lng: number) => void
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useCustomerSocket(): UseCustomerSocketReturn {
  const socketRef   = useRef<Socket | null>(null)
  const customerRef = useRef<string>('')   // customer user_id from SecureStore
  const [connected,      setConnected]      = useState(false)
  const [matchFound,     setMatchFound]     = useState<MatchFoundPayload | null>(null)
  const [tripAccepted,   setTripAccepted]   = useState<TripAcceptedPayload | null>(null)
  const [tripRejected,   setTripRejected]   = useState<TripRejectedPayload | null>(null)
  const [arrivalAlert,   setArrivalAlert]   = useState<ArrivalAlertPayload | null>(null)
  const [driverLocation, setDriverLocation] = useState<LocationUpdatePayload | null>(null)

  useEffect(() => {
    let socket: Socket | null = null

    const connect = async () => {
      const token = await SecureStore.getItemAsync('access_token')
      if (!token) return

      socket = io(WS_URL, {
        path: '/socket.io/',
        transports: ['websocket', 'polling'],
        auth: { token: `Bearer ${token}` },
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionAttempts: 10,
      })

      socketRef.current = socket

      socket.on('connect', async () => {
        setConnected(true)
        console.log('[CustomerSocket] Connected:', socket!.id)
        // Load customer user_id and join personal room for event delivery
        try {
          const raw = await SecureStore.getItemAsync('user_data')
          if (raw) {
            const u = JSON.parse(raw)
            const cid = u.id || u.user_id || ''
            customerRef.current = cid
            if (cid) {
              socket!.emit('JOIN_CUSTOMER_ROOM', { customer_id: cid })
              console.log('[CustomerSocket] Joined customer room:', cid)
            }
          }
        } catch { /* ignore */ }
      })

      socket.on('disconnect', (reason) => {
        setConnected(false)
        console.log('[CustomerSocket] Disconnected:', reason)
      })

      socket.on('connect_error', (err) => {
        console.warn('[CustomerSocket] Connection error:', err.message)
      })

      // ── New stateful event listeners ───────────────────────────────────────

      // Pre-booking matched a published trip
      socket.on('MATCH_FOUND', (data: MatchFoundPayload) => {
        console.log('[CustomerSocket] MATCH_FOUND trip_id:', data.trip_id)
        setMatchFound(data)
      })

      // Driver explicitly accepted the booking
      socket.on('TRIP_ACCEPTED', (data: TripAcceptedPayload) => {
        console.log('[CustomerSocket] TRIP_ACCEPTED booking_id:', data.booking_id)
        setTripAccepted(data)
      })

      // Driver rejected (customer stays in search pool)
      socket.on('TRIP_REJECTED', (data: TripRejectedPayload) => {
        console.log('[CustomerSocket] TRIP_REJECTED:', data.message)
        setTripRejected(data)
      })

      // Driver within 10km / 10 minutes
      socket.on('ARRIVAL_ALERT', (data: ArrivalAlertPayload) => {
        console.log('[CustomerSocket] ARRIVAL_ALERT dist:', data.distance_km, 'km')
        setArrivalAlert(data)
      })

      // Live GPS push from driver
      socket.on('LOCATION_UPDATE', (data: LocationUpdatePayload) => {
        setDriverLocation(data)
      })
    }

    connect()

    return () => {
      socket?.disconnect()
      socketRef.current = null
      // NOTE: Do NOT call setConnected(false) here.
      // The component is unmounting; state updates after unmount cause crashes in React 19.
    }
  }, [])

  // ─── Room management ───────────────────────────────────────────────────────
  const joinTrip = useCallback((tripId: string) => {
    socketRef.current?.emit('join_trip', { trip_id: tripId })
  }, [])

  const leaveTrip = useCallback((tripId: string) => {
    socketRef.current?.emit('leave_trip', { trip_id: tripId })
  }, [])

  // ─── Generic listener (for screens that need custom handling) ──────────────
  const on = useCallback((event: SocketEvent, handler: (data: any) => void) => {
    socketRef.current?.on(event, handler)
  }, [])

  const off = useCallback((event: SocketEvent, handler: (data: any) => void) => {
    socketRef.current?.off(event, handler)
  }, [])

  // ─── Clearers ──────────────────────────────────────────────────────────────
  const clearMatchFound   = useCallback(() => setMatchFound(null),   [])
  const clearTripAccepted = useCallback(() => setTripAccepted(null), [])
  const clearTripRejected = useCallback(() => setTripRejected(null), [])
  const clearArrivalAlert = useCallback(() => setArrivalAlert(null), [])

  // ─── Phase 2: Location broadcast for corridor matching ─────────────────
  /**
   * Send current GPS to WebSocket gateway → matching-service → corridor check.
   * Call every ~10 seconds while customer is on matching-waiting or pre-booking screen.
   * Backend responds with MATCH_FOUND if customer enters a trip's 3KM corridor.
   */
  const sendLocationUpdate = useCallback((lat: number, lng: number) => {
    if (!socketRef.current) return
    socketRef.current.emit('CUSTOMER_LOCATION_UPDATE', {
      customer_id: customerRef.current,
      lat,
      lng,
    })
  }, [])

  return {
    connected,
    socket: socketRef.current,
    joinTrip,
    leaveTrip,
    on,
    off,
    matchFound,
    tripAccepted,
    tripRejected,
    arrivalAlert,
    driverLocation,
    clearMatchFound,
    clearTripAccepted,
    clearTripRejected,
    clearArrivalAlert,
    // Phase 2
    sendLocationUpdate,
  }
}
