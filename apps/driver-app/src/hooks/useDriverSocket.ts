/**
 * Driver Socket Service — Manages Socket.IO connection for the driver app.
 * Handles: incoming trip requests, suspend notifications, location heartbeat.
 * 
 * Usage: Import useDriverSocket() in any screen to get real-time events.
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'

const WS_URL = (process.env.EXPO_PUBLIC_WS_URL || 'http://10.0.2.2:80').replace(/\/api\/v1$/, '')

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

interface UseDriverSocketReturn {
  connected: boolean
  incomingRequest: IncomingRequest | null
  clearRequest: () => void
  sendHeartbeat: (lat: number, lng: number) => void
}

export function useDriverSocket(): UseDriverSocketReturn {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [incomingRequest, setIncomingRequest] = useState<IncomingRequest | null>(null)
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)

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
        reconnectionDelay: 3000,
        reconnectionAttempts: 15,
      })

      socketRef.current = socket

      socket.on('connect', () => {
        setConnected(true)
        console.log('[DriverSocket] Connected:', socket!.id)
        // Start heartbeat every 25 seconds
        startHeartbeat(socket!)
      })

      socket.on('disconnect', () => {
        setConnected(false)
        stopHeartbeat()
        console.log('[DriverSocket] Disconnected')
      })

      // INCOMING TRIP REQUEST
      socket.on('INCOMING_TRIP_REQUEST', (data: IncomingRequest) => {
        console.log('[DriverSocket] Incoming trip request:', data.booking_id)
        setIncomingRequest(data)
      })

      // BOOKING_EXPIRED — another driver was picked
      socket.on('BOOKING_EXPIRED', () => {
        setIncomingRequest(null)
      })

      // SUSPENDED — penalty threshold reached
      socket.on('SUSPENDED', (data: any) => {
        console.warn('[DriverSocket] Account suspended:', data.reason)
        setIncomingRequest(null)
      })

      // CONNECTED ack
      socket.on('CONNECTED', (data: any) => {
        console.log('[DriverSocket] Gateway ack:', data.message)
      })
    }

    const startHeartbeat = async (s: Socket) => {
      const sendBeat = async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync()
          if (status !== 'granted') return
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
          s.emit('heartbeat', {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            ts: Date.now(),
          })
        } catch (e) {
          // Location unavailable — send heartbeat without location
          s.emit('heartbeat', { ts: Date.now() })
        }
      }
      await sendBeat()
      heartbeatRef.current = setInterval(sendBeat, 25000)
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
      socket?.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [])

  const clearRequest = useCallback(() => {
    setIncomingRequest(null)
  }, [])

  const sendHeartbeat = useCallback((lat: number, lng: number) => {
    socketRef.current?.emit('heartbeat', { latitude: lat, longitude: lng, ts: Date.now() })
  }, [])

  return { connected, incomingRequest, clearRequest, sendHeartbeat }
}
