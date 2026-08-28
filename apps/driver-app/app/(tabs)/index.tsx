/**
 * Driver Home Screen — Feature 4: Availability, Connectivity & Live Operations Hub
 */
import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { api } from '../../src/api/client'
import { useTheme } from '../../src/theme'
import IncomingRequestScreen from '../incoming-request'
import { useDriverSocket } from '../../src/hooks/useDriverSocket'
import { RideRequestService } from '../../src/services/rideRequestService'
import {
  AvailabilityService,
  AvailabilityStateData,
  BlockingReason,
} from '../../src/services/availabilityService'
import { VehicleService, DriverVehicle } from '../../src/services/vehicleService'
import { CoverageService } from '../../src/services/coverageService'
import { AvailabilityToggle } from '../../src/components/availability/AvailabilityToggle'
import { AvailabilityStatusBanner } from '../../src/components/availability/AvailabilityStatusBanner'
import { OnlineBlockedModal } from '../../src/components/availability/OnlineBlockedModal'
import { AvailabilityDevSheet } from '../../src/components/availability/AvailabilityDevSheet'
import { ActiveVehicleSelector } from '../../src/components/vehicle/ActiveVehicleSelector'
import { RideRequestDevSheet } from '../../src/components/ride/RideRequestDevSheet'
import { DestinationModeStatusData } from '../../src/types/destinationMode'
import { DestinationModeService } from '../../src/services/destinationModeService'
import { DestinationActiveBanner } from '../../src/components/destination/DestinationActiveBanner'
import { DestinationModeModal } from '../../src/components/destination/DestinationModeModal'
import { DriverSafetyToolkitModal } from '../../src/components/safety/DriverSafetyToolkitModal'
import { ReportIncidentModal } from '../../src/components/safety/ReportIncidentModal'
import { TrustedContactsSheet } from '../../src/components/safety/TrustedContactsSheet'
import { AIOpportunityBanner } from '../../src/components/ai/AIOpportunityBanner'
import { BestZonesListModal } from '../../src/components/ai/BestZonesListModal'
import { DriverFatigueBanner } from '../../src/components/ai/DriverFatigueBanner'
import { AIDevSheet } from '../../src/components/ai/AIDevSheet'
import { AICopilotModal } from '../../src/components/ai/AICopilotModal'
import { PendingRequestsModal } from '../../src/components/matching/PendingRequestsModal'
import { AISmartDriverService } from '../../src/services/aiSmartDriverService'
import { DriverAIInsights } from '../../src/types/aiSmartDriver'
import BatteryOptimizationModal from '../../src/components/common/BatteryOptimizationModal'
import { BatteryOptimizationService } from '../../src/services/batteryOptimizationService'


const STATUS_COLORS: Record<string, string> = {
  draft: '#94A3B8',
  published: '#3B82F6',
  in_progress: '#10B981',
  completed: '#6D28D9',
  cancelled: '#EF4444',
  full: '#F59E0B',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  published: '🟢 Live',
  in_progress: '🚀 Active',
  completed: '✅ Done',
  cancelled: '❌ Cancelled',
  full: '🔴 Full',
}

