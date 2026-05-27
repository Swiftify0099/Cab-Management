/**
 * Driver Parcel Delivery Screen — Driver App (Phase 7)
 * Lists parcels assigned to driver's current trip.
 * Allows status updates with OTP confirmation for delivery.
 */
import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const API = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:80/api/v1'

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

export default function DriverParcelsScreen() {
  const [parcels, setParcels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [otpInputId, setOtpInputId] = useState<string | null>(null)
  const [otpValue, setOtpValue] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)

  const getHeaders = async () => {
    const token = await AsyncStorage.getItem('access_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const headers = await getHeaders()
      const res = await axios.get(`${API}/parcels/driver/my-parcels`, { headers })
      setParcels(res.data.data || [])
    } catch {
      // Demo data
      setParcels([
        { id: 'p1', tracking_number: 'CB260501ABC123', status: 'pending', sender_name: 'Rahul Sharma', receiver_name: 'Priya Patel', receiver_address: '123 MG Road, Mumbai', weight_kg: 2.5, fare: 120, is_fragile: true, is_urgent: false },
        { id: 'p2', tracking_number: 'CB260501DEF456', status: 'in_transit', sender_name: 'Anita Kumar', receiver_name: 'Vijay Singh', receiver_address: '45 Station Road, Nashik', weight_kg: 0.8, fare: 85, is_fragile: false, is_urgent: true },
      ])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleUpdateStatus = async (parcelId: string, currentStatus: string) => {
    const nextStatus = STATUS_FLOW[currentStatus]
    if (!nextStatus) return

    // OTP required for delivery
    if (nextStatus === 'delivered') {
      setOtpInputId(parcelId)
      return
    }

    await doUpdate(parcelId, nextStatus)
  }

  const handleOTPConfirm = async (parcelId: string) => {
    if (!otpValue || otpValue.length !== 4) {
      Alert.alert('Invalid OTP', 'Please enter the 4-digit OTP from the customer')
      return
    }
    await doUpdate(parcelId, 'delivered', otpValue)
    setOtpInputId(null)
    setOtpValue('')
  }

  const doUpdate = async (parcelId: string, status: string, otp?: string) => {
    setUpdating(parcelId)
    try {
      const headers = await getHeaders()
      await axios.post(`${API}/parcels/status`, {
        parcel_id: parcelId,
        status,
        delivery_otp: otp,
      }, { headers })
      Alert.alert('✅ Updated', `Parcel status → ${STATUS_LABELS[status]}`)
      load()
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Status update failed')
    } finally { setUpdating(null) }
  }

  if (loading) return (
    <SafeAreaView style={styles.center}>
      <ActivityIndicator size="large" color="#2563EB" />
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📦 My Parcels</Text>
        <Text style={styles.headerSub}>{parcels.length} parcel(s) for this trip</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#2563EB" />}
      >
        {parcels.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No parcels for this trip</Text>
          </View>
        ) : parcels.map(parcel => (
          <View key={parcel.id} style={styles.parcelCard}>
            {/* Tracking + badges */}
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.trackingNumber}>{parcel.tracking_number}</Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[parcel.status] }]}>
                  <Text style={styles.statusText}>{STATUS_LABELS[parcel.status] || parcel.status}</Text>
                </View>
              </View>
              <Text style={styles.fare}>₹{parcel.fare}</Text>
            </View>

            {/* Badges */}
            <View style={styles.badgeRow}>
              {parcel.is_fragile && <View style={styles.badge}><Text style={styles.badgeText}>🫙 Fragile</Text></View>}
              {parcel.is_urgent && <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}><Text style={[styles.badgeText, { color: '#DC2626' }]}>⚡ Urgent</Text></View>}
              <View style={styles.badge}><Text style={styles.badgeText}>⚖️ {parcel.weight_kg} kg</Text></View>
            </View>

            {/* Sender → Receiver */}
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

            {/* OTP Input for delivery */}
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
                  <TouchableOpacity
                    style={styles.otpConfirmBtn}
                    onPress={() => handleOTPConfirm(parcel.id)}
                    disabled={!!updating}
                  >
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
                  ? <ActivityIndicator size="small" color="#FFFFFF" />
                  : <Text style={styles.updateBtnText}>
                      Mark as: {STATUS_LABELS[STATUS_FLOW[parcel.status]]}
                    </Text>
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
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  header: { backgroundColor: '#1E293B', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  headerSub: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 64, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#94A3B8', fontWeight: '500' },
  parcelCard: { backgroundColor: '#FFFFFF', marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  trackingNumber: { fontSize: 12, fontWeight: '700', color: '#1E293B', fontFamily: 'monospace', letterSpacing: 1 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: '700' },
  fare: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  badge: { backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  routeBox: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  routeRow: { marginVertical: 4 },
  routeLabel: { fontSize: 9, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.8 },
  routeName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  routeAddress: { fontSize: 11, color: '#64748B' },
  arrow: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 6, marginHorizontal: 4 },
  updateBtn: { backgroundColor: '#2563EB', borderRadius: 12, padding: 12, alignItems: 'center' },
  updateBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  otpBox: { backgroundColor: '#FFF7ED', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FED7AA' },
  otpLabel: { fontSize: 12, color: '#92400E', fontWeight: '600', marginBottom: 8 },
  otpRow: { flexDirection: 'row', gap: 8 },
  otpInput: { flex: 1, borderWidth: 2, borderColor: '#F59E0B', borderRadius: 10, fontSize: 20, fontWeight: '800', color: '#0F172A', paddingVertical: 8 },
  otpConfirmBtn: { backgroundColor: '#10B981', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center' },
  otpConfirmText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  otpCancelBtn: { backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center' },
  otpCancelText: { color: '#64748B', fontWeight: '700', fontSize: 12 },
  completedBadge: { backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#BBF7D0' },
  completedText: { fontSize: 13, fontWeight: '700', color: '#16A34A' },
})
