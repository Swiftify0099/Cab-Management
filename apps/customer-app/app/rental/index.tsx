/**
 * Feature 19: Hourly & Daily Car Rental Service Screen
 * Complete Map API & Location Integration:
 * - Dual Pickup Entry: Manual text input & Interactive Google Maps picker
 * - Real-time Google Places Autocomplete dropdown
 * - 1-Tap GPS "Use Current Location" with Reverse Geocoding
 * - Interactive Full Map Picker Modal with centered draggable pin & GPS recentering
 * - Supports navigation to /profile/address-picker
 * - Hourly / Multi-Hour Packages (1hr/10km, 2hr/20km, 4hr/40km, 8hr/80km, 12hr/120km)
 * - Vehicle Class Selector (Hatchback, Prime Sedan, Premium SUV, Luxury Chauffeur)
 * - Dynamic Itemized Fare Calculation with backend rentalApi.estimate
 */
import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  StatusBar,
  Alert,
  Modal,
  Keyboard,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps'
import * as Location from 'expo-location'
import { useTheme } from '../../src/contexts/ThemeContext'
import { useTranslation } from '../../src/i18n'
import { AppText, AppButton, AppCard, AppBadge, AppDivider } from '../../src/components/ui'
import { rentalApi } from '../../src/api/client'
import { geocodeCity, reverseGeocodeCoordinate } from '../../src/utils/maps'

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || ''
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

interface RentalPlan {
  id: string
  name: string
  hours: number
  distance_km: number
  base_fare: number
  extra_km_rate: number
  extra_hr_rate: number
  tag?: string
  icon?: string
}

const DEFAULT_PLANS: RentalPlan[] = [
  { id: '1HR_10KM', name: '1 Hour / 10 km', hours: 1, distance_km: 10, base_fare: 299, extra_km_rate: 14, extra_hr_rate: 120, tag: 'Quick Errands', icon: 'flash' },
  { id: '2HR_20KM', name: '2 Hours / 20 km', hours: 2, distance_km: 20, base_fare: 549, extra_km_rate: 14, extra_hr_rate: 120, tag: 'City Meetings', icon: 'briefcase' },
  { id: '4HR_40KM', name: '4 Hours / 40 km', hours: 4, distance_km: 40, base_fare: 999, extra_km_rate: 13, extra_hr_rate: 110, tag: 'Popular', icon: 'star' },
  { id: '8HR_80KM', name: '8 Hours / 80 km', hours: 8, distance_km: 80, base_fare: 1899, extra_km_rate: 12, extra_hr_rate: 100, tag: 'Full Day Tour', icon: 'sunny' },
  { id: '12HR_120KM', name: '12 Hours / 120 km', hours: 12, distance_km: 120, base_fare: 2699, extra_km_rate: 12, extra_hr_rate: 90, tag: 'Extended Travel', icon: 'map' },
]

const VEHICLE_CATEGORIES = [
  { id: 'HATCHBACK', name: 'Mini / Hatchback', desc: 'WagonR, Tiago • 4 Seats', multiplier: 1.0, icon: 'car-side' },
  { id: 'SEDAN', name: 'Prime Sedan', desc: 'Dzire, Amaze • 4 Seats AC', multiplier: 1.2, icon: 'car-side' },
  { id: 'SUV', name: 'Prime SUV', desc: 'Ertiga, Carens • 6-7 Seats', multiplier: 1.6, icon: 'car-estate' },
  { id: 'LUXURY', name: 'Luxury Chauffeur', desc: 'Innova Crysta, Fortuner', multiplier: 2.2, icon: 'car-sports' },
]

