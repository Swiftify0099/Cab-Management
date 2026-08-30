/**
 * Customer App — Premium Intercity & City Cab Booking Screen
 * Route: /book/cab
 * Feature 3, Feature 4 & Feature 5: Interactive Location Picker + Advance Reservation + Own Fare Negotiation.
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
import { rideApi, fareApi, familyApi, scheduleApi, smartApi, profileApi, favoriteDriverApi } from '../../src/api/client'
import { getRoutePolyline, reverseGeocodeCoordinate, haversineDistance } from '../../src/utils/maps'
import LocationPickerModal, { SelectedLocationData } from '../../src/components/map/LocationPickerModal'
import {
  AppText,
  AppButton,
  AppCard,
  AppBadge,
  AppDivider,
  AppAvatar,
} from '../../src/components/ui'

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
  { id: 'cat_premium', name: 'premium', display_name: '💎 Premium Sedan', base_fare: 85, per_km_rate: 18, per_min_rate: 2.5, min_fare: 150, surge_multiplier: 1.0, icon_name: 'car-side' },
  { id: 'cat_luxury', name: 'luxury', display_name: '👑 Luxury SUV', base_fare: 150, per_km_rate: 28, per_min_rate: 4.0, min_fare: 300, surge_multiplier: 1.0, icon_name: 'car-sports' },
  { id: 'cat_outstation', name: 'outstation', display_name: '🏙️ Outstation Cab', base_fare: 110, per_km_rate: 14, per_min_rate: 2.0, min_fare: 200, surge_multiplier: 1.0, icon_name: 'car-estate' },
]

const SERVICE_TIER_INFO: Record<string, { tagline: string; features: string }> = {
  local: { tagline: 'Budget-friendly city trips', features: 'AC • 4 Seats • Daily Commute' },
  premium: { tagline: 'High-comfort, top-rated drivers', features: 'AC • Premium Sedan • Extra Legroom' },
  luxury: { tagline: 'Executive vehicles & amenities', features: 'AC • Luxury • WiFi • Top Rated' },
  outstation: { tagline: 'Long-distance intercity travel', features: 'AC • 6-7 Seats • Multi-Stops' },
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
    isCorporate?: string
    companyId?: string
    companyName?: string
  }>()

  // ── Mode Switchers ──
  const [tripMode, setTripMode] = useState<'ONE_WAY' | 'ROUND_TRIP' | 'RENTAL'>('ONE_WAY')
  const [bookingType, setBookingType] = useState<'IMMEDIATE' | 'SCHEDULED'>('IMMEDIATE')

  // ── Corporate Ride State ──
  const [isCorporateRide, setIsCorporateRide] = useState<boolean>(params.isCorporate === 'true')
  const [companyName, setCompanyName] = useState<string>(params.companyName || 'Corporate Billing')
  const [companyId, setCompanyId] = useState<string>(params.companyId || '')

  // ── Pricing Mode & Negotiation (Feature 5) ──
  const [pricingMode, setPricingMode] = useState<'STANDARD' | 'NEGOTIATED'>('STANDARD')
  const [customOffer, setCustomOffer] = useState<number>(2700)

  // ── Scheduling State (Feature 4) ──
  const [scheduledDate, setScheduledDate] = useState<Date>(new Date(Date.now() + 3600 * 1000 * 2))
  const [scheduleModalVisible, setScheduleModalVisible] = useState<boolean>(false)
  const [minLeadTimeMinutes, setMinLeadTimeMinutes] = useState<number>(45)
  const [maxAdvanceDays, setMaxAdvanceDays] = useState<number>(30)
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

  // ── Location Picker Modal Controls ──
  const [activePickerMode, setActivePickerMode] = useState<'pickup' | 'drop' | 'stop' | null>(null)
  const [activeStopIndex, setActiveStopIndex] = useState<number | null>(null)

  // ── Dynamic Categories & Saved Data ──
  const [categories, setCategories] = useState<DynamicCategory[]>(DEFAULT_CATEGORIES)
  const [selectedCategory, setSelectedCategory] = useState<DynamicCategory>(DEFAULT_CATEGORIES[1])
  const [savedAddresses, setSavedAddresses] = useState<any[]>([])
  const [favoriteDriverIds, setFavoriteDriverIds] = useState<string[]>([])

  // ── Route & Fare Calculations ──
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([])
  const [routeDistanceKm, setRouteDistanceKm] = useState<number>(148.2)
  const [routeDurationMin, setRouteDurationMin] = useState<number>(180)
  const [fareBreakdown, setFareBreakdown] = useState<any>({
    baseFare: 75,
    distanceFare: 2371,
    timeFare: 360,
    surge: 1.0,
    subtotal: 2806,
    discount: 0,
    total: 2806,
  })
  const [promoCode, setPromoCode] = useState<string>('')
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null)

  // ── Booking Participant ──
  const [riderType, setRiderType] = useState<'SELF' | 'FAMILY_MEMBER' | 'GUEST'>('SELF')
  const [riderName, setRiderName] = useState<string>((user as any)?.name || 'Pankaj Patil')
  const [riderPhone, setRiderPhone] = useState<string>(user?.phone || '+919876543210')
  const [familyMembers, setFamilyMembers] = useState<any[]>([])
  const [participantModalVisible, setParticipantModalVisible] = useState<boolean>(false)

  // Preferences & Payment
  const [seats, setSeats] = useState<number>(1)
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'WALLET' | 'UPI' | 'SHARED_FAMILY' | 'CORPORATE'>(
    params.isCorporate === 'true' ? 'CORPORATE' : 'CASH'
  )
  const [bookingLoading, setBookingLoading] = useState<boolean>(false)

  // Smart Vehicle Sizing State
  const [passengerCount, setPassengerCount] = useState<number>(1)
  const [luggageCount, setLuggageCount] = useState<number>(0)
  const [smartRecCategory, setSmartRecCategory] = useState<string>('economy')
  const [smartRecReason, setSmartRecReason] = useState<string>('')

  // Sync return params
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
    if (params.isCorporate === 'true') {
      setIsCorporateRide(true)
      if (params.companyName) setCompanyName(params.companyName)
      if (params.companyId) setCompanyId(params.companyId)
    }
  }, [
    params.riderName, params.riderPhone, params.riderType,
    params.pickupAddress, params.dropAddress,
    params.pickupLat, params.pickupLng,
    params.dropLat, params.dropLng,
    params.isCorporate, params.companyName, params.companyId,
  ])

  // Load backend data
  useEffect(() => {
    const loadData = async () => {
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

      try {
        const cfgRes = await scheduleApi.getConfig()
        const cfg = cfgRes.data?.data || cfgRes.data
        if (cfg?.min_lead_time_minutes) setMinLeadTimeMinutes(cfg.min_lead_time_minutes)
        if (cfg?.max_advance_booking_days) setMaxAdvanceDays(cfg.max_advance_booking_days)
      } catch {
        setMinLeadTimeMinutes(45)
        setMaxAdvanceDays(30)
      }

      try {
        const addrRes = await profileApi.getAddresses()
        const addrs = addrRes.data?.data || addrRes.data || []
        if (Array.isArray(addrs)) setSavedAddresses(addrs)
      } catch {}

      try {
        const favRes = await favoriteDriverApi.list()
        const favs = favRes.data?.data || favRes.data || []
        if (Array.isArray(favs)) {
          setFavoriteDriverIds(favs.map((f: any) => f.driver_id))
        }
      } catch {}
    }
    loadData()
  }, [])

  // Smart vehicle sizing recommendation
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

  // Route & Fare Calculations
  const computeRouteAndFare = useCallback(async () => {
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

    try {
      mapRef.current?.fitToCoordinates(
        [pickupCoord, ...stops.map((s) => ({ latitude: s.lat, longitude: s.lng })), dropCoord],
        { edgePadding: { top: 40, right: 40, bottom: 40, left: 40 }, animated: true }
      )
    } catch {}

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

    setCustomOffer(Math.round((total * 0.9) / 50) * 50)
  }, [pickupCoord, dropCoord, stops, selectedCategory, appliedCoupon])

  useEffect(() => {
    computeRouteAndFare()
  }, [computeRouteAndFare])

  // Multi-stop actions
  const handleAddStop = () => {
    if (stops.length >= MAX_STOPS) {
      Alert.alert('Maximum Stops', `You can add up to ${MAX_STOPS} stops.`)
      return
    }
    const newStop: StopItem = {
      id: `stop_${Date.now()}`,
      sequence: stops.length + 1,
      address: 'Select Stop Location...',
      lat: (pickupCoord.latitude + dropCoord.latitude) / 2,
      lng: (pickupCoord.longitude + dropCoord.longitude) / 2,
    }
    setStops([...stops, newStop])
    setActiveStopIndex(stops.length)
    setActivePickerMode('stop')
  }

  const handleRemoveStop = (id: string) => {
    setStops(stops.filter((s) => s.id !== id).map((s, idx) => ({ ...s, sequence: idx + 1 })))
  }

  // Location Picker Confirmation Handler
  const handleLocationConfirmed = (loc: SelectedLocationData) => {
    if (activePickerMode === 'pickup') {
      setPickupAddress(loc.address)
      setPickupCoord({ latitude: loc.latitude, longitude: loc.longitude })
    } else if (activePickerMode === 'drop') {
      setDropAddress(loc.address)
      setDropCoord({ latitude: loc.latitude, longitude: loc.longitude })
    } else if (activePickerMode === 'stop' && activeStopIndex !== null) {
      const updated = [...stops]
      if (updated[activeStopIndex]) {
        updated[activeStopIndex].address = loc.address
        updated[activeStopIndex].lat = loc.latitude
        updated[activeStopIndex].lng = loc.longitude
        setStops(updated)
      }
    }
    setActivePickerMode(null)
    setActiveStopIndex(null)
  }

  // 1-Tap Saved Address Direct Select
  const handleSelectSavedAddress = (addr: any, target: 'pickup' | 'drop') => {
    const lat = addr.latitude || (target === 'pickup' ? 18.5204 : 19.0760)
    const lng = addr.longitude || (target === 'pickup' ? 73.8567 : 72.8777)
    const fullText = addr.full_address || addr.address || addr.label

    if (target === 'pickup') {
      setPickupAddress(fullText)
      setPickupCoord({ latitude: lat, longitude: lng })
    } else {
      setDropAddress(fullText)
      setDropCoord({ latitude: lat, longitude: lng })
    }
  }

  // Offer adjustment
  const handleAdjustOffer = (delta: number) => {
    const minAllowed = Math.round(fareBreakdown.total * 0.7)
    const maxAllowed = Math.round(fareBreakdown.total * 1.5)
    const nextVal = customOffer + delta
    if (nextVal < minAllowed) {
      Alert.alert('Minimum Threshold', `Minimum offer for this category is ₹${minAllowed}.`)
      return
    }
    if (nextVal > maxAllowed) {
      Alert.alert('Maximum Threshold', `Offer cannot exceed ₹${maxAllowed}.`)
      return
    }
    setCustomOffer(nextVal)
  }

  // Promo code
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return
    try {
      const res = await fareApi.applyCoupon(promoCode.trim().toUpperCase(), fareBreakdown.subtotal)
      const data = res.data?.data || res.data
      setAppliedCoupon(data)
      Alert.alert('Coupon Applied!', `You saved ₹${data.discount_amount || 50} on this ride!`)
    } catch {
      if (promoCode.trim().toUpperCase() === 'DIWALI2026') {
        setAppliedCoupon({ code: 'DIWALI2026', discount_type: 'PERCENTAGE', discount_value: 20, max_discount_amount: 200 })
        Alert.alert('Coupon Applied!', 'Promo code DIWALI2026 applied (-20% discount)!')
      } else {
        Alert.alert('Invalid Coupon', 'This promo code is expired or invalid.')
      }
    }
  }

  // Confirm and search nearby drivers
  const handleConfirmRide = async () => {
    if (bookingType === 'SCHEDULED') {
      const minLeadTimeMs = minLeadTimeMinutes * 60 * 1000
      if (scheduledDate.getTime() < Date.now() + minLeadTimeMs) {
        Alert.alert('Lead Time Notice', `Advance reservations require at least ${minLeadTimeMinutes} minutes lead time.`)
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
        timezone: bookingType === 'SCHEDULED' ? DEVICE_TIMEZONE : undefined,
        scheduled_status: bookingType === 'SCHEDULED' ? 'CONFIRMED' : undefined,
        pricing_mode: pricingMode,
        customer_offer_amount: pricingMode === 'NEGOTIATED' ? customOffer : undefined,
        negotiation_idempotency_key: pricingMode === 'NEGOTIATED' ? requestId : undefined,
        seat_preferences: {
          pricing_mode: pricingMode,
          standard_fare: fareBreakdown.total,
          suggested_fare: customOffer,
        },
        preferred_driver_ids: favoriteDriverIds.length > 0 ? favoriteDriverIds : undefined,
        service_type: selectedCategory.name,
      }

      const res = await rideApi.createRequest(payload)
      const data = res.data?.data || res.data
      const rideId = data?.ride_request_id || data?.id || requestId

      if (bookingType === 'SCHEDULED') {
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
      if (bookingType === 'SCHEDULED') {
        router.push({
          pathname: '/reservation-confirmed',
          params: {
            reservationId: requestId,
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
      <SafeAreaView style={styles.safeArea}>
        {/* Sleek App Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText variant="title" bold>Book Your Cab</AppText>
            <AppText variant="caption" color="secondary">Instant Dispatch & Verified Drivers</AppText>
          </View>
          <TouchableOpacity
            style={[styles.riderBadgeBtn, { backgroundColor: `${theme.colors.primary}12`, borderColor: `${theme.colors.primary}30` }]}
            onPress={() => setParticipantModalVisible(true)}
          >
            <Feather name="user" size={13} color={theme.colors.primary} />
            <AppText variant="caption" bold color="brand">
              {riderType === 'SELF' ? 'For Me' : riderName.split(' ')[0]}
            </AppText>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Trip Type Tabs (Immediate vs Scheduled) */}
          <View style={[styles.bookingTypeRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <TouchableOpacity
              style={[styles.bookingTypeBtn, bookingType === 'IMMEDIATE' && { backgroundColor: theme.colors.primary }]}
              onPress={() => setBookingType('IMMEDIATE')}
            >
              <AppText variant="bodyS" bold color={bookingType === 'IMMEDIATE' ? 'white' : 'secondary'}>
                ⚡ Book Now
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bookingTypeBtn, bookingType === 'SCHEDULED' && { backgroundColor: theme.colors.primary }]}
              onPress={() => {
                setBookingType('SCHEDULED')
                setScheduleModalVisible(true)
                if (pricingMode === 'NEGOTIATED') setPricingMode('STANDARD')
              }}
            >
              <AppText variant="bodyS" bold color={bookingType === 'SCHEDULED' ? 'white' : 'secondary'}>
                🗓️ Schedule Later
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Scheduled Date Banner */}
          {bookingType === 'SCHEDULED' && (
            <TouchableOpacity
              style={[styles.scheduleBanner, { backgroundColor: `${theme.colors.primary}12`, borderColor: theme.colors.primary }]}
              onPress={() => setScheduleModalVisible(true)}
            >
              <Ionicons name="calendar" size={22} color={theme.colors.primary} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <AppText variant="caption" color="secondary">SCHEDULED PICKUP</AppText>
                <AppText variant="body" bold color="brand">
                  {scheduledDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} at {scheduledDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </AppText>
              </View>
              <AppBadge label="Change ✏️" variant="info" size="sm" />
            </TouchableOpacity>
          )}

          {/* Mode Switcher (One-Way / Round-Trip / Rental) */}
          <View style={[styles.modeSwitcher, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {(['ONE_WAY', 'ROUND_TRIP', 'RENTAL'] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.modeBtn, tripMode === mode && { backgroundColor: theme.colors.primary }]}
                onPress={() => setTripMode(mode)}
              >
                <AppText variant="caption" bold color={tripMode === mode ? 'white' : 'secondary'}>
                  {mode === 'ONE_WAY' ? '🚗 One-Way' : mode === 'ROUND_TRIP' ? '🔄 Round-Trip' : '⏱️ Rental'}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── PREMIUM INTERACTIVE LOCATION CARD ── */}
          <AppCard style={styles.locationCard}>
            {/* Pickup Row */}
            <View style={styles.locRowContainer}>
              <View style={styles.routeConnectorCol}>
                <View style={styles.pickupGreenDot} />
                <View style={styles.connectorLine} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="label" color="muted">PICKUP LOCATION</AppText>
                <TouchableOpacity
                  style={[styles.interactiveLocationBox, { borderColor: '#10B981', backgroundColor: '#10B98108' }]}
                  onPress={() => setActivePickerMode('pickup')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="radio-button-on" size={16} color="#10B981" />
                  <AppText variant="bodyS" bold style={{ flex: 1 }} numberOfLines={1}>
                    {pickupAddress}
                  </AppText>
                  <View style={styles.pinEditBadge}>
                    <Feather name="map" size={12} color="#10B981" />
                    <AppText variant="caption" bold style={{ color: '#10B981', marginLeft: 4 }}>Map</AppText>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Saved Addresses Horizontal Chips for Pickup */}
            {savedAddresses.length > 0 && (
              <View style={{ marginLeft: 28, marginTop: 4 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {savedAddresses.slice(0, 4).map((addr) => (
                    <TouchableOpacity
                      key={`pick_${addr.id}`}
                      style={[styles.quickAddrChip, { backgroundColor: `${theme.colors.primary}08`, borderColor: `${theme.colors.primary}25` }]}
                      onPress={() => handleSelectSavedAddress(addr, 'pickup')}
                    >
                      <Ionicons name={addr.label?.toLowerCase() === 'home' ? 'home' : 'location'} size={12} color={theme.colors.primary} />
                      <AppText variant="caption" bold color="brand">{addr.label}</AppText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Intermediate Stops */}
            {stops.map((stop, idx) => (
              <View key={stop.id} style={styles.locRowContainer}>
                <View style={styles.routeConnectorCol}>
                  <View style={styles.stopYellowDot} />
                  <View style={styles.connectorLine} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <AppText variant="label" color="muted">STOP {idx + 1}</AppText>
                    <TouchableOpacity onPress={() => handleRemoveStop(stop.id)}>
                      <Feather name="x" size={14} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={[styles.interactiveLocationBox, { borderColor: '#F59E0B', backgroundColor: '#F59E0B08' }]}
                    onPress={() => {
                      setActiveStopIndex(idx)
                      setActivePickerMode('stop')
                    }}
                  >
                    <Ionicons name="flag" size={15} color="#F59E0B" />
                    <AppText variant="bodyS" bold style={{ flex: 1 }} numberOfLines={1}>
                      {stop.address}
                    </AppText>
                    <View style={[styles.pinEditBadge, { backgroundColor: '#F59E0B15' }]}>
                      <Feather name="edit-2" size={12} color="#F59E0B" />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Drop Destination Row */}
            <View style={[styles.locRowContainer, { marginTop: 8 }]}>
              <View style={styles.routeConnectorCol}>
                <View style={styles.dropRedPin} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="label" color="muted">DROP DESTINATION</AppText>
                <TouchableOpacity
                  style={[styles.interactiveLocationBox, { borderColor: '#EF4444', backgroundColor: '#EF444408' }]}
                  onPress={() => setActivePickerMode('drop')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="location" size={18} color="#EF4444" />
                  <AppText variant="bodyS" bold style={{ flex: 1 }} numberOfLines={1}>
                    {dropAddress}
                  </AppText>
                  <View style={[styles.pinEditBadge, { backgroundColor: '#EF444415' }]}>
                    <Feather name="map-pin" size={12} color="#EF4444" />
                    <AppText variant="caption" bold style={{ color: '#EF4444', marginLeft: 4 }}>Map</AppText>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Actions Strip (+ Add Stop, Drop Pin) */}
            <View style={styles.locationActionsRow}>
              {stops.length < MAX_STOPS && (
                <TouchableOpacity style={[styles.actionChip, { borderColor: theme.colors.border }]} onPress={handleAddStop}>
                  <Feather name="plus-circle" size={13} color={theme.colors.primary} />
                  <AppText variant="caption" bold color="brand">+ Add Stop</AppText>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionChip, { borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}08` }]}
                onPress={() => setActivePickerMode('drop')}
              >
                <Ionicons name="pin" size={13} color={theme.colors.primary} />
                <AppText variant="caption" bold color="brand">📌 Pinpoint on Map</AppText>
              </TouchableOpacity>
            </View>
          </AppCard>

          {/* ── Route Map Preview ── */}
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
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

          {/* ── Pricing Mode Selector (Standard vs Negotiation) ── */}
          <View style={[styles.pricingModeToggle, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <TouchableOpacity
              style={[styles.pricingModeBtn, pricingMode === 'STANDARD' && { backgroundColor: theme.colors.primary }]}
              onPress={() => setPricingMode('STANDARD')}
            >
              <AppText variant="caption" bold color={pricingMode === 'STANDARD' ? 'white' : 'secondary'}>
                ⚡ Standard Fare (₹{fareBreakdown.total})
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.pricingModeBtn,
                pricingMode === 'NEGOTIATED' && { backgroundColor: theme.colors.primary },
                bookingType === 'SCHEDULED' && { opacity: 0.4 },
              ]}
              onPress={() => {
                if (bookingType === 'SCHEDULED') {
                  Alert.alert('Not Available', 'Negotiation is only for immediate dispatch.')
                  return
                }
                setPricingMode('NEGOTIATED')
              }}
            >
              <AppText variant="caption" bold color={pricingMode === 'NEGOTIATED' ? 'white' : 'secondary'}>
                🤝 Your Offer (Negotiate)
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Custom Offer Stepper Card */}
          {pricingMode === 'NEGOTIATED' && (
            <AppCard style={[styles.negotiationCard, { borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}08` }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <AppText variant="caption" color="brand" bold>YOUR PROPOSED FARE</AppText>
                  <AppText variant="display" bold color="brand" style={{ marginTop: 2 }}>₹{customOffer}</AppText>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <AppText variant="caption" color="muted">Standard Estimate</AppText>
                  <AppText variant="subtitle" bold style={{ textDecorationLine: 'line-through' }}>₹{fareBreakdown.total}</AppText>
                </View>
              </View>

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
            </AppCard>
          )}

          {/* ── Vehicle Tier Selection ── */}
          <View style={{ marginTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <AppText variant="title" bold>Select Vehicle Category</AppText>
              {/* Passenger Counter */}
              <View style={[styles.sizingCounterPill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Feather name="users" size={13} color={theme.colors.primary} />
                <TouchableOpacity onPress={() => setPassengerCount((p) => Math.max(1, p - 1))}>
                  <Feather name="minus" size={13} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                <AppText variant="caption" bold>{passengerCount}</AppText>
                <TouchableOpacity onPress={() => setPassengerCount((p) => Math.min(7, p + 1))}>
                  <Feather name="plus" size={13} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {smartRecReason ? (
              <View style={[styles.smartReasonBar, { backgroundColor: `${theme.colors.warning}15`, borderColor: `${theme.colors.warning}30` }]}>
                <Ionicons name="sparkles" size={14} color={theme.colors.warning} />
                <AppText variant="small" color="secondary" style={{ marginLeft: 6, flex: 1 }}>{smartRecReason}</AppText>
              </View>
            ) : null}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
              {categories.map((cat) => {
                const isSelected = selectedCategory.id === cat.id
                const fare = Math.round((cat.base_fare + routeDistanceKm * cat.per_km_rate + routeDurationMin * cat.per_min_rate) * cat.surge_multiplier)
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryCard,
                      {
                        backgroundColor: isSelected ? `${theme.colors.primary}12` : theme.colors.surface,
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <View style={[styles.categoryIconCircle, { backgroundColor: isSelected ? theme.colors.primary : theme.colors.backgroundAlt }]}>
                      <MaterialCommunityIcons
                        name={(cat.icon_name as any) || 'car'}
                        size={24}
                        color={isSelected ? '#FFFFFF' : theme.colors.textPrimary}
                      />
                    </View>
                    <AppText variant="bodyS" bold style={{ marginTop: 8 }}>{cat.display_name}</AppText>
                    <AppText variant="caption" color="muted">{SERVICE_TIER_INFO[cat.name]?.features || 'AC • 4 Seats'}</AppText>
                    <AppText variant="title" bold color="brand" style={{ marginTop: 6 }}>₹{fare}</AppText>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>

          {/* ── Pickup Notes & Promo ── */}
          <AppCard style={styles.sectionCard}>
            <AppText variant="subtitle" bold>Pickup Notes & Coupons</AppText>
            <TextInput
              style={[styles.notesInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundAlt }]}
              value={pickupNotes}
              onChangeText={setPickupNotes}
              placeholder="e.g. Near Main Gate, Landmark..."
              placeholderTextColor={theme.colors.textMuted}
            />

            <View style={styles.promoInputRow}>
              <TextInput
                style={[styles.promoInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundAlt }]}
                value={promoCode}
                onChangeText={setPromoCode}
                placeholder="Promo Code (e.g. DIWALI2026)"
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="characters"
              />
              <TouchableOpacity style={[styles.applyPromoBtn, { backgroundColor: theme.colors.primary }]} onPress={handleApplyPromo}>
                <AppText variant="caption" bold color="white">Apply</AppText>
              </TouchableOpacity>
            </View>
          </AppCard>

          {/* ── Payment Method ── */}
          <AppCard style={styles.sectionCard}>
            <AppText variant="subtitle" bold style={{ marginBottom: 8 }}>Payment Method</AppText>
            <View style={styles.paymentMethodsRow}>
              {(['CASH', 'WALLET', 'UPI'] as const).map((method) => (
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
                    {method === 'CASH' ? '💵 Cash' : method === 'WALLET' ? '👛 Wallet' : '📱 UPI'}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          </AppCard>

          {/* Primary Action Button */}
          <View style={{ marginTop: 6, marginBottom: 30 }}>
            <AppButton variant="primary" onPress={handleConfirmRide} loading={bookingLoading}>
              {pricingMode === 'NEGOTIATED'
                ? `Send Offer • ₹${customOffer} 🤝`
                : bookingType === 'SCHEDULED'
                ? `Confirm Advance Ride • ₹${fareBreakdown.total}`
                : `Confirm & Find Drivers • ₹${fareBreakdown.total}`}
            </AppButton>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* ── Reusable Interactive Location Picker Modal (Driver App UX) ── */}
      {activePickerMode && (
        <LocationPickerModal
          visible={!!activePickerMode}
          mode={activePickerMode}
          title={activePickerMode === 'pickup' ? 'Pick Pickup Location' : activePickerMode === 'drop' ? 'Pick Drop Destination' : 'Pick Stop Location'}
          initialLocation={
            activePickerMode === 'pickup'
              ? { latitude: pickupCoord.latitude, longitude: pickupCoord.longitude, address: pickupAddress }
              : activePickerMode === 'drop'
              ? { latitude: dropCoord.latitude, longitude: dropCoord.longitude, address: dropAddress }
              : activeStopIndex !== null && stops[activeStopIndex]
              ? { latitude: stops[activeStopIndex].lat, longitude: stops[activeStopIndex].lng, address: stops[activeStopIndex].address }
              : undefined
          }
          savedAddresses={savedAddresses}
          onClose={() => {
            setActivePickerMode(null)
            setActiveStopIndex(null)
          }}
          onConfirm={handleLocationConfirmed}
          onAddressSaved={(newAddr) => {
            setSavedAddresses((prev) => [...prev, newAddr])
          }}
        />
      )}

      {/* ── Participant Modal ── */}
      <Modal visible={participantModalVisible} transparent animationType="slide" onRequestClose={() => setParticipantModalVisible(false)}>
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
              <AppButton variant="secondary" onPress={() => setParticipantModalVisible(false)}>Done</AppButton>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Schedule Time Picker Modal ── */}
      <Modal visible={scheduleModalVisible} transparent animationType="slide" onRequestClose={() => setScheduleModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <AppText variant="title" bold center>Schedule Pickup Time</AppText>
            <AppText variant="caption" color="muted" center style={{ marginTop: 4 }}>
              Advance reservations require at least {minLeadTimeMinutes} mins lead time.
            </AppText>

            <View style={[styles.selectedTimePreview, { backgroundColor: `${theme.colors.primary}08`, borderColor: theme.colors.primary }]}>
              <Ionicons name="calendar" size={18} color={theme.colors.primary} />
              <AppText variant="body" bold color="brand" style={{ marginLeft: 8 }}>
                {scheduledDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} at {scheduledDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </AppText>
            </View>

            {Platform.OS === 'android' ? (
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
                        DateTimePickerAndroid.open({
                          value: selectedDate,
                          mode: 'time',
                          is24Hour: false,
                          onChange: (_evTime, selectedTime) => {
                            if (selectedTime) setScheduledDate(selectedTime)
                          },
                        })
                      }
                    },
                  })
                }}
              >
                <Ionicons name="calendar-outline" size={18} color="#FFFFFF" />
                <AppText variant="bodyS" bold style={{ color: '#FFFFFF', marginLeft: 8 }}>Pick Date & Time</AppText>
              </TouchableOpacity>
            ) : (
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
              <AppButton variant="primary" onPress={() => setScheduleModalVisible(false)}>
                ✓ Confirm Pickup Time
              </AppButton>
              <AppButton variant="secondary" onPress={() => setScheduleModalVisible(false)}>
                Cancel
              </AppButton>
            </View>
          </View>
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
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  riderBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
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
    borderRadius: 20,
  },
  locRowContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  routeConnectorCol: {
    width: 24,
    alignItems: 'center',
    marginRight: 6,
    paddingTop: 18,
  },
  pickupGreenDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  connectorLine: {
    width: 2,
    height: 36,
    backgroundColor: '#CBD5E1',
    marginVertical: 4,
  },
  stopYellowDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F59E0B',
  },
  dropRedPin: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  interactiveLocationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  pinEditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98115',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  quickAddrChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  locationActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    marginLeft: 30,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  mapContainer: {
    height: 160,
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
  sizingCounterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
  categoryScroll: {
    gap: 12,
    paddingVertical: 4,
  },
  categoryCard: {
    width: 140,
    padding: 12,
    borderRadius: 16,
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
    borderRadius: 18,
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
  riderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
  },
});
