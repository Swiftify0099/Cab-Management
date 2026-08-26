/**
 * Customer App — Live Ride Matching & Radar Waiting Screen
 * Route: /matching-waiting
 * Feature 4: Concentric Radar Animation & Real-Time Driver Broadcast.
 * Enhanced: Location summary, nearby drivers from API, 5-min escalation, favourite badges.
 */
import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  StatusBar,
  Dimensions,
  Alert,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import * as Location from 'expo-location'

import { useTheme } from '../src/contexts/ThemeContext'
import { useTranslation } from '../src/i18n'
import {
  useCustomerSocket,
  MatchFoundPayload,
  TripAcceptedPayload,
} from '../src/hooks/useCustomerSocket'
import {
  AppText,
  AppButton,
  AppCard,
  AppBadge,
} from '../src/components/ui'
import { matchingApi, rideApi } from '../src/api/client'
import { DriverInfoModal, NearbyDriverInfo } from '../src/components/matching/DriverInfoModal'

const { width: SCREEN_W } = Dimensions.get('window')
const ESCALATION_TIMEOUT_SEC = 300 // 5 minutes

// Fallback driver data removed — radar shows non-interactive loading blips when API data is pending


export default function MatchingWaitingScreen() {
  const { theme, isDark } = useTheme()
  const { t } = useTranslation()

  const {
    bookingId,
    rideRequestId,
    tripId: urlTripId,
    pickupAddress,
    dropAddress,
    pickupLat,
    pickupLng,
    dropLat,
    dropLng,
    fare,
    serviceType,
  } = useLocalSearchParams<{
    bookingId?: string
    rideRequestId?: string
    tripId?: string
    pickupAddress?: string
    dropAddress?: string
    pickupLat?: string
    pickupLng?: string
    dropLat?: string
    dropLng?: string
    fare?: string
    serviceType?: string
  }>()

  const {
    connected,
    joinTrip,
    joinCustomerRoom,
    matchFound,
    tripAccepted,
    tripRejected,
    clearMatchFound,
    clearTripAccepted,
    clearTripRejected,
    sendLocationUpdate,
  } = useCustomerSocket()

  const [timeLeft, setTimeLeft] = useState<number>(ESCALATION_TIMEOUT_SEC)
  const [matchData, setMatchData] = useState<MatchFoundPayload | null>(null)
  const [cancelling, setCancelling] = useState<boolean>(false)
  const [nearbyDrivers, setNearbyDrivers] = useState<any[]>([])
  const [selectedDriver, setSelectedDriver] = useState<NearbyDriverInfo | null>(null)
  const [escalated, setEscalated] = useState<boolean>(false)
  const [searchStatus, setSearchStatus] = useState<string>('Searching nearby drivers...')
  // Preferred driver request state
  const [preferredRequestSent, setPreferredRequestSent] = useState<string | null>(null)

  // ── Radar Ripple Animations ──
  const ring1 = useRef(new Animated.Value(0)).current
  const ring2 = useRef(new Animated.Value(0)).current
  const ring3 = useRef(new Animated.Value(0)).current
  const pulseCore = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const createRingAnim = (val: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: 2400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      )
    }

    const anim1 = createRingAnim(ring1, 0)
    const anim2 = createRingAnim(ring2, 800)
    const anim3 = createRingAnim(ring3, 1600)

    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseCore, { toValue: 1.15, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseCore, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    )

    anim1.start()
    anim2.start()
    anim3.start()
    pulseAnim.start()

    return () => {
      anim1.stop()
      anim2.stop()
      anim3.stop()
      pulseAnim.stop()
    }
  }, [])

  // ── Countdown Timer with 5-minute escalation ──
  useEffect(() => {
    if (timeLeft <= 0) return
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        const next = Math.max(0, t - 1)
        // Trigger escalation at 0
        if (next === 0 && !escalated) {
          handleEscalation()
        }
        return next
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [timeLeft, escalated])

  // ── 5-minute Escalation: Re-dispatch to wider pool ──
  const handleEscalation = async () => {
    if (escalated) return
    setEscalated(true)
    setSearchStatus('Expanding search radius...')
    try {
      const rId = rideRequestId || bookingId
      if (rId) {
        await matchingApi.reDispatch({
          ride_request_id: rId,
          expanded_radius_km: 25,
        })
        setSearchStatus('Expanded — searching wider area')
        // Reset timer for another round
        setTimeLeft(ESCALATION_TIMEOUT_SEC)
      }
    } catch {
      setSearchStatus('Searching nearby drivers...')
    }
  }

  // ── Fetch nearby drivers: radar display + dispatch trigger ──
  useEffect(() => {
    const fetchNearby = async () => {
      try {
        const lat = parseFloat(pickupLat || '0')
        const lng = parseFloat(pickupLng || '0')
        if (lat === 0 && lng === 0) return

        // 1. GET /rides/radar — returns displayable nearby drivers
        let radarDrivers: any[] = []
        try {
          const radarRes = await matchingApi.getNearbyDrivers({
            pickup_lat: lat, pickup_lng: lng,
            radius_km: escalated ? 25 : 10,
            service_type: serviceType || 'outstation',
          })
          const rd = radarRes.data?.data || radarRes.data
          radarDrivers = rd?.drivers || (Array.isArray(rd) ? rd : [])
          if (radarDrivers.length > 0) {
            setNearbyDrivers(radarDrivers)
            const cnt = radarDrivers.length
            setSearchStatus(cnt + ' driver' + (cnt > 1 ? 's' : '') + ' nearby — sending request...')
          }
        } catch (radarErr) {
          console.warn('[MatchingWaiting] radar fetch error:', radarErr)
        }

        // 2. POST /rides/search-nearby-for-matching — triggers backend dispatch
        try {
          const matchRes = await matchingApi.searchNearbyForMatching({
            pickup_lat: lat, pickup_lng: lng,
            ride_request_id: rideRequestId || bookingId,
            radius_km: escalated ? 25 : 10,
          })
          if (radarDrivers.length === 0) {
            const md = matchRes.data?.data || matchRes.data
            const merged = md?.drivers || (Array.isArray(md) ? md : [])
            if (merged.length > 0) {
              setNearbyDrivers(merged)
              const cnt = merged.length
              setSearchStatus(cnt + ' driver' + (cnt > 1 ? 's' : '') + ' nearby — sending request...')
            }
          }
        } catch (matchErr) {
          console.warn('[MatchingWaiting] search-nearby error:', matchErr)
        }
      } catch (err) {
        console.warn('[MatchingWaiting] fetchNearby outer error:', err)
      }
    }

    fetchNearby()
    const interval = setInterval(fetchNearby, 15000)
    return () => clearInterval(interval)
  }, [pickupLat, pickupLng, rideRequestId, bookingId, escalated, serviceType])

  // ── WebSocket Room Subscription (Bug 5 fix: join BOTH trip room + customer personal room) ──
  useEffect(() => {
    if (!connected) return
    const room = bookingId || rideRequestId || urlTripId
    if (room) {
      joinTrip(room)
    }
    if (joinCustomerRoom) {
      joinCustomerRoom()
    }
  }, [connected, bookingId, rideRequestId, urlTripId, joinTrip, joinCustomerRoom])

  // ── Periodic Location Broadcast ──
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>
    const broadcast = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync()
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
          sendLocationUpdate(loc.coords.latitude, loc.coords.longitude)
        }
      } catch { }
    }
    broadcast()
    intervalId = setInterval(broadcast, 10000)
    return () => clearInterval(intervalId)
  }, [sendLocationUpdate])

  // ── Handle Match Found / Trip Accepted ──
  useEffect(() => {
    if (matchFound) {
      setMatchData(matchFound)
      clearMatchFound()
    }
  }, [matchFound, clearMatchFound])

  useEffect(() => {
    if (tripAccepted) {
      clearTripAccepted()
      const bId = bookingId || rideRequestId || tripAccepted.booking_id
      router.replace({
        pathname: '/track',
        params: { bookingId: bId },
      } as any)
    }
  }, [tripAccepted, bookingId, rideRequestId, clearTripAccepted])

  // Auto transition when match accepted
  const handleProceedToTrack = () => {
    const bId = bookingId || rideRequestId || matchData?.trip_id || 'active_trip'
    router.replace({
      pathname: '/track',
      params: { bookingId: bId },
    } as any)
  }

  // Bug 3 fix: Send a direct "preferred driver" request to a specific driver
  const handleSendPreferredRequest = async (driverId: string) => {
    const driverName = nearbyDrivers.find((d: any) => (d.driver_id || d.id) === driverId)?.full_name || 'this driver'
    try {
      const rId = rideRequestId || bookingId
      if (rId) {
        await rideApi.createRequest({
          request_id: `pref_${Date.now()}_${driverId.slice(0, 6)}`,
          pickup_lat: parseFloat(pickupLat || '18.5204'),
          pickup_lng: parseFloat(pickupLng || '73.8567'),
          pickup_address: pickupAddress || 'Pickup',
          destination_lat: parseFloat(dropLat || '18.5913'),
          destination_lng: parseFloat(dropLng || '73.7389'),
          destination_address: dropAddress || 'Drop',
          preferred_driver_ids: [driverId],
          service_type: serviceType || 'economy',
          pricing_mode: 'STANDARD',
        } as any)
      }
    } catch (err) {
      console.warn('[MatchingWaiting] preferred request error:', err)
    }
    setPreferredRequestSent(driverName)
    setSelectedDriver(null)
    setTimeout(() => setPreferredRequestSent(null), 5000)
  }
  const handleCancelSearch = () => {
    Alert.alert(
      'Cancel Search?',
      'Are you sure you want to stop searching for nearby cabs?',
      [
        { text: 'Keep Searching', style: 'cancel' },
        {
          text: 'Cancel Ride',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true)
            try {
              const rId = rideRequestId || bookingId
              if (rId) {
                const { api } = await import('../src/api/client')
                await api.post('/matching/rides/cancel', {
                  ride_request_id: rId,
                  reason: 'Customer cancelled from matching screen',
                })
              }
            } catch (err) {
              console.warn('[MatchingWaiting] cancel failed:', err)
            } finally {
              router.replace('/(tabs)/' as any)
            }
          },
        },
      ]
    )
  }

  const renderRadarRing = (val: Animated.Value, maxScale: number) => {
    const scale = val.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, maxScale],
    })
    const opacity = val.interpolate({
      inputRange: [0, 0.7, 1],
      outputRange: [0.7, 0.3, 0],
    })
    return (
      <Animated.View
        style={[
          styles.radarRing,
          {
            borderColor: theme.colors.primary,
            transform: [{ scale }],
            opacity,
          },
        ]}
      />
    )
  }

  // Format time as M:SS
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Calculate driver dot positions on radar circle
  const getDriverDotPosition = (index: number, total: number) => {
    const angle = (index / Math.max(total, 1)) * 2 * Math.PI - Math.PI / 2
    const radius = SCREEN_W * 0.28
    const cx = SCREEN_W / 2 - 13
    const cy = SCREEN_W / 2 - 13
    return {
      left: cx + Math.cos(angle) * radius,
      top: cy + Math.sin(angle) * radius,
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.backgroundAlt }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <SafeAreaView style={styles.safeArea}>
        {/* ── Top Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={handleCancelSearch}
          >
            <Feather name="x" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <AppText variant="title" bold style={{ flex: 1, marginLeft: 12 }}>
            Connecting Nearby Cabs
          </AppText>
          <AppBadge label={formatTime(timeLeft)} variant={timeLeft < 60 ? 'warning' : 'info'} size="sm" />
        </View>

        {/* ── Pickup → Drop Route Summary Card ── */}
        {(pickupAddress || dropAddress) && (
          <View style={[styles.routeCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.routeRow}>
              <Ionicons name="radio-button-on" size={14} color="#10B981" />
              <AppText variant="bodyS" numberOfLines={1} style={{ flex: 1, marginLeft: 8 }}>
                {pickupAddress || 'Pickup location'}
              </AppText>
            </View>
            <View style={[styles.routeDivider, { borderColor: theme.colors.border }]} />
            <View style={styles.routeRow}>
              <Ionicons name="location" size={14} color="#EF4444" />
              <AppText variant="bodyS" numberOfLines={1} style={{ flex: 1, marginLeft: 8 }}>
                {dropAddress || 'Drop location'}
              </AppText>
            </View>
            <View style={styles.routeMetaRow}>
              {fare && (
                <AppBadge label={`₹${parseFloat(fare).toFixed(0)}`} variant="info" size="sm" />
              )}
              {serviceType && (
                <AppBadge label={serviceType} variant="default" size="sm" />
              )}
              {nearbyDrivers.length > 0 && (
                <TouchableOpacity activeOpacity={0.7} onPress={() => setSelectedDriver(nearbyDrivers[0])}>
                  <AppBadge label={`${nearbyDrivers.length} drivers nearby • Tap to view`} variant="success" size="sm" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ── Center Concentric Radar ── */}
        <View style={styles.radarContainer}>
          {renderRadarRing(ring1, 2.6)}
          {renderRadarRing(ring2, 3.2)}
          {renderRadarRing(ring3, 3.8)}

          {/* Central Animated Pulse Core */}
          <Animated.View
            style={[
              styles.radarCore,
              {
                backgroundColor: theme.colors.primary,
                transform: [{ scale: pulseCore }],
                shadowColor: theme.colors.primary,
              },
            ]}
          >
            <MaterialCommunityIcons name="car-connected" size={40} color="#FFFFFF" />
          </Animated.View>

          {/* Real Nearby Driver Dots (from API) - Clickable */}
          {nearbyDrivers.slice(0, 8).map((driver, idx) => {
            const pos = getDriverDotPosition(idx, Math.min(nearbyDrivers.length, 8))
            const isFav = driver.is_favourite
            return (
              <TouchableOpacity
                key={driver.driver_id || idx}
                activeOpacity={0.7}
                onPress={() => setSelectedDriver(driver)}
                style={[
                  styles.orbitDriverDot,
                  {
                    top: pos.top,
                    left: pos.left,
                    backgroundColor: isFav ? '#F59E0B' : theme.colors.success,
                    borderWidth: isFav ? 2 : 0,
                    borderColor: isFav ? '#FBBF24' : 'transparent',
                  },
                ]}
              >
                {isFav ? (
                  <AppText variant="caption" style={{ fontSize: 10 }}>⭐</AppText>
                ) : (
                  <Ionicons name="car" size={12} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            )
          })}

          {/* Bug 4 fix: Non-interactive loading blips (no fake driver data) */}
          {nearbyDrivers.length === 0 && (
            <>
              <View style={[styles.orbitDriverDot, { top: 70, left: 60, backgroundColor: theme.colors.primary, opacity: 0.4 }]} pointerEvents="none">
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
              <View style={[styles.orbitDriverDot, { bottom: 80, right: 70, backgroundColor: theme.colors.primary, opacity: 0.35 }]} pointerEvents="none">
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
              <View style={[styles.orbitDriverDot, { top: 120, right: 50, backgroundColor: theme.colors.primary, opacity: 0.3 }]} pointerEvents="none">
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            </>
          )}
        </View>

        {/* Preferred Request Sent Toast */}
        {preferredRequestSent && (
          <View style={[styles.preferredToast, { backgroundColor: '#10B981' }]}>
            <Ionicons name="star" size={18} color="#FFF" />
            <AppText variant="bodyS" bold style={{ color: '#FFF', marginLeft: 8 }}>
              ⭐ Direct request sent to {preferredRequestSent}!
            </AppText>
          </View>
        )}

        {/* ── Bottom Information Card ── */}
        <View style={styles.bottomSection}>
          <AppCard style={styles.infoCard}>
            <AppText variant="h3" bold center>
              {matchData ? '🎉 Driver Found!' : searchStatus}
            </AppText>
            <AppText variant="bodyS" color="secondary" center style={{ marginTop: 6, paddingHorizontal: 12 }}>
              {matchData
                ? 'Your ride has been confirmed. Tap below to track your driver.'
                : escalated
                  ? 'Expanded search radius to find more available drivers for you.'
                  : 'Broadcasting your ride request to top-rated drivers in your corridor.'}
            </AppText>

            <View style={styles.statusPill}>
              <View style={[styles.liveDot, { backgroundColor: theme.colors.success }]} />
              <AppText variant="caption" bold color="brand">
                {connected ? 'Live PostGIS Corridor Active' : 'Connecting to Dispatch Gateway...'}
              </AppText>
            </View>

            {/* Escalation Warning */}
            {escalated && !matchData && (
              <View style={[styles.escalationBanner, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B' }]}>
                <Ionicons name="expand" size={18} color="#F59E0B" />
                <AppText variant="caption" bold style={{ color: '#F59E0B', marginLeft: 8 }}>
                  Search radius expanded — finding more drivers
                </AppText>
              </View>
            )}

            {/* Match Found Prompt */}
            {matchData && (
              <View style={[styles.matchBanner, { backgroundColor: `${theme.colors.success}18`, borderColor: theme.colors.success }]}>
                <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <AppText variant="bodyS" bold color="success">Driver Found Nearby!</AppText>
                  <AppText variant="caption" color="muted">Vehicle dispatched • Tap below to view live tracking.</AppText>
                </View>
              </View>
            )}

            <View style={{ width: '100%', marginTop: 20, gap: 10 }}>
              {matchData ? (
                <AppButton variant="primary" onPress={handleProceedToTrack}>
                  Track Driver Now →
                </AppButton>
              ) : (
                <AppButton variant="secondary" onPress={handleCancelSearch} loading={cancelling}>
                  Cancel Request
                </AppButton>
              )}
            </View>
          </AppCard>
        </View>
      </SafeAreaView>

      {/* Driver Info Modal — Tapping any driver icon/dot opens full profile */}
      <DriverInfoModal
        visible={!!selectedDriver}
        driver={selectedDriver}
        onClose={() => setSelectedDriver(null)}
        onPrioritize={handleSendPreferredRequest}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1, justifyContent: 'space-between' },

  preferredToast: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    zIndex: 999,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  // Route summary card
  routeCard: {
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeDivider: {
    borderLeftWidth: 1.5,
    borderStyle: 'dashed',
    height: 14,
    marginLeft: 7,
    marginVertical: 2,
  },
  routeMetaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },

  radarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: SCREEN_W * 0.85,
    width: SCREEN_W,
    alignSelf: 'center',
  },
  radarRing: {
    position: 'absolute',
    width: SCREEN_W * 0.7,
    height: SCREEN_W * 0.7,
    borderRadius: (SCREEN_W * 0.7) / 2,
    borderWidth: 2,
  },
  radarCore: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  orbitDriverDot: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  infoCard: {
    padding: 20,
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    marginTop: 14,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  matchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 16,
    width: '100%',
  },
  escalationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    width: '100%',
  },
})
