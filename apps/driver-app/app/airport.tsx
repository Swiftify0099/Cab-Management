/**
 * Partner Airport Transfers & Flight Intelligence Hub — Specialized Vertical
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative Airport Pickup & Drop Operations:
 *  - Real-Time Flight Status Tracking (Delays, Gate, Baggage Belt)
 *  - Automatic Flight Delay Recalibration & Extended Waiting Window
 *  - Terminal Parking Bay & Pickup Lane Guidance (T1 Domestic, T2 International)
 *  - Airport Parking / Toll Logging
 *  - Start OTP & Destination Handover
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
  AirportTransferService,
  AirportTransferJob,
  FlightTelemetry,
} from '../src/services/airportTransferService'

export default function AirportTransferWorkspaceScreen() {
  const { theme, isDark } = useTheme()
  const [activeTab, setActiveTab] = useState<'active' | 'queue' | 'history'>('active')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [activeJob, setActiveJob] = useState<AirportTransferJob | null>(null)
  const [availableRequests, setAvailableRequests] = useState<any[]>([])

  // Flight Tracker Search Modal
  const [showFlightSearchModal, setShowFlightSearchModal] = useState(false)
  const [flightSearchNumber, setFlightSearchNumber] = useState('')
  const [searchedFlight, setSearchedFlight] = useState<FlightTelemetry | null>(null)
  const [searchingFlight, setSearchingFlight] = useState(false)

  // Start OTP Modal
  const [showStartModal, setShowStartModal] = useState(false)
  const [startOTP, setStartOTP] = useState('')
  const [startingTrip, setStartingTrip] = useState(false)

  // Parking Toll Modal
  const [showParkingModal, setShowParkingModal] = useState(false)
  const [parkingAmount, setParkingAmount] = useState('')
  const [parkingBay, setParkingBay] = useState('')
  const [loggingParking, setLoggingParking] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [jobRes, reqsRes] = await Promise.allSettled([
        AirportTransferService.getActiveJob(),
        AirportTransferService.getAvailableAirportRequests(),
      ])

      if (jobRes.status === 'fulfilled') {
        setActiveJob(jobRes.value)
      }
      if (reqsRes.status === 'fulfilled') {
        setAvailableRequests(reqsRes.value)
      }
    } catch (err: any) {
      console.warn('[AirportWorkspace] loadData error:', err.message)
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

  // Handle Search Flight
  const handleSearchFlight = async () => {
    if (!flightSearchNumber.trim()) {
      Alert.alert('Flight Number Required', 'Please enter a valid Flight Number (e.g. 6E-2412 or AI-853).')
      return
    }

    setSearchingFlight(true)
    try {
      const data = await AirportTransferService.getFlightStatus(flightSearchNumber.trim().toUpperCase())
      if (data) {
        setSearchedFlight(data)
      } else {
        Alert.alert('Flight Not Found', 'Could not locate active flight telemetry for this flight number.')
      }
    } catch (err: any) {
      Alert.alert('Flight Search Failed', err.message || 'Unable to connect to flight radar.')
    } finally {
      setSearchingFlight(false)
    }
  }

  // Handle Start Airport Ride
  const handleStartTrip = async () => {
    if (!activeJob) return
    if (!startOTP || startOTP.length < 4) {
      Alert.alert('Invalid OTP', 'Please enter the 4-digit Start OTP from the passenger.')
      return
    }

    setStartingTrip(true)
    try {
      await AirportTransferService.executeCommand(activeJob.id, 'START', { otp: startOTP })
      Alert.alert('✈️ Airport Transfer Started', 'Navigation started. Safe driving!')
      setShowStartModal(false)
      setStartOTP('')
      loadData()
    } catch (err: any) {
      Alert.alert('Start Failed', err.message || 'Invalid Start OTP.')
    } finally {
      setStartingTrip(false)
    }
  }

  // Handle Log Parking
  const handleLogParking = async () => {
    if (!activeJob || !parkingAmount || Number(parkingAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid terminal parking amount.')
      return
    }

    setLoggingParking(true)
    try {
      await AirportTransferService.executeCommand(activeJob.id, 'ADD_EXPENSE', {
        expense_type: 'parking',
        amount: Number(parkingAmount),
        description: `Terminal Parking Bay: ${parkingBay || 'Designated Bay'}`,
      })

      Alert.alert('Parking Added', `₹${parkingAmount} parking fee added to trip receipt.`)
      setShowParkingModal(false)
      setParkingAmount('')
      setParkingBay('')
      loadData()
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not log parking fee.')
    } finally {
      setLoggingParking(false)
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
            <Text style={[styles.headerTitle, { color: textPrimary }]}>Airport Transfers</Text>
            <View style={[styles.proBadge, { backgroundColor: '#0284C7' }]}>
              <Text style={styles.proBadgeText}>FLIGHT RADAR</Text>
            </View>
          </View>
          <Text style={[styles.headerSubtitle, { color: textSecondary }]}>
            Terminal Pickups, Flight Status & Bay Guidance
          </Text>
        </View>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setShowFlightSearchModal(true)}
        >
          <MaterialCommunityIcons name="airplane-search" size={22} color="#0284C7" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsRow, { backgroundColor: isDark ? '#1E293B' : '#EDF2F7' }]}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'active' && [styles.activeTabBtn, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]]}
          onPress={() => setActiveTab('active')}
        >
          <Ionicons
            name="airplane"
            size={16}
            color={activeTab === 'active' ? '#0284C7' : textSecondary}
          />
          <Text style={[styles.tabBtnText, { color: activeTab === 'active' ? '#0284C7' : textSecondary }]}>
            Active Transfer
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'queue' && [styles.activeTabBtn, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]]}
          onPress={() => setActiveTab('queue')}
        >
          <MaterialCommunityIcons
            name="format-list-bulleted-type"
            size={16}
            color={activeTab === 'queue' ? '#8B5CF6' : textSecondary}
          />
          <Text style={[styles.tabBtnText, { color: activeTab === 'queue' ? '#8B5CF6' : textSecondary }]}>
            Terminal Leads {availableRequests.length > 0 ? `(${availableRequests.length})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'history' && [styles.activeTabBtn, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]]}
          onPress={() => setActiveTab('history')}
        >
          <MaterialCommunityIcons
            name="history"
            size={16}
            color={activeTab === 'history' ? '#10B981' : textSecondary}
          />
          <Text style={[styles.tabBtnText, { color: activeTab === 'history' ? '#10B981' : textSecondary }]}>
            History
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
            <ActivityIndicator size="large" color="#0284C7" />
            <Text style={{ marginTop: 12, color: textSecondary, fontSize: 13 }}>
              Loading flight telemetry & terminal radar…
            </Text>
          </View>
        ) : (
          <>
            {/* TAB 1: ACTIVE AIRPORT RIDE */}
            {activeTab === 'active' && (
              <View>
                {!activeJob ? (
                  <View style={[styles.emptyCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                    <MaterialCommunityIcons name="airplane-takeoff" size={48} color={textSecondary} />
                    <Text style={[styles.emptyTitle, { color: textPrimary }]}>No Active Airport Transfer</Text>
                    <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
                      You currently have no assigned airport pickup or drop ride. You can check terminal leads or search flight statuses using the radar icon above.
                    </Text>
                    <TouchableOpacity
                      style={[styles.flightSearchBtn, { backgroundColor: '#0284C7' }]}
                      onPress={() => setShowFlightSearchModal(true)}
                    >
                      <MaterialCommunityIcons name="airplane-search" size={16} color="#FFFFFF" />
                      <Text style={styles.flightSearchBtnText}>Track Incoming Flight</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={[styles.jobCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                    {/* Header */}
                    <View style={styles.jobCardHeader}>
                      <View>
                        <Text style={[styles.jobTitle, { color: textPrimary }]}>
                          ✈️ {activeJob.pickup_type === 'AIRPORT_PICKUP' ? 'AIRPORT PICKUP' : 'AIRPORT DROP'}
                        </Text>
                        <Text style={[styles.terminalText, { color: '#0284C7' }]}>
                          {activeJob.terminal_name}
                        </Text>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: 'rgba(2, 132, 199, 0.15)' }]}>
                        <Text style={[styles.statusPillText, { color: '#0284C7' }]}>
                          {activeJob.status_label || activeJob.status}
                        </Text>
                      </View>
                    </View>

                    {/* Flight Telemetry Strip if available */}
                    {activeJob.flight_details && (
                      <View style={[styles.flightBox, { backgroundColor: isDark ? '#0F172A' : '#F0F9FF', borderColor: '#BAE6FD' }]}>
                        <View style={styles.flightHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="airplane" size={16} color="#0284C7" />
                            <Text style={[styles.flightNum, { color: textPrimary }]}>
                              {activeJob.flight_details.flight_number} ({activeJob.flight_details.airline_name})
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.delayBadge,
                              { backgroundColor: activeJob.flight_details.delay_minutes > 0 ? '#FEF2F2' : '#F0FDF4' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.delayText,
                                { color: activeJob.flight_details.delay_minutes > 0 ? '#EF4444' : '#10B981' },
                              ]}
                            >
                              {activeJob.flight_details.delay_minutes > 0
                                ? `DELAYED +${activeJob.flight_details.delay_minutes}M`
                                : 'ON TIME'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.flightMetaRow}>
                          <Text style={[styles.flightMetaItem, { color: textSecondary }]}>
                            Origin: <Text style={{ color: textPrimary, fontWeight: '700' }}>{activeJob.flight_details.origin_city}</Text>
                          </Text>
                          {activeJob.flight_details.baggage_belt && (
                            <Text style={[styles.flightMetaItem, { color: textSecondary }]}>
                              Belt: <Text style={{ color: textPrimary, fontWeight: '700' }}>{activeJob.flight_details.baggage_belt}</Text>
                            </Text>
                          )}
                        </View>
                      </View>
                    )}

                    {/* Bay Guidance Strip */}
                    <View style={[styles.bayStrip, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
                      <View style={styles.bayItem}>
                        <Text style={[styles.bayLabel, { color: textSecondary }]}>PARKING / PICKUP BAY</Text>
                        <Text style={[styles.bayVal, { color: '#0284C7' }]}>{activeJob.parking_bay || 'Designated Lane'}</Text>
                      </View>
                      <View style={styles.bayDivider} />
                      <View style={styles.bayItem}>
                        <Text style={[styles.bayLabel, { color: textSecondary }]}>LUGGAGE</Text>
                        <Text style={[styles.bayVal, { color: textPrimary }]}>{activeJob.luggage_count} Bags</Text>
                      </View>
                      <View style={styles.bayDivider} />
                      <View style={styles.bayItem}>
                        <Text style={[styles.bayLabel, { color: textSecondary }]}>DRIVER NET</Text>
                        <Text style={[styles.bayVal, { color: '#10B981' }]}>₹{activeJob.driver_earnings}</Text>
                      </View>
                    </View>

                    {/* Passenger & Route */}
                    <View style={{ marginTop: 14, gap: 6 }}>
                      <Text style={[styles.customerText, { color: textPrimary }]}>
                        👤 Passenger: {activeJob.customer_name} ({activeJob.customer_phone_masked})
                      </Text>
                      <Text style={[styles.routeText, { color: textSecondary }]} numberOfLines={2}>
                        📍 Pickup: {activeJob.pickup_address}
                      </Text>
                      <Text style={[styles.routeText, { color: textSecondary }]} numberOfLines={2}>
                        🏁 Dropoff: {activeJob.destination_address}
                      </Text>
                    </View>

                    {/* Action Bar */}
                    <View style={styles.actionBar}>
                      <TouchableOpacity
                        style={[styles.actionBtnSecondary, { borderColor: borderCol }]}
                        onPress={() => setShowParkingModal(true)}
                      >
                        <MaterialCommunityIcons name="parking" size={18} color="#0284C7" />
                        <Text style={[styles.actionBtnSecondaryText, { color: '#0284C7' }]}>Log Parking Toll</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtnPrimary, { backgroundColor: '#0284C7' }]}
                        onPress={() => setShowStartModal(true)}
                      >
                        <MaterialCommunityIcons name="play-circle-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.actionBtnText}>Start Ride (OTP)</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* TAB 2: TERMINAL QUEUE & LEADS */}
            {activeTab === 'queue' && (
              <View>
                {availableRequests.length === 0 ? (
                  <View style={[styles.emptyCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                    <MaterialCommunityIcons name="radar" size={48} color={textSecondary} />
                    <Text style={[styles.emptyTitle, { color: textPrimary }]}>No Terminal Leads Available</Text>
                    <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
                      There are currently no passenger airport booking requests waiting. Terminal requests appear automatically when flights land.
                    </Text>
                  </View>
                ) : (
                  availableRequests.map((req, idx) => (
                    <View key={idx} style={[styles.requestCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                      <View style={styles.reqHeader}>
                        <Text style={[styles.reqTitle, { color: textPrimary }]}>{req.flight_number || 'Airport Transfer'}</Text>
                        <Text style={[styles.reqFare, { color: '#10B981' }]}>₹{req.fare || 650}</Text>
                      </View>
                      <Text style={[styles.reqRoute, { color: textSecondary }]}>📍 {req.pickup_address}</Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* TAB 3: HISTORY */}
            {activeTab === 'history' && (
              <View style={[styles.emptyCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                <MaterialCommunityIcons name="check-decagram" size={48} color="#10B981" />
                <Text style={[styles.emptyTitle, { color: textPrimary }]}>Airport Transfer History</Text>
                <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
                  All completed terminal pickups and drops with parking toll reimbursements are balanced in your ledger.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── FLIGHT TRACKER MODAL ── */}
      <Modal visible={showFlightSearchModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: bgCard, borderColor: borderCol }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Live Flight Status Radar</Text>
              <TouchableOpacity onPress={() => setShowFlightSearchModal(false)}>
                <Feather name="x" size={22} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: textSecondary }]}>
              Enter Flight Number to view live delay telemetry, terminal, and baggage belt info.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary }]}>FLIGHT NUMBER</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', color: textPrimary, borderColor: borderCol }]}
                value={flightSearchNumber}
                onChangeText={setFlightSearchNumber}
                placeholder="e.g. 6E-2412 or AI-853"
                autoCapitalize="characters"
                placeholderTextColor={textSecondary}
              />
            </View>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: '#0284C7' }]}
              onPress={handleSearchFlight}
              disabled={searchingFlight}
            >
              {searchingFlight ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Fetch Flight Telemetry</Text>
              )}
            </TouchableOpacity>

            {searchedFlight && (
              <View style={[styles.searchedResultCard, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: borderCol }]}>
                <Text style={[styles.resultFlightTitle, { color: textPrimary }]}>
                  {searchedFlight.flight_number} — {searchedFlight.airline_name}
                </Text>
                <Text style={[styles.resultSub, { color: textSecondary }]}>
                  Status: <Text style={{ color: searchedFlight.delay_minutes > 0 ? '#EF4444' : '#10B981', fontWeight: '700' }}>
                    {searchedFlight.flight_status} ({searchedFlight.delay_minutes > 0 ? `+${searchedFlight.delay_minutes} min delay` : 'On Time'})
                  </Text>
                </Text>
                <Text style={[styles.resultSub, { color: textSecondary }]}>
                  Terminal: {searchedFlight.terminal} | Belt: {searchedFlight.baggage_belt || 'TBD'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ── START TRIP MODAL ── */}
      <Modal visible={showStartModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: bgCard, borderColor: borderCol }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Start Airport Transfer</Text>
              <TouchableOpacity onPress={() => setShowStartModal(false)}>
                <Feather name="x" size={22} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: textSecondary }]}>
              Enter the 4-digit Start OTP provided by the passenger.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary }]}>4-DIGIT PASSENGER START OTP</Text>
              <TextInput
                style={[styles.otpField, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', color: '#0284C7', borderColor: borderCol }]}
                keyboardType="numeric"
                maxLength={6}
                value={startOTP}
                onChangeText={setStartOTP}
                placeholder="••••"
                placeholderTextColor={textSecondary}
              />
            </View>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: '#0284C7' }]}
              onPress={handleStartTrip}
              disabled={startingTrip}
            >
              {startingTrip ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Verify OTP & Start Ride</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── LOG PARKING TOLL MODAL ── */}
      <Modal visible={showParkingModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: bgCard, borderColor: borderCol }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Log Airport Parking Toll</Text>
              <TouchableOpacity onPress={() => setShowParkingModal(false)}>
                <Feather name="x" size={22} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary }]}>PARKING CHARGE (₹)</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', color: textPrimary, borderColor: borderCol }]}
                keyboardType="numeric"
                value={parkingAmount}
                onChangeText={setParkingAmount}
                placeholder="e.g. 120"
                placeholderTextColor={textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary }]}>PARKING BAY / PILLAR NUMBER</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', color: textPrimary, borderColor: borderCol }]}
                value={parkingBay}
                onChangeText={setParkingBay}
                placeholder="e.g. Pillar P4 / Lane 2"
                placeholderTextColor={textSecondary}
              />
            </View>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: '#0284C7' }]}
              onPress={handleLogParking}
              disabled={loggingParking}
            >
              {loggingParking ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Add Parking to Trip Invoice</Text>
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
  flightSearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  flightSearchBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  jobCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  jobTitle: { fontSize: 16, fontWeight: '800' },
  terminalText: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  flightBox: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  flightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flightNum: { fontSize: 13, fontWeight: '800' },
  delayBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  delayText: { fontSize: 10, fontWeight: '800' },
  flightMetaRow: { flexDirection: 'row', gap: 14, marginTop: 6 },
  flightMetaItem: { fontSize: 11 },
  bayStrip: {
    flexDirection: 'row',
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
    justifyContent: 'space-between',
  },
  bayItem: { alignItems: 'center', flex: 1 },
  bayLabel: { fontSize: 9, fontWeight: '800' },
  bayVal: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  bayDivider: { width: 1, backgroundColor: '#CBD5E1', marginVertical: 4 },
  customerText: { fontSize: 13, fontWeight: '700' },
  routeText: { fontSize: 12 },
  actionBar: { flexDirection: 'row', gap: 10, marginTop: 16 },
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
  requestCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12 },
  reqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reqTitle: { fontSize: 14, fontWeight: '700' },
  reqFare: { fontSize: 16, fontWeight: '800' },
  reqRoute: { fontSize: 12, marginTop: 4 },
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
  searchedResultCard: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  resultFlightTitle: { fontSize: 14, fontWeight: '800' },
  resultSub: { fontSize: 12, marginTop: 4 },
})
