import { useEffect, useState, useCallback } from 'react'
import { Socket } from 'socket.io-client'
import {
  CustomerSocketService,
  SocketEvent,
  DriverInfo,
  MatchFoundPayload,
  TripAcceptedPayload,
  TripRejectedPayload,
  ArrivalAlertPayload,
  LocationUpdatePayload,
  NegotiationDriverOfferPayload,
  NegotiationSessionExpiredPayload,
  NegotiationAssignedPayload,
  NegotiationFallbackPayload,
  ReservationDriverAssignedPayload,
  ReservationReminderPayload,
  ReservationCancelledPayload,
  ReservationModifiedPayload,
  StopAddedPayload,
  DestinationUpdatedPayload,
  WaitingStatusPayload,
  TollAddedPayload,
  ChatMessagePayload,
  TripCompletedPayload,
  SOSAlertPayload,
  SafetyAlertPayload,
  CustomerSocketState,
} from '../services/customerSocketService'

export type {
  SocketEvent,
  DriverInfo,
  MatchFoundPayload,
  TripAcceptedPayload,
  TripRejectedPayload,
  ArrivalAlertPayload,
  LocationUpdatePayload,
  NegotiationDriverOfferPayload,
  NegotiationSessionExpiredPayload,
  NegotiationAssignedPayload,
  NegotiationFallbackPayload,
  ReservationDriverAssignedPayload,
  ReservationReminderPayload,
  ReservationCancelledPayload,
  ReservationModifiedPayload,
  StopAddedPayload,
  DestinationUpdatedPayload,
  WaitingStatusPayload,
  TollAddedPayload,
  ChatMessagePayload,
  TripCompletedPayload,
  SOSAlertPayload,
  SafetyAlertPayload,
}

export interface UseCustomerSocketReturn {
  connected: boolean
  socket: Socket | null

  // Room management
  joinTrip: (tripId: string) => void
  joinCustomerRoom: () => void
  leaveTrip: (tripId: string) => void
  joinParcelRoom: (parcelId: string) => void
  leaveParcelRoom: (parcelId: string) => void

  // Generic listener
  on: (event: SocketEvent | string, handler: (...args: any[]) => void) => void
  off: (event: SocketEvent | string, handler?: (...args: any[]) => void) => void

  // Stateful reactive events
  matchFound: MatchFoundPayload | null
  tripAccepted: TripAcceptedPayload | null
  tripRejected: TripRejectedPayload | null
  arrivalAlert: ArrivalAlertPayload | null
  driverLocation: LocationUpdatePayload | null

  // Feature 4: Reservation stateful events
  reservationDriverAssigned: ReservationDriverAssignedPayload | null
  reservationReminder: ReservationReminderPayload | null
  reservationCancelled: ReservationCancelledPayload | null
  reservationModified: ReservationModifiedPayload | null

  // Feature 5: Negotiation stateful events
  negotiationDriverOffer: NegotiationDriverOfferPayload | null
  negotiationSessionExpired: NegotiationSessionExpiredPayload | null
  negotiationAssigned: NegotiationAssignedPayload | null
  negotiationFallback: NegotiationFallbackPayload | null

  // Feature 8: During Ride stateful events
  stopAdded: StopAddedPayload | null
  destinationUpdated: DestinationUpdatedPayload | null
  waitingStatus: WaitingStatusPayload | null
  tollAdded: TollAddedPayload | null
  newChatMessage: ChatMessagePayload | null

  // Feature 9 & 10: Safety & Trip Completion stateful events
  tripCompleted: TripCompletedPayload | null
  sosAlert: SOSAlertPayload | null
  safetyAlert: SafetyAlertPayload | null

  // 3KM OTP Proximity stateful events
  otpData: { ride_request_id: string; otp: string; distance_km: number; eta_min: number; message: string } | null

  // Org Student proximity alert
  orgStudentAlert: { trip_id: string; booking_id: string; distance_km: number; message: string } | null
  clearOrgStudentAlert: () => void

