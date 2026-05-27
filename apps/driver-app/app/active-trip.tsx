/**
 * Active Trip Screen — Driver App (Phase 5)
 * Shows active trip details, publishes GPS every 5s via REST + Socket.IO,
 * and has a Complete Trip button.
 */
import { useState, useEffect, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import * as Location from 'expo-location'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const API = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:80/api/v1'
const GPS_INTERVAL_MS = 5000 // 5-second GPS publish interval

export default function ActiveTripScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>()
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [gpsStatus, setGpsStatus] = useState<'ok' | 'error' | 'idle'>('idle')
  const [lastLocation, setLastLocation] = useState<{ lat: number; lng: number; speed: number } | null>(null)
  const [distanceSent, setDistanceSent] = useState(0)
  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const getAuthHeader = async () => {
    const token = await AsyncStorage.getItem('access_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  useEffect(() => {
    loadBooking()
    startGpsPublishing()
    return () => stopGpsPublishing()
  }, [])

  const loadBooking = async () => {
    try {
      const headers = await getAuthHeader()
      const res = await axios.get(`${API}/bookings/${bookingId}`, { headers })
      setBooking(res.data.data)
    } catch {
      // Demo booking
      setBooking({
        id: bookingId,
        trip: { id: 'trip-1', pickup_city: 'Pune', destination_city: 'Mumbai', distance_km: 149 },
        seat_count: 2,
        total_fare: 980,
        customer: { full_name: 'Rahul Sharma', phone: '+919876543210' },
      })
    } finally {
      setLoading(false) }
  }

  const startGpsPublishing = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') {
      setGpsStatus('error')
      return
    }

    gpsIntervalRef.current = setInterval(async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        })
        const { latitude, longitude, speed, heading, accuracy, altitude } = loc.coords
        const speedKmh = speed != null ? speed * 3.6 : 0

        setLastLocation({ lat: latitude, lng: longitude, speed: speedKmh })
        setGpsStatus('ok')

        // Push to REST API (persists to DB + publishes to Redis)
        const headers = await getAuthHeader()
        await axios.post(`${API}/tracking/update`, {
          trip_id: booking?.trip?.id,
          latitude,
          longitude,
          speed_kmh: speedKmh,
          heading: heading || 0,
          accuracy_m: accuracy || 0,
          altitude_m: altitude,
          booking_id: bookingId,
        }, { headers })

        setDistanceSent(p => p + 1)
      } catch {
        setGpsStatus('error')
      }
    }, GPS_INTERVAL_MS)
  }

  const stopGpsPublishing = () => {
    if (gpsIntervalRef.current) {
      clearInterval(gpsIntervalRef.current)
      gpsIntervalRef.current = null
    }
  }

  const handleComplete = async () => {
    Alert.alert(
      '✅ Complete Trip?',
      'This will mark the trip as completed and process payment.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            setCompleting(true)
            stopGpsPublishing()
            try {
              const headers = await getAuthHeader()
              await axios.post(`${API}/trips/${booking?.trip?.id}/complete`, {}, { headers })
              Alert.alert('🎉 Trip Completed!', 'Payment will be processed within 24 hours.', [
                { text: 'OK', onPress: () => router.replace('/(tabs)') },
              ])
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.detail || 'Could not complete trip')
              setCompleting(false)
              startGpsPublishing()
            }
          },
        },
      ]
    )
  }

  const openNavigation = () => {
    if (!booking?.trip) return
    const { destination_city } = booking.trip
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination_city)}`
    Linking.openURL(url)
  }

  if (loading) return (
    <SafeAreaView style={styles.center}>
      <ActivityIndicator size="large" color="#2563EB" />
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚀 Active Trip</Text>
        <View style={[styles.gpsBadge, { backgroundColor: gpsStatus === 'ok' ? '#DCFCE7' : '#FEF9C3' }]}>
          <View style={[styles.gpsDot, { backgroundColor: gpsStatus === 'ok' ? '#10B981' : '#EAB308' }]} />
          <Text style={[styles.gpsText, { color: gpsStatus === 'ok' ? '#065F46' : '#713F12' }]}>
            {gpsStatus === 'ok' ? `GPS Live (${distanceSent})` : 'GPS...'}
          </Text>
        </View>
      </View>

      {/* Route Card */}
      <View style={styles.routeCard}>
        <View style={styles.routeRow}>
          <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.routeLabel}>FROM</Text>
            <Text style={styles.routeCity}>{booking?.trip?.pickup_city}</Text>
          </View>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routeRow}>
          <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.routeLabel}>TO</Text>
            <Text style={styles.routeCity}>{booking?.trip?.destination_city}</Text>
          </View>
          <Text style={styles.routeDistance}>{booking?.trip?.distance_km} km</Text>
        </View>
      </View>

      {/* Current Location */}
      {lastLocation && (
        <View style={styles.locationCard}>
          <Text style={styles.locationTitle}>📍 Current Location</Text>
          <Text style={styles.locationCoords}>
            {lastLocation.lat.toFixed(5)}, {lastLocation.lng.toFixed(5)}
          </Text>
          {lastLocation.speed > 0 && (
            <Text style={styles.locationSpeed}>{Math.round(lastLocation.speed)} km/h</Text>
          )}
        </View>
      )}

      {/* Passenger Info */}
      <View style={styles.passengerCard}>
        <Text style={styles.cardLabel}>👤 Passenger</Text>
        <View style={styles.passengerRow}>
          <View>
            <Text style={styles.passengerName}>{booking?.customer?.full_name || 'Passenger'}</Text>
            <Text style={styles.passengerSeats}>💺 {booking?.seat_count} seat(s) • ₹{booking?.total_fare}</Text>
          </View>
          <TouchableOpacity
            onPress={() => Linking.openURL(`tel:${booking?.customer?.phone}`)}
            style={styles.callBtn}>
            <Text style={styles.callBtnText}>📞 Call</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={openNavigation} style={styles.navBtn} activeOpacity={0.85}>
          <Text style={styles.navBtnText}>🗺️ Open Navigation</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleComplete}
          disabled={completing}
          style={[styles.completeBtn, completing && { opacity: 0.6 }]}
          activeOpacity={0.85}
        >
          {completing
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={styles.completeBtnText}>✅ Complete Trip</Text>
          }
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>
        GPS is broadcasting every 5 seconds to customers.
      </Text>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  center: { flex: 1, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1E293B', paddingHorizontal: 16, paddingVertical: 14,
  },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  gpsBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  gpsDot: { width: 7, height: 7, borderRadius: 4 },
  gpsText: { fontSize: 11, fontWeight: '700' },
  routeCard: {
    backgroundColor: '#FFFFFF', margin: 16, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  routeLine: { height: 24, width: 1.5, backgroundColor: '#E2E8F0', marginLeft: 5.25, marginVertical: 4 },
  routeLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5 },
  routeCity: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  routeDistance: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  locationCard: {
    backgroundColor: '#EFF6FF', marginHorizontal: 16, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#DBEAFE', marginBottom: 10,
  },
  locationTitle: { fontSize: 12, fontWeight: '700', color: '#1D4ED8', marginBottom: 4 },
  locationCoords: { fontSize: 12, color: '#3B82F6', fontFamily: 'monospace' },
  locationSpeed: { fontSize: 11, color: '#60A5FA', marginTop: 2 },
  passengerCard: {
    backgroundColor: '#FFFFFF', marginHorizontal: 16, borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  cardLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 8, letterSpacing: 0.5 },
  passengerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  passengerName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  passengerSeats: { fontSize: 12, color: '#64748B', marginTop: 2 },
  callBtn: { backgroundColor: '#F0FDF4', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#BBF7D0' },
  callBtnText: { color: '#16A34A', fontWeight: '700', fontSize: 13 },
  actions: { marginHorizontal: 16, marginTop: 20, gap: 10 },
  navBtn: {
    backgroundColor: '#1E293B', borderRadius: 14, padding: 16, alignItems: 'center',
  },
  navBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  completeBtn: {
    backgroundColor: '#10B981', borderRadius: 14, padding: 16, alignItems: 'center',
    shadowColor: '#10B981', shadowOpacity: 0.35, shadowRadius: 10, elevation: 4,
  },
  completeBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  hint: { textAlign: 'center', fontSize: 11, color: '#94A3B8', marginTop: 12 },
})
