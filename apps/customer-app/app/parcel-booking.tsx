/**
 * Parcel Booking Screen — Customer App (Phase 7)
 * Book a parcel on a shared trip with weight-based fare estimate.
 */
import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Switch, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const API = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:80/api/v1'

export default function ParcelBookingScreen() {
  const { tripId, pickupCity, destinationCity, distanceKm } = useLocalSearchParams<{
    tripId: string; pickupCity: string; destinationCity: string; distanceKm: string
  }>()

  const [form, setForm] = useState({
    senderName: '', senderPhone: '',
    receiverName: '', receiverPhone: '', receiverAddress: '',
    weightKg: '', description: '',
  })
  const [fragile, setFragile] = useState(false)
  const [urgent, setUrgent] = useState(false)
  const [fareEstimate, setFareEstimate] = useState<number | null>(null)
  const [estimating, setEstimating] = useState(false)
  const [booking, setBooking] = useState(false)
  const [result, setResult] = useState<any>(null)

  const getHeaders = async () => {
    const token = await AsyncStorage.getItem('access_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const handleEstimate = async () => {
    const wt = parseFloat(form.weightKg)
    if (!wt || wt <= 0) { Alert.alert('Enter valid weight'); return }
    setEstimating(true)
    try {
      const headers = await getHeaders()
      const res = await axios.post(`${API}/parcels/fare-estimate`, {
        weight_kg: wt,
        distance_km: parseFloat(distanceKm) || 100,
        fragile, urgent,
      }, { headers })
      setFareEstimate(res.data.data.fare)
    } catch {
      // Demo estimate
      const base = wt * 15 + (parseFloat(distanceKm) || 100) * 0.5
      setFareEstimate(Math.round(Math.max(base, 80) * (fragile ? 1.2 : 1) * (urgent ? 1.3 : 1)))
    } finally { setEstimating(false) }
  }

  const handleBook = async () => {
    const { senderName, senderPhone, receiverName, receiverPhone, receiverAddress, weightKg, description } = form
    if (!senderName || !senderPhone || !receiverName || !receiverPhone || !receiverAddress || !weightKg || !description) {
      Alert.alert('Missing Fields', 'Please fill all required fields')
      return
    }
    setBooking(true)
    try {
      const headers = await getHeaders()
      const res = await axios.post(`${API}/parcels`, {
        trip_id: tripId,
        sender_name: senderName,
        sender_phone: senderPhone,
        receiver_name: receiverName,
        receiver_phone: receiverPhone,
        receiver_address: receiverAddress,
        weight_kg: parseFloat(weightKg),
        description,
        fragile, urgent,
      }, { headers })
      setResult(res.data.data)
    } catch (e: any) {
      Alert.alert('Booking Failed', e?.response?.data?.detail || 'Please try again')
    } finally { setBooking(false) }
  }

  const update = (field: string, val: string) => setForm(f => ({ ...f, [field]: val }))

  if (result) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successCard}>
          <Text style={styles.successIcon}>📦</Text>
          <Text style={styles.successTitle}>Parcel Booked!</Text>
          <Text style={styles.successSub}>Your parcel is scheduled for shipment</Text>

          <View style={styles.trackingBox}>
            <Text style={styles.trackingLabel}>TRACKING NUMBER</Text>
            <Text style={styles.trackingNumber}>{result.tracking_number}</Text>
            <Text style={styles.trackingHint}>Share this with the receiver to track delivery</Text>
          </View>

          <View style={styles.infoGrid}>
            <InfoRow label="Route" value={`${result.trip?.from} → ${result.trip?.to}`} />
            <InfoRow label="Fare" value={`₹${result.fare}`} />
            <InfoRow label="Delivery OTP" value={result.delivery_otp} secret />
            <InfoRow label="Status" value="Pending Pickup" />
          </View>

          <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/(tabs)/trips')}>
            <Text style={styles.doneBtnText}>Done →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.back}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Send a Parcel</Text>
          </View>

          <View style={styles.routeBanner}>
            <Text style={styles.routeText}>📦 {pickupCity} → {destinationCity}</Text>
          </View>

          {/* Sender */}
          <SectionHeader title="Sender Details" />
          <View style={styles.card}>
            <Field label="Your Name *" value={form.senderName} onChangeText={(v: string) => setForm({ ...form, senderName: v })} placeholder="John Doe" />
            <Field label="Your Phone *" value={form.senderPhone} onChangeText={(v: string) => setForm({ ...form, senderPhone: v })} placeholder="+91 98765 43210" keyboardType="phone-pad" />
          </View>

          {/* Receiver */}
          <SectionHeader title="Receiver Details" />
          <View style={styles.card}>
            <Field label="Receiver Name *" value={form.receiverName} onChangeText={(v: string) => setForm({ ...form, receiverName: v })} placeholder="Jane Doe" />
            <Field label="Receiver Phone *" value={form.receiverPhone} onChangeText={(v: string) => setForm({ ...form, receiverPhone: v })} placeholder="+91 98765 43210" keyboardType="phone-pad" />
            <Field label="Delivery Address *" value={form.receiverAddress} onChangeText={(v: string) => setForm({ ...form, receiverAddress: v })} placeholder="123, MG Road, Mumbai" multiline />
          </View>

          {/* Parcel Details */}
          <SectionHeader title="Parcel Details" />
          <View style={styles.card}>
            <Field label="Weight (kg) *" value={form.weightKg} onChangeText={(v: string) => setForm({ ...form, weightKg: v })} placeholder="2.5" keyboardType="decimal-pad" />
            <Field label="Description *" value={form.description} onChangeText={(v: string) => setForm({ ...form, description: v })} placeholder="Documents, electronics, clothes..." multiline />

            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleLabel}>🫙 Fragile</Text>
                <Text style={styles.toggleSub}>+20% surcharge</Text>
              </View>
              <Switch value={fragile} onValueChange={setFragile} trackColor={{ false: '#E2E8F0', true: '#F59E0B' }} thumbColor="#FFFFFF" />
            </View>
            <View style={[styles.toggleRow, { borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 4, paddingTop: 12 }]}>
              <View>
                <Text style={styles.toggleLabel}>⚡ Urgent</Text>
                <Text style={styles.toggleSub}>+30% surcharge</Text>
              </View>
              <Switch value={urgent} onValueChange={setUrgent} trackColor={{ false: '#E2E8F0', true: '#EF4444' }} thumbColor="#FFFFFF" />
            </View>
          </View>

          {/* Fare Estimate */}
          <TouchableOpacity style={styles.estimateBtn} onPress={handleEstimate} disabled={estimating}>
            {estimating
              ? <ActivityIndicator color="#2563EB" />
              : <Text style={styles.estimateBtnText}>📊 Estimate Fare</Text>
            }
          </TouchableOpacity>
          {fareEstimate !== null && (
            <View style={styles.fareCard}>
              <Text style={styles.fareLabel}>Estimated Fare</Text>
              <Text style={styles.fareValue}>₹{fareEstimate}</Text>
              <Text style={styles.fareSub}>Final amount will be confirmed on booking</Text>
            </View>
          )}

          {/* Book Button */}
          <TouchableOpacity
            style={[styles.bookBtn, booking && { opacity: 0.6 }]}
            onPress={handleBook}
            disabled={booking}
            activeOpacity={0.85}
          >
            {booking
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={styles.bookBtnText}>📦 Book Parcel</Text>
            }
          </TouchableOpacity>
          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>
}