  // Clearers
  clearMatchFound: () => void
  clearTripAccepted: () => void
  clearTripRejected: () => void
  clearArrivalAlert: () => void
  clearOtpData: () => void
  clearReservationDriverAssigned: () => void
  clearReservationReminder: () => void
  clearReservationCancelled: () => void
  clearReservationModified: () => void

  // Feature 5: Negotiation clearers
  clearNegotiationDriverOffer: () => void
  clearNegotiationSessionExpired: () => void
  clearNegotiationAssigned: () => void
  clearNegotiationFallback: () => void

  // Feature 8: During Ride clearers
  clearStopAdded: () => void
  clearDestinationUpdated: () => void
  clearWaitingStatus: () => void
  clearTollAdded: () => void
  clearNewChatMessage: () => void

  // Feature 9 & 10: Safety & Trip Completion clearers
  clearTripCompleted: () => void
  clearSOSAlert: () => void
  clearSafetyAlert: () => void

  // Location broadcast for corridor matching
  sendLocationUpdate: (lat: number, lng: number) => void

  // Reconnect sync callback registration
  onReconnectSyncTrips: (callback: () => void) => void
}

function shallowEqual(a: any, b: any): boolean {
  if (a === b) return true
  if (!a || !b) return false
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  for (const key of keysA) {
    const va = a[key]
    const vb = b[key]
    if (typeof va === 'object' && va !== null) {
      if (JSON.stringify(va) !== JSON.stringify(vb)) return false
    } else if (va !== vb) {
      return false
    }
  }
  return true
}

