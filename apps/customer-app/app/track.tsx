/**
 * Live Trip Tracking Screen — Customer App
 * Phase 3 (P3.1): Animates driver marker in real-time from LOCATION_UPDATE WebSocket events.
 * Shows ETA, arrival alert, SOS, share + call actions.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Linking, Share, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps'
import { useCustomerSocket, LocationUpdatePayload, ArrivalAlertPayload } from '../src/hooks/useCustomerSocket'
import { api } from '../src/api/client'

export default function TrackTripScreen() {
  const { bookingId, tripId, isParcel } = useLocalSearchParams<{ bookingId?: string; tripId?: string; isParcel?: string }>()
  const [booking, setBooking] = useState<any>(null)

  // ── WebSocket hook ──────────────────────────────────────────────────────────
  const {
    connected, joinTrip, leaveTrip,
    driverLocation, arrivalAlert,
    clearArrivalAlert, on, off,
  } = useCustomerSocket()

  // ── Animated driver marker position ────────────────────────────────────────
  const mapRef = useRef<MapView>(null)
  const prevLocation = useRef<{ latitude: number; longitude: number } | null>(null)
  const animLat = useRef(new Animated.Value(19.076)).current
  const animLng = useRef(new Animated.Value(72.877)).current
  const [markerPos, setMarkerPos] = useState<{ latitude: number; longitude: number } | null>(null)

  // ── ETA state ──────────────────────────────────────────────────────────────
  const [eta, setEta] = useState<number | null>(null)
  const [distKm, setDistKm] = useState<number | null>(null)
  const [tripStatus, setTripStatus] = useState<'waiting' | 'started' | 'completed'>('waiting')

  // ── Load booking details ────────────────────────────────────────────────────
  const fetchBooking = useCallback(async () => {
    if (isParcel === 'true') {
      // For parcels, we just use a generic fallback for now or we could fetch trip details
      setBooking({
        driver: { full_name: 'Courier Driver', rating: 4.9, vehicle: 'Delivery Van', registration: '—' },
        eta_minutes: null,
      })
      return
    }
    
    if (!bookingId) return
    try {
      const res = await api.get(`/bookings/${bookingId}`)
      const data = res.data?.data || res.data
      setBooking(data)
    } catch {
      // Fallback: show minimal driver info
      setBooking({
        driver: { full_name: 'Your Driver', rating: 4.8, vehicle: 'Sedan', registration: '—' },
        eta_minutes: null,
      })
    }
  }, [bookingId, isParcel])

  // ── Join WebSocket room + subscribe to events ──────────────────────────────
  useEffect(() => {
    fetchBooking()
  }, [fetchBooking])

  useEffect(() => {
    const roomToJoin = tripId || bookingId
    if (connected && roomToJoin) {
      joinTrip(roomToJoin)
      console.log('[TrackScreen] Joined trip room:', roomToJoin)
    }
    return () => {
      if (roomToJoin) leaveTrip(roomToJoin)
    }
  }, [connected, bookingId, tripId, joinTrip, leaveTrip])

  // ── Animate driver marker on LOCATION_UPDATE ──────────────────────────────
  useEffect(() => {
    if (!driverLocation) return
    const { latitude, longitude, eta_minutes, distance_remaining_km } = driverLocation

    if (eta_minutes !== null) setEta(eta_minutes)
    if (distance_remaining_km !== null) setDistKm(distance_remaining_km)

    if (!prevLocation.current) {
      // First location — set immediately without animation
      prevLocation.current = { latitude, longitude }
      animLat.setValue(latitude)
      animLng.setValue(longitude)
      setMarkerPos({ latitude, longitude })
    } else {
      // Smooth interpolation to new position (500ms)
      Animated.parallel([
        Animated.timing(animLat, { toValue: latitude, duration: 500, useNativeDriver: false }),
        Animated.timing(animLng, { toValue: longitude, duration: 500, useNativeDriver: false }),
      ]).start()
      // Keep markerPos in sync for MapView (Animated.Value can't drive Marker directly)
      setMarkerPos({ latitude, longitude })
      prevLocation.current = { latitude, longitude }
    }

    // Pan map to follow driver
    mapRef.current?.animateToRegion({
      latitude,
      longitude,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    }, 600)
  }, [driverLocation])

  // ── ARRIVAL_ALERT: driver within 10km / 10min ─────────────────────────────
  useEffect(() => {
    if (!arrivalAlert) return
    const { distance_km, eta_minutes, driver_phone } = arrivalAlert
    setDistKm(distance_km)
    if (eta_minutes) setEta(eta_minutes)

    const phoneInfo = driver_phone ? `\n📞 Driver: ${driver_phone}` : ''
    Alert.alert(
      '🚗 Driver is Near!',
      `Your driver is ${distance_km.toFixed(1)}km away — ETA ${eta_minutes} min.${phoneInfo}`,
      [{ text: 'OK', onPress: clearArrivalAlert }]
    )
  }, [arrivalAlert, clearArrivalAlert])

  // ── TRIP_STARTED / TRIP_COMPLETED events ──────────────────────────────────
  useEffect(() => {
    const handleStarted = () => setTripStatus('started')
    const handleCompleted = () => {
      setTripStatus('completed')
      const dId = booking?.driver?.id || '';
      const bId = bookingId || '';
      router.replace(`/rate-trip?bookingId=${bId}&driverId=${dId}` as any)
    }
    on('TRIP_STARTED', handleStarted)
    on('TRIP_COMPLETED', handleCompleted)
    return () => {
      off('TRIP_STARTED', handleStarted)
      off('TRIP_COMPLETED', handleCompleted)
    }
  }, [on, off])

  const handleSOS = () => {
    Alert.alert(
      '🚨 Emergency SOS',
      'This will call emergency services and alert the admin.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call 112', style: 'destructive', onPress: () => Linking.openURL('tel:112') },
      ]
    )
  }

  const handleShare = async () => {
    const driver = booking?.driver
    await Share.share({
      message: `I'm being picked up by ${driver?.full_name || 'my driver'} (${driver?.registration || '—'}) on Swiftify. Track me: https://swiftify.app/track/${bookingId}`,
    })
  }

  const handleCall = () => {
    const phone = booking?.driver?.phone
    if (phone) {
      Linking.openURL(`tel:${phone}`)
    } else {
      Alert.alert('Driver Contact', 'Driver phone number will be available once they are within 10 km.')
    }
  }

  // ── ETA display ────────────────────────────────────────────────────────────
  const etaLabel = eta !== null
    ? `${eta} min${distKm ? ` • ${distKm.toFixed(1)} km away` : ''}`
    : booking?.eta_minutes
      ? `${booking.eta_minutes} min`
      : 'Calculating…'

  const arrivalTime = eta !== null
    ? new Date(Date.now() + eta * 60000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : '—'

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      {/* Map */}
      <View style={StyleSheet.absoluteFill}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: booking?.pickup_lat || 19.076,
            longitude: booking?.pickup_lon || 72.877,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          }}
        >
          {/* Pickup pin */}
          {booking?.pickup_lat && (
            <Marker
              coordinate={{ latitude: booking.pickup_lat, longitude: booking.pickup_lon }}
              title="Pickup"
              pinColor="#3B82F6"
            />
          )}
          {/* Destination pin */}
          {booking?.destination_lat && (
            <Marker
              coordinate={{ latitude: booking.destination_lat, longitude: booking.destination_lon }}
              title="Destination"
              pinColor="#EF4444"
            />
          )}
          {/* Animated driver car marker */}
          {markerPos && (
            <Marker
              coordinate={markerPos}
              title={booking?.driver?.full_name || 'Driver'}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.carMarker}>
                <MaterialCommunityIcons name="car-side" size={28} color="#1E3A8A" />
              </View>
            </Marker>
          )}
        </MapView>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="chevron-left" size={28} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Live Tracking</Text>
          <View style={styles.connDot}>
            <View style={[styles.connIndicator, { backgroundColor: connected ? '#22C55E' : '#F59E0B' }]} />
            <Text style={styles.connText}>{connected ? 'Live' : 'Connecting…'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.sosBtn} onPress={handleSOS}>
          <View style={styles.sosRing} />
          <MaterialCommunityIcons name="shield-check" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.sosLabel}>SOS</Text>
      </View>

      <View style={{ flex: 1 }} />

      {/* Bottom Sheet */}
      <View style={styles.sheet}>

        {/* Trip status banner */}
        {tripStatus === 'started' && (
          <View style={styles.statusBanner}>
            <MaterialCommunityIcons name="car-side" size={16} color="#065F46" />
            <Text style={styles.statusText}>Trip in Progress</Text>
          </View>
        )}

        {/* Driver Row */}
        <View style={styles.driverRow}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={36} color="#64748B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.driverName}>{booking?.driver?.full_name || 'Your Driver'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.driverMeta}>{booking?.driver?.rating || '—'} rating</Text>
            </View>
          </View>
          <View style={styles.vehicleBox}>
            <Text style={styles.vehicleText}>{booking?.driver?.vehicle || '—'}</Text>
            <Text style={styles.regText}>{booking?.driver?.registration || '—'}</Text>
          </View>
        </View>

        {/* ETA Card */}
        <View style={styles.etaCard}>
          <Text style={styles.etaTitle}>{etaLabel}</Text>
          <Text style={styles.etaSub}>Estimated arrival: {arrivalTime}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <MaterialCommunityIcons name="share-variant" size={22} color="#64748B" />
            <Text style={styles.actionText}>Share Trip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('Chat', 'In-app chat coming soon!')}>
            <Ionicons name="chatbubble-outline" size={22} color="#64748B" />
            <Text style={styles.actionText}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
            <Ionicons name="call-outline" size={22} color="#64748B" />
            <Text style={styles.actionText}>Call</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9FF' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    zIndex: 20,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', lineHeight: 24 },
  connDot: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  connIndicator: { width: 8, height: 8, borderRadius: 4 },
  connText: { fontSize: 12, color: '#64748B', fontWeight: '500' },

  sosBtn: {
    width: 60, height: 60, backgroundColor: '#EF4444', borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#fff',
    shadowColor: '#EF4444', shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
    position: 'relative',
  },
  sosRing: {
    position: 'absolute', top: -8, left: -8, right: -8, bottom: -8,
    borderRadius: 38, borderWidth: 2, borderColor: 'rgba(239,68,68,0.35)',
  },
  sosLabel: { color: '#EF4444', fontWeight: '700', fontSize: 11, marginLeft: -12, marginTop: 64, position: 'absolute', right: 14 },

  // Car marker
  carMarker: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#3B82F6',
    shadowColor: '#3B82F6', shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },

  // Bottom sheet
  sheet: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    marginHorizontal: 12, marginBottom: 20,
    borderRadius: 28, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 20, elevation: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
    zIndex: 20,
  },

  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#D1FAE5', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6, marginBottom: 16,
    alignSelf: 'flex-start',
  },
  statusText: { color: '#065F46', fontWeight: '700', fontSize: 13 },

  driverRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatarCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#F1F5F9', marginRight: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#E2E8F0',
  },
  driverName: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  driverMeta: { fontSize: 13, color: '#64748B' },
  vehicleBox: { alignItems: 'flex-end', borderLeftWidth: 1, borderLeftColor: '#E2E8F0', paddingLeft: 14 },
  vehicleText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  regText: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

  etaCard: {
    backgroundColor: '#EFF6FF', borderRadius: 18,
    paddingVertical: 20, alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  etaTitle: { fontSize: 28, fontWeight: '900', color: '#1E3A8A', marginBottom: 4 },
  etaSub: { fontSize: 14, color: '#64748B' },

  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  actionBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    backgroundColor: '#F8FAFC', borderRadius: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
    gap: 6,
  },
  actionText: { fontSize: 11, fontWeight: '600', color: '#475569' },
})
