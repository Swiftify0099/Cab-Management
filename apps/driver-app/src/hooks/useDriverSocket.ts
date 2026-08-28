/**
 * Driver Socket Hook — Production WebSocket Manager (Singleton Consumer)
 * ─────────────────────────────────────────────────────────────────────────────
 * Delegates to DriverSocketService singleton so only ONE socket connection exists.
 * Does NOT disconnect socket on component unmount, preventing reconnect loops and
 * "Connecting..." / "Network connection weak" stuck UI states.
 */
import { useEffect, useState, useCallback } from 'react'
import {
  DriverSocketService,
  IncomingRideRequestPayload,
  LocationUpdatePayload,
  PendingCustomer,
  ArrivalAlertPayload,
  CorridorCustomerPayload,
} from '../services/driverSocketService'

export type {
  IncomingRideRequestPayload as IncomingRequest,
  LocationUpdatePayload,
  PendingCustomer,
  ArrivalAlertPayload,
  CorridorCustomerPayload,
}

interface UseDriverSocketReturn {
  connected: boolean
  socketReady: boolean
  incomingRequest: any | null
  pendingRequests: IncomingRideRequestPayload[]
  pendingCustomers: PendingCustomer[]
  corridorCustomers: CorridorCustomerPayload[]
  arrivalAlert: ArrivalAlertPayload | null
  clearRequest: () => void
  clearArrivalAlert: () => void
  clearCorridorCustomers: () => void
  removeCorridorCustomer: (customerId: string) => void
  sendLocationUpdate: (payload: Omit<LocationUpdatePayload, 'driver_id' | 'timestamp'>) => void
  sendHeartbeat: (lat: number, lng: number) => void
  emitDriverOnline: () => void
  emitDriverOffline: () => void
  emitTripStarted: (tripId: string) => void
  emitTripCompleted: (tripId: string) => void
  emitRouteChanged: (tripId: string, newRoute: any) => void
  emitSOS: (payload: { trip_id: string; lat: number; lng: number }) => void
  emitParcelPicked: (parcelId: string, tripId: string) => void
  emitParcelDelivered: (parcelId: string, tripId: string) => void
  joinTrip: (tripId: string) => void
  leaveTrip: (tripId: string) => void
  joinDriverScan: (tripId: string) => void
  respondToRideOffer: (offerId: string, accepted: boolean, rejectionReason?: string) => void
  setIncomingRequest: React.Dispatch<React.SetStateAction<any | null>>
  on: (event: string, callback: (...args: any[]) => void) => void
  off: (event: string, callback?: (...args: any[]) => void) => void
}

// Lightweight shallow equality check to prevent spurious re-renders on heartbeat ticks
function shallowEqual(a: any, b: any): boolean {
  if (a === b) return true
  if (!a || !b) return false
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  for (const key of keysA) {
    // For objects/arrays (like pendingCustomers) do a JSON compare
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

export function useDriverSocket(): UseDriverSocketReturn {
  const [socketState, setSocketState] = useState(() => DriverSocketService.getState())

  useEffect(() => {
    // Ensure singleton is initialized
    DriverSocketService.init()

    // Subscribe to state changes — guard with shallowEqual to prevent
    // unnecessary re-renders from heartbeat ticks that don't change visible state
    const unsub = DriverSocketService.subscribe((s) => {
      setSocketState(prev => shallowEqual(prev, s) ? prev : s)
    })

    return unsub
  }, [])


  const clearRequest = useCallback(() => {
    DriverSocketService.clearIncomingRequest()
  }, [])

  const setIncomingRequest = useCallback((req: any) => {
    if (typeof req === 'function') {
      const current = DriverSocketService.getState().incomingRequest
      DriverSocketService.setIncomingRequest(req(current))
    } else {
      DriverSocketService.setIncomingRequest(req)
    }
  }, [])

  const clearArrivalAlert = useCallback(() => {
    // Handled in state
  }, [])

  const clearCorridorCustomers = useCallback(() => {
    // Handled in state
  }, [])

  const removeCorridorCustomer = useCallback((customerId: string) => {
    // Handled in state
  }, [])

  const sendLocationUpdate = useCallback(
    (payload: Omit<LocationUpdatePayload, 'driver_id' | 'timestamp'>) => {
      DriverSocketService.sendLocationUpdate(payload)
    },
    []
  )

  const sendHeartbeat = useCallback((lat: number, lng: number) => {
    DriverSocketService.emit('heartbeat', { latitude: lat, longitude: lng, ts: Date.now() })
  }, [])

  const emitDriverOnline = useCallback(() => {
    DriverSocketService.emit('DRIVER_ONLINE', { timestamp: Date.now() })
  }, [])

  const emitDriverOffline = useCallback(() => {
    DriverSocketService.emit('DRIVER_OFFLINE', { timestamp: Date.now() })
  }, [])

  const emitTripStarted = useCallback((tripId: string) => {
    DriverSocketService.emit('TRIP_STARTED', { trip_id: tripId, timestamp: Date.now() })
  }, [])

  const emitTripCompleted = useCallback((tripId: string) => {
    DriverSocketService.emit('TRIP_COMPLETED', { trip_id: tripId, timestamp: Date.now() })
  }, [])

  const emitRouteChanged = useCallback((tripId: string, newRoute: any) => {
    DriverSocketService.emit('ROUTE_CHANGED', { trip_id: tripId, route: newRoute, timestamp: Date.now() })
  }, [])

  const emitSOS = useCallback((payload: { trip_id: string; lat: number; lng: number }) => {
    DriverSocketService.emit('SOS_TRIGGERED', { ...payload, timestamp: Date.now() })
  }, [])

  const emitParcelPicked = useCallback((parcelId: string, tripId: string) => {
    DriverSocketService.emit('PARCEL_PICKED', { parcel_id: parcelId, trip_id: tripId, timestamp: Date.now() })
  }, [])

  const emitParcelDelivered = useCallback((parcelId: string, tripId: string) => {
    DriverSocketService.emit('PARCEL_DELIVERED', { parcel_id: parcelId, trip_id: tripId, timestamp: Date.now() })
  }, [])

  const joinTrip = useCallback((tripId: string) => {
    DriverSocketService.joinTrip(tripId)
  }, [])

  const leaveTrip = useCallback((tripId: string) => {
    DriverSocketService.leaveTrip(tripId)
  }, [])

  const joinDriverScan = useCallback((tripId: string) => {
    DriverSocketService.emit('join_driver_scan', { trip_id: tripId })
  }, [])

  const respondToRideOffer = useCallback((offerId: string, accepted: boolean, rejectionReason?: string) => {
    DriverSocketService.respondToRideOffer(offerId, accepted, rejectionReason)
  }, [])

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    DriverSocketService.on(event, callback)
  }, [])

  const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
    DriverSocketService.off(event, callback)
  }, [])

  return {
    connected: socketState.connected,
    socketReady: socketState.socketReady,
    incomingRequest: socketState.incomingRequest,
    pendingRequests: socketState.pendingRequests || [],
    pendingCustomers: socketState.pendingCustomers,
    corridorCustomers: socketState.corridorCustomers,
    arrivalAlert: socketState.arrivalAlert,
    clearRequest,
    clearArrivalAlert,
    clearCorridorCustomers,
    removeCorridorCustomer,
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
    joinTrip,
    leaveTrip,
    joinDriverScan,
    respondToRideOffer,
    setIncomingRequest,
    on,
    off,
  }
}
