/**
 * Feature 15: Driver Withdrawal Screen
 * ─────────────────────────────────────────────────────────────────────────────
 *  - Available Balance vs Pending Balance validation
 *  - Quick amount presets (₹500, ₹1000, ₹2000, Full Balance)
 *  - Destination selector: Verified Bank Account or UPI ID
 *  - Instant fee breakdown & authoritative backend submission with Idempotency Key
 *  - High-contrast Light Mode and low-glare OLED Dark Mode support
 */
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'

import { useTheme } from '../../src/theme'
import { PayoutAndWalletService } from '../../src/services/payoutAndWalletService'
import { DriverWalletSummaryData, PayoutMethodItem } from '../../src/types/payoutAndWallet'

export default function WithdrawScreen() {
  const { isDark } = useTheme()
  const [walletData, setWalletData] = useState<DriverWalletSummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [amountStr, setAmountStr] = useState('')
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [successReceipt, setSuccessReceipt] = useState<any | null>(null)

  useEffect(() => {
    loadWallet()
  }, [])

  const loadWallet = async () => {
    try {
      const data = await PayoutAndWalletService.getWalletSummary()
      setWalletData(data)
      const defaultM = data.payout_methods.find(m => m.is_default && m.is_verified) || data.payout_methods.find(m => m.is_verified)
      if (defaultM) {
        setSelectedMethodId(defaultM.id)
      }
    } catch (err: any) {
      console.warn('Load wallet error:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePreset = (val: number) => {
    if (!walletData) return
    const clamped = Math.min(val, walletData.available_balance)
    setAmountStr(clamped.toString())
  }

  const handleFullBalance = () => {
    if (!walletData) return
    setAmountStr(Math.floor(walletData.available_balance).toString())
  }

  const numAmount = parseFloat(amountStr) || 0
  const isAmountValid =
    walletData &&
    numAmount >= walletData.min_payout_amount &&
    numAmount <= walletData.max_payout_amount &&
    numAmount <= walletData.available_balance

  const handleWithdraw = async () => {
    if (!isAmountValid) {
      Alert.alert('Invalid Amount', `Please enter an amount between ₹${walletData?.min_payout_amount} and ₹${walletData?.available_balance.toFixed(2)}.`)
      return
    }
    if (!selectedMethodId) {
      Alert.alert('Select Destination', 'Please choose a verified Bank Account or UPI ID for payout.')
      return
    }

    setProcessing(true)
    try {
      const idempotencyKey = `wd_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      const res = await PayoutAndWalletService.requestWithdrawal(
        numAmount,
        selectedMethodId,
        idempotencyKey
      )

      if (res.success) {
        setSuccessReceipt(res)
        loadWallet()
      } else {
        Alert.alert('Payout Failed', res.message || 'Transaction could not be completed.')
      }
    } catch (err: any) {
      Alert.alert('Payout Error', err.message || 'Could not process payout request.')
    } finally {
      setProcessing(false)
    }
  }

  const bgCard = isDark ? '#1E293B' : '#FFFFFF'
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A'
  const textSecondary = isDark ? '#94A3B8' : '#64748B'
  const borderCol = isDark ? '#334155' : '#E2E8F0'

  if (loading) {
    return (
      <View style={[styles.centerRoot, { backgroundColor: isDark ? '#020617' : '#F8FAFC' }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: isDark ? '#020617' : '#F8FAFC' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={{ backgroundColor: isDark ? '#020617' : '#F8FAFC' }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="arrow-left" size={22} color={textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>Withdraw Funds</Text>
          <TouchableOpacity onPress={() => router.push('/wallet/methods' as any)}>
            <Feather name="settings" size={20} color={textSecondary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Success Modal / Banner */}
        {successReceipt ? (
          <View style={[styles.successCard, { backgroundColor: isDark ? '#064E3B' : '#DCFCE7', borderColor: '#10B981' }]}>
            <View style={styles.successIconBox}>
              <Feather name="check" size={24} color="#10B981" />
            </View>
            <Text style={[styles.successTitle, { color: isDark ? '#ECFDF5' : '#065F46' }]}>Payout Successful!</Text>
            <Text style={[styles.successSubtitle, { color: isDark ? '#A7F3D0' : '#047857' }]}>
              ₹{successReceipt.amount.toLocaleString('en-IN')} transferred to {successReceipt.destination_masked}
            </Text>
            <Text style={[styles.successRef, { color: isDark ? '#6EE7B7' : '#059669' }]}>
              Ref: {successReceipt.reference}
            </Text>
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => {
                setSuccessReceipt(null)
                router.back()
              }}
            >
              <Text style={styles.doneBtnText}>Back to Wallet</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Balance Overview Banner */}
            <View style={styles.balanceBanner}>
              <LinearGradient
                colors={isDark ? ['#1E1B4B', '#312E81'] : ['#2563EB', '#3B82F6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.balanceLabel}>AVAILABLE FOR WITHDRAWAL</Text>
              <Text style={styles.balanceVal}>
                ₹{walletData?.available_balance.toLocaleString('en-IN') || '0.00'}
              </Text>
              {walletData && walletData.pending_balance > 0 && (
                <View style={styles.pendingBadge}>
                  <Feather name="clock" size={12} color="#FDE047" />
                  <Text style={styles.pendingBadgeText}>
                    +₹{walletData.pending_balance.toLocaleString('en-IN')} Pending Settlement
                  </Text>
                </View>
              )}
            </View>

            {/* Amount Input Box */}
            <View style={[styles.inputCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
              <Text style={[styles.inputLabel, { color: textSecondary }]}>Enter Withdrawal Amount</Text>
              <View style={styles.inputRow}>
                <Text style={[styles.currencyPrefix, { color: textPrimary }]}>₹</Text>
                <TextInput
                  style={[styles.textInput, { color: textPrimary }]}
                  placeholder="0"
                  placeholderTextColor={textSecondary}
                  keyboardType="numeric"
                  value={amountStr}
                  onChangeText={setAmountStr}
                  autoFocus
                />
              </View>

              {/* Quick Presets */}
              <View style={styles.presetsRow}>
                {[500, 1000, 2000].map(val => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.presetChip, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}
                    onPress={() => handlePreset(val)}
                  >
                    <Text style={[styles.presetText, { color: textPrimary }]}>+₹{val}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.presetChip, styles.presetChipMax]}
                  onPress={handleFullBalance}
                >
                  <Text style={styles.presetTextMax}>Full Balance</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Destination Method Selector */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>Payout Destination</Text>
              <TouchableOpacity onPress={() => router.push('/wallet/methods' as any)}>
                <Text style={styles.manageLinkText}>+ Add Method</Text>
              </TouchableOpacity>
            </View>

            {walletData?.payout_methods.length === 0 ? (
              <TouchableOpacity
                style={[styles.noMethodCard, { backgroundColor: bgCard, borderColor: borderCol }]}
                onPress={() => router.push('/wallet/methods' as any)}
              >
                <Feather name="plus-circle" size={28} color="#3B82F6" />
                <Text style={[styles.noMethodText, { color: textPrimary }]}>Link Bank Account or UPI</Text>
                <Text style={[styles.noMethodSub, { color: textSecondary }]}>Instant verification required for withdrawals</Text>
              </TouchableOpacity>
            ) : (
              walletData?.payout_methods.map(method => {
                const isSelected = selectedMethodId === method.id
                return (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.methodCard,
                      { backgroundColor: bgCard, borderColor: isSelected ? '#3B82F6' : borderCol },
                    ]}
                    onPress={() => setSelectedMethodId(method.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.methodIconBox, { backgroundColor: method.method_type === 'BANK' ? '#EFF6FF' : '#F5F3FF' }]}>
                      <MaterialCommunityIcons
                        name={method.method_type === 'BANK' ? 'bank' : 'cellphone'}
                        size={22}
                        color={method.method_type === 'BANK' ? '#2563EB' : '#7C3AED'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.methodName, { color: textPrimary }]}>{method.display_label}</Text>
                        {method.is_default && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.methodSub, { color: textSecondary }]}>
                        {method.method_type === 'BANK' ? `IFSC: ${method.ifsc_code}` : 'Instant UPI VPA'}
                      </Text>
                    </View>
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={22}
                      color={isSelected ? '#3B82F6' : textSecondary}
                    />
                  </TouchableOpacity>
                )
              })
            )}

            {/* Fee and Limits Summary Card */}
            <View style={[styles.feeCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
              <View style={styles.feeRow}>
                <Text style={[styles.feeLabel, { color: textSecondary }]}>Withdrawal Amount</Text>
                <Text style={[styles.feeVal, { color: textPrimary }]}>₹{numAmount.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={[styles.feeLabel, { color: textSecondary }]}>Transfer Fee (Instant)</Text>
                <Text style={[styles.feeVal, { color: '#10B981' }]}>FREE</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.feeRow}>
                <Text style={[styles.feeTotalLabel, { color: textPrimary }]}>Net Payout to Bank/UPI</Text>
                <Text style={[styles.feeTotalVal, { color: '#2563EB' }]}>₹{numAmount.toLocaleString('en-IN')}</Text>
              </View>
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              style={[
                styles.withdrawBtn,
                (!isAmountValid || !selectedMethodId || processing) && styles.withdrawBtnDisabled,
              ]}
              disabled={!isAmountValid || !selectedMethodId || processing}
              onPress={handleWithdraw}
              activeOpacity={0.85}
            >
              {processing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.withdrawBtnText}>
                  Confirm Withdrawal (₹{numAmount > 0 ? numAmount.toLocaleString('en-IN') : '0'})
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centerRoot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  balanceBanner: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  balanceVal: { color: '#FFFFFF', fontSize: 34, fontWeight: '900', marginVertical: 6 },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  pendingBadgeText: { color: '#FDE047', fontSize: 12, fontWeight: '700' },
  inputCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  currencyPrefix: { fontSize: 32, fontWeight: '800', marginRight: 8 },
  textInput: { flex: 1, fontSize: 36, fontWeight: '900', padding: 0 },
  presetsRow: { flexDirection: 'row', gap: 8 },
  presetChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetText: { fontSize: 13, fontWeight: '700' },
  presetChipMax: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#93C5FD' },
  presetTextMax: { color: '#2563EB', fontSize: 13, fontWeight: '800' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  manageLinkText: { color: '#2563EB', fontSize: 14, fontWeight: '700' },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  methodIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodName: { fontSize: 15, fontWeight: '700' },
  methodSub: { fontSize: 12, marginTop: 2 },
  defaultBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultBadgeText: { color: '#16A34A', fontSize: 9, fontWeight: '800' },
  noMethodCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  noMethodText: { fontSize: 16, fontWeight: '800', marginTop: 10 },
  noMethodSub: { fontSize: 13, marginTop: 4, textAlign: 'center' },
  feeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginVertical: 16,
  },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  feeLabel: { fontSize: 13, fontWeight: '600' },
  feeVal: { fontSize: 13, fontWeight: '700' },
  divider: { height: 1, backgroundColor: 'rgba(150,150,150,0.15)', marginVertical: 8 },
  feeTotalLabel: { fontSize: 15, fontWeight: '800' },
  feeTotalVal: { fontSize: 17, fontWeight: '900' },
  withdrawBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  withdrawBtnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  withdrawBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  successCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    marginVertical: 20,
  },
  successIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successTitle: { fontSize: 20, fontWeight: '900', marginBottom: 6 },
  successSubtitle: { fontSize: 15, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  successRef: { fontSize: 13, fontWeight: '700', marginBottom: 20 },
  doneBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  doneBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
})
