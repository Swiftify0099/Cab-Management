/**
 * Customer App — Home / Service Discovery Dashboard
 * Route: /(tabs)/
 * Feature 2: Multi-Service Platform & Location Discovery.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  useWindowDimensions,
  Modal,
  Alert,
  Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useFocusEffect } from 'expo-router'
import { Feather, Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import * as Location from 'expo-location'
import { useAuthStore } from '../../src/store/auth.store'
import {
  homeApi,
  profileApi,
  bookingApi,
  smartApi,
  orchestrationApi,
  SmartDestination,
  SmartCompanion,
  SmartDemand,
  JourneyDetail,
} from '../../src/api/client'
import { useTheme } from '../../src/contexts/ThemeContext'
import { useTranslation } from '../../src/i18n'
import {
  AppText,
  AppAvatar,
  AppSearchBar,
  AppButton,
  AppCard,
  AppBadge,
  AppDivider,
} from '../../src/components/ui'
import DevModeModal from '../../src/components/dev/DevModeModal'
import { PromotionsSheet } from '../../src/components/promotions/PromotionsSheet'
import { SmartCompanionCard } from '../../src/components/smart/SmartCompanionCard'
import { reverseGeocodeCoordinate } from '../../src/utils/maps'
import { useCustomerSocket } from '../../src/hooks/useCustomerSocket'

const { width: SCREEN_W } = Dimensions.get('window')

interface ServiceItem {
  code: string
  title: string
  description: string
  category: string
  icon: string
  status: 'AVAILABLE' | 'COMING_SOON' | 'TEMPORARILY_UNAVAILABLE' | 'LOCATION_RESTRICTED'
  badge?: string
  sort_order: number
  route?: string | null
}

interface ActiveRide {
  ride_id: string
  status: string
  pickup_address: string
  destination_address: string
  pickup_lat: number
  pickup_lng: number
  destination_lat: number
  destination_lng: number
  pickup_otp?: string
  estimated_fare: number
  eta_minutes: number
  driver?: {
    id: string
    name: string
    phone: string
    rating: number
    vehicle_model: string
    license_plate: string
  } | null
}

interface UpcomingBooking {
  booking_id: string
  service_type: string
  title: string
  scheduled_time: string
  pickup_address: string
  destination_address?: string
  status: string
}

interface PromoItem {
  id: string
  code: string
  title: string
  description: string
  discount_text: string
  service: string
  banner_gradient?: string[]
}

const DEFAULT_SERVICES: ServiceItem[] = [
  { code: 'ride',      title: 'Intercity Cab',   description: 'One-way & Round-trip', category: 'transport',   icon: 'car-sport', status: 'AVAILABLE', badge: 'Hot',     sort_order: 1, route: '/book/cab' },
  { code: 'parcel',    title: 'Send Parcel',     description: 'Same-day delivery',    category: 'logistics',   icon: 'package',   status: 'AVAILABLE', badge: 'Fast',    sort_order: 2, route: '/parcel-booking' },
  { code: 'hotel',     title: 'Book Hotel',      description: 'Verified Stays',       category: 'hospitality', icon: 'business',  status: 'AVAILABLE', badge: 'Stays',   sort_order: 3, route: '/book/properties' },
  { code: 'transport', title: 'Goods Transport', description: 'Commercial Freight',   category: 'logistics',   icon: 'truck',     status: 'AVAILABLE', badge: 'Cargo',   sort_order: 4, route: '/transport/create' },
  { code: 'airport',   title: 'Airport Transfer',description: 'Flight-Aware & Pickup',category: 'transport',   icon: 'airplane',  status: 'AVAILABLE', badge: '24/7',    sort_order: 5, route: '/airport/book' },
  { code: 'rental',    title: 'Car Rental',      description: 'Hourly / Daily packs', category: 'transport',   icon: 'key',       status: 'AVAILABLE', badge: 'Hourly',  sort_order: 6, route: '/rental' },
  { code: 'corporate', title: 'Corporate Rides', description: 'Business accounts',    category: 'corporate',   icon: 'briefcase', status: 'AVAILABLE', badge: 'Biz',     sort_order: 7, route: '/corporate' },
  { code: 'moving',    title: 'Packers & Movers',description: 'House & office shifting',category: 'logistics',icon: 'truck-fast', status: 'AVAILABLE', badge: 'Movers',  sort_order: 8, route: '/packers' },
  { code: 'outstation',title: 'Outstation Cab',  description: 'Intercity & Return',   category: 'transport',   icon: 'road',      status: 'AVAILABLE', badge: 'Intercity', sort_order: 9, route: '/outstation' },
  { code: 'carpool',   title: 'Intercity Carpool', description: 'Share rides & Save CO2', category: 'transport', icon: 'people', status: 'AVAILABLE', badge: 'Eco',    sort_order: 10, route: '/carpool' },
]

export default function HomeScreen() {
  const { theme, isDark } = useTheme()
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user) as any
  const { width: windowWidth } = useWindowDimensions()

  // Dynamic 4-column responsive sizing for perfect fit on any mobile screen
  const GRID_PADDING = 16
  const GAP = 8
  const COLUMNS = 4
  const itemWidth = Math.floor((windowWidth - (GRID_PADDING * 2) - (GAP * (COLUMNS - 1))) / COLUMNS)

  // Contextual micro-badge formatting per service
  const getBadgeText = (code: string, badge?: string, status?: string) => {
    switch (code) {
      case 'ride': return 'HOT'
      case 'parcel': return 'FAST'
      case 'hotel': return 'STAYS'
      case 'transport': return 'CARGO'
      case 'airport': return '24/7'
      case 'rental': return 'HOURLY'
      case 'corporate': return 'BIZ'
      case 'moving': return 'MOVERS'
      case 'outstation': return 'INTERCITY'
      case 'carpool': return 'ECO'
      default:
        if (status === 'COMING_SOON') return 'SOON'
        return badge ? badge.slice(0, 6).toUpperCase() : null
    }
  }

  // Beautiful gradient icon styling per service category
  const renderServiceIcon = (s: ServiceItem) => {
    let iconName = 'car-sport'
    let iconColor = '#2563EB'
    let gradientColors: [string, string] = isDark ? ['#1E3A8A35', '#1E40AF45'] : ['#EFF6FF', '#DBEAFE']
    let IconComp: any = Ionicons

    switch (s.code) {
      case 'ride':
        iconName = 'car-sport'
        iconColor = '#2563EB'
        gradientColors = isDark ? ['#1E3A8A35', '#1E40AF45'] : ['#EFF6FF', '#DBEAFE']
        IconComp = Ionicons
        break
      case 'parcel':
        iconName = 'package'
        iconColor = '#9333EA'
        gradientColors = isDark ? ['#581C8735', '#6B21A845'] : ['#FAF5FF', '#F3E8FF']
        IconComp = Feather
        break
      case 'hotel':
        iconName = 'business'
        iconColor = '#059669'
        gradientColors = isDark ? ['#064E3B35', '#065F4645'] : ['#ECFDF5', '#D1FAE5']
        IconComp = Ionicons
        break
      case 'airport':
        iconName = 'airplane'
        iconColor = '#0891B2'
        gradientColors = isDark ? ['#164E6335', '#155E7545'] : ['#ECFEFF', '#CFFAFE']
        IconComp = Ionicons
        break
      case 'transport':
        iconName = 'bus'
        iconColor = '#D97706'
        gradientColors = isDark ? ['#78350F35', '#92400E45'] : ['#FFFBEB', '#FEF3C7']
        IconComp = Ionicons
        break
      case 'moving':
        iconName = 'truck-fast'
        iconColor = '#EA580C'
        gradientColors = isDark ? ['#7C2D1235', '#9A341245'] : ['#FFF7ED', '#FFEDD5']
        IconComp = MaterialCommunityIcons
        break
      case 'rental':
        iconName = 'key'
        iconColor = '#6366F1'
        gradientColors = isDark ? ['#312E8135', '#3730A345'] : ['#EEF2FF', '#E0E7FF']
        IconComp = Ionicons
        break
      case 'corporate':
        iconName = 'briefcase'
        iconColor = '#475569'
        gradientColors = isDark ? ['#33415535', '#47556945'] : ['#F1F5F9', '#E2E8F0']
        IconComp = Ionicons
        break
      case 'outstation':
        iconName = 'road-variant'
        iconColor = '#10B981'
        gradientColors = isDark ? ['#064E3B35', '#065F4645'] : ['#ECFDF5', '#D1FAE5']
        IconComp = MaterialCommunityIcons
        break
      case 'carpool':
        iconName = 'people'
        iconColor = '#10B981'
        gradientColors = isDark ? ['#064E3B35', '#065F4645'] : ['#ECFDF5', '#D1FAE5']
        IconComp = Ionicons
        break
      default:
        iconName = 'car-sport'
        iconColor = theme.colors.primary
        gradientColors = isDark ? ['#1E293B', '#334155'] : ['#F1F5F9', '#E2E8F0']
        IconComp = Ionicons
        break
    }

    return (
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.serviceIconCircle}
      >
        <IconComp name={iconName} size={24} color={iconColor} />
      </LinearGradient>
    )
  }

  // UI State
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [devModalVisible, setDevModalVisible] = useState(false)
  const [comingSoonModal, setComingSoonModal] = useState<ServiceItem | null>(null)
  const [showPromosSheet, setShowPromosSheet] = useState(false)

  // Location State
  const [locationStatus, setLocationStatus] = useState<
    'LOADING' | 'AVAILABLE' | 'PERMISSION_REQUIRED' | 'DENIED' | 'UNAVAILABLE'
  >('LOADING')
  const [currentAddress, setCurrentAddress] = useState<string>('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  // Data State
  const [customerName, setCustomerName] = useState<string>('Traveller')
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0)
  const [services, setServices] = useState<ServiceItem[]>(DEFAULT_SERVICES)
  const [savedPlaces, setSavedPlaces] = useState<any[]>([])
  const [recentTrips, setRecentTrips] = useState<any[]>([])
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null)
  const [upcomingBooking, setUpcomingBooking] = useState<UpcomingBooking | null>(null)
  const [promotions, setPromotions] = useState<PromoItem[]>([])

  // Feature 27 Smart Intelligence State
  const [smartDestinations, setSmartDestinations] = useState<SmartDestination[]>([])
  const [smartCompanions, setSmartCompanions] = useState<SmartCompanion[]>([])

  // Phase 6: Org Student proximity alert from socket
  const { orgStudentAlert, clearOrgStudentAlert } = useCustomerSocket()

  const [smartDemand, setSmartDemand] = useState<SmartDemand | null>(null)
  const [smartGreeting, setSmartGreeting] = useState<string>('')

  // Feature 28 Cross-Service Orchestration State
  const [activeJourney, setActiveJourney] = useState<JourneyDetail | null>(null)

  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.02, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start()
  }, [])

  // Stable refs to prevent state re-trigger loops and UI flickering
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null)
  const isResolvingLocation = useRef(false)
  const hasResolvedInitialLocation = useRef(false)

  // ── 1. GPS Location Resolution ─────────────────────────────────────────────
  const resolveLocation = useCallback(async (forceRefresh = false) => {
    if (isResolvingLocation.current && !forceRefresh) return
    isResolvingLocation.current = true

    try {
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync()
      let finalStatus = existingStatus
      if (finalStatus !== 'granted') {
        const req = await Location.requestForegroundPermissionsAsync()
        finalStatus = req.status
      }

      if (finalStatus !== 'granted') {
        setLocationStatus('PERMISSION_REQUIRED')
        setCurrentAddress('Tap to enable GPS location')
        isResolvingLocation.current = false
        return
      }

      if (!hasResolvedInitialLocation.current || forceRefresh) {
        setLocationStatus('LOADING')
      }

      // Fast location acquisition with balanced accuracy
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })

      const newCoords = { lat: loc.coords.latitude, lng: loc.coords.longitude }
      coordsRef.current = newCoords
      setCoords(newCoords)

      // Authoritative reverse-geocoding via Google Maps & native fallback
      const geoAddress = await reverseGeocodeCoordinate(loc.coords.latitude, loc.coords.longitude)
      if (geoAddress && !geoAddress.startsWith('Lat:')) {
        setCurrentAddress(geoAddress)
      } else {
        const places = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        }).catch(() => [])

        if (places && places.length > 0) {
          const p = places[0]
          const formatted = [p.name, p.street || p.district, p.city].filter(Boolean).join(', ')
          setCurrentAddress(formatted || 'Current Location')
        } else {
          setCurrentAddress(geoAddress || 'Current Location')
        }
      }

      setLocationStatus('AVAILABLE')
      hasResolvedInitialLocation.current = true
    } catch (err: any) {
      console.warn('[Location] Resolution error:', err)
      setLocationStatus('UNAVAILABLE')
      if (!currentAddress) {
        setCurrentAddress('Pune, Maharashtra (Default)')
      }
    } finally {
      isResolvingLocation.current = false
    }
  }, [currentAddress])

  // ── 2. Unified Dashboard Data Fetch ────────────────────────────────────────
  const loadDashboardData = useCallback(async () => {
    try {
      const currentLat = coordsRef.current?.lat || coords?.lat
      const currentLng = coordsRef.current?.lng || coords?.lng

      const [summaryRes, addrRes, tripsRes, smartRes, journeysRes] = await Promise.allSettled([
        homeApi.getSummary(),
        profileApi.getAddresses(),
        bookingApi.getMyTrips(),
        smartApi.getHomeFeed({ lat: currentLat, lng: currentLng }),
        orchestrationApi.getJourneys(),
      ])

      if (summaryRes.status === 'fulfilled' && summaryRes.value.data) {
        const d = summaryRes.value.data
        if (d.customer_name) setCustomerName(d.customer_name)
        if (d.unread_notifications_count !== undefined) setUnreadNotifications(d.unread_notifications_count)
        if (d.services && Array.isArray(d.services) && d.services.length > 0) {
          const sanitized = d.services.map((s: ServiceItem) => ({
            ...s,
            status: 'AVAILABLE',
            route: s.route || (
              s.code === 'rental' ? '/rental' :
              s.code === 'corporate' ? '/corporate' :
              s.code === 'moving' ? '/packers' :
              s.code === 'outstation' ? '/outstation' :
              s.code === 'carpool' ? '/carpool' :
              s.code === 'transport' ? '/transport/create' :
              s.code === 'airport' ? '/airport/book' :
              s.code === 'hotel' ? '/book/properties' :
              s.code === 'parcel' ? '/parcel-booking' : '/book/cab'
            ),
            badge: (
              s.code === 'rental' ? 'Hourly' :
              s.code === 'corporate' ? 'Biz' :
              s.code === 'moving' ? 'Movers' :
              s.code === 'outstation' ? 'Intercity' :
              s.code === 'carpool' ? 'Eco' :
              s.code === 'transport' ? 'Cargo' :
              s.code === 'airport' ? '24/7' :
              s.code === 'hotel' ? 'Stays' :
              s.code === 'parcel' ? 'Fast' : 'Hot'
            ),
          }))
          setServices(sanitized)
        }
        if (d.active_ride) setActiveRide(d.active_ride)
        else setActiveRide(null)
        if (d.upcoming_booking) setUpcomingBooking(d.upcoming_booking)
        if (d.promotions && Array.isArray(d.promotions)) setPromotions(d.promotions)
      } else {
        // Fallback to profile
        if (user?.full_name) setCustomerName(user.full_name)
      }

      // Process Smart Intelligence Feed (Feature 27)
      if (smartRes.status === 'fulfilled' && smartRes.value.data) {
        const sm = smartRes.value.data?.data || smartRes.value.data
        if (sm.greeting) setSmartGreeting(sm.greeting)
        if (sm.suggested_destinations && Array.isArray(sm.suggested_destinations)) {
          setSmartDestinations(sm.suggested_destinations)
        }
        if (sm.companion_cards && Array.isArray(sm.companion_cards)) {
          setSmartCompanions(sm.companion_cards)
        }
        if (sm.demand_signal) {
          setSmartDemand(sm.demand_signal)
        }
      }

      // Process Multi-Service Journeys (Feature 28)
      if (journeysRes.status === 'fulfilled' && journeysRes.value.data) {
        const jData = (journeysRes.value.data as any)?.data || journeysRes.value.data
        const list = jData?.journeys || (Array.isArray(jData) ? jData : [])
        if (list.length > 0) {
          setActiveJourney(list[0])
        }
      }

      if (addrRes.status === 'fulfilled') {
        const addrData = addrRes.value.data?.data || addrRes.value.data || []
        setSavedPlaces(Array.isArray(addrData) ? addrData.slice(0, 4) : [])
      }

      if (tripsRes.status === 'fulfilled') {
        const tripData = tripsRes.value.data?.data || tripsRes.value.data || []
        const trips = Array.isArray(tripData) ? tripData : []
        const recent = trips
          .filter((t: any) => t.destination_city || t.dropoff_address)
          .slice(0, 3)
          .map((t: any) => ({
            id: t.id,
            title: t.destination_city || 'Destination',
            subtitle: t.dropoff_address || t.destination_city || '',
          }))
        setRecentTrips(recent)
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user])

  useFocusEffect(
    useCallback(() => {
      loadDashboardData()
      if (!hasResolvedInitialLocation.current) {
        resolveLocation()
      }
    }, [loadDashboardData, resolveLocation])
  )

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return t('home.greeting_morning', 'Good Morning,')
    if (hour < 17) return t('home.greeting_afternoon', 'Good Afternoon,')
    return t('home.greeting_evening', 'Good Evening,')
  }

  const handleServicePress = (service: ServiceItem) => {
    const routeMap: Record<string, string> = {
      ride: '/book/cab',
      parcel: '/parcel-booking',
      hotel: '/book/properties',
      transport: '/transport/create',
      airport: '/airport/book',
      rental: '/rental',
      corporate: '/corporate',
      moving: '/packers',
      outstation: '/outstation',
      carpool: '/carpool',
    }

    const targetRoute = service.route || routeMap[service.code]

    if (service.code === 'ride' || targetRoute === '/book/cab') {
      router.push({
        pathname: '/book/cab',
        params: {
          pickupAddress: currentAddress || undefined,
          pickupLat: coords?.lat ? coords.lat.toString() : undefined,
          pickupLng: coords?.lng ? coords.lng.toString() : undefined,
        },
      } as any)
      return
    }

    if (service.code === 'outstation' || targetRoute === '/outstation') {
      router.push({
        pathname: '/outstation',
        params: {
          pickupAddress: currentAddress || undefined,
          pickupLat: coords?.lat ? String(coords.lat) : undefined,
          pickupLng: coords?.lng ? String(coords.lng) : undefined,
        },
      } as any)
      return
    }

    if (targetRoute) {
      router.push(targetRoute as any)
      return
    }

    if (service.status === 'COMING_SOON' || !service.route) {
      setComingSoonModal(service)
      return
    }
  }

  const handleSavedPlacePress = (place: any) => {
    router.push({
      pathname: '/book/cab',
      params: {
        pickupAddress: currentAddress || undefined,
        pickupLat: coords?.lat ? coords.lat.toString() : undefined,
        pickupLng: coords?.lng ? coords.lng.toString() : undefined,
        dropAddress: place.full_address || place.address || place.label,
      },
    } as any)
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.backgroundAlt }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                resolveLocation(true)
                loadDashboardData()
              }}
              tintColor={theme.colors.primary}
            />
          }
        >
          {/* ── 1. Top Header & Profile ── */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.userInfo}
              onPress={() => router.push('/(tabs)/profile' as any)}
              activeOpacity={0.8}
            >
              <AppAvatar name={customerName} size={46} />
              <View style={styles.greetWrap}>
                <AppText variant="caption" color="secondary">
                  {getGreeting()}
                </AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <AppText variant="title" bold numberOfLines={1}>
                    {customerName}
                  </AppText>
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => setDevModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="code-slash" size={20} color={theme.colors.accent} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => router.push('/notifications' as any)}
                activeOpacity={0.8}
              >
                <Ionicons name="notifications-outline" size={22} color={theme.colors.textPrimary} />
                {unreadNotifications > 0 && (
                  <View style={[styles.badge, { backgroundColor: theme.colors.error }]} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* ── 2. Live Location Bar ── */}
          <TouchableOpacity
            style={[styles.locationBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => {
              if (locationStatus === 'PERMISSION_REQUIRED') {
                resolveLocation()
              } else {
                router.push({ pathname: '/profile/address-picker', params: { mode: 'pick', targetType: 'pickup' } } as any)
              }
            }}
            activeOpacity={0.85}
          >
            <View style={[styles.locationIconWrap, { backgroundColor: `${theme.colors.primary}18` }]}>
              <Ionicons
                name={locationStatus === 'PERMISSION_REQUIRED' ? 'warning' : 'location'}
                size={18}
                color={locationStatus === 'PERMISSION_REQUIRED' ? theme.colors.warning : theme.colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="label" color="muted">
                {locationStatus === 'PERMISSION_REQUIRED' ? 'GPS PERMISSION' : 'CURRENT PICKUP AREA'}
              </AppText>
              {locationStatus === 'LOADING' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <AppText variant="small" color="secondary">{t('home.location_loading', 'Pinpointing location...')}</AppText>
                </View>
              ) : (
                <AppText variant="bodyS" semibold numberOfLines={1} style={{ marginTop: 2 }}>
                  {currentAddress || 'Pune, Maharashtra'}
                </AppText>
              )}
            </View>
            <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          {/* ── 3. Search Bar ("Where to?") ── */}
          <View style={{ marginHorizontal: 20, marginBottom: 12 }}>
            <AppSearchBar
              placeholder={t('home.where_to', 'Where are you heading today?')}
              onPress={() =>
                router.push({
                  pathname: '/book/cab',
                  params: {
                    pickupAddress: currentAddress || undefined,
                    pickupLat: coords?.lat ? coords.lat.toString() : undefined,
                    pickupLng: coords?.lng ? coords.lng.toString() : undefined,
                  },
                } as any)
              }
            />
          </View>

          {/* ── Feature 27: Smart Demand / Surge Signal Banner ── */}
          {smartDemand && smartDemand.is_surge && (
            <View style={[styles.demandBanner, { backgroundColor: `${theme.colors.warning}18`, borderColor: `${theme.colors.warning}35` }]}>
              <Ionicons name="trending-up" size={18} color={theme.colors.warning} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <AppText variant="caption" bold style={{ color: theme.colors.warning }}>
                  High Demand Area ({smartDemand.surge_multiplier}x Multiplier Active)
                </AppText>
                <AppText variant="small" color="secondary" numberOfLines={1}>
                  {smartDemand.advisory_text}
                </AppText>
              </View>
            </View>
          )}

          {/* ── Feature 27: Smart Predicted Destination Chips ── */}
          {smartDestinations.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
              >
                {smartDestinations.map((dest) => {
                  const getDestIcon = () => {
                    if (dest.place_type === 'HOME') return 'home'
                    if (dest.place_type === 'WORK') return 'briefcase'
                    if (dest.title.toLowerCase().includes('airport')) return 'navigation'
                    return 'map-pin'
                  }
                  return (
                    <TouchableOpacity
                      key={dest.id}
                      style={[
                        styles.smartChip,
                        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                      ]}
                      onPress={() =>
                        router.push({
                          pathname: '/book/cab',
                          params: { dropAddress: dest.address, dropLat: String(dest.lat), dropLng: String(dest.lng) },
                        } as any)
                      }
                      activeOpacity={0.8}
                    >
                      <View style={[styles.smartChipIcon, { backgroundColor: `${theme.colors.primary}18` }]}>
                        <Feather name={getDestIcon() as any} size={15} color={theme.colors.primary} />
                      </View>
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <AppText variant="bodyS" bold numberOfLines={1}>
                            {dest.title}
                          </AppText>
                          {dest.eta_minutes && (
                            <AppBadge label={`${dest.eta_minutes}m`} variant="default" size="sm" />
                          )}
                        </View>
                        <AppText variant="small" color="muted" numberOfLines={1} style={{ maxWidth: 140 }}>
                          {dest.reason || dest.address}
                        </AppText>
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            </View>
          )}

          {/* ── Feature 28: Active Multi-Service Journey Hub Card ── */}
          {activeJourney && (
            <TouchableOpacity
              style={[
                styles.journeyCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: activeJourney.attention_required ? theme.colors.warning : theme.colors.primary,
                },
              ]}
              onPress={() => router.push(`/journey/${activeJourney.id}` as any)}
              activeOpacity={0.85}
            >
              <View style={styles.journeyHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialCommunityIcons
                    name="transit-connection-variant"
                    size={18}
                    color={activeJourney.attention_required ? theme.colors.warning : theme.colors.primary}
                  />
                  <AppText variant="bodyS" bold color={activeJourney.attention_required ? 'warning' : 'brand'}>
                    {activeJourney.attention_required ? 'JOURNEY NEEDS ATTENTION' : 'ACTIVE MULTI-SERVICE JOURNEY'}
                  </AppText>
                </View>
                <AppBadge
                  label={activeJourney.status.replace('_', ' ')}
                  variant={activeJourney.attention_required ? 'warning' : 'success'}
                  size="sm"
                />
              </View>

              <AppText variant="body" bold style={{ marginTop: 6 }}>
                {activeJourney.title}
              </AppText>
              <AppText variant="caption" color="muted" style={{ marginTop: 2 }}>
                {activeJourney.links?.length || 1} connected service legs • Tap to view timeline
              </AppText>

              <View style={styles.journeyFooterRow}>
                <AppText variant="caption" color="secondary">
                  Ref #{activeJourney.journey_reference}
                </AppText>
                <AppText variant="caption" bold color="brand">
                  View Full Journey →
                </AppText>
              </View>
            </TouchableOpacity>
          )}

          {/* ── Phase 6: Org Student Proximity Alert Banner ── */}
          {orgStudentAlert && (
            <TouchableOpacity
              onPress={() => {
                clearOrgStudentAlert()
                if (orgStudentAlert.booking_id) {
                  router.push(`/book/seats` as any)
                }
              }}
              activeOpacity={0.85}
              style={{
                marginHorizontal: 16,
                marginBottom: 12,
                borderRadius: 16,
                overflow: 'hidden',
              }}
            >
              <LinearGradient
                colors={['#7C3AED', '#5B21B6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 14,
                  gap: 12,
                }}
              >
                <MaterialCommunityIcons name="bus-alert" size={28} color="#FFFFFF" />
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyS" bold style={{ color: '#FFFFFF' }}>
                    🚌 Your Bus is Almost Here!
                  </AppText>
                  <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                    {orgStudentAlert.message || `Bus is ${orgStudentAlert.distance_km?.toFixed(1)} KM away. Head to the pickup point.`}
                  </AppText>
                </View>
                <TouchableOpacity onPress={clearOrgStudentAlert} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Feather name="x" size={18} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* ── 4. Active Ride Card (Real-Time Live Trip) ── */}
          {activeRide && (
            <Animated.View style={[styles.activeRideWrap, { transform: [{ scale: pulseAnim }] }]}>
              <LinearGradient
                colors={isDark ? ['#1E293B', '#0F172A'] : ['#EFF6FF', '#DBEAFE']}
                style={[styles.activeRideCard, { borderColor: theme.colors.primary }]}
              >
                <View style={styles.activeRideHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[styles.livePulseDot, { backgroundColor: theme.colors.success }]} />
                    <AppText variant="bodyS" bold color="brand">
                      {t('home.active_ride', 'ACTIVE RIDE IN PROGRESS')}
                    </AppText>
                  </View>
                  <AppBadge label={`OTP: ${activeRide.pickup_otp || '4921'}`} variant="success" size="sm" />
                </View>

                {activeRide.driver && (
                  <View style={styles.driverRow}>
                    <View style={[styles.driverAvatarBox, { backgroundColor: `${theme.colors.primary}20` }]}>
                      <Ionicons name="person" size={24} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="body" bold>{activeRide.driver.name}</AppText>
                      <AppText variant="small" color="secondary">
                        {activeRide.driver.vehicle_model} • {activeRide.driver.license_plate} ({activeRide.driver.rating} ★)
                      </AppText>
                    </View>
                    <TouchableOpacity
                      style={[styles.callBtn, { backgroundColor: theme.colors.primary }]}
                      onPress={() => Linking.openURL(`tel:${activeRide.driver?.phone || '100'}`)}
                    >
                      <Ionicons name="call" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                )}

                <AppDivider marginVertical={10} />

                <View style={styles.tripRouteRow}>
                  <View style={[styles.tripDot, { backgroundColor: theme.colors.success }]} />
                  <AppText variant="small" numberOfLines={1} style={{ flex: 1 }}>
                    {activeRide.pickup_address}
                  </AppText>
                </View>
                <View style={[styles.tripRouteRow, { marginTop: 4 }]}>
                  <View style={[styles.tripDot, { backgroundColor: theme.colors.error }]} />
                  <AppText variant="small" numberOfLines={1} style={{ flex: 1 }}>
                    {activeRide.destination_address}
                  </AppText>
                </View>

                <View style={styles.activeRideFooter}>
                  <AppText variant="small" bold color="brand">
                    Arriving in ~{activeRide.eta_minutes} min • ₹{activeRide.estimated_fare}
                  </AppText>
                  <TouchableOpacity
                    style={[styles.trackBtn, { backgroundColor: theme.colors.surface }]}
                    onPress={() => router.push('/(tabs)/trips' as any)}
                  >
                    <AppText variant="caption" bold color="brand">Live GPS →</AppText>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </Animated.View>
          )}

          {/* ── 5. Upcoming Reservation Card ── */}
          {upcomingBooking && !activeRide && (
            <AppCard style={styles.upcomingCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="calendar" size={18} color={theme.colors.accent} />
                  <AppText variant="bodyS" bold color="secondary">
                    {t('home.upcoming_booking', 'UPCOMING RESERVATION')}
                  </AppText>
                </View>
                <AppBadge label={upcomingBooking.status} variant="info" size="sm" />
              </View>
              <AppText variant="body" bold>{upcomingBooking.pickup_address} → {upcomingBooking.destination_address}</AppText>
              <AppText variant="small" color="muted" style={{ marginTop: 2 }}>
                Scheduled for {new Date(upcomingBooking.scheduled_time).toLocaleString()}
              </AppText>
            </AppCard>
          )}

          {/* ── 6. Core Services Grid ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <AppText variant="title" bold>
                {t('home.services_title', 'Explore Services')}
              </AppText>
            </View>

            <View style={styles.servicesGrid}>
              {services.map((s) => {
                const isAvail = s.status === 'AVAILABLE'
                const badgeText = getBadgeText(s.code, s.badge, s.status)

                return (
                  <TouchableOpacity
                    key={s.code}
                    style={[
                      styles.serviceTile,
                      {
                        width: itemWidth,
                        backgroundColor: theme.colors.surface,
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                      },
                    ]}
                    activeOpacity={0.75}
                    onPress={() => handleServicePress(s)}
                  >
                    {/* Floating Micro Badge */}
                    {badgeText && (
                      <View
                        style={[
                          styles.serviceBadge,
                          {
                            backgroundColor: isAvail ? theme.colors.primary : '#F59E0B',
                          },
                        ]}
                      >
                        <AppText variant="caption" bold style={styles.serviceBadgeText}>
                          {badgeText}
                        </AppText>
                      </View>
                    )}

                    {/* Service Icon with Tinted Gradient Container */}
                    {renderServiceIcon(s)}

                    {/* Service Title (Clean 2-line wrap, 0 truncation) */}
                    <AppText
                      variant="caption"
                      bold
                      center
                      numberOfLines={2}
                      style={[
                        styles.serviceTitle,
                        { color: theme.colors.textPrimary },
                      ]}
                    >
                      {s.title}
                    </AppText>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* ── 7. 1-Tap Saved Shortcuts ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <AppText variant="title" bold>
                {t('home.saved_shortcuts', 'Saved Shortcuts')}
              </AppText>
              <TouchableOpacity onPress={() => router.push('/profile/addresses' as any)}>
                <AppText variant="bodyS" color="brand">Manage</AppText>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
              {savedPlaces.map((place) => (
                <TouchableOpacity
                  key={place.id || place.label}
                  style={[styles.savedChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  onPress={() => handleSavedPlacePress(place)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.savedChipIcon, { backgroundColor: `${theme.colors.primary}18` }]}>
                    <Feather
                      name={place.label === 'work' ? 'briefcase' : place.label === 'home' ? 'home' : 'map-pin'}
                      size={16}
                      color={theme.colors.primary}
                    />
                  </View>
                  <View>
                    <AppText variant="bodyS" bold numberOfLines={1}>
                      {place.label ? place.label.charAt(0).toUpperCase() + place.label.slice(1) : 'Place'}
                    </AppText>
                    <AppText variant="caption" color="muted" numberOfLines={1} style={{ maxWidth: 120 }}>
                      {place.full_address || place.address}
                    </AppText>
                  </View>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[styles.savedChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => router.push('/profile/address-picker' as any)}
                activeOpacity={0.8}
              >
                <View style={[styles.savedChipIcon, { backgroundColor: `${theme.colors.primary}18` }]}>
                  <Feather name="plus" size={16} color={theme.colors.primary} />
                </View>
                <AppText variant="bodyS" bold color="brand">+ Add Place</AppText>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* ── 8. Recent Destinations ── */}
          {recentTrips.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <AppText variant="title" bold>
                  {t('home.recent_destinations', 'Recent Destinations')}
                </AppText>
              </View>

              <View style={{ paddingHorizontal: 20, gap: 8 }}>
                {recentTrips.map((trip) => (
                  <TouchableOpacity
                    key={trip.id}
                    style={[styles.recentCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                    onPress={() => router.push({ pathname: '/book/cab', params: { destination: trip.title } } as any)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.recentIconBox, { backgroundColor: `${theme.colors.primary}15` }]}>
                      <Ionicons name="time" size={18} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyS" bold numberOfLines={1}>{trip.title}</AppText>
                      <AppText variant="caption" color="muted" numberOfLines={1}>{trip.subtitle}</AppText>
                    </View>
                    <Feather name="arrow-up-right" size={18} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ── Feature 27: Smart Companion Cross-Service Recommendations ── */}
          {smartCompanions.length > 0 && (
            <View style={{ marginHorizontal: 20, marginBottom: 14 }}>
              {smartCompanions.map((comp) => (
                <SmartCompanionCard
                  key={comp.id}
                  companion={comp}
                  onDismiss={() => setSmartCompanions((prev) => prev.filter((c) => c.id !== comp.id))}
                />
              ))}
            </View>
          )}

          {/* ── 9. Active Promotions & Offers Carousel ── */}
          {promotions.length > 0 && (
            <View style={[styles.section, { marginBottom: 40 }]}>
              <View style={styles.sectionHeaderRow}>
                <AppText variant="title" bold>
                  {t('home.offers_title', 'Offers & Discounts')}
                </AppText>
                <TouchableOpacity onPress={() => setShowPromosSheet(true)}>
                  <AppText variant="bodyS" color="brand">View All</AppText>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
                {promotions.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    activeOpacity={0.9}
                    onPress={() => setShowPromosSheet(true)}
                  >
                    <LinearGradient
                      colors={(p.banner_gradient as any) || ['#4F46E5', '#7C3AED']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.promoCard}
                    >
                      <View style={{ flex: 1 }}>
                        <AppText variant="caption" bold color="white" style={{ opacity: 0.9, letterSpacing: 1 }}>
                          {p.discount_text}
                        </AppText>
                        <AppText variant="subtitle" bold color="white" numberOfLines={1} style={{ marginTop: 2 }}>
                          {p.title}
                        </AppText>
                        <AppText variant="caption" color="white" numberOfLines={2} style={{ opacity: 0.85, marginTop: 4 }}>
                          {p.description}
                        </AppText>
                      </View>
                      <View style={styles.promoCodeChip}>
                        <AppText variant="small" bold color="brand">Use: {p.code}</AppText>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Promotions Bottom Sheet */}
          <PromotionsSheet
            visible={showPromosSheet}
            onClose={() => setShowPromosSheet(false)}
            bookingAmount={250}
            serviceType="CAB"
            onApplyPromo={(p) => {
              Alert.alert('Offer Selected', `Selected offer: ${p.title} (Code: ${p.code || 'Auto-Offer'}). It will be applied at checkout!`)
            }}
          />

        </ScrollView>
      </SafeAreaView>

      {/* ── 10. Coming Soon Informative Modal ── */}
      <Modal
        visible={!!comingSoonModal}
        transparent
        animationType="fade"
        onRequestClose={() => setComingSoonModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[styles.modalIconBox, { backgroundColor: `${theme.colors.warning}22` }]}>
              <Ionicons name="sparkles" size={32} color={theme.colors.warning} />
            </View>
            <AppText variant="h3" bold center style={{ marginTop: 12 }}>
              {comingSoonModal?.title}
            </AppText>
            <AppText variant="bodyS" color="secondary" center style={{ marginTop: 8, paddingHorizontal: 10 }}>
              {t('home.service_coming_soon_desc', 'We are expanding to your route very soon. Stay tuned!')}
            </AppText>
            <View style={{ width: '100%', marginTop: 24 }}>
              <AppButton
                variant="primary"
                onPress={() => setComingSoonModal(null)}
              >
                Got It, Thanks!
              </AppButton>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── 11. Developer Mode Modal ── */}
      <DevModeModal
        visible={devModalVisible}
        onClose={() => setDevModalVisible(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: 60 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  greetWrap: { marginLeft: 12, flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  badge: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  locationIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeRideWrap: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    shadowColor: '#3B82F6',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  activeRideCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
  },
  activeRideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  livePulseDot: { width: 8, height: 8, borderRadius: 4 },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverAvatarBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  callBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tripRouteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tripDot: { width: 6, height: 6, borderRadius: 3 },
  activeRideFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  trackBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },

  upcomingCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
  },

  section: { marginBottom: 24 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },

  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    rowGap: 10,
    columnGap: 8,
    justifyContent: 'flex-start',
  },
  serviceTile: {
    borderRadius: 18,
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
    minHeight: 106,
  },
  serviceBadge: {
    position: 'absolute',
    top: -5,
    right: -2,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
    zIndex: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 3,
  },
  serviceBadgeText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  serviceIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  serviceTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    lineHeight: 14,
    paddingHorizontal: 2,
  },

  journeyCard: {
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  journeyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  journeyFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },

  demandBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  smartChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  smartChipIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  savedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  savedChipIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  recentIconBox: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  promoCard: {
    width: 280,
    borderRadius: 20,
    padding: 18,
    justifyContent: 'space-between',
  },
  promoCodeChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 12,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
