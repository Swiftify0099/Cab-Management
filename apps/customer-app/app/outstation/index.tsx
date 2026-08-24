/**
 * Customer App — Outstation & Intercity Cab Booking Screen
 * Route: /outstation
 * Fixed: Directly submits ride request → navigates to /matching-waiting (no /book/cab detour).
 */
import React, { useState } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, TextInput, StatusBar } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../../src/contexts/ThemeContext'
import { useTranslation } from '../../src/i18n'
import { AppText, AppButton, AppCard, AppBadge, AppDivider } from '../../src/components/ui'
import { rideApi } from '../../src/api/client'
import { geocodeCity } from '../../src/utils/maps'

const VEHICLE_TIERS = [
  { id: 'sedan', name: 'sedan', display: 'Sedan (Dzire / Etios)', seats: 4, per_km: 14, icon: 'car-side', desc: 'AC • 4 Seats • 2 Bags' },
  { id: 'suv', name: 'suv', display: 'SUV (Ertiga / Innova)', seats: 6, per_km: 19, icon: 'car-estate', desc: 'AC • 6 Seats • 4 Bags' },
  { id: 'crysta', name: 'luxury', display: 'Innova Crysta', seats: 6, per_km: 24, icon: 'car-estate', desc: 'AC • Captain Seats • Luxury' },
]

