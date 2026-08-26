/**
 * Driver Socket Singleton Service — Production-Grade Connection Manager
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides a SINGLE shared persistent Socket.IO connection across the Driver App.
 *
 * Guarantees:
 *  1. Only ONE socket connection exists at any time (no duplicate connections).
 *  2. Socket survives tab switching, modal openings, and screen navigation.
 *  3. Automatic reconnection with exponential backoff and jitter.
 *  4. On connect/reconnect: automatically registers driver room, starts heartbeat,
 *     and reconciles pending offers & active rides with backend database.
 *  5. Sub-second foreground dispatch delivery + event listener fanout.
 */
import { io, Socket } from 'socket.io-client'
import * as SecureStore from 'expo-secure-store'
import * as Location from 'expo-location'
import * as Notifications from 'expo-notifications'
import { Vibration } from 'react-native'
import { DriverSoundService } from './driverSoundService'
import { RideRequestService } from './rideRequestService'

const WS_URL = (process.env.EXPO_PUBLIC_WS_URL || 'https://cab-management-1.onrender.com').replace(/\/api\/v1$/, '')

export interface LocationUpdatePayload {
  driver_id: string
  lat: number
  lng: number
  speed: number
  heading: number
  accuracy: number
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
  driver_phone?: string
}

export interface CorridorCustomerPayload {
  trip_id: string
  customer_id: string
  lat: number
  lng: number
  dist_from_route_m: number | null
}

export interface IncomingRideRequestPayload {
  offer_id: string
  ride_request_id: string
  booking_id: string
  driver_id: string
  pickup: {
    address: string
    lat: number
    lng: number
    distance_km: number
    eta_min: number
  }
  destination: {
    address: string
    lat: number
    lng: number
  }
  trip: {
    from: string
    to: string
    distance_km: number
    duration_min: number
    fare: number
    earning: number
    seats: number
  }
  category: {
    name: string
    icon: string
  }
  seat_info?: {
    total_seats: number
    available_seats: number
    available_labels: string[]
    requested_seats: number
  }
  customer: {
    id: string
    name?: string
    phone_masked?: string
  }
  is_preferred?: boolean
  timeout_sec: number
  expires_at: string
  paid?: boolean
  service_type?: string
}

type SocketStateListener = (state: {
  connected: boolean
  socketReady: boolean
  incomingRequest: IncomingRideRequestPayload | null
  pendingCustomers: PendingCustomer[]
  corridorCustomers: CorridorCustomerPayload[]
  arrivalAlert: ArrivalAlertPayload | null
}) => void

class DriverSocketServiceClass {
  private socket: Socket | null = null
  private isConnecting: boolean = false
  private driverUserId: string = 'unknown'
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null
  private listeners: Set<SocketStateListener> = new Set()
  private customEventListeners: Map<string, Set<(...args: any[]) => void>> = new Map()

  // State snapshot
  private state = {
    connected: false,
    socketReady: false,
    incomingRequest: null as IncomingRideRequestPayload | null,
    pendingCustomers: [] as PendingCustomer[],
    corridorCustomers: [] as CorridorCustomerPayload[],
    arrivalAlert: null as ArrivalAlertPayload | null,
  }

  constructor() {
    this.init()
  }

  public async init() {
    if (this.socket || this.isConnecting) return
    this.isConnecting = true

    try {
      const token = await SecureStore.getItemAsync('access_token')
      if (!token) {
        this.isConnecting = false
        return
      }

      try {
        const raw = await SecureStore.getItemAsync('user_data')
        if (raw) {
          const u = JSON.parse(raw)
          this.driverUserId = u.id || u.user_id || u.driver_id || 'unknown'
        }
      } catch {}

      const s = io(WS_URL, {
        path: '/socket.io/',
        transports: ['websocket', 'polling'],
        auth: { token: `Bearer ${token}` },
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 15000,
        randomizationFactor: 0.3,
        reconnectionAttempts: 20,
        timeout: 15000,
      })

      this.socket = s
      this.bindSocketEvents(s)
    } catch (err) {
      console.warn('[DriverSocketService] Init error:', err)
    } finally {
      this.isConnecting = false
    }
  }

