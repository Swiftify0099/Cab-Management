/**
 * Driver Socket Service — Production WebSocket Manager
 * ─────────────────────────────────────────────────────────────
 * Manages the Socket.IO connection for the driver app.
 *
 * Emits:
 *   LOCATION_UPDATE  — real-time GPS every 5s (production payload)
 *   DRIVER_ONLINE    — driver goes online
 *   DRIVER_OFFLINE   — driver goes offline
 *   TRIP_STARTED     — trip begins
 *   TRIP_COMPLETED   — trip ends
 *   ROUTE_CHANGED    — waypoint/route update
 *   SOS_TRIGGERED    — emergency
 *   PARCEL_PICKED    — parcel pickup confirmed
 *   PARCEL_DELIVERED — parcel delivery confirmed
 *
 * Listens for:
 *   INCOMING_TRIP_REQUEST  — new booking from backend
 *   BOOKING_EXPIRED        — booking timed out
 *   SUSPENDED              — account suspended
 *   CONNECTED              — gateway ack
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import { Vibration } from 'react-native'
import { io, Socket } from 'socket.io-client'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'

const WS_URL = (process.env.EXPO_PUBLIC_WS_URL || 'http://10.0.2.2:80').replace(/\/api\/v1$/, '')
const API    = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:80/api/v1'

// ─── Types ────────────────────────────────────────────────────
export interface IncomingRequest {
  booking_id: string
  driver_id: string
  trip: {
    from: string
    to: string
    departure_time: string
    distance_km: number
    seats: number
    has_parcel: boolean
    fare: number
  }
  customer: { id: string }
  timeout_sec: number
}

/** Full production location payload — Redis Pub/Sub compatible */
export interface LocationUpdatePayload {
  driver_id: string
  lat: number
  lng: number
  speed: number       // km/h
  heading: number     // degrees 0–360
  accuracy: number    // meters
  trip_id: string
  timestamp: number
}

export interface PendingCustomer {
  booking_id: string
  customer_name: string
  pickup_address: string
  pickup_lat: number
  pickup_lng: number
  destination_address: string
  destination_lat: number
  destination_lng: number
  seats_required: number
  parcel: boolean
  from_time: string
  to_time: string
  women_only: boolean
  pickup_distance_km: number
  destination_distance_km: number
}

export interface ArrivalAlertPayload {
  trip_id: string
  booking_id: string
  distance_km: number
  eta_minutes: number | null
  driver_phone?: string   // ONLY sent at arrival (10km threshold)
}

/** Phase 2 — Customer who just entered the 3KM route corridor */
export interface CorridorCustomerPayload {
  trip_id: string
  customer_id: string
  lat: number
  lng: number
  dist_from_route_m: number | null
}

interface UseDriverSocketReturn {
  connected:          boolean
  incomingRequest:    IncomingRequest | null
  pendingCustomers:   PendingCustomer[]   // live scan list updates
  corridorCustomers:  CorridorCustomerPayload[]  // Phase 2: live customers in corridor
  arrivalAlert:       ArrivalAlertPayload | null
  clearRequest:       () => void
  clearArrivalAlert:  () => void
  clearCorridorCustomers: () => void
  removeCorridorCustomer: (customerId: string) => void

  // Location
  sendLocationUpdate: (payload: Omit<LocationUpdatePayload, 'driver_id' | 'timestamp'>) => void
  sendHeartbeat:      (lat: number, lng: number) => void

  // Trip events
  emitDriverOnline:    () => void
  emitDriverOffline:   () => void
  emitTripStarted:     (tripId: string) => void
  emitTripCompleted:   (tripId: string) => void
  emitRouteChanged:    (tripId: string, newRoute: any) => void
  emitSOS:             (payload: { trip_id: string; lat: number; lng: number }) => void
  emitParcelPicked:    (parcelId: string, tripId: string) => void
  emitParcelDelivered: (parcelId: string, tripId: string) => void

  // Scan room
  joinDriverScan:      (tripId: string) => void
}

