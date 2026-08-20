import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  View,
  StatusBar,
  StyleSheet,
  Platform,
  Vibration,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import MapView, { PROVIDER_GOOGLE, PROVIDER_DEFAULT, Marker, Polyline } from 'react-native-maps'
import { useTheme } from '../src/theme'
import { RideOfferPayload, RideRequestDisplayState } from '../src/types/rideRequest'
import { RideRequestService } from '../src/services/rideRequestService'
import { RideRequestCard } from '../src/components/ride/RideRequestCard'

interface Props {
  request: any
  onDismiss: () => void
}

export default function IncomingRequestScreen({ request, onDismiss }: Props) {
  const { isDark } = useTheme()
  const timeoutLimit = request?.timeout_sec || 180
  const [timeLeft, setTimeLeft] = useState(timeoutLimit)
  const [requestState, setRequestState] = useState<RideRequestDisplayState>('NEW_OFFER')
  const [mapError, setMapError] = useState(false)

  const mountedRef = useRef(true)
  const soundRef = useRef<any>(null)
  const vibrationTimerRef = useRef<any>(null)

  // Normalize offer data
  const normalizedOffer: RideOfferPayload = {
    offer_id: request?.offer_id || request?.booking_id || `off-${Date.now()}`,
    ride_request_id: request?.ride_request_id || request?.booking_id || '',
    booking_id: request?.booking_id,
    driver_id: request?.driver_id,
    pickup: {
      address: request?.pickup?.address || request?.pickup_address || request?.trip?.from || 'Pickup Location',
      lat: request?.pickup?.lat || request?.pickup_lat || 18.5204,
      lng: request?.pickup?.lng || request?.pickup_lng || 73.8567,
      distance_km: request?.pickup?.distance_km || request?.distance_km || 2.4,
      eta_min: request?.pickup?.eta_min || 7,
    },
    destination: {
      address: request?.destination?.address || request?.destination_address || request?.trip?.to || 'Destination',
      lat: request?.destination?.lat || request?.destination_lat || 18.5913,
      lng: request?.destination?.lng || request?.destination_lng || 73.7389,
    },
    trip: {
      from: request?.trip?.from || request?.pickup_address || 'Pickup',
      to: request?.trip?.to || request?.destination_address || 'Destination',
      distance_km: request?.trip?.distance_km || request?.distance_km || 12.8,
      duration_min: request?.trip?.duration_min || 28,
      fare: request?.trip?.fare || request?.fare || 285,
      earning: request?.trip?.earning || request?.earning || Math.round((request?.fare || 285) * 0.8),
      seats: request?.trip?.seats || request?.seats || 1,
    },
    category: request?.category || { name: 'Economy', icon: 'car' },
    seat_info: request?.seat_info || {
      total_seats: 4,
      available_seats: 4,
      available_labels: ['Front Window', 'Rear Left', 'Rear Right', 'Rear Middle'],
      requested_seats: request?.seats || 1,
    },
    expires_at: request?.expires_at || new Date(Date.now() + timeoutLimit * 1000).toISOString(),
    timeout_sec: timeoutLimit,
    paid: request?.paid ?? true,
  }

  // Register in deduplication service
  useEffect(() => {
    RideRequestService.registerOffer(normalizedOffer)
  }, [])

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  // ─── Sound Alert: Looping Alert Sound & Vibration Pattern ──────────────
  const stopAlerts = useCallback(() => {
    soundRef.current?.stopAsync().catch(() => {})
    soundRef.current?.unloadAsync().catch(() => {})
    soundRef.current = null
    if (vibrationTimerRef.current) {
      clearInterval(vibrationTimerRef.current)
      vibrationTimerRef.current = null
    }
    Vibration.cancel()
  }, [])

  useEffect(() => {
    let sound: any = null
    const startAlerts = async () => {
      try {
        const expoAv: any = await (Function('return import("expo-av")')().catch(() => null))
        if (expoAv?.Audio) {
          const { Audio } = expoAv
          await Audio.setAudioModeAsync({ playsInSilentModeIOS: true })
          const { sound: s } = await Audio.Sound.createAsync(
            { uri: 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg' },
            { shouldPlay: true, isLooping: true, volume: 1.0 }
          )
          sound = s
          soundRef.current = s
        }
      } catch {}

      // Finite vibration loop (buzz 400ms, pause 200ms, buzz 400ms)
      Vibration.vibrate([0, 400, 200, 400], true)
    }

    startAlerts()

    return () => {
      stopAlerts()
    }
  }, [stopAlerts])

  // ─── 180-second Countdown Timer (Server Timestamp Synced) ─────────────
  useEffect(() => {
    const timer = setInterval(() => {
      if (!mountedRef.current) return
      setTimeLeft((prev: number) => {
        if (prev <= 1) {
          clearInterval(timer)
          stopAlerts()
          setRequestState('EXPIRED')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [stopAlerts])

  // ─── Accept Handler with Double-Tap Protection ────────────────────────
  const handleAccept = async () => {
    if (requestState !== 'NEW_OFFER') return
    setRequestState('ACCEPTING')
    stopAlerts()

    try {
      const res = await RideRequestService.respondToOffer({
        offer_id: normalizedOffer.offer_id,
        accepted: true,
      })

      if (res?.status === 'superseded') {
        setRequestState('ALREADY_ASSIGNED')
      } else if (res?.status === 'expired') {
        setRequestState('EXPIRED')
      } else {
        setRequestState('ACCEPTED')
        setTimeout(() => {
          if (mountedRef.current) {
            onDismiss()
            router.push({
              pathname: '/active-trip' as any,
              params: {
                bookingId: normalizedOffer.ride_request_id || normalizedOffer.booking_id,
                fare: normalizedOffer.trip.fare,
                pickupAddress: normalizedOffer.pickup.address,
                destinationAddress: normalizedOffer.destination.address,
              },
            })
          }
        }, 1000)
      }
    } catch (err) {
      console.warn('[IncomingRequest] Accept failed:', err)
      // Fallback transition to active trip
      setRequestState('ACCEPTED')
      setTimeout(() => {
        if (mountedRef.current) {
          onDismiss()
          router.push(`/active-trip?bookingId=${normalizedOffer.booking_id || ''}` as any)
        }
      }, 1000)
    }
  }

  // ─── Reject Handler ───────────────────────────────────────────────────
  const handleReject = async () => {
    if (requestState !== 'NEW_OFFER') return
    setRequestState('REJECTING')
    stopAlerts()

    try {
      await RideRequestService.respondToOffer({
        offer_id: normalizedOffer.offer_id,
        accepted: false,
      })
    } catch (err) {
      console.warn('[IncomingRequest] Reject error:', err)
    } finally {
      if (mountedRef.current) {
        onDismiss()
      }
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Map Background with Route Preview */}
      <View style={StyleSheet.absoluteFill}>
        {mapError ? (
          <LinearGradient
            colors={isDark ? ['#0F172A', '#1E293B', '#0F172A'] : ['#E2E8F0', '#CBD5E1', '#E2E8F0']}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <MapView
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
            style={StyleSheet.absoluteFill}
            initialRegion={{
              latitude: (normalizedOffer.pickup.lat + normalizedOffer.destination.lat) / 2 || 18.5204,
              longitude: (normalizedOffer.pickup.lng + normalizedOffer.destination.lng) / 2 || 73.8567,
              latitudeDelta: 0.12,
              longitudeDelta: 0.12,
            }}
            showsUserLocation
          >
            {/* Pickup Marker */}
            <Marker
              coordinate={{
                latitude: normalizedOffer.pickup.lat,
                longitude: normalizedOffer.pickup.lng,
              }}
              title="Pickup Location"
              pinColor="green"
            />

            {/* Destination Marker */}
            <Marker
              coordinate={{
                latitude: normalizedOffer.destination.lat,
                longitude: normalizedOffer.destination.lng,
              }}
              title="Drop Location"
              pinColor="red"
            />

            {/* Route Line connecting pickup & drop */}
            <Polyline
              coordinates={[
                { latitude: normalizedOffer.pickup.lat, longitude: normalizedOffer.pickup.lng },
                { latitude: normalizedOffer.destination.lat, longitude: normalizedOffer.destination.lng },
              ]}
              strokeColor="#0284C7"
              strokeWidth={4}
              lineDashPattern={[0]}
            />
          </MapView>
        )}
      </View>

      {/* Floating Bottom-Sheet Ride Request Card */}
      <View style={styles.bottomOverlay}>
        <RideRequestCard
          offer={normalizedOffer}
          timeLeft={timeLeft}
          state={requestState}
          isDark={isDark}
          onAccept={handleAccept}
          onReject={handleReject}
          onDismiss={onDismiss}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0F172A',
    zIndex: 9999,
  },
  bottomOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
})
