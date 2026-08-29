/**
 * Partner Corporate & Employee Commute Workspace — B2B Mobility Vertical
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative Corporate Shift Rosters & Tech Park Commute Operations:
 *  - Company Shift Rosters (Inbound Morning, Outbound Evening, Night Shift)
 *  - Multi-Stop Sequential Employee Manifest (Employee ID, Node ETA, Masked Call)
 *  - 4-Digit Employee Boarding PIN Verification
 *  - No-Show Protection & Grace Time Countdown
 *  - 100% Direct Corporate Invoice Billing (Zero Cash Collection)
 *  - Tech Park Gate Delivery & Shift Completion
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
  Modal,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useTheme } from '../src/theme'
import {
  CorporateTransportService,
  CorporateRosterJob,
  CorporateEmployeeItem,
} from '../src/services/corporateTransportService'

export default function CorporateWorkspaceScreen() {
  const { theme, isDark } = useTheme()
  const [activeTab, setActiveTab] = useState<'roster' | 'shifts' | 'invoicing'>('roster')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [activeRoster, setActiveRoster] = useState<CorporateRosterJob | null>(null)
  const [availableShifts, setAvailableShifts] = useState<any[]>([])

  // Employee Boarding Modal
  const [showBoardingModal, setShowBoardingModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<CorporateEmployeeItem | null>(null)
  const [boardingPin, setBoardingPin] = useState('')
  const [verifyingPin, setVerifyingPin] = useState(false)

  // Shift Completion Modal
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [completingShift, setCompletingShift] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [rosterRes, shiftsRes] = await Promise.allSettled([
        CorporateTransportService.getActiveCorporateRoster(),
        CorporateTransportService.getAvailableCorporateShifts(),
      ])

      if (rosterRes.status === 'fulfilled') {
        setActiveRoster(rosterRes.value)
      }
      if (shiftsRes.status === 'fulfilled') {
        setAvailableShifts(shiftsRes.value)
      }
    } catch (err: any) {
      console.warn('[CorporateWorkspace] loadData error:', err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const onRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  // Handle Open Boarding PIN Modal
  const handleOpenBoarding = (emp: CorporateEmployeeItem) => {
    setSelectedEmployee(emp)
    setBoardingPin('')
    setShowBoardingModal(true)
  }

  // Handle Verify Employee Boarding
  const handleVerifyBoarding = async () => {
    if (!activeRoster || !selectedEmployee) return
    if (!boardingPin || boardingPin.length < 4) {
      Alert.alert('Invalid PIN', 'Please enter the 4-digit commuter PIN displayed on the employee badge.')
      return
    }

    setVerifyingPin(true)
    try {
      await CorporateTransportService.verifyEmployeeBoarding(
        activeRoster.id,
        selectedEmployee.employee_id,
        boardingPin
      )

      Alert.alert('Boarding Verified', `${selectedEmployee.name} has been verified and checked in.`)
      setShowBoardingModal(false)
      setSelectedEmployee(null)
      setBoardingPin('')
      loadData()
    } catch (err: any) {
      Alert.alert('Boarding Failed', err.message || 'Invalid employee PIN.')
    } finally {
      setVerifyingPin(false)
    }
  }

  // Handle Mark No-Show
  const handleMarkNoShow = (emp: CorporateEmployeeItem) => {
    Alert.alert(
      'Mark No-Show?',
      `Confirm that ${emp.name} did not arrive at ${emp.pickup_address}? A no-show log will be submitted to the corporate HR desk.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm No-Show',
          style: 'destructive',
          onPress: async () => {
            if (!activeRoster) return
            try {
              await CorporateTransportService.markEmployeeNoShow(activeRoster.id, emp.employee_id)
              Alert.alert('No-Show Recorded', 'Moving to the next employee pickup node.')
              loadData()
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not record no-show.')
            }
          },
        },
      ]
    )
  }

  // Handle Complete Shift
  const handleCompleteShift = async () => {
    if (!activeRoster) return
    setCompletingShift(true)
    try {
      await CorporateTransportService.completeCorporateRoster(activeRoster.id)
      Alert.alert('🎉 Shift Completed!', 'All employees dropped off. Guaranteed contract payout added to your corporate invoice ledger.')
      setShowCompleteModal(false)
      loadData()
    } catch (err: any) {
      Alert.alert('Completion Failed', err.message || 'Could not complete shift.')
    } finally {
      setCompletingShift(false)
    }
  }

  const bgRoot = isDark ? '#090C15' : '#F8FAFC'
  const bgCard = isDark ? '#1E293B' : '#FFFFFF'
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A'
  const textSecondary = isDark ? '#94A3B8' : '#64748B'
  const borderCol = isDark ? '#334155' : '#E2E8F0'

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: bgRoot }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderCol }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.headerTitle, { color: textPrimary }]}>Corporate Commute</Text>
            <View style={[styles.proBadge, { backgroundColor: '#2563EB' }]}>
              <Text style={styles.proBadgeText}>B2B FLEET</Text>
            </View>
          </View>
          <Text style={[styles.headerSubtitle, { color: textSecondary }]}>
            Employee Shift Rosters & Tech Park Operations
          </Text>
        </View>
        <TouchableOpacity style={styles.actionBtn} onPress={loadData}>
          <Feather name="refresh-cw" size={18} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsRow, { backgroundColor: isDark ? '#1E293B' : '#EDF2F7' }]}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'roster' && [styles.activeTabBtn, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]]}
          onPress={() => setActiveTab('roster')}
        >
          <MaterialCommunityIcons
            name="badge-account-horizontal-outline"
            size={16}
            color={activeTab === 'roster' ? '#2563EB' : textSecondary}
          />
          <Text style={[styles.tabBtnText, { color: activeTab === 'roster' ? '#2563EB' : textSecondary }]}>
            Active Shift
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'shifts' && [styles.activeTabBtn, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]]}
          onPress={() => setActiveTab('shifts')}
        >
          <MaterialCommunityIcons
            name="calendar-clock"
            size={16}
            color={activeTab === 'shifts' ? '#8B5CF6' : textSecondary}
          />
          <Text style={[styles.tabBtnText, { color: activeTab === 'shifts' ? '#8B5CF6' : textSecondary }]}>
            B2B Shift Leads {availableShifts.length > 0 ? `(${availableShifts.length})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'invoicing' && [styles.activeTabBtn, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]]}
          onPress={() => setActiveTab('invoicing')}
        >
          <MaterialCommunityIcons
            name="file-document-outline"
            size={16}
            color={activeTab === 'invoicing' ? '#10B981' : textSecondary}
          />
          <Text style={[styles.tabBtnText, { color: activeTab === 'invoicing' ? '#10B981' : textSecondary }]}>
            Corporate Billing
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading && !refreshing ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={{ marginTop: 12, color: textSecondary, fontSize: 13 }}>
              Loading corporate shift manifest…
            </Text>
          </View>
        ) : (
          <>
            {/* TAB 1: ACTIVE ROSTER */}
            {activeTab === 'roster' && (
              <View>
                {!activeRoster ? (
                  <View style={[styles.emptyCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                    <MaterialCommunityIcons name="office-building" size={48} color={textSecondary} />
                    <Text style={[styles.emptyTitle, { color: textPrimary }]}>No Active Corporate Shift</Text>
                    <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
                      You are not currently assigned to an ongoing employee shift roster. Check the "B2B Shift Leads" tab to view scheduled company contracts.
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.rosterCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                    {/* Header */}
                    <View style={styles.rosterHeader}>
                      <View>
                        <Text style={[styles.companyTitle, { color: textPrimary }]}>
                          🏢 {activeRoster.company_name}
                        </Text>
                        <Text style={[styles.shiftSubtitle, { color: '#2563EB' }]}>
                          {activeRoster.shift_name}
                        </Text>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: 'rgba(37, 99, 235, 0.15)' }]}>
                        <Text style={[styles.statusPillText, { color: '#2563EB' }]}>
                          {activeRoster.status_label || activeRoster.status}
                        </Text>
                      </View>
                    </View>

                    {/* Stats Strip */}
                    <View style={[styles.statsStrip, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
                      <View style={styles.statItem}>
                        <Text style={[styles.statLabel, { color: textSecondary }]}>TECH PARK DESTINATION</Text>
                        <Text style={[styles.statVal, { color: textPrimary }]} numberOfLines={1}>
                          {activeRoster.tech_park_name}
                        </Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={[styles.statLabel, { color: textSecondary }]}>BOARDING STATUS</Text>
                        <Text style={[styles.statVal, { color: '#2563EB' }]}>
                          {activeRoster.boarded_count} / {activeRoster.total_employees} Boarded
                        </Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={[styles.statLabel, { color: textSecondary }]}>CONTRACT PAYOUT</Text>
                        <Text style={[styles.statVal, { color: '#10B981' }]}>
                          ₹{activeRoster.contract_payout}
                        </Text>
                      </View>
                    </View>

                    {/* Employee Manifest List */}
                    <Text style={[styles.manifestHeader, { color: textPrimary }]}>
                      Sequential Commuter Manifest ({activeRoster.employees.length} Employees)
                    </Text>

                    {activeRoster.employees.map((emp, i) => (
                      <View
                        key={emp.employee_id || i}
                        style={[
                          styles.employeeItemCard,
                          { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: borderCol },
                        ]}
                      >
                        <View style={styles.empSequenceBadge}>
                          <Text style={styles.empSequenceText}>#{emp.sequence || i + 1}</Text>
                        </View>

                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={[styles.empName, { color: textPrimary }]}>{emp.name}</Text>
                            <View
                              style={[
                                styles.empStatusBadge,
                                emp.status === 'BOARDED' && { backgroundColor: '#DCFCE7' },
                                emp.status === 'NO_SHOW' && { backgroundColor: '#FEE2E2' },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.empStatusText,
                                  emp.status === 'BOARDED' && { color: '#166534' },
                                  emp.status === 'NO_SHOW' && { color: '#991B1B' },
                                ]}
                              >
                                {emp.status}
                              </Text>
                            </View>
                          </View>

                          <Text style={[styles.empPickup, { color: textSecondary }]} numberOfLines={1}>
                            📍 {emp.pickup_address}
                          </Text>

                          {/* Action Buttons for this employee */}
                          {emp.status === 'PENDING' || emp.status === 'ARRIVED' ? (
                            <View style={styles.empActionRow}>
                              <TouchableOpacity
                                style={[styles.verifyPinBtn, { backgroundColor: '#2563EB' }]}
                                onPress={() => handleOpenBoarding(emp)}
                              >
                                <MaterialCommunityIcons name="shield-key-outline" size={14} color="#FFFFFF" />
                                <Text style={styles.verifyPinBtnText}>Enter PIN to Board</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[styles.noShowBtn, { borderColor: '#EF4444' }]}
                                onPress={() => handleMarkNoShow(emp)}
                              >
                                <Text style={styles.noShowBtnText}>No-Show</Text>
                              </TouchableOpacity>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    ))}

                    {/* Complete Shift Button */}
                    <TouchableOpacity
                      style={[styles.completeShiftBtn, { backgroundColor: '#10B981' }]}
                      onPress={() => setShowCompleteModal(true)}
                    >
                      <MaterialCommunityIcons name="check-all" size={20} color="#FFFFFF" />
                      <Text style={styles.completeShiftBtnText}>Complete Tech Park Dropoff</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* TAB 2: AVAILABLE B2B SHIFTS */}
            {activeTab === 'shifts' && (
              <View>
                {availableShifts.length === 0 ? (
                  <View style={[styles.emptyCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                    <MaterialCommunityIcons name="calendar-search" size={48} color={textSecondary} />
                    <Text style={[styles.emptyTitle, { color: textPrimary }]}>No Open Shift Leads</Text>
                    <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
                      New corporate shift schedules from partner tech companies will appear here for recurring roster assignment.
                    </Text>
                  </View>
                ) : (
                  availableShifts.map((shift, idx) => (
                    <View key={idx} style={[styles.rosterCard, { backgroundColor: bgCard, borderColor: borderCol, marginBottom: 12 }]}>
                      <Text style={[styles.companyTitle, { color: textPrimary }]}>{shift.company_name}</Text>
                      <Text style={[styles.shiftSubtitle, { color: '#2563EB' }]}>{shift.shift_name}</Text>
                      <Text style={[styles.empPickup, { color: textSecondary, marginTop: 4 }]}>📍 {shift.tech_park}</Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* TAB 3: INVOICING */}
            {activeTab === 'invoicing' && (
              <View style={[styles.emptyCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                <MaterialCommunityIcons name="file-document-check-outline" size={48} color="#2563EB" />
                <Text style={[styles.emptyTitle, { color: textPrimary }]}>Direct Corporate Billing</Text>
                <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
                  All corporate employee commutes are 100% cashless. Weekly guaranteed company contract payouts are credited directly to your bank account.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── EMPLOYEE BOARDING MODAL ── */}
      <Modal visible={showBoardingModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: bgCard, borderColor: borderCol }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Employee Check-In</Text>
              <TouchableOpacity onPress={() => setShowBoardingModal(false)}>
                <Feather name="x" size={22} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: textSecondary }]}>
              Enter the 4-digit Commuter PIN displayed on {selectedEmployee?.name}'s corporate badge.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary }]}>4-DIGIT COMMUTER PIN</Text>
              <TextInput
                style={[styles.otpField, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', color: '#2563EB', borderColor: borderCol }]}
                keyboardType="numeric"
                maxLength={6}
                value={boardingPin}
                onChangeText={setBoardingPin}
                placeholder="••••"
                placeholderTextColor={textSecondary}
              />
            </View>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: '#2563EB' }]}
              onPress={handleVerifyBoarding}
              disabled={verifyingPin}
            >
              {verifyingPin ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Verify & Check-In</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── COMPLETE SHIFT MODAL ── */}
      <Modal visible={showCompleteModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: bgCard, borderColor: borderCol }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Complete Tech Park Dropoff</Text>
              <TouchableOpacity onPress={() => setShowCompleteModal(false)}>
                <Feather name="x" size={22} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: textSecondary }]}>
              Confirm that all boarded employees have safely arrived at {activeRoster?.tech_park_name}.
            </Text>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: '#10B981' }]}
              onPress={handleCompleteShift}
              disabled={completingShift}
            >
              {completingShift ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Confirm Shift Completion</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  proBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  proBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  actionBtn: { padding: 8 },
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 10,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  activeTabBtn: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBtnText: { fontSize: 12, fontWeight: '700' },
  scroll: { flex: 1 },
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 14 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  rosterCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  rosterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  companyTitle: { fontSize: 16, fontWeight: '800' },
  shiftSubtitle: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  statsStrip: {
    flexDirection: 'row',
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
    justifyContent: 'space-between',
  },
  statItem: { alignItems: 'center', flex: 1 },
  statLabel: { fontSize: 9, fontWeight: '800' },
  statVal: { fontSize: 13, fontWeight: '800', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#CBD5E1', marginVertical: 4 },
  manifestHeader: { fontSize: 14, fontWeight: '800', marginTop: 16, marginBottom: 10 },
  employeeItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  empSequenceBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empSequenceText: { color: '#2563EB', fontSize: 11, fontWeight: '800' },
  empName: { fontSize: 13, fontWeight: '700' },
  empStatusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: '#F1F5F9' },
  empStatusText: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  empPickup: { fontSize: 11, marginTop: 2 },
  empActionRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  verifyPinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  verifyPinBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  noShowBtn: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  noShowBtnText: { color: '#EF4444', fontSize: 11, fontWeight: '700' },
  completeShiftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  completeShiftBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalSub: { fontSize: 12, marginTop: 4, marginBottom: 16 },
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 10, fontWeight: '800', marginBottom: 6 },
  otpField: {
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 8,
  },
  modalSubmitBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  modalSubmitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
})
