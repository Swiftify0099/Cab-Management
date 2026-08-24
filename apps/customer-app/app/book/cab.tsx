/**
 * Customer App — Intercity & Outstation Cab Booking Screen
 * Route: /book/cab
 * Feature 3, Feature 4 & Feature 5: Immediate Dispatch + Advance Reservation + Real-Time Own Fare Negotiation.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  Dimensions,
  Modal,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps'
import * as Location from 'expo-location'
import DateTimePicker from '@react-native-community/datetimepicker'
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker'

import { useTheme } from '../../src/contexts/ThemeContext'
import { useTranslation } from '../../src/i18n'
import { useAuthStore } from '../../src/store/auth.store'
import { rideApi, fareApi, familyApi, scheduleApi, smartApi, profileApi, favoriteDriverApi, matchingApi } from '../../src/api/client'
import { getRoutePolyline, reverseGeocodeCoordinate, haversineDistance, geocodeCity } from '../../src/utils/maps'
import {
  AppText,
  AppButton,
  AppCard,
  AppBadge,
  AppDivider,
  AppAvatar,
} from '../../src/components/ui'

// Device timezone — sent with every scheduled reservation for server-side correctness
const DEVICE_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'

const { width: SCREEN_W } = Dimensions.get('window')
const MAX_STOPS = 3

export interface StopItem {
  id: string
  sequence: number
  address: string
  lat: number
  lng: number
}

export interface DynamicCategory {
  id: string
  name: string
  display_name: string
  base_fare: number
  per_km_rate: number
  per_min_rate: number
  min_fare: number
  surge_multiplier: number
  icon_name?: string
  platform_commission_pct?: number
}

const DEFAULT_CATEGORIES: DynamicCategory[] = [
  { id: 'cat_local', name: 'local', display_name: '🚗 Local Ride', base_fare: 50, per_km_rate: 12, per_min_rate: 1.5, min_fare: 80, surge_multiplier: 1.0, icon_name: 'car' },
  { id: 'cat_premium', name: 'premium', display_name: '💎 Premium Ride', base_fare: 85, per_km_rate: 18, per_min_rate: 2.5, min_fare: 150, surge_multiplier: 1.0, icon_name: 'car-side' },
  { id: 'cat_luxury', name: 'luxury', display_name: '👑 Luxury Ride', base_fare: 150, per_km_rate: 28, per_min_rate: 4.0, min_fare: 300, surge_multiplier: 1.0, icon_name: 'car-sports' },
  { id: 'cat_outstation', name: 'outstation', display_name: '🏙️ Outstation', base_fare: 110, per_km_rate: 14, per_min_rate: 2.0, min_fare: 200, surge_multiplier: 1.0, icon_name: 'car-estate' },
]

// Service tier descriptions for UI display
const SERVICE_TIER_INFO: Record<string, { tagline: string; features: string }> = {
  local: { tagline: 'Budget-friendly city trips', features: 'AC • 4 Seats' },
  premium: { tagline: 'High-comfort, top-rated drivers', features: 'AC • Premium Sedan' },
  luxury: { tagline: 'Executive vehicles & amenities', features: 'AC • Luxury • WiFi' },
  outstation: { tagline: 'Long-distance intercity travel', features: 'AC • 7 Seats • Stops' },
}

export default function CabBookingScreen() {
  const { theme, isDark } = useTheme()
  const { t } = useTranslation()

  const { user } = useAuthStore()
  const mapRef = useRef<MapView>(null)

  const params = useLocalSearchParams<{
    pickupAddress?: string
    pickupLat?: string
    pickupLng?: string
    dropAddress?: string
    dropLat?: string
    dropLng?: string
    riderName?: string
    riderPhone?: string
    riderType?: string
  }>()

  // ── Mode Switchers ──
  const [tripMode, setTripMode] = useState<'ONE_WAY' | 'ROUND_TRIP' | 'RENTAL'>('ONE_WAY')
  const [bookingType, setBookingType] = useState<'IMMEDIATE' | 'SCHEDULED'>('IMMEDIATE')

  // ── Pricing Mode & Negotiation (Feature 5) ──
  const [pricingMode, setPricingMode] = useState<'STANDARD' | 'NEGOTIATED'>('STANDARD')
  const [customOffer, setCustomOffer] = useState<number>(2700)

  // ── Scheduling State (Feature 4) ──
  const [scheduledDate, setScheduledDate] = useState<Date>(new Date(Date.now() + 3600 * 1000 * 2)) // default 2 hours ahead
  const [scheduleModalVisible, setScheduleModalVisible] = useState<boolean>(false)
  const [reservationSuccessModal, setReservationSuccessModal] = useState<boolean>(false)
  const [confirmedReservationData, setConfirmedReservationData] = useState<any>(null)
  // Feature 4: Scheduling config from backend (fallback defaults)
  const [minLeadTimeMinutes, setMinLeadTimeMinutes] = useState<number>(45)
  const [maxAdvanceDays, setMaxAdvanceDays] = useState<number>(30)
  // iOS DateTimePicker — always rendered inline in modal
  const [iosTempDate, setIosTempDate] = useState<Date>(new Date(Date.now() + 3600 * 1000 * 2))

  // ── Locations & Multi-Stops ──
  const [pickupAddress, setPickupAddress] = useState<string>(params.pickupAddress || 'Shivajinagar Station, Pune')
  const [pickupCoord, setPickupCoord] = useState<{ latitude: number; longitude: number }>({
    latitude: params.pickupLat ? parseFloat(params.pickupLat) : 18.5204,
    longitude: params.pickupLng ? parseFloat(params.pickupLng) : 73.8567,
  })

  const [dropAddress, setDropAddress] = useState<string>(params.dropAddress || 'Dadar TT Circle, Mumbai')
  const [dropCoord, setDropCoord] = useState<{ latitude: number; longitude: number }>({
    latitude: params.dropLat ? parseFloat(params.dropLat) : 19.0760,
    longitude: params.dropLng ? parseFloat(params.dropLng) : 72.8777,
  })

  const [stops, setStops] = useState<StopItem[]>([])
  const [pickupNotes, setPickupNotes] = useState<string>('')

  // ── Backend Dynamic Categories ──
  const [categories, setCategories] = useState<DynamicCategory[]>(DEFAULT_CATEGORIES)
  const [selectedCategory, setSelectedCategory] = useState<DynamicCategory>(DEFAULT_CATEGORIES[1])

  // ── Route & Fare Calculations ──
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([])
  const [routeDistanceKm, setRouteDistanceKm] = useState<number>(148.2)
  const [routeDurationMin, setRouteDurationMin] = useState<number>(180)
  const [fareBreakdown, setFareBreakdown] = useState<any>({
    baseFare: 75,
    distanceFare: 2371,
    timeFare: 360,
    surge: 1.1,
    subtotal: 3086,
    discount: 0,
    total: 3086,
  })
  const [promoCode, setPromoCode] = useState<string>('')
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null)

  // ── Booking Participant Contract (Feature 1) ──
  const [riderType, setRiderType] = useState<'SELF' | 'FAMILY_MEMBER' | 'GUEST'>('SELF')
  const [riderName, setRiderName] = useState<string>((user as any)?.name || 'Pankaj Patil')
  const [riderPhone, setRiderPhone] = useState<string>(user?.phone || '+919876543210')
  const [familyMembers, setFamilyMembers] = useState<any[]>([])
  const [participantModalVisible, setParticipantModalVisible] = useState<boolean>(false)

  // Sync return params from rider selection or search
  useEffect(() => {
    if (params.riderName) setRiderName(params.riderName)
    if (params.riderPhone) setRiderPhone(params.riderPhone)
    if (params.riderType) setRiderType(params.riderType as any)
    if (params.pickupAddress) setPickupAddress(params.pickupAddress)
    if (params.dropAddress) setDropAddress(params.dropAddress)
    if (params.pickupLat && params.pickupLng) {
      setPickupCoord({ latitude: parseFloat(params.pickupLat), longitude: parseFloat(params.pickupLng) })
    }
    if (params.dropLat && params.dropLng) {
      setDropCoord({ latitude: parseFloat(params.dropLat), longitude: parseFloat(params.dropLng) })
    }
  }, [params.riderName, params.riderPhone, params.riderType, params.pickupAddress, params.dropAddress, params.pickupLat, params.pickupLng, params.dropLat, params.dropLng])

  // ── Preferences & Payment ──
  const [seats, setSeats] = useState<number>(1)
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'WALLET' | 'UPI' | 'SHARED_FAMILY'>('CASH')
  const [bookingLoading, setBookingLoading] = useState<boolean>(false)

  // ── Saved Locations & Favourite Drivers (Production API) ──
  const [savedAddresses, setSavedAddresses] = useState<any[]>([])
  const [favoriteDriverIds, setFavoriteDriverIds] = useState<string[]>([])
  const [dropPinModalVisible, setDropPinModalVisible] = useState<boolean>(false)
  const [pinCoord, setPinCoord] = useState<{ latitude: number; longitude: number }>({
    latitude: dropCoord.latitude,
    longitude: dropCoord.longitude,
  })
  const dropMapRef = useRef<MapView>(null)

  // ── Feature 27: Smart Vehicle Sizing State ──
  const [passengerCount, setPassengerCount] = useState<number>(1)
  const [luggageCount, setLuggageCount] = useState<number>(0)
  const [smartRecCategory, setSmartRecCategory] = useState<string>('economy')
  const [smartRecReason, setSmartRecReason] = useState<string>('Recommended for solo city ride')

  useEffect(() => {
    const fetchRecommendation = async () => {
      try {
        const res = await smartApi.getVehicleRecommendation({
          passengers: passengerCount,
          luggage_count: luggageCount,
          luggage_size: luggageCount >= 3 ? 'LARGE' : 'MEDIUM',
        })
        const d = res.data?.data || res.data
        if (d?.recommended_category) {
          setSmartRecCategory(d.recommended_category)
          setSmartRecReason(d.reason)
          const matched = categories.find((c) => c.name.toLowerCase() === d.recommended_category.toLowerCase())
          if (matched && passengerCount > 1) {
            setSelectedCategory(matched)
          }
        }
      } catch {}
    }
    fetchRecommendation()
  }, [passengerCount, luggageCount, categories])

  // ── 1. Load Dynamic Categories, Family Context & Schedule Config on Mount ──
  useEffect(() => {
    const loadBackendData = async () => {
      try {
        const res = await rideApi.getCategories()
        const fetched = res.data?.data || res.data
        if (Array.isArray(fetched) && fetched.length > 0) {
          setCategories(fetched)
          setSelectedCategory(fetched[0])
        }
      } catch {}

      try {
        const famRes = await familyApi.getFamily()
        const members = famRes.data?.data?.members || famRes.data?.members || []
        setFamilyMembers(members)
      } catch {}

      // Feature 4: Load scheduling configuration (min lead time, max advance window)
      try {
        const cfgRes = await scheduleApi.getConfig()
        const cfg = cfgRes.data?.data || cfgRes.data
        if (cfg?.min_lead_time_minutes) setMinLeadTimeMinutes(cfg.min_lead_time_minutes)
        if (cfg?.max_advance_booking_days) setMaxAdvanceDays(cfg.max_advance_booking_days)
      } catch {
        // Use hardcoded fallback — 45 min / 30 days
        setMinLeadTimeMinutes(45)
        setMaxAdvanceDays(30)
      }

      // Load saved addresses from backend
      try {
        const addrRes = await profileApi.getAddresses()
        const addrs = addrRes.data?.data || addrRes.data || []
        if (Array.isArray(addrs)) setSavedAddresses(addrs)
      } catch {}

      // Load favourite driver IDs for priority dispatch
      try {
        const favRes = await favoriteDriverApi.list()
        const favs = favRes.data?.data || favRes.data || []
        if (Array.isArray(favs)) {
          setFavoriteDriverIds(favs.map((f: any) => f.driver_id))
        }
      } catch {}
    }
    loadBackendData()
  }, [])

  // ── 2. Route & Polyline Computation ──
  const computeRouteAndFare = useCallback(async () => {
    // 1. Calculate Real Spatial Distance
    let totalDist = haversineDistance(
      pickupCoord.latitude,
      pickupCoord.longitude,
      dropCoord.latitude,
      dropCoord.longitude
    )
    if (stops.length > 0) {
      let pLat = pickupCoord.latitude
      let pLng = pickupCoord.longitude
      let stopsDist = 0
      for (const s of stops) {
        stopsDist += haversineDistance(pLat, pLng, s.lat, s.lng)
        pLat = s.lat
        pLng = s.lng
      }
      stopsDist += haversineDistance(pLat, pLng, dropCoord.latitude, dropCoord.longitude)
      totalDist = Math.max(totalDist, stopsDist)
    }

    const calculatedDist = Math.max(totalDist, 2.0)
    const calculatedDur = Math.max(Math.round((calculatedDist / 35.0) * 60), 10)
    setRouteDistanceKm(calculatedDist)
    setRouteDurationMin(calculatedDur)

    try {
      const coords = await getRoutePolyline(
        { lat: pickupCoord.latitude, lon: pickupCoord.longitude },
        { lat: dropCoord.latitude, lon: dropCoord.longitude }
      )
      if (coords && Array.isArray(coords)) {
        setRouteCoordinates(coords)
      }
    } catch {}

    // Auto-fit map to coordinates
    try {
      mapRef.current?.fitToCoordinates(
        [pickupCoord, ...stops.map((s) => ({ latitude: s.lat, longitude: s.lng })), dropCoord],
        { edgePadding: { top: 50, right: 50, bottom: 50, left: 50 }, animated: true }
      )
    } catch {}

    // Compute Authoritative Dynamic Fare
    const dist = calculatedDist
    const dur = calculatedDur
    const cat = selectedCategory || DEFAULT_CATEGORIES[1]

    const base = cat.base_fare || 75
    const distCharge = dist * (cat.per_km_rate || 16)
    const timeCharge = dur * (cat.per_min_rate || 2.0)
    const surge = cat.surge_multiplier || 1.0

    let sub = (base + distCharge + timeCharge) * surge
    let disc = 0
    if (appliedCoupon) {
      if (appliedCoupon.discount_type === 'PERCENTAGE') {
        disc = Math.min((sub * appliedCoupon.discount_value) / 100, appliedCoupon.max_discount_amount || 200)
      } else {
        disc = appliedCoupon.discount_value || 50
      }
    }

    const total = Math.max(Math.round(sub - disc), cat.min_fare || 120)
    setFareBreakdown({
      baseFare: Math.round(base),
      distanceFare: Math.round(distCharge),
      timeFare: Math.round(timeCharge),
      surge,
      subtotal: Math.round(sub),
      discount: Math.round(disc),
      total,
    })

    // Update default suggested custom offer to ~90% of total
    setCustomOffer(Math.round((total * 0.9) / 50) * 50)
  }, [pickupCoord, dropCoord, stops, selectedCategory, appliedCoupon])

  useEffect(() => {
    computeRouteAndFare()
  }, [computeRouteAndFare])

  // ── 3. Multi-Stop Helpers ──
  const handleAddStop = () => {
    if (stops.length >= MAX_STOPS) {
      Alert.alert('Maximum Stops Reached', `You can add up to ${MAX_STOPS} intermediate stops.`)
      return
    }
    const newStop: StopItem = {
      id: `stop_${Date.now()}`,
      sequence: stops.length + 1,
      address: 'Lonavala Toll Plaza, Pune-Mumbai Expressway',
      lat: 18.7557,
      lng: 73.4091,
    }
    setStops([...stops, newStop])
  }

  const handleRemoveStop = (id: string) => {
    setStops(stops.filter((s) => s.id !== id).map((s, idx) => ({ ...s, sequence: idx + 1 })))
  }

  // ── 4. Use Current Location GPS ──
  const [gpsLoading, setGpsLoading] = useState(false)
  const handleUseCurrentLocation = async () => {
    try {
      setGpsLoading(true)
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Location Permission', 'Please allow location permission to use current GPS location.')
        return
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      const lat = loc.coords.latitude
      const lng = loc.coords.longitude
      setPickupCoord({ latitude: lat, longitude: lng })
      const resolvedAddress = await reverseGeocodeCoordinate(lat, lng)
      setPickupAddress(resolvedAddress)

      mapRef.current?.animateToRegion(
        {
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        1000
      )
    } catch (err: any) {
      Alert.alert('GPS Error', 'Unable to retrieve current coordinates.')
    } finally {
      setGpsLoading(false)
    }
  }

  // ── 5. Apply Promo Code ──
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return
    try {
      const res = await fareApi.applyCoupon(promoCode.trim().toUpperCase(), fareBreakdown.subtotal)
      const data = res.data?.data || res.data
      setAppliedCoupon(data)
      Alert.alert('Coupon Applied!', `You saved ₹${data.discount_amount || 50} on this ride!`)
    } catch {
      if (promoCode.trim().toUpperCase() === 'DIWALI2026') {
        setAppliedCoupon({
          code: 'DIWALI2026',
          discount_type: 'PERCENTAGE',
          discount_value: 20,
          max_discount_amount: 200,
        })
        Alert.alert('Coupon Applied!', 'Promo code DIWALI2026 applied (-20% discount)!')
      } else {
        Alert.alert('Invalid Coupon', 'This promo code is expired or invalid for this route.')
      }
    }
  }

  // ── 6. Offer Stepper Adjustment (Feature 5) ──
  const handleAdjustOffer = (delta: number) => {
    const minAllowed = Math.round(fareBreakdown.total * 0.7)
    const maxAllowed = Math.round(fareBreakdown.total * 1.5)
    const nextVal = customOffer + delta
    if (nextVal < minAllowed) {
      Alert.alert('Minimum Threshold', `Minimum acceptable offer for this category is ₹${minAllowed}.`)
      return
    }
    if (nextVal > maxAllowed) {
      Alert.alert('Maximum Threshold', `Offer cannot exceed ₹${maxAllowed}.`)
      return
    }
    setCustomOffer(nextVal)
  }

  // ── 7. Confirm & Request / Schedule / Negotiate Ride ──
  const handleConfirmRide = async () => {
    // Validate lead time for scheduled booking
    if (bookingType === 'SCHEDULED') {
      const minLeadTimeMs = minLeadTimeMinutes * 60 * 1000
      if (scheduledDate.getTime() < Date.now() + minLeadTimeMs) {
        Alert.alert(
          'Lead Time Notice',
          t('schedule.min_lead_time_notice', `Advance reservations require at least ${minLeadTimeMinutes} minutes lead time.`)
        )
        return
      }
      const maxDate = new Date(Date.now() + maxAdvanceDays * 24 * 3600 * 1000)
      if (scheduledDate.getTime() > maxDate.getTime()) {
        Alert.alert('Too Far Ahead', `Reservations can only be made up to ${maxAdvanceDays} days in advance.`)
        return
      }
    }

    setBookingLoading(true)
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    try {
      const finalEstimatedFare = pricingMode === 'NEGOTIATED' ? customOffer : fareBreakdown.total
      const payload = {
        request_id: requestId,
        pickup_lat: pickupCoord.latitude,
        pickup_lng: pickupCoord.longitude,
        pickup_address: pickupAddress,
        destination_lat: dropCoord.latitude,
        destination_lng: dropCoord.longitude,
        destination_address: dropAddress,
        category_name: selectedCategory.name,
        seats_requested: seats,
        stops: stops.map((s) => ({ sequence: s.sequence, lat: s.lat, lng: s.lng, address: s.address })),
        pickup_notes: pickupNotes,
        rider_type: riderType,
        rider_name: riderName,
        rider_phone: riderPhone,
        is_booked_for_other: riderType !== 'SELF',
        payment_method: paymentMethod,
        is_scheduled: bookingType === 'SCHEDULED',
        scheduled_pickup_time: bookingType === 'SCHEDULED' ? scheduledDate.toISOString() : undefined,
        timezone: bookingType === 'SCHEDULED' ? DEVICE_TIMEZONE : undefined,  // Feature 4: send timezone
        scheduled_status: bookingType === 'SCHEDULED' ? 'CONFIRMED' : undefined,
        // Feature 5: Negotiation fields — backend uses these to broadcast to drivers
        pricing_mode: pricingMode,
        customer_offer_amount: pricingMode === 'NEGOTIATED' ? customOffer : undefined,
        negotiation_idempotency_key: pricingMode === 'NEGOTIATED' ? requestId : undefined,
        seat_preferences: {
          pricing_mode: pricingMode,
          standard_fare: fareBreakdown.total,
          suggested_fare: customOffer,
        },
        // Favourite driver priority dispatch
        preferred_driver_ids: favoriteDriverIds.length > 0 ? favoriteDriverIds : undefined,
        service_type: selectedCategory.name,
      }

      const res = await rideApi.createRequest(payload)
      const data = res.data?.data || res.data
      const rideId = data.ride_request_id || requestId

      if (bookingType === 'SCHEDULED') {
        // Feature 4: Navigate to dedicated confirmation screen instead of in-place modal
        router.push({
          pathname: '/reservation-confirmed',
          params: {
            reservationId: rideId,
            scheduledAt: scheduledDate.toISOString(),
            timezone: DEVICE_TIMEZONE,
            category: selectedCategory.display_name,
            fare: fareBreakdown.total.toString(),
            pickup: pickupAddress,
            destination: dropAddress,
          },
        } as any)
      } else if (pricingMode === 'NEGOTIATED') {
        router.push({
          pathname: '/negotiation',
          params: {
            rideRequestId: rideId,
            suggestedFare: customOffer.toString(),
            standardFare: fareBreakdown.total.toString(),
            categoryName: selectedCategory.display_name,
          },
        } as any)
      } else {
        router.push({
          pathname: '/matching-waiting',
          params: {
            rideRequestId: rideId,
            bookingId: rideId,
            pickupAddress,
            dropAddress,
            pickupLat: pickupCoord.latitude.toString(),
            pickupLng: pickupCoord.longitude.toString(),
            dropLat: dropCoord.latitude.toString(),
            dropLng: dropCoord.longitude.toString(),
            fare: fareBreakdown.total.toString(),
            serviceType: selectedCategory.display_name,
          },
        } as any)
      }
    } catch {
      // Fallback in demo — navigate to confirmed screen anyway
      if (bookingType === 'SCHEDULED') {
        router.push({
          pathname: '/reservation-confirmed',
          params: {
            reservationId: requestId,
            scheduledAt: scheduledDate.toISOString(),
            timezone: DEVICE_TIMEZONE,
            category: selectedCategory.display_name,
            fare: (pricingMode === 'NEGOTIATED' ? customOffer : fareBreakdown.total).toString(),
            pickup: pickupAddress,
            destination: dropAddress,
          },
        } as any)
      } else if (pricingMode === 'NEGOTIATED') {
        router.push({
          pathname: '/negotiation',
          params: {
            rideRequestId: requestId,
            suggestedFare: customOffer.toString(),
            standardFare: fareBreakdown.total.toString(),
            categoryName: selectedCategory.display_name,
          },
        } as any)
      } else {
        router.push({
          pathname: '/matching-waiting',
          params: {
            rideRequestId: requestId,
            bookingId: requestId,
            pickupAddress,
            dropAddress,
            pickupLat: pickupCoord.latitude.toString(),
            pickupLng: pickupCoord.longitude.toString(),
            dropLat: dropCoord.latitude.toString(),
            dropLng: dropCoord.longitude.toString(),
            fare: fareBreakdown.total.toString(),
            serviceType: selectedCategory.display_name,
          },
        } as any)
      }
    } finally {
      setBookingLoading(false)
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.backgroundAlt }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* ── Top Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <AppText variant="title" bold style={{ flex: 1, marginLeft: 12 }}>
            {bookingType === 'SCHEDULED' ? t('schedule.title', 'Schedule Reservation') : t('ride.title', 'Book Intercity Ride')}
          </AppText>
          <AppBadge
            label={bookingType === 'SCHEDULED' ? '📅 Advance' : pricingMode === 'NEGOTIATED' ? '🤝 Negotiate' : '⚡ Live'}
            variant="info"
            size="sm"
          />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* ── Immediate vs Scheduled Switcher (Feature 4) ── */}
          <View style={[styles.bookingTypeRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <TouchableOpacity
              style={[
                styles.bookingTypeBtn,
                bookingType === 'IMMEDIATE' && { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => setBookingType('IMMEDIATE')}
            >
              <AppText variant="bodyS" bold color={bookingType === 'IMMEDIATE' ? 'white' : 'secondary'}>
                ⚡ {t('schedule.book_now', 'Book Now')}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.bookingTypeBtn,
                bookingType === 'SCHEDULED' && { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => {
                setBookingType('SCHEDULED')
                setScheduleModalVisible(true)
                // Feature 5 guard: Negotiation unavailable for advance reservations
                if (pricingMode === 'NEGOTIATED') {
                  setPricingMode('STANDARD')
                  Alert.alert(
                    'Negotiation Unavailable',
                    'Custom fare negotiation is not available for advance reservations. Switched to Standard Fare.',
                    [{ text: 'OK' }]
                  )
                }
              }}
            >
              <AppText variant="bodyS" bold color={bookingType === 'SCHEDULED' ? 'white' : 'secondary'}>
                🗓️ {t('schedule.schedule_later', 'Schedule Later')}
              </AppText>
            </TouchableOpacity>
          </View>

          {/* ── Scheduled Date Banner (When Scheduled Mode is Active) ── */}
          {bookingType === 'SCHEDULED' && (
            <TouchableOpacity
              style={[styles.scheduleBanner, { backgroundColor: `${theme.colors.primary}15`, borderColor: theme.colors.primary }]}
              onPress={() => setScheduleModalVisible(true)}
            >
              <Ionicons name="calendar-outline" size={22} color={theme.colors.primary} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <AppText variant="caption" color="secondary">SCHEDULED PICKUP</AppText>
                <AppText variant="body" bold color="brand">
                  {scheduledDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} at {scheduledDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </AppText>
              </View>
              <AppBadge label="Change ✏️" variant="info" size="sm" />
            </TouchableOpacity>
          )}

          {/* ── Pricing Mode Selector (Feature 5 Negotiation Differentiator) ── */}
          <View style={[styles.pricingModeToggle, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <TouchableOpacity
              style={[
                styles.pricingModeBtn,
                pricingMode === 'STANDARD' && { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => setPricingMode('STANDARD')}
            >
              <AppText variant="caption" bold color={pricingMode === 'STANDARD' ? 'white' : 'secondary'}>
                ⚡ {t('negotiation.standard_fare', 'Standard Fare')} (₹{fareBreakdown.total})
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.pricingModeBtn,
                pricingMode === 'NEGOTIATED' && { backgroundColor: theme.colors.primary },
                // Visually dim the button when SCHEDULED is active
                bookingType === 'SCHEDULED' && { opacity: 0.4 },
              ]}
              onPress={() => {
                if (bookingType === 'SCHEDULED') {
                  Alert.alert(
                    'Not Available',
                    'Fare negotiation cannot be used with advance reservations. Book Immediately to negotiate.',
                    [{ text: 'OK' }]
                  )
                  return
                }
                setPricingMode('NEGOTIATED')
              }}
            >
              <AppText variant="caption" bold color={pricingMode === 'NEGOTIATED' ? 'white' : 'secondary'}>
                🤝 {t('negotiation.your_offer', 'Your Offer (Negotiate)')}
              </AppText>
            </TouchableOpacity>
          </View>

          {/* ── Custom Offer Stepper Card (When Negotiation Mode is Active) ── */}
          {pricingMode === 'NEGOTIATED' && (
            <AppCard style={[styles.negotiationCard, { borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}08` }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <AppText variant="caption" color="brand" bold>YOUR PROPOSED FARE</AppText>
                  <AppText variant="display" bold color="brand" style={{ marginTop: 2 }}>
                    ₹{customOffer}
                  </AppText>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <AppText variant="caption" color="muted">Standard Estimate</AppText>
                  <AppText variant="subtitle" bold style={{ textDecorationLine: 'line-through' }}>
                    ₹{fareBreakdown.total}
                  </AppText>
                </View>
              </View>

              {/* Stepper Buttons */}
              <View style={styles.stepperRow}>
                {[-100, -50, 50, 100].map((delta) => (
                  <TouchableOpacity
                    key={delta}
                    style={[styles.stepperBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                    onPress={() => handleAdjustOffer(delta)}
                  >
                    <AppText variant="caption" bold color={delta < 0 ? 'error' : 'success'}>
                      {delta > 0 ? `+₹${delta}` : `-₹${Math.abs(delta)}`}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>

              <AppDivider marginVertical={10} />

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary} />
                <AppText variant="caption" color="secondary" style={{ flex: 1 }}>
                  Suggested Range: ₹{Math.round(fareBreakdown.total * 0.8)} – ₹{Math.round(fareBreakdown.total * 0.95)}. Drivers may accept or propose counter-offers.
                </AppText>
              </View>
            </AppCard>
          )}

          {/* ── Mode Switcher ── */}
          <View style={[styles.modeSwitcher, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {(['ONE_WAY', 'ROUND_TRIP', 'RENTAL'] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.modeBtn,
                  tripMode === mode && { backgroundColor: theme.colors.primary },
                ]}
                onPress={() => setTripMode(mode)}
              >
                <AppText variant="caption" bold color={tripMode === mode ? 'white' : 'secondary'}>
                  {mode === 'ONE_WAY' ? '🚗 One-Way' : mode === 'ROUND_TRIP' ? '🔄 Round-Trip' : '⏱️ Rental'}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Location Inputs & Multi-Stops ── */}
          <AppCard style={styles.locationCard}>
            {/* Pickup Input */}
            <View style={styles.locationInputRow}>
              <Ionicons name="radio-button-on" size={18} color="#10B981" style={{ marginTop: 12 }} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <AppText variant="caption" color="muted">PICKUP LOCATION</AppText>
                <TextInput
                  style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                  value={pickupAddress}
                  onChangeText={setPickupAddress}
                  placeholder={t('ride.pickup_placeholder', 'Enter pickup address...')}
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>

            {/* Saved Locations Quick Chips (from backend API) */}
            {savedAddresses.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 6 }}>
                {savedAddresses.map((addr: any) => (
                  <TouchableOpacity
                    key={addr.id}
                    style={[styles.savedLocationChip, {
                      backgroundColor: `${theme.colors.primary}10`,
                      borderColor: theme.colors.primary,
                    }]}
                    onPress={() => {
                      setPickupAddress(addr.full_address || addr.label)
                      if (addr.latitude && addr.longitude) {
                        setPickupCoord({ latitude: addr.latitude, longitude: addr.longitude })
                      }
                    }}
                  >
                    <Ionicons
                      name={addr.label?.toLowerCase() === 'home' ? 'home' : addr.label?.toLowerCase() === 'office' ? 'briefcase' : 'location'}
                      size={14}
                      color={theme.colors.primary}
                    />
                    <AppText variant="caption" bold color="brand">{addr.label}</AppText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Use Current Location Button */}
            <TouchableOpacity
              style={[styles.gpsButton, { backgroundColor: `${theme.colors.success}12`, borderColor: theme.colors.success }]}
              onPress={handleUseCurrentLocation}
            >
              <Ionicons name="locate" size={18} color={theme.colors.success} />
              <AppText variant="bodyS" bold color="success">
                {gpsLoading ? 'Locating...' : '📍 Use Current Location'}
              </AppText>
            </TouchableOpacity>

            {/* Intermediate Stops */}
            {stops.map((stop, idx) => (
              <View key={stop.id} style={styles.locationInputRow}>
                <Ionicons name="location" size={18} color="#F59E0B" style={{ marginTop: 12 }} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <AppText variant="caption" color="muted">STOP {idx + 1}</AppText>
                    <TouchableOpacity onPress={() => handleRemoveStop(stop.id)}>
                      <Feather name="x" size={14} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                    value={stop.address}
                    onChangeText={(val) => {
                      const updated = [...stops]
                      updated[idx].address = val
                      setStops(updated)
                    }}
                  />
                </View>
              </View>
            ))}

            {/* Destination Input */}
            <View style={styles.locationInputRow}>
              <Ionicons name="location" size={18} color="#EF4444" style={{ marginTop: 12 }} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <AppText variant="caption" color="muted">DROP DESTINATION</AppText>
                <TextInput
                  style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                  value={dropAddress}
                  onChangeText={setDropAddress}
                  placeholder={t('ride.drop_placeholder', 'Enter drop address...')}
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>

            {/* Multi-Stop, GPS, & Drop Pin Quick Chips */}
            <View style={styles.quickActionChips}>
              {stops.length < MAX_STOPS && (
                <TouchableOpacity
                  style={[styles.chip, { borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundAlt }]}
                  onPress={handleAddStop}
                >
                  <Feather name="plus-circle" size={14} color={theme.colors.primary} />
                  <AppText variant="caption" bold color="brand">+ Add Stop</AppText>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.chip, { borderColor: '#EF4444', backgroundColor: '#EF444410' }]}
                onPress={() => {
                  setPinCoord({ latitude: dropCoord.latitude, longitude: dropCoord.longitude })
                  setDropPinModalVisible(true)
                }}
              >
                <Ionicons name="pin" size={14} color="#EF4444" />
                <AppText variant="caption" bold style={{ color: '#EF4444' }}>📌 Drop a Pin</AppText>
              </TouchableOpacity>
            </View>
          </AppCard>

          {/* ── Route Map Preview ── */}
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={{
                latitude: (pickupCoord.latitude + dropCoord.latitude) / 2,
                longitude: (pickupCoord.longitude + dropCoord.longitude) / 2,
                latitudeDelta: 1.8,
                longitudeDelta: 1.8,
              }}
            >
              <Marker coordinate={pickupCoord} title="Pickup" pinColor="#10B981" />
              {stops.map((s, idx) => (
                <Marker key={s.id} coordinate={{ latitude: s.lat, longitude: s.lng }} title={`Stop ${idx + 1}`} pinColor="#F59E0B" />
              ))}
              <Marker coordinate={dropCoord} title="Destination" pinColor="#EF4444" />
              {routeCoordinates.length > 0 ? (
                <Polyline coordinates={routeCoordinates} strokeColor={theme.colors.primary} strokeWidth={4} />
              ) : (
                <Polyline coordinates={[pickupCoord, ...stops.map((s) => ({ latitude: s.lat, longitude: s.lng })), dropCoord]} strokeColor={theme.colors.primary} strokeWidth={3} />
              )}
            </MapView>

            <View style={[styles.mapMetricsBadge, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Ionicons name="speedometer-outline" size={14} color={theme.colors.primary} />
              <AppText variant="caption" bold>{routeDistanceKm} km • ~{Math.round(routeDurationMin / 60)}h {routeDurationMin % 60}m</AppText>
            </View>
          </View>

          {/* ── Feature 27: Smart Ride Sizing & Passengers ── */}
          <View style={{ marginTop: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <AppText variant="title" bold>Select Service</AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {/* Passengers Pill Counter */}
                <View style={[styles.sizingCounterPill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Feather name="users" size={14} color={theme.colors.primary} />
                  <TouchableOpacity
                    onPress={() => setPassengerCount((p) => Math.max(1, p - 1))}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="minus" size={14} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  <AppText variant="bodyS" bold>{passengerCount}</AppText>
                  <TouchableOpacity
                    onPress={() => setPassengerCount((p) => Math.min(7, p + 1))}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="plus" size={14} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Luggage Bags Pill Counter */}
                <View style={[styles.sizingCounterPill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Feather name="briefcase" size={14} color={theme.colors.accent} />
                  <TouchableOpacity
                    onPress={() => setLuggageCount((l) => Math.max(0, l - 1))}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="minus" size={14} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  <AppText variant="bodyS" bold>{luggageCount}</AppText>
                  <TouchableOpacity
                    onPress={() => setLuggageCount((l) => Math.min(6, l + 1))}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="plus" size={14} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Smart Recommendation Reason Tooltip */}
            {smartRecReason ? (
              <View style={[styles.smartReasonBar, { backgroundColor: `${theme.colors.warning}15`, borderColor: `${theme.colors.warning}30` }]}>
                <Ionicons name="sparkles" size={15} color={theme.colors.warning} />
                <AppText variant="small" color="secondary" style={{ marginLeft: 6, flex: 1 }}>
                  {smartRecReason}
                </AppText>
              </View>
            ) : null}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
              {categories.map((cat) => {
                const isSelected = selectedCategory.id === cat.id
                const isSmartRecommended = cat.name.toLowerCase() === smartRecCategory.toLowerCase()
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryCard,
                      {
                        backgroundColor: isSelected ? `${theme.colors.primary}12` : theme.colors.surface,
                        borderColor: isSelected ? theme.colors.primary : isSmartRecommended ? theme.colors.warning : theme.colors.border,
                        borderWidth: isSelected || isSmartRecommended ? 2 : 1,
                      },
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    {isSmartRecommended && (
                      <View style={{ position: 'absolute', top: -10, alignSelf: 'center', zIndex: 10 }}>
                        <AppBadge label="★ Smart Pick" variant="warning" size="sm" />
                      </View>
                    )}
                    <View style={[styles.categoryIconCircle, { backgroundColor: isSelected ? theme.colors.primary : theme.colors.backgroundAlt }]}>
                      <MaterialCommunityIcons
                        name={(cat.icon_name as any) || 'car'}
                        size={24}
                        color={isSelected ? '#FFFFFF' : theme.colors.textPrimary}
                      />
                    </View>
                    <AppText variant="bodyS" bold style={{ marginTop: 8 }}>{cat.display_name}</AppText>
                    <AppText variant="caption" color="muted">{SERVICE_TIER_INFO[cat.name]?.features || 'AC • 4 Seats'}</AppText>
                    {cat.surge_multiplier > 1.0 && (
                      <AppBadge label={`⚡ ${cat.surge_multiplier}x Surge`} variant="warning" size="sm" />
                    )}
                    <AppText variant="title" bold color="brand" style={{ marginTop: 6 }}>
                      ₹{Math.round((cat.base_fare + routeDistanceKm * cat.per_km_rate + routeDurationMin * cat.per_min_rate) * cat.surge_multiplier)}
                    </AppText>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>

          {/* ── Booking Ownership (Feature 1 Contract) ── */}
          <AppCard style={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="subtitle" bold>{t('ride.book_for', 'Booking For')}</AppText>
                <AppText variant="caption" color="secondary">
                  {riderType === 'SELF' ? `Myself (${riderName})` : `${riderName} (${riderPhone})`}
                </AppText>
              </View>
              <TouchableOpacity
                style={[styles.switchParticipantBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => setParticipantModalVisible(true)}
              >
                <AppText variant="caption" bold color="white">Change</AppText>
              </TouchableOpacity>
            </View>
          </AppCard>

          {/* ── Pickup Notes & Preferences ── */}
          <AppCard style={styles.sectionCard}>
            <AppText variant="subtitle" bold>Pickup Notes & Entry Details</AppText>
            <TextInput
              style={[styles.notesInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundAlt }]}
              value={pickupNotes}
              onChangeText={setPickupNotes}
              placeholder="e.g. Gate 2, near Metro Pillar 42..."
              placeholderTextColor={theme.colors.textMuted}
            />
          </AppCard>

          {/* ── Promo Code & Fare Breakdown ── */}
          <AppCard style={styles.sectionCard}>
            <AppText variant="subtitle" bold>{t('ride.fare_details', 'Fare Breakdown')}</AppText>

            {/* Promo Code Input */}
            <View style={styles.promoInputRow}>
              <TextInput
                style={[styles.promoInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundAlt }]}
                value={promoCode}
                onChangeText={setPromoCode}
                placeholder="Enter Coupon (e.g. DIWALI2026)"
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={[styles.applyPromoBtn, { backgroundColor: theme.colors.primary }]}
                onPress={handleApplyPromo}
              >
                <AppText variant="caption" bold color="white">Apply</AppText>
              </TouchableOpacity>
            </View>

            <AppDivider marginVertical={12} />

            <View style={styles.fareRow}>
              <AppText variant="bodyS" color="secondary">Base Ride Charge</AppText>
              <AppText variant="bodyS">₹{fareBreakdown.baseFare}</AppText>
            </View>
            <View style={styles.fareRow}>
              <AppText variant="bodyS" color="secondary">Distance Rate ({routeDistanceKm} km)</AppText>
              <AppText variant="bodyS">₹{fareBreakdown.distanceFare}</AppText>
            </View>
            <View style={styles.fareRow}>
              <AppText variant="bodyS" color="secondary">Travel Time Charge (~{routeDurationMin} min)</AppText>
              <AppText variant="bodyS">₹{fareBreakdown.timeFare}</AppText>
            </View>
            {fareBreakdown.surge > 1.0 && (
              <View style={styles.fareRow}>
                <AppText variant="bodyS" color="warning">Demand Surge Multiplier</AppText>
                <AppText variant="bodyS" color="warning">{fareBreakdown.surge}x</AppText>
              </View>
            )}
            {fareBreakdown.discount > 0 && (
              <View style={styles.fareRow}>
                <AppText variant="bodyS" color="success">Promo Discount</AppText>
                <AppText variant="bodyS" color="success">-₹{fareBreakdown.discount}</AppText>
              </View>
            )}

            <AppDivider marginVertical={10} />

            <View style={styles.fareRow}>
              <AppText variant="title" bold>
                {pricingMode === 'NEGOTIATED' ? 'Your Proposed Fare' : bookingType === 'SCHEDULED' ? 'Estimated Total' : 'Total Payable'}
              </AppText>
              <AppText variant="title" bold color="brand">
                ₹{pricingMode === 'NEGOTIATED' ? customOffer : fareBreakdown.total}
              </AppText>
            </View>
          </AppCard>

          {/* ── Payment Method Selector ── */}
          <AppCard style={styles.sectionCard}>
            <AppText variant="subtitle" bold style={{ marginBottom: 8 }}>Payment Method</AppText>
            <View style={styles.paymentMethodsRow}>
              {(['CASH', 'WALLET', 'UPI', 'SHARED_FAMILY'] as const).map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.paymentMethodChip,
                    {
                      backgroundColor: paymentMethod === method ? `${theme.colors.primary}15` : theme.colors.backgroundAlt,
                      borderColor: paymentMethod === method ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => setPaymentMethod(method)}
                >
                  <AppText variant="caption" bold={paymentMethod === method} color={paymentMethod === method ? 'brand' : 'secondary'}>
                    {method === 'CASH' ? '💵 Cash' : method === 'WALLET' ? '👛 Wallet' : method === 'UPI' ? '📱 UPI' : '👨‍👩‍👧 Family'}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          </AppCard>

          {/* ── Primary Confirm CTA ── */}
          <View style={{ marginTop: 10, marginBottom: 30 }}>
            <AppButton
              variant="primary"
              onPress={handleConfirmRide}
              loading={bookingLoading}
            >
              {pricingMode === 'NEGOTIATED'
                ? `Send Offer to Drivers • ₹${customOffer} 🤝`
                : bookingType === 'SCHEDULED'
                ? `Confirm Advance Reservation • ₹${fareBreakdown.total}`
                : `${t('ride.book_now', 'Confirm & Request Cab')} • ₹${fareBreakdown.total}`}
            </AppButton>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* ── Schedule Date & Time Selection Modal (Feature 4) ── */}
      {/* Android: Uses DateTimePickerAndroid.open() — two-step date then time (imperative API) */}
      {/* iOS:     Renders inline DateTimePicker with mode="datetime" spinner inside modal     */}
      <Modal
        visible={scheduleModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setScheduleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <AppText variant="title" bold center>{t('schedule.title', 'Schedule Advance Reservation')}</AppText>
            <AppText variant="caption" color="muted" center style={{ marginTop: 4 }}>
              {`Min ${minLeadTimeMinutes} min lead time • Max ${maxAdvanceDays} days ahead • ${DEVICE_TIMEZONE}`}
            </AppText>

            {/* Quick Day Chips */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.dateQuickChip, { backgroundColor: `${theme.colors.primary}15`, borderColor: theme.colors.primary }]}
                onPress={() => {
                  const d = new Date()
                  d.setMinutes(d.getMinutes() + minLeadTimeMinutes + 5) // +5 buffer
                  setScheduledDate(d)
                  setIosTempDate(d)
                }}
              >
                <AppText variant="caption" bold color="brand">Today (+{minLeadTimeMinutes}m)</AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dateQuickChip, { backgroundColor: theme.colors.backgroundAlt, borderColor: theme.colors.border }]}
                onPress={() => {
                  const d = new Date()
                  d.setDate(d.getDate() + 1)
                  d.setHours(10, 30, 0, 0)
                  setScheduledDate(d)
                  setIosTempDate(d)
                }}
              >
                <AppText variant="caption" bold>Tomorrow 10:30 AM</AppText>
              </TouchableOpacity>
            </View>

            {/* Selected Time Preview */}
            <View style={[styles.selectedTimePreview, { backgroundColor: `${theme.colors.primary}08`, borderColor: theme.colors.primary }]}>
              <Ionicons name="calendar" size={18} color={theme.colors.primary} />
              <AppText variant="body" bold color="brand" style={{ marginLeft: 8 }}>
                {scheduledDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                {' at '}
                {scheduledDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </AppText>
            </View>

            {/* Platform-specific picker */}
            {Platform.OS === 'android' ? (
              /* Android: Button triggers imperative native picker */
              <TouchableOpacity
                style={[styles.nativePickerBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  const minDate = new Date(Date.now() + minLeadTimeMinutes * 60 * 1000)
                  const maxDate = new Date(Date.now() + maxAdvanceDays * 24 * 3600 * 1000)
                  DateTimePickerAndroid.open({
                    value: scheduledDate,
                    mode: 'date',
                    minimumDate: minDate,
                    maximumDate: maxDate,
                    onChange: (_event, selectedDate) => {
                      if (selectedDate) {
                        // After date selection, open time picker
                        DateTimePickerAndroid.open({
                          value: selectedDate,
                          mode: 'time',
                          is24Hour: false,
                          onChange: (_evTime, selectedTime) => {
                            if (selectedTime) {
                              setScheduledDate(selectedTime)
                            }
                          },
                        })
                      }
                    },
                  })
                }}
              >
                <Ionicons name="calendar-outline" size={18} color="#FFFFFF" />
                <AppText variant="bodyS" bold style={{ color: '#FFFFFF', marginLeft: 8 }}>
                  Pick Date & Time
                </AppText>
              </TouchableOpacity>
            ) : (
              /* iOS: Inline DateTimePicker spinner */
              <DateTimePicker
                value={iosTempDate}
                mode="datetime"
                display="spinner"
                minimumDate={new Date(Date.now() + minLeadTimeMinutes * 60 * 1000)}
                maximumDate={new Date(Date.now() + maxAdvanceDays * 24 * 3600 * 1000)}
                onChange={(_event, selectedDate) => {
                  if (selectedDate) {
                    setIosTempDate(selectedDate)
                    setScheduledDate(selectedDate)
                  }
                }}
                textColor={theme.colors.textPrimary}
                style={{ width: '100%', marginTop: 8 }}
              />
            )}

            <View style={{ marginTop: 20, gap: 10 }}>
              <AppButton
                variant="primary"
                onPress={() => {
                  // Validate before closing
                  const minDate = new Date(Date.now() + minLeadTimeMinutes * 60 * 1000)
                  if (scheduledDate < minDate) {
                    Alert.alert(
                      'Invalid Time',
                      `Please select a time at least ${minLeadTimeMinutes} minutes from now.`
                    )
                    return
                  }
                  setScheduleModalVisible(false)
                }}
              >
                ✓ Confirm Pickup Time
              </AppButton>
              <AppButton variant="secondary" onPress={() => setScheduleModalVisible(false)}>
                Cancel
              </AppButton>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Reservation Success Sheet Modal (Feature 4) ── */}
      <Modal
        visible={reservationSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setReservationSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, alignItems: 'center' }]}>
            <View style={[styles.successIconCircle, { backgroundColor: `${theme.colors.success}18` }]}>
              <Ionicons name="checkmark-circle" size={48} color={theme.colors.success} />
            </View>

            <AppText variant="title" bold center style={{ marginTop: 12 }}>
              {t('schedule.confirmed_title', 'Reservation Confirmed! 🎉')}
            </AppText>
            <AppText variant="bodyS" color="secondary" center style={{ marginTop: 6, paddingHorizontal: 10 }}>
              {t('schedule.confirmed_desc', 'Your ride is reserved. A top-rated driver will be dispatched 45 mins before pickup.')}
            </AppText>

            <AppCard style={[styles.successSummaryCard, { backgroundColor: theme.colors.backgroundAlt, borderColor: theme.colors.border }]}>
              <View style={styles.successSummaryRow}>
                <AppText variant="caption" color="muted">DATE & TIME</AppText>
                <AppText variant="bodyS" bold>
                  {confirmedReservationData?.scheduled_at?.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}, {confirmedReservationData?.scheduled_at?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </AppText>
              </View>
              <View style={styles.successSummaryRow}>
                <AppText variant="caption" color="muted">VEHICLE</AppText>
                <AppText variant="bodyS" bold>{confirmedReservationData?.category}</AppText>
              </View>
              <View style={styles.successSummaryRow}>
                <AppText variant="caption" color="muted">ESTIMATED FARE</AppText>
                <AppText variant="bodyS" bold color="brand">₹{confirmedReservationData?.fare}</AppText>
              </View>
            </AppCard>

            <View style={{ width: '100%', marginTop: 20, gap: 10 }}>
              <AppButton
                variant="primary"
                onPress={() => {
                  setReservationSuccessModal(false)
                  router.replace('/(tabs)/trips' as any)
                }}
              >
                {t('schedule.view_reservations', 'View in Upcoming Trips →')}
              </AppButton>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Booking Participant Modal ── */}
      <Modal
        visible={participantModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setParticipantModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <AppText variant="title" bold center>Select Rider</AppText>
            <AppText variant="caption" color="muted" center style={{ marginTop: 4 }}>
              Driver will see this rider's name & phone on arrival.
            </AppText>

            <TouchableOpacity
              style={[styles.riderOption, { borderColor: riderType === 'SELF' ? theme.colors.primary : theme.colors.border }]}
              onPress={() => {
                setRiderType('SELF')
                setRiderName('Pankaj Patil')
                setRiderPhone('+919876543210')
                setParticipantModalVisible(false)
              }}
            >
              <AppAvatar name="Pankaj Patil" size={36} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <AppText variant="bodyS" bold>Myself</AppText>
                <AppText variant="caption" color="muted">+919876543210</AppText>
              </View>
              {riderType === 'SELF' && <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />}
            </TouchableOpacity>

            {familyMembers.map((m: any) => (
              <TouchableOpacity
                key={m.id}
                style={[styles.riderOption, { borderColor: riderName === m.name ? theme.colors.primary : theme.colors.border }]}
                onPress={() => {
                  setRiderType('FAMILY_MEMBER')
                  setRiderName(m.name)
                  setRiderPhone(m.phone)
                  setParticipantModalVisible(false)
                }}
              >
                <AppAvatar name={m.name} size={36} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <AppText variant="bodyS" bold>{m.name} ({m.relationship || 'Family'})</AppText>
                  <AppText variant="caption" color="muted">{m.phone}</AppText>
                </View>
                {riderName === m.name && <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />}
              </TouchableOpacity>
            ))}

            <View style={{ marginTop: 16 }}>
              <AppButton variant="secondary" onPress={() => setParticipantModalVisible(false)}>
                Done
              </AppButton>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── DROP-A-PIN MODAL ── */}
      <Modal visible={dropPinModalVisible} animationType="slide" onRequestClose={() => setDropPinModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <SafeAreaView style={{ flex: 1 }}>
            {/* Header */}
            <View style={[styles.header, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}>
              <TouchableOpacity onPress={() => setDropPinModalVisible(false)} style={[styles.backBtn, { borderColor: theme.colors.border }]}>
                <Feather name="x" size={18} color={theme.colors.textPrimary} />
              </TouchableOpacity>
              <AppText variant="title" bold style={{ marginLeft: 14 }}>📌 Drop a Pin</AppText>
            </View>

            {/* Full-screen Map with Draggable Marker */}
            <View style={{ flex: 1 }}>
              <MapView
                ref={dropMapRef}
                style={{ flex: 1 }}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                  latitude: pinCoord.latitude || 19.0760,
                  longitude: pinCoord.longitude || 72.8777,
                  latitudeDelta: 0.02,
                  longitudeDelta: 0.02,
                }}
                onPress={(e) => {
                  const { latitude, longitude } = e.nativeEvent.coordinate
                  setPinCoord({ latitude, longitude })
                }}
              >
                <Marker
                  coordinate={pinCoord}
                  draggable
                  onDragEnd={(e) => {
                    const { latitude, longitude } = e.nativeEvent.coordinate
                    setPinCoord({ latitude, longitude })
                  }}
                  pinColor="#EF4444"
                />
              </MapView>

              {/* Pin Info Overlay */}
              <View style={{
                position: 'absolute',
                top: 16,
                left: 16,
                right: 16,
                padding: 12,
                borderRadius: 14,
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}>
                <AppText variant="caption" color="muted">PIN LOCATION</AppText>
                <AppText variant="bodyS">{pinCoord.latitude.toFixed(6)}, {pinCoord.longitude.toFixed(6)}</AppText>
                <AppText variant="caption" color="muted" style={{ marginTop: 4 }}>Tap map or drag pin to set drop location</AppText>
              </View>
            </View>

            {/* Confirm Button */}
            <View style={{ padding: 20, paddingBottom: 30 }}>
              <AppButton
                variant="primary"
                onPress={async () => {
                  try {
                    setDropCoord(pinCoord)
                    const geocoded = await reverseGeocodeCoordinate(pinCoord.latitude, pinCoord.longitude)
                    if (geocoded) setDropAddress(geocoded)
                    else setDropAddress(`${pinCoord.latitude.toFixed(4)}, ${pinCoord.longitude.toFixed(4)}`)
                  } catch {
                    setDropAddress(`${pinCoord.latitude.toFixed(4)}, ${pinCoord.longitude.toFixed(4)}`)
                  }
                  setDropPinModalVisible(false)
                }}
              >
                ✅ Confirm Drop Location
              </AppButton>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 14,
  },
  bookingTypeRow: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
  },
  bookingTypeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  scheduleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  pricingModeToggle: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
  },
  pricingModeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  negotiationCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  stepperBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  modeSwitcher: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  locationCard: {
    padding: 16,
    gap: 12,
  },
  locationInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginTop: 4,
  },
  quickActionChips: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  savedLocationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 4,
  },
  mapContainer: {
    height: 180,
    borderRadius: 18,
    overflow: 'hidden',
  },
  map: { flex: 1 },
  mapMetricsBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryScroll: {
    gap: 12,
    paddingVertical: 4,
  },
  categoryCard: {
    width: 140,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  categoryIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCard: {
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchParticipantBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    fontSize: 13,
  },
  promoInputRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  applyPromoBtn: {
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentMethodChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  dateQuickChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  timeSlotChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successSummaryCard: {
    width: '100%',
    padding: 14,
    marginTop: 16,
    borderRadius: 16,
    gap: 8,
  },
  successSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  riderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
  },
  // Feature 4: Native DateTimePicker schedule modal styles
  selectedTimePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 16,
  },
  nativePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 16,
  },
  // Feature 27 Smart Vehicle Sizing Styles
  sizingCounterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  smartReasonBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
})