function Field({ label, value, onChangeText, placeholder, keyboardType, multiline }: any) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 72, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
      />
    </View>
  )
}

function InfoRow({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, secret && { letterSpacing: 3, fontWeight: '800', color: '#10B981' }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  back: { fontSize: 14, color: '#2563EB', fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  routeBanner: { backgroundColor: '#EFF6FF', marginHorizontal: 16, borderRadius: 12, padding: 12, marginBottom: 4, borderWidth: 1, borderColor: '#DBEAFE' },
  routeText: { fontSize: 14, fontWeight: '700', color: '#1D4ED8', textAlign: 'center' },
  sectionHeader: { fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 0.8, marginHorizontal: 16, marginTop: 16, marginBottom: 6 },
  card: { backgroundColor: '#FFFFFF', marginHorizontal: 16, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0F172A', backgroundColor: '#F8FAFC' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  toggleSub: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  estimateBtn: { marginHorizontal: 16, marginTop: 16, backgroundColor: '#EFF6FF', borderWidth: 1.5, borderColor: '#BFDBFE', borderRadius: 14, padding: 14, alignItems: 'center' },
  estimateBtnText: { fontSize: 14, fontWeight: '700', color: '#2563EB' },
  fareCard: { marginHorizontal: 16, marginTop: 8, backgroundColor: '#F0FDF4', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#BBF7D0', alignItems: 'center' },
  fareLabel: { fontSize: 11, color: '#16A34A', fontWeight: '600' },
  fareValue: { fontSize: 28, fontWeight: '900', color: '#15803D', marginTop: 2 },
  fareSub: { fontSize: 11, color: '#86EFAC', marginTop: 4 },
  bookBtn: { margin: 16, backgroundColor: '#2563EB', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  bookBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  successCard: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  successIcon: { fontSize: 64, marginBottom: 12 },
  successTitle: { fontSize: 28, fontWeight: '900', color: '#0F172A', marginBottom: 4 },
  successSub: { fontSize: 14, color: '#64748B', marginBottom: 24 },
  trackingBox: { backgroundColor: '#1E293B', borderRadius: 16, padding: 20, width: '100%', alignItems: 'center', marginBottom: 20 },
  trackingLabel: { fontSize: 10, color: '#64748B', fontWeight: '700', letterSpacing: 1.5 },
  trackingNumber: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', letterSpacing: 3, marginTop: 6 },
  trackingHint: { fontSize: 11, color: '#64748B', marginTop: 6 },
  infoGrid: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  infoLabel: { fontSize: 12, color: '#94A3B8' },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  doneBtn: { backgroundColor: '#2563EB', borderRadius: 16, paddingHorizontal: 40, paddingVertical: 14 },
  doneBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
})
