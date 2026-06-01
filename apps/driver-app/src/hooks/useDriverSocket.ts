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
import { io, Socket } from 'socket.io-client'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'

const WS_URL = (process.env.EXPO_PUBLIC_WS_URL || 'http://10.0.2.2:80').replace(/\/api\/v1$/, '')

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

interface UseDriverSocketReturn {
  connected:       boolean
  incomingRequest: IncomingRequest | null
  clearRequest:    () => void

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
}

// ─── Hook ─────────────────────────────────────────────────────
export function useDriverSocket(): UseDriverSocketReturn {
  const socketRef    = useRef<Socket | null>(null)
  const driverIdRef  = useRef<string>('unknown')
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [connected, setConnected]           = useState(false)
  const [incomingRequest, setIncomingRequest] = useState<IncomingRequest | null>(null)

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
      })

      socket.on('BOOKING_EXPIRED', () => setIncomingRequest(null))

      socket.on('SUSPENDED', (data: any) => {
        console.warn('[DriverSocket] Suspended:', data.reason)
        setIncomingRequest(null)
      })

      socket.on('CONNECTED', (data: any) =>
        console.log('[DriverSocket] Gateway ack:', data.message)
      )
    }

    const startHeartbeat = async (s: Socket) => {
      const sendBeat = async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync()
          if (status !== 'granted') {
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
      setConnected(false)
    }
  }, [])

  // ─── Emitters ───────────────────────────────────────────────
  const clearRequest = useCallback(() => setIncomingRequest(null), [])

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

  return {
    connected,
    incomingRequest,
    clearRequest,
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
  }
}
