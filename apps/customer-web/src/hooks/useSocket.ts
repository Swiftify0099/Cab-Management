/**
 * useSocket — Socket.IO hook for CabBooking real-time events.
 * Connects to WebSocket gateway with JWT auth, reconnects automatically.
 */
import { useEffect, useCallback, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../store/auth.store'

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:80'

export type SocketEvent =
  | 'CONNECTED'
  | 'DRIVER_ACCEPTED'
  | 'MATCHING_FAILED'
  | 'LOCATION_UPDATE'
  | 'TRIP_STARTED'
  | 'TRIP_COMPLETED'
  | 'BOOKING_EXPIRED'
  | 'SOS_ACK'

export interface UseSocketReturn {
  socket: Socket | null
  connected: boolean
  joinTrip: (tripId: string) => void
  leaveTrip: (tripId: string) => void
  sendSOS: (data: object) => void
  on: (event: string, handler: (data: any) => void) => void
  off: (event: string, handler: (data: any) => void) => void
}

export function useSocket(): UseSocketReturn {
  const { accessToken } = useAuthStore()
  const [socketObj, setSocketObj] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!accessToken) return

    const socket = io(WS_URL, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      auth: { token: `Bearer ${accessToken}` },
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
    })

    setSocketObj(socket)

    socket.on('connect', () => {
      setConnected(true)
      console.log('[Socket] Connected:', socket.id)
    })

    socket.on('disconnect', (reason) => {
      setConnected(false)
      console.log('[Socket] Disconnected:', reason)
    })

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message)
    })

    return () => {
      socket.disconnect()
      setSocketObj(null)
      setConnected(false)
    }
  }, [accessToken])

  const joinTrip = useCallback((tripId: string) => {
    socketObj?.emit('join_trip', { trip_id: tripId })
  }, [socketObj])

  const leaveTrip = useCallback((tripId: string) => {
    socketObj?.emit('leave_trip', { trip_id: tripId })
  }, [socketObj])

  const sendSOS = useCallback((data: object) => {
    socketObj?.emit('sos_trigger', data)
  }, [socketObj])

  const on = useCallback((event: string, handler: (data: any) => void) => {
    socketObj?.on(event, handler)
  }, [socketObj])

  const off = useCallback((event: string, handler: (data: any) => void) => {
    socketObj?.off(event, handler)
  }, [socketObj])

  return {
    socket: socketObj,
    connected,
    joinTrip,
    leaveTrip,
    sendSOS,
    on,
    off,
  }
}
