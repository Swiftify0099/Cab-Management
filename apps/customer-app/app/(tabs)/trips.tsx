/**
 * Customer App — Activity History (My Trips)
 * Pixel-perfect from stitch: comprehensive_activity_history
 */
import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl, Modal, TextInput, StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const API = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:80/api/v1'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:         { label: 'Pending',          color: '#B45309', bg: '#FFFBEB' },
  confirmed:       { label: 'Confirmed',         color: '#1D4ED8', bg: '#EFF6FF' },
  payment_pending: { label: 'Pay Now',           color: '#C2410C', bg: '#FFF7ED' },
  paid:            { label: 'Paid',              color: '#065F46', bg: '#ECFDF5' },
  driver_accepted: { label: 'Driver Coming',     color: '#0C4A6E', bg: '#F0F9FF' },
  started:         { label: 'In Progress',       color: '#166534', bg: '#F0FDF4' },
  completed:       { label: 'Ride Completed',    color: '#4C1D95', bg: '#F5F3FF' },
  delivered:       { label: 'Delivered',         color: '#166534', bg: '#F0FDF4' },
  cancelled:       { label: 'Cancelled',         color: '#991B1B', bg: '#FEF2F2' },
}

const FILTERS = ['Upcoming', 'Completed', 'Cancelled']

