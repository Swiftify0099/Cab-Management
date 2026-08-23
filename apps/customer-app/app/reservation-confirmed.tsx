/**
 * Customer App — Reservation Confirmed Screen
 * Route: /reservation-confirmed
 * Feature 4: Premium dedicated confirmation screen for scheduled advance reservations.
 * Receives params from cab.tsx after successful scheduled booking creation.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Share,
  StatusBar,
  Animated,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'

import { useTheme } from '../src/contexts/ThemeContext'
import { useTranslation } from '../src/i18n'
import { bookingApi } from '../src/api/client'
import {
  AppText,
  AppButton,
  AppCard,
  AppDivider,
} from '../src/components/ui'

export default function ReservationConfirmedScreen() {
  const { theme, isDark } = useTheme()
  const { t } = useTranslation()

  // Params passed from cab.tsx on successful scheduled booking creation
  const params = useLocalSearchParams<{
    reservationId?: string
    scheduledAt?: string   // ISO8601 UTC
    timezone?: string      // e.g. 'Asia/Kolkata'
    category?: string
    fare?: string
    pickup?: string
    destination?: string
    paymentMethod?: string
  }>()

  const [bookingDetail, setBookingDetail] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  // Animations
  const checkScale   = useRef(new Animated.Value(0)).current
  const cardSlide    = useRef(new Animated.Value(40)).current
  const cardOpacity  = useRef(new Animated.Value(0)).current

  // Parse params with fallbacks
  const reservationId  = params.reservationId  || `RES-${Date.now().toString(36).toUpperCase()}`
  const scheduledAtStr = params.scheduledAt    || new Date(Date.now() + 3600 * 2000).toISOString()
  const timezone       = params.timezone       || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
  const category       = params.category       || 'Comfort Sedan'
  const fareAmount     = params.fare           ? parseInt(params.fare, 10) : 0
  const pickupAddress  = params.pickup         || 'Pickup Location'
  const destAddress    = params.destination    || 'Destination'
  const paymentMethod  = params.paymentMethod  || 'CASH'

  const scheduledDate  = new Date(scheduledAtStr)
  const formattedDate  = scheduledDate.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const formattedTime  = scheduledDate.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  })

  // Entry animations
  useEffect(() => {
    Animated.spring(checkScale, {
      toValue: 1,
      friction: 5,
      tension: 100,
      useNativeDriver: true,
      delay: 100,
    }).start()

    Animated.parallel([
      Animated.timing(cardSlide, {
        toValue: 0,
        duration: 500,
        delay: 400,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 500,
        delay: 400,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  // Try to fetch full booking detail for richer display
  useEffect(() => {
    if (!params.reservationId) return
    bookingApi.getBooking(params.reservationId)
      .then(res => setBookingDetail(res.data?.data || res.data))
      .catch(() => { /* use params as fallback */ })
  }, [params.reservationId])

  const handleCopyId = useCallback(() => {
    // React Native Clipboard
    try {
      const { Clipboard } = require('react-native')
      Clipboard.setString(reservationId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }, [reservationId])

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: [
          '🚕 Cab Reservation Confirmed!',
          '',
          `📅 ${formattedDate} at ${formattedTime}`,
          `🚘 ${category}`,
          `📍 ${pickupAddress} → ${destAddress}`,
          `💰 Est. ₹${fareAmount}`,
          '',
          `Reservation ID: ${reservationId}`,
        ].join('\n'),
        title: 'Cab Reservation',
      })
    } catch { /* ignore */ }
  }, [reservationId, formattedDate, formattedTime, category, pickupAddress, destAddress, fareAmount])

  const paymentMethodLabel: Record<string, string> = {
    CASH:          '💵 Cash on Ride',
    WALLET:        '💳 Wallet Balance',
    UPI:           '📱 UPI Payment',
    SHARED_FAMILY: '👨‍👩‍👧 Family Wallet',
  }

  const cancellationPolicy = [
    { text: 'Free cancellation up to 30 minutes before pickup.', color: theme.colors.success },
    { text: '₹50 fee if cancelled 15–30 minutes before pickup.',  color: theme.colors.warning },
    { text: 'No refund within 15 minutes of pickup.',             color: theme.colors.error   },
    { text: 'Refunds credited to wallet within 24 hours.',         color: theme.colors.primary },
  ]

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.backgroundAlt }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => router.replace('/(tabs)/trips' as any)}
          >
            <Feather name="x" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={handleShare}
          >
            <Feather name="share-2" size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Animated Checkmark ── */}
          <View style={styles.checkSection}>
            <Animated.View style={{ transform: [{ scale: checkScale }] }}>
              <LinearGradient
                colors={isDark ? ['#059669', '#10B981'] : ['#10B981', '#34D399']}
                style={styles.checkCircle}
              >
                <Ionicons name="checkmark" size={44} color="#FFFFFF" />
              </LinearGradient>
            </Animated.View>
            <AppText variant="display" bold center style={{ marginTop: 18 }}>
              Reservation Confirmed! 🎉
            </AppText>
            <AppText variant="body" color="secondary" center style={{ marginTop: 8, paddingHorizontal: 24 }}>
              Your ride is reserved. A driver will be dispatched{'\n'}45 minutes before your pickup.
            </AppText>
          </View>

          {/* ── Content (slides in) ── */}
          <Animated.View style={{ opacity: cardOpacity, transform: [{ translateY: cardSlide }] }}>

            {/* Reservation ID */}
            <TouchableOpacity
              style={[styles.idRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={handleCopyId}
              activeOpacity={0.75}
            >
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color="muted">RESERVATION ID</AppText>
                <AppText variant="subtitle" bold style={styles.monospace} numberOfLines={1}>
                  {reservationId.slice(0, 28)}{reservationId.length > 28 ? '…' : ''}
                </AppText>
              </View>
              <View style={[styles.copyChip, { backgroundColor: `${theme.colors.primary}15` }]}>
                <Ionicons
                  name={copied ? 'checkmark' : 'copy-outline'}
                  size={15}
                  color={copied ? theme.colors.success : theme.colors.primary}
                />
                <AppText
                  variant="caption"
                  bold
                  color={copied ? 'success' : 'brand'}
                  style={{ marginLeft: 4 }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </AppText>
              </View>
            </TouchableOpacity>

            {/* Date & Time Card */}
            <AppCard style={[
              styles.dateCard,
              { backgroundColor: isDark ? '#0F2340' : '#EFF6FF', borderColor: theme.colors.primary },
            ]}>
              <View style={styles.dateRow}>
                <View style={[styles.dateIcon, { backgroundColor: theme.colors.primary }]}>
                  <Ionicons name="calendar" size={22} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <AppText variant="caption" color="brand" bold>SCHEDULED PICKUP</AppText>
                  <AppText variant="title" bold style={{ marginTop: 2 }}>{formattedDate}</AppText>
                  <AppText variant="h3" bold color="brand" style={{ marginTop: 2 }}>{formattedTime}</AppText>
                  <AppText variant="caption" color="muted" style={{ marginTop: 2 }}>
                    Timezone: {timezone}
                  </AppText>
                </View>
              </View>
              <View style={[styles.dispatchBanner, { backgroundColor: `${theme.colors.primary}15` }]}>
                <Ionicons name="time-outline" size={14} color={theme.colors.primary} />
                <AppText variant="caption" color="brand" style={{ marginLeft: 6 }}>
                  Driver dispatched 45 min before pickup
                </AppText>
              </View>
            </AppCard>

            {/* Route & Vehicle */}
            <AppCard style={styles.summaryCard}>
              {/* Vehicle */}
              <View style={styles.summaryRow}>
                <View style={[styles.summaryIcon, { backgroundColor: `${theme.colors.primary}15` }]}>
                  <MaterialCommunityIcons name="car" size={18} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <AppText variant="caption" color="muted">VEHICLE</AppText>
                  <AppText variant="body" bold>{category}</AppText>
                </View>
              </View>

              <AppDivider marginVertical={12} />

              {/* Pickup */}
              <View style={styles.summaryRow}>
                <View style={[styles.summaryIcon, { backgroundColor: '#10B98118' }]}>
                  <Ionicons name="radio-button-on" size={18} color="#10B981" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <AppText variant="caption" color="muted">PICKUP</AppText>
                  <AppText variant="body" bold numberOfLines={2}>{pickupAddress}</AppText>
                </View>
              </View>

              <View style={styles.routeConnector}>
                <View style={[styles.connectorLine, { backgroundColor: theme.colors.border }]} />
              </View>

              {/* Destination */}
              <View style={styles.summaryRow}>
                <View style={[styles.summaryIcon, { backgroundColor: '#EF444418' }]}>
                  <Ionicons name="location" size={18} color="#EF4444" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <AppText variant="caption" color="muted">DESTINATION</AppText>
                  <AppText variant="body" bold numberOfLines={2}>{destAddress}</AppText>
                </View>
              </View>
            </AppCard>

            {/* Fare & Payment */}
            <AppCard style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={[styles.summaryIcon, { backgroundColor: '#F59E0B18' }]}>
                  <Ionicons name="cash-outline" size={18} color="#F59E0B" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <AppText variant="caption" color="muted">ESTIMATED FARE</AppText>
                  <AppText variant="h3" bold color="brand">₹{fareAmount}</AppText>
                  <AppText variant="caption" color="muted">May vary based on actual distance</AppText>
                </View>
              </View>
              <AppDivider marginVertical={12} />
              <View style={styles.summaryRow}>
                <View style={[styles.summaryIcon, { backgroundColor: `${theme.colors.accent}18` }]}>
                  <Ionicons name="card-outline" size={18} color={theme.colors.accent} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <AppText variant="caption" color="muted">PAYMENT METHOD</AppText>
                  <AppText variant="body" bold>{paymentMethodLabel[paymentMethod] || paymentMethod}</AppText>
                </View>
              </View>
            </AppCard>

            {/* Status */}
            <View style={[styles.statusRow, {
              backgroundColor: `${theme.colors.success}12`,
              borderColor: `${theme.colors.success}35`,
            }]}>
              <View style={[styles.statusDot, { backgroundColor: theme.colors.success }]} />
              <AppText variant="bodyS" bold color="success" style={{ flex: 1 }}>
                Confirmed — Awaiting Driver Assignment
              </AppText>
            </View>

            {/* Cancellation Policy */}
            <AppCard style={styles.policyCard}>
              <AppText variant="body" bold style={{ marginBottom: 12 }}>📋 Cancellation Policy</AppText>
              {cancellationPolicy.map((item, i) => (
                <View key={i} style={styles.policyItem}>
                  <View style={[styles.policyDot, { backgroundColor: item.color }]} />
                  <AppText variant="bodyS" color="secondary" style={{ flex: 1, marginLeft: 10, lineHeight: 20 }}>
                    {item.text}
                  </AppText>
                </View>
              ))}
            </AppCard>

            {/* CTAs */}
            <View style={{ gap: 12, marginTop: 4, paddingBottom: 8 }}>
              <AppButton
                variant="primary"
                onPress={() => router.replace('/(tabs)/trips' as any)}
              >
                📅 View Upcoming Trips →
              </AppButton>
              <AppButton
                variant="secondary"
                onPress={() => router.replace('/(tabs)/' as any)}
              >
                ← Back to Home
              </AppButton>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
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
  iconBtn: {
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
  },

  // Checkmark
  checkSection: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },

  // Reservation ID
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
  },
  monospace: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  copyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 8,
  },

  // Date card
  dateCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    marginBottom: 14,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dateIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dispatchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
  },

  // Summary cards
  summaryCard: {
    padding: 16,
    borderRadius: 18,
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  routeConnector: {
    paddingLeft: 17,
    marginVertical: 4,
  },
  connectorLine: {
    width: 2,
    height: 22,
    borderRadius: 1,
  },

  // Status
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },

  // Policy
  policyCard: {
    padding: 16,
    borderRadius: 18,
    marginBottom: 14,
  },
  policyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  policyDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginTop: 6,
    flexShrink: 0,
  },
})
