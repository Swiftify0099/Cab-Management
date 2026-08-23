import { useEffect, useRef, useCallback, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import * as SecureStore from 'expo-secure-store'

const WS_URL = (process.env.EXPO_PUBLIC_WS_URL || 'https://cab-management-1.onrender.com').replace(/\/api\/v1$/, '')

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
  // Feature 4: Scheduled Reservation realtime events
  | 'RESERVATION_CONFIRMED'
  | 'RESERVATION_DRIVER_ASSIGNED'
  | 'RESERVATION_DRIVER_ARRIVING'
  | 'RESERVATION_REMINDER'
  | 'RESERVATION_CANCELLED'
  | 'RESERVATION_MODIFIED'
  // Feature 5: Negotiation / Own Fare Model realtime events
  | 'NEGOTIATION_DRIVER_OFFER'       // Driver responds with offer or counter
  | 'NEGOTIATION_OFFER_ACCEPTED'     // Driver accepted customer's exact offer
  | 'NEGOTIATION_OFFER_REJECTED'     // Driver rejected customer's offer
  | 'NEGOTIATION_OFFER_EXPIRED'      // A specific driver's offer expired
  | 'NEGOTIATION_SESSION_EXPIRED'    // Entire negotiation session timed out
  | 'NEGOTIATION_ASSIGNED'           // Atomic driver assignment confirmed
  | 'NEGOTIATION_FALLBACK'           // Session switched to standard dispatch
  // Feature 7 & 8: Active Ride & During Ride realtime events
  | 'STOP_ADDED'                     // Waypoint stop added
  | 'STOP_ARRIVED'                   // Driver arrived at intermediate stop
  | 'STOP_DEPARTED'                  // Driver departed intermediate stop
  | 'DESTINATION_UPDATED'            // Dropoff location changed
  | 'WAITING_STARTED'                // Free waiting began
  | 'PAID_WAITING_STARTED'           // Paid waiting timer started
  | 'WAITING_STOPPED'                // Waiting ended
  | 'TOLL_ADDED'                     // Toll charge added
  | 'FARE_UPDATED'                   // Live estimated fare updated
  | 'NEW_CHAT_MESSAGE'               // In-app message received
  // Feature 9 & 10: Safety, Anomaly & Trip Completion events
  | 'TRIP_COMPLETED'                 // Authoritative trip complete & receipt ready
  | 'SOS_TRIGGERED'                  // SOS event activated
  | 'SOS_ACK'                        // Safety team / dispatch acknowledged SOS
  | 'SAFETY_ALERT'                   // Real-time safety alert
  | 'ROUTE_ANOMALY'                  // Route deviation detected
  | 'UNEXPECTED_STOP'                // Long unexpected stop detected
  // Feature 15: Parcel Logistics realtime events
  | 'PARCEL_DRIVER_ASSIGNED'
  | 'PARCEL_AT_PICKUP'
  | 'PARCEL_IN_TRANSIT'
  | 'PARCEL_AT_DESTINATION'
  | 'PARCEL_DELIVERED'

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

// ─── Feature 5: Negotiation Payload Interfaces ──────────────────────────────
/**
 * Fired when a driver responds to a NEGOTIATED ride request.
 * offer_type: EXACT_MATCH (accepted customer price) | COUNTER_OFFER (different price)
 *             | COMPETITIVE_OFFER (below customer price)
 */
export interface NegotiationDriverOfferPayload {
  event: 'NEGOTIATION_DRIVER_OFFER'
  ride_request_id: string
  offer: {
    id: string                        // offer UUID — use for accept/reject API calls
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
    expires_at: string                // ISO8601 — use for per-card countdown
    round_number: number              // Which negotiation round this is
  }
}

/** Fired when the entire negotiation session times out — no drivers responded */
export interface NegotiationSessionExpiredPayload {
  event: 'NEGOTIATION_SESSION_EXPIRED'
  ride_request_id: string
  reason: string
  standard_fare: number              // Fallback fare to show in the CTA
}

/** Fired when backend atomically assigns a driver after customer's selection */
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

/** Fired when negotiation switches to standard dispatch (fallback) */
export interface NegotiationFallbackPayload {
  event: 'NEGOTIATION_FALLBACK'
  ride_request_id: string
  standard_fare: number
}

// ─── Feature 4: Scheduled Reservation Payload interfaces ───────────────────────
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
  scheduled_at: string  // ISO8601 UTC
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

// ─── Feature 8: During Ride Payload Interfaces ──────────────────────────────
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

// ─── Feature 9 & 10: Safety & Completion Payload Interfaces ─────────────────
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

// ─── Hook return type ──────────────────────────────────────────────────────────
interface UseCustomerSocketReturn {
  connected:       boolean
  socket:          Socket | null

  // Room management
  joinTrip:        (tripId: string) => void
  leaveTrip:       (tripId: string) => void
  joinParcelRoom:  (parcelId: string) => void
  leaveParcelRoom: (parcelId: string) => void

  // Generic listener
  on:              (event: SocketEvent, handler: (data: any) => void) => void
  off:             (event: SocketEvent, handler: (data: any) => void) => void

  // Stateful reactive events
  matchFound:      MatchFoundPayload | null
  tripAccepted:    TripAcceptedPayload | null
  tripRejected:    TripRejectedPayload | null
  arrivalAlert:    ArrivalAlertPayload | null
  driverLocation:  LocationUpdatePayload | null

  // Feature 4: Reservation stateful events
  reservationDriverAssigned: ReservationDriverAssignedPayload | null
  reservationReminder:       ReservationReminderPayload | null
  reservationCancelled:      ReservationCancelledPayload | null
  reservationModified:       ReservationModifiedPayload | null

  // Feature 5: Negotiation stateful events
  negotiationDriverOffer:    NegotiationDriverOfferPayload | null
  negotiationSessionExpired: NegotiationSessionExpiredPayload | null
  negotiationAssigned:       NegotiationAssignedPayload | null
  negotiationFallback:       NegotiationFallbackPayload | null

  // Feature 8: During Ride stateful events
  stopAdded:                 StopAddedPayload | null
  destinationUpdated:        DestinationUpdatedPayload | null
  waitingStatus:             WaitingStatusPayload | null
  tollAdded:                 TollAddedPayload | null
  newChatMessage:            ChatMessagePayload | null

  // Feature 9 & 10: Safety & Trip Completion stateful events
  tripCompleted:             TripCompletedPayload | null
  sosAlert:                  SOSAlertPayload | null
  safetyAlert:               SafetyAlertPayload | null

  // Clearers
  clearMatchFound:               () => void
  clearTripAccepted:             () => void
  clearTripRejected:             () => void
  clearArrivalAlert:             () => void
  clearReservationDriverAssigned:() => void
  clearReservationReminder:      () => void
  clearReservationCancelled:     () => void
  clearReservationModified:      () => void

  // Feature 5: Negotiation clearers
  clearNegotiationDriverOffer:    () => void
  clearNegotiationSessionExpired: () => void
  clearNegotiationAssigned:       () => void
  clearNegotiationFallback:       () => void

  // Feature 8: During Ride clearers
  clearStopAdded:                 () => void
  clearDestinationUpdated:        () => void
  clearWaitingStatus:             () => void
  clearTollAdded:                 () => void
  clearNewChatMessage:            () => void

  // Feature 9 & 10: Safety & Trip Completion clearers
  clearTripCompleted:             () => void
  clearSOSAlert:                  () => void
  clearSafetyAlert:               () => void

  // Phase 2: Location broadcast for corridor matching
  sendLocationUpdate: (lat: number, lng: number) => void

  // Feature 4: Force sync trips state after reconnect
  onReconnectSyncTrips: ((callback: () => void) => void)
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useCustomerSocket(): UseCustomerSocketReturn {
  const socketRef   = useRef<Socket | null>(null)
  const customerRef = useRef<string>('')   // customer user_id from SecureStore
  const reconnectSyncRef = useRef<(() => void) | null>(null)  // Feature 4: reconnect sync
  const [connected,      setConnected]      = useState(false)
  const [matchFound,     setMatchFound]     = useState<MatchFoundPayload | null>(null)
  const [tripAccepted,   setTripAccepted]   = useState<TripAcceptedPayload | null>(null)
  const [tripRejected,   setTripRejected]   = useState<TripRejectedPayload | null>(null)
  const [arrivalAlert,   setArrivalAlert]   = useState<ArrivalAlertPayload | null>(null)
  const [driverLocation, setDriverLocation] = useState<LocationUpdatePayload | null>(null)
  // Feature 4: Reservation state
  const [reservationDriverAssigned, setReservationDriverAssigned] = useState<ReservationDriverAssignedPayload | null>(null)
  const [reservationReminder,       setReservationReminder]       = useState<ReservationReminderPayload | null>(null)
  const [reservationCancelled,      setReservationCancelled]      = useState<ReservationCancelledPayload | null>(null)
  const [reservationModified,       setReservationModified]       = useState<ReservationModifiedPayload | null>(null)
  // Feature 5: Negotiation state
  const [negotiationDriverOffer,    setNegotiationDriverOffer]    = useState<NegotiationDriverOfferPayload | null>(null)
  const [negotiationSessionExpired, setNegotiationSessionExpired] = useState<NegotiationSessionExpiredPayload | null>(null)
  const [negotiationAssigned,       setNegotiationAssigned]       = useState<NegotiationAssignedPayload | null>(null)
  const [negotiationFallback,       setNegotiationFallback]       = useState<NegotiationFallbackPayload | null>(null)
  // Feature 8: During Ride state
  const [stopAdded,                 setStopAdded]                 = useState<StopAddedPayload | null>(null)
  const [destinationUpdated,        setDestinationUpdated]        = useState<DestinationUpdatedPayload | null>(null)
  const [waitingStatus,             setWaitingStatus]             = useState<WaitingStatusPayload | null>(null)
  const [tollAdded,                 setTollAdded]                 = useState<TollAddedPayload | null>(null)
  const [newChatMessage,            setNewChatMessage]            = useState<ChatMessagePayload | null>(null)
  // Feature 9 & 10: Safety & Trip Completion state
  const [tripCompleted,             setTripCompleted]             = useState<TripCompletedPayload | null>(null)
  const [sosAlert,                  setSosAlert]                  = useState<SOSAlertPayload | null>(null)
  const [safetyAlert,               setSafetyAlert]               = useState<SafetyAlertPayload | null>(null)

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

      // ── Feature 4: Scheduled Reservation events ─────────────────────────────────

      // Backend confirms scheduled ride creation
      socket.on('RESERVATION_CONFIRMED', (data: any) => {
        console.log('[CustomerSocket] RESERVATION_CONFIRMED booking_id:', data.booking_id)
        // Trigger reconnect sync to refresh trips list
        reconnectSyncRef.current?.()
      })

      // Driver matched/assigned to the upcoming reservation
      socket.on('RESERVATION_DRIVER_ASSIGNED', (data: ReservationDriverAssignedPayload) => {
        console.log('[CustomerSocket] RESERVATION_DRIVER_ASSIGNED booking_id:', data.booking_id)
        setReservationDriverAssigned(data)
        reconnectSyncRef.current?.()
      })

      // Driver is en route to scheduled pickup
      socket.on('RESERVATION_DRIVER_ARRIVING', (data: any) => {
        console.log('[CustomerSocket] RESERVATION_DRIVER_ARRIVING booking_id:', data.booking_id)
        reconnectSyncRef.current?.()
      })

      // Pre-pickup reminder pushed by backend scheduler
      socket.on('RESERVATION_REMINDER', (data: ReservationReminderPayload) => {
        console.log('[CustomerSocket] RESERVATION_REMINDER minutes_until:', data.minutes_until_pickup)
        setReservationReminder(data)
      })

      // Reservation cancelled (by driver, admin, or system)
      socket.on('RESERVATION_CANCELLED', (data: ReservationCancelledPayload) => {
        console.log('[CustomerSocket] RESERVATION_CANCELLED booking_id:', data.booking_id, 'by:', data.cancelled_by)
        setReservationCancelled(data)
        reconnectSyncRef.current?.()
      })

      // Reservation successfully modified
      socket.on('RESERVATION_MODIFIED', (data: ReservationModifiedPayload) => {
        console.log('[CustomerSocket] RESERVATION_MODIFIED fields:', data.changed_fields)
        setReservationModified(data)
        reconnectSyncRef.current?.()
      })

      // ── Feature 5: Negotiation / Own Fare Model events ──────────────────────────────────

      // Driver responded to customer's negotiated offer
      socket.on('NEGOTIATION_DRIVER_OFFER', (data: NegotiationDriverOfferPayload) => {
        console.log('[CustomerSocket] NEGOTIATION_DRIVER_OFFER offer_id:', data.offer?.id, 'amount:', data.offer?.offer_amount)
        setNegotiationDriverOffer(data)
      })

      // Customer's exact offer was accepted by a driver (EXACT_MATCH)
      socket.on('NEGOTIATION_OFFER_ACCEPTED', (data: any) => {
        console.log('[CustomerSocket] NEGOTIATION_OFFER_ACCEPTED offer_id:', data.offer_id)
        // Surface as a driver-offer event so the screen can update card status
        setNegotiationDriverOffer(data)
      })

      // A driver rejected the customer's offer
      socket.on('NEGOTIATION_OFFER_REJECTED', (data: any) => {
        console.log('[CustomerSocket] NEGOTIATION_OFFER_REJECTED offer_id:', data.offer_id)
        setNegotiationDriverOffer(data)
      })

      // A specific driver's offer expired (per-card)
      socket.on('NEGOTIATION_OFFER_EXPIRED', (data: any) => {
        console.log('[CustomerSocket] NEGOTIATION_OFFER_EXPIRED offer_id:', data.offer_id)
        setNegotiationDriverOffer(data)
      })

      // Entire negotiation session expired — no drivers accepted
      socket.on('NEGOTIATION_SESSION_EXPIRED', (data: NegotiationSessionExpiredPayload) => {
        console.log('[CustomerSocket] NEGOTIATION_SESSION_EXPIRED reason:', data.reason)
        setNegotiationSessionExpired(data)
      })

      // Backend atomically assigned a driver — navigate to /track
      socket.on('NEGOTIATION_ASSIGNED', (data: NegotiationAssignedPayload) => {
        console.log('[CustomerSocket] NEGOTIATION_ASSIGNED booking_id:', data.booking_id, 'fare:', data.agreed_fare)
        setNegotiationAssigned(data)
      })

      // Negotiation switched to standard dispatch (fallback)
      socket.on('NEGOTIATION_FALLBACK', (data: NegotiationFallbackPayload) => {
        console.log('[CustomerSocket] NEGOTIATION_FALLBACK ride_request_id:', data.ride_request_id)
        setNegotiationFallback(data)
      })

      // ── Feature 8: During Ride events ───────────────────────────────────────────────
      socket.on('STOP_ADDED', (data: StopAddedPayload) => {
        console.log('[CustomerSocket] STOP_ADDED:', data.address, 'fee:', data.stop_fee)
        setStopAdded(data)
      })

      socket.on('DESTINATION_UPDATED', (data: DestinationUpdatedPayload) => {
        console.log('[CustomerSocket] DESTINATION_UPDATED:', data.destination_address, 'fare:', data.new_estimated_fare)
        setDestinationUpdated(data)
      })

      socket.on('WAITING_STARTED', (data: WaitingStatusPayload) => {
        console.log('[CustomerSocket] WAITING_STARTED is_paid:', data.is_paid)
        setWaitingStatus(data)
      })

      socket.on('PAID_WAITING_STARTED', (data: WaitingStatusPayload) => {
        console.log('[CustomerSocket] PAID_WAITING_STARTED charge:', data.waiting_charge)
        setWaitingStatus(data)
      })

      socket.on('WAITING_STOPPED', (data: WaitingStatusPayload) => {
        console.log('[CustomerSocket] WAITING_STOPPED')
        setWaitingStatus(data)
      })

      socket.on('TOLL_ADDED', (data: TollAddedPayload) => {
        console.log('[CustomerSocket] TOLL_ADDED:', data.toll_name, 'amount:', data.toll_amount)
        setTollAdded(data)
      })

      socket.on('NEW_CHAT_MESSAGE', (data: ChatMessagePayload) => {
        console.log('[CustomerSocket] NEW_CHAT_MESSAGE from:', data.sender_type)
        setNewChatMessage(data)
      })

      // ── Feature 9 & 10: Safety & Trip Completion events ─────────────────────
      socket.on('TRIP_COMPLETED', (data: TripCompletedPayload) => {
        console.log('[CustomerSocket] TRIP_COMPLETED ride_id:', data.ride_id, 'fare:', data.customer_final_fare)
        setTripCompleted(data)
        reconnectSyncRef.current?.()
      })

      socket.on('SOS_TRIGGERED', (data: SOSAlertPayload) => {
        console.log('[CustomerSocket] SOS_TRIGGERED incident_id:', data.sos_id)
        setSosAlert(data)
      })

      socket.on('SOS_ACK', (data: SOSAlertPayload) => {
        console.log('[CustomerSocket] SOS_ACK incident_id:', data.sos_id)
        setSosAlert(data)
      })

      socket.on('SAFETY_ALERT', (data: SafetyAlertPayload) => {
        console.log('[CustomerSocket] SAFETY_ALERT alert_type:', data.alert_type)
        setSafetyAlert(data)
      })

      socket.on('ROUTE_ANOMALY', (data: SafetyAlertPayload) => {
        console.log('[CustomerSocket] ROUTE_ANOMALY detected')
        setSafetyAlert(data)
      })

      socket.on('UNEXPECTED_STOP', (data: SafetyAlertPayload) => {
        console.log('[CustomerSocket] UNEXPECTED_STOP detected')
        setSafetyAlert(data)
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

  // ─── Clearers ──────────────────────────────────────────────────────────
  const clearMatchFound   = useCallback(() => setMatchFound(null),   [])
  const clearTripAccepted = useCallback(() => setTripAccepted(null), [])
  const clearTripRejected = useCallback(() => setTripRejected(null), [])
  const clearArrivalAlert = useCallback(() => setArrivalAlert(null), [])
  // Feature 4 clearers
  const clearReservationDriverAssigned = useCallback(() => setReservationDriverAssigned(null), [])
  const clearReservationReminder       = useCallback(() => setReservationReminder(null),       [])
  const clearReservationCancelled      = useCallback(() => setReservationCancelled(null),      [])
  const clearReservationModified       = useCallback(() => setReservationModified(null),       [])
  // Feature 5: Negotiation clearers
  const clearNegotiationDriverOffer    = useCallback(() => setNegotiationDriverOffer(null),    [])
  const clearNegotiationSessionExpired = useCallback(() => setNegotiationSessionExpired(null), [])
  const clearNegotiationAssigned       = useCallback(() => setNegotiationAssigned(null),       [])
  const clearNegotiationFallback       = useCallback(() => setNegotiationFallback(null),       [])
  // Feature 8: During Ride clearers
  const clearStopAdded                 = useCallback(() => setStopAdded(null),                 [])
  const clearDestinationUpdated        = useCallback(() => setDestinationUpdated(null),        [])
  const clearWaitingStatus             = useCallback(() => setWaitingStatus(null),             [])
  const clearTollAdded                 = useCallback(() => setTollAdded(null),                 [])
  const clearNewChatMessage            = useCallback(() => setNewChatMessage(null),            [])
  // Feature 9 & 10: Safety & Trip Completion clearers
  const clearTripCompleted             = useCallback(() => setTripCompleted(null),             [])
  const clearSOSAlert                  = useCallback(() => setSosAlert(null),                  [])
  const clearSafetyAlert               = useCallback(() => setSafetyAlert(null),               [])

  // ─── Feature 4: Reconnect sync registration ──────────────────────────────────
  /**
   * Register a callback that gets called when socket reconnects OR when a
   * reservation event requires a full state refresh (e.g., RESERVATION_CANCELLED).
   * Typically the caller does: api.get('/bookings/my-trips') to refresh the list.
   */
  const onReconnectSyncTrips = useCallback((callback: () => void) => {
    reconnectSyncRef.current = callback
  }, [])

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

  const joinParcelRoom = useCallback((parcelId: string) => {
    if (!socketRef.current || !parcelId) return
    socketRef.current.emit('join_parcel_room', { parcel_id: parcelId })
  }, [])

  const leaveParcelRoom = useCallback((parcelId: string) => {
    if (!socketRef.current || !parcelId) return
    socketRef.current.emit('leave_parcel_room', { parcel_id: parcelId })
  }, [])

  return {
    connected,
    socket: socketRef.current,
    joinTrip,
    leaveTrip,
    joinParcelRoom,
    leaveParcelRoom,
    on,
    off,
    matchFound,
    tripAccepted,
    tripRejected,
    arrivalAlert,
    driverLocation,
    // Feature 4: Reservation events
    reservationDriverAssigned,
    reservationReminder,
    reservationCancelled,
    reservationModified,
    clearMatchFound,
    clearTripAccepted,
    clearTripRejected,
    clearArrivalAlert,
    clearReservationDriverAssigned,
    clearReservationReminder,
    clearReservationCancelled,
    clearReservationModified,
    // Feature 5: Negotiation events
    negotiationDriverOffer,
    negotiationSessionExpired,
    negotiationAssigned,
    negotiationFallback,
    clearNegotiationDriverOffer,
    clearNegotiationSessionExpired,
    clearNegotiationAssigned,
    clearNegotiationFallback,
    // Feature 8: During Ride events
    stopAdded,
    destinationUpdated,
    waitingStatus,
    tollAdded,
    newChatMessage,
    clearStopAdded,
    clearDestinationUpdated,
    clearWaitingStatus,
    clearTollAdded,
    clearNewChatMessage,
    // Feature 9 & 10: Safety & Trip Completion events
    tripCompleted,
    sosAlert,
    safetyAlert,
    clearTripCompleted,
    clearSOSAlert,
    clearSafetyAlert,
    // Phase 2
    sendLocationUpdate,
    // Feature 4: reconnect sync
    onReconnectSyncTrips,
  }
}
