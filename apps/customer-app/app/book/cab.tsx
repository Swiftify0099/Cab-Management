/**
 * Book Cab Screen — Customer Mobile App
 * Phase 3: Search trips → select → confirm booking
 */
import { useState } from 'react'
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Switch,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const API = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:80/api/v1'

const VEHICLE_ICONS: Record<string, string> = {
  sedan: '🚗', suv: '🚙', mini: '🚕', tempo_traveller: '🚐', bus: '🚌',
}

interface Trip {
  id: string
  pickup_city: string
  destination_city: string
  departure_time: string
  available_seats: number
  total_seats: number
  base_fare: number
  distance_km: number
  parcel_enabled: boolean
  women_only: boolean
}

interface FareEstimate {
  vehicle_type: string
  per_seat_fare: number
  total_fare: number
  distance_km: number
  eta_minutes: number
}

export default function BookCabScreen() {
  const [step, setStep] = useState<'form' | 'results' | 'confirm'>('form')
  const [fromCity, setFromCity] = useState('')
  const [toCity, setToCity] = useState('')
  const [date, setDate] = useState('')
  const [seats, setSeats] = useState(1)
  const [withParcel, setWithParcel] = useState(false)
  const [womenOnly, setWomenOnly] = useState(false)
  const [loading, setLoading] = useState(false)
  const [trips, setTrips] = useState<Trip[]>([])
  const [fares, setFares] = useState<FareEstimate[]>([])
  const [resultMode, setResultMode] = useState<'trips' | 'fares'>('trips')
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [booking, setBooking] = useState(false)

  const getAuthHeader = async () => {
    const token = await AsyncStorage.getItem('access_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const handleSearch = async () => {
    if (!fromCity.trim() || !toCity.trim() || !date.trim()) {
      Alert.alert('Fill in all fields', 'Please enter From city, To city, and date.')
      return
    }
    setLoading(true)
    try {
      const headers = await getAuthHeader()
      try {
        const res = await axios.post(`${API}/trips/search`, {
          from_city: fromCity.trim(),
          to_city: toCity.trim(),
          departure_date: date.trim(),
          seats_needed: seats,
          with_parcel: withParcel,
          women_only: womenOnly,
        }, { headers })
        setTrips(res.data.data || [])
        setResultMode('trips')
      } catch {
        await loadFares(headers)
      }
      setStep('results')
    } finally {
      setLoading(false)
    }
  }

  const loadFares = async (headers: any) => {
    const res = await axios.post(`${API}/bookings/fare`, {
      from_city: fromCity.trim(),
      to_city: toCity.trim(),
      departure_time: new Date(date + ' 08:00').toISOString(),
      seats,
      with_parcel: withParcel,
    }, { headers })
    setFares(res.data.data || DEMO_FARES)
    setResultMode('fares')
  }

  const handleBookTrip = async (trip: Trip) => {
    setSelectedTrip(trip)
    setBooking(true)
    try {
      const headers = await getAuthHeader()
      await axios.post(`${API}/bookings/`, {
        trip_id: trip.id,
        seat_count: seats,
        has_parcel: withParcel,
      }, { headers })
      Alert.alert(
        '🎉 Booking Confirmed!',
        `${seats} seat(s) booked on ${trip.pickup_city} → ${trip.destination_city} trip!`,
        [{ text: 'View My Trips', onPress: () => router.push('/(tabs)/trips' as any) }]
      )
    } catch (e: any) {
      Alert.alert('Booking Failed', e?.response?.data?.detail || 'Please try again')
    } finally {
      setBooking(false); setSelectedTrip(null)
    }
  }

  const etaLabel = (mins: number) => `${Math.floor(mins / 60)}h ${mins % 60}m`

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step === 'form' ? router.back() : setStep('form')} style={styles.backBtn}>
          <Text style={styles.backText}>{step === 'form' ? '✕' : '← Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book a Cab</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* ── Step 1: Search Form ─────────────────── */}
        {step === 'form' && (
          <View style={styles.form}>
            <Text style={styles.fieldLabel}>From City</Text>
            <TextInput style={styles.input} placeholder="e.g. Pune" placeholderTextColor="#94A3B8"
              value={fromCity} onChangeText={setFromCity} autoCapitalize="words" />

            <Text style={styles.fieldLabel}>To City</Text>
            <TextInput style={styles.input} placeholder="e.g. Mumbai" placeholderTextColor="#94A3B8"
              value={toCity} onChangeText={setToCity} autoCapitalize="words" />

            <Text style={styles.fieldLabel}>Travel Date</Text>
            <TextInput style={styles.input} placeholder="YYYY-MM-DD (e.g. 2025-06-01)"
              placeholderTextColor="#94A3B8" value={date} onChangeText={setDate} />

            <Text style={styles.fieldLabel}>Seats</Text>
            <View style={styles.seatRow}>
              {[1,2,3,4,5,6].map(n => (
                <TouchableOpacity key={n}
                  onPress={() => setSeats(n)}
                  style={[styles.seatBtn, seats === n && styles.seatBtnActive]}>
                  <Text style={[styles.seatBtnText, seats === n && styles.seatBtnTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleLabel}>📦 Add Parcel</Text>
                <Text style={styles.toggleSub}>+₹50 parcel charge</Text>
              </View>
              <Switch value={withParcel} onValueChange={setWithParcel}
                trackColor={{ false: '#475569', true: '#8B5CF6' }} thumbColor="#FFFFFF" />
            </View>

            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleLabel}>👩 Women Only</Text>
                <Text style={styles.toggleSub}>Only match with female drivers/passengers</Text>
              </View>
              <Switch value={womenOnly} onValueChange={setWomenOnly}
                trackColor={{ false: '#475569', true: '#EC4899' }} thumbColor="#FFFFFF" />
            </View>

            <TouchableOpacity style={[styles.searchBtn, loading && { opacity: 0.6 }]}
              onPress={handleSearch} disabled={loading} activeOpacity={0.85}>
              {loading
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.searchBtnText}>🔍 Search Rides</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 2A: Available Trips ────────────── */}
        {step === 'results' && resultMode === 'trips' && (
          <View>
            <Text style={styles.resultsTitle}>
              {trips.length > 0 ? `${trips.length} Trips Available` : 'No trips found'}
            </Text>
            <Text style={styles.resultsSubtitle}>{fromCity} → {toCity}</Text>

            {trips.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyText}>No shared trips yet</Text>
                <TouchableOpacity onPress={async () => {
                  const headers = await getAuthHeader()
                  setLoading(true)
                  await loadFares(headers)
                  setLoading(false)
                  setResultMode('fares')
                }} style={styles.fareFallbackBtn}>
                  <Text style={styles.fareFallbackText}>View Fare Estimates →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              trips.map(trip => {
                const dep = new Date(trip.departure_time)
                return (
                  <TouchableOpacity key={trip.id} style={styles.tripCard}
                    onPress={() => handleBookTrip(trip)} disabled={booking}
                    activeOpacity={0.85}>
                    <View style={styles.tripTop}>
                      <Text style={styles.tripRoute}>{trip.pickup_city} → {trip.destination_city}</Text>
                      <Text style={styles.tripFare}>₹{trip.base_fare}/seat</Text>
                    </View>
                    <Text style={styles.tripMeta}>
                      📅 {dep.toLocaleDateString('en-IN')} {dep.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}{'  '}
                      💺 {trip.available_seats}/{trip.total_seats} seats{'  '}
                      📍 {trip.distance_km} km
                    </Text>
                    {(trip.parcel_enabled || trip.women_only) && (
                      <View style={styles.tripTags}>
                        {trip.parcel_enabled && <Tag label="📦 Parcel OK" color="#8B5CF6" />}
                        {trip.women_only && <Tag label="👩 Women Only" color="#EC4899" />}
                      </View>
                    )}
                    {selectedTrip?.id === trip.id && booking && (
                      <View style={styles.bookingProgress}>
                        <ActivityIndicator color="#2563EB" size="small" />
                        <Text style={styles.bookingProgressText}>Booking {seats} seat(s)...</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })
            )}
          </View>
        )}

        {/* ── Step 2B: Fare Estimates ─────────────── */}
        {step === 'results' && resultMode === 'fares' && (
          <View>
            <Text style={styles.resultsTitle}>Fare Estimates</Text>
            <Text style={styles.resultsSubtitle}>{fromCity} → {toCity}</Text>
            <View style={styles.fareNotice}>
              <Text style={styles.fareNoticeText}>
                ⚡ No shared trips found. These are private cab fare estimates.
              </Text>
            </View>
            {fares.map((fare, i) => (
              <View key={i} style={styles.fareCard}>
                <View style={styles.fareTop}>
                  <Text style={styles.fareIcon}>{VEHICLE_ICONS[fare.vehicle_type] || '🚗'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fareType}>
                      {fare.vehicle_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Text>
                    <Text style={styles.fareMeta}>
                      ⏱ {etaLabel(fare.eta_minutes)}  •  📍 {fare.distance_km} km
                    </Text>
                  </View>
                  <Text style={styles.farePrice}>₹{fare.per_seat_fare}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const DEMO_FARES: FareEstimate[] = [
  { vehicle_type: 'sedan', per_seat_fare: 480, total_fare: 480, distance_km: 149, eta_minutes: 180 },
  { vehicle_type: 'suv', per_seat_fare: 700, total_fare: 700, distance_km: 149, eta_minutes: 170 },
  { vehicle_type: 'mini', per_seat_fare: 380, total_fare: 380, distance_km: 149, eta_minutes: 195 },
  { vehicle_type: 'tempo_traveller', per_seat_fare: 220, total_fare: 220, distance_km: 149, eta_minutes: 200 },
]

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.tag, { backgroundColor: color + '20', borderColor: color }]}>
      <Text style={[styles.tagText, { color }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  backBtn: { width: 48, justifyContent: 'center' },
  backText: { color: '#64748B', fontSize: 14, fontWeight: '600' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800', color: '#0F172A' },
  form: { gap: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 12, padding: 12, fontSize: 14, color: '#0F172A',
  },
  seatRow: { flexDirection: 'row', gap: 8 },
  seatBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5,
    borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', alignItems: 'center',
  },
  seatBtnActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  seatBtnText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  seatBtnTextActive: { color: '#2563EB' },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginTop: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  toggleLabel: { fontSize: 13, fontWeight: '600', color: '#334155' },
  toggleSub: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  searchBtn: {
    backgroundColor: '#2563EB', borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 20,
    shadowColor: '#2563EB', shadowOpacity: 0.35, shadowRadius: 10, elevation: 4,
  },
  searchBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  resultsTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  resultsSubtitle: { fontSize: 13, color: '#64748B', marginBottom: 16 },
  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 28,
    alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0',
  },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 16 },
  fareFallbackBtn: {
    backgroundColor: '#EFF6FF', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10,
  },
  fareFallbackText: { color: '#2563EB', fontWeight: '700', fontSize: 13 },
  tripCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  tripTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  tripRoute: { fontSize: 14, fontWeight: '700', color: '#0F172A', flex: 1 },
  tripFare: { fontSize: 16, fontWeight: '800', color: '#2563EB' },
  tripMeta: { fontSize: 11, color: '#64748B', lineHeight: 18 },
  tripTags: { flexDirection: 'row', gap: 6, marginTop: 8 },
  tag: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 10, fontWeight: '700' },
  bookingProgress: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  bookingProgressText: { fontSize: 12, color: '#2563EB', fontWeight: '600' },
  fareNotice: {
    backgroundColor: '#FFFBEB', borderRadius: 10, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  fareNoticeText: { fontSize: 12, color: '#92400E' },
  fareCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  fareTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fareIcon: { fontSize: 28 },
  fareType: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  fareMeta: { fontSize: 11, color: '#64748B', marginTop: 2 },
  farePrice: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
})
