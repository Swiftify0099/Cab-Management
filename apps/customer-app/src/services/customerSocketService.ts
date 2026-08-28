/**
 * Customer Socket Singleton Service — Production-Grade Connection Manager
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides a SINGLE shared persistent Socket.IO connection across the Customer App.
 *
 * Guarantees:
 *  1. Only ONE socket connection exists at any time across all screens and tabs.
 *  2. Socket survives tab switching, modal openings, and screen navigation.
 *  3. Automatic reconnection with exponential backoff and jitter.
 *  4. On connect/reconnect: automatically authenticates and enters customer personal rooms.
 *  5. Normalizes all incoming payloads (lat/lng <-> latitude/longitude, etc.).
 *  6. Sub-second event delivery + reactive state listener fanout.
 */
import { io, Socket } from 'socket.io-client'
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'

const PROD_WS_URL = 'https://cab-management-1.onrender.com'
const resolveWsUrl = () => {
  const envWs = process.env.EXPO_PUBLIC_WS_URL?.trim()
  if (!envWs) return PROD_WS_URL
  return envWs.replace(/\/+$/, '').replace(/\/api\/v1$/, '')
}
const WS_URL = resolveWsUrl()

// ─── Event & Payload Types ──────────────────────────────────────────────────
export type SocketEvent =
  | 'CONNECTED'
  | 'DRIVER_ACCEPTED'
  | 'MATCHING_FAILED'
  | 'LOCATION_UPDATE'
  | 'TRIP_STARTED'
  | 'TRIP_COMPLETED'
  | 'BOOKING_EXPIRED'
  | 'SOS_ACK'
  | 'MATCH_FOUND'
  | 'TRIP_REQUEST'
  | 'TRIP_ACCEPTED'
  | 'TRIP_REJECTED'
  | 'ARRIVAL_ALERT'
  | 'SEAT_BOOKED'
  | 'SEAT_FULL'
  | 'CUSTOMER_ENTERED_CORRIDOR'
  | 'CUSTOMER_LOCATION_UPDATE'
  | 'RESERVATION_CONFIRMED'
  | 'RESERVATION_DRIVER_ASSIGNED'
  | 'RESERVATION_DRIVER_ARRIVING'
  | 'RESERVATION_REMINDER'
  | 'RESERVATION_CANCELLED'
  | 'RESERVATION_MODIFIED'
  | 'NEGOTIATION_DRIVER_OFFER'
  | 'NEGOTIATION_OFFER_ACCEPTED'
  | 'NEGOTIATION_OFFER_REJECTED'
  | 'NEGOTIATION_OFFER_EXPIRED'
  | 'NEGOTIATION_SESSION_EXPIRED'
  | 'NEGOTIATION_ASSIGNED'
  | 'NEGOTIATION_FALLBACK'
  | 'STOP_ADDED'
  | 'STOP_ARRIVED'
  | 'STOP_DEPARTED'
  | 'DESTINATION_UPDATED'
  | 'WAITING_STARTED'
  | 'PAID_WAITING_STARTED'
  | 'WAITING_STOPPED'
  | 'TOLL_ADDED'
  | 'FARE_UPDATED'
  | 'NEW_CHAT_MESSAGE'
  | 'SOS_TRIGGERED'
  | 'SAFETY_ALERT'
  | 'ROUTE_ANOMALY'
  | 'UNEXPECTED_STOP'
  | 'PARCEL_DRIVER_ASSIGNED'
  | 'PARCEL_AT_PICKUP'
  | 'PARCEL_IN_TRANSIT'
  | 'PARCEL_AT_DESTINATION'
  | 'PARCEL_DELIVERED'
  | 'ORG_STUDENT_APPROACHING'
  | 'NEW_CARPOOL_BOOKING'

export interface DriverInfo {
  driver_id: string
  full_name: string
  rating: number
  vehicle: string
  registration_number: string
  vehicle_type: string
  distance_km: number
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
  booking_id: string
  women_only: boolean
}

