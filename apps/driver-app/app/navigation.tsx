/**
 * Turn-by-Turn Navigation Screen
 * ─────────────────────────────────────────────────────────────
 * Full-screen Google Maps navigation with:
 *  - Live driver position + heading (camera follow)
 *  - Route polyline
 *  - Turn-by-turn instruction cards
 *  - Speed alert overlay
 *  - Night mode toggle
 *  - Voice navigation via expo-speech
 *  - SOS button
 *  - ETA + distance HUD
 */
import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, Dimensions, SafeAreaView,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Feather, Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import MapView from 'react-native-maps'

import { DriverMap }     from '../src/components/map/DriverMap'
import { SpeedAlert }    from '../src/components/map/SpeedAlert'
import { SOSButton }     from '../src/components/map/SOSButton'
import { EarningsPanel } from '../src/components/map/EarningsPanel'
import { useLiveLocation } from '../src/hooks/useLiveLocation'
import { useGoogleDirections } from '../src/hooks/useGoogleDirections'
import { useDriverSocket } from '../src/hooks/useDriverSocket'
import { formatETA } from '../src/services/googleMaps'
import { useMapStore } from '../src/store/mapStore'

const { width } = Dimensions.get('window')

export default function NavigationScreen() {
  const params      = useLocalSearchParams()
  const fromCity    = (params.from as string) || ''
  const toCity      = (params.to   as string) || ''
  const tripId      = (params.trip_id as string) || ''
  const grossFare   = parseFloat((params.fare as string) || '0')
  const vehicleType = (params.vehicle as string) || 'sedan'

  const mapRef = useRef<MapView>(null)

  // Map settings
  const { nightMode, trafficEnabled, setNightMode, toggleTraffic } = useMapStore()

  // Live GPS
  const { location, startTracking, stopTracking } = useLiveLocation(true)

  // Directions
  const { route, tollSummary, fuelEstimate, isLoading } = useGoogleDirections(
    fromCity, toCity, [], vehicleType
  )

  // WebSocket
  const { sendLocationUpdate, emitSOS, emitTripCompleted } = useDriverSocket()

  // Navigation state
  const [currentStepIndex, setStepIndex] = useState(0)
  const [voiceEnabled, setVoiceEnabled]  = useState(true)
  const [followMode, setFollowMode]      = useState(true)

  const currentStep = route?.steps[currentStepIndex]
  const etaText     = route ? formatETA(route.etaTimestamp) : '--'

  // Emit LOCATION_UPDATE every time GPS updates
  useEffect(() => {
    if (!location) return
    sendLocationUpdate({
      lat:     location.lat,
      lng:     location.lng,
      speed:   location.speed,
      heading: location.heading,
      accuracy: location.accuracy,
      trip_id: tripId,
    })

    // Voice next step instruction when close enough
    if (voiceEnabled && currentStep) {
      try {
        const Speech = require('expo-speech')
        // Only speak if we just changed steps (simplified)
      } catch { /* no expo-speech */ }
    }
  }, [location])

  const handleSOS = useCallback((payload: any) => {
    emitSOS({ trip_id: tripId, lat: location?.lat ?? 0, lng: location?.lng ?? 0 })
  }, [location, tripId])

  const handleEndTrip = () => {
    emitTripCompleted(tripId)
    stopTracking()
    router.replace('/(tabs)/')
  }

  const handleNextStep = () => {
    if (route && currentStepIndex < route.steps.length - 1) {
      setStepIndex(i => i + 1)
    }
  }

  const speakInstruction = (text: string) => {
    try {
      const Speech = require('expo-speech')
      Speech.speak(text, { language: 'en-IN', rate: 1.0 })
    } catch { /* no expo-speech */ }
  }

  const maneuverIcon = (maneuver: string): string => {
    if (maneuver.includes('right')) return 'corner-down-right'
    if (maneuver.includes('left'))  return 'corner-down-left'
    if (maneuver.includes('uturn')) return 'rotate-ccw'
    if (maneuver.includes('merge')) return 'git-merge'
    return 'arrow-up'
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Full-screen Google Map */}
      <DriverMap
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        driverLat={location?.lat}
        driverLng={location?.lng}
        driverHeading={location?.heading}
        driverSpeed={location?.speed}
        polyline={route?.polyline ?? []}
        nightMode={nightMode}
        trafficEnabled={trafficEnabled}
        followDriver={followMode}
      />

      {/* Speed Alert — floating on top of map */}
      {location && (
        <View style={styles.speedAlertPos}>
          <SpeedAlert
            currentSpeed={location.speed}
            speedLimit={80}
            useVoice={voiceEnabled}
          />
        </View>
      )}

      {/* Top HUD */}
      <SafeAreaView style={styles.topHUD} pointerEvents="box-none">
        {/* Back + Route label */}
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={18} color="#fff" />
          </TouchableOpacity>

          <View style={styles.routeChip}>
            <Feather name="navigation" size={12} color="#38BDF8" />
            <Text style={styles.routeChipText} numberOfLines={1}>
              {fromCity} → {toCity}
            </Text>
          </View>

          <View style={styles.topBtnRow}>
            {/* Night Mode */}
            <TouchableOpacity
              style={[styles.iconBtn, nightMode && styles.iconBtnActive]}
              onPress={() => setNightMode(!nightMode)}
            >
              <Ionicons name={nightMode ? 'moon' : 'sunny'} size={16} color={nightMode ? '#38BDF8' : '#F59E0B'} />
            </TouchableOpacity>

            {/* Traffic */}
            <TouchableOpacity
              style={[styles.iconBtn, trafficEnabled && styles.iconBtnActive]}
              onPress={toggleTraffic}
            >
              <Feather name="alert-triangle" size={16} color={trafficEnabled ? '#EF4444' : '#94A3B8'} />
            </TouchableOpacity>

            {/* Voice */}
            <TouchableOpacity
              style={[styles.iconBtn, voiceEnabled && styles.iconBtnActive]}
              onPress={() => setVoiceEnabled(v => !v)}
            >
              <Ionicons name={voiceEnabled ? 'volume-high' : 'volume-mute'} size={16} color={voiceEnabled ? '#10B981' : '#94A3B8'} />
            </TouchableOpacity>

            {/* Follow mode */}
            <TouchableOpacity
              style={[styles.iconBtn, followMode && styles.iconBtnActive]}
              onPress={() => setFollowMode(f => !f)}
            >
              <Ionicons name="navigate-circle" size={16} color={followMode ? '#3B82F6' : '#94A3B8'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Turn-by-Turn instruction card */}
        {currentStep && (
          <TouchableOpacity style={styles.instructionCard} onPress={() => {
            speakInstruction(currentStep.instruction)
            handleNextStep()
          }}>
            <LinearGradient
              colors={nightMode
                ? ['rgba(15,23,42,0.97)', 'rgba(30,41,59,0.97)']
                : ['rgba(255,255,255,0.97)', 'rgba(248,250,252,0.97)']}
              style={styles.instructionGrad}
            >
              <View style={styles.maneuverCircle}>
                <Feather
                  name={maneuverIcon(currentStep.maneuver) as any}
                  size={22}
                  color="#3B82F6"
                />
              </View>
              <View style={styles.instructionTextCol}>
                <Text
                  style={[styles.instructionText, { color: nightMode ? '#F1F5F9' : '#0F172A' }]}
                  numberOfLines={2}
                >
                  {currentStep.instruction}
                </Text>
                <Text style={styles.instructionSub}>
                  {currentStep.distance} · {currentStep.duration}
                </Text>
              </View>
              <View style={styles.stepCountBadge}>
                <Text style={styles.stepCountText}>
                  {currentStepIndex + 1}/{route?.steps.length}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {isLoading && (
          <View style={styles.loadingChip}>
            <Text style={styles.loadingText}>Loading route...</Text>
          </View>
        )}
      </SafeAreaView>

      {/* SOS Button — right side */}
      <View style={styles.sosPos}>
        <SOSButton
          driverLat={location?.lat}
          driverLng={location?.lng}
          tripId={tripId}
          onSOS={handleSOS}
        />
      </View>

      {/* Bottom panel */}
      <View style={styles.bottom}>
        {/* Earnings HUD */}
        <EarningsPanel
          distanceKm={route?.distanceKm ?? 0}
          etaText={etaText}
          fuelCost={fuelEstimate?.fuelCost ?? 0}
          tollCost={tollSummary?.estimatedTotal ?? 0}
          grossFare={grossFare}
          nightMode={nightMode}
        />

        {/* End Trip Button */}
        <TouchableOpacity style={styles.endTripBtn} onPress={handleEndTrip}>
          <Feather name="flag" size={16} color="#fff" />
          <Text style={styles.endTripText}>End Trip</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F172A' },

  // Speed alert position
  speedAlertPos: {
    position: 'absolute',
    top: 140,
    alignSelf: 'center',
    zIndex: 50,
  },

  // Top HUD
  topHUD: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    paddingHorizontal: 12,
    paddingTop: 48,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(15,23,42,0.85)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  iconBtnActive: {
    backgroundColor: 'rgba(59,130,246,0.25)',
    borderColor: 'rgba(59,130,246,0.5)',
  },
  topBtnRow: { flexDirection: 'row', gap: 6 },
  routeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15,23,42,0.85)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.2)',
  },
  routeChipText: { color: '#CBD5E1', fontSize: 12, fontWeight: '600', flex: 1 },

  // Instruction card
  instructionCard: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  instructionGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  maneuverCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(59,130,246,0.15)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(59,130,246,0.3)',
  },
  instructionTextCol: { flex: 1 },
  instructionText: { fontSize: 15, fontWeight: '700', marginBottom: 4, lineHeight: 20 },
  instructionSub:  { color: '#64748B', fontSize: 12, fontWeight: '500' },
  stepCountBadge:  {
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  stepCountText: { color: '#3B82F6', fontSize: 11, fontWeight: '700' },
  loadingChip: {
    alignSelf: 'center', marginTop: 8,
    backgroundColor: 'rgba(15,23,42,0.85)',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
  },
  loadingText: { color: '#94A3B8', fontSize: 12 },

  // SOS position
  sosPos: {
    position: 'absolute',
    right: 16,
    bottom: 200,
    zIndex: 50,
  },

  // Bottom
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 40,
  },
  endTripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    paddingBottom: 28,
  },
  endTripText: { color: '#fff', fontSize: 16, fontWeight: '800' },
})