export default function DriverHomeScreen() {
  const { theme, isDark } = useTheme()
  const [availabilityData, setAvailabilityData] = useState<AvailabilityStateData>(
    AvailabilityService.getStateData()
  )
  const [blockedReasons, setBlockedReasons] = useState<BlockingReason[]>([])
  const [showBlockedModal, setShowBlockedModal] = useState(false)
  const [showBatteryModal, setShowBatteryModal] = useState(false)
  const [showDevSheet, setShowDevSheet] = useState(false)
  const [showRideDevSheet, setShowRideDevSheet] = useState(false)
  const [showVehicleSwitchModal, setShowVehicleSwitchModal] = useState(false)
  const [showDestinationModal, setShowDestinationModal] = useState(false)
  const [showSafetyToolkit, setShowSafetyToolkit] = useState(false)
  const [showReportIncident, setShowReportIncident] = useState(false)
  const [showTrustedContacts, setShowTrustedContacts] = useState(false)
  const [destinationStatus, setDestinationStatus] = useState<DestinationModeStatusData | null>(null)
  const [vehicles, setVehicles] = useState<DriverVehicle[]>([])
  const [aiInsights, setAiInsights] = useState<DriverAIInsights | null>(null)
  const [showBestZonesModal, setShowBestZonesModal] = useState(false)
  const [showAIDevSheet, setShowAIDevSheet] = useState(false)
  const [showAICopilotModal, setShowAICopilotModal] = useState(false)
  const [showPendingModal, setShowPendingModal] = useState(false)

  const [trips, setTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Dynamic Driver stats
  const [stats, setStats] = useState({
    rating: 4.85,
    tripsToday: 0,
    distanceKm: 0,
    earningsToday: 0,
  })

  const [radarCount, setRadarCount] = useState<number>(0)
  const [coverageLabel, setCoverageLabel] = useState<string>('All City Mode')

  const { connected, incomingRequest, setIncomingRequest, clearRequest } = useDriverSocket()

  // Subscribe to reactive availability store
  useEffect(() => {
    const unsub = AvailabilityService.subscribe(data => {
      setAvailabilityData(data)
    })
    return unsub
  }, [])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [tripsRes, statsRes, vehList, destRes, aiRes, radarCntRes, covRes, pendingOffers] = await Promise.allSettled([
        api.get('/matching/trips/my-trips'),
        api.get('/driver/stats'),
        VehicleService.getVehicles(),
        DestinationModeService.getStatus(),
        AISmartDriverService.getDriverAIInsights(),
        CoverageService.getRadarCount(),
        CoverageService.getDriverCoverage(),
        RideRequestService.fetchPendingOffers(),
      ])

      if (pendingOffers.status === 'fulfilled' && Array.isArray(pendingOffers.value) && pendingOffers.value.length > 0) {
        setIncomingRequest(pendingOffers.value[0])
      }

      if (tripsRes.status === 'fulfilled') {
        setTrips(tripsRes.value.data?.data || [])
      }

      if (statsRes.status === 'fulfilled') {
        const d = statsRes.value.data?.data || statsRes.value.data || {}
        setStats({
          rating: d.rating ?? 4.85,
          tripsToday: d.trips_today ?? 0,
          distanceKm: d.distance_km_today ?? 0,
          earningsToday: d.earnings_today ?? 0,
        })
      }

      if (vehList.status === 'fulfilled') {
        setVehicles(vehList.value.filter(v => v.status !== 'REMOVED'))
      }

      if (destRes.status === 'fulfilled') {
        setDestinationStatus(destRes.value)
      }

      if (aiRes.status === 'fulfilled') {
        setAiInsights(aiRes.value)
      }

      if (radarCntRes.status === 'fulfilled') {
        setRadarCount(radarCntRes.value)
      }

      if (covRes.status === 'fulfilled') {
        const cov = covRes.value
        if (cov?.visibility_mode === 'all_city') {
          setCoverageLabel('All City Coverage')
        } else if (cov?.visibility_mode === 'specific_city') {
          const selected = (cov?.covered_cities || []).filter((c: any) => c?.is_selected).map((c: any) => c?.name).join(', ')
          setCoverageLabel(`Specific City: ${selected || 'Selected Cities'}`)
        } else if (cov?.visibility_mode === 'specific_hex') {
          setCoverageLabel('Specific Hex / Zone')
        }
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // REMOVED: 5-second polling interval.
  // Polling was wrong architecture:
  //   - Only works when home screen is mounted (breaks on navigation, background, killed)
  //   - Creates race conditions with socket events and reconciliation
  // Replaced by:
  //   1. Socket events (RIDE_REQUEST_NEW) update RideQueueService in real-time
  //   2. App resume → DriverLifecycleService → debounced reconcileStateWithBackend()
  //   3. Notification tap → verify backend → RideQueueService.reconcileWithBackend()


  const handleTurnOffDestination = async () => {
    try {
      await DestinationModeService.setDestinationMode({ turn_off: true })
      const updated = await DestinationModeService.getStatus()
      setDestinationStatus(updated)
    } catch { }
  }

  const handleOnlineToggle = async () => {
    if (availabilityData.state === 'ONLINE') {
      // Prompt before going offline + active trip protection
      Alert.alert(
        'Go Offline?',
        'You will stop receiving nearby ride requests and intercity matches.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Go Offline',
            style: 'destructive',
            onPress: async () => {
              try {
                await AvailabilityService.goOffline()
              } catch (err: any) {
                Alert.alert('Cannot Go Offline', err.message)
              }
            },
          },
        ]
      )
    } else {
      try {
        const res = await AvailabilityService.goOnline()
        if (!res.success && res.reasons && res.reasons.length > 0) {
          setBlockedReasons(res.reasons)
          setShowBlockedModal(true)
        } else {
          // Check background battery & location readiness
          const readiness = await BatteryOptimizationService.checkBackgroundReadiness()
          if (!readiness.batteryConfigured || !readiness.backgroundLocationGranted) {
            setShowBatteryModal(true)
          }
        }
      } catch (err: any) {
        Alert.alert('Error', err.message)
      }
    }
  }

  const doTripAction = async (tripId: string, action: 'publish' | 'start' | 'complete') => {
    setActionLoading(tripId + action)
    try {
      await api.post(`/trips/${tripId}/${action}`, {})
      await loadData()
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  const activeTrips = trips.filter(t => ['published', 'in_progress'].includes(t.status))
  const pastTrips = trips.filter(t => ['completed', 'cancelled'].includes(t.status)).slice(0, 3)

  const isOnline = availabilityData.state === 'ONLINE' || availabilityData.state === 'GOING_ONLINE'

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* ⚡ Socket Reconnecting Banner — shown only when driver is ONLINE but disconnected */}
      {isOnline && !connected && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9998,
          backgroundColor: '#92400E', paddingVertical: 6, paddingHorizontal: 16,
          flexDirection: 'row', alignItems: 'center', gap: 8,
        }}>
          <MaterialCommunityIcons name="wifi-off" size={14} color="#FEF3C7" />
          <Text style={{ color: '#FEF3C7', fontSize: 12, fontWeight: '600', flex: 1 }}>
            Reconnecting to server… Ride requests paused.
          </Text>
          <ActivityIndicator size="small" color="#FEF3C7" />
        </View>
      )}

      {/* Incoming Request Overlay */}
      {incomingRequest && (
        <IncomingRequestScreen request={incomingRequest} onDismiss={clearRequest} />
      )}

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              loadData()
            }}
            tintColor={theme.colors.primary}
          />
        }
      >
        <SafeAreaView edges={['top']}>
          {/* Top Status Token Strip */}
          <AvailabilityStatusBanner
            data={availabilityData}
            onPressDiagnostics={() => setShowDevSheet(true)}
            onPressVehicle={() => setShowVehicleSwitchModal(true)}
          />

          {/* Primary Hero Availability Toggle */}
          <AvailabilityToggle
            state={availabilityData.state}
            onToggle={handleOnlineToggle}
          />

          {/* Feature 23: Driver Fatigue Break Advisory */}
          <DriverFatigueBanner
            fatigue={aiInsights?.fatigue_summary || null}
            onAcknowledgeBreak={async () => {
              await AISmartDriverService.acknowledgeBreak()
              await loadData()
            }}
          />

          {/* Feature 23: AI Opportunity & Insights Banner */}
          <AIOpportunityBanner
            insights={aiInsights}
            onPressViewZones={() => setShowBestZonesModal(true)}
            onPressDevSim={() => setShowAIDevSheet(true)}
          />

          {/* Feature 20: Active Destination Mode Banner */}
          <DestinationActiveBanner
            status={destinationStatus}
            onOpenEdit={() => setShowDestinationModal(true)}
            onTurnOff={handleTurnOffDestination}
          />

          {/* Driver Quick Utilities Row (Destination Mode + Safety Toolkit) */}
          <View style={styles.quickUtilsRow}>
            <TouchableOpacity
              style={[
                styles.quickUtilChip,
                { backgroundColor: destinationStatus?.is_active ? '#D1FAE5' : (isDark ? '#1F2937' : '#F1F5F9') },
              ]}
              onPress={() => setShowDestinationModal(true)}
            >
              <Ionicons
                name="navigate"
                size={16}
                color={destinationStatus?.is_active ? '#059669' : '#0284C7'}
              />
              <Text
                style={[
                  styles.quickUtilText,
                  { color: destinationStatus?.is_active ? '#065F46' : (isDark ? '#F8FAFC' : '#0F172A') },
                ]}
              >
                {destinationStatus?.is_active ? 'Destination Active' : 'Destination Mode'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickUtilChip, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9' }]}
              onPress={() => setShowSafetyToolkit(true)}
            >
              <Ionicons name="shield-checkmark" size={16} color="#0284C7" />
              <Text style={[styles.quickUtilText, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                Safety Toolkit
              </Text>
            </TouchableOpacity>
          </View>

          {/* Pending Requests in My Area Button & Card */}
          <TouchableOpacity
            style={[
              styles.radarCard,
              {
                backgroundColor: isDark ? '#111827' : '#FFFFFF',
                borderColor: isDark ? 'rgba(2,132,199,0.4)' : 'rgba(2,132,199,0.25)',
              },
            ]}
            onPress={() => setShowPendingModal(true)}
            activeOpacity={0.8}
          >
            <View style={[styles.radarIconWrap, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="people" size={24} color="#0284C7" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.radarTitle, { color: theme.colors.text }]}>
                  Pending Requests in My Area
                </Text>
                <View style={[styles.livePulseDot, { backgroundColor: '#0284C7' }]} />
              </View>
              <Text style={[styles.radarSub, { color: theme.colors.textSecondary }]}>
                {availabilityData.currentZone || 'My Area'} • Unassigned riders (&gt;5m) • Tap to Accept
              </Text>
            </View>
            <View style={[styles.openRadarBtn, { backgroundColor: '#E0F2FE' }]}>
              <Text style={[styles.openRadarBtnText, { color: '#0284C7' }]}>VIEW POOL</Text>
              <Feather name="chevron-right" size={14} color="#0284C7" />
            </View>
          </TouchableOpacity>

          {/* Daily Earnings & Key Metrics Card */}
          <View
            style={[
              styles.earningsCard,
              {
                backgroundColor: isDark ? '#111827' : '#FFFFFF',
                borderColor: isDark ? '#1F2937' : '#E2E8F0',
              },
            ]}
          >
            <View style={styles.earningsTop}>
              <View>
                <Text style={[styles.earningsLabel, { color: theme.colors.textSecondary }]}>
                  Today's Earnings
                </Text>
                <Text style={[styles.earningsValue, { color: theme.colors.text }]}>
                  ₹{stats.earningsToday || activeTrips.reduce((s, t) => s + (t.base_fare || 0), 0) || 0}
                </Text>
              </View>
              <View style={styles.trendBadge}>
                <Feather name="trending-up" size={14} color="#10B981" />
                <Text style={styles.trendText}>+18.4%</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.quickStatsRow}>
              <View style={styles.quickStatItem}>
                <Text style={[styles.qsNum, { color: theme.colors.text }]}>{stats.tripsToday}</Text>
                <Text style={[styles.qsLabel, { color: theme.colors.textSecondary }]}>Trips Done</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.quickStatItem}>
                <Text style={[styles.qsNum, { color: theme.colors.text }]}>{stats.distanceKm} km</Text>
                <Text style={[styles.qsLabel, { color: theme.colors.textSecondary }]}>Distance</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.quickStatItem}>
                <Text style={[styles.qsNum, { color: '#F59E0B' }]}>★ {(Number(stats.rating) || 4.85).toFixed(1)}</Text>
                <Text style={[styles.qsLabel, { color: theme.colors.textSecondary }]}>Rating</Text>
              </View>
            </View>
          </View>

          {/* Active / Published Trip Banner */}
          {activeTrips.length > 0 && (() => {
            const currentTrip = activeTrips[0]
            const isPub = currentTrip.status === 'published'
            const totalSeats = currentTrip.total_seats || 7
            const bookedSeats = currentTrip.booked_seats || currentTrip.accepted_members || 0
            const isFull = bookedSeats >= totalSeats

            return (
              <View style={styles.requestCardWrapper}>
                <LinearGradient
                  colors={
                    isPub
                      ? ['#059669', '#0284C7', '#6366F1']
                      : ['#06B6D4', '#3B82F6', '#8B5CF6']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View
                  style={[
                    styles.requestCardInner,
                    { backgroundColor: isDark ? '#111827' : '#FFFFFF' },
                  ]}
                >
                  <View style={styles.requestDetails}>
                    {/* Header Row */}
                    <View style={styles.activeTripHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialCommunityIcons
                          name={isPub ? 'car-clock' : 'car-connected'}
                          size={18}
                          color={isPub ? '#10B981' : '#0EA5E9'}
                        />
                        <Text style={[styles.requestTitle, { color: theme.colors.text }]}>
                          {isPub
                            ? '🚕 Latest Created Trip'
                            : `Active Transit #${String(currentTrip.id || '').slice(0, 6)}`}
                        </Text>
                      </View>
                      <View style={styles.livePulseDot} />
                    </View>

                    {/* Route */}
                    <Text style={[styles.requestMeta, { color: theme.colors.textSecondary, marginTop: 4 }]}>
                      Route: <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{currentTrip.pickup_city || 'Origin'} → {currentTrip.destination_city || 'Destination'}</Text>
                    </Text>

                    {/* Member Occupancy Badge */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <Text style={[styles.requestMeta, { color: theme.colors.textSecondary }]}>
                        Fare: <Text style={{ color: '#10B981', fontWeight: '800' }}>₹{currentTrip.base_fare}/seat</Text>
                      </Text>
                      <View style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 8,
                        backgroundColor: isFull ? '#FEE2E2' : '#DCFCE7',
                      }}>
                        <Text style={{
                          fontSize: 11,
                          fontWeight: '800',
                          color: isFull ? '#DC2626' : '#15803D',
                        }}>
                          {bookedSeats}/{totalSeats} Members {isFull ? '(🔴 Cab Full)' : '(🟢 Seats Open)'}
                        </Text>
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                      {isPub ? (
                        <>
                          <TouchableOpacity
                            style={[styles.requestAcceptBtn, { flex: 1, backgroundColor: '#10B981' }]}
                            onPress={() => doTripAction(currentTrip.id, 'start')}
                            activeOpacity={0.85}
                          >
                            {actionLoading === currentTrip.id + 'start' ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <Text style={styles.requestAcceptText}>▶ Start Trip</Text>
                            )}
                          </TouchableOpacity>
                        </>
                      ) : (
                        <>
                          <TouchableOpacity
                            style={[styles.requestAcceptBtn, { flex: 1, backgroundColor: '#0EA5E9' }]}
                            onPress={() => router.push({ pathname: '/active-trip', params: { bookingId: currentTrip.id } })}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.requestAcceptText}>🗺️ Open Map</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.requestAcceptBtn, { flex: 1, backgroundColor: '#6D28D9' }]}
                            onPress={() => doTripAction(currentTrip.id, 'complete')}
                            activeOpacity={0.85}
                          >
                            {actionLoading === currentTrip.id + 'complete' ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <Text style={styles.requestAcceptText}>✅ Complete</Text>
                            )}
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            )
          })()}

          {/* Create Intercity Trip CTA */}
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => router.push('/create-trip' as any)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#0EA5E9', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.createBtnGradient}
            >
              <MaterialCommunityIcons name="plus-circle" size={24} color="#FFFFFF" />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.createBtnText}>Publish Intercity Trip</Text>
                <Text style={styles.createBtnSub}>Post empty seats & accept passengers</Text>
              </View>
              <Feather name="arrow-right" size={20} color="rgba(255,255,255,0.7)" style={{ marginLeft: 'auto' }} />
            </LinearGradient>
          </TouchableOpacity>

          {/* My Published Trips — quick access to trip management */}
          <TouchableOpacity
            style={[styles.createBtn, { marginTop: 8 }]}
            onPress={() => router.push('/my-trips' as any)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#059669', '#0D9488']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.createBtnGradient}
            >
              <MaterialCommunityIcons name="format-list-bulleted" size={24} color="#FFFFFF" />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.createBtnText}>My Published Trips</Text>
                <Text style={styles.createBtnSub}>Manage recurring trips & passengers</Text>
              </View>
              <Feather name="arrow-right" size={20} color="rgba(255,255,255,0.7)" style={{ marginLeft: 'auto' }} />
            </LinearGradient>
          </TouchableOpacity>

          {/* Recent Trips Section */}
          <View style={styles.recentSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Activity</Text>
            {loading ? (
              <ActivityIndicator color="#0EA5E9" style={{ margin: 20 }} />
            ) : pastTrips.length === 0 ? (
              <View style={styles.emptyTrips}>
                <Text style={[styles.emptyTripsText, { color: theme.colors.textSecondary }]}>
                  No recent trips completed today.
                </Text>
              </View>
            ) : (
              pastTrips.map(trip => (
                <TouchableOpacity
                  key={trip.id}
                  style={[
                    styles.pastTripCard,
                    {
                      backgroundColor: isDark ? '#111827' : '#FFFFFF',
                      borderColor: isDark ? '#1F2937' : '#E2E8F0',
                    },
                  ]}
                  onPress={() => {
                    if (trip.status === 'published') {
                      router.push({
                        pathname: '/trip-live',
                        params: {
                          tripId: trip.id,
                          from: trip.pickup_city,
                          to: trip.destination_city,
                          totalSeats: (trip.total_seats || 4).toString(),
                        },
                      })
                    } else if (trip.status === 'in_progress') {
                      router.push({ pathname: '/active-trip', params: { bookingId: trip.id } })
                    } else {
                      router.push(`/history/${trip.id}` as any)
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.pastTripDot, { backgroundColor: STATUS_COLORS[trip.status] || '#10B981' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pastTripRoute, { color: theme.colors.text }]}>
                      {trip.pickup_city || 'Origin'} → {trip.destination_city || 'Destination'}
                    </Text>
                    <Text style={[styles.pastTripMeta, { color: theme.colors.textSecondary }]}>
                      {(() => {
                        try {
                          return trip.departure_time ? new Date(trip.departure_time).toLocaleDateString('en-IN') : 'Today'
                        } catch {
                          return 'Today'
                        }
                      })()} · ₹{trip.base_fare ?? 0}/seat
                    </Text>
                  </View>
                  <Text style={[styles.pastTripStatus, { color: STATUS_COLORS[trip.status] || '#10B981' }]}>
                    {STATUS_LABELS[trip.status] || trip.status}
                  </Text>
                  <Feather name="chevron-right" size={16} color={theme.colors.textSecondary} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Developer Mode Floating Diagnostics Bar */}
          {__DEV__ && (
            <View style={styles.devBarWrap}>
              <TouchableOpacity
                style={styles.devBarBtn}
                onPress={() => setShowDevSheet(true)}
              >
                <Ionicons name="hardware-chip-outline" size={16} color="#F59E0B" />
                <Text style={styles.devBarText}>
                  Availability Diagnostics
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.devBarBtn, { backgroundColor: 'rgba(2,132,199,0.12)', marginTop: 8 }]}
                onPress={() => setShowRideDevSheet(true)}
              >
                <MaterialCommunityIcons name="car-connected" size={16} color="#0284C7" />
                <Text style={[styles.devBarText, { color: '#0284C7' }]}>
                  🚕 Ride Request Simulators (14 Scenarios)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.devBarBtn, { backgroundColor: 'rgba(99, 102, 241, 0.15)', marginTop: 8 }]}
                onPress={() => setShowAIDevSheet(true)}
              >
                <MaterialCommunityIcons name="robot-outline" size={16} color="#6366F1" />
                <Text style={[styles.devBarText, { color: '#6366F1' }]}>
                  🤖 AI Sandbox Controls (Feature 23)
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </ScrollView>

      {/* Online Blocked Action Modal */}
      <OnlineBlockedModal
        visible={showBlockedModal}
        reasons={blockedReasons}
        onClose={() => setShowBlockedModal(false)}
      />

      {/* Developer Diagnostics Sheet */}
      <AvailabilityDevSheet
        visible={showDevSheet}
        data={availabilityData}
        onClose={() => setShowDevSheet(false)}
      />

      {/* Feature 5 Ride Request Developer Simulator Sheet */}
      <RideRequestDevSheet
        visible={showRideDevSheet}
        onClose={() => setShowRideDevSheet(false)}
        onSimulateOffer={simOffer => {
          setIncomingRequest(simOffer as any)
        }}
        onSimulateStateChange={simState => {
          if (simState === 'DISMISSED') {
            clearRequest()
          } else if (incomingRequest) {
            setIncomingRequest({ ...incomingRequest, simState } as any)
          }
        }}
        onSimulateSocketToggle={isConnected => {
          console.log('[DevSimulator] Socket toggle:', isConnected)
        }}
      />

      {/* Feature 23: Best Zones Opportunity Modal */}
      <BestZonesListModal
        visible={showBestZonesModal}
        onClose={() => setShowBestZonesModal(false)}
        zones={aiInsights?.nearby_opportunity_zones || []}
        onSelectZone={zone => {
          Alert.alert('Drive Towards Zone', `Route guidance active towards ${zone.zone_name}. Look out for incoming surge rides!`)
        }}
      />

      {/* Feature 23: AI Developer Sandbox Sheet */}
      <AIDevSheet
        visible={showAIDevSheet}
        onClose={() => setShowAIDevSheet(false)}
        onSelectScenario={async key => {
          await AISmartDriverService.simulateDevScenario(key)
          await loadData()
        }}
      />

      {/* Active Vehicle Fast Switcher */}
      <ActiveVehicleSelector
        visible={showVehicleSwitchModal}
        vehicles={vehicles}
        onClose={() => setShowVehicleSwitchModal(false)}
        onSwitched={newVeh => {
          AvailabilityService.checkEligibility()
        }}
      />

      {/* Feature 20: Destination Mode Modal */}
      <DestinationModeModal
        visible={showDestinationModal}
        onClose={() => setShowDestinationModal(false)}
        onModeUpdated={st => setDestinationStatus(st)}
      />

      {/* Feature 22: Driver Safety Toolkit Modal */}
      <DriverSafetyToolkitModal
        visible={showSafetyToolkit}
        onClose={() => setShowSafetyToolkit(false)}
        onOpenTrustedContacts={() => setShowTrustedContacts(true)}
        onOpenReportIncident={() => setShowReportIncident(true)}
      />

      {/* Feature 22: Report Safety Incident Modal */}
      <ReportIncidentModal
        visible={showReportIncident}
        onClose={() => setShowReportIncident(false)}
      />

      {/* Feature 22: Trusted Contacts Sheet */}
      <TrustedContactsSheet
        visible={showTrustedContacts}
        onClose={() => setShowTrustedContacts(false)}
      />

      {/* OpenRouter AI Driver Copilot Modal */}
      <AICopilotModal
        visible={showAICopilotModal}
        onClose={() => setShowAICopilotModal(false)}
        driverStats={{
          rating: stats.rating,
          trips_today: stats.tripsToday,
          earnings_today: stats.earningsToday,
          city: availabilityData.currentCity || availabilityData.currentZone || 'Pune',
        }}
      />

      {/* Feature: Pending Requests in My Area Modal */}
      <PendingRequestsModal
        visible={showPendingModal}
        onClose={() => setShowPendingModal(false)}
        driverLat={availabilityData.lat || 18.5204}
        driverLng={availabilityData.lng || 73.8567}
      />

      {/* Battery Optimization & Background Execution Modal */}
      <BatteryOptimizationModal
        visible={showBatteryModal}
        onDismiss={() => setShowBatteryModal(false)}
        onConfigured={() => setShowBatteryModal(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16 },
  quickUtilsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 4,
  },
  quickUtilChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  quickUtilText: {
    fontSize: 12,
    fontWeight: '700',
  },
  earningsCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginVertical: 10,
  },
  earningsTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  earningsLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  earningsValue: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 2,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 14,
  },
  quickStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  quickStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  qsNum: {
    fontSize: 15,
    fontWeight: '800',
  },
  qsLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  requestCardWrapper: {
    borderRadius: 16,
    padding: 1.5,
    marginVertical: 10,
  },
  requestCardInner: {
    borderRadius: 15,
    padding: 16,
  },
  requestDetails: {
    flex: 1,
  },
  activeTripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  requestTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  requestMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  requestAcceptBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestAcceptText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  createBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginVertical: 8,
  },
  createBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  createBtnSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  recentSection: {
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  emptyTrips: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyTripsText: {
    fontSize: 12,
  },
  pastTripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  pastTripDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pastTripRoute: {
    fontSize: 13,
    fontWeight: '700',
  },
  pastTripMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  pastTripStatus: {
    fontSize: 11,
    fontWeight: '700',
  },
  devBarWrap: {
    marginTop: 20,
    alignItems: 'center',
  },
  devBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  devBarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
  },
  radarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 10,
  },
  radarIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  radarPulseOuter: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#10B981',
    opacity: 0.4,
  },
  radarTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  radarSub: {
    fontSize: 11,
    marginTop: 2,
  },
  openRadarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(2,132,199,0.08)',
    gap: 2,
  },
  openRadarBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
  },
})