export interface TripAcceptedPayload {
  event: 'TRIP_ACCEPTED'
  booking_id: string
  trip_id?: string
  driver: DriverInfo
  vehicle?: any
  pickup_eta_minutes?: number
  start_pin?: string
  start_pin_plain?: string
  otp?: string
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
  driver_phone?: string
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

export interface NegotiationDriverOfferPayload {
  event: 'NEGOTIATION_DRIVER_OFFER'
  ride_request_id: string
  offer: {
    id: string
    driver_id: string
    driver_name: string
    rating: number
    total_trips: number
    vehicle_model: string
    vehicle_color: string
    vehicle_plate: string
    pickup_distance_km: number
    pickup_eta_min: number
    offer_amount: number
    offer_type: 'EXACT_MATCH' | 'COUNTER_OFFER' | 'COMPETITIVE_OFFER'
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'SUPERSEDED' | 'EXPIRED'
    expires_at: string
    round_number: number
  }
}

export interface NegotiationSessionExpiredPayload {
  event: 'NEGOTIATION_SESSION_EXPIRED'
  ride_request_id: string
  reason: string
  standard_fare: number
}

export interface NegotiationAssignedPayload {
  event: 'NEGOTIATION_ASSIGNED'
  ride_request_id: string
  booking_id: string
  agreed_fare: number
  driver: {
    driver_id: string
    full_name: string
    rating: number
    vehicle: string
    vehicle_type: string
    registration_number: string
    pickup_eta_min: number
  }
}

export interface NegotiationFallbackPayload {
  event: 'NEGOTIATION_FALLBACK'
  ride_request_id: string
  standard_fare: number
}

export interface ReservationDriverAssignedPayload {
  event: 'RESERVATION_DRIVER_ASSIGNED'
  reservation_id: string
  booking_id: string
  driver: {
    driver_id: string
    full_name: string
    rating: number
    vehicle: string
    vehicle_type: string
    registration_number: string
  }
  scheduled_at: string
  eta_to_pickup_minutes: number | null
}

export interface ReservationReminderPayload {
  event: 'RESERVATION_REMINDER'
  reservation_id: string
  booking_id: string
  scheduled_at: string
  minutes_until_pickup: number
  pickup_address: string
  driver_assigned: boolean
}

export interface ReservationCancelledPayload {
  event: 'RESERVATION_CANCELLED'
  reservation_id: string
  booking_id: string
  cancelled_by: 'CUSTOMER' | 'DRIVER' | 'ADMIN' | 'SYSTEM'
  reason: string
  refund_amount?: number
  refund_method?: string
}

export interface ReservationModifiedPayload {
  event: 'RESERVATION_MODIFIED'
  reservation_id: string
  booking_id: string
  changed_fields: string[]
  new_scheduled_at?: string
  new_fare_estimate?: number
}

export interface StopAddedPayload {
  event: 'STOP_ADDED'
  ride_id: string
  stop_id: string
  sequence: number
  address: string
  latitude: number
  longitude: number
  stop_fee: number
}

export interface DestinationUpdatedPayload {
  event: 'DESTINATION_UPDATED'
  ride_id: string
  destination_address: string
  destination_lat: number
  destination_lng: number
  new_estimated_fare: number
}

export interface WaitingStatusPayload {
  event: 'WAITING_STARTED' | 'PAID_WAITING_STARTED' | 'WAITING_STOPPED'
  ride_id: string
  is_waiting: boolean
  is_paid: boolean
  waiting_time_seconds: number
  waiting_charge: number
}

export interface TollAddedPayload {
  event: 'TOLL_ADDED'
  ride_id: string
  toll_name: string
  toll_amount: number
  new_total_fare: number
}

export interface ChatMessagePayload {
  event: 'NEW_CHAT_MESSAGE'
  ride_id: string
  message_id: string
  sender_type: 'driver' | 'customer' | 'system'
  message_text: string
  created_at: string
}

export interface TripCompletedPayload {
  event: 'TRIP_COMPLETED'
  ride_id: string
  status: string
  receipt_number: string
  customer_final_fare: number
  payment_method: string
  payment_status: string
  distance_km?: number
  duration_min?: number
  waiting_charge?: number
  stops_fee?: number
  tolls?: number
}

export interface SOSAlertPayload {
  event: 'SOS_TRIGGERED' | 'SOS_ACK'
  sos_id: string
  ride_id: string
  status: string
  police_number: string
  message: string
  created_at?: string
}

export interface SafetyAlertPayload {
  event: 'SAFETY_ALERT' | 'ROUTE_ANOMALY' | 'UNEXPECTED_STOP'
  alert_id: string
  alert_type: string
  severity: string
  message: string
  details?: Record<string, any>
}

export interface CustomerSocketState {
  connected: boolean
  matchFound: MatchFoundPayload | null
  tripAccepted: TripAcceptedPayload | null
  tripRejected: TripRejectedPayload | null
  arrivalAlert: ArrivalAlertPayload | null
  driverLocation: LocationUpdatePayload | null
  reservationDriverAssigned: ReservationDriverAssignedPayload | null
  reservationReminder: ReservationReminderPayload | null
  reservationCancelled: ReservationCancelledPayload | null
  reservationModified: ReservationModifiedPayload | null
  negotiationDriverOffer: NegotiationDriverOfferPayload | null
  negotiationSessionExpired: NegotiationSessionExpiredPayload | null
  negotiationAssigned: NegotiationAssignedPayload | null
  negotiationFallback: NegotiationFallbackPayload | null
  stopAdded: StopAddedPayload | null
  destinationUpdated: DestinationUpdatedPayload | null
  waitingStatus: WaitingStatusPayload | null
  tollAdded: TollAddedPayload | null
  newChatMessage: ChatMessagePayload | null
  tripCompleted: TripCompletedPayload | null
  sosAlert: SOSAlertPayload | null
  safetyAlert: SafetyAlertPayload | null
  otpData: { ride_request_id: string; otp: string; distance_km: number; eta_min: number; message: string } | null
  orgStudentAlert: { trip_id: string; booking_id: string; distance_km: number; message: string } | null
}

type CustomerSocketStateListener = (state: CustomerSocketState) => void

class CustomerSocketServiceClass {
  private socket: Socket | null = null
  private isConnecting: boolean = false
  private customerUserId: string = ''
  private listeners: Set<CustomerSocketStateListener> = new Set()
  private customEventListeners: Map<string, Set<(...args: any[]) => void>> = new Map()
  private reconnectSyncCallbacks: Set<() => void> = new Set()
  private activeRooms: Set<string> = new Set()

