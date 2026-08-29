/**
 * Driver Parcel Screen — Driver App
 * Remaining Phase:
 *   - "My Parcels" tab: assigned parcels for active trip, OTP delivery confirmation
 *   - "New Requests" tab: route-matched parcel requests (accept / decline)
 *   - Migrated from raw axios+AsyncStorage → shared api client
 *   - Socket PARCEL_REQUEST event shows live badge on New Requests tab
 */
import { useState, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { api } from '../src/api/client'
import { useDriverSocket } from '../src/hooks/useDriverSocket'

// ── Status maps ───────────────────────────────────────────────────────────────
const STATUS_FLOW: Record<string, string> = {
  pending: 'pickup_done',
  pickup_done: 'in_transit',
  in_transit: 'delivered',
}
const STATUS_LABELS: Record<string, string> = {
  pending: '⏳ Pending Pickup',
  pickup_done: '✅ Picked Up',
  in_transit: '🚗 In Transit',
  delivered: '📬 Delivered',
  failed: '❌ Failed',
}
const STATUS_COLORS: Record<string, string> = {
  pending: '#FEF9C3',
  pickup_done: '#DCFCE7',
  in_transit: '#DBEAFE',
  delivered: '#F0FDF4',
  failed: '#FEE2E2',
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function DriverParcelsScreen() {
  const [activeTab, setActiveTab] = useState<'mine' | 'requests'>('mine')

  // My Parcels state
  const [parcels, setParcels]       = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [otpInputId, setOtpInputId] = useState<string | null>(null)
  const [otpValue, setOtpValue]     = useState('')
  const [updating, setUpdating]     = useState<string | null>(null)

  // New Requests state
  const [requests, setRequests]           = useState<any[]>([])
  const [reqLoading, setReqLoading]       = useState(false)
  const [reqRefreshing, setReqRefreshing] = useState(false)
  const [newReqBadge, setNewReqBadge]     = useState(false)
  const [acting, setActing]               = useState<string | null>(null)

  // Socket — listen for PARCEL_REQUEST to show badge
  const { on, off } = useDriverSocket()

  useFocusEffect(useCallback(() => {
    const handler = () => {
      setNewReqBadge(true)
      loadRequests()
    }
    on?.('PARCEL_REQUEST', handler)
    loadParcels()
    loadRequests()
    return () => off?.('PARCEL_REQUEST', handler)
  }, []))

  // ── Load my parcels ──────────────────────────────────────────────────────
  const loadParcels = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true)
    try {
      const res = await api.get('/parcels/driver/my-parcels')
      setParcels(res.data?.data || [])
    } catch (err) {
      console.warn('[DriverParcels] loadParcels error:', err)
      setParcels([])
    } finally { setLoading(false); setRefreshing(false) }
  }

  // ── Load route-matched parcel requests ────────────────────────────────────
  const loadRequests = async (isRefresh = false) => {
    if (isRefresh) setReqRefreshing(true); else setReqLoading(true)
    try {
      const res = await api.get('/parcels/driver-requests')
      setRequests(res.data?.data || [])
    } catch {
      setRequests([]) // no demo data for requests — show empty state
    } finally { setReqLoading(false); setReqRefreshing(false) }
  }

  // ── Parcel status update ─────────────────────────────────────────────────
  const handleUpdateStatus = async (parcelId: string, currentStatus: string) => {
    const nextStatus = STATUS_FLOW[currentStatus]
    if (!nextStatus) return
    if (nextStatus === 'delivered') { setOtpInputId(parcelId); return }
    await doUpdate(parcelId, nextStatus)
  }

  const handleOTPConfirm = async (parcelId: string) => {
    if (!otpValue || otpValue.length !== 4) {
      Alert.alert('Invalid OTP', 'Enter the 4-digit OTP from the customer.'); return
    }
    await doUpdate(parcelId, 'delivered', otpValue)
    setOtpInputId(null); setOtpValue('')
  }

  const doUpdate = async (parcelId: string, status: string, otp?: string) => {
    setUpdating(parcelId)
    try {
      await api.post('/parcels/status', { parcel_id: parcelId, status, delivery_otp: otp })
      Alert.alert('✅ Updated', `Status → ${STATUS_LABELS[status]}`)
      loadParcels()
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Status update failed')
    } finally { setUpdating(null) }
  }

  // ── Accept / Decline route-matched parcel request ─────────────────────────
  const handleRequestAction = async (requestId: string, accept: boolean) => {
    setActing(requestId)
    try {
      await api.post('/parcels/respond', { request_id: requestId, accepted: accept })
      Alert.alert(accept ? '✅ Accepted' : '❌ Declined', accept ? 'Parcel added to your trip.' : 'Request declined.')
      loadRequests()
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Action failed')
    } finally { setActing(null) }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📦 Parcels</Text>
        <Text style={styles.headerSub}>
          {activeTab === 'mine' ? `${parcels.length} assigned` : `${requests.length} nearby requests`}
        </Text>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'mine' && styles.tabBtnActive]}
          onPress={() => setActiveTab('mine')}
        >
          <MaterialCommunityIcons name="package-variant-closed" size={16} color={activeTab === 'mine' ? '#2563EB' : '#94A3B8'} />
          <Text style={[styles.tabBtnText, activeTab === 'mine' && styles.tabBtnTextActive]}>My Parcels</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'requests' && styles.tabBtnActive]}
          onPress={() => { setActiveTab('requests'); setNewReqBadge(false) }}
        >
          <MaterialCommunityIcons name="map-marker-radius" size={16} color={activeTab === 'requests' ? '#2563EB' : '#94A3B8'} />
          <Text style={[styles.tabBtnText, activeTab === 'requests' && styles.tabBtnTextActive]}>New Requests</Text>
          {newReqBadge && <View style={styles.badge} />}
        </TouchableOpacity>
      </View>

      {/* ── MY PARCELS TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'mine' && (
        loading ? <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} /> : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadParcels(true)} tintColor="#2563EB" />}
          >
            {parcels.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyText}>No parcels for this trip</Text>
              </View>
            ) : parcels.map(parcel => (
              <View key={parcel.id} style={styles.parcelCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.trackingNumber}>{parcel.tracking_number}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[parcel.status] || '#F1F5F9' }]}>
                      <Text style={styles.statusText}>{STATUS_LABELS[parcel.status] || parcel.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.fare}>₹{parcel.fare}</Text>
                </View>

                <View style={styles.badgeRow}>
                  {parcel.is_fragile && <View style={styles.pill}><Text style={styles.pillText}>🫙 Fragile</Text></View>}
                  {parcel.is_urgent && <View style={[styles.pill, { backgroundColor: '#FEE2E2' }]}><Text style={[styles.pillText, { color: '#DC2626' }]}>⚡ Urgent</Text></View>}
                  <View style={styles.pill}><Text style={styles.pillText}>⚖️ {parcel.weight_kg} kg</Text></View>
                </View>

                <View style={styles.routeBox}>
                  <View style={styles.routeRow}>
                    <Text style={styles.routeLabel}>FROM</Text>
                    <Text style={styles.routeName}>{parcel.sender_name}</Text>
                  </View>
                  <View style={styles.arrow} />
                  <View style={styles.routeRow}>
                    <Text style={styles.routeLabel}>TO</Text>
                    <Text style={styles.routeName}>{parcel.receiver_name}</Text>
                    <Text style={styles.routeAddress} numberOfLines={1}>{parcel.receiver_address}</Text>
                  </View>
                </View>

                {otpInputId === parcel.id ? (
                  <View style={styles.otpBox}>
                    <Text style={styles.otpLabel}>Ask customer for 4-digit delivery OTP</Text>
                    <View style={styles.otpRow}>
                      <TextInput
                        style={styles.otpInput}
                        value={otpValue}
                        onChangeText={t => setOtpValue(t.replace(/\D/g, '').slice(0, 4))}
                        placeholder="0000"
                        keyboardType="numeric"
                        maxLength={4}
                        placeholderTextColor="#94A3B8"
                        textAlign="center"
                      />
                      <TouchableOpacity style={styles.otpConfirmBtn} onPress={() => handleOTPConfirm(parcel.id)} disabled={!!updating}>
                        <Text style={styles.otpConfirmText}>Confirm</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.otpCancelBtn} onPress={() => { setOtpInputId(null); setOtpValue('') }}>
                        <Text style={styles.otpCancelText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : STATUS_FLOW[parcel.status] ? (
                  <TouchableOpacity
                    style={[styles.updateBtn, updating === parcel.id && { opacity: 0.6 }]}
                    onPress={() => handleUpdateStatus(parcel.id, parcel.status)}
                    disabled={!!updating}
                    activeOpacity={0.85}
                  >
                    {updating === parcel.id
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.updateBtnText}>Mark as: {STATUS_LABELS[STATUS_FLOW[parcel.status]]}</Text>
                    }
                  </TouchableOpacity>
                ) : (
                  <View style={styles.completedBadge}>
                    <Text style={styles.completedText}>✅ {parcel.status === 'delivered' ? 'Delivered Successfully' : 'Completed'}</Text>
                  </View>
                )}
              </View>
            ))}
            <View style={{ height: 24 }} />
          </ScrollView>
        )
      )}

      {/* ── NEW REQUESTS TAB ───────────────────────────────────────────────── */}
      {activeTab === 'requests' && (
        reqLoading ? <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} /> : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={reqRefreshing} onRefresh={() => loadRequests(true)} tintColor="#2563EB" />}
          >
            {requests.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🗺️</Text>
                <Text style={styles.emptyText}>No parcel requests near your route</Text>
                <Text style={styles.emptyHint}>Pull to refresh or wait for new matches</Text>
              </View>
            ) : requests.map((req: any) => (
              <View key={req.id} style={styles.parcelCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.trackingNumber}>{req.tracking_number || req.id?.slice(0, 12).toUpperCase()}</Text>
                    <Text style={styles.reqRoute}>{req.pickup_city} → {req.dropoff_city}</Text>
                  </View>
                  <Text style={styles.fare}>₹{req.fare || req.estimated_fare || '—'}</Text>
                </View>

                <View style={styles.badgeRow}>
                  {req.is_fragile && <View style={styles.pill}><Text style={styles.pillText}>🫙 Fragile</Text></View>}
                  {req.is_urgent && <View style={[styles.pill, { backgroundColor: '#FEE2E2' }]}><Text style={[styles.pillText, { color: '#DC2626' }]}>⚡ Urgent</Text></View>}
                  {req.weight_kg && <View style={styles.pill}><Text style={styles.pillText}>⚖️ {req.weight_kg} kg</Text></View>}
                  <View style={styles.pill}><Text style={styles.pillText}>📍 {req.detour_km?.toFixed(1) || '—'} km detour</Text></View>
                </View>

                <View style={styles.reqActions}>
                  <TouchableOpacity
                    style={[styles.declineBtn, acting === req.id && { opacity: 0.6 }]}
                    onPress={() => handleRequestAction(req.id, false)}
                    disabled={acting === req.id}
                  >
                    <Feather name="x" size={16} color="#EF4444" />
                    <Text style={styles.declineBtnText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.acceptBtn, acting === req.id && { opacity: 0.6 }]}
                    onPress={() => handleRequestAction(req.id, true)}
                    disabled={acting === req.id}
                  >
                    {acting === req.id
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <>
                          <Feather name="check" size={16} color="#fff" />
                          <Text style={styles.acceptBtnText}>Accept +₹{req.fare || req.estimated_fare}</Text>
                        </>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <View style={{ height: 24 }} />
          </ScrollView>
        )
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { backgroundColor: '#1E293B', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  headerSub: { color: '#94A3B8', fontSize: 12, marginTop: 2 },

  // Tab bar
  tabBar: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent',
    position: 'relative',
  },
  tabBtnActive: { borderBottomColor: '#2563EB' },
  tabBtnText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  tabBtnTextActive: { color: '#2563EB' },
  badge: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444',
    position: 'absolute', top: 10, right: 16,
  },

  // Cards
  parcelCard: {
    backgroundColor: '#FFFFFF', marginHorizontal: 16, marginTop: 12,
    borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  trackingNumber: { fontSize: 12, fontWeight: '700', color: '#1E293B', letterSpacing: 1, fontFamily: 'monospace' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: '700', color: '#374151' },
  fare: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  pill: { backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  pillText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  routeBox: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  routeRow: { marginVertical: 4 },
  routeLabel: { fontSize: 9, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.8 },
  routeName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  routeAddress: { fontSize: 11, color: '#64748B' },
  arrow: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 6, marginHorizontal: 4 },

  // Status update
  updateBtn: { backgroundColor: '#2563EB', borderRadius: 12, padding: 12, alignItems: 'center' },
  updateBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  completedBadge: { backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#BBF7D0' },
  completedText: { fontSize: 13, fontWeight: '700', color: '#16A34A' },

  // OTP
  otpBox: { backgroundColor: '#FFF7ED', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FED7AA' },
  otpLabel: { fontSize: 12, color: '#92400E', fontWeight: '600', marginBottom: 8 },
  otpRow: { flexDirection: 'row', gap: 8 },
  otpInput: { flex: 1, borderWidth: 2, borderColor: '#F59E0B', borderRadius: 10, fontSize: 20, fontWeight: '800', color: '#0F172A', paddingVertical: 8 },
  otpConfirmBtn: { backgroundColor: '#10B981', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center' },
  otpConfirmText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  otpCancelBtn: { backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center' },
  otpCancelText: { color: '#64748B', fontWeight: '700', fontSize: 12 },

  // New Request actions
  reqRoute: { fontSize: 13, color: '#3B82F6', fontWeight: '600', marginTop: 3 },
  reqActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  declineBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 12,
    backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA',
  },
  declineBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 13 },
  acceptBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 12,
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
  },
  acceptBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  // Empty state
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 64, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#94A3B8', fontWeight: '500' },
  emptyHint: { fontSize: 12, color: '#CBD5E1', marginTop: 6 },
})
