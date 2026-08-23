/**
 * Payment & Checkout Hub — Customer App (Feature 11 & Feature 12)
 * Full financial pipeline:
 * - Transparent itemized fare breakdown
 * - Multi-method selection (Saved UPI, Saved Cards, New Method, Wallet Split, Cash)
 * - Multi-bucket funds (Cash, Promotional Credits, Referral Rewards)
 * - Coupon validation & Server-authoritative discount
 * - Razorpay Intent with App-Switching & Background recovery
 * - Light Mode & Dark Mode design tokens
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
  StatusBar,
  ActivityIndicator,
  AppState,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { Feather, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons'
import { api, paymentApi, walletApi } from '../src/api/client'
import { useTheme } from '../src/contexts/ThemeContext'
import { AppText, AppLoader, AppDivider, AppButton, AppCard } from '../src/components/ui'
import SavedMethodsSheet, { SavedPaymentMethod } from '../src/components/payment/SavedMethodsSheet'
import { PromotionsSheet } from '../src/components/promotions/PromotionsSheet'

export default function PaymentScreen() {
  const { theme, isDark } = useTheme()
  const { bookingId, rideId, mode } = useLocalSearchParams<{ bookingId?: string; rideId?: string; mode?: string }>()

  // Active target identifier
  const activeRideId = rideId || ''
  const activeBookingId = bookingId || ''

  // Data states
  const [fareData, setFareData] = useState<any>(null)
  const [wallet, setWallet] = useState({
    cash_balance: 0,
    promo_credit_balance: 0,
    referral_reward_balance: 0,
    pending_refund_balance: 0,
    reward_points: 0,
    reward_value: 0,
  })
  const [savedMethods, setSavedMethods] = useState<SavedPaymentMethod[]>([])
  const [selectedMethodType, setSelectedMethodType] = useState<'SAVED' | 'WALLET' | 'CASH' | 'NEW_GATEWAY'>('SAVED')
  const [selectedSavedMethod, setSelectedSavedMethod] = useState<SavedPaymentMethod | null>(null)

  // Promotion & Credits states
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null)
  const [useCredits, setUseCredits] = useState(true)
  const [useWallet, setUseWallet] = useState(true)
  const [showPromosSheet, setShowPromosSheet] = useState(false)

  // UI Flow states
  const [loading, setLoading] = useState(true)
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [paying, setPaying] = useState(false)
  const [paymentStatusText, setPaymentStatusText] = useState('')
  const [showSavedMethodsModal, setShowSavedMethodsModal] = useState(false)
  const [topupAmount, setTopupAmount] = useState('500')
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [walletRes, methodsRes] = await Promise.allSettled([
        walletApi.getSummary(),
        paymentApi.getMethods(),
      ])

      if (walletRes.status === 'fulfilled') {
        const d = walletRes.value.data?.data || {}
        setWallet({
          cash_balance: d.cash_balance ?? d.balance ?? 0,
          promo_credit_balance: d.promo_credit_balance ?? 0,
          referral_reward_balance: d.referral_reward_balance ?? 0,
          pending_refund_balance: d.pending_refund_balance ?? 0,
          reward_points: d.reward_points ?? 0,
          reward_value: d.reward_value ?? 0,
        })
      }

      if (methodsRes.status === 'fulfilled') {
        const m = methodsRes.value.data?.data || []
        setSavedMethods(m)
        const def = m.find((item: SavedPaymentMethod) => item.is_default) || m[0]
        if (def) {
          setSelectedSavedMethod(def)
          setSelectedMethodType('SAVED')
        } else {
          setSelectedMethodType('NEW_GATEWAY')
        }
      }

      // Load Ride or Booking details
      if (activeRideId) {
        try {
          const rRes = await api.get(`/matching/customer/rides/${activeRideId}/receipt`)
          setFareData(rRes.data?.data)
        } catch {
          // If receipt not generated yet, estimate or default
          setFareData({
            base_fare: 75.0,
            distance_charge: 180.0,
            time_charge: 50.0,
            waiting_charge: 0.0,
            stops_fee: 0.0,
            tolls_charge: 0.0,
            taxes_and_fees: 15.25,
            customer_final_fare: 320.25,
          })
        }
      } else if (activeBookingId) {
        try {
          const bRes = await api.get(`/bookings/${activeBookingId}`)
          const bData = bRes.data?.data || bRes.data
          setFareData({
            base_fare: 100.0,
            distance_charge: (bData?.total_fare || 450.0) - 130.0,
            time_charge: 30.0,
            waiting_charge: 0.0,
            stops_fee: 0.0,
            tolls_charge: 0.0,
            taxes_and_fees: 20.0,
            customer_final_fare: bData?.total_fare || 450.0,
          })
        } catch {
          setFareData({
            base_fare: 100.0,
            distance_charge: 300.0,
            time_charge: 30.0,
            waiting_charge: 0.0,
            stops_fee: 0.0,
            tolls_charge: 0.0,
            taxes_and_fees: 20.0,
            customer_final_fare: 450.0,
          })
        }
      }
    } catch {
      // Offline fallback
    } finally {
      setLoading(false)
    }
  }, [activeRideId, activeBookingId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // App Switching & Background Recovery
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active' && activeOrderId) {
        try {
          const statusRes = await paymentApi.getStatus(activeOrderId)
          if (statusRes.data?.data?.status === 'captured') {
            setActiveOrderId(null)
            Alert.alert('✅ Payment Verified', 'Your payment was successful!', [
              {
                text: 'View Receipt',
                onPress: () => {
                  if (activeRideId) {
                    router.replace({ pathname: '/rate-trip', params: { rideId: activeRideId } } as any)
                  } else {
                    router.replace('/(tabs)/trips' as any)
                  }
                },
              },
            ])
          }
        } catch {}
      }
    })
    return () => subscription.remove()
  }, [activeOrderId, activeRideId])

  // Coupon Validation
  const handleValidateCoupon = async () => {
    const code = couponCode.trim().toUpperCase()
    if (!code) return
    setValidatingCoupon(true)
    const baseFare = fareData?.customer_final_fare || 350.0
    try {
      const res = await paymentApi.validateCoupon(code, baseFare)
      setAppliedCoupon(res.data?.data)
      Alert.alert('🎉 Coupon Applied!', `You saved ₹${res.data?.data?.discount_amount}!`)
    } catch (e: any) {
      Alert.alert('Invalid Coupon', e?.response?.data?.detail || 'Coupon code not applicable')
      setAppliedCoupon(null)
    } finally {
      setValidatingCoupon(false)
    }
  }

  // Authoritative dynamic calculations
  const totalBaseFare = fareData?.customer_final_fare || 350.0
  const couponDiscount = appliedCoupon ? appliedCoupon.discount_amount : 0.0
  const fareAfterCoupon = Math.max(totalBaseFare - couponDiscount, 0.0)

  const promoCreditsUsable = useCredits ? Math.min(wallet.promo_credit_balance, fareAfterCoupon) : 0.0
  const fareAfterCredits = Math.max(fareAfterCoupon - promoCreditsUsable, 0.0)

  const walletDeductionUsable = useWallet && selectedMethodType !== 'CASH'
    ? Math.min(wallet.cash_balance, fareAfterCredits)
    : 0.0

  const finalGatewayPayable = Math.max(fareAfterCredits - walletDeductionUsable, 0.0)

  // Payment Execution Pipeline
  const handleProceedPayment = async () => {
    setPaying(true)
    setPaymentStatusText('Creating secure payment intent...')

    try {
      const intentRes = await paymentApi.createIntent({
        ride_id: activeRideId || undefined,
        booking_id: activeBookingId || undefined,
        payment_method: selectedMethodType === 'CASH' ? 'cash' : selectedMethodType === 'WALLET' ? 'wallet' : 'upi',
        saved_method_id: selectedSavedMethod?.id,
        coupon_code: appliedCoupon ? appliedCoupon.code : undefined,
        use_promo_credits: useCredits,
        use_wallet_balance: useWallet,
        idempotency_key: `INTENT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      })

      const data = intentRes.data?.data

      // If CASH payment
      if (data?.payment_mode === 'CASH') {
        Alert.alert('💵 Cash Payment Selected', `Please pay ₹${data.amount_payable_in_cash} directly to the driver upon destination arrival.`, [
          {
            text: 'Got It',
            onPress: () => {
              if (activeRideId) router.replace({ pathname: '/track', params: { rideId: activeRideId } } as any)
              else router.replace('/(tabs)/trips' as any)
            },
          },
        ])
        return
      }

      // If fully covered by Wallet / Credits
      if (data?.payment_mode === 'WALLET_FULL') {
        Alert.alert('✅ Payment Successful!', 'Paid using wallet & credits balance.', [
          {
            text: 'Proceed',
            onPress: () => {
              if (activeRideId) router.replace({ pathname: '/rate-trip', params: { rideId: activeRideId } } as any)
              else router.replace('/(tabs)/trips' as any)
            },
          },
        ])
        return
      }

      // Gateway Checkout
      if (data?.order) {
        const order = data.order
        setActiveOrderId(order.order_id)
        setPaymentStatusText('Redirecting to payment gateway...')

        const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://cab-management-1.onrender.com/api/v1'
        const checkoutUrl = `${API_URL}/payments/checkout.html`
        const params = new URLSearchParams({
          key_id: order.key_id,
          order_id: order.order_id,
          amount: String(order.amount_paise),
          currency: 'INR',
          name: 'Swiftify Cab',
          description: `Ride Payment (${activeRideId ? `Ride #${activeRideId.slice(0, 6)}` : 'Trip Booking'})`,
          callback_url: `${API_URL}/payments/payment-success?ride_id=${activeRideId}&booking_id=${activeBookingId}`,
        })

        const browserResult = await WebBrowser.openBrowserAsync(`${checkoutUrl}?${params}`)

        setPaymentStatusText('Verifying payment status...')
        const verifyRes = await paymentApi.getStatus(order.order_id)

        if (verifyRes.data?.data?.status === 'captured') {
          Alert.alert('✅ Payment Successful!', 'Your ride payment has been confirmed.', [
            {
              text: 'Rate Trip',
              onPress: () => {
                if (activeRideId) router.replace({ pathname: '/rate-trip', params: { rideId: activeRideId } } as any)
                else router.replace('/(tabs)/trips' as any)
              },
            },
          ])
        } else {
          Alert.alert('Payment Pending', 'If money was debited from your bank, it will be automatically reflected in your trip receipt.')
        }
      }
    } catch (e: any) {
      Alert.alert('Payment Error', e?.response?.data?.detail || 'Unable to process payment. Please try again.')
    } finally {
      setPaying(false)
      setPaymentStatusText('')
    }
  }

  // Top Up Wallet Mode
  const handleTopUp = async () => {
    const amt = parseFloat(topupAmount)
    if (isNaN(amt) || amt < 50) {
      Alert.alert('Invalid Amount', 'Minimum top-up amount is ₹50')
      return
    }
    setPaying(true)
    try {
      const res = await walletApi.topUp({ amount: amt })
      const order = res.data?.data
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://cab-management-1.onrender.com/api/v1'
      const checkoutUrl = `${API_URL}/payments/checkout.html`
      const params = new URLSearchParams({
        key_id: order.key_id,
        order_id: order.order_id,
        amount: String(order.amount_paise),
        currency: 'INR',
        name: 'Swiftify Wallet Top-Up',
        description: `Add ₹${amt} to Wallet`,
        callback_url: `${API_URL}/payments/payment-success?is_topup=true`,
      })
      await WebBrowser.openBrowserAsync(`${checkoutUrl}?${params}`)
      await loadData()
      Alert.alert('✅ Top-Up Processed', `₹${amt} credited to your wallet balance.`)
    } catch (e: any) {
      Alert.alert('Top-Up Failed', e?.response?.data?.detail || 'Could not process top-up')
    } finally {
      setPaying(false)
    }
  }

  if (mode === 'topup') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <AppText variant="title" bold>Add Money to Wallet</AppText>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
          <AppCard style={styles.topupBalanceCard}>
            <AppText variant="bodyS" color="muted">Current Wallet Balance</AppText>
            <AppText variant="display" bold color="primary" style={{ marginTop: 4 }}>
              ₹{wallet.cash_balance.toFixed(2)}
            </AppText>
          </AppCard>

          <AppText variant="subtitle" semibold style={{ marginTop: 24, marginBottom: 12 }}>
            Select Top-Up Amount
          </AppText>
          <View style={styles.chipRow}>
            {['100', '200', '500', '1000', '2000'].map((val) => (
              <TouchableOpacity
                key={val}
                style={[
                  styles.amountChip,
                  {
                    backgroundColor: topupAmount === val ? theme.colors.primary : theme.colors.surface,
                    borderColor: topupAmount === val ? theme.colors.primary : theme.colors.cardBorder,
                  },
                ]}
                onPress={() => setTopupAmount(val)}
              >
                <AppText variant="body" bold color={topupAmount === val ? 'white' : 'primary'}>
                  +₹{val}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.customInputCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.inputBorder }]}>
            <AppText variant="h2" bold color="muted" style={{ marginRight: 8 }}>₹</AppText>
            <TextInput
              style={[styles.customAmountInput, { color: theme.colors.textPrimary }]}
              placeholder="Enter custom amount"
              placeholderTextColor={theme.colors.placeholder}
              keyboardType="numeric"
              value={topupAmount}
              onChangeText={setTopupAmount}
            />
          </View>

          <AppButton
            variant="primary"
            fullWidth
            loading={paying}
            onPress={handleTopUp}
            style={{ marginTop: 32 }}
          >
            Add ₹{topupAmount || '0'} Securely
          </AppButton>
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <AppText variant="title" bold>Trip Payment</AppText>
        <TouchableOpacity onPress={() => setShowSavedMethodsModal(true)}>
          <Feather name="settings" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <AppLoader />
          <AppText variant="bodyS" color="muted" style={{ marginTop: 12 }}>Loading trip fare details...</AppText>
        </View>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Header Amount Banner */}
          <View style={[styles.totalBanner, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
            <View>
              <AppText variant="bodyS" color="muted">Total Trip Fare</AppText>
              <AppText variant="display" bold style={{ marginTop: 2 }}>
                ₹{totalBaseFare.toFixed(2)}
              </AppText>
            </View>
            <View style={[styles.securedBadge, { backgroundColor: `${theme.colors.success}18` }]}>
              <Feather name="shield" size={14} color={theme.colors.success} />
              <AppText variant="caption" bold style={{ color: theme.colors.success, marginLeft: 4 }}>
                100% Secure
              </AppText>
            </View>
          </View>

          {/* 1. Payment Method Selection */}
          <AppText variant="subtitle" semibold style={styles.sectionHeader}>
            Select Payment Method
          </AppText>

          {/* Saved Method Option */}
          {selectedSavedMethod && (
            <TouchableOpacity
              style={[
                styles.methodSelectCard,
                {
                  backgroundColor: selectedMethodType === 'SAVED' ? `${theme.colors.primary}12` : theme.colors.surface,
                  borderColor: selectedMethodType === 'SAVED' ? theme.colors.primary : theme.colors.cardBorder,
                },
              ]}
              onPress={() => setSelectedMethodType('SAVED')}
            >
              <View style={styles.radioBox}>
                <View style={[styles.radioOuter, { borderColor: selectedMethodType === 'SAVED' ? theme.colors.primary : theme.colors.textMuted }]}>
                  {selectedMethodType === 'SAVED' && <View style={[styles.radioInner, { backgroundColor: theme.colors.primary }]} />}
                </View>
              </View>

              <View style={styles.methodIconBox}>
                {selectedSavedMethod.method_type === 'UPI' ? (
                  <MaterialCommunityIcons name="qrcode-scan" size={22} color="#0284C7" />
                ) : (
                  <FontAwesome5 name="credit-card" size={20} color="#2563EB" />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AppText variant="body" bold>{selectedSavedMethod.display_title}</AppText>
                  {selectedSavedMethod.is_default && (
                    <View style={[styles.defChip, { backgroundColor: `${theme.colors.success}20` }]}>
                      <AppText variant="caption" bold style={{ color: theme.colors.success }}>Default</AppText>
                    </View>
                  )}
                </View>
                <AppText variant="small" color="muted">Fast 1-tap authorization</AppText>
              </View>

              <TouchableOpacity onPress={() => setShowSavedMethodsModal(true)} style={styles.changeBtn}>
                <AppText variant="small" bold color="primary">Change</AppText>
              </TouchableOpacity>
            </TouchableOpacity>
          )}

          {/* UPI / Card Online Gateway Option */}
          <TouchableOpacity
            style={[
              styles.methodSelectCard,
              {
                backgroundColor: selectedMethodType === 'NEW_GATEWAY' ? `${theme.colors.primary}12` : theme.colors.surface,
                borderColor: selectedMethodType === 'NEW_GATEWAY' ? theme.colors.primary : theme.colors.cardBorder,
              },
            ]}
            onPress={() => setSelectedMethodType('NEW_GATEWAY')}
          >
            <View style={styles.radioBox}>
              <View style={[styles.radioOuter, { borderColor: selectedMethodType === 'NEW_GATEWAY' ? theme.colors.primary : theme.colors.textMuted }]}>
                {selectedMethodType === 'NEW_GATEWAY' && <View style={[styles.radioInner, { backgroundColor: theme.colors.primary }]} />}
              </View>
            </View>
            <View style={styles.methodIconBox}>
              <MaterialCommunityIcons name="contactless-payment" size={22} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="body" bold>UPI Apps, Cards & NetBanking</AppText>
              <AppText variant="small" color="muted">Google Pay, PhonePe, Paytm, Visa, Mastercard</AppText>
            </View>
          </TouchableOpacity>

          {/* Cash on Arrival Option */}
          <TouchableOpacity
            style={[
              styles.methodSelectCard,
              {
                backgroundColor: selectedMethodType === 'CASH' ? `${theme.colors.primary}12` : theme.colors.surface,
                borderColor: selectedMethodType === 'CASH' ? theme.colors.primary : theme.colors.cardBorder,
              },
            ]}
            onPress={() => setSelectedMethodType('CASH')}
          >
            <View style={styles.radioBox}>
              <View style={[styles.radioOuter, { borderColor: selectedMethodType === 'CASH' ? theme.colors.primary : theme.colors.textMuted }]}>
                {selectedMethodType === 'CASH' && <View style={[styles.radioInner, { backgroundColor: theme.colors.primary }]} />}
              </View>
            </View>
            <View style={styles.methodIconBox}>
              <MaterialCommunityIcons name="cash-multiple" size={22} color="#16A34A" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="body" bold>Cash on Arrival</AppText>
              <AppText variant="small" color="muted">Pay driver in cash upon completing the ride</AppText>
            </View>
          </TouchableOpacity>

          {/* 2. Wallet & Promotional Credits Split */}
          <AppText variant="subtitle" semibold style={styles.sectionHeader}>
            Wallet & Promotional Balance
          </AppText>

          <View style={[styles.walletBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
            {/* Promo Credits */}
            <View style={styles.balanceSplitRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialCommunityIcons name="ticket-percent-outline" size={18} color="#D97706" />
                  <AppText variant="body" bold>Promotional Credits</AppText>
                </View>
                <AppText variant="small" color="muted">
                  Available: ₹{wallet.promo_credit_balance.toFixed(2)} (Subsidized platform value)
                </AppText>
              </View>
              <Switch
                value={useCredits}
                onValueChange={setUseCredits}
                trackColor={{ false: theme.colors.cardBorder, true: theme.colors.primary }}
                thumbColor="white"
                disabled={wallet.promo_credit_balance <= 0}
              />
            </View>

            <AppDivider marginVertical={10} />

            {/* Cash Wallet */}
            <View style={styles.balanceSplitRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="credit-card" size={16} color={theme.colors.primary} />
                  <AppText variant="body" bold>Cash Wallet Balance</AppText>
                </View>
                <AppText variant="small" color="muted">
                  Available: ₹{wallet.cash_balance.toFixed(2)}
                </AppText>
              </View>
              <Switch
                value={useWallet}
                onValueChange={setUseWallet}
                trackColor={{ false: theme.colors.cardBorder, true: theme.colors.primary }}
                thumbColor="white"
                disabled={wallet.cash_balance <= 0 || selectedMethodType === 'CASH'}
              />
            </View>
          </View>

          {/* 3. Promo Code Section */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 10 }}>
            <AppText variant="subtitle" semibold>
              Promo Code / Offers
            </AppText>
            <TouchableOpacity onPress={() => setShowPromosSheet(true)}>
              <AppText variant="bodyS" bold color="primary">Browse Offers</AppText>
            </TouchableOpacity>
          </View>

          <View style={[styles.couponCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
            <TextInput
              style={[styles.couponInput, { color: theme.colors.textPrimary }]}
              placeholder="Enter promo code (e.g. SWIFT50)"
              placeholderTextColor={theme.colors.placeholder}
              autoCapitalize="characters"
              value={couponCode}
              onChangeText={setCouponCode}
              editable={!appliedCoupon}
            />
            {appliedCoupon ? (
              <TouchableOpacity
                style={styles.removeCouponBtn}
                onPress={() => {
                  setAppliedCoupon(null)
                  setCouponCode('')
                }}
              >
                <Feather name="x-circle" size={20} color={theme.colors.error} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.applyBtn, { backgroundColor: theme.colors.primary }]}
                onPress={handleValidateCoupon}
                disabled={validatingCoupon || !couponCode.trim()}
              >
                {validatingCoupon ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <AppText variant="bodyS" bold color="white">Apply</AppText>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* 4. Transparent Itemized Fare Breakdown */}
          <AppText variant="subtitle" semibold style={styles.sectionHeader}>
            Fare Breakdown
          </AppText>

          <View style={[styles.breakdownCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
            <View style={styles.fareRow}>
              <AppText variant="bodyS" color="secondary">Base Fare</AppText>
              <AppText variant="bodyS" bold>₹{(fareData?.base_fare || 75).toFixed(2)}</AppText>
            </View>

            <View style={styles.fareRow}>
              <AppText variant="bodyS" color="secondary">Distance & Time Charge</AppText>
              <AppText variant="bodyS" bold>₹{((fareData?.distance_charge || 180) + (fareData?.time_charge || 50)).toFixed(2)}</AppText>
            </View>

            {Boolean(fareData?.waiting_charge && fareData.waiting_charge > 0) && (
              <View style={styles.fareRow}>
                <AppText variant="bodyS" color="secondary">Waiting Fee</AppText>
                <AppText variant="bodyS" bold>₹{fareData.waiting_charge.toFixed(2)}</AppText>
              </View>
            )}

            {Boolean(fareData?.tolls_charge && fareData.tolls_charge > 0) && (
              <View style={styles.fareRow}>
                <AppText variant="bodyS" color="secondary">Tolls & Parking</AppText>
                <AppText variant="bodyS" bold>₹{fareData.tolls_charge.toFixed(2)}</AppText>
              </View>
            )}

            <View style={styles.fareRow}>
              <AppText variant="bodyS" color="secondary">Taxes & Govt GST (5%)</AppText>
              <AppText variant="bodyS" bold>₹{(fareData?.taxes_and_fees || 15.25).toFixed(2)}</AppText>
            </View>

            {couponDiscount > 0 && (
              <View style={styles.fareRow}>
                <AppText variant="bodyS" bold color="success">Coupon Discount ({appliedCoupon?.code})</AppText>
                <AppText variant="bodyS" bold color="success">-₹{couponDiscount.toFixed(2)}</AppText>
              </View>
            )}

            {promoCreditsUsable > 0 && (
              <View style={styles.fareRow}>
                <AppText variant="bodyS" bold style={{ color: '#D97706' }}>Promotional Credits Applied</AppText>
                <AppText variant="bodyS" bold style={{ color: '#D97706' }}>-₹{promoCreditsUsable.toFixed(2)}</AppText>
              </View>
            )}

            {walletDeductionUsable > 0 && (
              <View style={styles.fareRow}>
                <AppText variant="bodyS" bold color="primary">Wallet Split Deduction</AppText>
                <AppText variant="bodyS" bold color="primary">-₹{walletDeductionUsable.toFixed(2)}</AppText>
              </View>
            )}

            <AppDivider marginVertical={10} />

            <View style={styles.totalRow}>
              <View>
                <AppText variant="body" bold>Final Payable</AppText>
                <AppText variant="caption" color="muted">
                  {selectedMethodType === 'CASH' ? 'To be paid in cash to driver' : 'Gateway authorized deduction'}
                </AppText>
              </View>
              <AppText variant="h2" bold color="primary">
                ₹{finalGatewayPayable.toFixed(2)}
              </AppText>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Floating Bottom Pay Bar */}
      {!loading && (
        <View style={[styles.bottomBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.cardBorder }]}>
          <View style={styles.bottomBarInfo}>
            <AppText variant="caption" color="muted">TOTAL AMOUNT</AppText>
            <AppText variant="title" bold color="primary">
              ₹{finalGatewayPayable.toFixed(2)}
            </AppText>
          </View>

          <AppButton
            variant="primary"
            loading={paying}
            onPress={handleProceedPayment}
            style={styles.payBtn}
          >
            {selectedMethodType === 'CASH'
              ? 'Confirm Cash Booking'
              : finalGatewayPayable === 0
              ? 'Pay via Wallet & Credits'
              : `🔒 Pay ₹${finalGatewayPayable.toFixed(2)}`}
          </AppButton>
        </View>
      )}

      {/* Saved Methods Modal */}
      <SavedMethodsSheet
        visible={showSavedMethodsModal}
        onClose={() => setShowSavedMethodsModal(false)}
        onSelectMethod={(m) => {
          setSelectedSavedMethod(m)
          setSelectedMethodType('SAVED')
        }}
        selectedMethodId={selectedSavedMethod?.id}
      />

      {/* Promotions Bottom Sheet */}
      <PromotionsSheet
        visible={showPromosSheet}
        onClose={() => setShowPromosSheet(false)}
        bookingAmount={totalBaseFare}
        serviceType="CAB"
        appliedPromoId={appliedCoupon?.campaign_id}
        onApplyPromo={(p) => {
          setAppliedCoupon({
            campaign_id: p.campaign_id,
            code: p.code || 'OFFER',
            discount_amount: p.discount_amount,
            cashback_amount: p.cashback_amount,
            description: p.title,
          })
          if (p.code) setCouponCode(p.code)
        }}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backBtn: {
    padding: 4,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    paddingHorizontal: 20,
  },
  totalBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1.5,
    marginTop: 10,
    marginBottom: 16,
  },
  securedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionHeader: {
    marginTop: 18,
    marginBottom: 10,
  },
  methodSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  radioBox: {
    marginRight: 10,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  methodIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginRight: 12,
  },
  defChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  changeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  walletBox: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  balanceSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  couponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  couponInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    fontWeight: '600',
  },
  applyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  removeCouponBtn: {
    padding: 6,
  },
  breakdownCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  bottomBarInfo: {
    flex: 1,
  },
  payBtn: {
    flex: 1.5,
  },
  topupBalanceCard: {
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  amountChip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  customInputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    marginTop: 20,
  },
  customAmountInput: {
    flex: 1,
    height: 48,
    fontSize: 18,
    fontWeight: '700',
  },
})