export function useCustomerSocket(): UseCustomerSocketReturn {
  const [socketState, setSocketState] = useState<CustomerSocketState>(() => CustomerSocketService.getState())

  useEffect(() => {
    CustomerSocketService.init()

    const unsub = CustomerSocketService.subscribe((s) => {
      setSocketState((prev) => (shallowEqual(prev, s) ? prev : s))
    })

    return unsub
  }, [])

  const joinTrip = useCallback((tripId: string) => {
    CustomerSocketService.joinTrip(tripId)
  }, [])

  const leaveTrip = useCallback((tripId: string) => {
    CustomerSocketService.leaveTrip(tripId)
  }, [])

  const joinCustomerRoom = useCallback(() => {
    CustomerSocketService.joinCustomerRoom()
  }, [])

  const joinParcelRoom = useCallback((parcelId: string) => {
    CustomerSocketService.joinParcelRoom(parcelId)
  }, [])

  const leaveParcelRoom = useCallback((parcelId: string) => {
    CustomerSocketService.leaveParcelRoom(parcelId)
  }, [])

  const sendLocationUpdate = useCallback((lat: number, lng: number) => {
    CustomerSocketService.sendLocationUpdate(lat, lng)
  }, [])

  const on = useCallback((event: SocketEvent | string, handler: (...args: any[]) => void) => {
    CustomerSocketService.on(event, handler)
  }, [])

  const off = useCallback((event: SocketEvent | string, handler?: (...args: any[]) => void) => {
    CustomerSocketService.off(event, handler)
  }, [])

  const onReconnectSyncTrips = useCallback((callback: () => void) => {
    CustomerSocketService.registerReconnectSync(callback)
  }, [])

  // Clearers
  const clearMatchFound = useCallback(() => CustomerSocketService.clearMatchFound(), [])
  const clearTripAccepted = useCallback(() => CustomerSocketService.clearTripAccepted(), [])
  const clearTripRejected = useCallback(() => CustomerSocketService.clearTripRejected(), [])
  const clearArrivalAlert = useCallback(() => CustomerSocketService.clearArrivalAlert(), [])
  const clearOtpData = useCallback(() => CustomerSocketService.clearOtpData(), [])
  const clearReservationDriverAssigned = useCallback(() => CustomerSocketService.clearReservationDriverAssigned(), [])
  const clearReservationReminder = useCallback(() => CustomerSocketService.clearReservationReminder(), [])
  const clearReservationCancelled = useCallback(() => CustomerSocketService.clearReservationCancelled(), [])
  const clearReservationModified = useCallback(() => CustomerSocketService.clearReservationModified(), [])
  const clearNegotiationDriverOffer = useCallback(() => CustomerSocketService.clearNegotiationDriverOffer(), [])
  const clearNegotiationSessionExpired = useCallback(() => CustomerSocketService.clearNegotiationSessionExpired(), [])
  const clearNegotiationAssigned = useCallback(() => CustomerSocketService.clearNegotiationAssigned(), [])
  const clearNegotiationFallback = useCallback(() => CustomerSocketService.clearNegotiationFallback(), [])
  const clearStopAdded = useCallback(() => CustomerSocketService.clearStopAdded(), [])
  const clearDestinationUpdated = useCallback(() => CustomerSocketService.clearDestinationUpdated(), [])
  const clearWaitingStatus = useCallback(() => CustomerSocketService.clearWaitingStatus(), [])
  const clearTollAdded = useCallback(() => CustomerSocketService.clearTollAdded(), [])
  const clearNewChatMessage = useCallback(() => CustomerSocketService.clearNewChatMessage(), [])
  const clearTripCompleted = useCallback(() => CustomerSocketService.clearTripCompleted(), [])
  const clearSOSAlert = useCallback(() => CustomerSocketService.clearSOSAlert(), [])
  const clearSafetyAlert = useCallback(() => CustomerSocketService.clearSafetyAlert(), [])
  const clearOrgStudentAlert = useCallback(() => CustomerSocketService.clearOrgStudentAlert(), [])

  return {
    connected: socketState.connected,
    socket: CustomerSocketService.getSocket(),
    joinTrip,
    joinCustomerRoom,
    leaveTrip,
    joinParcelRoom,
    leaveParcelRoom,
    on,
    off,
    matchFound: socketState.matchFound,
    tripAccepted: socketState.tripAccepted,
    tripRejected: socketState.tripRejected,
    arrivalAlert: socketState.arrivalAlert,
    driverLocation: socketState.driverLocation,
    otpData: socketState.otpData,
    orgStudentAlert: socketState.orgStudentAlert,
    clearOrgStudentAlert,
    reservationDriverAssigned: socketState.reservationDriverAssigned,
    reservationReminder: socketState.reservationReminder,
    reservationCancelled: socketState.reservationCancelled,
    reservationModified: socketState.reservationModified,
    clearMatchFound,
    clearTripAccepted,
    clearTripRejected,
    clearArrivalAlert,
    clearOtpData,
    clearReservationDriverAssigned,
    clearReservationReminder,
    clearReservationCancelled,
    clearReservationModified,
    negotiationDriverOffer: socketState.negotiationDriverOffer,
    negotiationSessionExpired: socketState.negotiationSessionExpired,
    negotiationAssigned: socketState.negotiationAssigned,
    negotiationFallback: socketState.negotiationFallback,
    clearNegotiationDriverOffer,
    clearNegotiationSessionExpired,
    clearNegotiationAssigned,
    clearNegotiationFallback,
    stopAdded: socketState.stopAdded,
    destinationUpdated: socketState.destinationUpdated,
    waitingStatus: socketState.waitingStatus,
    tollAdded: socketState.tollAdded,
    newChatMessage: socketState.newChatMessage,
    clearStopAdded,
    clearDestinationUpdated,
    clearWaitingStatus,
    clearTollAdded,
    clearNewChatMessage,
    tripCompleted: socketState.tripCompleted,
    sosAlert: socketState.sosAlert,
    safetyAlert: socketState.safetyAlert,
    clearTripCompleted,
    clearSOSAlert,
    clearSafetyAlert,
    sendLocationUpdate,
    onReconnectSyncTrips,
  }
}
