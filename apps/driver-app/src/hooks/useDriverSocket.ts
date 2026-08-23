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
import * as SecureStore from 'expo-secure-store'
import * as Location from 'expo-location'
import * as Notifications from 'expo-notifications'
import { DriverSoundService } from '../services/driverSoundService'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

// Fallbacks point to host IP: 8010 for WS gateway, 80 for API gateway
const WS_URL = (process.env.EXPO_PUBLIC_WS_URL || 'https://cab-management-1.onrender.com').replace(/\/api\/v1$/, '')
const API    = process.env.EXPO_PUBLIC_API_URL || 'https://cab-management-1.onrender.com/api/v1'

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

  joinDriverScan:      (tripId: string) => void
  respondToRideOffer:  (offerId: string, accepted: boolean, rejectionReason?: string) => void
  setIncomingRequest:  React.Dispatch<React.SetStateAction<IncomingRequest | null>>

  // Generic Event Listeners
  on:  (event: string, callback: (...args: any[]) => void) => void
  off: (event: string, callback?: (...args: any[]) => void) => void
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

  // ─── Siren: Dynamic Driver Siren & Looping Vibration ───────────────────────
  const playSiren = useCallback(() => {
    try {
      DriverSoundService.playIncomingAlert({ loop: true })

      Notifications.scheduleNotificationAsync({
        content: {
          title: "New Customer Request! 🚕",
          body: "A customer needs a ride/delivery. Tap to view and accept.",
          sound: 'drsiran.mp3',
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: null,
      }).catch(() => {})
    } catch (e) {
      console.warn('[DriverSocket] Siren failed:', e)
    }
  }, [])

  const stopSiren = useCallback(() => {
    try {
      DriverSoundService.stopIncomingAlert()
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    let socket: Socket | null = null

    const connect = async () => {
      const token = await SecureStore.getItemAsync('access_token')
      if (!token) return

      // Load driver ID from SecureStore (stored as JSON string during OTP login)
      try {
        const raw = await SecureStore.getItemAsync('user_data')
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

      // Request notification permission once (needed for Android 13+ to show alerts)
      try {
        const { status: notifStatus } = await Notifications.requestPermissionsAsync()
        if (notifStatus !== 'granted') {
          console.warn('[DriverSocket] Notification permission not granted')
        }
      } catch { /* ignore on simulators */ }

      socket.on('connect', () => {
        setConnected(true)
        console.log('[DriverSocket] Connected:', socket!.id)
        try {
          const { AvailabilityService } = require('../services/availabilityService')
          AvailabilityService.setSocketInstance(socket)
          AvailabilityService.handleNetworkChange(true)
        } catch {}
        socket!.emit('DRIVER_ONLINE', { driver_id: driverIdRef.current, timestamp: Date.now() })
        startHeartbeat(socket!)
      })

      socket.on('disconnect', () => {
        setConnected(false)
        stopHeartbeat()
        console.log('[DriverSocket] Disconnected')
        try {
          const { AvailabilityService } = require('../services/availabilityService')
          AvailabilityService.handleNetworkChange(false)
        } catch {}
      })

      // ─── Feature 5: On-Demand Ride Request Events ───────────────────────
      socket.on('RIDE_REQUEST_NEW', (data: any) => {
        console.log('[DriverSocket] RIDE_REQUEST_NEW:', data.offer_id, 'Fare:', data.trip?.fare)
        const normalized: IncomingRequest = {
          offer_id:        data.offer_id,
          ride_request_id: data.ride_request_id,
          booking_id:      data.booking_id || data.ride_request_id,
          driver_id:       data.driver_id || driverIdRef.current,
          pickup:          data.pickup,
          destination:     data.destination,
          trip: data.trip || {
            from:           data.pickup?.address || '',
            to:             data.destination?.address || '',
            departure_time: new Date().toISOString(),
            distance_km:    data.pickup?.distance_km || 0,
            seats:          data.seat_info?.requested_seats || 1,
            has_parcel:     false,
            fare:           data.trip?.fare || 0,
            earning:        data.trip?.earning || 0,
          },
          category:    data.category || { name: 'Economy', icon: 'car' },
          seat_info:   data.seat_info || {
            total_seats: 4,
            available_seats: 4,
            available_labels: ['Front Window', 'Rear Left', 'Rear Right', 'Rear Middle'],
            requested_seats: 1,
          },
          customer:    data.customer || { id: '' },
          timeout_sec: data.timeout_sec || 180,
          expires_at:  data.expires_at || new Date(Date.now() + 180000).toISOString(),
          paid:        data.paid ?? true,
        } as any

        setIncomingRequest(normalized)
        playSiren()
      })

      socket.on('RIDE_REQUEST_EXPIRED', (data: any) => {
        console.log('[DriverSocket] RIDE_REQUEST_EXPIRED:', data.offer_id)
        setIncomingRequest(null)
        stopSiren()
      })

      socket.on('RIDE_REQUEST_CANCELLED', (data: any) => {
        console.log('[DriverSocket] RIDE_REQUEST_CANCELLED:', data.ride_request_id)
        setIncomingRequest(null)
        stopSiren()
      })

      socket.on('RIDE_REQUEST_REMOVED', (data: any) => {
        console.log('[DriverSocket] RIDE_REQUEST_REMOVED (Assigned to other or cancelled):', data.ride_request_id)
        setIncomingRequest(null)
        stopSiren()
      })

      socket.on('RIDE_ASSIGNED', (data: any) => {
        console.log('[DriverSocket] RIDE_ASSIGNED:', data.ride_request_id)
      })

      socket.on('INCOMING_TRIP_REQUEST', (data: any) => {
        console.log('[DriverSocket] Incoming request:', data.booking_id)
        // Normalize: backend may send nested {trip:{from,to,...}} or flat fields
        const normalized: IncomingRequest = {
          booking_id: data.booking_id,
          driver_id:  data.driver_id || '',
          trip: data.trip || {
            from:           data.pickup_address || data.from || '',
            to:             data.destination_address || data.to || '',
            departure_time: data.timestamp || new Date().toISOString(),
            distance_km:    data.distance_km || 0,
            seats:          data.seats || data.seat_count || 1,
            has_parcel:     data.parcel || data.has_parcel || false,
            fare:           data.fare || 0,
          },
          customer:    data.customer || { id: '' },
          timeout_sec: data.timeout_sec || 180,
          paid:        data.paid || false,
        } as any
        setIncomingRequest(normalized)
        playSiren()
      })

      // New events
      socket.on('TRIP_REQUEST', (data: any) => {
        console.log('[DriverSocket] TRIP_REQUEST:', data.booking_id)
        const normalized: IncomingRequest = {
          booking_id: data.booking_id,
          driver_id:  data.driver_id || '',
          trip: data.trip || {
            from:           data.pickup_address || '',
            to:             data.destination_address || '',
            departure_time: data.timestamp || new Date().toISOString(),
            distance_km:    data.distance_km || 0,
            seats:          data.seats || 1,
            has_parcel:     data.parcel || false,
            fare:           data.fare || 0,
          },
          customer:    data.customer || { id: '' },
          timeout_sec: data.timeout_sec || 180,
        } as any
        setIncomingRequest(normalized)
        playSiren()
      })

      socket.on('PARCEL_REQUEST', (data: any) => {
        console.log('[DriverSocket] PARCEL_REQUEST:', data.booking_id || data.offer_id)
        const normalized: IncomingRequest = {
          booking_id: data.booking_id || data.offer_id || `parcel-${Date.now()}`,
          offer_id: data.offer_id,
          driver_id: data.driver_id || driverIdRef.current,
          service_type: 'parcel',
          pickup: data.pickup || { address: data.pickup_address || 'Parcel Pickup Point', lat: 18.5204, lng: 73.8567 },
          destination: data.destination || { address: data.destination_address || 'Parcel Delivery Point', lat: 18.5913, lng: 73.7389 },
          trip: {
            from: data.pickup_address || data.pickup?.address || 'Pickup Point',
            to: data.destination_address || data.destination?.address || 'Delivery Destination',
            departure_time: new Date().toISOString(),
            distance_km: data.distance_km || data.pickup?.distance_km || 8.5,
            seats: 0,
            has_parcel: true,
            fare: data.fare || data.trip?.fare || 180,
            earning: data.earning || data.trip?.earning || 144,
          },
          category: { name: 'Parcel Express', icon: 'package' },
          customer: data.customer || { id: '' },
          timeout_sec: data.timeout_sec || 180,
        } as any
        setIncomingRequest(normalized)
        playSiren()
      })

      socket.on('HOTEL_TRANSFER_REQUEST', (data: any) => {
        console.log('[DriverSocket] HOTEL_TRANSFER_REQUEST:', data.booking_id || data.offer_id)
        const normalized: IncomingRequest = {
          booking_id: data.booking_id || data.offer_id || `hotel-${Date.now()}`,
          offer_id: data.offer_id,
          driver_id: data.driver_id || driverIdRef.current,
          service_type: 'hotel',
          pickup: data.pickup || { address: data.pickup_address || 'Hotel Lobby / Airport', lat: 18.5822, lng: 73.9197 },
          destination: data.destination || { address: data.destination_address || 'Destination Hotel', lat: 18.5362, lng: 73.8939 },
          trip: {
            from: data.pickup_address || data.pickup?.address || 'Pickup Hub',
            to: data.destination_address || data.destination?.address || 'Dropoff Point',
            departure_time: new Date().toISOString(),
            distance_km: data.distance_km || 15.2,
            seats: data.seats || 2,
            has_parcel: false,
            fare: data.fare || 650,
            earning: data.earning || 520,
          },
          category: { name: 'Hotel Transfer', icon: 'domain' },
          customer: data.customer || { id: '' },
          timeout_sec: data.timeout_sec || 180,
        } as any
        setIncomingRequest(normalized)
        playSiren()
      })

      socket.on('TRANSPORT_REQUEST', (data: any) => {
        console.log('[DriverSocket] TRANSPORT_REQUEST:', data.booking_id)
        const normalized: IncomingRequest = {
          booking_id: data.booking_id || `trans-${Date.now()}`,
          offer_id: data.offer_id,
          driver_id: data.driver_id || driverIdRef.current,
          service_type: 'transport',
          pickup: data.pickup || { address: data.pickup_address || 'Transport Hub', lat: 18.5204, lng: 73.8567 },
          destination: data.destination || { address: data.destination_address || 'Intercity Destination', lat: 18.9220, lng: 72.8347 },
          trip: {
            from: data.pickup_address || 'Pickup City',
            to: data.destination_address || 'Destination City',
            departure_time: new Date().toISOString(),
            distance_km: data.distance_km || 148,
            seats: data.seats || 3,
            has_parcel: false,
            fare: data.fare || 1850,
            earning: data.earning || 1480,
          },
          category: { name: 'Intercity Transport', icon: 'bus' },
          customer: data.customer || { id: '' },
          timeout_sec: data.timeout_sec || 180,
        } as any
        setIncomingRequest(normalized)
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
            accuracy:  Math.round(loc.coords.accuracy ?? 5),
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

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    socketRef.current?.on(event, callback)
  }, [])

  const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
    if (callback) {
      socketRef.current?.off(event, callback)
    } else {
      socketRef.current?.off(event)
    }
  }, [])

  // ── Phase 2: Corridor customer helpers ──────────────────────
  const clearCorridorCustomers = useCallback(() => {
    setCorridorCustomers([])
  }, [])

  const removeCorridorCustomer = useCallback((customerId: string) => {
    setCorridorCustomers(prev => prev.filter(c => c.customer_id !== customerId))
  }, [])

  const respondToRideOffer = useCallback((offerId: string, accepted: boolean, rejectionReason?: string) => {
    socketRef.current?.emit('ride_request_respond', {
      offer_id: offerId,
      accepted,
      rejection_reason: rejectionReason,
      driver_id: driverIdRef.current,
      timestamp: Date.now(),
    })
  }, [])

  return {
    connected,
    incomingRequest,
    setIncomingRequest,
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
    respondToRideOffer,
    on,
    off,
  }
}
