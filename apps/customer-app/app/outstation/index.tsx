/**
 * Customer App — Premium Outstation & Intercity Cab Booking Screen
 * Route: /outstation
 * Feature: Interactive Location Picker + Vehicle Tiers + Direct Driver Dispatch.
 */
import React, { useState, useEffect } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  StatusBar,
  Alert,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../../src/contexts/ThemeContext'
import { useTranslation } from '../../src/i18n'
import { AppText, AppButton, AppCard, AppBadge, AppDivider } from '../../src/components/ui'
import { rideApi, profileApi } from '../../src/api/client'
import { geocodeCity, haversineDistance } from '../../src/utils/maps'
import LocationPickerModal, { SelectedLocationData } from '../../src/components/map/LocationPickerModal'

const { width: SCREEN_W } = Dimensions.get('window')

const VEHICLE_TIERS = [
  { id: 'sedan', name: 'sedan', display: 'Sedan (Dzire / Etios)', seats: 4, bags: 2, per_km: 14, icon: 'car-side', desc: 'AC • 4 Seats • 2 Bags • Ideal for couples & small families' },
  { id: 'suv', name: 'suv', display: 'SUV (Ertiga / Carens)', seats: 6, bags: 4, per_km: 19, icon: 'car-estate', desc: 'AC • 6 Seats • 4 Bags • Great for family vacations' },
  { id: 'crysta', name: 'luxury', display: 'Innova Crysta Luxury', seats: 6, bags: 5, per_km: 24, icon: 'car-estate', desc: 'AC • Captain Chairs • VIP Comfort • Top Rated Chauffeur' },
]

