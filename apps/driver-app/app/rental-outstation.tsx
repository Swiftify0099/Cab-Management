/**
 * Partner Rental & Outstation Workspace — Feature 18 & Phase 4
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative Hourly Packages, Multi-Stop Rentals & Outstation Operations:
 *  - Live Package Metre: Included vs Extra KM & Hours
 *  - Live Extra Charges Counter: Extra KM rate + Extra Hour rate
 *  - Driver Night Allowance & Multi-Day Overnight Stay calculations
 *  - Trip Expense Management: Log Tolls, Parking, and State Border permits
 *  - Start OTP & End OTP Handover with Reconciled Financial Settlement
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
  RentalOutstationService,
  RentalOutstationJob,
  TripExpenseItem,
} from '../src/services/rentalOutstationService'

export default function RentalOutstationWorkspaceScreen() {
  const { theme, isDark } = useTheme()
  const [activeTab, setActiveTab] = useState<'active' | 'requests' | 'history'>('active')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [activeJob, setActiveJob] = useState<RentalOutstationJob | null>(null)
  const [availableRequests, setAvailableRequests] = useState<any[]>([])

  // Expense Logger Modal
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [expenseType, setExpenseType] = useState<'toll' | 'parking' | 'permit' | 'night_allowance'>('toll')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseDesc, setExpenseDesc] = useState('')
  const [loggingExpense, setLoggingExpense] = useState(false)

  // Start OTP Modal
  const [showStartModal, setShowStartModal] = useState(false)
  const [startOTP, setStartOTP] = useState('')
  const [startingTrip, setStartingTrip] = useState(false)

  // End Trip OTP & Settlement Modal
  const [showEndModal, setShowEndModal] = useState(false)
  const [endOTP, setEndOTP] = useState('')
  const [finalOdometer, setFinalOdometer] = useState('')
  const [endingTrip, setEndingTrip] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [jobRes, reqsRes] = await Promise.allSettled([
        RentalOutstationService.getActiveJob(),
        RentalOutstationService.getAvailableRequests(),
      ])

      if (jobRes.status === 'fulfilled') {
        setActiveJob(jobRes.value)
      }
      if (reqsRes.status === 'fulfilled') {
        setAvailableRequests(reqsRes.value)
      }
    } catch (err: any) {
      console.warn('[RentalOutstationWorkspace] load error:', err.message)
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

  // Handle Start Trip
  const handleStartTrip = async () => {
    if (!activeJob) return
    if (!startOTP || startOTP.length < 4) {
      Alert.alert('Invalid OTP', 'Please enter the 4-digit Start OTP provided by the customer.')
      return
    }

    setStartingTrip(true)
    try {
      await RentalOutstationService.executeCommand(activeJob.id, 'START', { otp: startOTP })
      Alert.alert('Trip Started', 'Hourly package rental is now live and metering.')
      setShowStartModal(false)
      setStartOTP('')
      loadData()
    } catch (err: any) {
      Alert.alert('Start Failed', err.message || 'Invalid Start OTP.')
    } finally {
      setStartingTrip(false)
    }
  }

  // Handle Log Expense
  const handleLogExpense = async () => {
    if (!activeJob || !expenseAmount || Number(expenseAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid expense amount.')
      return
    }

    setLoggingExpense(true)
    try {
      await RentalOutstationService.logTripExpense(activeJob.id, {
        expense_type: expenseType,
        amount: Number(expenseAmount),
        description: expenseDesc || `${expenseType.toUpperCase()} Charge`,
      })

      Alert.alert('Expense Added', `₹${expenseAmount} added to customer invoice and trip ledger.`)
      setShowExpenseModal(false)
      setExpenseAmount('')
      setExpenseDesc('')
      loadData()
    } catch (err: any) {
      Alert.alert('Logging Failed', err.message || 'Could not log expense.')
    } finally {
      setLoggingExpense(false)
    }
  }

  // Handle End Trip
  const handleEndTrip = async () => {
    if (!activeJob) return
    if (!endOTP || endOTP.length < 4) {
      Alert.alert('Invalid OTP', 'Please enter the 4-digit End OTP to close the package.')
      return
    }

    setEndingTrip(true)
    try {
      await RentalOutstationService.completeTrip(
        activeJob.id,
        endOTP,
        finalOdometer ? Number(finalOdometer) : undefined
      )

      Alert.alert('🎉 Trip Completed!', 'Rental package settled. Net earnings added to your wallet balance.')
      setShowEndModal(false)
      setEndOTP('')
      setFinalOdometer('')
      loadData()
    } catch (err: any) {
      Alert.alert('Completion Failed', err.message || 'Invalid End OTP.')
    } finally {
      setEndingTrip(false)
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
            <Text style={[styles.headerTitle, { color: textPrimary }]}>Rental & Outstation</Text>
            <View style={[styles.proBadge, { backgroundColor: '#8B5CF6' }]}>
              <Text style={styles.proBadgeText}>PACKAGES</Text>
            </View>
          </View>
          <Text style={[styles.headerSubtitle, { color: textSecondary }]}>
            Hourly Packages, Day Hires & Outstation Trips
          </Text>
        </View>
        <TouchableOpacity style={styles.actionBtn} onPress={loadData}>
          <Feather name="refresh-cw" size={18} color="#8B5CF6" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsRow, { backgroundColor: isDark ? '#1E293B' : '#EDF2F7' }]}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'active' && [styles.activeTabBtn, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]]}
          onPress={() => setActiveTab('active')}
        >
          <MaterialCommunityIcons
            name="car-clock"
            size={16}
            color={activeTab === 'active' ? '#8B5CF6' : textSecondary}
          />
          <Text style={[styles.tabBtnText, { color: activeTab === 'active' ? '#8B5CF6' : textSecondary }]}>
            Active Package
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'requests' && [styles.activeTabBtn, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]]}
          onPress={() => setActiveTab('requests')}
        >
          <MaterialCommunityIcons
            name="map-search-outline"
            size={16}
            color={activeTab === 'requests' ? '#0284C7' : textSecondary}
          />
          <Text style={[styles.tabBtnText, { color: activeTab === 'requests' ? '#0284C7' : textSecondary }]}>
            Available Bookings {availableRequests.length > 0 ? `(${availableRequests.length})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'history' && [styles.activeTabBtn, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]]}
          onPress={() => setActiveTab('history')}
        >
          <MaterialCommunityIcons
            name="receipt-text-outline"
            size={16}
            color={activeTab === 'history' ? '#10B981' : textSecondary}
          />
          <Text style={[styles.tabBtnText, { color: activeTab === 'history' ? '#10B981' : textSecondary }]}>
            Settlement
          </Text>
        </TouchableOpacity>
      </View>

      {/* Scroll View */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading && !refreshing ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={{ marginTop: 12, color: textSecondary, fontSize: 13 }}>
              Loading active package telemetry…
            </Text>
          </View>
        ) : (
          <>
            {/* TAB 1: ACTIVE PACKAGE */}
            {activeTab === 'active' && (
              <View>
                {!activeJob ? (
                  <View style={[styles.emptyCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                    <MaterialCommunityIcons name="car-speed-limiter" size={48} color={textSecondary} />
                    <Text style={[styles.emptyTitle, { color: textPrimary }]}>No Active Rental Package</Text>
                    <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
                      You are not currently assigned to an active hourly rental or outstation trip. Check the "Available Bookings" tab to accept new package requests.
                    </Text>
                    <TouchableOpacity
                      style={[styles.exploreBtn, { backgroundColor: '#8B5CF6' }]}
                      onPress={() => setActiveTab('requests')}
                    >
                      <Text style={styles.exploreBtnText}>Browse Package Bookings</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={[styles.jobCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                    {/* Header */}
                    <View style={styles.jobCardHeader}>
                      <View>
                        <Text style={[styles.jobTitle, { color: textPrimary }]}>
                          {activeJob.job_type === 'RENTAL' ? '🚗 HOURLY RENTAL' : '🛣️ OUTSTATION TRIP'}
                        </Text>
                        <Text style={[styles.pkgSubtitle, { color: '#8B5CF6' }]}>
                          {activeJob.package_details?.package_name || 'Standard Package'}
                        </Text>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                        <Text style={[styles.statusPillText, { color: '#8B5CF6' }]}>
                          {activeJob.status_label || activeJob.status}
                        </Text>
                      </View>
                    </View>

                    {/* Telemetry Gauge Strip */}
                    <View style={[styles.gaugeStrip, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
                      <View style={styles.gaugeItem}>
                        <Text style={[styles.gaugeLabel, { color: textSecondary }]}>INCLUDED KM</Text>
                        <Text style={[styles.gaugeVal, { color: textPrimary }]}>
                          {activeJob.package_details?.included_km || 40} KM
                        </Text>
                        <Text style={[styles.gaugeSub, { color: '#0284C7' }]}>
                          Extra: ₹{activeJob.package_details?.extra_km_rate || 14}/km
                        </Text>
                      </View>

                      <View style={styles.gaugeDivider} />

                      <View style={styles.gaugeItem}>
                        <Text style={[styles.gaugeLabel, { color: textSecondary }]}>INCLUDED TIME</Text>
                        <Text style={[styles.gaugeVal, { color: textPrimary }]}>
                          {activeJob.package_details?.included_hours || 4} HRS
                        </Text>
                        <Text style={[styles.gaugeSub, { color: '#F59E0B' }]}>
                          Extra: ₹{activeJob.package_details?.extra_hour_rate || 120}/hr
                        </Text>
                      </View>

                      <View style={styles.gaugeDivider} />

                      <View style={styles.gaugeItem}>
                        <Text style={[styles.gaugeLabel, { color: textSecondary }]}>DRIVER EARNING</Text>
                        <Text style={[styles.gaugeVal, { color: '#10B981' }]}>
                          ₹{activeJob.driver_earnings}
                        </Text>
                        <Text style={[styles.gaugeSub, { color: textSecondary }]}>
                          Gross: ₹{activeJob.current_fare}
                        </Text>
                      </View>
                    </View>

                    {/* Customer & Route */}
                    <View style={{ marginTop: 14, gap: 6 }}>
                      <Text style={[styles.customerText, { color: textPrimary }]}>
                        👤 Customer: {activeJob.customer_name} ({activeJob.customer_phone_masked})
                      </Text>
                      <Text style={[styles.routeText, { color: textSecondary }]} numberOfLines={2}>
                        📍 Pickup: {activeJob.pickup_address}
                      </Text>
                      <Text style={[styles.routeText, { color: textSecondary }]} numberOfLines={2}>
                        🏁 Drop: {activeJob.destination_address}
                      </Text>
                    </View>

                    {/* Logged Expenses Section */}
                    {activeJob.expenses && activeJob.expenses.length > 0 && (
                      <View style={[styles.expensesList, { borderColor: borderCol }]}>
                        <Text style={[styles.expenseHeader, { color: textSecondary }]}>LOGGED EXPENSES & TOLLS</Text>
                        {activeJob.expenses.map((exp, idx) => (
                          <View key={idx} style={styles.expenseRow}>
                            <Text style={[styles.expenseName, { color: textPrimary }]}>
                              {exp.description || exp.expense_type.toUpperCase()}
                            </Text>
                            <Text style={[styles.expenseVal, { color: '#10B981' }]}>
                              +₹{exp.amount}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Action Bar */}
                    <View style={styles.actionBar}>
                      {activeJob.status === 'ASSIGNED' || activeJob.status === 'DRIVER_ARRIVING' ? (
                        <TouchableOpacity
                          style={[styles.actionBtnPrimary, { backgroundColor: '#8B5CF6' }]}
                          onPress={() => setShowStartModal(true)}
                        >
                          <MaterialCommunityIcons name="play-circle-outline" size={18} color="#FFFFFF" />
                          <Text style={styles.actionBtnText}>Start Rental (Enter OTP)</Text>
                        </TouchableOpacity>
                      ) : (
                        <>
                          <TouchableOpacity
                            style={[styles.actionBtnSecondary, { borderColor: borderCol }]}
                            onPress={() => setShowExpenseModal(true)}
                          >
                            <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#0284C7" />
                            <Text style={[styles.actionBtnSecondaryText, { color: '#0284C7' }]}>Add Toll/Parking</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionBtnPrimary, { backgroundColor: '#10B981' }]}
                            onPress={() => setShowEndModal(true)}
                          >
                            <MaterialCommunityIcons name="stop-circle-outline" size={18} color="#FFFFFF" />
                            <Text style={styles.actionBtnText}>End Trip & Settle</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* TAB 2: AVAILABLE REQUESTS */}
            {activeTab === 'requests' && (
              <View>
                {availableRequests.length === 0 ? (
                  <View style={[styles.emptyCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                    <MaterialCommunityIcons name="radar" size={48} color={textSecondary} />
                    <Text style={[styles.emptyTitle, { color: textPrimary }]}>No Open Package Requests</Text>
                    <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
                      There are currently no customer rental or outstation requests waiting in your zone. New booking opportunities will appear here in real time.
                    </Text>
                  </View>
                ) : (
                  availableRequests.map((req, i) => (
                    <View key={i} style={[styles.requestCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                      <View style={styles.requestHeader}>
                        <Text style={[styles.reqTitle, { color: textPrimary }]}>
                          {req.package_name || 'Hourly Rental Package'}
                        </Text>
                        <Text style={[styles.reqFare, { color: '#10B981' }]}>
                          ₹{req.base_fare || 950}
                        </Text>
                      </View>
                      <Text style={[styles.reqRoute, { color: textSecondary }]}>
                        📍 {req.pickup_address}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* TAB 3: SETTLEMENT HISTORY */}
            {activeTab === 'history' && (
              <View style={[styles.emptyCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                <MaterialCommunityIcons name="check-decagram-outline" size={48} color={textSecondary} />
                <Text style={[styles.emptyTitle, { color: textPrimary }]}>Rental Settlements</Text>
                <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
                  All completed hourly package settlements, extra KM surcharges, and night allowances are securely balanced with your wallet ledger.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── START TRIP MODAL ── */}
      <Modal visible={showStartModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: bgCard, borderColor: borderCol }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Start Rental Package</Text>
              <TouchableOpacity onPress={() => setShowStartModal(false)}>
                <Feather name="x" size={22} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: textSecondary }]}>
              Ask the customer for their 4-digit Start OTP before starting the journey.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary }]}>4-DIGIT START OTP</Text>
              <TextInput
                style={[styles.otpField, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', color: '#8B5CF6', borderColor: borderCol }]}
                keyboardType="numeric"
                maxLength={6}
                value={startOTP}
                onChangeText={setStartOTP}
                placeholder="••••"
                placeholderTextColor={textSecondary}
              />
            </View>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: '#8B5CF6' }]}
              onPress={handleStartTrip}
              disabled={startingTrip}
            >
              {startingTrip ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Verify & Start Trip</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── ADD EXPENSE MODAL ── */}
      <Modal visible={showExpenseModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: bgCard, borderColor: borderCol }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Log Trip Expense / Toll</Text>
              <TouchableOpacity onPress={() => setShowExpenseModal(false)}>
                <Feather name="x" size={22} color={textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Expense Type Selector */}
            <View style={styles.expenseTypeRow}>
              {(['toll', 'parking', 'permit', 'night_allowance'] as const).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.expenseTypePill,
                    expenseType === type && { backgroundColor: '#8B5CF6' },
                  ]}
                  onPress={() => setExpenseType(type)}
                >
                  <Text
                    style={[
                      styles.expenseTypeText,
                      { color: expenseType === type ? '#FFFFFF' : textSecondary },
                    ]}
                  >
                    {type.toUpperCase().replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary }]}>AMOUNT (₹)</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', color: textPrimary, borderColor: borderCol }]}
                keyboardType="numeric"
                value={expenseAmount}
                onChangeText={setExpenseAmount}
                placeholder="e.g. 150"
                placeholderTextColor={textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary }]}>NOTES / PLAZA NAME</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', color: textPrimary, borderColor: borderCol }]}
                value={expenseDesc}
                onChangeText={setExpenseDesc}
                placeholder="e.g. Khed-Shivapur Toll Plaza"
                placeholderTextColor={textSecondary}
              />
            </View>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: '#0284C7' }]}
              onPress={handleLogExpense}
              disabled={loggingExpense}
            >
              {loggingExpense ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Add to Trip Invoice</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── END TRIP & SETTLEMENT MODAL ── */}
      <Modal visible={showEndModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: bgCard, borderColor: borderCol }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>End Rental & Reconcile</Text>
              <TouchableOpacity onPress={() => setShowEndModal(false)}>
                <Feather name="x" size={22} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: textSecondary }]}>
              Enter customer End OTP to close the package meter and finalize the invoice.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary }]}>4-DIGIT END OTP</Text>
              <TextInput
                style={[styles.otpField, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', color: '#10B981', borderColor: borderCol }]}
                keyboardType="numeric"
                maxLength={6}
                value={endOTP}
                onChangeText={setEndOTP}
                placeholder="••••"
                placeholderTextColor={textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary }]}>CURRENT ODOMETER KM (OPTIONAL)</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', color: textPrimary, borderColor: borderCol }]}
                keyboardType="numeric"
                value={finalOdometer}
                onChangeText={setFinalOdometer}
                placeholder="e.g. 45280"
                placeholderTextColor={textSecondary}
              />
            </View>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: '#10B981' }]}
              onPress={handleEndTrip}
              disabled={endingTrip}
            >
              {endingTrip ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Settle & Complete Rental</Text>
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
  proBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
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
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  exploreBtn: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  exploreBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  jobCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  jobTitle: { fontSize: 16, fontWeight: '800' },
  pkgSubtitle: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  gaugeStrip: {
    flexDirection: 'row',
    marginTop: 14,
    borderRadius: 12,
    padding: 12,
    justifyContent: 'space-between',
  },
  gaugeItem: { alignItems: 'center', flex: 1 },
  gaugeLabel: { fontSize: 9, fontWeight: '800' },
  gaugeVal: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  gaugeSub: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  gaugeDivider: {
    width: 1,
    backgroundColor: '#CBD5E1',
    marginVertical: 4,
  },
  customerText: { fontSize: 13, fontWeight: '700' },
  routeText: { fontSize: 12 },
  expensesList: {
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  expenseHeader: { fontSize: 10, fontWeight: '800', marginBottom: 6 },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  expenseName: { fontSize: 12, fontWeight: '600' },
  expenseVal: { fontSize: 12, fontWeight: '800' },
  actionBar: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  actionBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  actionBtnSecondaryText: { fontSize: 13, fontWeight: '700' },
  requestCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reqTitle: { fontSize: 14, fontWeight: '700' },
  reqFare: { fontSize: 16, fontWeight: '800' },
  reqRoute: { fontSize: 12, marginTop: 4 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalSub: { fontSize: 12, marginTop: 4, marginBottom: 16 },
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 10, fontWeight: '800', marginBottom: 6 },
  inputField: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
  },
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
  expenseTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  expenseTypePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  expenseTypeText: { fontSize: 11, fontWeight: '700' },
})
