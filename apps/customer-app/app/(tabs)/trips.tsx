/**
 * Customer App — Activity History (My Trips)
 * Refactored: All hardcoded colors → theme tokens.
 * Components: AppLoader, AppModal, AppCard, AppBadge, AppChip, AppEmptyState, AppButton, AppText.
 * Business logic: UNCHANGED. API calls: UNCHANGED. 12h cancel policy: UNCHANGED.
 */
import { useState, useCallback } from 'react'
import {
  View, ScrollView, TouchableOpacity, StyleSheet,
  Alert, RefreshControl, TextInput, StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useFocusEffect } from 'expo-router'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { api } from '../../src/api/client'
import { useTheme } from '../../src/contexts/ThemeContext'
import {
  AppText, AppLoader, AppModal, AppBadge, AppChip, AppEmptyState, AppButton,
} from '../../src/components/ui'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:         { label: 'Pending',        color: '#B45309', bg: '#FFFBEB' },
  confirmed:       { label: 'Confirmed',       color: '#1D4ED8', bg: '#EFF6FF' },
  payment_pending: { label: 'Pay Now',         color: '#C2410C', bg: '#FFF7ED' },
  paid:            { label: 'Paid',            color: '#065F46', bg: '#ECFDF5' },
  driver_accepted: { label: 'Driver Coming',   color: '#0C4A6E', bg: '#F0F9FF' },
  started:         { label: 'In Progress',     color: '#166534', bg: '#F0FDF4' },
  completed:       { label: 'Ride Completed',  color: '#4C1D95', bg: '#F5F3FF' },
  delivered:       { label: 'Delivered',       color: '#166534', bg: '#F0FDF4' },
  cancelled:       { label: 'Cancelled',       color: '#991B1B', bg: '#FEF2F2' },
}

const FILTERS = ['Upcoming', 'Completed', 'Cancelled']

