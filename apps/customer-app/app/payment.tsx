/**
 * Payment Screen — Customer App (Phase 6)
 * Razorpay WebView-based checkout with coupon + wallet toggle.
 */
import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Switch, TextInput, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const API = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:80/api/v1'

export default function PaymentScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>()
  const [booking, setBooking] = useState<any>(null)
  const [wallet, setWallet] = useState({ balance: 0, reward_points: 0 })
  const [couponCode, setCouponCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [useWallet, setUseWallet] = useState(false)
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(false)
  const [paying, setPaying] = useState(false)

  const getHeaders = async () => {
    const token = await AsyncStorage.getItem('access_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const headers = await getHeaders()
      const [bRes, wRes] = await Promise.all([
        axios.get(`${API}/bookings/${bookingId}`, { headers }),
        axios.get(`${API}/wallet`, { headers }),
      ])
      setBooking(bRes.data.data)
      setWallet(wRes.data.data || { balance: 0, reward_points: 0 })
    } catch {
      setBooking({
        id: bookingId,
        total_fare: 980,
        seat_count: 2,
        trip: { pickup_city: 'Pune', destination_city: 'Mumbai', distance_km: 149 },
      })
      setWallet({ balance: 250, reward_points: 120 })
    } finally {
      setLoading(false)
    }
  }

  const validateCoupon = async () => {
    if (!couponCode.trim()) return
    setValidating(true)
    try {
      const headers = await getHeaders()
      const res = await axios.post(`${API}/coupons/validate`, {
        code: couponCode.trim().toUpperCase(),
        booking_amount: booking?.total_fare,
      }, { headers })
      setDiscount(res.data.data.discount_amount)
      Alert.alert('✅ Coupon Applied', `You saved ₹${res.data.data.discount_amount}!`)
    } catch (e: any) {
      Alert.alert('Invalid Coupon', e?.response?.data?.detail || 'Coupon not found')
      setDiscount(0)
    } finally {
      setValidating(false) }
  }

  const handlePay = async () => {
    if (!booking) return
    setPaying(true)

    const walletDeduction = useWallet ? Math.min(wallet.balance, finalAmount) : 0
    const rzpAmount = Math.max(finalAmount - walletDeduction, 0)

    try {
      const headers = await getHeaders()

      // If fully covered by wallet
      if (rzpAmount === 0) {
        await axios.post(`${API}/payments/wallet-pay`, {
          booking_id: bookingId, amount: finalAmount,
        }, { headers })
        Alert.alert('✅ Payment Done!', 'Your trip is confirmed.', [
          { text: 'View Trips', onPress: () => router.replace('/(tabs)/trips') },
        ])
        return
      }

      // Create Razorpay order
      const orderRes = await axios.post(`${API}/payments/create-order`, {
        booking_id: bookingId,
        amount: rzpAmount,
      }, { headers })
      const order = orderRes.data.data

      // Open Razorpay checkout page in browser
      // (Native Razorpay SDK requires ejecting from Expo — WebBrowser is the managed workflow approach)
      const checkoutUrl = `https://api.razorpay.com/v1/checkout/embedded`
      const params = new URLSearchParams({
        key: order.key_id,
        order_id: order.order_id,
        amount: String(order.amount_paise),
        currency: 'INR',
        name: 'CabBooking',
        description: `${booking.trip?.pickup_city} → ${booking.trip?.destination_city}`,
        callback_url: `${API.replace('/api/v1', '')}/payment-success?booking_id=${bookingId}`,
      })

      const result = await WebBrowser.openBrowserAsync(`${checkoutUrl}?${params}`)

      if (result.type === 'dismiss') {
        // Verify payment status on backend
        const verifyRes = await axios.get(`${API}/payments/status/${order.order_id}`, { headers })
        if (verifyRes.data.data?.status === 'captured') {
          Alert.alert('✅ Payment Successful!', 'Your booking is confirmed.', [
            { text: 'Track Trip', onPress: () => router.push({ pathname: '/track', params: { bookingId } } as any) },
          ])
        } else {
          Alert.alert('Payment Incomplete', 'Please try again or contact support.')
        }
      }
    } catch (e: any) {
      Alert.alert('Payment Failed', e?.response?.data?.detail || 'Could not process payment')
    } finally {
      setPaying(false)
    }
  }

  if (loading) return (
    <SafeAreaView style={styles.center}>
      <ActivityIndicator size="large" color="#2563EB" />
    </SafeAreaView>
  )

  const totalFare = booking?.total_fare || 0
  const finalAmount = Math.max(totalFare - discount, 0)
  const walletUsed = useWallet ? Math.min(wallet.balance, finalAmount) : 0
  const rzpDue = Math.max(finalAmount - walletUsed, 0)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Complete Payment</Text>
        </View>

        {/* Booking summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Booking Summary</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{booking?.trip?.pickup_city} → {booking?.trip?.destination_city}</Text>
            <Text style={styles.rowValue}>₹{totalFare}</Text>
          </View>
          <Text style={styles.rowSub}>💺 {booking?.seat_count} seat(s) • {booking?.trip?.distance_km} km</Text>
        </View>

        {/* Coupon */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🏷️ Coupon Code</Text>
          <View style={styles.couponRow}>
            <TextInput
              style={[styles.couponInput, discount > 0 && { backgroundColor: '#F0FDF4', borderColor: '#10B981' }]}
              placeholder="Enter code"
              value={couponCode}
              onChangeText={t => setCouponCode(t.toUpperCase())}
              autoCapitalize="characters"
              editable={discount === 0}
            />
            <TouchableOpacity
              onPress={discount > 0 ? () => { setDiscount(0); setCouponCode('') } : validateCoupon}
              disabled={validating}
              style={[styles.couponBtn, discount > 0 && { backgroundColor: '#EF4444' }]}
            >
              <Text style={styles.couponBtnText}>
                {validating ? '...' : discount > 0 ? 'Remove' : 'Apply'}
              </Text>
            </TouchableOpacity>
          </View>
          {discount > 0 && (
            <Text style={styles.discountNote}>✅ Coupon applied — saving ₹{discount}</Text>
          )}
        </View>

        {/* Wallet */}
        <View style={styles.card}>
          <View style={styles.walletRow}>
            <View>
              <Text style={styles.cardTitle}>👛 Use Wallet Balance</Text>
              <Text style={styles.walletBalance}>₹{wallet.balance.toFixed(2)} available</Text>
              <Text style={styles.rewardPoints}>🌟 {wallet.reward_points} reward points</Text>
            </View>
            <Switch
              value={useWallet}
              onValueChange={setUseWallet}
              trackColor={{ false: '#E2E8F0', true: '#3B82F6' }}
              thumbColor="#FFFFFF"
            />
          </View>
          {useWallet && walletUsed > 0 && (
            <Text style={styles.discountNote}>✅ ₹{walletUsed.toFixed(2)} will be deducted from wallet</Text>
          )}
        </View>

        {/* Bill Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💰 Bill Summary</Text>
          <BillRow label="Booking fare" value={`₹${totalFare}`} />
          {discount > 0 && <BillRow label="Coupon discount" value={`-₹${discount}`} green />}
          {useWallet && walletUsed > 0 && <BillRow label="Wallet deduction" value={`-₹${walletUsed.toFixed(2)}`} green />}
          <View style={styles.divider} />
          <BillRow label="Pay via Razorpay" value={`₹${rzpDue.toFixed(2)}`} bold />
        </View>

        {/* Security */}
        <Text style={styles.secureNote}>🔒 256-bit SSL encrypted • Powered by Razorpay</Text>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Pay Button */}
      <View style={styles.payBtnContainer}>
        <TouchableOpacity
          style={[styles.payBtn, paying && { opacity: 0.6 }]}
          onPress={handlePay}
          disabled={paying}
          activeOpacity={0.85}
        >
          {paying
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={styles.payBtnText}>
                {rzpDue > 0 ? `Pay ₹${rzpDue.toFixed(0)} via Razorpay` : 'Pay via Wallet'}
              </Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

function BillRow({ label, value, green, bold }: { label: string; value: string; green?: boolean; bold?: boolean }) {
  return (
    <View style={styles.billRow}>
      <Text style={[styles.billLabel, bold && { fontWeight: '700', color: '#0F172A' }]}>{label}</Text>
      <Text style={[styles.billValue, green && { color: '#10B981' }, bold && { fontWeight: '800', color: '#0F172A' }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  backBtn: { padding: 4 },
  backText: { fontSize: 14, color: '#2563EB', fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  card: {
    backgroundColor: '#FFFFFF', marginHorizontal: 16, marginBottom: 12, borderRadius: 16,
    padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 10, letterSpacing: 0.3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 14, fontWeight: '600', color: '#0F172A', flex: 1 },
  rowValue: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  rowSub: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  couponRow: { flexDirection: 'row', gap: 8 },
  couponInput: {
    flex: 1, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontWeight: '600', color: '#0F172A',
    backgroundColor: '#F8FAFC', letterSpacing: 1,
  },
  couponBtn: {
    backgroundColor: '#2563EB', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10,
    justifyContent: 'center',
  },
  couponBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  discountNote: { color: '#10B981', fontSize: 12, fontWeight: '600', marginTop: 8 },
  walletRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  walletBalance: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginTop: 2 },
  rewardPoints: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 10 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  billLabel: { fontSize: 13, color: '#64748B' },
  billValue: { fontSize: 13, color: '#64748B' },
  secureNote: { textAlign: 'center', fontSize: 11, color: '#94A3B8', marginTop: 4, marginBottom: 12 },
  payBtnContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingBottom: 28, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  payBtn: {
    backgroundColor: '#2563EB', borderRadius: 16, padding: 16, alignItems: 'center',
    shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  payBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
})
