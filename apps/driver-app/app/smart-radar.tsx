/**
 * Smart Ride Radar Screen — Feature 6 (Approved Light Mode with Dark Mode support)
 * Interactive multi-offer discovery, filtering, multi-selection interest, and atomic matching.
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform,
  Alert,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps'
import { useTheme } from '../src/theme'
import { SmartRadarCandidate, SmartRadarFilterType } from '../src/types/smartRadar'
import { SmartRadarService } from '../src/services/smartRadarService'
import { RadarFilterPills } from '../src/components/radar/RadarFilterPills'
import { SmartRadarCard } from '../src/components/radar/SmartRadarCard'
import { SmartRadarDevSheet } from '../src/components/radar/SmartRadarDevSheet'

import { DestinationModeStatusData } from '../src/types/destinationMode'
import { DestinationModeService } from '../src/services/destinationModeService'
import { DestinationActiveBanner } from '../src/components/destination/DestinationActiveBanner'
import { DestinationModeModal } from '../src/components/destination/DestinationModeModal'

export default function SmartRadarScreen() {
  const { theme, isDark } = useTheme()
  const [candidates, setCandidates] = useState<SmartRadarCandidate[]>([])
  const [selectedRideIds, setSelectedRideIds] = useState<string[]>([])
  const [activeFilter, setActiveFilter] = useState<SmartRadarFilterType>('all')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [matching, setMatching] = useState(false)
  const [showDevSheet, setShowDevSheet] = useState(false)
  const [showDestinationModal, setShowDestinationModal] = useState(false)
  const [destinationStatus, setDestinationStatus] = useState<DestinationModeStatusData | null>(null)
  const [matchedRide, setMatchedRide] = useState<SmartRadarCandidate | null>(null)
  const [mapError, setMapError] = useState(false)

  const loadData = useCallback(async (filter: SmartRadarFilterType = 'all') => {
    try {
      setLoading(true)
      const [data, destData] = await Promise.all([
        SmartRadarService.getCandidates(filter),
        DestinationModeService.getStatus(),
      ])
      setCandidates(data)
      setDestinationStatus(destData)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData(activeFilter)
  }, [loadData, activeFilter])

  const handleFilterChange = (filter: SmartRadarFilterType) => {
    setActiveFilter(filter)
    setSelectedRideIds([])
  }

  const handleToggleSelect = (rideId: string) => {
    setSelectedRideIds(prev =>
      prev.includes(rideId) ? prev.filter(id => id !== rideId) : [...prev, rideId]
    )
  }

  const handleMatchSubmit = async () => {
    if (selectedRideIds.length === 0) return
    setMatching(true)

    try {
      const result = await SmartRadarService.submitMatchRequest(selectedRideIds)
      if (result.status === 'matched') {
        const winningRide = candidates.find(c => c.ride_id === result.matched_ride_id) || candidates[0]
        setMatchedRide(winningRide)
      } else {
        Alert.alert(
          'Not Matched This Time',
          result.message || 'The selected ride was assigned to a closer driver.',
          [{ text: 'Refresh Radar', onPress: () => loadData(activeFilter) }]
        )
      }
    } catch (err: any) {
      Alert.alert('Match Request Failed', err.message || 'Could not connect to matching engine.')
    } finally {
      setMatching(false)
    }
  }

  const handleTurnOffDestination = async () => {
    try {
      await DestinationModeService.setDestinationMode({ turn_off: true })
      const updated = await DestinationModeService.getStatus()
      setDestinationStatus(updated)
      loadData(activeFilter)
    } catch (err) {}
  }

  // Filter Counts
  const counts: Record<SmartRadarFilterType, number> = {
    all: candidates.length,
    recommended: candidates.filter(c => c.smart_score >= 85).length,
    best_earnings: candidates.filter(c => c.classification.earning_class === 'HIGH_EARNING').length,
    closest: candidates.filter(c => c.pickup_distance_km <= 2.5).length,
    airport: candidates.filter(c => c.classification.trip_type === 'AIRPORT').length,
  }

  const bgRoot = isDark ? '#090C15' : '#F8FAFC'
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A'
  const textSecondary = isDark ? '#94A3B8' : '#64748B'

  return (
    <View style={[styles.root, { backgroundColor: bgRoot }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <SafeAreaView edges={['top']} style={styles.safeTop}>
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.headerTitle, { color: textPrimary }]}>
                Smart Ride Radar
              </Text>
              <MaterialCommunityIcons name="radar" size={18} color="#0284C7" />
            </View>
            <Text style={[styles.headerSub, { color: textSecondary }]}>
              {candidates.length} trips match your preferences
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[styles.prefIconBtn, { backgroundColor: destinationStatus?.is_active ? '#D1FAE5' : (isDark ? '#1E293B' : '#F1F5F9') }]}
              onPress={() => setShowDestinationModal(true)}
            >
              <Ionicons name="navigate" size={18} color={destinationStatus?.is_active ? '#059669' : '#0284C7'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.prefIconBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
              onPress={() => router.push('/settings/preferences' as any)}
            >
              <Feather name="sliders" size={18} color="#0284C7" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Feature 20: Active Destination Mode Banner */}
        <DestinationActiveBanner
          status={destinationStatus}
          onOpenEdit={() => setShowDestinationModal(true)}
          onTurnOff={handleTurnOffDestination}
        />

        {/* Filter Pills */}
        <RadarFilterPills
          selectedFilter={activeFilter}
          counts={counts}
          isDark={isDark}
          onSelect={handleFilterChange}
        />
      </SafeAreaView>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              loadData(activeFilter)
            }}
            tintColor="#0284C7"
          />
        }
      >
        {/* Map Preview with Numbered Candidate Pins */}
        <View style={[styles.mapContainer, { borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
          {!mapError ? (
            <MapView
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
              style={StyleSheet.absoluteFill}
              initialRegion={{
                latitude: candidates[0]?.pickup?.lat || 18.5362,
                longitude: candidates[0]?.pickup?.lng || 73.8939,
                latitudeDelta: 0.12,
                longitudeDelta: 0.12,
              }}
              showsUserLocation
            >
              {candidates.map((c, i) => (
                <Marker
                  key={c.ride_id}
                  coordinate={{
                    latitude: c.pickup.lat,
                    longitude: c.pickup.lng,
                  }}
                  title={`Trip #${i + 1}: ${c.pickup.address}`}
                  description={`Fare ₹${c.fare} • ${c.human_reason}`}
                  pinColor={c.classification.trip_type === 'AIRPORT' ? 'purple' : 'green'}
                />
              ))}
            </MapView>
          ) : (
            <View style={[styles.mapFallback, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
              <Feather name="map" size={24} color="#64748B" />
              <Text style={{ color: textSecondary, fontSize: 12, marginTop: 4 }}>
                Map preview active
              </Text>
            </View>
          )}
        </View>

        {/* Candidate Cards List */}
        <View style={styles.cardsList}>
          {loading ? (
            <ActivityIndicator size="large" color="#0284C7" style={{ marginTop: 40 }} />
          ) : candidates.length === 0 ? (
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="radar" size={48} color="#64748B" />
              <Text style={[styles.emptyTitle, { color: textPrimary }]}>
                No Matching Trips Right Now
              </Text>
              <Text style={[styles.emptySub, { color: textSecondary }]}>
                Try switching your driving mode to Balanced or expanding your max pickup radius.
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/settings/preferences' as any)}
              >
                <Text style={styles.emptyBtnText}>Adjust Ride Preferences</Text>
              </TouchableOpacity>
            </View>
          ) : (
            candidates.map((c, i) => (
              <SmartRadarCard
                key={c.ride_id}
                candidate={c}
                index={i}
                isSelected={selectedRideIds.includes(c.ride_id)}
                isMatching={matching}
                isDark={isDark}
                onToggleSelect={handleToggleSelect}
              />
            ))
          )}
        </View>

        {/* Developer Diagnostics Trigger in Dev Mode */}
        {__DEV__ && (
          <View style={styles.devBarWrap}>
            <TouchableOpacity
              style={styles.devBarBtn}
              onPress={() => setShowDevSheet(true)}
            >
              <Ionicons name="hardware-chip-outline" size={16} color="#F59E0B" />
              <Text style={styles.devBarText}>
                Smart Radar Simulators (14 Scenarios)
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Floating Bottom Multi-Select Action Bar */}
      {selectedRideIds.length > 0 && (
        <View
          style={[
            styles.floatingBar,
            {
              backgroundColor: isDark ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)',
              borderColor: isDark ? '#334155' : '#CBD5E1',
            },
          ]}
        >
          <View>
            <Text style={[styles.floatingCount, { color: textPrimary }]}>
              {selectedRideIds.length} {selectedRideIds.length === 1 ? 'ride' : 'rides'} selected
            </Text>
            <Text style={[styles.floatingSub, { color: textSecondary }]}>
              Requesting best fit match
            </Text>
          </View>

          <TouchableOpacity
            style={styles.findRideBtn}
            onPress={handleMatchSubmit}
            disabled={matching}
            activeOpacity={0.85}
          >
            {matching ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.findRideBtnText}>FIND MY RIDE ⚡</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Match Celebratory Confirmation Modal */}
      {matchedRide && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
              <View style={styles.modalCheckWrap}>
                <Feather name="check-circle" size={54} color="#16A34A" />
              </View>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>
                Ride Matched! 🎉
              </Text>
              <Text style={[styles.modalSub, { color: textSecondary }]}>
                {matchedRide.human_reason}
              </Text>

              <View style={[styles.modalDetailsCard, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
                <Text style={[styles.modalDetailPickup, { color: textPrimary }]} numberOfLines={1}>
                  📍 {matchedRide.pickup.address}
                </Text>
                <Text style={[styles.modalDetailDrop, { color: textSecondary }]} numberOfLines={1}>
                  Drop: {matchedRide.destination.address}
                </Text>
                <View style={styles.modalFareRow}>
                  <Text style={{ fontSize: 13, color: textSecondary }}>Estimated Earning</Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#16A34A' }}>
                    ₹{matchedRide.driver_earning}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalStartBtn}
                onPress={() => {
                  const r = matchedRide
                  setMatchedRide(null)
                  router.push({
                    pathname: '/active-trip' as any,
                    params: {
                      bookingId: r.ride_id,
                      fare: r.fare,
                      pickupAddress: r.pickup.address,
                      destinationAddress: r.destination.address,
                    },
                  })
                }}
              >
                <Text style={styles.modalStartBtnText}>START PICKUP 🚀</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Feature 20: Destination Mode Modal */}
      <DestinationModeModal
        visible={showDestinationModal}
        onClose={() => setShowDestinationModal(false)}
        onModeUpdated={st => {
          setDestinationStatus(st)
          loadData(activeFilter)
        }}
      />

      {/* Developer Mode Sheet */}
      <SmartRadarDevSheet
        visible={showDevSheet}
        onClose={() => setShowDevSheet(false)}
        onInjectCandidate={cand => {
          setCandidates(prev => [cand, ...prev])
        }}
        onSimulateMatchOutcome={won => {
          if (won) {
            setMatchedRide(candidates[0] || null)
          } else {
            Alert.alert('Match Loss Simulated', 'Trip was claimed by closer driver.')
          }
        }}
        onSimulateModeChange={mode => {
          Alert.alert('Mode Switched', `Driving focus switched to: ${mode}`)
          loadData(activeFilter)
        }}
        onReset={() => {
          loadData(activeFilter)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeTop: { zIndex: 10 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    padding: 6,
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 11,
    marginTop: 1,
  },
  prefIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  mapContainer: {
    height: 170,
    marginHorizontal: 16,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 14,
  },
  mapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardsList: {
    paddingHorizontal: 16,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  emptyBtn: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0284C7',
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  floatingBar: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingCount: {
    fontSize: 14,
    fontWeight: '800',
  },
  floatingSub: {
    fontSize: 11,
  },
  findRideBtn: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  findRideBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalCheckWrap: {
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 16,
  },
  modalDetailsCard: {
    width: '100%',
    padding: 14,
    borderRadius: 14,
    marginBottom: 20,
  },
  modalDetailPickup: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalDetailDrop: {
    fontSize: 12,
    marginTop: 4,
  },
  modalFareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  modalStartBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#0284C7',
    alignItems: 'center',
  },
  modalStartBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
})