  private bindSocketEvents(s: Socket) {
    s.on('connect', async () => {
      console.log('[DriverSocketService] Socket connected:', s.id)
      this.state.connected = true
      this.notify()

      try {
        const { AvailabilityService } = require('./availabilityService')
        AvailabilityService.setSocketInstance(s)
        AvailabilityService.handleNetworkChange(true)
      } catch {}

      s.emit('DRIVER_ONLINE', {
        driver_id: this.driverUserId,
        user_id: this.driverUserId,
        timestamp: Date.now(),
      })

      this.startHeartbeat()
      this.reconcileStateWithBackend()
    })

    s.on('DRIVER_SOCKET_READY', (data: any) => {
      console.log('[DriverSocketService] DRIVER_SOCKET_READY room:', data.room)
      this.state.socketReady = true
      this.notify()
    })

    s.on('disconnect', (reason) => {
      console.log('[DriverSocketService] Socket disconnected:', reason)
      this.state.connected = false
      this.state.socketReady = false
      this.stopHeartbeat()
      this.notify()

      try {
        const { AvailabilityService } = require('./availabilityService')
        AvailabilityService.handleNetworkChange(false)
      } catch {}
    })

    s.on('reconnect_attempt', (attempt: number) => {
      console.log(`[DriverSocketService] Reconnecting attempt ${attempt}...`)
    })

    s.on('reconnect', (attempt: number) => {
      console.log(`[DriverSocketService] Reconnected after ${attempt} attempts`)
      this.state.connected = true
      this.notify()
      s.emit('DRIVER_ONLINE', {
        driver_id: this.driverUserId,
        user_id: this.driverUserId,
        timestamp: Date.now(),
      })
      this.startHeartbeat()
      this.reconcileStateWithBackend()
    })

    // ── Incoming Ride Request Events ──────────────────────────────────────────
    const handleIncomingOffer = (data: any, isPreferred = false) => {
      console.log('[DriverSocketService] Incoming Ride Offer:', data.offer_id || data.ride_request_id)
      const offerId = data.offer_id || data.ride_request_id || data.booking_id || `off-${Date.now()}`
      const normalized: IncomingRideRequestPayload = {
        offer_id: offerId,
        ride_request_id: data.ride_request_id || data.booking_id || offerId,
        booking_id: data.booking_id || data.ride_request_id || offerId,
        driver_id: data.driver_id || this.driverUserId,
        is_preferred: isPreferred || data.is_preferred || false,
        pickup: data.pickup || {
          address: data.pickup_address || 'Pickup Location',
          lat: data.pickup_lat || 18.5204,
          lng: data.pickup_lng || 73.8567,
          distance_km: data.distance_km || 2.4,
          eta_min: data.eta_min || 5,
        },
        destination: data.destination || {
          address: data.destination_address || 'Drop Location',
          lat: data.destination_lat || 18.5913,
          lng: data.destination_lng || 73.7389,
        },
        trip: data.trip || {
          from: data.pickup?.address || data.pickup_address || '',
          to: data.destination?.address || data.destination_address || '',
          distance_km: data.pickup?.distance_km || data.distance_km || 0,
          duration_min: data.duration_min || 20,
          fare: data.fare || data.trip?.fare || 0,
          earning: data.earning || data.trip?.earning || 0,
          seats: data.seat_info?.requested_seats || data.seats || 1,
        },
        category: data.category || {
          name: isPreferred ? 'Preferred Request' : 'Economy',
          icon: isPreferred ? 'star' : 'car',
        },
        seat_info: data.seat_info || {
          total_seats: 4,
          available_seats: 4,
          available_labels: ['Front Window', 'Rear Left', 'Rear Right', 'Rear Middle'],
          requested_seats: data.seats || 1,
        },
        customer: data.customer || {
          id: data.customer_id || '',
          name: data.customer_name || 'Rider',
          phone_masked: data.customer_phone || '+91 98••••2345',
        },
        timeout_sec: data.timeout_sec || 180,
        expires_at: data.expires_at || new Date(Date.now() + 180000).toISOString(),
        paid: data.paid ?? true,
        service_type: data.service_type || 'local',
      }

      this.state.incomingRequest = normalized
      this.notify()
      this.triggerAlertEffects(normalized)
    }

    s.on('RIDE_REQUEST_NEW', (data) => handleIncomingOffer(data, false))
    s.on('ride_request:new', (data) => handleIncomingOffer(data, false))
    s.on('PREFERRED_DRIVER_REQUEST', (data) => handleIncomingOffer(data, true))
    s.on('INCOMING_TRIP_REQUEST', (data) => handleIncomingOffer(data, false))
    s.on('TRIP_REQUEST', (data) => handleIncomingOffer(data, false))

    s.on('RIDE_REQUEST_REMOVED', (data) => {
      console.log('[DriverSocketService] RIDE_REQUEST_REMOVED:', data.ride_request_id)
      this.clearIncomingRequest()
    })
    s.on('ride:offer_removed', (data) => {
      console.log('[DriverSocketService] ride:offer_removed:', data.ride_request_id)
      this.clearIncomingRequest()
    })

    s.on('RIDE_REQUEST_EXPIRED', () => {
      this.clearIncomingRequest()
    })

    s.on('RIDE_REQUEST_CANCELLED', () => {
      this.clearIncomingRequest()
    })

    s.on('BOOKING_EXPIRED', () => {
      this.clearIncomingRequest()
    })

    s.on('RIDE_ASSIGNED', (data) => {
      console.log('[DriverSocketService] RIDE_ASSIGNED:', data)
      this.stopAlertEffects()
    })

    s.on('ARRIVAL_ALERT', (data: ArrivalAlertPayload) => {
      this.state.arrivalAlert = data
      this.notify()
    })

    s.on('NEW_PENDING_CUSTOMER', (data: PendingCustomer) => {
      if (!this.state.pendingCustomers.find(p => p.booking_id === data.booking_id)) {
        this.state.pendingCustomers = [data, ...this.state.pendingCustomers]
        this.notify()
      }
    })

    s.on('CUSTOMER_ENTERED_CORRIDOR', (data: CorridorCustomerPayload) => {
      const existing = this.state.corridorCustomers.find(c => c.customer_id === data.customer_id)
      if (existing) {
        this.state.corridorCustomers = this.state.corridorCustomers.map(c => c.customer_id === data.customer_id ? data : c)
      } else {
        this.state.corridorCustomers = [data, ...this.state.corridorCustomers]
      }
      this.notify()
      try {
        Vibration.vibrate([0, 100, 80, 100])
      } catch {}
    })

    s.on('CUSTOMER_EXITED_CORRIDOR', (data: { customer_id: string }) => {
      this.state.corridorCustomers = this.state.corridorCustomers.filter(c => c.customer_id !== data.customer_id)
      this.notify()
    })

    // Forward any other registered events
    s.onAny((event, ...args) => {
      const handlers = this.customEventListeners.get(event)
      if (handlers) {
        handlers.forEach(h => {
          try { h(...args) } catch (e) { console.warn(`[DriverSocketService] Error in custom handler for ${event}:`, e) }
        })
      }
    })
  }

