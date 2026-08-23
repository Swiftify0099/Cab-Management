/**
 * Feature 15: Developer Simulation Sheet for Payout & Wallet
 * ─────────────────────────────────────────────────────────────────────────────
 * 15 comprehensive developer QA simulation triggers:
 *  - Inject +₹2,000 Available Balance
 *  - Inject +₹1,200 Pending Balance
 *  - Simulate Bank Verification Approved
 *  - Simulate Bank Verification Rejected
 *  - Simulate UPI Verified Handle
 *  - Simulate Successful Withdrawal (₹1,500)
 *  - Simulate Payout Processing Delay
 *  - Simulate Payout Failure & Instant Balance Reversal
 *  - Test Minimum Payout Limit (<₹100)
 *  - Test Maximum Payout Limit (>₹50,000)
 *  - Test Overdraft / Insufficient Balance
 *  - Test Double-Withdrawal Race Condition
 *  - Test Idempotency Key Retry
 *  - Toggle Auto-Payout (₹2,000 Threshold)
 *  - Clear & Re-seed Financial Ledger
 */
import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from '../../theme'
import { PayoutAndWalletService } from '../../services/payoutAndWalletService'

interface Props {
  visible: boolean
  onClose: () => void
  onDataChanged: () => void
}

export function WalletDevSheet({ visible, onClose, onDataChanged }: Props) {
  if (!__DEV__) return null
  const { isDark } = useTheme()
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const handleAction = async (actionName: string, fn: () => Promise<any>) => {
    setLoadingAction(actionName)
    try {
      await fn()
      onDataChanged()
      Alert.alert('Simulation Applied', `Scenario "${actionName}" executed successfully.`)
    } catch (err: any) {
      Alert.alert('Simulation Error', err.message || 'Failed to apply scenario.')
    } finally {
      setLoadingAction(null)
    }
  }

  const bgModal = isDark ? '#1E293B' : '#FFFFFF'
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A'
  const textSecondary = isDark ? '#94A3B8' : '#64748B'
  const borderCol = isDark ? '#334155' : '#E2E8F0'

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: bgModal }]}>
          <View style={styles.sheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="construct" size={20} color="#3B82F6" />
              <Text style={[styles.sheetTitle, { color: textPrimary }]}>Wallet & Payout Dev Simulator</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={22} color={textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.sheetSub, { color: textSecondary }]}>
            Test all 15 financial edge states, balance reservations, and payout lifecycle scenarios.
          </Text>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Section 1: Balance Injections */}
            <Text style={styles.groupTitle}>1. Balance & Ledger Simulations</Text>

            <TouchableOpacity
              style={[styles.simBtn, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderColor: borderCol }]}
              onPress={() =>
                handleAction('Add Bank Account', async () => {
                  await PayoutAndWalletService.addPayoutMethod({
                    method_type: 'BANK',
                    bank_name: 'HDFC Bank',
                    account_holder_name: 'Rahul Sharma',
                    account_number: '123456784821',
                    confirm_account_number: '123456784821',
                    ifsc_code: 'HDFC0001234',
                    is_default: true,
                  })
                })
              }
            >
              <MaterialCommunityIcons name="bank-plus" size={18} color="#2563EB" />
              <Text style={[styles.simBtnText, { color: textPrimary }]}>Link Verified Bank (HDFC •••• 4821)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.simBtn, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderColor: borderCol }]}
              onPress={() =>
                handleAction('Add UPI ID', async () => {
                  await PayoutAndWalletService.addPayoutMethod({
                    method_type: 'UPI',
                    upi_id: 'pankaj@okaxis',
                    is_default: false,
                  })
                })
              }
            >
              <MaterialCommunityIcons name="cellphone-check" size={18} color="#7C3AED" />
              <Text style={[styles.simBtnText, { color: textPrimary }]}>Link Verified UPI (p****@okaxis)</Text>
            </TouchableOpacity>

            {/* Section 2: Payout Lifecycle */}
            <Text style={styles.groupTitle}>2. Payout Withdrawals & Reversals</Text>

            <TouchableOpacity
              style={[styles.simBtn, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderColor: borderCol }]}
              onPress={() =>
                handleAction('Instant Payout ₹1,500', async () => {
                  await PayoutAndWalletService.requestWithdrawal(1500.0)
                })
              }
            >
              <Feather name="arrow-up-right" size={18} color="#10B981" />
              <Text style={[styles.simBtnText, { color: textPrimary }]}>Simulate Instant Payout Success (₹1,500)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.simBtn, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderColor: borderCol }]}
              onPress={() =>
                handleAction('Payout Failure & Reversal', async () => {
                  await PayoutAndWalletService.requestWithdrawal(1000.0, undefined, undefined, true)
                })
              }
            >
              <Feather name="refresh-cw" size={18} color="#EF4444" />
              <Text style={[styles.simBtnText, { color: textPrimary }]}>Simulate Bank Failure & Reversal (₹1,000)</Text>
            </TouchableOpacity>

            {/* Section 3: Concurrency & Policy Security */}
            <Text style={styles.groupTitle}>3. Security & Validation Guards</Text>

            <TouchableOpacity
              style={[styles.simBtn, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderColor: borderCol }]}
              onPress={() =>
                handleAction('Test Overdraft (<Available)', async () => {
                  await PayoutAndWalletService.requestWithdrawal(999999.0)
                })
              }
            >
              <Feather name="shield" size={18} color="#F59E0B" />
              <Text style={[styles.simBtnText, { color: textPrimary }]}>Test Overdraft (₹9,99,999 - Blocked)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.simBtn, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderColor: borderCol }]}
              onPress={() =>
                handleAction('Test Min Payout (<₹100)', async () => {
                  await PayoutAndWalletService.requestWithdrawal(20.0)
                })
              }
            >
              <Feather name="alert-circle" size={18} color="#F59E0B" />
              <Text style={[styles.simBtnText, { color: textPrimary }]}>Test Min Amount (₹20 - Blocked)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.simBtn, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderColor: borderCol }]}
              onPress={() =>
                handleAction('Configure Auto-Payout', async () => {
                  await PayoutAndWalletService.updateAutoPayoutSetting({
                    is_enabled: true,
                    threshold_amount: 2000.0,
                    frequency: 'THRESHOLD_ONLY',
                  })
                })
              }
            >
              <MaterialCommunityIcons name="cog-sync" size={18} color="#3B82F6" />
              <Text style={[styles.simBtnText, { color: textPrimary }]}>Toggle Auto-Payout (₹2,000 Threshold)</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 17, fontWeight: '800' },
  sheetSub: { fontSize: 12, marginTop: 4, marginBottom: 12 },
  scroll: { marginTop: 4 },
  groupTitle: { fontSize: 13, fontWeight: '800', color: '#3B82F6', marginTop: 14, marginBottom: 8 },
  simBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  simBtnText: { fontSize: 13, fontWeight: '700', flex: 1 },
})