export default function OutstationBookingScreen() {
  const { theme, isDark } = useTheme()
  const { t } = useTranslation()
  const [tripType, setTripType] = useState<'ONE_WAY' | 'ROUND_TRIP' | 'MULTI_CITY'>('ONE_WAY')
  const [originAddress, setOriginAddress] = useState('Pune Railway Station, Pune')
  const [destinationAddress, setDestinationAddress] = useState('Mahabaleshwar Main Market')
  const [departureDate, setDepartureDate] = useState('Tomorrow, 06:00 AM')
  const [returnDate, setReturnDate] = useState('Day after tomorrow, 08:00 PM')
  const [selectedTier, setSelectedTier] = useState<string>('sedan')
  const [passengers, setPassengers] = useState<number>(2)
  const [loading, setLoading] = useState<boolean>(false)

  const estDistanceKm = tripType === 'ROUND_TRIP' ? 240 : 120
  const tier = VEHICLE_TIERS.find((v) => v.id === selectedTier) || VEHICLE_TIERS[0]
  const baseFare = estDistanceKm * tier.per_km
  const driverAllowance = tripType === 'ROUND_TRIP' ? 400 : 250
  const tollEstimate = 180
  const totalEstimatedFare = baseFare + driverAllowance + tollEstimate

  const handleBookOutstation = async () => {
    setLoading(true)
    let pickupLat = 18.5204, pickupLng = 73.8567, dropLat = 17.9307, dropLng = 73.6477
    try {
      const [og, dg] = await Promise.all([geocodeCity(originAddress), geocodeCity(destinationAddress)])
      if (og) { pickupLat = og.lat; pickupLng = og.lon }
      if (dg) { dropLat = dg.lat; dropLng = dg.lon }
    } catch {}
    const requestId = `outstation_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    let rideRequestId = requestId
    try {
      const res = await rideApi.createRequest({
        request_id: requestId,
        pickup_lat: pickupLat, pickup_lng: pickupLng, pickup_address: originAddress,
        destination_lat: dropLat, destination_lng: dropLng, destination_address: destinationAddress,
        category_name: tier.name, seats_requested: passengers,
        payment_method: 'CASH', service_type: 'outstation',
        pricing_mode: 'STANDARD', is_scheduled: false,
        seat_preferences: { pricing_mode: 'STANDARD', standard_fare: totalEstimatedFare },
      })
      const d = res.data?.data || res.data
      rideRequestId = d?.ride_request_id || d?.id || requestId
    } catch (err: any) {
      console.warn('[Outstation] API error, using local ID:', err?.message)
    } finally {
      setLoading(false)
    }
    // ✅ Navigate DIRECTLY to matching-waiting (Bug 1 fixed)
    router.push({
      pathname: '/matching-waiting',
      params: {
        rideRequestId, bookingId: rideRequestId,
        pickupAddress: originAddress, dropAddress: destinationAddress,
        pickupLat: pickupLat.toString(), pickupLng: pickupLng.toString(),
        dropLat: dropLat.toString(), dropLng: dropLng.toString(),
        fare: totalEstimatedFare.toString(),
        serviceType: `Outstation • ${tier.display}`,
      },
    } as any)
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.backgroundAlt }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={isDark ? ['#0F172A', '#1E3A5F'] : ['#0284C7', '#0EA5E9']} style={styles.headerGradient}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText variant="title" bold style={{ color: '#FFFFFF' }}>Outstation & Intercity</AppText>
            <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.75)' }}>Verified drivers • Zero cancellation guarantee</AppText>
          </View>
          <AppBadge label="🏙️ Intercity" variant="info" size="sm" />
        </LinearGradient>

        <View style={[styles.tabBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {(['ONE_WAY', 'ROUND_TRIP', 'MULTI_CITY'] as const).map((tMode) => (
            <TouchableOpacity key={tMode} style={[styles.tabItem, tripType === tMode && { backgroundColor: theme.colors.primary }]} onPress={() => setTripType(tMode)}>
              <AppText variant="caption" bold style={{ color: tripType === tMode ? '#FFF' : theme.colors.textPrimary }}>
                {tMode === 'ONE_WAY' ? '➡️ One-Way' : tMode === 'ROUND_TRIP' ? '🔄 Round-Trip' : '🏙️ Multi-City'}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <AppCard style={styles.card}>
            <View style={styles.inputGroup}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="radio-button-on" size={16} color="#10B981" />
                <AppText variant="caption" bold color="muted" style={{ marginLeft: 8 }}>FROM (ORIGIN CITY / ADDRESS)</AppText>
              </View>
              <TextInput style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]} value={originAddress} onChangeText={setOriginAddress} placeholder="Enter origin city..." placeholderTextColor={theme.colors.textMuted} />
            </View>
            <View style={styles.swapRow}>
              <View style={[styles.routeLine, { borderColor: theme.colors.border }]} />
              <View style={[styles.swapDot, { backgroundColor: theme.colors.primary }]}><Ionicons name="swap-vertical" size={14} color="#FFF" /></View>
              <View style={[styles.routeLine, { borderColor: theme.colors.border }]} />
            </View>
            <View style={[styles.inputGroup, { marginTop: 4 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="location" size={16} color="#EF4444" />
                <AppText variant="caption" bold color="muted" style={{ marginLeft: 8 }}>TO (DESTINATION CITY / RESORT)</AppText>
              </View>
              <TextInput style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]} value={destinationAddress} onChangeText={setDestinationAddress} placeholder="Enter destination..." placeholderTextColor={theme.colors.textMuted} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color="muted">DEPARTURE</AppText>
                <TextInput style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]} value={departureDate} onChangeText={setDepartureDate} />
              </View>
              {tripType === 'ROUND_TRIP' && (
                <View style={{ flex: 1 }}>
                  <AppText variant="caption" color="muted">RETURN</AppText>
                  <TextInput style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]} value={returnDate} onChangeText={setReturnDate} />
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="people-outline" size={18} color={theme.colors.textSecondary} />
                <AppText variant="bodyS" color="secondary">Passengers</AppText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity style={[styles.counterBtn, { borderColor: theme.colors.border }]} onPress={() => setPassengers(Math.max(1, passengers - 1))}>
                  <Feather name="minus" size={16} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <AppText variant="body" bold>{passengers}</AppText>
                <TouchableOpacity style={[styles.counterBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.primary }]} onPress={() => setPassengers(Math.min(tier.seats, passengers + 1))}>
                  <Feather name="plus" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          </AppCard>

          <View style={{ marginTop: 16 }}>
            <AppText variant="body" bold style={{ marginBottom: 10 }}>Choose Vehicle Tier</AppText>
            <View style={{ gap: 10 }}>
              {VEHICLE_TIERS.map((v) => {
                const isSel = selectedTier === v.id
                const fare = (estDistanceKm * v.per_km) + driverAllowance + tollEstimate
                return (
                  <TouchableOpacity key={v.id} activeOpacity={0.75} onPress={() => setSelectedTier(v.id)}
                    style={[styles.vehicleCard, { backgroundColor: isSel ? `${theme.colors.primary}12` : theme.colors.surface, borderColor: isSel ? theme.colors.primary : theme.colors.border, borderWidth: isSel ? 2 : 1.5 }]}>
                    <View style={[styles.vehIconBox, { backgroundColor: isSel ? theme.colors.primary : theme.colors.backgroundAlt }]}>
                      <MaterialCommunityIcons name={v.icon as any} size={24} color={isSel ? '#FFF' : theme.colors.textSecondary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <AppText variant="bodyS" bold>{v.display}</AppText>
                      <AppText variant="caption" color="muted">{v.desc}</AppText>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <AppText variant="title" bold color="brand">₹{fare}</AppText>
                      <AppText variant="caption" color="muted">₹{v.per_km}/km</AppText>
                      {isSel && <AppBadge label="Selected ✓" variant="success" size="sm" />}
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          <AppCard style={[styles.card, { marginTop: 16 }]}>
            <AppText variant="bodyS" bold style={{ marginBottom: 10 }}>Estimated Fare Breakdown</AppText>
            <View style={styles.fareRow}><AppText variant="caption" color="muted">{estDistanceKm} km @ ₹{tier.per_km}/km</AppText><AppText variant="bodyS">₹{baseFare}</AppText></View>
            <View style={styles.fareRow}><AppText variant="caption" color="muted">Driver Allowance ({tripType === 'ROUND_TRIP' ? '2-day' : '1-day'})</AppText><AppText variant="bodyS">₹{driverAllowance}</AppText></View>
            <View style={styles.fareRow}><AppText variant="caption" color="muted">Toll & State Permit (Est.)</AppText><AppText variant="bodyS">₹{tollEstimate}</AppText></View>
            <AppDivider marginVertical={8} />
            <View style={styles.fareRow}><AppText variant="body" bold>All-Inclusive Total</AppText><AppText variant="h3" bold color="brand">₹{totalEstimatedFare}</AppText></View>
            <View style={[styles.guaranteeBadge, { backgroundColor: `${theme.colors.success}15`, borderColor: theme.colors.success }]}>
              <Ionicons name="shield-checkmark" size={14} color={theme.colors.success} />
              <AppText variant="caption" bold style={{ color: theme.colors.success, marginLeft: 6 }}>Price guaranteed — no hidden charges</AppText>
            </View>
          </AppCard>
          <View style={{ height: 120 }} />
        </ScrollView>

        <View style={[styles.bottomBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
          <View>
            <AppText variant="caption" color="muted">Estimated Total</AppText>
            <AppText variant="h2" bold color="brand">₹{totalEstimatedFare}</AppText>
            <AppText variant="caption" color="muted">{tier.display} • {passengers} pax</AppText>
          </View>
          <AppButton variant="primary" style={{ minWidth: 180 }} loading={loading} onPress={handleBookOutstation}>
            {loading ? 'Finding Drivers...' : 'Book Outstation Cab 🏙️'}
          </AppButton>
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  headerGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, paddingTop: 8 },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tabBar: { flexDirection: 'row', marginHorizontal: 20, marginVertical: 10, borderRadius: 14, padding: 4, borderWidth: 1 },
  tabItem: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  card: { padding: 16, borderRadius: 16 },
  inputGroup: { gap: 4 },
  swapRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 10, paddingHorizontal: 4 },
  routeLine: { flex: 1, height: 1, borderTopWidth: 1, borderStyle: 'dashed' },
  swapDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginHorizontal: 10 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, marginTop: 4 },
  counterBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  vehicleCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16 },
  vehIconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' },
  guaranteeBadge: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 10, borderWidth: 1, marginTop: 10 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1 },
})