export default function TripsTab() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState('Upcoming')
  const [cancelModal, setCancelModal] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  const getAuthHeader = async () => {
    const token = await AsyncStorage.getItem('access_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const load = useCallback(async () => {
    try {
      const headers = await getAuthHeader()
      const res = await axios.get(`${API}/bookings/my-trips`, { headers })
      setBookings(res.data.data || [])
    } catch {
      setBookings([
        {
          id: 'b1', type: 'ride', trip_id: 't1', seat_count: 2, has_parcel: false,
          base_fare: 960, platform_fee: 20, total_fare: 980,
          status: 'completed', created_at: new Date(Date.now() - 86400000).toISOString(),
          trip: { pickup_city: 'Seattle', destination_city: 'Portland', departure_time: new Date(Date.now() - 86400000).toISOString() },
        },
        {
          id: 'b2', type: 'parcel', trip_id: 't2', seat_count: 1, has_parcel: true,
          base_fare: 480, platform_fee: 10, total_fare: 540,
          status: 'pending', created_at: new Date().toISOString(),
          trip: { pickup_city: 'San Francisco', destination_city: 'Los Angeles', departure_time: new Date(Date.now() + 7200000).toISOString() },
        },
        {
          id: 'b3', type: 'ride', trip_id: 't3', seat_count: 1, has_parcel: false,
          base_fare: 800, platform_fee: 15, total_fare: 815,
          status: 'completed', created_at: new Date(Date.now() - 172800000).toISOString(),
          trip: { pickup_city: 'Austin', destination_city: 'Dallas', departure_time: new Date(Date.now() - 172800000).toISOString() },
        },
      ])
    } finally {
      setLoading(false); setRefreshing(false)
    }
  }, [])

  useState(() => { load() })

  const onRefresh = () => { setRefreshing(true); load() }

  const handleCancel = async () => {
    if (!cancelModal || !cancelReason.trim()) return
    setCancelling(true)
    try {
      const headers = await getAuthHeader()
      await axios.post(`${API}/bookings/${cancelModal}/cancel`, { reason: cancelReason }, { headers })
      setCancelModal(null); setCancelReason('')
      load()
      Alert.alert('Cancelled', 'Your booking has been cancelled.')
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Cannot cancel this booking')
    } finally { setCancelling(false) }
  }

  const filteredBookings = bookings.filter(b => {
    if (filter === 'Upcoming') return ['pending', 'confirmed', 'paid', 'driver_accepted', 'started'].includes(b.status)
    if (filter === 'Completed') return ['completed', 'delivered'].includes(b.status)
    if (filter === 'Cancelled') return b.status === 'cancelled'
    return true
  })

  if (loading) return (
    <SafeAreaView style={styles.center}>
      <ActivityIndicator size="large" color="#2563EB" />
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7FB" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Activity History</Text>
      </View>

      {/* Segmented Filter */}
      <View style={styles.segmentWrap}>
        <View style={styles.segmentContainer}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.segmentBtn, filter === f && styles.segmentBtnActive]}
            >
              <Text style={[styles.segmentText, filter === f && styles.segmentTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredBookings.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🗺️</Text>
            <Text style={styles.emptyText}>No trips here yet</Text>
            <TouchableOpacity onPress={() => router.push('/book/cab' as any)} style={styles.bookBtn}>
              <Text style={styles.bookBtnText}>Book a Ride →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredBookings.map(booking => {
            const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending
            const dep = booking.trip?.departure_time ? new Date(booking.trip.departure_time) : null
            const canCancel = ['pending', 'confirmed', 'payment_pending'].includes(booking.status)
            const isParcel = booking.has_parcel || booking.type === 'parcel'

            return (
              <View key={booking.id} style={styles.card}>
                {/* Card Top */}
                <View style={styles.cardTop}>
                  <View style={styles.cardIconBox}>
                    {isParcel
                      ? <Feather name="box" size={20} color="#0F172A" />
                      : <MaterialCommunityIcons name="car-outline" size={20} color="#0F172A" />
                    }
                  </View>
                  <Text style={styles.cardType}>{isParcel ? 'Parcel' : 'Ride'}</Text>
                  <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>

                {/* Route */}
                <Text style={styles.route}>
                  {booking.trip?.pickup_city} to {booking.trip?.destination_city}
                </Text>
                {dep && (
                  <Text style={styles.depTime}>
                    {dep.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}, {dep.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}
                <Text style={styles.fare}>₹{booking.total_fare}</Text>

                {/* Actions */}
                {booking.status === 'payment_pending' && (
                  <TouchableOpacity style={styles.payBtn}>
                    <Text style={styles.payBtnText}>💳 Pay ₹{booking.total_fare} Now</Text>
                  </TouchableOpacity>
                )}
                {canCancel && (
                  <TouchableOpacity onPress={() => setCancelModal(booking.id)} style={styles.cancelBtn}>
                    <Text style={styles.cancelBtnText}>Cancel Booking</Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          })
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Cancel Modal */}
      <Modal visible={!!cancelModal} transparent animationType="slide" onRequestClose={() => setCancelModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Cancel Booking</Text>
            <Text style={styles.modalSub}>Please provide a reason</Text>
            <TextInput
              style={styles.reasonInput} multiline numberOfLines={3}
              placeholder="e.g. Change of plans..." placeholderTextColor="#94A3B8"
              value={cancelReason} onChangeText={setCancelReason}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalKeep} onPress={() => { setCancelModal(null); setCancelReason('') }}>
                <Text style={styles.modalKeepText}>Keep</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, (!cancelReason.trim() || cancelling) && { opacity: 0.5 }]}
                onPress={handleCancel} disabled={!cancelReason.trim() || cancelling}
              >
                {cancelling ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalConfirmText}>Confirm Cancel</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F7FB' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4, backgroundColor: '#F4F7FB' },
  pageTitle: { fontSize: 36, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },

  // Segmented control
  segmentWrap: { paddingHorizontal: 20, marginBottom: 20 },
  segmentContainer: {
    backgroundColor: '#E2E8F0', borderRadius: 14, padding: 4,
    flexDirection: 'row',
  },
  segmentBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
  segmentBtnActive: {
    backgroundColor: '#E2ECF8',
    shadowColor: '#3B82F6', shadowOpacity: 0.15, shadowRadius: 4, elevation: 2,
  },
  segmentText: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  segmentTextActive: { fontWeight: '700', color: '#0F172A' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  // Cards
  card: {
    backgroundColor: '#F8FAFC', borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: '#94A3B8', shadowOpacity: 0.15, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: '#FFFFFF',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardIconBox: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  cardType: { fontSize: 16, color: '#0F172A', flex: 1 },
  statusPill: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  statusText: { fontSize: 11, fontWeight: '600' },
  route: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 4, lineHeight: 28 },
  depTime: { fontSize: 14, color: '#0F172A', marginBottom: 8 },
  fare: { fontSize: 18, fontWeight: '600', color: '#0F172A' },

  payBtn: { backgroundColor: '#2563EB', borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 12 },
  payBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  cancelBtn: {
    borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, padding: 10,
    alignItems: 'center', backgroundColor: '#FEF2F2', marginTop: 8,
  },
  cancelBtnText: { color: '#EF4444', fontWeight: '600', fontSize: 12 },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#64748B', marginBottom: 20 },
  bookBtn: { backgroundColor: '#2563EB', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
  bookBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  modalSub: { fontSize: 13, color: '#64748B', marginBottom: 16 },
  reasonInput: {
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14, padding: 14,
    fontSize: 14, color: '#0F172A', marginBottom: 16, minHeight: 80, textAlignVertical: 'top',
  },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalKeep: { flex: 1, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14, padding: 14, alignItems: 'center' },
  modalKeepText: { fontWeight: '700', color: '#64748B' },
  modalConfirm: { flex: 1, backgroundColor: '#EF4444', borderRadius: 14, padding: 14, alignItems: 'center' },
  modalConfirmText: { fontWeight: '700', color: '#FFFFFF' },
})