  private state: CustomerSocketState = {
    connected: false,
    matchFound: null,
    tripAccepted: null,
    tripRejected: null,
    arrivalAlert: null,
    driverLocation: null,
    reservationDriverAssigned: null,
    reservationReminder: null,
    reservationCancelled: null,
    reservationModified: null,
    negotiationDriverOffer: null,
    negotiationSessionExpired: null,
    negotiationAssigned: null,
    negotiationFallback: null,
    stopAdded: null,
    destinationUpdated: null,
    waitingStatus: null,
    tollAdded: null,
    newChatMessage: null,
    tripCompleted: null,
    sosAlert: null,
    safetyAlert: null,
    otpData: null,
    orgStudentAlert: null,
  }

  constructor() {
    this.init()
  }

  public async resolveCustomerId(): Promise<string> {
    if (this.customerUserId) return this.customerUserId
    try {
      const raw = await SecureStore.getItemAsync('user_data')
      if (raw) {
        const u = JSON.parse(raw)
        const id = u.id || u.user_id || u.customer_id
        if (id) {
          this.customerUserId = id
          return id
        }
      }
      const asyncId = await AsyncStorage.getItem('user_id')
      if (asyncId) {
        this.customerUserId = asyncId
        return asyncId
      }
    } catch {}
    return this.customerUserId
  }

  public async init() {
    if (this.socket?.connected || this.isConnecting) return
    this.isConnecting = true

    try {
      const token = await SecureStore.getItemAsync('access_token')
      if (!token) {
        this.isConnecting = false
        return
      }

      await this.resolveCustomerId()

      const s = io(WS_URL, {
        path: '/socket.io/',
        transports: ['websocket', 'polling'],
        auth: { token: Bearer  },
        query: { token: Bearer  },
        reconnection: true,
        reconnectionDelay: 1500,
        reconnectionDelayMax: 10000,
        randomizationFactor: 0.3,
        reconnectionAttempts: Infinity,
        timeout: 15000,
      })

      this.socket = s
      this.bindSocketEvents(s)
    } catch (err) {
      console.warn('[CustomerSocketService] Init error:', err)
    } finally {
      this.isConnecting = false
    }
  }

