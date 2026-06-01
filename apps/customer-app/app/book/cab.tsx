/**
 * Book Cab Screen — Pixel-perfect from stitch:
 * ride_selection_route_preview + cab_booking_address_entry
 */
import { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, ScrollView, Animated, Dimensions, ActivityIndicator, Alert, Switch, StatusBar,
} from 'react-native'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import MapView, { Polyline } from 'react-native-maps'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { geocodeCity, getRoutePolyline } from '../../src/utils/maps'

const API = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:80/api/v1'


const VEHICLE_TYPES = [
  { key: 'sedan', label: 'Sedan', icon: 'car-side', duration: '1h 15m', seats: 5, price: 0 },
  { key: 'suv',   label: 'SUV', icon: 'car-sports', duration: '1h 10m', seats: 7, price: 0 },
  { key: 'minibus', label: 'Mini Bus', icon: 'bus-side', duration: '1h 45m', seats: 16, price: 0 },
  { key: 'bus',    label: 'Bus', icon: 'bus-alert', duration: '1h 50m', seats: 19, price: 0 },
  { key: 'coach',  label: 'Coach', icon: 'bus-school', duration: '2h 00m', seats: 25, price: 0 },
  { key: 'volvo',  label: 'Volvo', icon: 'bus-double-decker', duration: '2h 15m', seats: 50, price: 0 },
  { key: 'parcel', label: 'Parcel', icon: 'truck-delivery', duration: '1h 05m', seats: 2, price: 0 },
]

const RECENT_DESTINATIONS = ['SFO Airport', 'Tech Park', 'City Center']
const SAVED_PLACES = [
  { label: 'Home', icon: 'home' },
  { label: 'Work', icon: 'briefcase' },
]

interface Trip {
  id: string; pickup_city: string; destination_city: string
  departure_time: string; available_seats: number; total_seats: number
  base_fare: number; distance_km: number; parcel_enabled: boolean; women_only: boolean
}
interface FareEstimate {
  vehicle_type: string; per_seat_fare: number; total_fare: number
  distance_km: number; eta_minutes: number
}

const DEMO_FARES: FareEstimate[] = [
  { vehicle_type: 'sedan', per_seat_fare: 480, total_fare: 480, distance_km: 149, eta_minutes: 75 },
  { vehicle_type: 'suv',   per_seat_fare: 700, total_fare: 700, distance_km: 149, eta_minutes: 70 },
  { vehicle_type: 'minibus', per_seat_fare: 850, total_fare: 850, distance_km: 149, eta_minutes: 105 },
  { vehicle_type: 'bus',    per_seat_fare: 950, total_fare: 950, distance_km: 149, eta_minutes: 110 },
  { vehicle_type: 'coach',  per_seat_fare: 1100, total_fare: 1100, distance_km: 149, eta_minutes: 120 },
  { vehicle_type: 'volvo',  per_seat_fare: 1500, total_fare: 1500, distance_km: 149, eta_minutes: 135 },
  { vehicle_type: 'parcel', per_seat_fare: 220, total_fare: 220, distance_km: 149, eta_minutes: 65 },
]

