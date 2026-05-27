/**
 * Incoming Trip Request Screen — Driver sees this when a booking is dispatched.
 * Shows: route, fare, customer info, countdown timer, accept/reject buttons.
 * Auto-dismisses on timeout.
 */
import { useEffect, useState, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Vibration, Alert,
} from 'react-native'
import { router } from 'expo-router'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const API = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:80/api/v1'
const TIMEOUT_SEC = 45

interface TripRequest {
  booking_id: string
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

interface IncomingRequestProps {
  request: TripRequest
  onDismiss: () => void
}

export default function IncomingRequestScreen({ request, onDismiss }: IncomingRequestProps) {
  const [countdown, setCountdown] = useState(request.timeout_sec || TIMEOUT_SEC)
  const [responding, setResponding] = useState(false)
  const pulseAnim = useRef(new Animated.Value(1)).current
  const progressAnim = useRef(new Animated.Value(1)).current
  const total = request.timeout_sec || TIMEOUT_SEC

  useEffect(() => {
    // Vibrate phone on incoming request
    Vibration.vibrate([300, 200, 300, 200, 300])

    // Countdown timer
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          onDismiss()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // Pulse animation (accept button)
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start()

    // Progress bar animation
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: total * 1000,
      useNativeDriver: false,
    }).start()

    return () => {
      clearInterval(timer)
      Vibration.cancel()
    }
  }, [])

  const respond = async (accepted: boolean) => {
    setResponding(true)
    Vibration.cancel()
    try {
      const token = await AsyncStorage.getItem('access_token')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      await axios.post(`${API}/matching/respond`, {
        booking_id: request.booking_id,
        accepted,
      }, { headers })

      if (accepted) {
        onDismiss()
        // Navigate to active trip screen
        router.push({
          pathname: '/active-trip',
          params: { bookingId: request.booking_id },
        } as any)
      } else {
        onDismiss()
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Could not submit response')
      setResponding(false)
    }
  }

  const dep = new Date(request.trip.departure_time)
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  })
  const urgentColor = countdown <= 10 ? '#EF4444' : countdown <= 20 ? '#F59E0B' : '#3B82F6'

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.incomingBadge}>
            <Text style={styles.incomingText}>🔔 INCOMING TRIP</Text>
          </View>
          <Text style={[styles.countdown, { color: urgentColor }]}>{countdown}s</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: urgentColor }]} />
        </View>

        {/* Route */}
        <View style={styles.routeCard}>
          <View style={styles.routeRow}>
            <View style={styles.routeDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.routeLabel}>PICKUP</Text>
              <Text style={styles.routeCity}>{request.trip.from}</Text>
            </View>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: '#EF4444' }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.routeLabel}>DROP OFF</Text>
              <Text style={styles.routeCity}>{request.trip.to}</Text>
            </View>
          </View>
        </View>

        {/* Trip Details */}
        <View style={styles.detailsGrid}>
          <DetailBox icon="💰" label="Earnings" value={`₹${Math.round(request.trip.fare * 0.9)}`} highlight />
          <DetailBox icon="📍" label="Distance" value={`${request.trip.distance_km} km`} />
          <DetailBox icon="💺" label="Seats" value={`${request.trip.seats} pax`} />
          <DetailBox icon="📅" label="Departure" value={dep.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} />
          {request.trip.has_parcel && <DetailBox icon="📦" label="Parcel" value="Yes" />}
        </View>

        {/* Earnings note */}
        <View style={styles.earningsNote}>
          <Text style={styles.earningsNoteText}>
            💡 You earn 90% of fare after platform fee
          </Text>
        </View>

        {/* Accept / Reject */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.rejectBtn, responding && { opacity: 0.5 }]}
            onPress={() => respond(false)}
            disabled={responding}
            activeOpacity={0.8}
          >
            <Text style={styles.rejectText}>✕ Reject</Text>
          </TouchableOpacity>

          <Animated.View style={[{ flex: 2 }, { transform: [{ scale: pulseAnim }] }]}>
            <TouchableOpacity
              style={[styles.acceptBtn, responding && { opacity: 0.5 }]}
              onPress={() => respond(true)}
              disabled={responding}
              activeOpacity={0.85}
            >
              <Text style={styles.acceptText}>
                {responding ? '...' : '✓ Accept Trip'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </View>
  )
}

function DetailBox({ icon, label, value, highlight }: {
  icon: string; label: string; value: string; highlight?: boolean
}) {
  return (
    <View style={[styles.detailBox, highlight && { borderColor: '#2563EB', borderWidth: 1.5 }]}>
      <Text style={styles.detailIcon}>{icon}</Text>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, highlight && { color: '#2563EB' }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  incomingBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  incomingText: { color: '#92400E', fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  countdown: { fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] },
  progressBar: { height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, marginBottom: 16, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  routeCard: {
    backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  routeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' },
  routeLine: { height: 20, width: 1.5, backgroundColor: '#E2E8F0', marginLeft: 4, marginVertical: 4 },
  routeLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5 },
  routeCity: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  detailBox: {
    flex: 1, minWidth: '28%', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 10,
    alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0',
  },
  detailIcon: { fontSize: 18, marginBottom: 3 },
  detailLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600', marginBottom: 2 },
  detailValue: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  earningsNote: {
    backgroundColor: '#EFF6FF', borderRadius: 10, padding: 10, marginBottom: 16,
  },
  earningsNoteText: { color: '#1D4ED8', fontSize: 12, textAlign: 'center', fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 10 },
  rejectBtn: {
    flex: 1, borderWidth: 2, borderColor: '#FCA5A5', borderRadius: 16,
    padding: 16, alignItems: 'center', backgroundColor: '#FEF2F2',
  },
  rejectText: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
  acceptBtn: {
    borderRadius: 16, padding: 16, alignItems: 'center',
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB', shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  acceptText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
})