  public async ensureConnected() {
    if (this.socket?.connected) return
    if (!this.socket) {
      await this.init()
      return
    }
    if (!this.socket.connected && !this.isConnecting) {
      try {
        const token = await SecureStore.getItemAsync('access_token')
        if (token) {
          this.socket.auth = { token: Bearer  }
          this.socket.connect()
        }
      } catch (err) {
        console.warn('[CustomerSocketService] ensureConnected error:', err)
      }
    }
  }

  private bindSocketEvents(s: Socket) {
    s.on('connect', async () => {
      console.log('[CustomerSocketService] Connected:', s.id)
      this.state.connected = true
      this.notify()

      await this.resolveCustomerId()
      if (this.customerUserId) {
        s.emit('JOIN_CUSTOMER_ROOM', { customer_id: this.customerUserId })
        console.log('[CustomerSocketService] Joined customer room:', this.customerUserId)
      }

      // Re-join any active rooms after reconnect
      this.activeRooms.forEach((room) => {
        s.emit('join_trip', { trip_id: room })
        s.emit('join_ride_room', { ride_id: room })
      })

      // Trigger reconnect sync callbacks
      this.reconnectSyncCallbacks.forEach((cb) => {
        try { cb() } catch {}
      })
    })

    s.on('disconnect', (reason) => {
      console.log('[CustomerSocketService] Disconnected:', reason)
      this.state.connected = false
      this.notify()

      if (reason === 'io server disconnect' || reason === 'transport close') {
        setTimeout(() => this.ensureConnected(), 1000)
      }
    })

    s.on('connect_error', (err) => {
      console.warn('[CustomerSocketService] Connection error:', err?.message || err)
      this.state.connected = false
      this.notify()
    })

    s.on('reconnect', async (attempt) => {
      console.log([CustomerSocketService] Reconnected after  attempts)
      this.state.connected = true
      this.notify()

      await this.resolveCustomerId()
      if (this.customerUserId) {
        s.emit('JOIN_CUSTOMER_ROOM', { customer_id: this.customerUserId })
      }

      this.activeRooms.forEach((room) => {
        s.emit('join_trip', { trip_id: room })
        s.emit('join_ride_room', { ride_id: room })
      })

      this.reconnectSyncCallbacks.forEach((cb) => {
        try { cb() } catch {}
      })
    })

    // ── Matching & Dispatch Events ──────────────────────────────────────────
    s.on('MATCH_FOUND', (data: MatchFoundPayload) => {
      console.log('[CustomerSocketService] MATCH_FOUND trip_id:', data.trip_id)
      this.state.matchFound = data
      this.notify()
    })

    s.on('TRIP_ACCEPTED', (data: any) => {
      console.log('[CustomerSocketService] TRIP_ACCEPTED booking_id:', data.booking_id)
      const otpVal = data.start_pin || data.start_pin_plain || data.otp
      if (otpVal) {
        this.state.otpData = { otp: otpVal, ...data }
      }
      this.state.tripAccepted = {
        event: 'TRIP_ACCEPTED',
        booking_id: data.booking_id || data.ride_request_id,
        trip_id: data.trip_id || data.ride_request_id || data.booking_id,
        driver: data.driver,
        vehicle: data.vehicle,
        pickup_eta_minutes: data.driver?.eta_min || data.pickup_eta_minutes || 5,
        start_pin: otpVal,
        start_pin_plain: otpVal,
        otp: otpVal,
      } as any
      this.notify()
    })

    const handleRideAssigned = (data: any) => {
      console.log('[CustomerSocketService] RIDE_ASSIGNED:', data.ride_request_id || data.booking_id)
      const otpVal = data.start_pin || data.start_pin_plain || data.otp
      if (otpVal) {
        this.state.otpData = { otp: otpVal, ...data }
      }
      this.state.tripAccepted = {
        event: 'TRIP_ACCEPTED',
        booking_id: data.ride_request_id || data.booking_id,
        trip_id: data.ride_request_id || data.booking_id,
        driver: data.driver,
        vehicle: data.vehicle,
        pickup_eta_minutes: data.driver?.eta_min || data.pickup_eta_minutes || 5,
        start_pin: otpVal,
        start_pin_plain: otpVal,
        otp: otpVal,
      } as any
      this.notify()
    }

    s.on('RIDE_ASSIGNED', handleRideAssigned)
    s.on('ride:assigned', handleRideAssigned)

    const handleOtpReady = (data: any) => {
      console.log('[CustomerSocketService] OTP_READY:', data.otp, 'dist:', data.distance_km)
      this.state.otpData = data
      this.notify()
    }
    s.on('OTP_READY', handleOtpReady)
    s.on('ride:otp_ready', handleOtpReady)

    s.on('TRIP_REJECTED', (data: TripRejectedPayload) => {
      console.log('[CustomerSocketService] TRIP_REJECTED:', data.message)
      this.state.tripRejected = data
      this.notify()
    })

    s.on('ARRIVAL_ALERT', (data: ArrivalAlertPayload) => {
      console.log('[CustomerSocketService] ARRIVAL_ALERT dist:', data.distance_km, 'km')
      this.state.arrivalAlert = data
      this.notify()
    })

    // ── Location Stream Normalization ───────────────────────────────────────
    const handleLocationUpdate = (data: any) => {
      if (!data) return
      const normalized: LocationUpdatePayload = {
        trip_id: data.trip_id || data.ride_id || '',
        driver_id: data.driver_id || '',
        latitude: Number.isFinite(Number(data.latitude ?? data.lat)) ? Number(data.latitude ?? data.lat) : 0,
        longitude: Number.isFinite(Number(data.longitude ?? data.lng)) ? Number(data.longitude ?? data.lng) : 0,
        speed_kmh: Number(data.speed_kmh ?? data.speed) || 0,
        heading: Number(data.heading) || 0,
        eta_minutes: data.eta_minutes !== undefined ? data.eta_minutes : (data.eta_min !== undefined ? data.eta_min : null),
        distance_remaining_km: data.distance_remaining_km !== undefined ? data.distance_remaining_km : (data.distance_km !== undefined ? data.distance_km : null),
      }
      this.state.driverLocation = normalized
      this.notify()
    }

    s.on('LOCATION_UPDATE', handleLocationUpdate)
    s.on('ride:location', handleLocationUpdate)
    s.on('ride:progress', (data: any) => {
      const locData = data?.data?.driver_location || data?.driver_location || data
      if (locData) {
        handleLocationUpdate({
          ...locData,
          trip_id: data?.data?.ride_id || data?.ride_id,
          distance_remaining_km: data?.data?.distance_remaining_km,
          eta_minutes: data?.data?.duration_remaining_min,
        })
      }
    })

    // ── Feature 4: Reservation Events ───────────────────────────────────────
    s.on('RESERVATION_CONFIRMED', (data: any) => {
      console.log('[CustomerSocketService] RESERVATION_CONFIRMED:', data.booking_id)
      this.triggerReconnectSync()
    })

    s.on('RESERVATION_DRIVER_ASSIGNED', (data: ReservationDriverAssignedPayload) => {
      console.log('[CustomerSocketService] RESERVATION_DRIVER_ASSIGNED:', data.booking_id)
      this.state.reservationDriverAssigned = data
      this.notify()
      this.triggerReconnectSync()
    })

    s.on('RESERVATION_DRIVER_ARRIVING', (data: any) => {
      console.log('[CustomerSocketService] RESERVATION_DRIVER_ARRIVING:', data.booking_id)
      this.triggerReconnectSync()
    })

    s.on('RESERVATION_REMINDER', (data: ReservationReminderPayload) => {
      this.state.reservationReminder = data
      this.notify()
    })

    s.on('RESERVATION_CANCELLED', (data: ReservationCancelledPayload) => {
      this.state.reservationCancelled = data
      this.notify()
      this.triggerReconnectSync()
    })

    s.on('RESERVATION_MODIFIED', (data: ReservationModifiedPayload) => {
      this.state.reservationModified = data
      this.notify()
      this.triggerReconnectSync()
    })

    // ── Feature 5: Negotiation Events ───────────────────────────────────────
    s.on('NEGOTIATION_DRIVER_OFFER', (data: NegotiationDriverOfferPayload) => {
      this.state.negotiationDriverOffer = data
      this.notify()
    })
    s.on('NEGOTIATION_OFFER_ACCEPTED', (data: any) => {
      this.state.negotiationDriverOffer = data
      this.notify()
    })
    s.on('NEGOTIATION_OFFER_REJECTED', (data: any) => {
      this.state.negotiationDriverOffer = data
      this.notify()
    })
    s.on('NEGOTIATION_OFFER_EXPIRED', (data: any) => {
      this.state.negotiationDriverOffer = data
      this.notify()
    })
    s.on('NEGOTIATION_SESSION_EXPIRED', (data: NegotiationSessionExpiredPayload) => {
      this.state.negotiationSessionExpired = data
      this.notify()
    })
    s.on('NEGOTIATION_ASSIGNED', (data: NegotiationAssignedPayload) => {
      this.state.negotiationAssigned = data
      this.notify()
    })
    s.on('NEGOTIATION_FALLBACK', (data: NegotiationFallbackPayload) => {
      this.state.negotiationFallback = data
      this.notify()
    })

    // ── Feature 8: During Ride Events ───────────────────────────────────────
    s.on('STOP_ADDED', (data: StopAddedPayload) => {
      this.state.stopAdded = data
      this.notify()
    })
    s.on('DESTINATION_UPDATED', (data: DestinationUpdatedPayload) => {
      this.state.destinationUpdated = data
      this.notify()
    })
    s.on('WAITING_STARTED', (data: WaitingStatusPayload) => {
      this.state.waitingStatus = data
      this.notify()
    })
    s.on('PAID_WAITING_STARTED', (data: WaitingStatusPayload) => {
      this.state.waitingStatus = data
      this.notify()
    })
    s.on('WAITING_STOPPED', (data: WaitingStatusPayload) => {
      this.state.waitingStatus = data
      this.notify()
    })
    s.on('ride:waiting_update', (data: any) => {
      const waitData = data?.data || data
      this.state.waitingStatus = {
        event: waitData.is_waiting ? 'WAITING_STARTED' : 'WAITING_STOPPED',
        ride_id: waitData.ride_id,
        is_waiting: Boolean(waitData.is_waiting),
        is_paid: Boolean(waitData.is_paid),
        waiting_time_seconds: waitData.waiting_duration_seconds || waitData.waiting_seconds || 0,
        waiting_charge: waitData.waiting_charge || waitData.waiting_fare || 0,
      }
      this.notify()
    })
    s.on('TOLL_ADDED', (data: TollAddedPayload) => {
      this.state.tollAdded = data
      this.notify()
    })
    s.on('NEW_CHAT_MESSAGE', (data: ChatMessagePayload) => {
      this.state.newChatMessage = data
      this.notify()
    })
    s.on('communication:message', (data: any) => {
      this.state.newChatMessage = {
        event: 'NEW_CHAT_MESSAGE',
        ride_id: data.ride_id,
        message_id: data.id || data.message_id || msg-,
        sender_type: data.sender_type || 'driver',
        message_text: data.message_text || data.text || '',
        created_at: data.created_at || new Date().toISOString(),
      }
      this.notify()
    })

    // ── Feature 9 & 10: Safety & Completion Events ──────────────────────────
    s.on('TRIP_COMPLETED', (data: TripCompletedPayload) => {
      this.state.tripCompleted = data
      this.notify()
      this.triggerReconnectSync()
    })
    s.on('SOS_TRIGGERED', (data: SOSAlertPayload) => {
      this.state.sosAlert = data
      this.notify()
    })
    s.on('SOS_ACK', (data: SOSAlertPayload) => {
      this.state.sosAlert = data
      this.notify()
    })
    s.on('SAFETY_ALERT', (data: SafetyAlertPayload) => {
      this.state.safetyAlert = data
      this.notify()
    })
    s.on('ROUTE_ANOMALY', (data: SafetyAlertPayload) => {
      this.state.safetyAlert = data
      this.notify()
    })
    s.on('UNEXPECTED_STOP', (data: SafetyAlertPayload) => {
      this.state.safetyAlert = data
      this.notify()
    })

    // ── Org Student Proximity ───────────────────────────────────────────────
    s.on('ORG_STUDENT_APPROACHING', (data: any) => {
      this.state.orgStudentAlert = {
        trip_id: data.trip_id || '',
        booking_id: data.booking_id || '',
        distance_km: data.distance_km || 3,
        message: data.message || Your bus is  KM away. Get ready!,
      }
      this.notify()
    })

    // Dynamic custom event listener forwarder
    s.onAny((event, ...args) => {
      const handlers = this.customEventListeners.get(event)
      if (handlers) {
        handlers.forEach((h) => {
          try { h(...args) } catch (e) { console.warn([CustomerSocketService] Handler error for :, e) }
        })
      }
    })
  }