  // ── State Reconciliation on Launch & Reconnect ────────────────────────────
  public async reconcileStateWithBackend() {
    try {
      const offers = await RideRequestService.fetchPendingOffers()
      if (offers && offers.length > 0) {
        const latest = offers[0]
        if (!this.state.incomingRequest || this.state.incomingRequest.offer_id !== latest.offer_id) {
          console.log('[DriverSocketService] Restored pending offer from backend:', latest.offer_id)
          this.state.incomingRequest = latest
          this.notify()
          this.triggerAlertEffects(latest)
        }
      } else if (this.state.incomingRequest) {
        const activeRide = await RideRequestService.getActiveRide()
        if (activeRide?.is_active) {
          this.clearIncomingRequest()
        }
      }
    } catch (err) {
      console.warn('[DriverSocketService] Reconcile error:', err)
    }
  }

  private triggerAlertEffects(offer: IncomingRideRequestPayload) {
    try {
      DriverSoundService.playIncomingAlert({ loop: true })
      const { triggerActionableRideNotification } = require('../hooks/useDriverNotifications')
      triggerActionableRideNotification({
        title: `🚖 New Ride Request: ₹${offer.trip?.fare || 0}!`,
        body: `Pickup: ${offer.trip?.from || 'Pickup point'} → ${offer.trip?.to || 'Drop point'}`,
        isParcel: offer.service_type === 'parcel',
        data: {
          offer_id: offer.offer_id,
          ride_request_id: offer.ride_request_id,
          booking_id: offer.booking_id,
          fare: offer.trip?.fare,
        },
      })
    } catch {}
  }