export default function OutstationBookingScreen() {
  const { theme, isDark } = useTheme()
  const params = useLocalSearchParams<{
    pickupAddress?: string
    pickupLat?: string
    pickupLng?: string
    dropAddress?: string
    dropLat?: string
    dropLng?: string
  }>()

  const { t } = useTranslation()
  const [tripType, setTripType] = useState<'ONE_WAY' | 'ROUND_TRIP' | 'MULTI_CITY'>('ONE_WAY')

  // Locations & Coordinates
  const [originAddress, setOriginAddress] = useState(params?.pickupAddress || 'Shivajinagar, Pune')
  const [originCoord, setOriginCoord] = useState<{ latitude: number; longitude: number }>({
    latitude: params?.pickupLat ? parseFloat(params.pickupLat) : 18.5204,
    longitude: params?.pickupLng ? parseFloat(params.pickupLng) : 73.8567,
  })

  const [destinationAddress, setDestinationAddress] = useState(params?.dropAddress || 'Mahabaleshwar Main Market')
  const [destinationCoord, setDestinationCoord] = useState<{ latitude: number; longitude: number }>({
    latitude: params?.dropLat ? parseFloat(params.dropLat) : 17.9307,
    longitude: params?.dropLng ? parseFloat(params.dropLng) : 73.6477,
  })

  // Location Picker Modal state
  const [pickerMode, setPickerMode] = useState<'pickup' | 'drop' | null>(null)
  const [savedAddresses, setSavedAddresses] = useState<any[]>([])

  const [departureDate, setDepartureDate] = useState('Tomorrow, 06:00 AM')
  const [returnDate, setReturnDate] = useState('Day after tomorrow, 08:00 PM')
  const [selectedTier, setSelectedTier] = useState<string>('sedan')
  const [passengers, setPassengers] = useState<number>(2)
  const [loading, setLoading] = useState<boolean>(false)

  // Fetch saved addresses
  useEffect(() => {
    profileApi.getAddresses().then((res) => {
      const addrs = res.data?.data || res.data || []
      if (Array.isArray(addrs)) setSavedAddresses(addrs)
    }).catch(() => {})
  }, [])

  // Calculate actual spatial distance
  const realSpatialDist = haversineDistance(
    originCoord.latitude, originCoord.longitude,
    destinationCoord.latitude, destinationCoord.longitude
  )
  const baseKm = Math.max(realSpatialDist, 50)
  const estDistanceKm = tripType === 'ROUND_TRIP' ? Math.round(baseKm * 2) : Math.round(baseKm)

  const tier = VEHICLE_TIERS.find((v) => v.id === selectedTier) || VEHICLE_TIERS[0]
  const baseFare = estDistanceKm * tier.per_km
  const driverAllowance = tripType === 'ROUND_TRIP' ? 500 : 300
  const tollEstimate = tripType === 'ROUND_TRIP' ? 360 : 180
  const totalEstimatedFare = baseFare + driverAllowance + tollEstimate

  const handleLocationConfirmed = (loc: SelectedLocationData) => {
    if (pickerMode === 'pickup') {
      setOriginAddress(loc.address)
      setOriginCoord({ latitude: loc.latitude, longitude: loc.longitude })
    } else if (pickerMode === 'drop') {
      setDestinationAddress(loc.address)
      setDestinationCoord({ latitude: loc.latitude, longitude: loc.longitude })
    }
    setPickerMode(null)
  }

  const handleSelectSavedAddress = (addr: any, target: 'pickup' | 'drop') => {
    const lat = addr.latitude || 18.5204
    const lng = addr.longitude || 73.8567
    const fullText = addr.full_address || addr.address || addr.label

    if (target === 'pickup') {
      setOriginAddress(fullText)
      setOriginCoord({ latitude: lat, longitude: lng })
    } else {
      setDestinationAddress(fullText)
      setDestinationCoord({ latitude: lat, longitude: lng })
    }
  }

  const handleBookOutstation = async () => {
    setLoading(true)
    const requestId = `outstation_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    let rideRequestId = requestId

    try {
      const res = await rideApi.createRequest({
        request_id: requestId,
        pickup_lat: originCoord.latitude,
        pickup_lng: originCoord.longitude,
        pickup_address: originAddress,
        destination_lat: destinationCoord.latitude,
        destination_lng: destinationCoord.longitude,
        destination_address: destinationAddress,
        category_name: tier.name,
        seats_requested: passengers,
        payment_method: 'CASH',
        service_type: 'outstation',
        pricing_mode: 'STANDARD',
        is_scheduled: false,
        seat_preferences: { pricing_mode: 'STANDARD', standard_fare: totalEstimatedFare },
      })
      const d = res.data?.data || res.data
      rideRequestId = d?.ride_request_id || d?.id || requestId
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setLoading(false)
        Alert.alert('Session Expired', 'Please log in again.')
        return
      }
    } finally {
      setLoading(false)
    }

    // Direct navigate to matching-waiting
    router.push({
      pathname: '/matching-waiting',
      params: {
        rideRequestId,
        bookingId: rideRequestId,
        pickupAddress: originAddress,
        dropAddress: destinationAddress,
        pickupLat: originCoord.latitude.toString(),
        pickupLng: originCoord.longitude.toString(),
        dropLat: destinationCoord.latitude.toString(),
        dropLng: destinationCoord.longitude.toString(),
        fare: totalEstimatedFare.toString(),
        serviceType: `Outstation • ${tier.display}`,
      },
    } as any)
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.backgroundAlt }]}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header Banner */}
        <LinearGradient
          colors={isDark ? ['#0F172A', '#1E3A5F'] : ['#0284C7', '#0369A1']}
          style={styles.headerGradient}
        >
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText variant="title" bold style={{ color: '#FFFFFF' }}>Outstation & Intercity</AppText>
            <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Fixed Rates • Verified Chauffeurs • Tolls Included
            </AppText>
          </View>
          <AppBadge label="🏙️ Intercity" variant="info" size="sm" />
        </LinearGradient>

        {/* Trip Type Tabs */}
        <View style={[styles.tabBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {(['ONE_WAY', 'ROUND_TRIP', 'MULTI_CITY'] as const).map((tMode) => (
            <TouchableOpacity
              key={tMode}
              style={[styles.tabItem, tripType === tMode && { backgroundColor: theme.colors.primary }]}
              onPress={() => setTripType(tMode)}
            >
              <AppText variant="caption" bold style={{ color: tripType === tMode ? '#FFF' : theme.colors.textPrimary }}>
                {tMode === 'ONE_WAY' ? '➡️ One-Way' : tMode === 'ROUND_TRIP' ? '🔄 Round-Trip' : '🏙️ Multi-City'}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* ── Interactive Route Card ── */}
          <AppCard style={styles.locationCard}>
            {/* Origin Row */}
            <View style={styles.locRow}>
              <View style={styles.routeCol}>
                <View style={styles.originDot} />
                <View style={styles.routeConnectorLine} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="label" color="muted">ORIGIN (PICKUP CITY / ADDRESS)</AppText>
                <TouchableOpacity
                  style={[styles.interactiveBox, { borderColor: '#10B981', backgroundColor: '#10B98108' }]}
                  onPress={() => setPickerMode('pickup')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="radio-button-on" size={16} color="#10B981" />
                  <AppText variant="bodyS" bold style={{ flex: 1 }} numberOfLines={1}>
                    {originAddress}
                  </AppText>
                  <View style={styles.mapPill}>
                    <Feather name="map" size={12} color="#10B981" />
                    <AppText variant="caption" bold style={{ color: '#10B981', marginLeft: 4 }}>Map</AppText>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Saved Addresses for Origin */}
            {savedAddresses.length > 0 && (
              <View style={{ marginLeft: 28, marginTop: 4 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {savedAddresses.slice(0, 4).map((addr) => (
                    <TouchableOpacity
                      key={`orig_${addr.id}`}
                      style={[styles.savedChip, { backgroundColor: `${theme.colors.primary}08`, borderColor: `${theme.colors.primary}20` }]}
                      onPress={() => handleSelectSavedAddress(addr, 'pickup')}
                    >
                      <Ionicons name={addr.label?.toLowerCase() === 'home' ? 'home' : 'location'} size={12} color={theme.colors.primary} />
                      <AppText variant="caption" bold color="brand">{addr.label}</AppText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Destination Row */}
            <View style={[styles.locRow, { marginTop: 10 }]}>
              <View style={styles.routeCol}>
                <View style={styles.destDot} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="label" color="muted">DESTINATION (CITY / RESORT)</AppText>
                <TouchableOpacity
                  style={[styles.interactiveBox, { borderColor: '#EF4444', backgroundColor: '#EF444408' }]}
                  onPress={() => setPickerMode('drop')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="location" size={18} color="#EF4444" />
                  <AppText variant="bodyS" bold style={{ flex: 1 }} numberOfLines={1}>
                    {destinationAddress}
                  </AppText>
                  <View style={[styles.mapPill, { backgroundColor: '#EF444415' }]}>
                    <Feather name="map-pin" size={12} color="#EF4444" />
                    <AppText variant="caption" bold style={{ color: '#EF4444', marginLeft: 4 }}>Map</AppText>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Schedule & Timing */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <View style={{ flex: 1 }}>
                <AppText variant="label" color="muted">DEPARTURE</AppText>
                <TextInput
                  style={[styles.dateInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundAlt }]}
                  value={departureDate}
                  onChangeText={setDepartureDate}
                />
              </View>
              {tripType === 'ROUND_TRIP' && (
                <View style={{ flex: 1 }}>
                  <AppText variant="label" color="muted">RETURN</AppText>
                  <TextInput
                    style={[styles.dateInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundAlt }]}
                    value={returnDate}
                    onChangeText={setReturnDate}
                  />
                </View>
              )}
            </View>

            {/* Passenger Count */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="people" size={18} color={theme.colors.primary} />
                <AppText variant="bodyS" bold>Passengers</AppText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity
                  style={[styles.counterBtn, { borderColor: theme.colors.border }]}
                  onPress={() => setPassengers(Math.max(1, passengers - 1))}
                >
                  <Feather name="minus" size={16} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <AppText variant="body" bold>{passengers}</AppText>
                <TouchableOpacity
                  style={[styles.counterBtn, { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary }]}
                  onPress={() => setPassengers(Math.min(tier.seats, passengers + 1))}
                >
                  <Feather name="plus" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          </AppCard>

          {/* ── Vehicle Tier Selection ── */}
          <View style={{ marginTop: 8 }}>
            <AppText variant="title" bold style={{ marginBottom: 10 }}>Choose Vehicle Category</AppText>
            <View style={{ gap: 10 }}>
              {VEHICLE_TIERS.map((v) => {
                const isSel = selectedTier === v.id
                const fare = (estDistanceKm * v.per_km) + driverAllowance + tollEstimate
                return (
                  <TouchableOpacity
                    key={v.id}
                    activeOpacity={0.8}
                    onPress={() => setSelectedTier(v.id)}
                    style={[
                      styles.vehicleCard,
                      {
                        backgroundColor: isSel ? `${theme.colors.primary}10` : theme.colors.surface,
                        borderColor: isSel ? theme.colors.primary : theme.colors.border,
                        borderWidth: isSel ? 2 : 1,
                      },
                    ]}
                  >
                    <View style={[styles.vehIconBox, { backgroundColor: isSel ? theme.colors.primary : theme.colors.backgroundAlt }]}>
                      <MaterialCommunityIcons name={v.icon as any} size={24} color={isSel ? '#FFF' : theme.colors.textSecondary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <AppText variant="bodyS" bold>{v.display}</AppText>
                        {isSel && <AppBadge label="Selected ✓" variant="success" size="sm" />}
                      </View>
                      <AppText variant="caption" color="muted" style={{ marginTop: 2 }}>{v.desc}</AppText>
                    </View>
                    <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                      <AppText variant="title" bold color="brand">₹{fare}</AppText>
                      <AppText variant="caption" color="muted">₹{v.per_km}/km</AppText>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* ── Fare Breakdown ── */}
          <AppCard style={[styles.locationCard, { marginTop: 14 }]}>
            <AppText variant="subtitle" bold style={{ marginBottom: 10 }}>Authoritative Fare Breakdown</AppText>
            <View style={styles.fareRow}>
              <AppText variant="caption" color="muted">{estDistanceKm} km @ ₹{tier.per_km}/km</AppText>
              <AppText variant="bodyS">₹{baseFare}</AppText>
            </View>
            <View style={styles.fareRow}>
              <AppText variant="caption" color="muted">Chauffeur Allowance ({tripType === 'ROUND_TRIP' ? '2 Days' : '1 Day'})</AppText>
              <AppText variant="bodyS">₹{driverAllowance}</AppText>
            </View>
            <View style={styles.fareRow}>
              <AppText variant="caption" color="muted">Toll & State Permit (Estimated)</AppText>
              <AppText variant="bodyS">₹{tollEstimate}</AppText>
            </View>
            <AppDivider marginVertical={8} />
            <View style={styles.fareRow}>
              <AppText variant="body" bold>All-Inclusive Total</AppText>
              <AppText variant="h3" bold color="brand">₹{totalEstimatedFare}</AppText>
            </View>
            <View style={[styles.guaranteeBadge, { backgroundColor: `${theme.colors.success}15`, borderColor: theme.colors.success }]}>
              <Ionicons name="shield-checkmark" size={14} color={theme.colors.success} />
              <AppText variant="caption" bold style={{ color: theme.colors.success, marginLeft: 6 }}>
                Fixed price guarantee — no hidden driver charges
              </AppText>
            </View>
          </AppCard>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bottom CTA Bar */}
        <View style={[styles.bottomBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
          <View>
            <AppText variant="caption" color="muted">Estimated Total</AppText>
            <AppText variant="h2" bold color="brand">₹{totalEstimatedFare}</AppText>
            <AppText variant="caption" color="muted">{tier.display.split(' ')[0]} • {passengers} passengers</AppText>
          </View>
          <AppButton variant="primary" style={{ minWidth: 180 }} loading={loading} onPress={handleBookOutstation}>
            {loading ? 'Finding Drivers...' : 'Book Outstation Cab 🏙️'}
          </AppButton>
        </View>
      </SafeAreaView>

      {/* ── Reusable Location Picker Modal ── */}
      {pickerMode && (
        <LocationPickerModal
          visible={!!pickerMode}
          mode={pickerMode}
          title={pickerMode === 'pickup' ? 'Pick Origin Location' : 'Pick Outstation Destination'}
          initialLocation={
            pickerMode === 'pickup'
              ? { latitude: originCoord.latitude, longitude: originCoord.longitude, address: originAddress }
              : { latitude: destinationCoord.latitude, longitude: destinationCoord.longitude, address: destinationAddress }
          }
          savedAddresses={savedAddresses}
          onClose={() => setPickerMode(null)}
          onConfirm={handleLocationConfirmed}
          onAddressSaved={(newAddr) => setSavedAddresses((prev) => [...prev, newAddr])}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingTop: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  locationCard: {
    padding: 16,
    borderRadius: 18,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  routeCol: {
    width: 24,
    alignItems: 'center',
    marginRight: 6,
    paddingTop: 18,
  },
  originDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 3,
  },
  routeConnectorLine: {
    width: 2,
    height: 38,
    backgroundColor: '#CBD5E1',
    marginVertical: 4,
  },
  destDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 3,
  },
  interactiveBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  mapPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98115',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  savedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    marginTop: 4,
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
  },
  vehIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  guaranteeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
});