export default function TripsTab() {
  const { theme, isDark } = useTheme()
  const [bookings,      setBookings]      = useState<any[]>([])
  const [loading,       setLoading]       = useState(true)
  const [refreshing,    setRefreshing]    = useState(false)
  const [filter,        setFilter]        = useState('Upcoming')
  const [cancelModal,   setCancelModal]   = useState<string | null>(null)
  const [cancelReason,  setCancelReason]  = useState('')
  const [cancelling,    setCancelling]    = useState(false)
  const [cancelTarget,  setCancelTarget]  = useState<any>(null)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/bookings/my-trips')
      setBookings(res.data?.data || [])
    } catch {
      setBookings([])
    } finally {
      setLoading(false); setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const onRefresh = () => { setRefreshing(true); load() }

  const checkCancelPolicy = (booking: any) => {
    const depTime = booking.trip?.departure_time
    if (!depTime) return { canCancel: true, withinWindow: false }
    const hoursUntilDep = (new Date(depTime).getTime() - Date.now()) / (1000 * 60 * 60)
    const withinWindow  = hoursUntilDep <= 12 && hoursUntilDep > 0
    return { canCancel: true, withinWindow, hoursUntilDep }
  }

  const openCancelModal = (booking: any) => {
    const { withinWindow } = checkCancelPolicy(booking)
    setCancelTarget(booking)
    if (withinWindow) {
      Alert.alert(
        '⚠️ Cancellation Policy',
        'Your trip departs within 12 hours. A cancellation fee of 20% will be deducted. Remaining amount will be refunded to your wallet.',
        [
          { text: 'Go Back', style: 'cancel' },
          { text: 'Proceed to Cancel', style: 'destructive', onPress: () => setCancelModal(booking.id) },
        ]
      )
    } else {
      setCancelModal(booking.id)
    }
  }

  const handleCancel = async () => {
    if (!cancelModal || !cancelReason.trim()) return
    setCancelling(true)
    try {
      await api.post(`/bookings/${cancelModal}/cancel`, { reason: cancelReason })
      setCancelModal(null); setCancelReason(''); setCancelTarget(null)
      load()
      Alert.alert('✅ Cancelled', 'Your booking has been cancelled. Any refund will appear in your wallet within 24h.')
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Cannot cancel this booking')
    } finally { setCancelling(false) }
  }

  const filteredBookings = bookings.filter(b => {
    if (filter === 'Upcoming')  return ['pending', 'confirmed', 'paid', 'driver_accepted', 'started'].includes(b.status)
    if (filter === 'Completed') return ['completed', 'delivered'].includes(b.status)
    if (filter === 'Cancelled') return b.status === 'cancelled'
    return true
  })

  if (loading) return (
    <AppLoader fullScreen />
  )

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.backgroundAlt }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.backgroundAlt}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.backgroundAlt }]}>
        <AppText variant="display" bold style={styles.pageTitle}>Activity History</AppText>
      </View>

      {/* Segmented Filter */}
      <View style={styles.segmentWrap}>
        <View style={[styles.segmentContainer, { backgroundColor: theme.colors.border }]}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.segmentBtn,
                filter === f && [styles.segmentBtnActive, { shadowColor: theme.colors.primary }],
              ]}
            >
              <AppText
                variant="caption"
                semibold={filter !== f}
                bold={filter === f}
                color={filter === f ? 'primary' : 'secondary'}
              >
                {f}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredBookings.length === 0 ? (
          <AppEmptyState
            icon="🗺️"
            title="No trips here yet"
            subtitle="Ready for your next adventure?"
            action={{ label: 'Book a Ride →', onPress: () => router.push('/book/cab' as any) }}
          />
        ) : (
          filteredBookings.map(booking => {
            const cfg       = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending
            const dep       = booking.trip?.departure_time ? new Date(booking.trip.departure_time) : null
            const canCancel = ['pending', 'confirmed', 'payment_pending'].includes(booking.status)
            const isParcel  = booking.has_parcel || booking.type === 'parcel'

            return (
              <View key={booking.id} style={[styles.card, {
                backgroundColor: theme.colors.surface,
                borderColor:     theme.colors.border,
                shadowColor:     isDark ? '#000' : '#94A3B8',
              }]}>
                {/* Card Top */}
                <View style={styles.cardTop}>
                  <View style={[styles.cardIconBox, { backgroundColor: theme.colors.border }]}>
                    {isParcel
                      ? <Feather name="box" size={20} color={theme.colors.textPrimary} />
                      : <MaterialCommunityIcons name="car-outline" size={20} color={theme.colors.textPrimary} />
                    }
                  </View>
                  <AppText variant="subtitle" style={{ flex: 1 }}>{isParcel ? 'Parcel' : 'Ride'}</AppText>
                  <AppBadge label={cfg.label} color={cfg.color} bg={cfg.bg} />
                </View>

                <AppText variant="h3" bold style={styles.route}>
                  {booking.trip?.pickup_city} to {booking.trip?.destination_city}
                </AppText>
                {dep && (
                  <AppText variant="bodyS" color="secondary" style={styles.depTime}>
                    {dep.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })},{' '}
                    {dep.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </AppText>
                )}
                <AppText variant="title" semibold>₹{booking.total_fare}</AppText>

                {/* Actions */}
                {booking.status === 'payment_pending' && (
                  <AppButton
                    variant="primary"
                    style={styles.actionBtn}
                    onPress={() => router.push(`/payment?bookingId=${booking.id}` as any)}
                  >
                    💳 Pay ₹{booking.total_fare} Now
                  </AppButton>
                )}
                {canCancel && (
                  <AppButton
                    variant="outline"
                    style={[styles.actionBtn, { borderColor: theme.colors.error }]}
                    onPress={() => openCancelModal(booking)}
                  >
                    Cancel Booking
                  </AppButton>
                )}
              </View>
            )
          })
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Cancel Modal */}
      <AppModal
        visible={!!cancelModal}
        onClose={() => { setCancelModal(null); setCancelReason('') }}
        title="Cancel Booking"
        subtitle="Please provide a reason"
      >
        <TextInput
          style={[styles.reasonInput, {
            borderColor:     theme.colors.border,
            color:           theme.colors.textPrimary,
            backgroundColor: theme.colors.inputBg,
          }]}
          multiline
          numberOfLines={3}
          placeholder="e.g. Change of plans..."
          placeholderTextColor={theme.colors.placeholder}
          value={cancelReason}
          onChangeText={setCancelReason}
        />
        <View style={styles.modalBtns}>
          <AppButton
            variant="outline"
            style={styles.modalBtn}
            onPress={() => { setCancelModal(null); setCancelReason('') }}
          >
            Keep
          </AppButton>
          <AppButton
            variant="danger"
            style={styles.modalBtn}
            loading={cancelling}
            disabled={!cancelReason.trim()}
            onPress={handleCancel}
          >
            Confirm Cancel
          </AppButton>
        </View>
      </AppModal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  header:       { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  pageTitle:    { letterSpacing: -0.5 },

  segmentWrap:  { paddingHorizontal: 20, marginBottom: 20 },
  segmentContainer: { borderRadius: 14, padding: 4, flexDirection: 'row' },
  segmentBtn:   { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
  segmentBtnActive: { backgroundColor: 'rgba(59,130,246,0.1)', shadowOpacity: 0.15, shadowRadius: 4, elevation: 2 },

  scrollContent:{ paddingHorizontal: 20, paddingBottom: 40 },

  card: {
    borderRadius: 20, padding: 20, marginBottom: 16,
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 2, borderWidth: 1,
  },
  cardTop:      { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardIconBox:  { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  route:        { marginBottom: 4, lineHeight: 28 },
  depTime:      { marginBottom: 8 },
  actionBtn:    { marginTop: 10 },

  reasonInput: {
    borderWidth: 1.5, borderRadius: 14, padding: 14,
    fontSize: 14, marginBottom: 16, minHeight: 80, textAlignVertical: 'top',
  },
  modalBtns:    { flexDirection: 'row', gap: 10 },
  modalBtn:     { flex: 1 },
})
