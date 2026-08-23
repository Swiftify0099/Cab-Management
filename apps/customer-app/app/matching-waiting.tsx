/**
 * Customer App — Live Ride Matching & Radar Waiting Screen
 * Route: /matching-waiting
 * Feature 4: Concentric Radar Animation & Real-Time Driver Broadcast.
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

const { width: SCREEN_W } = Dimensions.get('window')

export default function MatchingWaitingScreen() {
  const { theme, isDark } = useTheme()
  const { t } = useTranslation()

  const {
    bookingId,
    rideRequestId,
    tripId: urlTripId,
  } = useLocalSearchParams<{
    bookingId?: string
    rideRequestId?: string
    tripId?: string
  }>()

  const {
    connected,
    joinTrip,
    matchFound,
    tripAccepted,
    tripRejected,
    clearMatchFound,
    clearTripAccepted,
    clearTripRejected,
    sendLocationUpdate,
  } = useCustomerSocket()

  const [timeLeft, setTimeLeft] = useState<number>(120)
  const [matchData, setMatchData] = useState<MatchFoundPayload | null>(null)
  const [cancelling, setCancelling] = useState<boolean>(false)

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
        Animated.timing(pulseCore, { toValue: 1,    duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
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

  // ── Countdown Timer ──
  useEffect(() => {
    if (timeLeft <= 0) return
    const timer = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  // ── WebSocket Room Subscription ──
  useEffect(() => {
    if (!connected) return
    const room = bookingId || rideRequestId || urlTripId
    if (room) {
      joinTrip(room)
    }
  }, [connected, bookingId, rideRequestId, urlTripId, joinTrip])

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
      } catch {}
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
          <AppBadge label={`${timeLeft}s`} variant="info" size="sm" />
        </View>

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

          {/* Simulated Nearby Driver Orbit Dots */}
          <View style={[styles.orbitDriverDot, { top: 70, left: 60, backgroundColor: theme.colors.success }]}>
            <Ionicons name="car" size={12} color="#FFFFFF" />
          </View>
          <View style={[styles.orbitDriverDot, { bottom: 80, right: 70, backgroundColor: theme.colors.accent }]}>
            <Ionicons name="car" size={12} color="#FFFFFF" />
          </View>
        </View>

        {/* ── Bottom Information Card ── */}
        <View style={styles.bottomSection}>
          <AppCard style={styles.infoCard}>
            <AppText variant="h3" bold center>
              {t('track.radar_title', 'Searching Nearby Drivers...')}
            </AppText>
            <AppText variant="bodyS" color="secondary" center style={{ marginTop: 6, paddingHorizontal: 12 }}>
              {t('track.radar_subtitle', 'Broadcasting your ride request to top-rated drivers in your corridor.')}
            </AppText>

            <View style={styles.statusPill}>
              <View style={[styles.liveDot, { backgroundColor: theme.colors.success }]} />
              <AppText variant="caption" bold color="brand">
                {connected ? 'Live PostGIS Corridor Active' : 'Connecting to Dispatch Gateway...'}
              </AppText>
            </View>

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
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1, justifyContent: 'space-between' },

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

  radarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: SCREEN_W,
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
})