  // ── Public Room & Action Methods ──────────────────────────────────────────
  public joinTrip(tripId: string) {
    if (!tripId) return
    this.activeRooms.add(tripId)
    this.socket?.emit('join_trip', { trip_id: tripId })
    this.socket?.emit('join_ride_room', { ride_id: tripId })
    console.log('[CustomerSocketService] Joined trip/ride room:', tripId)
  }

  public leaveTrip(tripId: string) {
    if (!tripId) return
    this.activeRooms.delete(tripId)
    this.socket?.emit('leave_trip', { trip_id: tripId })
    this.socket?.emit('leave_ride_room', { ride_id: tripId })
  }

  public joinCustomerRoom() {
    if (this.customerUserId) {
      this.socket?.emit('JOIN_CUSTOMER_ROOM', { customer_id: this.customerUserId })
    }
  }

  public joinParcelRoom(parcelId: string) {
    if (!parcelId) return
    this.socket?.emit('join_parcel_room', { parcel_id: parcelId })
  }

  public leaveParcelRoom(parcelId: string) {
    if (!parcelId) return
    this.socket?.emit('leave_parcel_room', { parcel_id: parcelId })
  }

  public sendLocationUpdate(lat: number, lng: number) {
    this.socket?.emit('CUSTOMER_LOCATION_UPDATE', {
      customer_id: this.customerUserId,
      lat,
      lng,
    })
  }

