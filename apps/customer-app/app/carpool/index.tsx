/**
 * Customer App — Intercity Carpool & Highway Rideshare Screen
 * Route: /carpool
 * Features: Route corridor search, seat-by-seat selection, ladies-only filter,
 * carbon emissions badge, host chauffeur rating, instant wallet booking, and boarding OTP voucher.
 */
import React, { useState } from 'react'
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

const MOCK_CARPOOLS = [
  {
    id: 'pool_1',
    reference: 'POOL-260825-U2XE',
    host_name: 'Abhijit Kulkarni',
    host_rating: 4.94,
    total_trips: 310,
    vehicle: 'Hyundai Creta SX (Titan Grey)',
    origin: 'Wakad Bridge, Pune',
    destination: 'BKC, Mumbai',
    departure: 'Tomorrow, 07:30 AM',
    seats_available: 3,
    price_per_seat: 450,
    ladies_only: false,
    co2_saved_kg: 18.0,
    waypoints: ['Lonavala Toll', 'Vashi Flyover'],
  },
  {
    id: 'pool_2',
    reference: 'POOL-260825-L98Q',
    host_name: 'Dr. Priya Shah',
    host_rating: 4.98,
    total_trips: 185,
    vehicle: 'Honda City ZX (Pearl White)',
    origin: 'Kothrud, Pune',
    destination: 'Dadar West, Mumbai',
    departure: 'Tomorrow, 08:00 AM',
    seats_available: 2,
    price_per_seat: 480,
    ladies_only: true,
    co2_saved_kg: 18.0,
    waypoints: ['Khandala Point', 'Chembur Diamond Garden'],
  },
  {
    id: 'pool_3',
    reference: 'POOL-260825-N44R',
    host_name: 'Suresh Patil',
    host_rating: 4.91,
    total_trips: 420,
    vehicle: 'Maruti Suzuki Grand Vitara',
    origin: 'Viman Nagar, Pune',
    destination: 'Dwarka Circle, Nashik',
    departure: 'Tomorrow, 06:00 AM',
    seats_available: 4,
    price_per_seat: 380,
    ladies_only: false,
    co2_saved_kg: 24.5,
    waypoints: ['Alephata Junction', 'Sinnar Phata'],
  },
]

export default function CarpoolScreen() {
  const { theme, isDark } = useTheme()
  const { t } = useTranslation()
  const params = useLocalSearchParams<{ origin?: string; destination?: string }>()

  const [originCity, setOriginCity] = useState(params?.origin || 'Pune')
  const [destinationCity, setDestinationCity] = useState(params?.destination || 'Mumbai')
  const [seatsNeeded, setSeatsNeeded] = useState<number>(1)
  const [ladiesOnly, setLadiesOnly] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [selectedRide, setSelectedRide] = useState<any | null>(null)
  const [confirmedBooking, setConfirmedBooking] = useState<any | null>(null)

  const filteredRides = MOCK_CARPOOLS.filter((r) => {
    if (ladiesOnly && !r.ladies_only) return false
    if (r.seats_available < seatsNeeded) return false
    return true
  })

  const handleBookCarpool = (ride: any) => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      const mockOtp = Math.floor(1000 + Math.random() * 9000).toString()
      setConfirmedBooking({
        reference: `PBK-${Date.now().toString().slice(-6)}`,
        trip_ref: ride.reference,
        host_name: ride.host_name,
        vehicle: ride.vehicle,
        seats: seatsNeeded,
        total_fare: ride.price_per_seat * seatsNeeded,
        departure: ride.departure,
        pickup: ride.origin,
        drop: ride.destination,
        otp: mockOtp,
        co2_saved: (ride.co2_saved_kg * seatsNeeded).toFixed(1),
      })
      Alert.alert(
        'Seat Reserved! 🚗👥',
        `Your seat on ${ride.reference} is confirmed.\nBoarding OTP: ${mockOtp}`,
        [{ text: 'View Voucher', onPress: () => {} }]
      )
    }, 800)
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

        {/* Available Rides Section */}
        <View style={styles.sectionHeader}>
          <AppText style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Available Carpools ({filteredRides.length})
          </AppText>
          <AppText style={[styles.subLabel, { color: theme.colors.textSecondary }]}>
            Verified host drivers
          </AppText>
        </View>

        {filteredRides.map((ride) => (
          <AppCard key={ride.id} style={[styles.rideCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.rideTop}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AppText style={[styles.hostName, { color: theme.colors.textPrimary }]}>
                    {ride.host_name}
                  </AppText>
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <AppText style={styles.ratingText}>{ride.host_rating}</AppText>
                  </View>
                  {ride.ladies_only && (
                    <AppBadge label="Women Only" variant="info" size="sm" />
                  )}
                </View>
                <AppText style={[styles.vehicleDesc, { color: theme.colors.textSecondary }]}>
                  {ride.vehicle}
                </AppText>
              </View>

              <View style={styles.priceContainer}>
                <AppText style={[styles.priceValue, { color: theme.colors.primary }]}>
                  ₹{ride.price_per_seat * seatsNeeded}
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
                  {ride.departure}
                </AppText>
              </View>

              <View style={styles.routeRow}>
                <Ionicons name="navigate-outline" size={16} color="#10B981" />
                <AppText style={[styles.routeAddress, { color: theme.colors.textSecondary }]}>
                  {ride.origin} → {ride.destination}
                </AppText>
              </View>

              <View style={styles.waypointsRow}>
                <AppText style={[styles.waypointLabel, { color: theme.colors.textSecondary }]}>
                  Corridor Stops: {ride.waypoints.join(' • ')}
                </AppText>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.ecoBadge}>
                <MaterialCommunityIcons name="leaf" size={14} color="#10B981" />
                <AppText style={styles.ecoText}>
                  Save {(ride.co2_saved_kg * seatsNeeded).toFixed(1)} kg CO2
                </AppText>
              </View>

              <AppButton
                onPress={() => handleBookCarpool(ride)}
                disabled={loading}
                loading={loading}
                size="sm"
                style={styles.bookBtn}
              >
                {`Book Seat (₹${ride.price_per_seat * seatsNeeded})`}
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