export default function BookCabScreen() {
  const [step, setStep] = useState<'form' | 'results'>('form')
  const [fromCity, setFromCity] = useState('')
  const [toCity, setToCity] = useState('')
  const [date, setDate] = useState('')
  const [seats, setSeats] = useState(1)
  const [withParcel, setWithParcel] = useState(false)
  const [womenOnly, setWomenOnly] = useState(false)
  const [loading, setLoading] = useState(false)
  const [trips, setTrips] = useState<Trip[]>([])
  const [fares, setFares] = useState<FareEstimate[]>(DEMO_FARES)
  const [resultMode, setResultMode] = useState<'trips' | 'fares'>('fares')
  const [selectedVehicle, setSelectedVehicle] = useState('sedan')
  const [booking, setBooking] = useState(false)
  const [chooseSeat, setChooseSeat] = useState(false)
  const [routeCoords, setRouteCoords] = useState<{latitude: number, longitude: number}[]>([])

  const getAuthHeader = async () => {
    const token = await AsyncStorage.getItem('access_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const handleSearch = async () => {
    if (!fromCity.trim() || !toCity.trim()) {
      Alert.alert('Fill in all fields', 'Please enter From and To city.')
      return
    }
    setLoading(true)
    try {
      const headers = await getAuthHeader()
      try {
        const res = await axios.post(`${API}/trips/search`, {
          from_city: fromCity.trim(), to_city: toCity.trim(),
          departure_date: date.trim() || new Date().toISOString().split('T')[0],
          seats_needed: seats, with_parcel: withParcel, women_only: womenOnly,
        }, { headers })
        setTrips(res.data.data || [])
        setResultMode('trips')
      } catch {
        const res = await axios.post(`${API}/bookings/fare`, {
          from_city: fromCity.trim(), to_city: toCity.trim(),
          departure_time: new Date((date || new Date().toISOString().split('T')[0]) + 'T08:00').toISOString(),
          seats, with_parcel: withParcel,
        }, { headers })
        setFares(DEMO_FARES)
        setResultMode('fares')
      }
      
      try {
        const startLoc = await geocodeCity(fromCity.trim())
        const endLoc = await geocodeCity(toCity.trim())
        if (startLoc && endLoc) {
          const apiKey = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjRlYjFhNDY4Y2ExZDQ0NmU4OWQ0Yjk3ZWI5ZGEzN2FjIiwiaCI6Im11cm11cjY0In0='
          const polyline = await getRoutePolyline(startLoc, endLoc, apiKey)
          if (polyline) setRouteCoords(polyline)
        }
      } catch (e) {
        console.log('Routing failed', e)
      }
      
    } catch {
      setFares(DEMO_FARES); setResultMode('fares')
    } finally {
      setLoading(false); setStep('results')
    }
  }

  const handleBookTrip = async (trip: Trip) => {
    setBooking(true)
    try {
      const headers = await getAuthHeader()
      await axios.post(`${API}/bookings/`, {
        trip_id: trip.id, seat_count: seats, has_parcel: withParcel,
      }, { headers })
      Alert.alert('🎉 Booking Confirmed!', `${seats} seat(s) booked on ${trip.pickup_city} → ${trip.destination_city}!`, [
        { text: 'View My Trips', onPress: () => router.push('/(tabs)/trips' as any) }
      ])
    } catch (e: any) {
      Alert.alert('Booking Failed', e?.response?.data?.detail || 'Please try again')
    } finally { setBooking(false) }
  }

  // ── STEP 1: Address Entry (dark map) ─────────────────
  if (step === 'form') {
    return (
      <View style={styles.container}>
        <View style={styles.mapBg}>
          <MapView
            style={StyleSheet.absoluteFill}
            initialRegion={{ latitude: 19.0760, longitude: 72.8777, latitudeDelta: 0.1, longitudeDelta: 0.1 }}
          >
          </MapView>
        </View>

        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.formHeader}>
            <TouchableOpacity onPress={() => router.back()} style={styles.formBack}>
              <Feather name="arrow-left" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.formHeaderTitle}>Where to?</Text>
            <View style={styles.formAvatarCircle}>
              <Ionicons name="person-outline" size={18} color="#9CA3AF" />
            </View>
          </View>

          {/* Location Card */}
          <View style={styles.locationCard}>
            {/* Pickup */}
            <View style={styles.locationRow}>
              <View style={styles.locationDotBlue} />
              <TextInput
                style={styles.locationInput}
                placeholder="From City (e.g. Pune)"
                placeholderTextColor="#6B7280"
                value={fromCity}
                onChangeText={setFromCity}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.locationDivider} />
            {/* Destination */}
            <View style={styles.locationRow}>
              <View style={styles.locationDotSquare} />
              <TextInput
                style={styles.locationInput}
                placeholder="To City (e.g. Mumbai)"
                placeholderTextColor="#6B7280"
                value={toCity}
                onChangeText={setToCity}
                autoCapitalize="words"
              />
            </View>

            {/* Date + Seats */}
            <View style={{ marginTop: 16, gap: 10 }}>
              <TextInput
                style={styles.locationInput}
                placeholder="Travel Date (YYYY-MM-DD)"
                placeholderTextColor="#6B7280"
                value={date}
                onChangeText={setDate}
              />
            </View>

            {/* Recent */}
            <Text style={styles.locationSectionLabel}>Recent Destinations</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {RECENT_DESTINATIONS.map(d => (
                <TouchableOpacity key={d} style={styles.recentChip} onPress={() => setToCity(d)}>
                  <Feather name="clock" size={12} color="#9CA3AF" style={{ marginRight: 4 }} />
                  <Text style={styles.recentChipText}>{d}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.locationSectionLabel}>Saved Places</Text>
            <View style={styles.savedRow}>
              {SAVED_PLACES.map(p => (
                <TouchableOpacity key={p.label} style={styles.savedChip}>
                  <Feather name={p.icon as any} size={14} color="#9CA3AF" style={{ marginRight: 6 }} />
                  <Text style={styles.savedChipText}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Toggles */}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>📦 Add Parcel</Text>
              <Switch value={withParcel} onValueChange={setWithParcel} trackColor={{ false: '#374151', true: '#6366F1' }} thumbColor="#fff" />
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>👩 Women Only</Text>
              <Switch value={womenOnly} onValueChange={setWomenOnly} trackColor={{ false: '#374151', true: '#EC4899' }} thumbColor="#fff" />
            </View>
          </View>

          {/* Done Button */}
          <View style={styles.doneWrap}>
            <TouchableOpacity
              style={[styles.doneBtn, loading && { opacity: 0.6 }]}
              onPress={handleSearch}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.doneBtnText}>Done</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  // ── STEP 2: Ride Selection (dark bottom sheet) ────────
  return (
    <View style={styles.resultsRoot}>
      <StatusBar hidden />

      {/* Real Map Background for Route */}
      <View style={StyleSheet.absoluteFill}>
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={routeCoords.length > 0 ? {
            latitude: routeCoords[Math.floor(routeCoords.length / 2)].latitude,
            longitude: routeCoords[Math.floor(routeCoords.length / 2)].longitude,
            latitudeDelta: 2.5,
            longitudeDelta: 2.5,
          } : { latitude: 19.0760, longitude: 72.8777, latitudeDelta: 0.1, longitudeDelta: 0.1 }}
        >
          {routeCoords.length > 0 && (
            <Polyline coordinates={routeCoords} strokeColor="#3B82F6" strokeWidth={4} />
          )}
        </MapView>
      </View>

      {/* Map Controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity style={styles.mapCtrlBtn}><Feather name="plus" size={20} color="#94A3B8" /></TouchableOpacity>
        <View style={styles.mapCtrlDivider} />
        <TouchableOpacity style={styles.mapCtrlBtn}><Feather name="minus" size={20} color="#94A3B8" /></TouchableOpacity>
      </View>

      {/* Header on map */}
      <SafeAreaView style={styles.mapHeaderWrap}>
        <View style={styles.mapHeader}>
          <TouchableOpacity onPress={() => setStep('form')} style={styles.mapBack}>
            <Feather name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <Text style={styles.mapTitle}>Ride Selection &{'\n'}Route Preview</Text>
        </View>
      </SafeAreaView>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        <View style={styles.bsHandle} />

        <View style={styles.bsHeaderRow}>
          <Text style={styles.bsTitle}>Select Your Ride</Text>
          <TouchableOpacity style={styles.bsCloseBtn} onPress={() => setStep('form')}>
            <Feather name="x" size={18} color="#D1D5DB" />
          </TouchableOpacity>
        </View>

        {/* Vehicle Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehicleScroll} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          {VEHICLE_TYPES.map((v, i) => {
            const fareData = fares.find(f => f.vehicle_type === v.key) || fares[i] || fares[0]
            const isSelected = selectedVehicle === v.key
            return (
              <TouchableOpacity
                key={v.key}
                style={[styles.vehicleCard, isSelected && styles.vehicleCardActive]}
                onPress={() => setSelectedVehicle(v.key)}
                activeOpacity={0.85}
              >
                {isSelected && (
                  <LinearGradient colors={['rgba(139,92,246,0.15)', 'transparent']} style={StyleSheet.absoluteFill} />
                )}
                <Text style={styles.vehicleLabel}>{v.label}</Text>
                <View style={styles.vehicleIconBox}>
                  <MaterialCommunityIcons name={v.icon as any} size={52} color={isSelected ? '#E5E7EB' : '#94A3B8'} />
                </View>
                <View style={styles.vehicleMeta}>
                  <Feather name="clock" size={11} color="#9CA3AF" />
                  <Text style={styles.vehicleMetaText}> {fareData ? Math.floor(fareData.eta_minutes / 60) + 'h ' + (fareData.eta_minutes % 60) + 'm' : v.duration}</Text>
                </View>
                <View style={styles.vehicleMeta}>
                  <Feather name="user" size={11} color="#9CA3AF" />
                  <Text style={styles.vehicleMetaText}> {v.seats} Seats</Text>
                </View>
                <Text style={styles.vehiclePrice}>₹{fareData?.per_seat_fare || '--'}</Text>
                <Text style={styles.vehiclePriceSub}>(Includes Tolls)</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Options row */}
        <View style={styles.optionsRow}>
          <View style={styles.familyToggle}>
            <Switch value={chooseSeat} onValueChange={setChooseSeat} trackColor={{ true: '#6366F1', false: '#4B5563' }} thumbColor="#ffffff" />
            <Text style={styles.familyLabel}>Choose Specific Seat</Text>
          </View>
        </View>

        <View style={styles.optionsRow}>
          <View style={styles.familyToggle}>
            <Switch value={womenOnly} onValueChange={setWomenOnly} trackColor={{ true: '#6366F1', false: '#4B5563' }} thumbColor="#ffffff" />
            <Text style={styles.familyLabel}>Women Only</Text>
          </View>
          <TouchableOpacity style={styles.couponBtn}>
            <Text style={styles.couponText}>Apply Coupon</Text>
            <MaterialCommunityIcons name="tag-outline" size={16} color="white" />
          </TouchableOpacity>
        </View>

        {/* Book Now / Next */}
        <View style={styles.bookBtnWrap}>
          <TouchableOpacity
            style={styles.bookNowBtn}
            onPress={async () => {
              if (chooseSeat) {
                router.push('/book/seats')
              } else {
                // Determine if this is a shared trip or private matching
                if (resultMode === 'trips' && trips.length > 0) {
                  // Book a shared trip
                  handleBookTrip(trips[0]);
                } else {
                  // Private cab - go to matching waiting screen
                  // Generate a temporary booking ID until backend is fully wired
                  const tempBookingId = 'req_' + Math.random().toString(36).substring(2, 9);
                  router.push(`/matching-waiting?bookingId=${tempBookingId}` as any)
                }
              }
            }}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#06B6D4', '#3B82F6', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.bookNowGradient}>
              <Text style={styles.bookNowText}>{chooseSeat ? 'Next: Select Seats' : (resultMode === 'trips' ? 'Book Shared Seat' : 'Find a Driver')}</Text>
              <Feather name={chooseSeat ? "arrow-right" : "search"} size={20} color="white" style={{ marginLeft: 8 }} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  // ── Form ─────────────────────────────────────────────
  formRoot: { flex: 1, backgroundColor: '#0A0A1A' },
  glowLine: {
    position: 'absolute', height: 3, borderRadius: 2,
    backgroundColor: '#00D4FF', opacity: 0.3,
    shadowColor: '#00D4FF', shadowOpacity: 0.8, shadowRadius: 10,
  },
  formHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  formBack: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  formHeaderTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  formAvatarCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  locationCard: {
    marginHorizontal: 16, backgroundColor: 'rgba(30,30,50,0.85)',
    borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, elevation: 5,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  locationDotBlue: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#3B82F6', marginRight: 14 },
  locationDotSquare: { width: 12, height: 12, borderRadius: 3, backgroundColor: '#3B82F6', marginRight: 14 },
  locationDivider: { width: 2, height: 20, backgroundColor: '#374151', marginLeft: 5, marginVertical: 2 },
  locationInput: { flex: 1, color: '#FFFFFF', fontSize: 15, paddingVertical: 8 },
  locationSectionLabel: { color: '#9CA3AF', fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  recentChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(55,65,81,0.8)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 8,
    borderWidth: 1, borderColor: '#374151',
  },
  recentChipText: { color: '#E5E7EB', fontSize: 13 },
  savedRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  savedChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(55,65,81,0.8)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: '#374151',
  },
  savedChipText: { color: '#E5E7EB', fontSize: 13 },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 12, paddingVertical: 4,
  },
  toggleLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  doneWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 36 },
  doneBtn: {
    backgroundColor: '#00D4FF', borderRadius: 50,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: '#00D4FF', shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  doneBtnText: { color: '#000', fontSize: 18, fontWeight: '700' },

  // ── Results ───────────────────────────────────────────
  resultsRoot: { flex: 1, backgroundColor: '#111827' },
  fakeRoad1: {
    position: 'absolute', top: '30%', left: '10%', width: '120%', height: 1,
    backgroundColor: '#334155', opacity: 0.5, transform: [{ rotate: '45deg' }],
  },
  fakeRoad2: {
    position: 'absolute', top: '60%', left: '-20%', width: '120%', height: 1,
    backgroundColor: '#334155', opacity: 0.5, transform: [{ rotate: '-12deg' }],
  },
  fakeRoute: {
    position: 'absolute', top: '20%', left: '25%', width: '50%', height: '50%',
    borderRadius: 12, opacity: 0.9, borderLeftWidth: 6, borderBottomWidth: 6,
    borderColor: 'transparent', borderBottomLeftRadius: 40, borderTopRightRadius: 20,
  },
  fakeRouteInner: {
    position: 'absolute', top: '20%', left: '25%', width: '50%', height: '50%',
    borderRadius: 12, borderLeftWidth: 3, borderBottomWidth: 3, borderColor: '#E0E7FF',
    borderBottomLeftRadius: 40, borderTopRightRadius: 20,
  },
  mapControls: {
    position: 'absolute', top: '45%', left: 16,
    backgroundColor: 'rgba(30,41,59,0.85)', borderRadius: 14,
    overflow: 'hidden', borderWidth: 1, borderColor: '#4B5563',
  },
  mapCtrlBtn: { padding: 12, alignItems: 'center', justifyContent: 'center' },
  mapCtrlDivider: { height: 1, backgroundColor: '#4B5563' },
  mapHeaderWrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  mapHeader: { paddingHorizontal: 24, paddingTop: 48, flexDirection: 'row', alignItems: 'flex-end', gap: 16 },
  mapBack: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  mapTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '700', lineHeight: 36, textShadowColor: '#000', textShadowRadius: 8 },

  // Bottom sheet
  bottomSheet: {
    position: 'absolute', bottom: 0, width: '100%', height: '58%',
    backgroundColor: 'rgba(31,41,55,0.95)', borderTopLeftRadius: 30, borderTopRightRadius: 30,
    borderTopWidth: 1, borderTopColor: '#4B5563',
    shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 20, elevation: 20,
  },
  bsHandle: { width: 48, height: 6, backgroundColor: '#4B5563', borderRadius: 3, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  bsHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 16 },
  bsTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', letterSpacing: 0.3 },
  bsCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center' },

  vehicleScroll: { height: 210 },
  vehicleCard: {
    width: 140, height: 200, backgroundColor: 'rgba(55,65,81,0.6)',
    borderRadius: 20, marginRight: 14, borderWidth: 1, borderColor: '#4B5563', padding: 12,
    overflow: 'hidden',
  },
  vehicleCardActive: { borderColor: '#8B5CF6' },
  vehicleLabel: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', marginBottom: 8 },
  vehicleIconBox: { height: 64, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  vehicleMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  vehicleMetaText: { color: '#D1D5DB', fontSize: 11 },
  vehiclePrice: { color: '#FFFFFF', fontWeight: '700', fontSize: 18, marginTop: 6, lineHeight: 22 },
  vehiclePriceSub: { color: '#9CA3AF', fontSize: 10 },

  optionsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, marginTop: 4, marginBottom: 8,
  },
  familyToggle: { flexDirection: 'row', alignItems: 'center' },
  familyLabel: { color: '#FFFFFF', fontSize: 15, marginLeft: 10 },
  couponBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#374151', paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1, borderColor: '#4B5563', gap: 8,
  },
  couponText: { color: '#FFFFFF', fontSize: 14 },

  bookBtnWrap: { paddingHorizontal: 24, paddingBottom: 24 },
  bookNowBtn: { borderRadius: 20, overflow: 'hidden', shadowColor: '#3B82F6', shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  bookNowGradient: { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  bookNowText: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
})
