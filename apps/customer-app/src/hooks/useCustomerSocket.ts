import { useEffect, useRef, useCallback, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import AsyncStorage from '@react-native-async-storage/async-storage'

const WS_URL = (process.env.EXPO_PUBLIC_WS_URL || 'http://10.0.2.2:80').replace(/\/api\/v1$/, '')

export type SocketEvent =
  | 'CONNECTED'
  | 'DRIVER_ACCEPTED'
  | 'MATCHING_FAILED'
  | 'LOCATION_UPDATE'
  | 'TRIP_STARTED'
  | 'TRIP_COMPLETED'
  | 'BOOKING_EXPIRED'
  | 'SOS_ACK'

export interface DriverInfo {
  driver_id: string
  full_name: string
  rating: number
  phone: string
  vehicle: string
  registration_number: string
  vehicle_type: string
  distance_km: number
}

interface UseCustomerSocketReturn {
  connected: boolean
  socket: Socket | null
  joinTrip: (tripId: string) => void
  leaveTrip: (tripId: string) => void
  on: (event: SocketEvent, handler: (data: any) => void) => void
  off: (event: SocketEvent, handler: (data: any) => void) => void
}

export function useCustomerSocket(): UseCustomerSocketReturn {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    let socket: Socket | null = null

    const connect = async () => {
      const token = await AsyncStorage.getItem('access_token')
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

      socket.on('connect', () => {
        setConnected(true)
        console.log('[CustomerSocket] Connected:', socket!.id)
      })

      socket.on('disconnect', (reason) => {
        setConnected(false)
        console.log('[CustomerSocket] Disconnected:', reason)
      })

      socket.on('connect_error', (err) => {
        console.warn('[CustomerSocket] Connection error:', err.message)
      })
    }

    connect()

    return () => {
      socket?.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [])

  const joinTrip = useCallback((tripId: string) => {
    socketRef.current?.emit('join_trip', { trip_id: tripId })
  }, [])

  const leaveTrip = useCallback((tripId: string) => {
    socketRef.current?.emit('leave_trip', { trip_id: tripId })
  }, [])

  const on = useCallback((event: SocketEvent, handler: (data: any) => void) => {
    socketRef.current?.on(event, handler)
  }, [])

  const off = useCallback((event: SocketEvent, handler: (data: any) => void) => {
    socketRef.current?.off(event, handler)
  }, [])

  return { connected, socket: socketRef.current, joinTrip, leaveTrip, on, off }
}
