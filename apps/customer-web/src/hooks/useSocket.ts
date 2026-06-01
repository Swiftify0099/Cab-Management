/**
 * useSocket — Socket.IO hook for CabBooking real-time events.
 * Connects to WebSocket gateway with JWT auth, reconnects automatically.
 */
import { useEffect, useRef, useCallback, useState } from 'react'
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
    socketRef.current = socket

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
      socketRef.current = null
      setSocketObj(null)
      setConnected(false)
    }
  }, [accessToken])

  const joinTrip = useCallback((tripId: string) => {
    socketRef.current?.emit('join_trip', { trip_id: tripId })
  }, [])

  const leaveTrip = useCallback((tripId: string) => {
    socketRef.current?.emit('leave_trip', { trip_id: tripId })
  }, [])

  const sendSOS = useCallback((data: object) => {
    socketRef.current?.emit('sos_trigger', data)
  }, [])

  const on = useCallback((event: string, handler: (data: any) => void) => {
    socketRef.current?.on(event, handler)
  }, [])

  const off = useCallback((event: string, handler: (data: any) => void) => {
    socketRef.current?.off(event, handler)
  }, [])

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
