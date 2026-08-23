/**
 * Customer App — Real-Time Driver Comparison & Negotiation Hub
 * Route: /negotiation
 * Feature 5: Customer Suggested Fare + Driver Offers + Counter-Offers + Comparison + Auto-Matching Fallback.
 *
 * Architecture:
 *   - Real-time offers via useCustomerSocket (NEGOTIATION_DRIVER_OFFER events)
 *   - NEGOTIATION_ASSIGNED → atomic driver assignment → navigate /track
 *   - NEGOTIATION_SESSION_EXPIRED → promote fallback CTA
 *   - Per-offer expires_at countdown → disable Accept on expiry
 *   - Counter-offer bottom sheet modal (Accept/Reject counter)
 *   - Reconnect: calls negotiationApi.getNegotiationState to restore live state
 *   - Dev mode: simulated offers gated behind __DEV__
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  Dimensions,
  Animated,
  Easing,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'

import { useTheme } from '../src/contexts/ThemeContext'
import { useTranslation } from '../src/i18n'
import { negotiationApi } from '../src/api/client'
import {
  useCustomerSocket,
  NegotiationDriverOfferPayload,
} from '../src/hooks/useCustomerSocket'
import {
  AppText,
  AppButton,
  AppCard,
  AppBadge,
  AppAvatar,
  AppDivider,
} from '../src/components/ui'

const { width: SCREEN_W } = Dimensions.get('window')
const NEGOTIATION_TIMEOUT_SEC = 120 // Session-level timeout shown to customer

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DriverOfferItem {
  id: string
  driver_id: string
  driver_name: string
  rating: number
  total_trips: number
  vehicle_model: string
  vehicle_color: string
  vehicle_plate: string
  pickup_distance_km: number
  pickup_eta_min: number
  offer_amount: number
  offer_type: 'EXACT_MATCH' | 'COUNTER_OFFER' | 'COMPETITIVE_OFFER'
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'SUPERSEDED' | 'EXPIRED'
  expires_at: string  // ISO8601 — drives per-card countdown
}

// ─── Per-Offer Expiry Hook ─────────────────────────────────────────────────────
function useOfferExpiry(expiresAt: string): { secondsLeft: number; isExpired: boolean } {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
    return Math.max(diff, 0)
  })

  useEffect(() => {
    if (secondsLeft <= 0) return
    const t = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) { clearInterval(t); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [expiresAt])

  return { secondsLeft, isExpired: secondsLeft <= 0 }
}

// ─── Single Offer Card ────────────────────────────────────────────────────────
interface OfferCardProps {
  offer: DriverOfferItem
  targetOffer: number
  isAccepting: boolean
  onAccept: () => void
  onReject: () => void
  onViewCounter: () => void
  theme: any
}

function OfferCard({ offer, targetOffer, isAccepting, onAccept, onReject, onViewCounter, theme }: OfferCardProps) {
  const { secondsLeft, isExpired } = useOfferExpiry(offer.expires_at)
  const diff = offer.offer_amount - targetOffer
  const isCounter = offer.offer_type === 'COUNTER_OFFER'

  return (
    <AppCard style={[styles.offerCard, { borderColor: isCounter ? theme.colors.warning : theme.colors.border }]}>
      {/* Header: Driver info & rating */}
      <View style={styles.offerHeaderRow}>
        <AppAvatar name={offer.driver_name} size={46} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppText variant="bodyS" bold>{offer.driver_name}</AppText>
            <AppBadge label={`★ ${offer.rating}`} variant="warning" size="sm" />
          </View>
          <AppText variant="caption" color="muted">
            {offer.vehicle_color} {offer.vehicle_model} • {offer.vehicle_plate}
          </AppText>
          <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
            📍 {offer.pickup_eta_min} min away ({offer.pickup_distance_km} km) • {offer.total_trips} rides
          </AppText>
        </View>

        {/* Offer price & type badge */}
        <View style={{ alignItems: 'flex-end' }}>
          <AppText variant="title" bold color={isExpired ? 'muted' : 'brand'}>₹{offer.offer_amount}</AppText>
          {offer.offer_type === 'EXACT_MATCH' && (
            <AppBadge label="Accepted ✓" variant="success" size="sm" />
          )}
          {offer.offer_type === 'COMPETITIVE_OFFER' && (
            <AppBadge label={`🔥 -₹${Math.abs(diff)}`} variant="info" size="sm" />
          )}
          {isCounter && (
            <AppBadge label={`+₹${diff} Counter`} variant="warning" size="sm" />
          )}
          {isExpired && (
            <AppBadge label="Expired" variant="error" size="sm" />
          )}
        </View>
      </View>

      {/* Per-offer countdown */}
      {!isExpired && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
          <Ionicons name="time-outline" size={12} color={secondsLeft < 20 ? theme.colors.error : theme.colors.textMuted} />
          <AppText
            variant="caption"
            color={secondsLeft < 20 ? 'error' : 'muted'}
          >
            Offer valid {secondsLeft}s
          </AppText>
        </View>
      )}

      <AppDivider marginVertical={12} />

      {/* Action row */}
      <View style={styles.offerActionsRow}>
        <TouchableOpacity
          style={[styles.declineBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundAlt }]}
          onPress={onReject}
          disabled={isAccepting || isExpired}
        >
          <Feather name="x" size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>

        {isCounter ? (
          /* Counter-offer: show "View Counter" CTA instead of instant accept */
          <AppButton
            variant="outline"
            style={{ flex: 1 }}
            loading={isAccepting}
            disabled={isExpired}
            onPress={onViewCounter}
          >
            {isExpired ? 'Offer Expired' : `View Counter ₹${offer.offer_amount} →`}
          </AppButton>
        ) : (
          <AppButton
            variant="primary"
            style={{ flex: 1 }}
            loading={isAccepting}
            disabled={isExpired}
            onPress={onAccept}
          >
            {isExpired ? 'Offer Expired' : `Accept ₹${offer.offer_amount} & Ride 🚗`}
          </AppButton>
        )}
      </View>
    </AppCard>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NegotiationHubScreen() {
  const { theme, isDark } = useTheme()
  const { t } = useTranslation()

  const params = useLocalSearchParams<{
    rideRequestId?: string
    suggestedFare?: string
    standardFare?: string
    categoryName?: string
  }>()

  const rideRequestId = params.rideRequestId || `req_${Date.now()}`
  const targetOffer   = parseInt(params.suggestedFare || '250', 10)
  const standardFare  = parseInt(params.standardFare || '280', 10)
  const categoryName  = params.categoryName || 'Comfort Sedan'

  // ── Socket ──
  const {
    connected,
    joinTrip,
    leaveTrip,
    on,
    off,
    negotiationDriverOffer,
    negotiationSessionExpired,
    negotiationAssigned,
    negotiationFallback,
    clearNegotiationDriverOffer,
    clearNegotiationSessionExpired,
    clearNegotiationAssigned,
    clearNegotiationFallback,
  } = useCustomerSocket()

  // ── State ──
  const [secondsRemaining, setSecondsRemaining]     = useState<number>(NEGOTIATION_TIMEOUT_SEC)
  const [sessionExpired, setSessionExpired]         = useState<boolean>(false)
  const [acceptingOfferId, setAcceptingOfferId]     = useState<string | null>(null)
  const [cancelModalVisible, setCancelModalVisible] = useState<boolean>(false)
  const [offers, setOffers]                         = useState<DriverOfferItem[]>([])

  // Counter-offer modal
  const [counterModalVisible, setCounterModalVisible] = useState<boolean>(false)
  const [counterOffer, setCounterOffer]               = useState<DriverOfferItem | null>(null)
  const [counterAccepting, setCounterAccepting]       = useState<boolean>(false)

  // ── Animated Radar Ripple ──
  const pulseAnim = useRef(new Animated.Value(0)).current

  // ── 1. Session timer ──────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setSessionExpired(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // ── 2. Radar animation ────────────────────────────────────────────────────
  useEffect(() => {
    Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    ).start()
  }, [pulseAnim])

  // ── 3. Join negotiation socket room + reconnect restore ───────────────────
  useEffect(() => {
    if (!connected) return
    // Join the ride-specific room so backend can route NEGOTIATION_* events to us
    joinTrip(rideRequestId)
    console.log('[NegotiationHub] Joined socket room for:', rideRequestId)

    // Reconnect restore — fetch any existing offers that arrived while offline
    const restoreState = async () => {
      try {
        const res = await negotiationApi.getNegotiationState(rideRequestId)
        const data = res.data?.data || res.data
        if (Array.isArray(data?.offers) && data.offers.length > 0) {
          console.log('[NegotiationHub] Restored', data.offers.length, 'offers from backend')
          setOffers((prev) => {
            // Merge without duplicates
            const existingIds = new Set(prev.map((o) => o.id))
            const fresh = data.offers.filter((o: DriverOfferItem) => !existingIds.has(o.id))
            return [...prev, ...fresh]
          })
        }
      } catch {
        // Backend may not have negotiation-state endpoint yet — fail silently
        console.log('[NegotiationHub] Could not restore negotiation state (backend may not be up)')
      }
    }
    restoreState()

    return () => {
      leaveTrip(rideRequestId)
    }
  }, [connected, rideRequestId, joinTrip, leaveTrip])

  // ── 4. React to NEGOTIATION_DRIVER_OFFER socket event ────────────────────
  useEffect(() => {
    if (!negotiationDriverOffer) return

    const incoming = negotiationDriverOffer.offer
    if (!incoming) return

    console.log('[NegotiationHub] New offer from socket:', incoming.id, incoming.offer_type)

    setOffers((prev) => {
      // Deduplicate by offer id
      if (prev.find((o) => o.id === incoming.id)) return prev

      const newOffer: DriverOfferItem = {
        id:                  incoming.id,
        driver_id:           incoming.driver_id,
        driver_name:         incoming.driver_name,
        rating:              incoming.rating,
        total_trips:         incoming.total_trips,
        vehicle_model:       incoming.vehicle_model,
        vehicle_color:       incoming.vehicle_color,
        vehicle_plate:       incoming.vehicle_plate,
        pickup_distance_km:  incoming.pickup_distance_km,
        pickup_eta_min:      incoming.pickup_eta_min,
        offer_amount:        incoming.offer_amount,
        offer_type:          incoming.offer_type,
        status:              incoming.status || 'PENDING',
        expires_at:          incoming.expires_at || new Date(Date.now() + 45_000).toISOString(),
      }
      return [...prev, newOffer]
    })
    clearNegotiationDriverOffer()
  }, [negotiationDriverOffer, clearNegotiationDriverOffer])

  // ── 5. React to NEGOTIATION_SESSION_EXPIRED ───────────────────────────────
  useEffect(() => {
    if (!negotiationSessionExpired) return
    console.log('[NegotiationHub] Session expired:', negotiationSessionExpired.reason)
    setSessionExpired(true)
    setSecondsRemaining(0)
    clearNegotiationSessionExpired()
  }, [negotiationSessionExpired, clearNegotiationSessionExpired])

  // ── 6. React to NEGOTIATION_ASSIGNED (atomic assignment confirmed) ─────────
  useEffect(() => {
    if (!negotiationAssigned) return
    const { booking_id, agreed_fare, driver } = negotiationAssigned
    console.log('[NegotiationHub] Assignment confirmed booking:', booking_id)

    Alert.alert(
      'Driver Assigned! 🚗',
      `${driver.full_name} is on the way for ₹${agreed_fare}. ETA ${driver.pickup_eta_min} min.`,
      [
        {
          text: 'Track Driver →',
          onPress: () => {
            clearNegotiationAssigned()
            router.replace({
              pathname: '/track',
              params: {
                bookingId: booking_id,
                driverName: driver.full_name,
                agreedFare: agreed_fare.toString(),
              },
            } as any)
          },
        },
      ],
      { cancelable: false }
    )
  }, [negotiationAssigned, clearNegotiationAssigned])

  // ── 7. React to NEGOTIATION_FALLBACK (backend auto-switched) ─────────────
  useEffect(() => {
    if (!negotiationFallback) return
    console.log('[NegotiationHub] Backend triggered fallback')
    clearNegotiationFallback()
    router.replace({
      pathname: '/matching-waiting',
      params: { rideRequestId, bookingId: rideRequestId },
    } as any)
  }, [negotiationFallback, clearNegotiationFallback, rideRequestId])

  // ── 8. DEV MODE — Simulated offers (only in development) ─────────────────
  useEffect(() => {
    if (!__DEV__) return  // Never runs in production

    const defaultExpiry = (addSec: number) =>
      new Date(Date.now() + addSec * 1000).toISOString()

    const t1 = setTimeout(() => {
      setOffers((prev) => {
        if (prev.find((o) => o.id === 'dev_off_001')) return prev
        return [...prev, {
          id: 'dev_off_001', driver_id: 'd_sunil', driver_name: 'Sunil Shinde',
          rating: 4.8, total_trips: 1240, vehicle_model: 'Maruti Dzire',
          vehicle_color: 'Silver', vehicle_plate: 'MH-12-DE-4921',
          pickup_distance_km: 1.8, pickup_eta_min: 4,
          offer_amount: targetOffer, offer_type: 'EXACT_MATCH',
          status: 'PENDING', expires_at: defaultExpiry(45),
        }]
      })
    }, 3000)

    const t2 = setTimeout(() => {
      setOffers((prev) => {
        if (prev.find((o) => o.id === 'dev_off_002')) return prev
        return [...prev, {
          id: 'dev_off_002', driver_id: 'd_rahul', driver_name: 'Rahul Sharma',
          rating: 4.9, total_trips: 2180, vehicle_model: 'Honda City',
          vehicle_color: 'White', vehicle_plate: 'MH-14-AB-9012',
          pickup_distance_km: 1.2, pickup_eta_min: 3,
          offer_amount: Math.max(Math.round(targetOffer * 0.95 / 10) * 10, 200),
          offer_type: 'COMPETITIVE_OFFER', status: 'PENDING', expires_at: defaultExpiry(50),
        }]
      })
    }, 7000)

    const t3 = setTimeout(() => {
      setOffers((prev) => {
        if (prev.find((o) => o.id === 'dev_off_003')) return prev
        return [...prev, {
          id: 'dev_off_003', driver_id: 'd_amit', driver_name: 'Amit More',
          rating: 4.7, total_trips: 890, vehicle_model: 'Hyundai Verna',
          vehicle_color: 'Black', vehicle_plate: 'MH-12-XY-5544',
          pickup_distance_km: 2.6, pickup_eta_min: 6,
          offer_amount: targetOffer + 50, offer_type: 'COUNTER_OFFER',
          status: 'PENDING', expires_at: defaultExpiry(60),
        }]
      })
    }, 11000)

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3)
    }
  }, [targetOffer])

  // ── Accept Offer ──────────────────────────────────────────────────────────
  const handleAcceptOffer = useCallback(async (offer: DriverOfferItem) => {
    setAcceptingOfferId(offer.id)
    try {
      await negotiationApi.acceptOffer(rideRequestId, offer.id)
      // NEGOTIATION_ASSIGNED socket event will navigate to /track.
      // Fallback: if socket delivery fails, navigate directly.
      setTimeout(() => {
        if (acceptingOfferId === offer.id) {
          // Still accepting after 4 seconds — socket may be slow; navigate directly
          router.replace({
            pathname: '/track',
            params: { bookingId: rideRequestId, driverName: offer.driver_name },
          } as any)
        }
      }, 4000)
    } catch {
      // API failed in demo — navigate anyway
      Alert.alert(
        'Driver Assigned! 🚗',
        `${offer.driver_name} is on the way for ₹${offer.offer_amount}.`,
        [{
          text: 'Track Driver →',
          onPress: () => router.replace({
            pathname: '/track',
            params: { bookingId: rideRequestId, driverName: offer.driver_name },
          } as any),
        }]
      )
    } finally {
      setAcceptingOfferId(null)
    }
  }, [rideRequestId, acceptingOfferId])

  // ── Reject Offer ──────────────────────────────────────────────────────────
  const handleRejectOffer = useCallback(async (offerId: string) => {
    setOffers((prev) => prev.filter((o) => o.id !== offerId))
    try {
      await negotiationApi.rejectOffer(rideRequestId, offerId)
    } catch { /* fail silently — UI already updated */ }
  }, [rideRequestId])

  // ── Counter-offer Modal: View ─────────────────────────────────────────────
  const handleViewCounter = useCallback((offer: DriverOfferItem) => {
    setCounterOffer(offer)
    setCounterModalVisible(true)
  }, [])

  // ── Counter-offer: Accept ─────────────────────────────────────────────────
  const handleAcceptCounter = useCallback(async () => {
    if (!counterOffer) return
    setCounterAccepting(true)
    try {
      await negotiationApi.acceptCounterOffer(rideRequestId, counterOffer.id)
      setCounterModalVisible(false)
      // NEGOTIATION_ASSIGNED socket event navigates to /track
      setTimeout(() => {
        router.replace({
          pathname: '/track',
          params: { bookingId: rideRequestId, driverName: counterOffer.driver_name },
        } as any)
      }, 3500)
    } catch {
      setCounterModalVisible(false)
      router.replace({
        pathname: '/track',
        params: { bookingId: rideRequestId, driverName: counterOffer?.driver_name || '' },
      } as any)
    } finally {
      setCounterAccepting(false)
    }
  }, [counterOffer, rideRequestId])

  // ── Counter-offer: Reject ─────────────────────────────────────────────────
  const handleRejectCounter = useCallback(async () => {
    if (!counterOffer) return
    setCounterModalVisible(false)
    await handleRejectOffer(counterOffer.id)
    setCounterOffer(null)
  }, [counterOffer, handleRejectOffer])

  // ── Fallback to Standard Dispatch ────────────────────────────────────────
  const handleFallbackToStandard = useCallback(async () => {
    try {
      await negotiationApi.fallbackToStandard(rideRequestId)
    } catch { /* fallback regardless */ }
    router.replace({
      pathname: '/matching-waiting',
      params: { rideRequestId, bookingId: rideRequestId },
    } as any)
  }, [rideRequestId])

  // ── Cancel Negotiation ────────────────────────────────────────────────────
  const handleCancelNegotiation = useCallback(async () => {
    setCancelModalVisible(false)
    try {
      await negotiationApi.cancelNegotiation(rideRequestId, 'Customer cancelled negotiation')
    } catch { /* ignore */ }
    router.back()
  }, [rideRequestId])

  // ── Radar animation interpolations ───────────────────────────────────────
  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] })
  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0.6, 0.2, 0] })

  // Timer color: green → amber → red
  const timerColor = secondsRemaining > 60
    ? theme.colors.success
    : secondsRemaining > 20
      ? theme.colors.warning
      : theme.colors.error

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.backgroundAlt }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* ── Top Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => setCancelModalVisible(true)}
          >
            <Feather name="x" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText variant="title" bold>
              {t('negotiation.title', 'Negotiate Your Fare')}
            </AppText>
            <AppText variant="caption" color="secondary">
              {categoryName} • {connected ? '🟢 Live' : '🔴 Reconnecting...'}
            </AppText>
          </View>

          {/* Session Countdown Pill */}
          <View style={[styles.timerPill, { backgroundColor: `${timerColor}15`, borderColor: timerColor }]}>
            <Ionicons name="time-outline" size={16} color={timerColor} />
            <AppText variant="caption" bold style={{ color: timerColor }}>
              {sessionExpired ? 'Expired' : `${secondsRemaining}s`}
            </AppText>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* ── Session Expired Banner ── */}
          {sessionExpired && (
            <AppCard style={[styles.expiredBanner, { backgroundColor: `${theme.colors.error}10`, borderColor: theme.colors.error }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="alert-circle" size={22} color={theme.colors.error} />
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyS" bold color="error">Negotiation Session Expired</AppText>
                  <AppText variant="caption" color="muted">
                    {t('negotiation.session_expired', 'No drivers accepted your fare in time. Use Standard Dispatch below.')}
                  </AppText>
                </View>
              </View>
            </AppCard>
          )}

          {/* ── Target Proposal Card ── */}
          <AppCard style={[styles.proposalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <AppText variant="caption" color="muted">YOUR PROPOSED FARE</AppText>
                <AppText variant="display" bold color="brand">₹{targetOffer}</AppText>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <AppText variant="caption" color="muted">Standard Estimate</AppText>
                <AppText variant="title" bold style={{ textDecorationLine: 'line-through' }}>₹{standardFare}</AppText>
              </View>
            </View>

            <AppDivider marginVertical={10} />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="radio-button-on" size={14} color={connected ? theme.colors.success : theme.colors.warning} />
              <AppText variant="caption" color="secondary">
                {connected
                  ? t('negotiation.waiting_subtitle', 'Nearby drivers are reviewing your fare proposal. Compare incoming offers below.')
                  : 'Reconnecting to live server...'}
              </AppText>
            </View>
          </AppCard>

          {/* ── Active Radar (no offers yet) ── */}
          {offers.length === 0 && !sessionExpired && (
            <View style={styles.radarBox}>
              <Animated.View
                style={[
                  styles.radarPulseRing,
                  {
                    borderColor: theme.colors.primary,
                    transform: [{ scale: pulseScale }],
                    opacity: pulseOpacity,
                  },
                ]}
              />
              <View style={[styles.radarCore, { backgroundColor: theme.colors.primary }]}>
                <Ionicons name="car-sport" size={28} color="#FFFFFF" />
              </View>
              <AppText variant="body" bold center style={{ marginTop: 24 }}>
                {t('negotiation.waiting_title', 'Broadcasting Your Offer...')}
              </AppText>
              <AppText variant="caption" color="muted" center style={{ marginTop: 4 }}>
                Reaching out to top-rated drivers in your pickup corridor
              </AppText>
              {__DEV__ && (
                <AppText variant="caption" color="muted" center style={{ marginTop: 8, opacity: 0.5 }}>
                  [DEV] Simulated offers will appear in ~3s
                </AppText>
              )}
            </View>
          )}

          {/* ── Live Driver Offers List ── */}
          {offers.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <AppText variant="subtitle" bold>
                  {t('negotiation.driver_offers_title', 'Live Driver Offers')} ({offers.length})
                </AppText>
                <AppBadge label={connected ? 'Live ⚡' : 'Offline'} variant={connected ? 'success' : 'error'} size="sm" />
              </View>

              {offers.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  targetOffer={targetOffer}
                  isAccepting={acceptingOfferId === offer.id}
                  onAccept={() => handleAcceptOffer(offer)}
                  onReject={() => handleRejectOffer(offer.id)}
                  onViewCounter={() => handleViewCounter(offer)}
                  theme={theme}
                />
              ))}
            </View>
          )}

          {/* ── Auto-Matching Fallback Card ── */}
          <AppCard style={[
            styles.fallbackCard,
            {
              backgroundColor: sessionExpired ? `${theme.colors.primary}15` : `${theme.colors.primary}08`,
              borderColor: sessionExpired ? theme.colors.primary : theme.colors.border,
            },
          ]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="swap-horizontal" size={24} color={theme.colors.primary} />
              <View style={{ flex: 1 }}>
                <AppText variant="bodyS" bold>Instant Auto-Match Fallback</AppText>
                <AppText variant="caption" color="muted">
                  {t('negotiation.fallback_desc', 'Switch to standard platform matching at the estimated fare.')}
                </AppText>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.fallbackActionBtn, { backgroundColor: theme.colors.primary }]}
              onPress={handleFallbackToStandard}
            >
              <AppText variant="bodyS" bold color="white">
                {`Switch to Standard Dispatch (₹${standardFare}) →`}
              </AppText>
            </TouchableOpacity>
          </AppCard>
        </ScrollView>
      </SafeAreaView>

      {/* ── Counter-Offer Detail Modal ── */}
      <Modal
        visible={counterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCounterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.counterModalBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {/* Handle */}
            <View style={[styles.modalHandle, { backgroundColor: theme.colors.border }]} />

            <AppText variant="title" bold center style={{ marginTop: 12 }}>
              Driver Counter-Offer
            </AppText>
            <AppText variant="caption" color="muted" center style={{ marginTop: 4 }}>
              {counterOffer?.driver_name} has proposed a different fare
            </AppText>

            <AppDivider marginVertical={16} />

            {/* Fare Comparison */}
            <View style={styles.fareCompareRow}>
              <View style={[styles.fareBox, { backgroundColor: `${theme.colors.primary}10`, borderColor: theme.colors.primary }]}>
                <AppText variant="caption" color="muted">YOUR OFFER</AppText>
                <AppText variant="display" bold color="brand">₹{targetOffer}</AppText>
              </View>
              <View style={styles.vsBox}>
                <Ionicons name="swap-horizontal" size={20} color={theme.colors.textMuted} />
              </View>
              <View style={[styles.fareBox, { backgroundColor: `${theme.colors.warning}10`, borderColor: theme.colors.warning }]}>
                <AppText variant="caption" color="muted">DRIVER COUNTER</AppText>
                <AppText variant="display" bold color="brand">₹{counterOffer?.offer_amount}</AppText>
              </View>
            </View>

            {counterOffer && (
              <View style={{ marginTop: 12, alignItems: 'center' }}>
                <AppText variant="bodyS" color="muted">
                  Difference:{' '}
                  <AppText variant="bodyS" bold color={counterOffer.offer_amount > targetOffer ? 'error' : 'success'}>
                    {counterOffer.offer_amount > targetOffer ? '+' : '-'}₹{Math.abs(counterOffer.offer_amount - targetOffer)}
                  </AppText>
                </AppText>
                <AppText variant="caption" color="secondary" style={{ marginTop: 4 }}>
                  {counterOffer.vehicle_color} {counterOffer.vehicle_model} • ★ {counterOffer.rating} • {counterOffer.total_trips} rides
                </AppText>
              </View>
            )}

            <AppDivider marginVertical={16} />

            {/* Actions */}
            <View style={{ gap: 10 }}>
              <AppButton
                variant="primary"
                loading={counterAccepting}
                onPress={handleAcceptCounter}
              >
                {`Accept ₹${counterOffer?.offer_amount} & Confirm Ride 🚗`}
              </AppButton>
              <AppButton variant="secondary" onPress={handleRejectCounter} disabled={counterAccepting}>
                Decline Counter — Keep Waiting
              </AppButton>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Cancel Negotiation Modal ── */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <AppText variant="title" bold center>Cancel Negotiation?</AppText>
            <AppText variant="caption" color="muted" center style={{ marginTop: 4 }}>
              Are you sure you want to stop negotiating and cancel this request?
            </AppText>

            <View style={{ marginTop: 20, gap: 10 }}>
              <AppButton variant="danger" onPress={handleCancelNegotiation}>
                Cancel Request
              </AppButton>
              <AppButton variant="secondary" onPress={() => setCancelModalVisible(false)}>
                Keep Waiting
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
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 14,
  },
  expiredBanner: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  proposalCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  radarBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  radarPulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
  },
  radarCore: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  offerCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
  },
  offerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  offerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  declineBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  fallbackCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 6,
    gap: 12,
  },
  fallbackActionBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  // Counter-offer modal
  counterModalBox: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    paddingBottom: 36,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
  },
  fareCompareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  fareBox: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  vsBox: {
    padding: 6,
  },
  // Cancel modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 0,
  },
  modalBox: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    paddingBottom: 36,
  },
})