// ─── Hook ─────────────────────────────────────────────────────
export function useDriverSocket(): UseDriverSocketReturn {
  const socketRef    = useRef<Socket | null>(null)
  const driverIdRef  = useRef<string>('unknown')
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [connected, setConnected]                   = useState(false)
  const [incomingRequest, setIncomingRequest]       = useState<IncomingRequest | null>(null)
  const [pendingCustomers, setPendingCustomers]     = useState<PendingCustomer[]>([])
  const [corridorCustomers, setCorridorCustomers]   = useState<CorridorCustomerPayload[]>([])  // Phase 2
  const [arrivalAlert, setArrivalAlert]             = useState<ArrivalAlertPayload | null>(null)

  // ─── Siren: vibration pattern (buzz-pause x3, mimics alert beeps) ──────────
  const playSiren = useCallback(() => {
    try {
      // Cancel any existing vibration first to prevent stacking
      Vibration.cancel()
      // Finite pattern: 200ms buzz, 100ms pause — 3 times (NOT repeating)
      Vibration.vibrate([0, 200, 100, 200, 100, 200])
    } catch (e) {
      console.warn('[DriverSocket] Vibration failed:', e)
    }
  }, [])

  const stopSiren = useCallback(() => {
    try {
      Vibration.cancel()
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    let socket: Socket | null = null

    const connect = async () => {
      const token = await AsyncStorage.getItem('access_token')
      if (!token) return

      // Load driver ID
      try {
        const raw = await AsyncStorage.getItem('user_data')
        if (raw) {
          const u = JSON.parse(raw)
          driverIdRef.current = u.id || u.driver_id || 'unknown'
        }
      } catch { /* ignore */ }

      socket = io(WS_URL, {
        path: '/socket.io/',
        transports: ['websocket', 'polling'],
        auth: { token: `Bearer ${token}` },
        reconnection: true,
        reconnectionDelay: 3000,
        reconnectionAttempts: 15,
      })

      socketRef.current = socket

      socket.on('connect', () => {
        setConnected(true)
        console.log('[DriverSocket] Connected:', socket!.id)
        socket!.emit('DRIVER_ONLINE', { driver_id: driverIdRef.current, timestamp: Date.now() })
        startHeartbeat(socket!)
      })

      socket.on('disconnect', () => {
        setConnected(false)
        stopHeartbeat()
        console.log('[DriverSocket] Disconnected')
      })

      socket.on('INCOMING_TRIP_REQUEST', (data: IncomingRequest) => {
        console.log('[DriverSocket] Incoming request:', data.booking_id)
        setIncomingRequest(data)
        playSiren()
      })

      // New events
      socket.on('TRIP_REQUEST', (data: IncomingRequest) => {
        console.log('[DriverSocket] TRIP_REQUEST:', data.booking_id)
        setIncomingRequest(data)
        playSiren()
      })

      socket.on('NEW_PENDING_CUSTOMER', (data: PendingCustomer) => {
        console.log('[DriverSocket] New pending customer:', data.booking_id)
        setPendingCustomers(prev => {
          // Avoid duplicates
          if (prev.find(p => p.booking_id === data.booking_id)) return prev
          return [data, ...prev]
        })
      })

      socket.on('ARRIVAL_ALERT', (data: ArrivalAlertPayload) => {
        console.log('[DriverSocket] ARRIVAL_ALERT:', data)
        setArrivalAlert(data)
      })

      socket.on('BOOKING_EXPIRED', () => {
        setIncomingRequest(null)
        stopSiren()
      })

      socket.on('SUSPENDED', (data: any) => {
        console.warn('[DriverSocket] Suspended:', data.reason)
        setIncomingRequest(null)
      })

      socket.on('CONNECTED', (data: any) =>
        console.log('[DriverSocket] Gateway ack:', data.message)
      )

      // ── Phase 2: Corridor matching events ─────────────────────────────────

      // A new customer has entered the 3KM route corridor
      socket.on('CUSTOMER_ENTERED_CORRIDOR', (data: CorridorCustomerPayload) => {
        console.log('[DriverSocket] CUSTOMER_ENTERED_CORRIDOR:', data.customer_id)
        setCorridorCustomers(prev => {
          // Avoid duplicates — update if already in list
          if (prev.find(c => c.customer_id === data.customer_id)) {
            return prev.map(c => c.customer_id === data.customer_id ? data : c)
          }
          return [data, ...prev]
        })
        // Vibrate briefly to alert driver
        try {
          Vibration.cancel()
          Vibration.vibrate([0, 100, 80, 100])
        } catch { /* ignore */ }
      })

      // A customer has left the corridor (timeout or location moved away)
      socket.on('CUSTOMER_EXITED_CORRIDOR', (data: { customer_id: string; trip_id: string }) => {
        console.log('[DriverSocket] CUSTOMER_EXITED_CORRIDOR:', data.customer_id)
        setCorridorCustomers(prev => prev.filter(c => c.customer_id !== data.customer_id))
      })
    }

    const startHeartbeat = async (s: Socket) => {
      // ✅ Request permission ONCE before starting the interval.
      // Calling requestForegroundPermissionsAsync() inside setInterval can cause
      // dialog stacking crashes on Android.
      const { status } = await Location.requestForegroundPermissionsAsync()
      const hasLocationPermission = status === 'granted'

      const sendBeat = async () => {
        try {
          if (!hasLocationPermission) {
            s.emit('heartbeat', { driver_id: driverIdRef.current, ts: Date.now() })
            return
          }
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
          const { latitude, longitude, speed, heading } = loc.coords

          // Emit full production LOCATION_UPDATE every heartbeat
          s.emit('LOCATION_UPDATE', {
            driver_id: driverIdRef.current,
            lat:       latitude,
            lng:       longitude,
            speed:     Math.max(0, Math.round((speed ?? 0) * 3.6)),
            heading:   Math.round(((heading ?? 0) + 360) % 360),
            accuracy:  Math.round(loc.coords.accuracy),
            trip_id:   '',
            timestamp: Date.now(),
          } satisfies LocationUpdatePayload)

          s.emit('heartbeat', { driver_id: driverIdRef.current, ts: Date.now() })
        } catch {
          s.emit('heartbeat', { driver_id: driverIdRef.current, ts: Date.now() })
        }
      }
      await sendBeat()
      heartbeatRef.current = setInterval(sendBeat, 5000)  // Every 5 seconds
    }

    const stopHeartbeat = () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
        heartbeatRef.current = null
      }
    }

    connect()

    return () => {
      stopHeartbeat()
      socket?.emit('DRIVER_OFFLINE', { driver_id: driverIdRef.current, timestamp: Date.now() })
      socket?.disconnect()
      socketRef.current = null
      // NOTE: Do NOT call setConnected(false) here.
      // The component is unmounting; state updates after unmount cause crashes in React 19.
    }
  }, [])

  // ─── Emitters ───────────────────────────────────────────────
  const clearRequest = useCallback(() => {
    setIncomingRequest(null)
    stopSiren()
  }, [stopSiren])

  const clearArrivalAlert = useCallback(() => setArrivalAlert(null), [])

  const sendLocationUpdate = useCallback(
    (payload: Omit<LocationUpdatePayload, 'driver_id' | 'timestamp'>) => {
      socketRef.current?.emit('LOCATION_UPDATE', {
        ...payload,
        driver_id: driverIdRef.current,
        timestamp: Date.now(),
      })
    },
    []
  )

  const sendHeartbeat = useCallback((lat: number, lng: number) => {
    socketRef.current?.emit('LOCATION_UPDATE', {
      driver_id: driverIdRef.current,
      lat,
      lng,
      speed:     0,
      heading:   0,
      accuracy:  0,
      trip_id:   '',
      timestamp: Date.now(),
    })
  }, [])

  const emitDriverOnline   = useCallback(() => {
    socketRef.current?.emit('DRIVER_ONLINE', { driver_id: driverIdRef.current, timestamp: Date.now() })
  }, [])

  const emitDriverOffline  = useCallback(() => {
    socketRef.current?.emit('DRIVER_OFFLINE', { driver_id: driverIdRef.current, timestamp: Date.now() })
  }, [])

  const emitTripStarted    = useCallback((tripId: string) => {
    socketRef.current?.emit('TRIP_STARTED', { driver_id: driverIdRef.current, trip_id: tripId, timestamp: Date.now() })
  }, [])

  const emitTripCompleted  = useCallback((tripId: string) => {
    socketRef.current?.emit('TRIP_COMPLETED', { driver_id: driverIdRef.current, trip_id: tripId, timestamp: Date.now() })
  }, [])

  const emitRouteChanged   = useCallback((tripId: string, newRoute: any) => {
    socketRef.current?.emit('ROUTE_CHANGED', { driver_id: driverIdRef.current, trip_id: tripId, route: newRoute, timestamp: Date.now() })
  }, [])

  const emitSOS            = useCallback((payload: { trip_id: string; lat: number; lng: number }) => {
    socketRef.current?.emit('SOS_TRIGGERED', { ...payload, driver_id: driverIdRef.current, timestamp: Date.now() })
  }, [])

  const emitParcelPicked   = useCallback((parcelId: string, tripId: string) => {
    socketRef.current?.emit('PARCEL_PICKED', { parcel_id: parcelId, trip_id: tripId, driver_id: driverIdRef.current, timestamp: Date.now() })
  }, [])

  const emitParcelDelivered = useCallback((parcelId: string, tripId: string) => {
    socketRef.current?.emit('PARCEL_DELIVERED', { parcel_id: parcelId, trip_id: tripId, driver_id: driverIdRef.current, timestamp: Date.now() })
  }, [])

  const joinDriverScan = useCallback((tripId: string) => {
    socketRef.current?.emit('join_driver_scan', { trip_id: tripId })
  }, [])

  // ── Phase 2: Corridor customer helpers ──────────────────────
  const clearCorridorCustomers = useCallback(() => {
    setCorridorCustomers([])
  }, [])

  const removeCorridorCustomer = useCallback((customerId: string) => {
    setCorridorCustomers(prev => prev.filter(c => c.customer_id !== customerId))
  }, [])

  return {
    connected,
    incomingRequest,
    pendingCustomers,
    corridorCustomers,        // Phase 2
    arrivalAlert,
    clearRequest,
    clearArrivalAlert,
    clearCorridorCustomers,   // Phase 2
    removeCorridorCustomer,   // Phase 2
    sendLocationUpdate,
    sendHeartbeat,
    emitDriverOnline,
    emitDriverOffline,
    emitTripStarted,
    emitTripCompleted,
    emitRouteChanged,
    emitSOS,
    emitParcelPicked,
    emitParcelDelivered,
    joinDriverScan,
  }
}
