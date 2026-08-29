/**
 * Partner Carpooling & Shared Seats Commuter Workspace — Daily Commute Vertical
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative Corridor Ridesharing & Seat Management Operations:
 *  - Real-Time Seat Occupancy Meter (Vacant vs Booked Seats)
 *  - Multi-Passenger Sequential Boarding with 4-Digit Commuter Seat PIN
 *  - Individual Waypoint Dropoff & Fare Splitting
 *  - Publish Daily Commute Routes with Fixed Per-Seat Pricing
 *  - Split Fare Ledger Reconciliation & Instant Payout
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
  CarpoolService,
  CarpoolTripJob,
  CarpoolPassengerItem,
} from '../src/services/carpoolService'

export default function CarpoolWorkspaceScreen() {
  const { theme, isDark } = useTheme()
  const [activeTab, setActiveTab] = useState<'active' | 'requests' | 'publish'>('active')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [activeTrip, setActiveTrip] = useState<CarpoolTripJob | null>(null)
  const [seatRequests, setSeatRequests] = useState<any[]>([])

  // Passenger PIN Verification Modal
  const [showPinModal, setShowPinModal] = useState(false)
  const [selectedPassenger, setSelectedPassenger] = useState<CarpoolPassengerItem | null>(null)
  const [seatPin, setSeatPin] = useState('')
  const [verifyingPin, setVerifyingPin] = useState(false)

  // Publish Route Form State
  const [originAddr, setOriginAddr] = useState('')
  const [destAddr, setDestAddr] = useState('')
  const [departTime, setDepartTime] = useState('08:30 AM')
  const [seatsCount, setSeatsCount] = useState('3')
  const [perSeatFare, setPerSeatFare] = useState('150')
  const [publishing, setPublishing] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [tripRes, reqsRes] = await Promise.allSettled([
        CarpoolService.getActiveCarpoolTrip(),
        CarpoolService.getAvailableSeatRequests(),
      ])

      if (tripRes.status === 'fulfilled') {
        setActiveTrip(tripRes.value)
      }
      if (reqsRes.status === 'fulfilled') {
        setSeatRequests(reqsRes.value)
      }
    } catch (err: any) {
      console.warn('[CarpoolWorkspace] loadData error:', err.message)
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

  // Handle Verify Seat PIN
  const handleVerifySeatPin = async () => {
    if (!activeTrip || !selectedPassenger) return
    if (!seatPin || seatPin.length < 4) {
      Alert.alert('Invalid PIN', 'Please enter the 4-digit seat PIN shown in the passenger app.')
      return
    }

    setVerifyingPin(true)
    try {
      await CarpoolService.verifyPassengerSeatPIN(
        activeTrip.id,
        selectedPassenger.booking_id,
        seatPin
      )

      Alert.alert('Seat Verified', `${selectedPassenger.passenger_name} is marked as boarded.`)
      setShowPinModal(false)
      setSelectedPassenger(null)
      setSeatPin('')
      loadData()
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message || 'Invalid commuter seat PIN.')
    } finally {
      setVerifyingPin(false)
    }
  }

  // Handle Dropoff Passenger
  const handleDropoffPassenger = (p: CarpoolPassengerItem) => {
    Alert.alert('Dropoff Passenger', `Confirm dropoff for ${p.passenger_name} at ${p.dropoff_address}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm Dropoff',
        onPress: async () => {
          if (!activeTrip) return
          try {
            await CarpoolService.completePassengerDropoff(activeTrip.id, p.booking_id)
            Alert.alert('Dropoff Recorded', `₹${p.fare_amount} added to collected trip fare.`)
            loadData()
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not complete dropoff.')
          }
        },
      },
    ])
  }

  // Handle Finish Entire Carpool Trip
  const handleFinishCarpool = async () => {
    if (!activeTrip) return
    Alert.alert('Finish Carpool Journey', 'Complete this carpool corridor and finalize all passenger payouts?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Finish Journey',
        onPress: async () => {
          try {
            await CarpoolService.completeCarpoolTrip(activeTrip.id)
            Alert.alert('🎉 Carpool Finished!', `Net earnings of ₹${activeTrip.driver_net_earnings} settled to your wallet balance.`)
            loadData()
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not finish carpool trip.')
          }
        },
      },
    ])
  }

  // Handle Publish New Route
  const handlePublishRoute = async () => {
    if (!originAddr.trim() || !destAddr.trim()) {
      Alert.alert('Missing Info', 'Please enter both origin and destination addresses.')
      return
    }

    setPublishing(true)
    try {
      await CarpoolService.publishCarpoolRoute({
        origin_address: originAddr.trim(),
        destination_address: destAddr.trim(),
        departure_time: departTime,
        total_seats: Number(seatsCount) || 3,
        per_seat_fare: Number(perSeatFare) || 150,
      })

      Alert.alert('🚀 Route Published!', 'Your carpool ride is live. Commuters along your route can now book available seats.')
      setOriginAddr('')
      setDestAddr('')
      setActiveTab('active')
      loadData()
    } catch (err: any) {
      Alert.alert('Publish Failed', err.message || 'Could not publish carpool route.')
    } finally {
      setPublishing(false)
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
            <Text style={[styles.headerTitle, { color: textPrimary }]}>Carpool & Rideshare</Text>
            <View style={[styles.proBadge, { backgroundColor: '#10B981' }]}>
              <Text style={styles.proBadgeText}>SEAT SHARE</Text>
            </View>
          </View>
          <Text style={[styles.headerSubtitle, { color: textSecondary }]}>
            Corridor Commute, Seat Management & Fare Splitting
          </Text>
        </View>
        <TouchableOpacity style={styles.actionBtn} onPress={loadData}>
          <Feather name="refresh-cw" size={18} color="#10B981" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsRow, { backgroundColor: isDark ? '#1E293B' : '#EDF2F7' }]}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'active' && [styles.activeTabBtn, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]]}
          onPress={() => setActiveTab('active')}
        >
          <MaterialCommunityIcons
            name="car-seat"
            size={16}
            color={activeTab === 'active' ? '#10B981' : textSecondary}
          />
          <Text style={[styles.tabBtnText, { color: activeTab === 'active' ? '#10B981' : textSecondary }]}>
            Active Carpool
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'requests' && [styles.activeTabBtn, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]]}
          onPress={() => setActiveTab('requests')}
        >
          <MaterialCommunityIcons
            name="account-multiple-plus-outline"
            size={16}
            color={activeTab === 'requests' ? '#0284C7' : textSecondary}
          />
          <Text style={[styles.tabBtnText, { color: activeTab === 'requests' ? '#0284C7' : textSecondary }]}>
            Seat Leads {seatRequests.length > 0 ? `(${seatRequests.length})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'publish' && [styles.activeTabBtn, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]]}
          onPress={() => setActiveTab('publish')}
        >
          <MaterialCommunityIcons
            name="plus-circle-outline"
            size={16}
            color={activeTab === 'publish' ? '#8B5CF6' : textSecondary}
          />
          <Text style={[styles.tabBtnText, { color: activeTab === 'publish' ? '#8B5CF6' : textSecondary }]}>
            Publish Route
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
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={{ marginTop: 12, color: textSecondary, fontSize: 13 }}>
              Loading seat telemetry & corridor manifest…
            </Text>
          </View>
        ) : (
          <>
            {/* TAB 1: ACTIVE CARPOOL */}
            {activeTab === 'active' && (
              <View>
                {!activeTrip ? (
                  <View style={[styles.emptyCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                    <MaterialCommunityIcons name="car-multiple" size={48} color={textSecondary} />
                    <Text style={[styles.emptyTitle, { color: textPrimary }]}>No Active Carpool Ride</Text>
                    <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
                      You do not have an ongoing carpool ride right now. Publish a new commuter corridor route or accept pending seat requests.
                    </Text>
                    <TouchableOpacity
                      style={[styles.primaryActionBtn, { backgroundColor: '#10B981' }]}
                      onPress={() => setActiveTab('publish')}
                    >
                      <Text style={styles.primaryActionBtnText}>+ Publish Carpool Route</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={[styles.carpoolCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                    {/* Header */}
                    <View style={styles.cardHeader}>
                      <View>
                        <Text style={[styles.corridorTitle, { color: textPrimary }]}>
                          🚗 {activeTrip.corridor_name}
                        </Text>
                        <Text style={[styles.timeSubtitle, { color: '#10B981' }]}>
                          Departure: {activeTrip.departure_time}
                        </Text>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                        <Text style={[styles.statusPillText, { color: '#10B981' }]}>
                          {activeTrip.status_label || activeTrip.status}
                        </Text>
                      </View>
                    </View>

                    {/* Seat Occupancy Meter */}
                    <View style={[styles.meterStrip, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
                      <View style={styles.meterItem}>
                        <Text style={[styles.meterLabel, { color: textSecondary }]}>BOOKED SEATS</Text>
                        <Text style={[styles.meterVal, { color: '#10B981' }]}>
                          {activeTrip.booked_seats} / {activeTrip.total_seats}
                        </Text>
                      </View>
                      <View style={styles.meterDivider} />
                      <View style={styles.meterItem}>
                        <Text style={[styles.meterLabel, { color: textSecondary }]}>VACANT SEATS</Text>
                        <Text style={[styles.meterVal, { color: activeTrip.available_seats > 0 ? '#0284C7' : '#EF4444' }]}>
                          {activeTrip.available_seats} Left
                        </Text>
                      </View>
                      <View style={styles.meterDivider} />
                      <View style={styles.meterItem}>
                        <Text style={[styles.meterLabel, { color: textSecondary }]}>NET EARNINGS</Text>
                        <Text style={[styles.meterVal, { color: '#10B981' }]}>
                          ₹{activeTrip.driver_net_earnings}
                        </Text>
                      </View>
                    </View>

                    {/* Route Endpoints */}
                    <View style={{ marginTop: 14, gap: 4 }}>
                      <Text style={[styles.routeText, { color: textSecondary }]}>
                        📍 From: {activeTrip.origin_address}
                      </Text>
                      <Text style={[styles.routeText, { color: textSecondary }]}>
                        🏁 To: {activeTrip.destination_address}
                      </Text>
                    </View>

                    {/* Passengers List */}
                    <Text style={[styles.passengersHeader, { color: textPrimary }]}>
                      Booked Co-Passengers ({activeTrip.passengers.length})
                    </Text>

                    {activeTrip.passengers.length === 0 ? (
                      <Text style={[styles.noPassText, { color: textSecondary }]}>
                        No passenger has booked a seat yet. Seats remain open for instant booking.
                      </Text>
                    ) : (
                      activeTrip.passengers.map((p, i) => (
                        <View
                          key={p.booking_id || i}
                          style={[
                            styles.passengerCard,
                            { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: borderCol },
                          ]}
                        >
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={[styles.passName, { color: textPrimary }]}>{p.passenger_name}</Text>
                              <Text style={[styles.passFare, { color: '#10B981' }]}>₹{p.fare_amount}</Text>
                            </View>

                            <Text style={[styles.passPickup, { color: textSecondary }]}>
                              📍 {p.pickup_address} → 🏁 {p.dropoff_address}
                            </Text>

                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                              {p.status === 'CONFIRMED' ? (
                                <TouchableOpacity
                                  style={[styles.pinVerifyBtn, { backgroundColor: '#10B981' }]}
                                  onPress={() => {
                                    setSelectedPassenger(p)
                                    setSeatPin('')
                                    setShowPinModal(true)
                                  }}
                                >
                                  <MaterialCommunityIcons name="shield-check" size={14} color="#FFFFFF" />
                                  <Text style={styles.pinVerifyBtnText}>Verify Seat PIN</Text>
                                </TouchableOpacity>
                              ) : p.status === 'BOARDED' ? (
                                <TouchableOpacity
                                  style={[styles.dropoffBtn, { backgroundColor: '#0284C7' }]}
                                  onPress={() => handleDropoffPassenger(p)}
                                >
                                  <MaterialCommunityIcons name="map-marker-check" size={14} color="#FFFFFF" />
                                  <Text style={styles.dropoffBtnText}>Dropoff</Text>
                                </TouchableOpacity>
                              ) : (
                                <View style={styles.droppedBadge}>
                                  <Text style={styles.droppedBadgeText}>DROPPED OFF</Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>
                      ))
                    )}

                    {/* Finish Carpool Button */}
                    <TouchableOpacity
                      style={[styles.finishBtn, { backgroundColor: '#10B981' }]}
                      onPress={handleFinishCarpool}
                    >
                      <MaterialCommunityIcons name="flag-checkered" size={20} color="#FFFFFF" />
                      <Text style={styles.finishBtnText}>Finish Carpool Journey</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* TAB 2: SEAT REQUESTS */}
            {activeTab === 'requests' && (
              <View>
                {seatRequests.length === 0 ? (
                  <View style={[styles.emptyCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                    <MaterialCommunityIcons name="account-search-outline" size={48} color={textSecondary} />
                    <Text style={[styles.emptyTitle, { color: textPrimary }]}>No Seat Requests Waiting</Text>
                    <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
                      Commuters searching along your active corridor will appear here for instant seat assignment.
                    </Text>
                  </View>
                ) : (
                  seatRequests.map((req, idx) => (
                    <View key={idx} style={[styles.carpoolCard, { backgroundColor: bgCard, borderColor: borderCol, marginBottom: 12 }]}>
                      <Text style={[styles.corridorTitle, { color: textPrimary }]}>{req.passenger_name}</Text>
                      <Text style={[styles.routeText, { color: textSecondary, marginTop: 4 }]}>📍 {req.pickup_address} → 🏁 {req.dropoff_address}</Text>
                      <Text style={[styles.passFare, { color: '#10B981', marginTop: 6 }]}>Fare: ₹{req.fare || 150}</Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* TAB 3: PUBLISH NEW ROUTE */}
            {activeTab === 'publish' && (
              <View style={[styles.carpoolCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                <Text style={[styles.corridorTitle, { color: textPrimary, marginBottom: 16 }]}>
                  Publish Daily Commute Route
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: textSecondary }]}>ORIGIN ADDRESS / PICKUP</Text>
                  <TextInput
                    style={[styles.inputField, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', color: textPrimary, borderColor: borderCol }]}
                    value={originAddr}
                    onChangeText={setOriginAddr}
                    placeholder="e.g. Swargate Bus Stand, Pune"
                    placeholderTextColor={textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: textSecondary }]}>DESTINATION ADDRESS / DROPOFF</Text>
                  <TextInput
                    style={[styles.inputField, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', color: textPrimary, borderColor: borderCol }]}
                    value={destAddr}
                    onChangeText={setDestAddr}
                    placeholder="e.g. Hinjawadi Phase 3 Circle, Pune"
                    placeholderTextColor={textSecondary}
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={[styles.inputLabel, { color: textSecondary }]}>DEPARTURE TIME</Text>
                    <TextInput
                      style={[styles.inputField, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', color: textPrimary, borderColor: borderCol }]}
                      value={departTime}
                      onChangeText={setDepartTime}
                      placeholder="08:30 AM"
                      placeholderTextColor={textSecondary}
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={[styles.inputLabel, { color: textSecondary }]}>AVAILABLE SEATS</Text>
                    <TextInput
                      style={[styles.inputField, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', color: textPrimary, borderColor: borderCol }]}
                      keyboardType="numeric"
                      value={seatsCount}
                      onChangeText={setSeatsCount}
                      placeholder="3"
                      placeholderTextColor={textSecondary}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: textSecondary }]}>PER-SEAT FARE (₹)</Text>
                  <TextInput
                    style={[styles.inputField, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', color: textPrimary, borderColor: borderCol }]}
                    keyboardType="numeric"
                    value={perSeatFare}
                    onChangeText={setPerSeatFare}
                    placeholder="e.g. 150"
                    placeholderTextColor={textSecondary}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.publishSubmitBtn, { backgroundColor: '#10B981' }]}
                  onPress={handlePublishRoute}
                  disabled={publishing}
                >
                  {publishing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.publishSubmitBtnText}>Publish Carpool Route</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── SEAT PIN VERIFICATION MODAL ── */}
      <Modal visible={showPinModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: bgCard, borderColor: borderCol }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Verify Commuter PIN</Text>
              <TouchableOpacity onPress={() => setShowPinModal(false)}>
                <Feather name="x" size={22} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: textSecondary }]}>
              Enter the 4-digit Seat PIN provided by {selectedPassenger?.passenger_name}.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary }]}>4-DIGIT SEAT PIN</Text>
              <TextInput
                style={[styles.otpField, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', color: '#10B981', borderColor: borderCol }]}
                keyboardType="numeric"
                maxLength={6}
                value={seatPin}
                onChangeText={setSeatPin}
                placeholder="••••"
                placeholderTextColor={textSecondary}
              />
            </View>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: '#10B981' }]}
              onPress={handleVerifySeatPin}
              disabled={verifyingPin}
            >
              {verifyingPin ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Verify & Board Passenger</Text>
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
  primaryActionBtn: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  primaryActionBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  carpoolCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  corridorTitle: { fontSize: 16, fontWeight: '800' },
  timeSubtitle: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  meterStrip: {
    flexDirection: 'row',
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
    justifyContent: 'space-between',
  },
  meterItem: { alignItems: 'center', flex: 1 },
  meterLabel: { fontSize: 9, fontWeight: '800' },
  meterVal: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  meterDivider: { width: 1, backgroundColor: '#CBD5E1', marginVertical: 4 },
  routeText: { fontSize: 12 },
  passengersHeader: { fontSize: 14, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  noPassText: { fontSize: 12, fontStyle: 'italic', marginBottom: 12 },
  passengerCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  passName: { fontSize: 13, fontWeight: '700' },
  passFare: { fontSize: 14, fontWeight: '800' },
  passPickup: { fontSize: 11, marginTop: 2 },
  pinVerifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  pinVerifyBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  dropoffBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  dropoffBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  droppedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
  },
  droppedBadgeText: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  finishBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
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
  publishSubmitBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  publishSubmitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
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