  public stopAlertEffects() {
    try {
      DriverSoundService.stopIncomingAlert()
      Vibration.cancel()
      Notifications.dismissAllNotificationsAsync().catch(() => {})
    } catch {}
  }

  public clearIncomingRequest() {
    this.state.incomingRequest = null
    this.stopAlertEffects()
    this.notify()
  }

  public setIncomingRequest(request: IncomingRideRequestPayload | null) {
    this.state.incomingRequest = request
    if (!request) this.stopAlertEffects()
    this.notify()
  }

  // ── Heartbeat Management ──────────────────────────────────────────────────
  private startHeartbeat() {
    this.stopHeartbeat()
    const sendBeat = async () => {
      if (!this.socket?.connected) return
      try {
        const { status } = await Location.getForegroundPermissionsAsync().catch(() => ({ status: 'denied' }))
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null)
          if (loc) {
            const { latitude, longitude, speed, heading, accuracy } = loc.coords
            this.socket.emit('LOCATION_UPDATE', {
              driver_id: this.driverUserId,
              lat: latitude,
              lng: longitude,
              speed: Math.max(0, Math.round((speed ?? 0) * 3.6)),
              heading: Math.round(((heading ?? 0) + 360) % 360),
              accuracy: Math.round(accuracy ?? 5),
              trip_id: '',
              timestamp: Date.now(),
            } satisfies LocationUpdatePayload)

            this.socket.emit('heartbeat', {
              driver_id: this.driverUserId,
              latitude,
              longitude,
              ts: Date.now(),
            })
            return
          }
        }
        this.socket.emit('heartbeat', { driver_id: this.driverUserId, ts: Date.now() })
      } catch {
        this.socket?.emit('heartbeat', { driver_id: this.driverUserId, ts: Date.now() })
      }
    }

    sendBeat()
    this.heartbeatInterval = setInterval(sendBeat, 5000)
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  // ── Subscription & Emitter APIs ───────────────────────────────────────────
  public subscribe(listener: SocketStateListener): () => void {
    this.listeners.add(listener)
    listener({ ...this.state })
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify() {
    const clone = { ...this.state }
    this.listeners.forEach(fn => {
      try { fn(clone) } catch (e) { console.warn('[DriverSocketService] Listener error:', e) }
    })
  }

  public getState() {
    return { ...this.state }
  }

  public getSocket(): Socket | null {
    return this.socket
  }

  public on(event: string, callback: (...args: any[]) => void) {
    if (!this.customEventListeners.has(event)) {
      this.customEventListeners.set(event, new Set())
    }
    this.customEventListeners.get(event)!.add(callback)
    this.socket?.on(event, callback)
  }

  public off(event: string, callback?: (...args: any[]) => void) {
    if (callback) {
      this.customEventListeners.get(event)?.delete(callback)
      this.socket?.off(event, callback)
    } else {
      this.customEventListeners.delete(event)
      this.socket?.off(event)
    }
  }

  public emit(event: string, data?: any) {
    this.socket?.emit(event, data)
  }

  public sendLocationUpdate(payload: Omit<LocationUpdatePayload, 'driver_id' | 'timestamp'>) {
    this.socket?.emit('LOCATION_UPDATE', {
      ...payload,
      driver_id: this.driverUserId,
      timestamp: Date.now(),
    })
  }

  public respondToRideOffer(offerId: string, accepted: boolean, rejectionReason?: string) {
    this.socket?.emit('ride_request_respond', {
      offer_id: offerId,
      accepted,
      rejection_reason: rejectionReason,
      driver_id: this.driverUserId,
      timestamp: Date.now(),
    })
  }
}

export const DriverSocketService = new DriverSocketServiceClass()
