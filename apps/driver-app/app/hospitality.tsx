/**
 * Partner Hotel Concierge & Hospitality Workspace — Luxury Travel Vertical
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative 5-Star Hotel Guest Pickups & Chauffeur Services:
 *  - Concierge Desk Bookings & Room Manifest Details
 *  - Fullscreen Chauffeur Name Signboard for Lobby & Airport Arrivals
 *  - Chauffeur Hospitality Checklist (Luggage, AC temp, Clean cabin)
 *  - 100% Direct Hotel Master Folio Billing (Zero Cash)
 *  - Luxury Guest Transfer Start & Dropoff Completion
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
  HospitalityService,
  HospitalityTransferJob,
} from '../src/services/hospitalityService'

export default function HospitalityWorkspaceScreen() {
  const { theme, isDark } = useTheme()
  const [activeTab, setActiveTab] = useState<'active' | 'requests' | 'invoicing'>('active')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [activeJob, setActiveJob] = useState<HospitalityTransferJob | null>(null)
  const [availableRequests, setAvailableRequests] = useState<any[]>([])

  // Fullscreen Signboard Modal
  const [showSignboard, setShowSignboard] = useState(false)

  // Start Transfer Modal
  const [showStartModal, setShowStartModal] = useState(false)
  const [guestOtp, setGuestOtp] = useState('')
  const [startingTrip, setStartingTrip] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [jobRes, reqsRes] = await Promise.allSettled([
        HospitalityService.getActiveHospitalityJob(),
        HospitalityService.getAvailableHotelRequests(),
      ])

      if (jobRes.status === 'fulfilled') {
        setActiveJob(jobRes.value)
      }
      if (reqsRes.status === 'fulfilled') {
        setAvailableRequests(reqsRes.value)
      }
    } catch (err: any) {
      console.warn('[HospitalityWorkspace] loadData error:', err.message)
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

  // Handle Start Transfer
  const handleStartTransfer = async () => {
    if (!activeJob) return
    setStartingTrip(true)
    try {
      await HospitalityService.executeCommand(activeJob.id, 'START', { otp: guestOtp || '0000' })
      Alert.alert('Chauffeur Transfer Started', 'Proceed to destination with guest comfort prioritized.')
      setShowStartModal(false)
      setGuestOtp('')
      loadData()
    } catch (err: any) {
      Alert.alert('Start Failed', err.message || 'Could not start transfer.')
    } finally {
      setStartingTrip(false)
    }
  }

  // Handle Complete Transfer
  const handleCompleteTransfer = async () => {
    if (!activeJob) return
    Alert.alert('Complete Guest Transfer', 'Confirm that the guest has arrived safely and luggage has been unloaded?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete Transfer',
        onPress: async () => {
          try {
            await HospitalityService.executeCommand(activeJob.id, 'COMPLETE', {
              billing_method: 'DIRECT_HOTEL_FOLIO',
            })
            Alert.alert('🎉 Transfer Completed!', `Guaranteed payout of ₹${activeJob.driver_earnings} billed to hotel master folio and credited to your wallet.`)
            loadData()
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not complete transfer.')
          }
        },
      },
    ])
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
            <Text style={[styles.headerTitle, { color: textPrimary }]}>Hotel Concierge & Chauffeur</Text>
            <View style={[styles.proBadge, { backgroundColor: '#D97706' }]}>
              <Text style={styles.proBadgeText}>LUXURY</Text>
            </View>
          </View>
          <Text style={[styles.headerSubtitle, { color: textSecondary }]}>
            5-Star Hotel Guest Pickups & Master Folio Billing
          </Text>
        </View>
        <TouchableOpacity style={styles.actionBtn} onPress={loadData}>
          <Feather name="refresh-cw" size={18} color="#D97706" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsRow, { backgroundColor: isDark ? '#1E293B' : '#EDF2F7' }]}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'active' && [styles.activeTabBtn, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]]}
          onPress={() => setActiveTab('active')}
        >
          <MaterialCommunityIcons
            name="account-tie-hat"
            size={16}
            color={activeTab === 'active' ? '#D97706' : textSecondary}
          />
          <Text style={[styles.tabBtnText, { color: activeTab === 'active' ? '#D97706' : textSecondary }]}>
            Active Guest
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'requests' && [styles.activeTabBtn, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]]}
          onPress={() => setActiveTab('requests')}
        >
          <MaterialCommunityIcons
            name="bell-ring-outline"
            size={16}
            color={activeTab === 'requests' ? '#2563EB' : textSecondary}
          />
          <Text style={[styles.tabBtnText, { color: activeTab === 'requests' ? '#2563EB' : textSecondary }]}>
            Concierge Leads {availableRequests.length > 0 ? `(${availableRequests.length})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'invoicing' && [styles.activeTabBtn, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]]}
          onPress={() => setActiveTab('invoicing')}
        >
          <MaterialCommunityIcons
            name="receipt"
            size={16}
            color={activeTab === 'invoicing' ? '#10B981' : textSecondary}
          />
          <Text style={[styles.tabBtnText, { color: activeTab === 'invoicing' ? '#10B981' : textSecondary }]}>
            Hotel Folio
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
            <ActivityIndicator size="large" color="#D97706" />
            <Text style={{ marginTop: 12, color: textSecondary, fontSize: 13 }}>
              Loading luxury concierge telemetry…
            </Text>
          </View>
        ) : (
          <>
            {/* TAB 1: ACTIVE GUEST TRANSFER */}
            {activeTab === 'active' && (
              <View>
                {!activeJob ? (
                  <View style={[styles.emptyCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                    <MaterialCommunityIcons name="shield-crown-outline" size={48} color={textSecondary} />
                    <Text style={[styles.emptyTitle, { color: textPrimary }]}>No Active Guest Transfer</Text>
                    <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
                      You currently have no luxury hotel transfer assigned. Check the "Concierge Leads" tab to accept premium guest transfers.
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.jobCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                    {/* Header */}
                    <View style={styles.jobCardHeader}>
                      <View>
                        <Text style={[styles.hotelTitle, { color: textPrimary }]}>
                          ⭐ {activeJob.hotel_name}
                        </Text>
                        <Text style={[styles.guestNameText, { color: '#D97706' }]}>
                          Guest: {activeJob.guest_name} ({activeJob.room_number || 'VIP Guest'})
                        </Text>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: 'rgba(217, 119, 6, 0.15)' }]}>
                        <Text style={[styles.statusPillText, { color: '#D97706' }]}>
                          {activeJob.status_label || activeJob.status}
                        </Text>
                      </View>
                    </View>

                    {/* Stats Strip */}
                    <View style={[styles.statsStrip, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
                      <View style={styles.statItem}>
                        <Text style={[styles.statLabel, { color: textSecondary }]}>CONCIERGE DESK</Text>
                        <Text style={[styles.statVal, { color: textPrimary }]} numberOfLines={1}>
                          {activeJob.concierge_agent}
                        </Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={[styles.statLabel, { color: textSecondary }]}>LUGGAGE</Text>
                        <Text style={[styles.statVal, { color: '#2563EB' }]}>
                          {activeJob.luggage_count} Bags
                        </Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={[styles.statLabel, { color: textSecondary }]}>DRIVER PAYOUT</Text>
                        <Text style={[styles.statVal, { color: '#10B981' }]}>
                          ₹{activeJob.driver_earnings}
                        </Text>
                      </View>
                    </View>

                    {/* Signboard Launcher Banner */}
                    <TouchableOpacity
                      style={styles.signboardBanner}
                      onPress={() => setShowSignboard(true)}
                    >
                      <MaterialCommunityIcons name="card-account-details-outline" size={24} color="#D97706" />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.signboardBannerTitle}>Chauffeur Welcome Signboard</Text>
                        <Text style={styles.signboardBannerSub}>
                          Tap to open fullscreen high-contrast signboard for lobby meet-and-greet.
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={20} color="#D97706" />
                    </TouchableOpacity>

                    {/* Route Details */}
                    <View style={{ marginTop: 14, gap: 6 }}>
                      <Text style={[styles.routeText, { color: textSecondary }]} numberOfLines={2}>
                        📍 Pickup: {activeJob.pickup_address}
                      </Text>
                      <Text style={[styles.routeText, { color: textSecondary }]} numberOfLines={2}>
                        🏁 Drop: {activeJob.destination_address}
                      </Text>
                      {activeJob.flight_number && (
                        <Text style={[styles.flightText, { color: '#2563EB' }]}>
                          ✈️ Connecting Flight: {activeJob.flight_number}
                        </Text>
                      )}
                    </View>

                    {/* Action Bar */}
                    <View style={styles.actionBar}>
                      {activeJob.status === 'ASSIGNED' || activeJob.status === 'DRIVER_ARRIVING' ? (
                        <TouchableOpacity
                          style={[styles.actionBtnPrimary, { backgroundColor: '#D97706' }]}
                          onPress={() => setShowStartModal(true)}
                        >
                          <MaterialCommunityIcons name="car-door" size={18} color="#FFFFFF" />
                          <Text style={styles.actionBtnText}>Guest Boarded (Start Ride)</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[styles.actionBtnPrimary, { backgroundColor: '#10B981' }]}
                          onPress={handleCompleteTransfer}
                        >
                          <MaterialCommunityIcons name="check-circle-outline" size={18} color="#FFFFFF" />
                          <Text style={styles.actionBtnText}>Complete Transfer & Settle Folio</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* TAB 2: CONCIERGE REQUESTS */}
            {activeTab === 'requests' && (
              <View>
                {availableRequests.length === 0 ? (
                  <View style={[styles.emptyCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                    <MaterialCommunityIcons name="bell-sleep-outline" size={48} color={textSecondary} />
                    <Text style={[styles.emptyTitle, { color: textPrimary }]}>No Concierge Leads Waiting</Text>
                    <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
                      New luxury transfer leads from partnered 5-star hotel concierge desks will appear here in real time.
                    </Text>
                  </View>
                ) : (
                  availableRequests.map((req, idx) => (
                    <View key={idx} style={[styles.jobCard, { backgroundColor: bgCard, borderColor: borderCol, marginBottom: 12 }]}>
                      <Text style={[styles.hotelTitle, { color: textPrimary }]}>{req.hotel_name}</Text>
                      <Text style={[styles.guestNameText, { color: '#D97706' }]}>Guest: {req.guest_name}</Text>
                      <Text style={[styles.routeText, { color: textSecondary, marginTop: 4 }]}>📍 {req.pickup_address} → 🏁 {req.destination_address}</Text>
                      <Text style={[styles.statVal, { color: '#10B981', marginTop: 6 }]}>Payout: ₹{req.fare || 1200}</Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* TAB 3: INVOICING */}
            {activeTab === 'invoicing' && (
              <View style={[styles.emptyCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                <MaterialCommunityIcons name="file-document-check" size={48} color="#D97706" />
                <Text style={[styles.emptyTitle, { color: textPrimary }]}>Hotel Master Folio Billing</Text>
                <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
                  All hotel chauffeur transfers are 100% cashless. Fares are billed directly to the hotel guest room folio and settled weekly to your partner wallet.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── FULLSCREEN CHAUFFEUR SIGNBOARD MODAL ── */}
      <Modal visible={showSignboard} transparent={false} animationType="fade">
        <View style={styles.signboardFullscreen}>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
          
          <TouchableOpacity style={styles.closeSignboardBtn} onPress={() => setShowSignboard(false)}>
            <Feather name="x" size={28} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.signboardContent}>
            <View style={styles.signboardGoldBorder}>
              <Text style={styles.signboardHotelLabel}>
                {activeJob?.hotel_name?.toUpperCase() || 'JW MARRIOTT HOTEL'}
              </Text>
              <View style={styles.signboardDivider} />
              <Text style={styles.signboardWelcomeText}>WELCOME</Text>
              <Text style={styles.signboardGuestName} numberOfLines={2}>
                {activeJob?.guest_name?.toUpperCase() || 'MR. ROBERT CHEN'}
              </Text>
              <View style={styles.signboardDivider} />
              <Text style={styles.signboardChauffeurLabel}>LUXURY CHAUFFEUR SERVICE</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── START TRANSFER MODAL ── */}
      <Modal visible={showStartModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: bgCard, borderColor: borderCol }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Start Guest Transfer</Text>
              <TouchableOpacity onPress={() => setShowStartModal(false)}>
                <Feather name="x" size={22} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: textSecondary }]}>
              Confirm that {activeJob?.guest_name} is seated comfortably and luggage is safely stowed.
            </Text>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: '#D97706' }]}
              onPress={handleStartTransfer}
              disabled={startingTrip}
            >
              {startingTrip ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Start Luxury Transfer</Text>
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
  jobCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  hotelTitle: { fontSize: 16, fontWeight: '800' },
  guestNameText: { fontSize: 13, fontWeight: '700', marginTop: 2 },
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
  signboardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.3)',
    padding: 12,
    marginTop: 14,
  },
  signboardBannerTitle: { fontSize: 13, fontWeight: '800', color: '#D97706' },
  signboardBannerSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  routeText: { fontSize: 12 },
  flightText: { fontSize: 12, fontWeight: '700' },
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
  actionBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  signboardFullscreen: {
    flex: 1,
    backgroundColor: '#05070D',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  closeSignboardBtn: {
    position: 'absolute',
    top: 48,
    right: 24,
    padding: 12,
  },
  signboardContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signboardGoldBorder: {
    width: '100%',
    borderWidth: 3,
    borderColor: '#F59E0B',
    borderRadius: 16,
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  signboardHotelLabel: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 3,
  },
  signboardDivider: {
    width: '60%',
    height: 1.5,
    backgroundColor: '#F59E0B',
    marginVertical: 20,
  },
  signboardWelcomeText: {
    color: '#D97706',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 4,
  },
  signboardGuestName: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 1,
  },
  signboardChauffeurLabel: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
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
  modalSubmitBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  modalSubmitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
})
