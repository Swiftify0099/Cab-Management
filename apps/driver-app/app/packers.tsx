/**
 * Partner Packers & Movers Relocation Workspace — Feature 24 & Phase 3
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative Household Shifting, Office Relocation & Packing Logistics Hub:
 *  - Active Shifting Jobs with live milestone tracking & inventory inspection
 *  - Open Relocation Marketplace: Direct Leads & Competitive Quotation Bidding
 *  - Property & Floor Specs: Elevators/Lifts, Floor count, Furniture Assembly, Fragile packaging
 *  - Proof-of-Delivery (POD) with 4-digit Delivery OTP and Damage Inspection sign-off
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
  PackersMoversService,
  MovingOrderItem,
  MovingQuotePayload,
} from '../src/services/packersMoversService'

export default function PackersMoversWorkspaceScreen() {
  const { theme, isDark } = useTheme()
  const [activeTab, setActiveTab] = useState<'active' | 'requests' | 'history'>('active')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [orders, setOrders] = useState<MovingOrderItem[]>([])
  const [openRequests, setOpenRequests] = useState<MovingOrderItem[]>([])

  // Quote Modal State
  const [selectedOrder, setSelectedOrder] = useState<MovingOrderItem | null>(null)
  const [quotedFare, setQuotedFare] = useState('')
  const [crewSize, setCrewSize] = useState('3')
  const [truckType, setTruckType] = useState('14ft Eicher Container')
  const [estimatedHours, setEstimatedHours] = useState('4')
  const [submittingQuote, setSubmittingQuote] = useState(false)

  // POD Modal State
  const [showPODModal, setShowPODModal] = useState(false)
  const [podOrderId, setPodOrderId] = useState<string | null>(null)
  const [podOTP, setPodOTP] = useState('')
  const [damageReported, setDamageReported] = useState(false)
  const [damageDesc, setDamageDesc] = useState('')
  const [verifyingPOD, setVerifyingPOD] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [myOrdersRes, openReqsRes] = await Promise.allSettled([
        PackersMoversService.getMyMovingOrders(),
        PackersMoversService.getOpenMovingRequests(),
      ])

      if (myOrdersRes.status === 'fulfilled') {
        setOrders(myOrdersRes.value)
      }
      if (openReqsRes.status === 'fulfilled') {
        setOpenRequests(openReqsRes.value)
      }
    } catch (err: any) {
      console.warn('[PackersMoversWorkspace] loadData error:', err.message)
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

  const handleMilestoneAction = async (orderId: string, status: string) => {
    if (status === 'VERIFY_POD') {
      setPodOrderId(orderId)
      setShowPODModal(true)
      return
    }

    try {
      setLoading(true)
      await PackersMoversService.updateMilestone(orderId, status)
      Alert.alert('Milestone Updated', `Relocation status updated to ${status}.`)
      loadData()
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Could not update milestone.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitQuote = async () => {
    if (!selectedOrder || !quotedFare || Number(quotedFare) <= 0) {
      Alert.alert('Invalid Fare', 'Please enter a valid quoted amount for shifting.')
      return
    }

    setSubmittingQuote(true)
    try {
      await PackersMoversService.submitMovingQuote({
        order_id: selectedOrder.id,
        mover_id: 'current_mover',
        quoted_fare: Number(quotedFare),
        crew_size: Number(crewSize) || 3,
        truck_type: truckType || '14ft Eicher Container',
        estimated_hours: Number(estimatedHours) || 4,
      })

      Alert.alert('Quote Submitted', 'Your relocation quote has been submitted to the customer.')
      setSelectedOrder(null)
      setQuotedFare('')
      loadData()
    } catch (err: any) {
      Alert.alert('Submission Error', err.message || 'Failed to submit moving quote.')
    } finally {
      setSubmittingQuote(false)
    }
  }

  const handleVerifyPOD = async () => {
    if (!podOrderId || !podOTP || podOTP.length < 4) {
      Alert.alert('Invalid OTP', 'Please enter the 4-digit Delivery OTP provided by the customer.')
      return
    }

    setVerifyingPOD(true)
    try {
      await PackersMoversService.verifyMovingPOD({
        order_id: podOrderId,
        delivery_otp: podOTP,
        damage_reported: damageReported,
        damage_description: damageReported ? damageDesc : undefined,
      })

      Alert.alert('🎉 Relocation Complete!', 'Proof of Delivery verified and shifting order closed.')
      setShowPODModal(false)
      setPodOrderId(null)
      setPodOTP('')
      loadData()
    } catch (err: any) {
      Alert.alert('POD Failed', err.message || 'Invalid Delivery OTP.')
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
            <Text style={[styles.headerTitle, { color: textPrimary }]}>Packers & Movers</Text>
            <View style={[styles.proBadge, { backgroundColor: '#F97316' }]}>
              <Text style={styles.proBadgeText}>RELOCATION</Text>
            </View>
          </View>
          <Text style={[styles.headerSubtitle, { color: textSecondary }]}>
            Household Shifting & Commercial Office Moves
          </Text>
        </View>
        <TouchableOpacity style={styles.actionBtn} onPress={loadData}>
          <Feather name="refresh-cw" size={18} color="#F97316" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsRow, { backgroundColor: isDark ? '#1E293B' : '#EDF2F7' }]}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'active' && [styles.activeTabBtn, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]]}
          onPress={() => setActiveTab('active')}
        >
          <MaterialCommunityIcons
            name="dolly"
            size={16}
            color={activeTab === 'active' ? '#F97316' : textSecondary}
          />
          <Text style={[styles.tabBtnText, { color: activeTab === 'active' ? '#F97316' : textSecondary }]}>
            Active Moves
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'requests' && [styles.activeTabBtn, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]]}
          onPress={() => setActiveTab('requests')}
        >
          <MaterialCommunityIcons
            name="format-list-checks"
            size={16}
            color={activeTab === 'requests' ? '#0284C7' : textSecondary}
          />
          <Text style={[styles.tabBtnText, { color: activeTab === 'requests' ? '#0284C7' : textSecondary }]}>
            Shifting Leads {openRequests.length > 0 ? `(${openRequests.length})` : ''}
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
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading && !refreshing ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={{ marginTop: 12, color: textSecondary, fontSize: 13 }}>
              Loading relocation orders…
            </Text>
          </View>
        ) : (
          <>
            {/* TAB 1: ACTIVE MOVES */}
            {activeTab === 'active' && (
              <View>
                {orders.length === 0 ? (
                  <View style={[styles.emptyCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                    <MaterialCommunityIcons name="home-export-outline" size={48} color={textSecondary} />
                    <Text style={[styles.emptyTitle, { color: textPrimary }]}>No Active Shifting Jobs</Text>
                    <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
                      You have no residential or office relocation projects in progress. Check the "Shifting Leads" tab to bid on moving requests.
                    </Text>
                    <TouchableOpacity
                      style={[styles.exploreBtn, { backgroundColor: '#F97316' }]}
                      onPress={() => setActiveTab('requests')}
                    >
                      <Text style={styles.exploreBtnText}>Browse Shifting Leads</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  orders.map(order => (
                    <View key={order.id} style={[styles.orderCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                      {/* Header */}
                      <View style={styles.orderCardHeader}>
                        <View>
                          <Text style={[styles.orderNumber, { color: textPrimary }]}>
                            {order.move_size.replace('_', ' ')} RELOCATION
                          </Text>
                          <Text style={[styles.orderTime, { color: textSecondary }]}>
                            Move Date: {order.scheduled_move_date}
                          </Text>
                        </View>
                        <View style={[styles.statusPill, { backgroundColor: 'rgba(249, 115, 22, 0.15)' }]}>
                          <Text style={[styles.statusPillText, { color: '#F97316' }]}>
                            {order.status_label || order.status}
                          </Text>
                        </View>
                      </View>

                      {/* Property Specs */}
                      <View style={[styles.cargoBox, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
                        <View style={styles.cargoMetaRow}>
                          <View style={styles.cargoMetaItem}>
                            <Text style={[styles.cargoMetaLabel, { color: textSecondary }]}>PICKUP FLOOR</Text>
                            <Text style={[styles.cargoMetaVal, { color: textPrimary }]}>
                              {order.pickup_floor === 0 ? 'Ground' : `Floor ${order.pickup_floor}`} ({order.pickup_has_lift ? 'Lift' : 'No Lift'})
                            </Text>
                          </View>
                          <View style={styles.cargoMetaItem}>
                            <Text style={[styles.cargoMetaLabel, { color: textSecondary }]}>DROP FLOOR</Text>
                            <Text style={[styles.cargoMetaVal, { color: textPrimary }]}>
                              {order.drop_floor === 0 ? 'Ground' : `Floor ${order.drop_floor}`} ({order.drop_has_lift ? 'Lift' : 'No Lift'})
                            </Text>
                          </View>
                          <View style={styles.cargoMetaItem}>
                            <Text style={[styles.cargoMetaLabel, { color: textSecondary }]}>DISTANCE</Text>
                            <Text style={[styles.cargoMetaVal, { color: '#F97316' }]}>
                              {order.distance_km} KM
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Route */}
                      <View style={styles.routeSection}>
                        <View style={styles.routePoint}>
                          <Ionicons name="location-sharp" size={16} color="#10B981" />
                          <Text style={[styles.routeAddress, { color: textPrimary, marginLeft: 8, flex: 1 }]}>
                            {order.pickup_address}
                          </Text>
                        </View>
                        <View style={styles.routeDivider} />
                        <View style={styles.routePoint}>
                          <Ionicons name="flag-sharp" size={16} color="#EF4444" />
                          <Text style={[styles.routeAddress, { color: textPrimary, marginLeft: 8, flex: 1 }]}>
                            {order.drop_address}
                          </Text>
                        </View>
                      </View>

                      {/* Milestone Actions */}
                      <View style={styles.milestoneActionsWrap}>
                        <TouchableOpacity
                          style={[styles.primaryActionBtn, { backgroundColor: '#F97316' }]}
                          onPress={() => handleMilestoneAction(order.id, 'PACKING_STARTED')}
                        >
                          <MaterialCommunityIcons name="package-variant" size={18} color="#FFFFFF" />
                          <Text style={styles.primaryActionBtnText}>Start Packing</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.primaryActionBtn, { backgroundColor: '#10B981' }]}
                          onPress={() => handleMilestoneAction(order.id, 'VERIFY_POD')}
                        >
                          <MaterialCommunityIcons name="shield-check" size={18} color="#FFFFFF" />
                          <Text style={styles.primaryActionBtnText}>POD Sign-off</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* TAB 2: SHIFTING LEADS & BIDS */}
            {activeTab === 'requests' && (
              <View>
                {openRequests.length === 0 ? (
                  <View style={[styles.emptyCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                    <MaterialCommunityIcons name="radar" size={48} color={textSecondary} />
                    <Text style={[styles.emptyTitle, { color: textPrimary }]}>No Open Relocation Leads</Text>
                    <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
                      There are currently no relocation requests pending quotes in your region. New shifting inquiries will appear here automatically.
                    </Text>
                  </View>
                ) : (
                  openRequests.map(req => (
                    <View key={req.id} style={[styles.bidCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                      <View style={styles.bidCardHeader}>
                        <View>
                          <Text style={[styles.bidTitle, { color: textPrimary }]}>
                            {req.move_size.replace('_', ' ')} House Shifting
                          </Text>
                          <Text style={[styles.bidVehicle, { color: '#F97316' }]}>
                            Distance: {req.distance_km} KM • {req.scheduled_move_date}
                          </Text>
                        </View>
                        <View style={styles.fareEstBox}>
                          <Text style={styles.fareEstLabel}>EST. COST</Text>
                          <Text style={[styles.fareEstVal, { color: '#F97316' }]}>
                            ₹{req.estimated_cost || 4500}
                          </Text>
                        </View>
                      </View>

                      {/* Checklist flags */}
                      <View style={[styles.cargoSpecsRow, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
                        {req.requires_fragile_packing && (
                          <Text style={[styles.cargoSpecItem, { color: '#EF4444' }]}>
                            🏺 Fragile Packing
                          </Text>
                        )}
                        {req.requires_assembly && (
                          <Text style={[styles.cargoSpecItem, { color: '#0284C7' }]}>
                            🔧 Assembly Required
                          </Text>
                        )}
                        {req.insurance_opted && (
                          <Text style={[styles.cargoSpecItem, { color: '#10B981' }]}>
                            🛡️ Insured
                          </Text>
                        )}
                      </View>

                      {/* Locations */}
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
                        style={[styles.quoteBtn, { backgroundColor: '#F97316' }]}
                        onPress={() => {
                          setSelectedOrder(req)
                          setQuotedFare(String(req.estimated_cost || 4500))
                        }}
                      >
                        <MaterialCommunityIcons name="gavel" size={18} color="#FFFFFF" />
                        <Text style={styles.quoteBtnText}>Submit Relocation Quote</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* TAB 3: COMPLETED */}
            {activeTab === 'history' && (
              <View>
                <View style={[styles.emptyCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                  <MaterialCommunityIcons name="certificate-outline" size={48} color={textSecondary} />
                  <Text style={[styles.emptyTitle, { color: textPrimary }]}>Relocation History</Text>
                  <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
                    All successfully completed shifting orders and signed customer delivery proofs are archived here.
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── QUOTE BIDDING MODAL ── */}
      <Modal visible={!!selectedOrder} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: bgCard, borderColor: borderCol }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Submit Shifting Quotation</Text>
              <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                <Feather name="x" size={22} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: textSecondary }]}>
              {selectedOrder?.move_size.replace('_', ' ')} • Distance: {selectedOrder?.distance_km} KM
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary }]}>QUOTED TOTAL FARE (₹)</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', color: textPrimary, borderColor: borderCol }]}
                keyboardType="numeric"
                value={quotedFare}
                onChangeText={setQuotedFare}
                placeholder="e.g. 5500"
                placeholderTextColor={textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary }]}>CREW SIZE (HELPERS / PACKERS)</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', color: textPrimary, borderColor: borderCol }]}
                keyboardType="numeric"
                value={crewSize}
                onChangeText={setCrewSize}
                placeholder="3"
                placeholderTextColor={textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary }]}>TRUCK / VEHICLE SPECIFICATION</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', color: textPrimary, borderColor: borderCol }]}
                value={truckType}
                onChangeText={setTruckType}
                placeholder="e.g. 14ft Eicher Container"
                placeholderTextColor={textSecondary}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitQuoteActionBtn, { backgroundColor: '#F97316' }]}
              onPress={handleSubmitQuote}
              disabled={submittingQuote}
            >
              {submittingQuote ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitQuoteActionBtnText}>Confirm & Send Shifting Bid</Text>
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
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Relocation Handover & POD</Text>
              <TouchableOpacity onPress={() => setShowPODModal(false)}>
                <Feather name="x" size={22} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: textSecondary }]}>
              Enter the 4-digit Delivery OTP provided by the customer after completing shifting and inspection.
            </Text>

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

            <TouchableOpacity
              style={[styles.submitQuoteActionBtn, { backgroundColor: '#10B981' }]}
              onPress={handleVerifyPOD}
              disabled={verifyingPOD}
            >
              {verifyingPOD ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitQuoteActionBtnText}>Verify OTP & Complete Move</Text>
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPillText: {
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
    fontSize: 12,
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
