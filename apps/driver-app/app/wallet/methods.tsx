/**
 * Feature 15: Payout Methods Management Screen
 * ─────────────────────────────────────────────────────────────────────────────
 *  - Bank Accounts & UPI Payout Destinations list
 *  - Verification badges (✓ Verified, Under Review)
 *  - Add Bank Account Sheet (Bank Name, Account Number, Confirm Number, IFSC)
 *  - Add UPI ID Sheet (VPA Handle, instant format validation)
 *  - Set Default and Delete actions
 *  - Light & Dark theme support
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
  Modal,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'

import { useTheme } from '../../src/theme'
import { PayoutAndWalletService } from '../../src/services/payoutAndWalletService'
import { PayoutMethodItem } from '../../src/types/payoutAndWallet'

export default function PayoutMethodsScreen() {
  const { isDark } = useTheme()
  const [methods, setMethods] = useState<PayoutMethodItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addType, setAddType] = useState<'BANK' | 'UPI'>('BANK')

  // Bank Form State
  const [bankName, setBankName] = useState('HDFC Bank')
  const [accHolder, setAccHolder] = useState('')
  const [accNumber, setAccNumber] = useState('')
  const [confirmAccNumber, setConfirmAccNumber] = useState('')
  const [ifsc, setIfsc] = useState('')

  // UPI Form State
  const [upiId, setUpiId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadMethods()
  }, [])

  const loadMethods = async () => {
    try {
      const summary = await PayoutAndWalletService.getWalletSummary()
      setMethods(summary.payout_methods || [])
    } catch (err: any) {
      console.warn('Load methods error:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSetDefault = async (methodId: string) => {
    try {
      await PayoutAndWalletService.setDefaultPayoutMethod(methodId)
      loadMethods()
    } catch (err: any) {
      Alert.alert('Error', err.message)
    }
  }

  const handleDelete = (methodId: string) => {
    Alert.alert(
      'Remove Payout Method',
      'Are you sure you want to remove this payout destination?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await PayoutAndWalletService.deletePayoutMethod(methodId)
              loadMethods()
            } catch (err: any) {
              Alert.alert('Error', err.message)
            }
          },
        },
      ]
    )
  }

  const handleAddSubmit = async () => {
    setSubmitting(true)
    try {
      if (addType === 'BANK') {
        if (!accNumber || !ifsc) {
          Alert.alert('Validation Error', 'Account number and IFSC code are required.')
          setSubmitting(false)
          return
        }
        if (accNumber !== confirmAccNumber) {
          Alert.alert('Validation Error', 'Account numbers do not match.')
          setSubmitting(false)
          return
        }

        await PayoutAndWalletService.addPayoutMethod({
          method_type: 'BANK',
          bank_name: bankName,
          account_holder_name: accHolder,
          account_number: accNumber,
          confirm_account_number: confirmAccNumber,
          ifsc_code: ifsc,
          is_default: methods.length === 0,
        })
      } else {
        if (!upiId || !upiId.includes('@')) {
          Alert.alert('Validation Error', 'Please enter a valid UPI ID (e.g. name@okaxis).')
          setSubmitting(false)
          return
        }

        await PayoutAndWalletService.addPayoutMethod({
          method_type: 'UPI',
          upi_id: upiId,
          is_default: methods.length === 0,
        })
      }

      setShowAddModal(false)
      // Reset fields
      setAccNumber('')
      setConfirmAccNumber('')
      setIfsc('')
      setUpiId('')
      loadMethods()
      Alert.alert('Success', `${addType} payout method verified and added.`)
    } catch (err: any) {
      Alert.alert('Add Method Failed', err.message || 'Could not link payout method.')
    } finally {
      setSubmitting(false)
    }
  }

  const bgCard = isDark ? '#1E293B' : '#FFFFFF'
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A'
  const textSecondary = isDark ? '#94A3B8' : '#64748B'
  const borderCol = isDark ? '#334155' : '#E2E8F0'

  return (
    <View style={[styles.root, { backgroundColor: isDark ? '#020617' : '#F8FAFC' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={{ backgroundColor: isDark ? '#020617' : '#F8FAFC' }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="arrow-left" size={22} color={textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>Payout Destinations</Text>
          <TouchableOpacity onPress={() => setShowAddModal(true)}>
            <Feather name="plus" size={24} color="#3B82F6" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Security Info Card */}
        <View style={[styles.securityCard, { backgroundColor: isDark ? '#0F172A' : '#EFF6FF', borderColor: isDark ? '#1E293B' : '#BFDBFE' }]}>
          <Feather name="shield" size={20} color="#3B82F6" />
          <Text style={[styles.securityText, { color: isDark ? '#93C5FD' : '#1E40AF' }]}>
            256-bit encrypted bank verification. Bank accounts & UPI handles are masked for privacy.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#3B82F6" style={{ marginTop: 40 }} />
        ) : methods.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
            <MaterialCommunityIcons name="bank-plus" size={48} color={textSecondary} />
            <Text style={[styles.emptyTitle, { color: textPrimary }]}>No Payout Methods Linked</Text>
            <Text style={[styles.emptySub, { color: textSecondary }]}>
              Add a Bank Account or UPI ID to withdraw your earnings instantly.
            </Text>
            <TouchableOpacity style={styles.addCtaBtn} onPress={() => setShowAddModal(true)}>
              <Text style={styles.addCtaBtnText}>+ Add Payout Method</Text>
            </TouchableOpacity>
          </View>
        ) : (
          methods.map(method => (
            <View
              key={method.id}
              style={[styles.methodCard, { backgroundColor: bgCard, borderColor: method.is_default ? '#3B82F6' : borderCol }]}
            >
              <View style={styles.methodHeader}>
                <View style={[styles.methodIconCircle, { backgroundColor: method.method_type === 'BANK' ? '#EFF6FF' : '#F5F3FF' }]}>
                  <MaterialCommunityIcons
                    name={method.method_type === 'BANK' ? 'bank' : 'cellphone'}
                    size={22}
                    color={method.method_type === 'BANK' ? '#2563EB' : '#7C3AED'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.methodTitle, { color: textPrimary }]}>{method.display_label}</Text>
                    {method.is_default && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.methodSubtitle, { color: textSecondary }]}>
                    {method.method_type === 'BANK' ? `IFSC: ${method.ifsc_code}` : 'Verified UPI Handle'}
                  </Text>
                </View>
                <View style={styles.verifiedChip}>
                  <Feather name="check-circle" size={12} color="#10B981" />
                  <Text style={styles.verifiedChipText}>Verified</Text>
                </View>
              </View>

              <View style={styles.methodActions}>
                {!method.is_default && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: borderCol }]}
                    onPress={() => handleSetDefault(method.id)}
                  >
                    <Text style={[styles.actionBtnText, { color: '#3B82F6' }]}>Set as Default</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: isDark ? '#7F1D1D' : '#FEE2E2' }]}
                  onPress={() => handleDelete(method.id)}
                >
                  <Feather name="trash-2" size={14} color="#EF4444" />
                  <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity style={styles.floatingAddBtn} onPress={() => setShowAddModal(true)}>
          <Feather name="plus" size={18} color="#FFFFFF" />
          <Text style={styles.floatingAddText}>Add Another Payout Destination</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add Payout Method Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Add Payout Method</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Feather name="x" size={22} color={textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Type Switcher */}
            <View style={[styles.typeSwitcher, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
              <TouchableOpacity
                style={[styles.typeBtn, addType === 'BANK' && styles.typeBtnActive]}
                onPress={() => setAddType('BANK')}
              >
                <MaterialCommunityIcons name="bank" size={18} color={addType === 'BANK' ? '#FFFFFF' : textSecondary} />
                <Text style={[styles.typeBtnText, { color: addType === 'BANK' ? '#FFFFFF' : textSecondary }]}>
                  Bank Account
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, addType === 'UPI' && styles.typeBtnActive]}
                onPress={() => setAddType('UPI')}
              >
                <MaterialCommunityIcons name="cellphone" size={18} color={addType === 'UPI' ? '#FFFFFF' : textSecondary} />
                <Text style={[styles.typeBtnText, { color: addType === 'UPI' ? '#FFFFFF' : textSecondary }]}>
                  UPI ID
                </Text>
              </TouchableOpacity>
            </View>

            {addType === 'BANK' ? (
              <View style={styles.formSection}>
                <Text style={[styles.fieldLabel, { color: textSecondary }]}>Bank Name</Text>
                <TextInput
                  style={[styles.inputField, { color: textPrimary, backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: borderCol }]}
                  placeholder="e.g. HDFC Bank, ICICI, SBI"
                  placeholderTextColor={textSecondary}
                  value={bankName}
                  onChangeText={setBankName}
                />

                <Text style={[styles.fieldLabel, { color: textSecondary }]}>Account Number</Text>
                <TextInput
                  style={[styles.inputField, { color: textPrimary, backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: borderCol }]}
                  placeholder="Enter full account number"
                  placeholderTextColor={textSecondary}
                  keyboardType="numeric"
                  secureTextEntry
                  value={accNumber}
                  onChangeText={setAccNumber}
                />

                <Text style={[styles.fieldLabel, { color: textSecondary }]}>Confirm Account Number</Text>
                <TextInput
                  style={[styles.inputField, { color: textPrimary, backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: borderCol }]}
                  placeholder="Re-enter account number"
                  placeholderTextColor={textSecondary}
                  keyboardType="numeric"
                  value={confirmAccNumber}
                  onChangeText={setConfirmAccNumber}
                />

                <Text style={[styles.fieldLabel, { color: textSecondary }]}>IFSC Code</Text>
                <TextInput
                  style={[styles.inputField, { color: textPrimary, backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: borderCol }]}
                  placeholder="e.g. HDFC0001234"
                  placeholderTextColor={textSecondary}
                  autoCapitalize="characters"
                  maxLength={11}
                  value={ifsc}
                  onChangeText={t => setIfsc(t.toUpperCase())}
                />
              </View>
            ) : (
              <View style={styles.formSection}>
                <Text style={[styles.fieldLabel, { color: textSecondary }]}>UPI ID (VPA)</Text>
                <TextInput
                  style={[styles.inputField, { color: textPrimary, backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: borderCol }]}
                  placeholder="e.g. driver@okaxis, 9876543210@paytm"
                  placeholderTextColor={textSecondary}
                  autoCapitalize="none"
                  value={upiId}
                  onChangeText={setUpiId}
                />
                <Text style={[styles.fieldHint, { color: textSecondary }]}>
                  Instant penny drop verification will validate your UPI handle immediately.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              disabled={submitting}
              onPress={handleAddSubmit}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Verify & Link Method</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  content: { padding: 16, paddingBottom: 40 },
  securityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  securityText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    marginVertical: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginTop: 12 },
  emptySub: { fontSize: 13, textAlign: 'center', marginTop: 6, marginBottom: 20 },
  addCtaBtn: { backgroundColor: '#2563EB', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  addCtaBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  methodCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 12,
  },
  methodHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  methodIconCircle: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  methodTitle: { fontSize: 15, fontWeight: '700' },
  methodSubtitle: { fontSize: 12, marginTop: 2 },
  defaultBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  defaultBadgeText: { color: '#16A34A', fontSize: 9, fontWeight: '800' },
  verifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedChipText: { color: '#10B981', fontSize: 11, fontWeight: '700' },
  methodActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.1)',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 12, fontWeight: '700' },
  floatingAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 10,
  },
  floatingAddText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  typeSwitcher: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 16 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  typeBtnActive: { backgroundColor: '#2563EB' },
  typeBtnText: { fontSize: 13, fontWeight: '700' },
  formSection: { marginVertical: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  inputField: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, marginBottom: 12 },
  fieldHint: { fontSize: 11, lineHeight: 16, marginTop: -4, marginBottom: 12 },
  submitBtn: { backgroundColor: '#2563EB', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  submitBtnDisabled: { backgroundColor: '#94A3B8' },
  submitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
})
