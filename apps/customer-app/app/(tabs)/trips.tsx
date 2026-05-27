/**
 * Customer App — My Trips Tab
 * Shows all bookings with status, route, fare, and cancel option.
 */
import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl, Modal, TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const API = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:80/api/v1'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:         { label: 'Pending',         color: '#B45309', bg: '#FFFBEB' },
  confirmed:       { label: 'Confirmed',       color: '#1D4ED8', bg: '#EFF6FF' },
  payment_pending: { label: 'Pay Now',         color: '#C2410C', bg: '#FFF7ED' },
  paid:            { label: 'Paid ✅',         color: '#065F46', bg: '#ECFDF5' },
  driver_accepted: { label: 'Driver Coming 🚗',color: '#0C4A6E', bg: '#F0F9FF' },
  started:         { label: 'In Progress 🚀',  color: '#166534', bg: '#F0FDF4' },
  completed:       { label: 'Completed ✅',    color: '#4C1D95', bg: '#F5F3FF' },
  cancelled:       { label: 'Cancelled',       color: '#991B1B', bg: '#FEF2F2' },
}

const FILTERS = ['All', 'upcoming', 'completed', 'cancelled']

export default function TripsTab() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState('All')
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
      // Demo data
      setBookings([
        {
          id: 'b1', trip_id: 't1', seat_count: 2, has_parcel: false,
          base_fare: 960, platform_fee: 20, total_fare: 980,
          status: 'completed', created_at: new Date(Date.now() - 86400000).toISOString(),
          trip: { pickup_city: 'Pune', destination_city: 'Mumbai', departure_time: new Date(Date.now() - 86400000).toISOString() },
        },
        {
          id: 'b2', trip_id: 't2', seat_count: 1, has_parcel: true,
          base_fare: 480, platform_fee: 10, total_fare: 540,
          status: 'pending', created_at: new Date().toISOString(),
          trip: { pickup_city: 'Pune', destination_city: 'Nashik', departure_time: new Date(Date.now() + 7200000).toISOString() },
        },
      ])
    } finally {
      setLoading(false); setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [])

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
    if (filter === 'All') return true
    if (filter === 'upcoming') return ['pending', 'confirmed', 'paid', 'driver_accepted', 'started'].includes(b.status)
    return b.status === filter
  })

  if (loading) return (
    <SafeAreaView style={styles.center}>
      <ActivityIndicator size="large" color="#2563EB" />
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.pageTitle}>My Trips</Text>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}>
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {filteredBookings.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🗺️</Text>
            <Text style={styles.emptyText}>No trips here yet</Text>
            <TouchableOpacity onPress={() => router.push('/book/cab' as any)} style={styles.bookBtn}>
              <Text style={styles.bookBtnText}>Book a Cab →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredBookings.map(booking => {
            const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending
            const dep = booking.trip?.departure_time ? new Date(booking.trip.departure_time) : null
            const canCancel = ['pending', 'confirmed', 'payment_pending'].includes(booking.status)

            return (
              <View key={booking.id} style={styles.card}>
                {/* Route + Status */}
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.route}>
                      {booking.trip?.pickup_city || '?'} → {booking.trip?.destination_city || '?'}
                    </Text>
                    {dep && (
                      <Text style={styles.depTime}>
                        📅 {dep.toLocaleDateString('en-IN')} at {dep.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>

                {/* Details */}
                <View style={styles.detailsRow}>
                  <Text style={styles.detail}>💺 {booking.seat_count} seat{booking.seat_count > 1 ? 's' : ''}</Text>
                  {booking.has_parcel && <Text style={styles.detail}>📦 Parcel</Text>}
                  <Text style={[styles.detail, { fontWeight: '700', color: '#0F172A' }]}>₹{booking.total_fare}</Text>
                </View>

                {/* Fare Breakdown */}
                <View style={styles.fareBreakdown}>
                  <Text style={styles.fareItem}>Base ₹{booking.base_fare}</Text>
                  <Text style={styles.fareSep}>+</Text>
                  <Text style={styles.fareItem}>Fee ₹{booking.platform_fee}</Text>
                  <Text style={styles.fareSep}>=</Text>
                  <Text style={styles.fareTotal}>₹{booking.total_fare}</Text>
                </View>

                {/* Actions */}
                {booking.status === 'payment_pending' && (
                  <TouchableOpacity style={styles.payBtn}>
                    <Text style={styles.payBtnText}>💳 Pay ₹{booking.total_fare} Now</Text>
                  </TouchableOpacity>
                )}
                {canCancel && (
                  <TouchableOpacity
                    onPress={() => setCancelModal(booking.id)}
                    style={styles.cancelBtn}>
                    <Text style={styles.cancelBtnText}>Cancel Booking</Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          })
        )}
      </ScrollView>

      {/* Cancel Modal */}
      <Modal visible={!!cancelModal} transparent animationType="slide" onRequestClose={() => setCancelModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cancel Booking</Text>
            <Text style={styles.modalSub}>Please provide a reason</Text>
            <TextInput style={styles.reasonInput} multiline numberOfLines={3}
              placeholder="e.g. Change of plans..." placeholderTextColor="#94A3B8"
              value={cancelReason} onChangeText={setCancelReason} />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalKeep} onPress={() => { setCancelModal(null); setCancelReason('') }}>
                <Text style={styles.modalKeepText}>Keep</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, (!cancelReason.trim() || cancelling) && { opacity: 0.5 }]}
                onPress={handleCancel} disabled={!cancelReason.trim() || cancelling}>
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
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  filterRow: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF',
  },
  filterChipActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  filterChipTextActive: { color: '#2563EB' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#64748B', marginBottom: 16 },
  bookBtn: { backgroundColor: '#2563EB', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  bookBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  route: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  depTime: { fontSize: 11, color: '#64748B', marginTop: 2 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  detailsRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  detail: { fontSize: 12, color: '#64748B' },
  fareBreakdown: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC',
    borderRadius: 8, padding: 10, marginBottom: 10,
  },
  fareItem: { fontSize: 11, color: '#64748B' },
  fareSep: { fontSize: 11, color: '#CBD5E1' },
  fareTotal: { fontSize: 13, fontWeight: '800', color: '#0F172A', marginLeft: 4 },
  payBtn: { backgroundColor: '#2563EB', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 6 },
  payBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  cancelBtn: {
    borderWidth: 1, borderColor: '#FECACA', borderRadius: 10, padding: 10,
    alignItems: 'center', backgroundColor: '#FEF2F2',
  },
  cancelBtnText: { color: '#EF4444', fontWeight: '600', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  modalSub: { fontSize: 13, color: '#64748B', marginBottom: 16 },
  reasonInput: {
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, padding: 12,
    fontSize: 14, color: '#0F172A', marginBottom: 16, minHeight: 80, textAlignVertical: 'top',
  },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalKeep: { flex: 1, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, alignItems: 'center' },
  modalKeepText: { fontWeight: '700', color: '#64748B' },
  modalConfirm: { flex: 1, backgroundColor: '#EF4444', borderRadius: 12, padding: 14, alignItems: 'center' },
  modalConfirmText: { fontWeight: '700', color: '#FFFFFF' },
})
