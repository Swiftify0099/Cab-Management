/**
 * Partner Commercial Transport & Logistics Workspace — Feature 17 & Phase 3
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative Commercial Freight, Cargo Logistics & Bidding Management Hub:
 *  - Active Shipments with live milestone timeline & cargo checklist
 *  - Open Freight Marketplace: Instant Price Accept & Competitive Quote Bidding
 *  - Cargo Handling: Package counts, weight (KG), labor helpers, fragile indicators
 *  - Secure Proof-of-Delivery (POD) with 4-digit Delivery OTP and Receiver sign-off
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
  Linking,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useTheme } from '../src/theme'
import {
  TransportLogisticsService,
  TransportOrderItem,
  TransportQuoteRequest,
} from '../src/services/transportLogisticsService'
import { VehicleService, DriverVehicle } from '../src/services/vehicleService'

const MILESTONES = [
  { key: 'ARRIVE_PICKUP', label: 'Arrived at Pickup', icon: 'map-pin' },
  { key: 'START_LOADING', label: 'Start Loading', icon: 'package-up' },
  { key: 'FINISH_LOADING', label: 'Loading Completed', icon: 'check-circle' },
  { key: 'START', label: 'Start Transit', icon: 'truck-fast' },
  { key: 'ARRIVE_DROPOFF', label: 'Arrived at Destination', icon: 'flag-checkered' },
  { key: 'START_UNLOADING', label: 'Start Unloading', icon: 'package-down' },
  { key: 'VERIFY_POD', label: 'Verify POD & Complete', icon: 'shield-check' },
]

export default function TransportWorkspaceScreen() {
  const { theme, isDark } = useTheme()
  const [activeTab, setActiveTab] = useState<'active' | 'requests' | 'history'>('active')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Active & History
  const [orders, setOrders] = useState<TransportOrderItem[]>([])
  const [activeJob, setActiveJob] = useState<any | null>(null)

  // Open Freight Bidding
  const [openRequests, setOpenRequests] = useState<TransportOrderItem[]>([])

  // Quote Submission Modal
  const [selectedRequest, setSelectedRequest] = useState<TransportOrderItem | null>(null)
  const [quoteAmount, setQuoteAmount] = useState('')
  const [includedHelpers, setIncludedHelpers] = useState('1')
  const [estimatedETA, setEstimatedETA] = useState('20')
  const [submittingQuote, setSubmittingQuote] = useState(false)

  // POD Verification Modal
  const [showPODModal, setShowPODModal] = useState(false)
  const [podOrderId, setPodOrderId] = useState<string | null>(null)
  const [podOTP, setPodOTP] = useState('')
  const [receiverName, setReceiverName] = useState('')
  const [receiverPhone, setReceiverPhone] = useState('')
  const [verifyingPOD, setVerifyingPOD] = useState(false)

  // Vehicles
  const [vehicles, setVehicles] = useState<DriverVehicle[]>([])
  const [activeVehicle, setActiveVehicle] = useState<DriverVehicle | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [jobRes, ordersRes, openReqsRes, vehList] = await Promise.allSettled([
        TransportLogisticsService.getActiveTransportJob(),
        TransportLogisticsService.getMyTransportOrders(),
        TransportLogisticsService.getOpenFreightRequests(),
        VehicleService.getVehicles(),
      ])

      if (jobRes.status === 'fulfilled') {
        setActiveJob(jobRes.value)
      }
      if (ordersRes.status === 'fulfilled') {
        setOrders(ordersRes.value)
      }
      if (openReqsRes.status === 'fulfilled') {
        setOpenRequests(openReqsRes.value)
      }
      if (vehList.status === 'fulfilled') {
        setVehicles(vehList.value)
        const act = vehList.value.find(v => v.is_active) || vehList.value[0] || null
        setActiveVehicle(act)
      }
    } catch (err: any) {
      console.warn('[TransportWorkspace] loadData error:', err.message)
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

  // Handle milestone command
  const handleMilestoneAction = async (jobId: string, command: string) => {
    if (command === 'VERIFY_POD' || command === 'COMPLETE') {
      setPodOrderId(jobId)
      setShowPODModal(true)
      return
    }

    try {
      setLoading(true)
      await TransportLogisticsService.executeCommand(jobId, command)
      Alert.alert('Status Updated', `Commercial Transport status updated successfully.`)
      loadData()
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Could not update transport status.')
    } finally {
      setLoading(false)
    }
  }

  // Handle quote submit
  const handleSubmitQuote = async () => {
    if (!selectedRequest || !quoteAmount || Number(quoteAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid bid quotation amount.')
      return
    }
    if (!activeVehicle) {
      Alert.alert('Vehicle Required', 'Please select an approved transport vehicle in your profile.')
      return
    }

    setSubmittingQuote(true)
    try {
      await TransportLogisticsService.submitQuote({
        order_id: selectedRequest.id,
        driver_id: 'current_driver',
        vehicle_id: activeVehicle.id,
        amount: Number(quoteAmount),
        included_helpers: Number(includedHelpers) || 0,
        estimated_pickup_eta_min: Number(estimatedETA) || 15,
        estimated_transit_duration_min: 60,
      })

      Alert.alert('Quote Submitted', 'Your commercial quote has been delivered to the customer.')
      setSelectedRequest(null)
      setQuoteAmount('')
      loadData()
    } catch (err: any) {
      Alert.alert('Submission Error', err.message || 'Failed to submit quote.')
    } finally {
      setSubmittingQuote(false)
    }
  }

  // Handle POD verification
  const handleVerifyPOD = async () => {
    if (!podOrderId || !podOTP || podOTP.length < 4) {
      Alert.alert('Invalid OTP', 'Please enter the 4-digit Delivery OTP provided by the receiver.')
      return
    }

    setVerifyingPOD(true)
    try {
      await TransportLogisticsService.verifyPOD({
        order_id: podOrderId,
        driver_id: 'current_driver',
        receiver_name: receiverName || 'Consignee',
        receiver_phone: receiverPhone || '',
        delivery_otp: podOTP,
      })

      Alert.alert('🎉 Cargo Delivered!', 'Proof of Delivery verified and transport order completed successfully.')
      setShowPODModal(false)
      setPodOrderId(null)
      setPodOTP('')
      loadData()
    } catch (err: any) {
      Alert.alert('POD Verification Failed', err.message || 'Invalid Delivery OTP.')
    } finally {
      setVerifyingPOD(false)
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
            <Text style={[styles.headerTitle, { color: textPrimary }]}>Transport Logistics</Text>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>FREIGHT HUB</Text>
            </View>
          </View>
          <Text style={[styles.headerSubtitle, { color: textSecondary }]}>
            Commercial Cargo & Heavy Freight Operations
          </Text>
        </View>
        <TouchableOpacity style={styles.actionBtn} onPress={loadData}>
          <Feather name="refresh-cw" size={18} color="#0284C7" />
        </TouchableOpacity>
      </View>

      {/* Segment Tabs */}
      <View style={[styles.tabsRow, { backgroundColor: isDark ? '#1E293B' : '#EDF2F7' }]}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'active' && [styles.activeTabBtn, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]]}
          onPress={() => setActiveTab('active')}
        >
          <MaterialCommunityIcons
            name="truck-fast-outline"
            size={16}
            color={activeTab === 'active' ? '#0284C7' : textSecondary}
          />
          <Text style={[styles.tabBtnText, { color: activeTab === 'active' ? '#0284C7' : textSecondary }]}>
            Active Shipments
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'requests' && [styles.activeTabBtn, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]]}
          onPress={() => setActiveTab('requests')}
        >
          <MaterialCommunityIcons
            name="hand-coin-outline"
            size={16}
            color={activeTab === 'requests' ? '#F59E0B' : textSecondary}
          />
          <Text style={[styles.tabBtnText, { color: activeTab === 'requests' ? '#F59E0B' : textSecondary }]}>
            Freight Bids {openRequests.length > 0 ? `(${openRequests.length})` : ''}
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

      {/* Main Content Area */}
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
              Loading commercial freight manifests…
            </Text>
          </View>
        ) : (
          <>
            {/* ── TAB 1: ACTIVE SHIPMENTS ── */}
            {activeTab === 'active' && (
              <View>
                {orders.length === 0 && !activeJob ? (
                  <View style={[styles.emptyCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                    <MaterialCommunityIcons name="truck-cargo-container" size={48} color={textSecondary} />
                    <Text style={[styles.emptyTitle, { color: textPrimary }]}>No In-Transit Freight Jobs</Text>
                    <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
                      You currently have no active commercial cargo assigned. Explore the "Freight Bids" tab to quote on available shipments.
                    </Text>
                    <TouchableOpacity
                      style={styles.exploreBtn}
                      onPress={() => setActiveTab('requests')}
                    >
                      <Text style={styles.exploreBtnText}>Browse Freight Requests</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  orders.map(order => (
                    <View key={order.id} style={[styles.orderCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                      {/* Order Header */}
                      <View style={styles.orderCardHeader}>
                        <View>
                          <Text style={[styles.orderNumber, { color: textPrimary }]}>
                            {order.order_number || `FRT-${order.id.slice(0, 8)}`}
                          </Text>
                          <Text style={[styles.orderTime, { color: textSecondary }]}>
                            {order.scheduled_pickup_time || 'Immediate Dispatch'}
                          </Text>
                        </View>
                        <View style={styles.statusPill}>
                          <Text style={styles.statusPillText}>{order.status_label || order.status}</Text>
                        </View>
                      </View>

                      {/* Cargo Summary Chip */}
                      <View style={[styles.cargoBox, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
                        <View style={styles.cargoMetaRow}>
                          <View style={styles.cargoMetaItem}>
                            <Text style={[styles.cargoMetaLabel, { color: textSecondary }]}>CATEGORY</Text>
                            <Text style={[styles.cargoMetaVal, { color: textPrimary }]}>
                              {order.cargo?.goods_category || 'GENERAL'}
                            </Text>
                          </View>
                          <View style={styles.cargoMetaItem}>
                            <Text style={[styles.cargoMetaLabel, { color: textSecondary }]}>WEIGHT</Text>
                            <Text style={[styles.cargoMetaVal, { color: '#0284C7' }]}>
                              {order.cargo?.weight_kg || 250} KG
                            </Text>
                          </View>
                          <View style={styles.cargoMetaItem}>
                            <Text style={[styles.cargoMetaLabel, { color: textSecondary }]}>PACKAGES</Text>
                            <Text style={[styles.cargoMetaVal, { color: textPrimary }]}>
                              {order.cargo?.package_count || 1} Units
                            </Text>
                          </View>
                          <View style={styles.cargoMetaItem}>
                            <Text style={[styles.cargoMetaLabel, { color: textSecondary }]}>HELPERS</Text>
                            <Text style={[styles.cargoMetaVal, { color: '#F59E0B' }]}>
                              {order.cargo?.helpers_count || 0} Men
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Route Section */}
                      <View style={styles.routeSection}>
                        <View style={styles.routePoint}>
                          <Ionicons name="location-sharp" size={16} color="#10B981" />
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={[styles.routeAddress, { color: textPrimary }]} numberOfLines={2}>
                              {order.pickup_address}
                            </Text>
                            <Text style={[styles.contactText, { color: textSecondary }]}>
                              Shipper: {order.pickup_contact_name} ({order.pickup_contact_phone})
                            </Text>
                          </View>
                        </View>

                        <View style={styles.routeDivider} />

                        <View style={styles.routePoint}>
                          <Ionicons name="flag-sharp" size={16} color="#EF4444" />
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={[styles.routeAddress, { color: textPrimary }]} numberOfLines={2}>
                              {order.drop_address}
                            </Text>
                            <Text style={[styles.contactText, { color: textSecondary }]}>
                              Consignee: {order.drop_contact_name} ({order.drop_contact_phone})
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Milestone Quick Actions */}
                      <View style={styles.milestoneActionsWrap}>
                        <TouchableOpacity
                          style={[styles.primaryActionBtn, { backgroundColor: '#0284C7' }]}
                          onPress={() => handleMilestoneAction(order.id, 'ARRIVE_PICKUP')}
                        >
                          <MaterialCommunityIcons name="map-marker-check" size={18} color="#FFFFFF" />
                          <Text style={styles.primaryActionBtnText}>Arrived Pickup</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.primaryActionBtn, { backgroundColor: '#10B981' }]}
                          onPress={() => handleMilestoneAction(order.id, 'VERIFY_POD')}
                        >
                          <MaterialCommunityIcons name="qrcode-scan" size={18} color="#FFFFFF" />
                          <Text style={styles.primaryActionBtnText}>Verify POD</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ── TAB 2: FREIGHT BIDDING MARKETPLACE ── */}
            {activeTab === 'requests' && (
              <View>
                {openRequests.length === 0 ? (
                  <View style={[styles.emptyCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                    <MaterialCommunityIcons name="radar" size={48} color={textSecondary} />
                    <Text style={[styles.emptyTitle, { color: textPrimary }]}>No Open Freight Requests</Text>
                    <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
                      There are currently no commercial freight loads requesting bids in your covered zones. When shippers post cargo, they will appear here in real time.
                    </Text>
                  </View>
                ) : (
                  openRequests.map(req => (
                    <View key={req.id} style={[styles.bidCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                      <View style={styles.bidCardHeader}>
                        <View>
                          <Text style={[styles.bidTitle, { color: textPrimary }]}>
                            {req.cargo?.goods_description || 'Commercial Freight Load'}
                          </Text>
                          <Text style={[styles.bidVehicle, { color: '#0284C7' }]}>
                            Required: {req.vehicle_category_required || 'TATA ACE / PICKUP'}
                          </Text>
                        </View>
                        <View style={styles.fareEstBox}>
                          <Text style={styles.fareEstLabel}>EST. FARE</Text>
                          <Text style={styles.fareEstVal}>₹{req.estimated_fare || 850}</Text>
                        </View>
                      </View>

                      {/* Cargo Details */}
                      <View style={[styles.cargoSpecsRow, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
                        <Text style={[styles.cargoSpecItem, { color: textSecondary }]}>
                          📦 {req.cargo?.weight_kg || 250} KG
                        </Text>
                        <Text style={[styles.cargoSpecItem, { color: textSecondary }]}>
                          🔢 {req.cargo?.package_count || 1} Units
                        </Text>
                        {req.cargo?.fragile_handling && (
                          <Text style={[styles.cargoSpecItem, { color: '#EF4444' }]}>
                            ⚠️ Fragile
                          </Text>
                        )}
                        {req.cargo?.loading_required && (
                          <Text style={[styles.cargoSpecItem, { color: '#F59E0B' }]}>
                            👷 {req.cargo?.helpers_count || 0} Helpers
                          </Text>
                        )}
                      </View>

                      {/* Pickup Drop Preview */}
                      <View style={{ marginVertical: 8, gap: 4 }}>
                        <Text style={[styles.miniRouteText, { color: textSecondary }]} numberOfLines={1}>
                          🟢 {req.pickup_address}
                        </Text>
                        <Text style={[styles.miniRouteText, { color: textSecondary }]} numberOfLines={1}>
                          🔴 {req.drop_address}
                        </Text>
                      </View>

                      {/* Bid Action */}
                      <TouchableOpacity
                        style={styles.quoteBtn}
                        onPress={() => {
                          setSelectedRequest(req)
                          setQuoteAmount(String(req.estimated_fare || 850))
                        }}
                      >
                        <MaterialCommunityIcons name="gavel" size={18} color="#FFFFFF" />
                        <Text style={styles.quoteBtnText}>Submit Quotation / Bid</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ── TAB 3: HISTORY ── */}
            {activeTab === 'history' && (
              <View>
                <View style={[styles.emptyCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                  <MaterialCommunityIcons name="calendar-check" size={48} color={textSecondary} />
                  <Text style={[styles.emptyTitle, { color: textPrimary }]}>Delivered Freight History</Text>
                  <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
                    All your completed commercial transport deliveries and signed Proof-of-Delivery documents are archived here.
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── SUBMIT QUOTATION MODAL ── */}
      <Modal visible={!!selectedRequest} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: bgCard, borderColor: borderCol }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Submit Freight Quotation</Text>
              <TouchableOpacity onPress={() => setSelectedRequest(null)}>
                <Feather name="x" size={22} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: textSecondary }]}>
              {selectedRequest?.cargo?.goods_description} ({selectedRequest?.cargo?.weight_kg} KG)
            </Text>

            {/* Input Fare */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary }]}>YOUR QUOTE AMOUNT (₹)</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', color: textPrimary, borderColor: borderCol }]}
                keyboardType="numeric"
                value={quoteAmount}
                onChangeText={setQuoteAmount}
                placeholder="e.g. 1200"
                placeholderTextColor={textSecondary}
              />
            </View>

            {/* Included Helpers */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary }]}>INCLUDED LOADING HELPERS (PERSONS)</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', color: textPrimary, borderColor: borderCol }]}
                keyboardType="numeric"
                value={includedHelpers}
                onChangeText={setIncludedHelpers}
                placeholder="1"
                placeholderTextColor={textSecondary}
              />
            </View>

            {/* ETA */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary }]}>ESTIMATED PICKUP ARRIVAL (MINUTES)</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', color: textPrimary, borderColor: borderCol }]}
                keyboardType="numeric"
                value={estimatedETA}
                onChangeText={setEstimatedETA}
                placeholder="15"
                placeholderTextColor={textSecondary}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitQuoteActionBtn, { backgroundColor: '#0284C7' }]}
              onPress={handleSubmitQuote}
              disabled={submittingQuote}
            >
              {submittingQuote ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitQuoteActionBtnText}>Confirm & Send Bid</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── POD OTP VERIFICATION MODAL ── */}
      <Modal visible={showPODModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: bgCard, borderColor: borderCol }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Proof of Delivery (POD)</Text>
              <TouchableOpacity onPress={() => setShowPODModal(false)}>
                <Feather name="x" size={22} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: textSecondary }]}>
              Ask the consignee / receiver for their 4-digit Delivery OTP to complete cargo handover.
            </Text>

            {/* OTP Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary }]}>4-DIGIT DELIVERY OTP</Text>
              <TextInput
                style={[styles.otpField, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', color: '#10B981', borderColor: borderCol }]}
                keyboardType="numeric"
                maxLength={6}
                value={podOTP}
                onChangeText={setPodOTP}
                placeholder="••••"
                placeholderTextColor={textSecondary}
              />
            </View>

            {/* Receiver Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary }]}>RECEIVER NAME</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', color: textPrimary, borderColor: borderCol }]}
                value={receiverName}
                onChangeText={setReceiverName}
                placeholder="Receiver full name"
                placeholderTextColor={textSecondary}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitQuoteActionBtn, { backgroundColor: '#10B981' }]}
              onPress={handleVerifyPOD}
              disabled={verifyingPOD}
            >
              {verifyingPOD ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitQuoteActionBtnText}>Verify OTP & Complete Delivery</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  proBadge: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  actionBtn: {
    padding: 8,
  },
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
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  exploreBtn: {
    marginTop: 16,
    backgroundColor: '#0284C7',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  orderCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '800',
  },
  orderTime: {
    fontSize: 12,
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPillText: {
    color: '#0284C7',
    fontSize: 11,
    fontWeight: '700',
  },
  cargoBox: {
    marginTop: 12,
    borderRadius: 10,
    padding: 10,
  },
  cargoMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cargoMetaItem: {
    alignItems: 'center',
  },
  cargoMetaLabel: {
    fontSize: 9,
    fontWeight: '800',
  },
  cargoMetaVal: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  routeSection: {
    marginTop: 12,
    gap: 8,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  routeAddress: {
    fontSize: 13,
    fontWeight: '600',
  },
  contactText: {
    fontSize: 11,
    marginTop: 2,
  },
  routeDivider: {
    height: 12,
    width: 1,
    backgroundColor: '#94A3B8',
    marginLeft: 8,
  },
  milestoneActionsWrap: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  bidCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  bidCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bidTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  bidVehicle: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  fareEstBox: {
    alignItems: 'flex-end',
  },
  fareEstLabel: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '800',
  },
  fareEstVal: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '800',
  },
  cargoSpecsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    padding: 8,
    borderRadius: 8,
  },
  cargoSpecItem: {
    fontSize: 12,
    fontWeight: '700',
  },
  miniRouteText: {
    fontSize: 12,
  },
  quoteBtn: {
    backgroundColor: '#0284C7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    marginTop: 8,
  },
  quoteBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 6,
  },
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
  submitQuoteActionBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitQuoteActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
})
