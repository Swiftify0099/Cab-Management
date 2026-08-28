/**
 * Customer App — Intercity Carpool & Highway Rideshare Screen
 * Route: /carpool
 * Features: Route corridor search, seat-by-seat selection, ladies-only filter,
 * carbon emissions badge, host chauffeur rating, instant wallet booking, and boarding OTP voucher.
 */
import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../../src/contexts/ThemeContext'
import { useTranslation } from '../../src/i18n'
import { AppText, AppButton, AppCard, AppBadge, AppDivider } from '../../src/components/ui'
import { api } from '../../src/api/client'

// Real trips loaded from the backend /matching/trips/search endpoint

export default function CarpoolScreen() {
  const { theme, isDark } = useTheme()
  const { t } = useTranslation()
  const params = useLocalSearchParams<{ origin?: string; destination?: string }>()

  const [originCity, setOriginCity] = useState(params?.origin || '')
  const [destinationCity, setDestinationCity] = useState(params?.destination || '')
  const [seatsNeeded, setSeatsNeeded] = useState<number>(1)
  const [ladiesOnly, setLadiesOnly] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [searching, setSearching] = useState<boolean>(false)
  const [trips, setTrips] = useState<any[]>([])
  const [searched, setSearched] = useState(false)
  const [selectedRide, setSelectedRide] = useState<any | null>(null)
  const [confirmedBooking, setConfirmedBooking] = useState<any | null>(null)

  const searchTrips = useCallback(async () => {
    setSearching(true)
    setSearched(true)
    try {
      const params: any = {
        seats: seatsNeeded,
        women_only: ladiesOnly,
        service_type: 'cab',
      }
      if (originCity.trim()) params.pickup_city = originCity.trim()
      if (destinationCity.trim()) params.destination_city = destinationCity.trim()
      const res = await api.get('/matching/trips/search', { params })
      setTrips(res.data?.data?.trips || [])
    } catch (err: any) {
      console.warn('[Carpool] Search error:', err?.response?.data || err?.message)
      setTrips([])
    } finally {
      setSearching(false)
    }
  }, [originCity, destinationCity, seatsNeeded, ladiesOnly])

  // Load real published trips on initial mount & whenever params change
  useEffect(() => {
    searchTrips()
  }, [])

  const filteredRides = trips  // Already filtered server-side

  const handleBookCarpool = async (ride: any) => {
    setLoading(true)
    try {
      const res = await api.post('/matching/trips/book-seat', {
        trip_id: ride.trip_id,
        seat_count: seatsNeeded,
        pickup_address: ride.pickup?.address || originCity,
        pickup_lat: ride.pickup?.lat,
        pickup_lng: ride.pickup?.lng,
        drop_address: ride.destination?.address || destinationCity,
        drop_lat: ride.destination?.lat,
        drop_lng: ride.destination?.lng,
        has_parcel: false,
        window_seat: false,
      })
      const data = res.data?.data || {}
      const booking = {
        reference: data.booking_id || `BK-${Date.now().toString().slice(-6)}`,
        trip_ref: ride.trip_id,
        host_name: ride.driver?.full_name || 'Driver',
        vehicle: ride.vehicle ? `${ride.vehicle.make} ${ride.vehicle.model}` : 'Vehicle',
        seats: seatsNeeded,
        total_fare: data.total_fare || ride.base_fare * seatsNeeded,
        departure: ride.departure_time
          ? new Date(ride.departure_time).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
          : 'TBD',
        pickup: ride.pickup?.address || originCity,
        drop: ride.destination?.address || destinationCity,
        otp: data.otp || '—',
        co2_saved: (0.18 * (ride.distance_km || 1) * seatsNeeded).toFixed(1),
      }
      setConfirmedBooking(booking)
      Alert.alert(
        'Seat Reserved! 🚗👥',
        `Your seat is confirmed.\nBoarding OTP: ${booking.otp}`,
        [{
          text: 'View Voucher',
          onPress: () => router.push({
            pathname: '/track',
            params: { bookingId: data.booking_id || booking.reference, tripId: ride.trip_id },
          } as any),
        }]
      )
    } catch (err: any) {
      Alert.alert(
        'Booking Failed',
        err?.response?.data?.detail || err?.response?.data?.message || 'Could not book seat. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <AppText style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            Intercity Carpool
          </AppText>
          <AppText style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            Share highway rides & save carbon emissions
          </AppText>
        </View>
        <AppBadge label="Eco Share" variant="success" size="sm" />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Corridor Card */}
        <AppCard style={[styles.searchCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.corridorRow}>
            <View style={styles.timelineDots}>
              <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
              <View style={[styles.line, { backgroundColor: theme.colors.border }]} />
              <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={styles.inputBox}>
                <AppText style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  FROM
                </AppText>
                <TextInput
                  style={[styles.textInput, { color: theme.colors.textPrimary }]}
                  value={originCity}
                  onChangeText={setOriginCity}
                  placeholder="Enter origin city"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>

              <AppDivider marginVertical={8} />

              <View style={styles.inputBox}>
                <AppText style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  TO
                </AppText>
                <TextInput
                  style={[styles.textInput, { color: theme.colors.textPrimary }]}
                  value={destinationCity}
                  onChangeText={setDestinationCity}
                  placeholder="Enter destination city"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>
            </View>
          </View>

          {/* Seats & Filters */}
          <View style={styles.filtersRow}>
            <View style={styles.seatSelector}>
              <AppText style={[styles.filterLabel, { color: theme.colors.textSecondary }]}>
                Seats:
              </AppText>
              {[1, 2, 3].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.seatBtn,
                    seatsNeeded === num && { backgroundColor: theme.colors.primary },
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() => setSeatsNeeded(num)}
                >
                  <AppText
                    style={[
                      styles.seatBtnText,
                      { color: seatsNeeded === num ? '#FFFFFF' : theme.colors.textPrimary },
                    ]}
                  >
                    {num}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.ladiesToggle,
                ladiesOnly && { backgroundColor: '#FCE7F3', borderColor: '#EC4899' },
                { borderColor: theme.colors.border },
              ]}
              onPress={() => setLadiesOnly(!ladiesOnly)}
            >
              <MaterialCommunityIcons
                name="human-female"
                size={18}
                color={ladiesOnly ? '#EC4899' : theme.colors.textSecondary}
              />
              <AppText
                style={[
                  styles.ladiesText,
                  { color: ladiesOnly ? '#BE185D' : theme.colors.textSecondary },
                ]}
              >
                Ladies Only
              </AppText>
            </TouchableOpacity>
          </View>
        </AppCard>

        {/* Confirmed Booking Voucher Card */}
        {confirmedBooking && (
          <LinearGradient
            colors={['#065F46', '#047857']}
            style={styles.voucherCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.voucherHeader}>
              <View>
                <AppText style={styles.voucherTitle}>Active Carpool Reservation</AppText>
                <AppText style={styles.voucherRef}>{confirmedBooking.reference}</AppText>
              </View>
              <View style={styles.otpBox}>
                <AppText style={styles.otpLabel}>BOARDING OTP</AppText>
                <AppText style={styles.otpValue}>{confirmedBooking.otp}</AppText>
              </View>
            </View>

            <AppDivider marginVertical={10} />

            <View style={styles.voucherDetails}>
              <AppText style={styles.voucherText}>
                🚗 Host: <AppText style={{ fontWeight: '700' }}>{confirmedBooking.host_name}</AppText> ({confirmedBooking.vehicle})
              </AppText>
              <AppText style={styles.voucherText}>
                📍 Pickup: {confirmedBooking.pickup}
              </AppText>
              <AppText style={styles.voucherText}>
                🕒 Departure: {confirmedBooking.departure}
              </AppText>
              <AppText style={styles.voucherText}>
                🌱 CO2 Emissions Saved: {confirmedBooking.co2_saved} kg
              </AppText>
            </View>
          </LinearGradient>
        )}

        {/* Search Button */}
        <AppButton
          onPress={searchTrips}
          loading={searching}
          disabled={searching}
          style={{ marginHorizontal: 16, marginBottom: 12, marginTop: 4 }}
        >
          {searching ? 'Searching...' : '🔍 Search Trips'}
        </AppButton>

        {/* Available Rides Section */}
        <View style={styles.sectionHeader}>
          <AppText style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            {searched ? `Available Trips (${filteredRides.length})` : 'Find Intercity Trips'}
          </AppText>
          <AppText style={[styles.subLabel, { color: theme.colors.textSecondary }]}>
            {searched ? 'Real-time results' : 'Enter cities and search'}
          </AppText>
        </View>

        {searched && filteredRides.length === 0 && !searching && (
          <View style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
            <MaterialCommunityIcons name="car-off" size={48} color={theme.colors.textSecondary} />
            <AppText style={[styles.hostName, { color: theme.colors.textSecondary, textAlign: 'center' }]}>
              No trips found matching your filters.
            </AppText>
            <AppText style={[styles.vehicleDesc, { color: theme.colors.textSecondary, textAlign: 'center' }]}>
              Try different cities or dates, or check back later.
            </AppText>
          </View>
        )}

        {filteredRides.map((ride) => (
          <AppCard key={ride.trip_id} style={[styles.rideCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.rideTop}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AppText style={[styles.hostName, { color: theme.colors.textPrimary }]}>
                    {ride.driver?.full_name || 'Driver'}
                  </AppText>
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <AppText style={styles.ratingText}>{(ride.driver?.rating || 4.5).toFixed(2)}</AppText>
                  </View>
                  {ride.women_only && (
                    <AppBadge label="Women Only" variant="info" size="sm" />
                  )}
                </View>
                <AppText style={[styles.vehicleDesc, { color: theme.colors.textSecondary }]}>
                  {ride.vehicle ? `${ride.vehicle.make} ${ride.vehicle.model}` : 'Vehicle'}
                  {ride.vehicle?.registration_number ? ` • ${ride.vehicle.registration_number}` : ''}
                </AppText>
              </View>

              <View style={styles.priceContainer}>
                <AppText style={[styles.priceValue, { color: theme.colors.primary }]}>
                  ₹{((ride.base_fare || 0) * seatsNeeded).toFixed(0)}
                </AppText>
                <AppText style={[styles.pricePerSeat, { color: theme.colors.textSecondary }]}>
                  for {seatsNeeded} seat(s)
                </AppText>
              </View>
            </View>

            <AppDivider marginVertical={10} />

            <View style={styles.routeBox}>
              <View style={styles.routeRow}>
                <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
                <AppText style={[styles.departureText, { color: theme.colors.textPrimary }]}>
                  {ride.departure_time
                    ? new Date(ride.departure_time).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
                    : 'TBD'}
                </AppText>
              </View>

              <View style={styles.routeRow}>
                <Ionicons name="navigate-outline" size={16} color="#10B981" />
                <AppText style={[styles.routeAddress, { color: theme.colors.textSecondary }]}>
                  {ride.pickup?.city || ride.pickup?.address || originCity} → {ride.destination?.city || ride.destination?.address || destinationCity}
                </AppText>
              </View>

              <View style={styles.waypointsRow}>
                <AppText style={[styles.waypointLabel, { color: theme.colors.textSecondary }]}>
                  {ride.distance_km ? `${ride.distance_km} km` : ''}
                  {ride.non_stop ? ' • Non-Stop' : ''}
                  {ride.parcel_enabled ? ' • Parcel OK' : ''}
                  {ride.available_seats != null ? ` • ${ride.available_seats} seats left` : ''}
                </AppText>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.ecoBadge}>
                <MaterialCommunityIcons name="leaf" size={14} color="#10B981" />
                <AppText style={styles.ecoText}>
                  Save {(0.18 * (ride.distance_km || 1) * seatsNeeded).toFixed(1)} kg CO2
                </AppText>
              </View>

              <AppButton
                onPress={() => handleBookCarpool(ride)}
                disabled={loading}
                loading={loading}
                size="sm"
                style={styles.bookBtn}
              >
                {`Book Seat (₹${((ride.base_fare || 0) * seatsNeeded).toFixed(0)})`}
              </AppButton>
            </View>
          </AppCard>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSubtitle: { fontSize: 12 },
  content: { padding: 16, paddingBottom: 40 },
  searchCard: { padding: 16, borderRadius: 16, marginBottom: 16 },
  corridorRow: { flexDirection: 'row', alignItems: 'center' },
  timelineDots: { alignItems: 'center', width: 20 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  line: { width: 2, height: 32, marginVertical: 4 },
  inputBox: { flex: 1 },
  inputLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  textInput: { fontSize: 15, fontWeight: '600', paddingVertical: 2 },
  filtersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  seatSelector: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterLabel: { fontSize: 12, fontWeight: '600' },
  seatBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatBtnText: { fontSize: 13, fontWeight: '700' },
  ladiesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  ladiesText: { fontSize: 12, fontWeight: '600' },
  voucherCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  voucherHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  voucherTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  voucherRef: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  otpBox: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  otpLabel: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  otpValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  voucherDetails: { gap: 4 },
  voucherText: { color: '#FFFFFF', fontSize: 13 },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  subLabel: { fontSize: 12 },
  rideCard: { padding: 16, borderRadius: 16, marginBottom: 14 },
  rideTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  hostName: { fontSize: 15, fontWeight: '700' },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  ratingText: { fontSize: 11, fontWeight: '700', color: '#B45309' },
  vehicleDesc: { fontSize: 12, marginTop: 2 },
  priceContainer: { alignItems: 'flex-end' },
  priceValue: { fontSize: 18, fontWeight: '800' },
  pricePerSeat: { fontSize: 10 },
  routeBox: { gap: 6 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  departureText: { fontSize: 13, fontWeight: '700' },
  routeAddress: { fontSize: 12, flex: 1 },
  waypointsRow: { marginTop: 2 },
  waypointLabel: { fontSize: 11, fontStyle: 'italic' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  ecoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  ecoText: { fontSize: 11, color: '#065F46', fontWeight: '600' },
  bookBtn: { minWidth: 120 },
})