  // ── Subscription & Emitter APIs ───────────────────────────────────────────
  public subscribe(listener: CustomerSocketStateListener): () => void {
    this.listeners.add(listener)
    listener({ ...this.state })
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify() {
    const clone = { ...this.state }
    this.listeners.forEach((fn) => {
      try { fn(clone) } catch (e) { console.warn('[CustomerSocketService] Listener error:', e) }
    })
  }

  public getState(): CustomerSocketState {
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

  public registerReconnectSync(callback: () => void): () => void {
    this.reconnectSyncCallbacks.add(callback)
    return () => {
      this.reconnectSyncCallbacks.delete(callback)
    }
  }

  private triggerReconnectSync() {
    this.reconnectSyncCallbacks.forEach((cb) => {
      try { cb() } catch {}
    })
  }

  // ── Clearers ──────────────────────────────────────────────────────────────
  public clearMatchFound() { this.state.matchFound = null; this.notify() }
  public clearTripAccepted() { this.state.tripAccepted = null; this.notify() }
  public clearTripRejected() { this.state.tripRejected = null; this.notify() }
  public clearArrivalAlert() { this.state.arrivalAlert = null; this.notify() }
  public clearOtpData() { this.state.otpData = null; this.notify() }
  public clearReservationDriverAssigned() { this.state.reservationDriverAssigned = null; this.notify() }
  public clearReservationReminder() { this.state.reservationReminder = null; this.notify() }
  public clearReservationCancelled() { this.state.reservationCancelled = null; this.notify() }
  public clearReservationModified() { this.state.reservationModified = null; this.notify() }
  public clearNegotiationDriverOffer() { this.state.negotiationDriverOffer = null; this.notify() }
  public clearNegotiationSessionExpired() { this.state.negotiationSessionExpired = null; this.notify() }
  public clearNegotiationAssigned() { this.state.negotiationAssigned = null; this.notify() }
  public clearNegotiationFallback() { this.state.negotiationFallback = null; this.notify() }
  public clearStopAdded() { this.state.stopAdded = null; this.notify() }
  public clearDestinationUpdated() { this.state.destinationUpdated = null; this.notify() }
  public clearWaitingStatus() { this.state.waitingStatus = null; this.notify() }
  public clearTollAdded() { this.state.tollAdded = null; this.notify() }
  public clearNewChatMessage() { this.state.newChatMessage = null; this.notify() }
  public clearTripCompleted() { this.state.tripCompleted = null; this.notify() }
  public clearSOSAlert() { this.state.sosAlert = null; this.notify() }
  public clearSafetyAlert() { this.state.safetyAlert = null; this.notify() }
  public clearOrgStudentAlert() { this.state.orgStudentAlert = null; this.notify() }
}

export const CustomerSocketService = new CustomerSocketServiceClass()
