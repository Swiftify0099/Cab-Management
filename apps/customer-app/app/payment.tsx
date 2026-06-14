/**
 * Payment Screen — Customer App
 * Phase 2: Razorpay + Wallet + Reward Points (1pt = ₹1), real breakdown
 */
import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Switch, TextInput, ActivityIndicator, StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { api } from '../src/api/client'

export default function PaymentScreen() {
  const { bookingId, mode } = useLocalSearchParams<{ bookingId: string; mode?: string }>()
  const [booking, setBooking] = useState<any>(null)
  const [wallet, setWallet] = useState({ balance: 0, reward_points: 0 })
  const [couponCode, setCouponCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [useWallet, setUseWallet] = useState(false)
  const [usePoints, setUsePoints] = useState(false)   // 1 point = ₹1
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(false)
  const [paying, setPaying] = useState(false)

  const getHeaders = async () => {
    const token = await (await import('expo-secure-store')).getItemAsync('access_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    // Wallet top-up mode — just load wallet
    if (mode === 'topup') {
      try {
        const res = await api.get('/wallet')
        setWallet(res.data?.data || { balance: 0, reward_points: 0 })
      } catch { }
      setLoading(false)
      return
    }
    try {
      const [bRes, wRes] = await Promise.allSettled([
        api.get(`/bookings/${bookingId}`),
        api.get('/wallet'),
      ])
      if (bRes.status === 'fulfilled') setBooking(bRes.value.data?.data || bRes.value.data)
      if (wRes.status === 'fulfilled') setWallet(wRes.value.data?.data || { balance: 0, reward_points: 0 })
      if (bRes.status === 'rejected' && wRes.status === 'rejected') {
        // Both failed (offline / no bookingId) — show placeholder UI
        setBooking({ id: bookingId, total_fare: 0, trip: {} })
      }
    } finally {
      setLoading(false)
    }
  }

  const validateCoupon = async () => {
    if (!couponCode.trim()) return
    setValidating(true)
    try {
      const res = await api.post('/coupons/validate', {
        code: couponCode.trim().toUpperCase(),
        booking_amount: booking?.total_fare,
      })
      setDiscount(res.data?.data?.discount_amount || 0)
      Alert.alert('✅ Coupon Applied', `You saved ₹${res.data?.data?.discount_amount}!`)
    } catch (e: any) {
      Alert.alert('Invalid Coupon', e?.response?.data?.detail || 'Coupon not found')
      setDiscount(0)
    } finally { setValidating(false) }
  }

  const handlePay = async () => {
    if (!booking) return
    setPaying(true)

    // ₹1 reward point = ₹1 deduction
    const pointsDeduction = usePoints ? Math.min(wallet.reward_points, finalAmount) : 0
    const afterPoints = Math.max(finalAmount - pointsDeduction, 0)
    const walletDeduction = useWallet ? Math.min(wallet.balance, afterPoints) : 0
    const rzpAmount = Math.max(afterPoints - walletDeduction, 0)

    try {
      // If fully covered by wallet + points
      if (rzpAmount === 0) {
        await api.post('/payments/wallet-pay', {
          booking_id: bookingId,
          amount: finalAmount,
          wallet_amount: walletDeduction,
          points_used: pointsDeduction,
        })
        Alert.alert('✅ Payment Done!', 'Your trip is confirmed.', [
          { text: 'Track Trip', onPress: () => router.replace({ pathname: '/track', params: { bookingId } } as any) },
        ])
        return
      }

      // Create Razorpay order
      const orderRes = await api.post('/payments/create-order', {
        booking_id: bookingId,
        amount: rzpAmount,
        wallet_amount: walletDeduction,
        points_used: pointsDeduction,
      })
      const order = orderRes.data?.data

      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:80/api/v1'
      const checkoutUrl = `${API_URL}/payments/checkout.html`
      const params = new URLSearchParams({
        key_id: order.key_id,
        order_id: order.order_id,
        amount: String(order.amount_paise),
        currency: 'INR',
        name: 'Swiftify',
        description: `${booking.trip?.pickup_city || ''} → ${booking.trip?.destination_city || ''}`,
        callback_url: `${API_URL}/payments/payment-success?booking_id=${bookingId}`,
      })

      const result = await WebBrowser.openBrowserAsync(`${checkoutUrl}?${params}`)

      if (result.type === 'dismiss') {
        const verifyRes = await api.get(`/payments/status/${order.order_id}`)
        if (verifyRes.data?.data?.status === 'captured') {
          Alert.alert('✅ Payment Successful!', 'Your booking is confirmed.', [
            { text: 'Track Trip', onPress: () => router.replace({ pathname: '/track', params: { bookingId } } as any) },
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
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <ActivityIndicator size="large" color="#2563EB" />
    </SafeAreaView>
  )

  const totalFare = booking?.total_fare || 0
  const finalAmount = Math.max(totalFare - discount, 0)
  // Reward points: 1pt = ₹1
  const pointsValue = usePoints ? Math.min(wallet.reward_points, finalAmount) : 0
  const afterPoints = Math.max(finalAmount - pointsValue, 0)
  const walletUsed = useWallet ? Math.min(wallet.balance, afterPoints) : 0
  const rzpDue = Math.max(afterPoints - walletUsed, 0)

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header — stitch style: white bg, blue back arrow, centered bold title */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="chevron-left" size={28} color="#1E3A8A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trip Breakdown</Text>
          <View style={styles.backBtn} />
        </View>

        {/* Trip meta info bar */}
        <Text style={styles.tripMeta}>
          Trip ID: #{bookingId?.toString().slice(0,5) || '40928'} | {booking?.trip?.pickup_city} - {booking?.trip?.destination_city} | {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>

        {/* Fare Breakdown Card — stitch design */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Commission & Tax Breakdown</Text>

          {/* Gross Fare */}
          <View style={styles.fareRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.fareRowLabel}>
                <Text style={styles.fareLabel}>Gross Fare</Text>
                <Feather name="info" size={15} color="#9CA3AF" style={{ marginLeft: 6 }} />
              </View>
              <Text style={styles.fareSub}>(Total collected from passenger)</Text>
            </View>
            <Text style={styles.fareAmountBold}>₹{totalFare.toLocaleString()}</Text>
          </View>

          <View style={styles.fareDivider} />

          {/* Platform Fee */}
          <View style={styles.fareRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.fareRowLabel}>
                <Text style={styles.fareLabel}>Platform Fee (SaaS)</Text>
                <Feather name="info" size={15} color="#9CA3AF" style={{ marginLeft: 6 }} />
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.fareAmountBold, { color: '#DC2626' }]}>-₹{Math.round(totalFare * 0.15).toLocaleString()}</Text>
              <Text style={styles.fareSub}>(15%)</Text>
            </View>
          </View>

          <View style={[styles.fareDivider, { borderStyle: 'dashed' }]} />

          {/* Tax */}
          <View style={styles.fareRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.fareRowLabel}>
                <Text style={styles.fareLabel}>Tax Deducted (TDS)</Text>
                <Feather name="info" size={15} color="#9CA3AF" style={{ marginLeft: 6 }} />
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.fareAmountBold, { color: '#DC2626' }]}>-₹{Math.round(totalFare * 0.02).toLocaleString()}</Text>
              <Text style={styles.fareSub}>(2%)</Text>
            </View>
          </View>

          <View style={[styles.fareDivider, { borderStyle: 'dashed' }]} />

          {/* Toll Reimbursement */}
          {discount > 0 && (
            <View style={styles.fareRow}>
              <View style={styles.fareRowLabel}>
                <Text style={styles.fareLabel}>Coupon Discount</Text>
                <Feather name="info" size={15} color="#9CA3AF" style={{ marginLeft: 6 }} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="tag" size={20} color="#10B981" />
                <Text style={[styles.fareAmountBold, { color: '#10B981', marginLeft: 4 }]}>+₹{discount}</Text>
              </View>
            </View>
          )}

          <View style={styles.fareThickDivider} />

          {/* Net Payout / Total */}
          <View style={styles.fareRow}>
            <View>
              <View style={styles.fareRowLabel}>
                <Text style={[styles.fareAmountBold, { fontSize: 20 }]}>Total Fare</Text>
                <Feather name="info" size={15} color="#9CA3AF" style={{ marginLeft: 6 }} />
              </View>
              <Text style={styles.fareSub}>(Amount due from you)</Text>
            </View>
            <Text style={[styles.fareAmountBold, { color: '#10B981', fontSize: 26 }]}>₹{finalAmount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Booking source summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Booking Details</Text>
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

        {/* Reward Points */}
        <View style={styles.card}>
          <View style={styles.walletRow}>
            <View>
              <Text style={styles.cardTitle}>⭐ Use Reward Points</Text>
              <Text style={styles.walletBalance}>{wallet.reward_points} pts available</Text>
              <Text style={styles.rewardPoints}>1 point = ₹1 discount</Text>
            </View>
            <Switch
              value={usePoints}
              onValueChange={setUsePoints}
              trackColor={{ false: '#E2E8F0', true: '#F59E0B' }}
              thumbColor="#FFFFFF"
            />
          </View>
          {usePoints && pointsValue > 0 && (
            <Text style={styles.discountNote}>✅ {pointsValue} pts (₹{pointsValue}) will be redeemed</Text>
          )}
        </View>

        {/* Bill Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💰 Bill Summary</Text>
          <BillRow label="Booking fare" value={`₹${totalFare}`} />
          {discount > 0 && <BillRow label="Coupon discount" value={`-₹${discount}`} green />}
          {usePoints && pointsValue > 0 && <BillRow label={`Reward pts (${pointsValue})`} value={`-₹${pointsValue}`} green />}
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
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },

  // Header — stitch style
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14,
    shadowColor: '#94A3B8', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1E3A8A', textAlign: 'center' },

  tripMeta: { fontSize: 15, color: '#0F172A', lineHeight: 24, paddingHorizontal: 20, paddingVertical: 16 },

  // Stitch breakdown card
  breakdownCard: {
    backgroundColor: '#FFFFFF', marginHorizontal: 16, marginBottom: 16, borderRadius: 20,
    padding: 20, shadowColor: '#94A3B8', shadowOpacity: 0.12, shadowRadius: 10, elevation: 3,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  breakdownTitle: { fontSize: 20, fontWeight: '700', color: '#000', marginBottom: 24 },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  fareRowLabel: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  fareLabel: { fontSize: 16, color: '#000' },
  fareSub: { fontSize: 13, color: '#6B7280' },
  fareAmountBold: { fontSize: 22, fontWeight: '900', color: '#000' },
  fareDivider: { height: 1, backgroundColor: '#E5E7EB', marginBottom: 20 },
  fareThickDivider: { height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, marginBottom: 20 },

  // Cards
  card: {
    backgroundColor: '#FFFFFF', marginHorizontal: 16, marginBottom: 12, borderRadius: 16,
    padding: 16, shadowColor: '#94A3B8', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
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
    backgroundColor: '#F9FAFB', paddingHorizontal: 20, paddingBottom: 28, paddingTop: 12,
  },
  payBtn: {
    backgroundColor: '#3B82F6', borderRadius: 50, padding: 16, alignItems: 'center',
    shadowColor: '#3B82F6', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  payBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
})