export default function CarRentalScreen() {
  const params = useLocalSearchParams<{
    pickup?: string
    lat?: string
    lon?: string
  }>()

  const { theme, isDark } = useTheme()
  const { t } = useTranslation()

  // Plans & Selection
  const [plans, setPlans] = useState<RentalPlan[]>(DEFAULT_PLANS)
  const [selectedPlanId, setSelectedPlanId] = useState<string>('4HR_40KM')
  const [selectedVehicle, setSelectedVehicle] = useState<string>('SEDAN')

  // Location & Map State
  const [pickupAddress, setPickupAddress] = useState<string>(
    params.pickup || 'Senapati Bapat Road, Shivajinagar, Pune'
  )
  const [pickupLat, setPickupLat] = useState<number>(
    params.lat ? parseFloat(params.lat) : 18.5314
  )
  const [pickupLng, setPickupLng] = useState<number>(
    params.lon ? parseFloat(params.lon) : 73.8293
  )
  const [pickupNotes, setPickupNotes] = useState<string>('')
  const [locLoading, setLocLoading] = useState<boolean>(false)

  // Map Picker Modal State
  const [mapModalVisible, setMapModalVisible] = useState<boolean>(false)
  const mapRef = useRef<MapView>(null)
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 18.5314,
    longitude: 73.8293,
    latitudeDelta: 0.008,
    longitudeDelta: 0.008,
  })
  const [modalAddressText, setModalAddressText] = useState<string>(pickupAddress)
  const [modalLocLoading, setModalLocLoading] = useState<boolean>(false)
  const regionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Places Autocomplete Search State
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [predictions, setPredictions] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState<boolean>(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // State
  const [promoCode, setPromoCode] = useState<string>('RENTAL150')
  const [paymentMethod, setPaymentMethod] = useState<'WALLET' | 'UPI' | 'CASH'>('WALLET')
  const [estimating, setEstimating] = useState<boolean>(false)
  const [estimateData, setEstimateData] = useState<any>(null)
  const [bookingLoading, setBookingLoading] = useState<boolean>(false)

  // Active Rental state
  const [activeRental, setActiveRental] = useState<any>(null)

  useEffect(() => {
    loadPlans()
    checkActiveRental()
    detectInitialGPS()
  }, [])

  useEffect(() => {
    if (params.pickup) {
      setPickupAddress(params.pickup)
      setModalAddressText(params.pickup)
    }
    if (params.lat && params.lon) {
      const lat = parseFloat(params.lat)
      const lon = parseFloat(params.lon)
      setPickupLat(lat)
      setPickupLng(lon)
      setMapRegion({
        latitude: lat,
        longitude: lon,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      })
    }
  }, [params.pickup, params.lat, params.lon])

  useEffect(() => {
    fetchEstimate()
  }, [selectedPlanId, selectedVehicle, promoCode])

  const loadPlans = async () => {
    try {
      const res: any = await rentalApi.listPlans(selectedVehicle)
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        setPlans(res.data)
      }
    } catch {
      // Fallback
    }
  }

  const checkActiveRental = async () => {
    try {
      const res: any = await rentalApi.getActive()
      if (res?.data && res.data.booking_id) {
        setActiveRental(res.data)
      }
    } catch {
      // No active rental
    }
  }

  // 1-Tap GPS Detection
  const detectInitialGPS = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        const lat = loc.coords.latitude
        const lng = loc.coords.longitude
        setPickupLat(lat)
        setPickupLng(lng)
        setMapRegion({
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        })
        const addr = await reverseGeocodeCoordinate(lat, lng)
        if (addr) {
          setPickupAddress(addr)
          setModalAddressText(addr)
        }
      }
    } catch {
      // Keep default Pune coordinates
    }
  }

  const handleUseCurrentLocation = async () => {
    setLocLoading(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant location permissions to auto-detect pickup location.')
        return
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      const lat = loc.coords.latitude
      const lng = loc.coords.longitude
      setPickupLat(lat)
      setPickupLng(lng)
      setMapRegion({
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      })

      const addr = await reverseGeocodeCoordinate(lat, lng)
      if (addr) {
        setPickupAddress(addr)
        setModalAddressText(addr)
      }
    } catch (err: any) {
      Alert.alert('Location Error', 'Unable to fetch current GPS location. You can type address manually.')
    } finally {
      setLocLoading(false)
    }
  }

  // Places Autocomplete Search
  const handleSearchTextChange = (text: string) => {
    setPickupAddress(text)
    setSearchQuery(text)

    if (!text.trim()) {
      setPredictions([])
      return
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(async () => {
      if (!GOOGLE_API_KEY) {
        return
      }
      try {
        setIsSearching(true)
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
            text
          )}&key=${GOOGLE_API_KEY}&components=country:in`
        )
        const data = await res.json()
        if (data.status === 'OK' && Array.isArray(data.predictions)) {
          setPredictions(data.predictions)
        }
      } catch {
        // Ignore
      } finally {
        setIsSearching(false)
      }
    }, 350)
  }

  const handleSelectPrediction = async (placeId: string, description: string) => {
    Keyboard.dismiss()
    setPickupAddress(description)
    setModalAddressText(description)
    setPredictions([])
    setSearchQuery('')

    try {
      if (GOOGLE_API_KEY) {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_API_KEY}`
        )
        const data = await res.json()
        if (data.status === 'OK' && data.result?.geometry?.location) {
          const { lat, lng } = data.result.geometry.location
          setPickupLat(lat)
          setPickupLng(lng)
          setMapRegion({
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.008,
            longitudeDelta: 0.008,
          })
          if (data.result.formatted_address) {
            setPickupAddress(data.result.formatted_address)
            setModalAddressText(data.result.formatted_address)
          }
          return
        }
      }

      // Fallback
      const coords = await geocodeCity(description)
      if (coords) {
        setPickupLat(coords.lat)
        setPickupLng(coords.lon)
        setMapRegion({
          latitude: coords.lat,
          longitude: coords.lon,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        })
      }
    } catch {
      // Keep manual text
    }
  }

  // Interactive Map Pin Movement
  const onMapRegionChangeComplete = (newRegion: Region) => {
    setMapRegion(newRegion)
    if (regionTimeoutRef.current) clearTimeout(regionTimeoutRef.current)
    regionTimeoutRef.current = setTimeout(async () => {
      setModalLocLoading(true)
      try {
        const addr = await reverseGeocodeCoordinate(newRegion.latitude, newRegion.longitude)
        if (addr) {
          setModalAddressText(addr)
        }
      } catch {
        // Fallback
      } finally {
        setModalLocLoading(false)
      }
    }, 600)
  }

  const handleConfirmMapPin = () => {
    setPickupLat(mapRegion.latitude)
    setPickupLng(mapRegion.longitude)
    setPickupAddress(modalAddressText)
    setMapModalVisible(false)
  }

  const fetchEstimate = async () => {
    try {
      setEstimating(true)
      const res: any = await rentalApi.estimate({
        plan_id: selectedPlanId,
        vehicle_category: selectedVehicle,
        promo_code: promoCode || undefined,
      })
      if (res?.data) {
        setEstimateData(res.data)
      } else {
        const currentPlan = plans.find((p) => p.id === selectedPlanId) || plans[0]
        const veh = VEHICLE_CATEGORIES.find((v) => v.id === selectedVehicle) || VEHICLE_CATEGORIES[0]
        const base = Math.round(currentPlan.base_fare * veh.multiplier)
        const gst = Math.round(base * 0.05)
        const discount = promoCode ? 150 : 0
        setEstimateData({
          base_fare: base,
          included_hours: currentPlan.hours,
          included_km: currentPlan.distance_km,
          extra_km_rate: currentPlan.extra_km_rate,
          extra_hr_rate: currentPlan.extra_hr_rate,
          gst,
          discount_amount: discount,
          total_fare: Math.max(base + gst - discount, 0),
        })
      }
    } catch {
      const currentPlan = plans.find((p) => p.id === selectedPlanId) || plans[0]
      const veh = VEHICLE_CATEGORIES.find((v) => v.id === selectedVehicle) || VEHICLE_CATEGORIES[0]
      const base = Math.round(currentPlan.base_fare * veh.multiplier)
      const gst = Math.round(base * 0.05)
      setEstimateData({
        base_fare: base,
        included_hours: currentPlan.hours,
        included_km: currentPlan.distance_km,
        extra_km_rate: currentPlan.extra_km_rate,
        extra_hr_rate: currentPlan.extra_hr_rate,
        gst,
        discount_amount: 0,
        total_fare: base + gst,
      })
    } finally {
      setEstimating(false)
    }
  }

  const handleBookRental = async () => {
    if (!pickupAddress.trim()) {
      Alert.alert('Pickup Location Required', 'Please enter or select your pickup location on the map.')
      return
    }

    try {
      setBookingLoading(true)

      let finalLat = pickupLat
      let finalLng = pickupLng
      if (!finalLat || !finalLng) {
        const resolved = await geocodeCity(pickupAddress)
        if (resolved) {
          finalLat = resolved.lat
          finalLng = resolved.lon
        }
      }

      const res: any = await rentalApi.createBooking({
        plan_id: selectedPlanId,
        vehicle_category: selectedVehicle,
        pickup_address: pickupAddress,
        pickup_lat: finalLat || 18.5314,
        pickup_lng: finalLng || 73.8293,
        promo_code: promoCode || undefined,
        payment_method: paymentMethod,
      })

      const data = res?.data
      Alert.alert(
        '🎉 Rental Confirmed!',
        `Your ${selectedPlan.name} rental is booked with a dedicated driver & car. Driver details assigned.`,
        [
          {
            text: 'Track Live',
            onPress: () => {
              if (data?.booking_id) {
                router.push(`/track?bookingId=${data.booking_id}` as any)
              } else {
                router.push('/(tabs)/trips' as any)
              }
            },
          },
        ]
      )
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Unable to book rental right now. Please try again.'
      Alert.alert('Booking Error', msg)
    } finally {
      setBookingLoading(false)
    }
  }

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[2]
  const totalAmount = estimateData?.total_fare || selectedPlan.base_fare

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.colors.surface }]}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <AppText variant="h3" bold>
            Car Rental & Hourly Packages
          </AppText>
          <AppText variant="caption" color="secondary">
            Dedicated Chauffeur & Vehicle • Multiple Stops
          </AppText>
        </View>
        <View style={[styles.badgeIcon, { backgroundColor: `${theme.colors.primary}18` }]}>
          <Ionicons name="key" size={18} color={theme.colors.primary} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Active Rental Banner if ongoing */}
        {activeRental && (
          <AppCard style={[styles.activeCard, { borderColor: theme.colors.primary }]}>
            <View style={styles.activeHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.pulseDot, { backgroundColor: theme.colors.success }]} />
                <AppText variant="bodyS" bold color="brand">
                  ACTIVE RENTAL IN PROGRESS
                </AppText>
              </View>
              <AppBadge label="RUNNING" variant="success" size="sm" />
            </View>
            <AppText variant="body" bold style={{ marginTop: 4 }}>
              {activeRental.plan_name || '4 Hours / 40 km'} • Ref #{activeRental.reference || activeRental.booking_id?.slice(0, 8)}
            </AppText>
            <AppText variant="caption" color="muted" style={{ marginTop: 2 }}>
              Elapsed: {activeRental.elapsed_minutes || 45} mins • Traveled: {activeRental.current_km || 14.2} km
            </AppText>
            <TouchableOpacity
              style={[styles.trackLiveBtn, { backgroundColor: theme.colors.primary }]}
              onPress={() => router.push(`/track?bookingId=${activeRental.booking_id}` as any)}
            >
              <AppText variant="bodyS" bold color="white">
                View Live Meter & Add Stops →
              </AppText>
            </TouchableOpacity>
          </AppCard>
        )}

        {/* 1. Rental Packages Carousel */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <AppText variant="subtitle" bold>
              1. Choose Rental Duration Package
            </AppText>
            <AppText variant="caption" color="brand">
              Flexible Hourly
            </AppText>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.plansRow}>
            {plans.map((p) => {
              const isSelected = selectedPlanId === p.id
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.planCard,
                    {
                      backgroundColor: isSelected
                        ? isDark ? '#1E293B' : '#EFF6FF'
                        : theme.colors.surface,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  activeOpacity={0.85}
                  onPress={() => setSelectedPlanId(p.id)}
                >
                  {p.tag && (
                    <View
                      style={[
                        styles.planTag,
                        {
                          backgroundColor: isSelected ? theme.colors.primary : `${theme.colors.primary}20`,
                        },
                      ]}
                    >
                      <AppText
                        variant="caption"
                        bold
                        style={{ color: isSelected ? '#FFF' : theme.colors.primary, fontSize: 10 }}
                      >
                        {p.tag}
                      </AppText>
                    </View>
                  )}

                  <View style={[styles.planIconWrap, { backgroundColor: `${theme.colors.primary}15` }]}>
                    <Ionicons name={(p.icon as any) || 'time-outline'} size={20} color={theme.colors.primary} />
                  </View>

                  <AppText variant="body" bold style={{ marginTop: 8 }}>
                    {p.name}
                  </AppText>
                  <AppText variant="h3" bold color="brand" style={{ marginTop: 4 }}>
                    ₹{p.base_fare}
                  </AppText>
                  <AppText variant="caption" color="muted" style={{ marginTop: 4 }}>
                    +₹{p.extra_km_rate}/km • +₹{p.extra_hr_rate}/hr
                  </AppText>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>

        {/* 2. Vehicle Class Selector */}
        <AppCard style={styles.card}>
          <AppText variant="subtitle" bold style={{ marginBottom: 4 }}>
            2. Select Vehicle Class
          </AppText>
          <AppText variant="caption" color="secondary" style={{ marginBottom: 12 }}>
            Dedicated sanitized vehicle with trained chauffeur
          </AppText>

          {VEHICLE_CATEGORIES.map((veh) => {
            const isSelected = selectedVehicle === veh.id
            return (
              <TouchableOpacity
                key={veh.id}
                style={[
                  styles.vehRow,
                  {
                    backgroundColor: isSelected
                      ? isDark ? '#1E293B' : '#EFF6FF'
                      : theme.colors.surface,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => setSelectedVehicle(veh.id)}
              >
                <View style={[styles.vehIconBox, { backgroundColor: isSelected ? theme.colors.primary : '#E2E8F0' }]}>
                  <MaterialCommunityIcons
                    name={veh.icon as any}
                    size={22}
                    color={isSelected ? '#FFF' : '#334155'}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <AppText variant="body" bold>
                      {veh.name}
                    </AppText>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />}
                  </View>
                  <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                    {veh.desc}
                  </AppText>
                </View>
              </TouchableOpacity>
            )
          })}
        </AppCard>

        {/* 3. Pickup Point with Full Map API & Manual Input */}
        <AppCard style={styles.card}>
          <View style={styles.pickupHeaderRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="subtitle" bold>
                3. Pickup Point
              </AppText>
              <AppText variant="caption" color="secondary">
                Type address manually or pick on live map
              </AppText>
            </View>
            <TouchableOpacity
              style={[styles.pickOnMapBtn, { backgroundColor: `${theme.colors.primary}18`, borderColor: theme.colors.primary }]}
              onPress={() => {
                setMapRegion({
                  latitude: pickupLat || 18.5314,
                  longitude: pickupLng || 73.8293,
                  latitudeDelta: 0.008,
                  longitudeDelta: 0.008,
                })
                setModalAddressText(pickupAddress)
                setMapModalVisible(true)
              }}
            >
              <Ionicons name="map" size={15} color={theme.colors.primary} />
              <AppText variant="caption" bold style={{ color: theme.colors.primary, marginLeft: 4 }}>
                Pick on Map 🗺️
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Quick GPS Action Button */}
          <TouchableOpacity
            style={[styles.currentLocBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={handleUseCurrentLocation}
            activeOpacity={0.8}
          >
            {locLoading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <MaterialCommunityIcons name="crosshairs-gps" size={18} color={theme.colors.primary} />
            )}
            <AppText variant="bodyS" semibold style={{ color: theme.colors.primary, marginLeft: 8, flex: 1 }}>
              {locLoading ? 'Acquiring GPS Pinpoint...' : 'Use Current Device Location'}
            </AppText>
            <Feather name="chevron-right" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>

          {/* Manual Input with Autocomplete */}
          <View style={[styles.inputWrap, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: theme.colors.border }]}>
            <Ionicons name="location" size={20} color={theme.colors.primary} />
            <TextInput
              style={[styles.textInput, { color: theme.colors.textPrimary }]}
              value={pickupAddress}
              onChangeText={handleSearchTextChange}
              placeholder="Enter pickup address, building, or area"
              placeholderTextColor={theme.colors.textMuted}
            />
            {isSearching && <ActivityIndicator size="small" color={theme.colors.primary} />}
            {pickupAddress.length > 0 && (
              <TouchableOpacity onPress={() => { setPickupAddress(''); setPredictions([]) }}>
                <Feather name="x-circle" size={16} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Autocomplete Predictions Dropdown */}
          {predictions.length > 0 && (
            <View style={[styles.predictionsList, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              {predictions.map((item) => (
                <TouchableOpacity
                  key={item.place_id}
                  style={[styles.predictionRow, { borderBottomColor: theme.colors.border }]}
                  onPress={() => handleSelectPrediction(item.place_id, item.description)}
                >
                  <Feather name="map-pin" size={15} color={theme.colors.primary} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <AppText variant="bodyS" bold numberOfLines={1}>
                      {item.structured_formatting?.main_text || item.description}
                    </AppText>
                    {item.structured_formatting?.secondary_text && (
                      <AppText variant="caption" color="muted" numberOfLines={1}>
                        {item.structured_formatting.secondary_text}
                      </AppText>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Location Pin Indicator Card */}
          <TouchableOpacity
            style={[styles.mapPinCard, { backgroundColor: `${theme.colors.primary}0D`, borderColor: `${theme.colors.primary}30` }]}
            onPress={() => {
              setMapRegion({
                latitude: pickupLat || 18.5314,
                longitude: pickupLng || 73.8293,
                latitudeDelta: 0.008,
                longitudeDelta: 0.008,
              })
              setModalAddressText(pickupAddress)
              setMapModalVisible(true)
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.mapPinIconBox, { backgroundColor: `${theme.colors.primary}20` }]}>
              <Ionicons name="location" size={20} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <AppText variant="caption" color="secondary">
                CONFIRMED GPS COORDINATES
              </AppText>
              <AppText variant="bodyS" bold color="brand">
                {pickupLat.toFixed(4)}, {pickupLng.toFixed(4)}
              </AppText>
            </View>
            <View style={[styles.adjustBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Feather name="map" size={13} color={theme.colors.primary} />
              <AppText variant="caption" bold style={{ color: theme.colors.primary, marginLeft: 4 }}>
                Adjust Pin
              </AppText>
            </View>
          </TouchableOpacity>

          {/* Special Instructions */}
          <TextInput
            style={[styles.notesInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
            value={pickupNotes}
            onChangeText={setPickupNotes}
            placeholder="Flat/Door number, landmark, or gate instructions (optional)"
            placeholderTextColor={theme.colors.textMuted}
          />
        </AppCard>

        {/* 4. Pricing & Inclusions Breakdown */}
        <AppCard style={styles.card}>
          <AppText variant="subtitle" bold style={{ marginBottom: 10 }}>
            Package Inclusions & Breakdown
          </AppText>
          <View style={styles.breakdownRow}>
            <AppText variant="bodyS" color="secondary">Base Rental Rate ({selectedPlan.hours} hrs, {selectedPlan.distance_km} km)</AppText>
            <AppText variant="bodyS" bold>₹{estimateData?.base_fare || selectedPlan.base_fare}</AppText>
          </View>
          <View style={styles.breakdownRow}>
            <AppText variant="bodyS" color="secondary">GST & Govt Taxes (5%)</AppText>
            <AppText variant="bodyS" bold>₹{estimateData?.gst || Math.round(selectedPlan.base_fare * 0.05)}</AppText>
          </View>
          {estimateData?.discount_amount > 0 && (
            <View style={styles.breakdownRow}>
              <AppText variant="bodyS" color="success">Promo Discount ({promoCode})</AppText>
              <AppText variant="bodyS" bold color="success">- ₹{estimateData.discount_amount}</AppText>
            </View>
          )}

          <AppDivider marginVertical={8} />

          <View style={styles.breakdownRow}>
            <AppText variant="subtitle" bold>Total Estimated Fare</AppText>
            <AppText variant="h3" bold color="brand">
              {estimating ? '...' : `₹${totalAmount}`}
            </AppText>
          </View>
          <AppText variant="caption" color="muted" style={{ marginTop: 4 }}>
            * Extra km @ ₹{selectedPlan.extra_km_rate}/km, Extra hr @ ₹{selectedPlan.extra_hr_rate}/hr will be settled at ride completion. Tolls & parking extra as applicable.
          </AppText>
        </AppCard>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={[styles.bottomBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
        <View>
          <AppText variant="caption" color="secondary">
            TOTAL RENTAL FARE
          </AppText>
          <AppText variant="h2" bold color="brand">
            ₹{totalAmount}
          </AppText>
        </View>
        <AppButton
          variant="primary"
          size="lg"
          loading={bookingLoading}
          onPress={handleBookRental}
          style={{ minWidth: 200 }}
        >
          Book Rental Chauffeur 🚗
        </AppButton>
      </View>

      {/* Full Screen Interactive Map Picker Modal */}
      {mapModalVisible && (
        <Modal visible={mapModalVisible} animationType="slide">
          <View style={{ flex: 1, backgroundColor: '#E5E5E5' }}>
            <StatusBar barStyle="dark-content" />

            {/* Map View */}
            <MapView
              ref={mapRef}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
              style={StyleSheet.absoluteFill}
              region={mapRegion}
              onRegionChangeComplete={onMapRegionChangeComplete}
              showsUserLocation
              showsMyLocationButton={false}
              zoomEnabled
              scrollEnabled
            />

            {/* Center Pin Indicator */}
            <View style={styles.mapCenterPin} pointerEvents="none">
              <View style={styles.pinBubble}>
                <AppText variant="small" bold color="white">
                  📍 Drag map to pinpoint
                </AppText>
              </View>
              <Ionicons name="location" size={46} color="#2563EB" />
              <View style={styles.pinShadow} />
            </View>

            {/* Top Modal Header */}
            <SafeAreaView style={styles.mapModalHeader} edges={['top']}>
              <TouchableOpacity
                style={[styles.modalBackBtn, { backgroundColor: theme.colors.surface }]}
                onPress={() => setMapModalVisible(false)}
              >
                <Feather name="arrow-left" size={22} color={theme.colors.textPrimary} />
              </TouchableOpacity>

              <View style={[styles.modalTitleBox, { backgroundColor: theme.colors.surface }]}>
                <AppText variant="bodyS" bold numberOfLines={1}>
                  Pinpoint Pickup Location
                </AppText>
              </View>

              <TouchableOpacity
                style={[styles.modalGpsBtn, { backgroundColor: theme.colors.surface }]}
                onPress={async () => {
                  try {
                    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
                    const newR: Region = {
                      latitude: loc.coords.latitude,
                      longitude: loc.coords.longitude,
                      latitudeDelta: 0.008,
                      longitudeDelta: 0.008,
                    }
                    setMapRegion(newR)
                    mapRef.current?.animateToRegion(newR, 500)
                  } catch {}
                }}
              >
                <MaterialCommunityIcons name="crosshairs-gps" size={22} color={theme.colors.primary} />
              </TouchableOpacity>
            </SafeAreaView>

            {/* Bottom Confirmation Card */}
            <View style={[styles.modalFooterCard, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.modalAddressRow}>
                <View style={[styles.addressBoxIcon, { backgroundColor: `${theme.colors.primary}18` }]}>
                  <Ionicons name="location" size={22} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <AppText variant="caption" color="muted">CONFIRMED PICKUP POINT</AppText>
                  {modalLocLoading ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                      <AppText variant="caption" color="muted">Updating address...</AppText>
                    </View>
                  ) : (
                    <AppText variant="body" bold numberOfLines={2} style={{ marginTop: 2 }}>
                      {modalAddressText || 'Move map to select pickup location'}
                    </AppText>
                  )}
                  <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                    Lat: {mapRegion.latitude.toFixed(4)}, Lng: {mapRegion.longitude.toFixed(4)}
                  </AppText>
                </View>
              </View>

              <AppButton
                variant="primary"
                size="lg"
                onPress={handleConfirmMapPin}
                style={{ marginTop: 14 }}
              >
                Confirm This Pickup Pinpoint 📍
              </AppButton>
            </View>
          </View>
        </Modal>
      )}
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
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { padding: 16, paddingBottom: 110 },
  section: { marginBottom: 16 },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  plansRow: { gap: 10, paddingRight: 10 },
  planCard: {
    width: 170,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
  },
  planTag: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  planIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { padding: 16, marginBottom: 14, borderRadius: 14 },
  vehRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  vehIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pickOnMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  currentLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  textInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  predictionsList: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    maxHeight: 180,
    overflow: 'hidden',
  },
  predictionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  mapPinCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  mapPinIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
    fontSize: 13,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  activeCard: {
    padding: 14,
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: '#EFF6FF',
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pulseDot: { width: 8, height: 8, borderRadius: 4 },
  trackLiveBtn: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
  mapCenterPin: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 44,
  },
  pinBubble: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 4,
  },
  pinShadow: {
    width: 12,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 2,
    marginTop: -4,
  },
  mapModalHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    zIndex: 10,
    gap: 10,
  },
  modalBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  modalTitleBox: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    paddingHorizontal: 14,
    justifyContent: 'center',
    elevation: 4,
  },
  modalGpsBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  modalFooterCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    elevation: 12,
  },
  modalAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressBoxIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
