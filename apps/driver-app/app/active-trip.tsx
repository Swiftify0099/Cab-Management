/**
 * Active Trip & Navigation Screen — Features 7, 8, 9, 10, 11, 12, 13 & 14
 * ────────────────────────────────────────────────────────────────────────
 * Complete Production Navigation, Verification, During-Ride,
 * Server-Authoritative Waiting, Cancellation, Trip Completion & Earnings:
 *  - Phase A: Pickup Navigation (Light Mode High Contrast)
 *  - Feature 8: Masked Phone Calling, Real-Time Chat & Pickup Assistance
 *  - Feature 9: 4-Point Verification Checklist, 4-Digit Ride PIN & Arrival Panel
 *  - Feature 10: In-Flight Navigation HUD, Multi-Stop Routing & Emergency SOS
 *  - Feature 11: Server-Authoritative Waiting Timer, Free/Paid Progress & No-Show Shield
 *  - Feature 12: Structured Two-Step Cancellation Modal & Performance Metrics
 *  - Feature 13: Authoritative Trip Completion, Final Fare & Itemized Receipt Modal
 *  - Feature 14: Double-Entry Earnings Ledger & Cash vs Online Payout Reconciliation
 */
import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps'

import { useTheme } from '../src/theme'
import { useLiveLocation } from '../src/hooks/useLiveLocation'
import { useDriverSocket } from '../src/hooks/useDriverSocket'
import { NavigationService } from '../src/services/navigationService'
import { NavigationPhase, NavigationRouteData, RoadHazardData, HazardType } from '../src/types/navigation'

import { NextManeuverHUD } from '../src/components/navigation/NextManeuverHUD'
import { HazardReportSheet } from '../src/components/navigation/HazardReportSheet'
import { HazardAlertBanner } from '../src/components/navigation/HazardAlertBanner'
import { SpeedometerHUD } from '../src/components/navigation/SpeedometerHUD'
import { RerouteAlertBanner } from '../src/components/navigation/RerouteAlertBanner'
import { NavigationDevSheet } from '../src/components/navigation/NavigationDevSheet'

// Feature 8 & 9 Components
import { MaskedCallSheet } from '../src/components/communication/MaskedCallSheet'
import { PassengerChatModal } from '../src/components/communication/PassengerChatModal'
import { PickupAssistanceSheet } from '../src/components/communication/PickupAssistanceSheet'
import { NoShowConfirmationModal } from '../src/components/communication/NoShowConfirmationModal'
import { ArrivalVerificationPanel } from '../src/components/rideStart/ArrivalVerificationPanel'

// Feature 10 Components & Services
import { AddStopModal } from '../src/components/duringRide/AddStopModal'
import { UpdateDestinationModal } from '../src/components/duringRide/UpdateDestinationModal'
import { EmergencySOSModal } from '../src/components/duringRide/EmergencySOSModal'
import { TripProgressHUD } from '../src/components/duringRide/TripProgressHUD'
import { DuringRideService } from '../src/services/duringRideService'
import { RideStopItem, DestinationUpdateResponse } from '../src/types/duringRide'

// Feature 11 & 12 Components & Services
import { WaitingCard } from '../src/components/waiting/WaitingCard'
import { CancelRideModal } from '../src/components/cancellation/CancelRideModal'
import { WaitingAndCancellationService } from '../src/services/waitingAndCancellationService'
import { WaitingStatus } from '../src/types/waitingAndCancellation'

// Feature 13 & 14 Components & Services
import { TripReceiptModal } from '../src/components/tripCompletion/TripReceiptModal'
import { TripCompletionAndEarningsService } from '../src/services/tripCompletionAndEarningsService'
import { RideReceiptData } from '../src/types/tripCompletionAndEarnings'

// Feature 20 Components & Services
import { DestinationModeService } from '../src/services/destinationModeService'

// Feature 21 Components & Services
import { NextRideOpportunityBanner } from '../src/components/backToBack/NextRideOpportunityBanner'
import { NextRideReservedHUD } from '../src/components/backToBack/NextRideReservedHUD'
import { BackToBackService } from '../src/services/backToBackService'
import { BackToBackCandidate } from '../src/types/backToBack'

// Feature 22 Components & Services
import { DriverSafetyToolkitModal } from '../src/components/safety/DriverSafetyToolkitModal'
import { SafetyAlertBanner } from '../src/components/safety/SafetyAlertBanner'
import { ReportIncidentModal } from '../src/components/safety/ReportIncidentModal'
import { TrustedContactsSheet } from '../src/components/safety/TrustedContactsSheet'
import { SafetyDevSheet } from '../src/components/safety/SafetyDevSheet'
import { DriverSafetyService } from '../src/services/driverSafetyService'
import { SafetyAlertItem, SafetyAlertType } from '../src/types/driverSafety'

export default function ActiveTripScreen() {
  const { bookingId, fare, pickupAddress, destinationAddress } = useLocalSearchParams<{
    bookingId?: string
    fare?: string
    pickupAddress?: string
    destinationAddress?: string
  }>()

  const { isDark: systemIsDark } = useTheme()
  const mapRef = useRef<MapView | null>(null)

  const [activeRideId, setActiveRideId] = useState(bookingId || 'fb6a0afb-93a7-405a-b863-4cfe3bc81998')

  // Navigation State
  const [phase, setPhase] = useState<NavigationPhase>('EN_ROUTE_PICKUP')
  const [isVoiceOn, setIsVoiceOn] = useState(true)
  const [routeData, setRouteData] = useState<NavigationRouteData | null>(null)
  const [activeHazard, setActiveHazard] = useState<RoadHazardData | null>(null)
  const [showHazardReport, setShowHazardReport] = useState(false)
  const [showDevSheet, setShowDevSheet] = useState(false)
  const [showRerouteAlert, setShowRerouteAlert] = useState(false)
  const [simulatedSpeed, setSimulatedSpeed] = useState<number | null>(null)
  const [gpsQuality, setGpsQuality] = useState<'good' | 'weak' | 'lost'>('good')
  const [loadingRoute, setLoadingRoute] = useState(true)
  const [arriving, setArriving] = useState(false)

  // Feature 8 & 9 Communication / Verification Sheets State
  const [showMaskedCall, setShowMaskedCall] = useState(false)
  const [showPassengerChat, setShowPassengerChat] = useState(false)
  const [showAssistance, setShowAssistance] = useState(false)
  const [showNoShowModal, setShowNoShowModal] = useState(false)
  const [noShowParams, setNoShowParams] = useState({
    elapsedSeconds: 0,
    distanceMeters: 24.5,
    contactAttempts: 1,
  })

  // Feature 10: During-Ride State
  const [tripSeconds, setTripSeconds] = useState(480)
  const [currentEstimatedFare, setCurrentEstimatedFare] = useState<number>(Number(fare) || 544)
  const [stops, setStops] = useState<RideStopItem[]>([])
  const [activeStop, setActiveStop] = useState<RideStopItem | null>(null)
  const [hasActiveSOS, setHasActiveSOS] = useState(false)
  const [showAddStop, setShowAddStop] = useState(false)
  const [showUpdateDestination, setShowUpdateDestination] = useState(false)
  const [showSOSModal, setShowSOSModal] = useState(false)

  // Feature 11 & 12: Waiting & Cancellation State
  const [waitingStatus, setWaitingStatus] = useState<WaitingStatus | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [loadingWaiting, setLoadingWaiting] = useState(false)

  // Feature 13 & 14: Trip Completion & Receipt State
  const [completedReceipt, setCompletedReceipt] = useState<RideReceiptData | null>(null)
  const [showReceiptModal, setShowReceiptModal] = useState(false)

  // Feature 21: Back-to-Back State
  const [nextRideOffer, setNextRideOffer] = useState<BackToBackCandidate | null>(null)
  const [reservedNextRide, setReservedNextRide] = useState<BackToBackCandidate | null>(null)
  const [reservingNextRide, setReservingNextRide] = useState(false)

  // Feature 22: Driver Safety State
  const [showSafetyToolkit, setShowSafetyToolkit] = useState(false)
  const [showReportIncident, setShowReportIncident] = useState(false)
  const [showTrustedContacts, setShowTrustedContacts] = useState(false)
  const [activeSafetyAlert, setActiveSafetyAlert] = useState<SafetyAlertItem | null>(null)
  const [resolvingAlert, setResolvingAlert] = useState(false)

  // Coordinates
  const [pickupCoord, setPickupCoord] = useState({
    lat: 18.5362,
    lng: 73.8939,
    address: pickupAddress || 'Koregaon Park North Main Rd, Pune',
  })
  const [destCoord, setDestCoord] = useState({
    lat: 18.5822,
    lng: 73.9197,
    address: destinationAddress || 'Pune Airport Terminal 2 Departure Gate',
  })

  // Socket & Live Location
  const { connected } = useDriverSocket()
  const { location } = useLiveLocation(true)

  const driverLat = location?.lat || 18.535
  const driverLng = location?.lng || 73.892
  const driverHeading = location?.heading || 45
  const driverSpeed = simulatedSpeed !== null ? simulatedSpeed : (location?.speed ? Math.round(location.speed) : 38)
  const driverAccuracy = gpsQuality === 'weak' ? 45.0 : (location?.accuracy || 8.5)

  // Night Mode for In-Trip Navigation (Feature 7 & 10 UI Requirement)
  const isDarkTheme = phase === 'EN_ROUTE_DESTINATION' || phase === 'ARRIVED_DESTINATION' || systemIsDark

  // Load Route on Phase Change
  const loadRoute = useCallback(async () => {
    setLoadingRoute(true)
    try {
      const targetLat = phase === 'EN_ROUTE_PICKUP' || phase === 'ARRIVED_PICKUP' ? pickupCoord.lat : (activeStop ? activeStop.latitude : destCoord.lat)
      const targetLng = phase === 'EN_ROUTE_PICKUP' || phase === 'ARRIVED_PICKUP' ? pickupCoord.lng : (activeStop ? activeStop.longitude : destCoord.lng)

      const route = await NavigationService.getRoute(
        driverLat,
        driverLng,
        targetLat,
        targetLng,
        activeRideId
      )
      setRouteData(route)
    } catch (err) {
      console.warn('Route load error:', err)
    } finally {
      setLoadingRoute(false)
    }
  }, [phase, driverLat, driverLng, pickupCoord.lat, pickupCoord.lng, destCoord.lat, destCoord.lng, activeStop, activeRideId])

  useEffect(() => {
    loadRoute()
  }, [phase, activeStop, destCoord])

  // Feature 11: Poll Waiting Status when Arrived at Pickup
  useEffect(() => {
    if (phase !== 'ARRIVED_PICKUP') return
    const fetchWaiting = async () => {
      const status = await WaitingAndCancellationService.getWaitingStatus(activeRideId, driverLat, driverLng)
      setWaitingStatus(status)
    }
    fetchWaiting()
    const timer = setInterval(fetchWaiting, 4000)
    return () => clearInterval(timer)
  }, [phase, activeRideId, driverLat, driverLng])

  // In-flight trip timer effect
  useEffect(() => {
    if (phase !== 'EN_ROUTE_DESTINATION') return
    const timer = setInterval(() => {
      setTripSeconds(s => s + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [phase])

  // Transmit telemetry to backend during in-progress ride
  useEffect(() => {
    if (phase !== 'EN_ROUTE_DESTINATION') return
    const telemetryTimer = setInterval(async () => {
      try {
        await DuringRideService.sendLocationTelemetry(
          activeRideId,
          driverLat,
          driverLng,
          driverSpeed,
          driverHeading,
          driverAccuracy
        )
      } catch {}
    }, 5000)
    return () => clearInterval(telemetryTimer)
  }, [phase, activeRideId, driverLat, driverLng, driverSpeed, driverHeading, driverAccuracy])

  // Check for road hazards periodically
  useEffect(() => {
    const checkHazards = async () => {
      const hazards = await NavigationService.getNearbyHazards(driverLat, driverLng, 1500)
      if (hazards.length > 0) {
        setActiveHazard(hazards[0])
      }
    }
    checkHazards()
  }, [driverLat, driverLng])

  // Animate map camera on movement
  useEffect(() => {
    if (mapRef.current && location) {
      mapRef.current.animateCamera({
        center: { latitude: driverLat, longitude: driverLng },
        pitch: 45,
        heading: driverHeading,
        altitude: 1000,
        zoom: 17,
      }, { duration: 800 })
    }
  }, [driverLat, driverLng, driverHeading, location])

  // Action: Arrived at Pickup
  const handleArrivedPickup = async () => {
    setArriving(true)
    try {
      const res = await NavigationService.verifyArrival(activeRideId, 'pickup', driverLat, driverLng)
      if (res.is_arrived) {
        setPhase('ARRIVED_PICKUP')
      }
    } catch (err: any) {
      Alert.alert('Arrival Check', err.message || 'Could not confirm pickup arrival.')
    } finally {
      setArriving(false)
    }
  }

  // Action: Ride Started via Feature 9 PIN Verification
  const handleRideStartSuccess = () => {
    setPhase('EN_ROUTE_DESTINATION')
    setTripSeconds(0)
    Alert.alert('Ride In Progress! 🚀', 'Customer verified. Drive safely to destination.')
  }

  // Feature 10: Multi-Stop Actions
  const handleStopAdded = (newStop: RideStopItem) => {
    setStops(prev => [...prev, newStop])
    if (!activeStop) {
      setActiveStop(newStop)
    }
    setCurrentEstimatedFare(prev => prev + newStop.stop_fee)
  }

  const handleArriveAtStop = async (stop: RideStopItem) => {
    setArriving(true)
    try {
      await DuringRideService.verifyStopArrival(activeRideId, stop.id, driverLat, driverLng)
      setStops(prev => prev.map(s => s.id === stop.id ? { ...s, status: 'arrived' } : s))
      setActiveStop(prev => prev ? { ...prev, status: 'arrived' } : null)
      Alert.alert('Arrived at Stop! 📍', `Arrived at ${stop.address}.`)
    } catch (err: any) {
      Alert.alert('Stop Arrival Check', err.message || 'You must be within 60m of the stop.')
    } finally {
      setArriving(false)
    }
  }

  const handleDepartFromStop = async (stop: RideStopItem) => {
    setArriving(true)
    try {
      await DuringRideService.departStop(activeRideId, stop.id)
      setStops(prev => prev.map(s => s.id === stop.id ? { ...s, status: 'completed' } : s))
      const remainingStops = stops.filter(s => s.id !== stop.id && s.status !== 'completed')
      if (remainingStops.length > 0) {
        setActiveStop(remainingStops[0])
      } else {
        setActiveStop(null)
      }
      Alert.alert('Resuming Trip 🚀', 'Departed stop. Navigating to next point.')
    } catch (err: any) {
      Alert.alert('Departure Error', err.message || 'Could not record stop departure.')
    } finally {
      setArriving(false)
    }
  }

  // Feature 10: Destination Updated Action
  const handleDestinationUpdated = (update: DestinationUpdateResponse) => {
    setDestCoord({
      lat: update.destination.lat,
      lng: update.destination.lng,
      address: update.destination.address,
    })
    setCurrentEstimatedFare(update.estimated_fare)
  }

  // Feature 11: Execute No-Show
  const handleNoShowConfirm = async () => {
    setLoadingWaiting(true)
    try {
      const res = await WaitingAndCancellationService.processNoShowCancellation(activeRideId, driverLat, driverLng)
      Alert.alert('No-Show Confirmed 🛑', res.message, [
        { text: 'Done', onPress: () => router.replace('/(tabs)/dashboard') }
      ])
    } catch (err: any) {
      Alert.alert('No-Show Error', err.message || 'Could not process No-Show.')
    } finally {
      setLoadingWaiting(false)
    }
  }

  // Feature 21: Back-to-Back Handlers
  const handleAcceptNextRide = async (candidate: BackToBackCandidate) => {
    setReservingNextRide(true)
    try {
      await BackToBackService.reserveNextRide(activeRideId, candidate.ride_id)
      setReservedNextRide(candidate)
      setNextRideOffer(null)
      Alert.alert(
        '⚡ Next Ride Reserved!',
        `Pickup at ${candidate.pickup.address} is scheduled right after your current dropoff.`
      )
    } catch (err: any) {
      Alert.alert('Reservation Failed', err.message || 'Could not reserve next ride.')
    } finally {
      setReservingNextRide(false)
    }
  }

  const handleDeclineNextRide = () => {
    setNextRideOffer(null)
  }

  // Feature 22: Safety Handlers
  const handleConfirmSafe = async () => {
    if (activeSafetyAlert?.alert_id) {
      setResolvingAlert(true)
      try {
        await DriverSafetyService.resolveSafetyAlert(activeSafetyAlert.alert_id, 'IM_SAFE')
      } catch {}
      setResolvingAlert(false)
    }
    setActiveSafetyAlert(null)
    Alert.alert('Status Confirmed 🟢', 'Thank you for letting us know you are safe.')
  }

  const handleNeedHelp = () => {
    Linking.openURL('tel:112')
  }

  // Feature 13 & 21: Complete Trip & Seamless No-Idle Next Ride Transition
  const handleCompleteTrip = async () => {
    setArriving(true)
    try {
      // 1. Authoritative Trip Completion API
      await TripCompletionAndEarningsService.completeRide(activeRideId, 0.0, 0.0, 'cash')
      
      // 2. Fetch authoritative receipt breakdown
      const receipt = await TripCompletionAndEarningsService.getRideReceipt(activeRideId)
      setCompletedReceipt(receipt)
      setShowReceiptModal(true)
      setPhase('ARRIVED_DESTINATION')
    } catch (err: any) {
      Alert.alert('Trip Completion Check', err.message || 'Could not complete trip.')
    } finally {
      setArriving(false)
    }
  }

  const handleReceiptDismissed = () => {
    setShowReceiptModal(false)
    if (reservedNextRide) {
      // Feature 21: Continuous No-Idle Transition to next pickup
      Alert.alert(
        '🚀 Transitioning to Next Pickup',
        `Navigating directly to next passenger pickup at ${reservedNextRide.pickup.address}.`,
        [
          {
            text: 'Start Next Pickup',
            onPress: () => {
              setActiveRideId(reservedNextRide.ride_id)
              setPickupCoord(reservedNextRide.pickup)
              setDestCoord({
                lat: reservedNextRide.destination.lat,
                lng: reservedNextRide.destination.lng,
                address: reservedNextRide.destination.address,
              })
              setReservedNextRide(null)
              setPhase('EN_ROUTE_PICKUP')
              loadRoute()
            },
          },
        ]
      )
    } else {
      router.replace('/(tabs)/dashboard')
    }
  }

  // Theme Styles
  const bgCard = isDarkTheme ? '#0F172A' : '#FFFFFF'
  const textPrimary = isDarkTheme ? '#F8FAFC' : '#0F172A'
  const textSecondary = isDarkTheme ? '#94A3B8' : '#64748B'

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkTheme ? '#020617' : '#F8FAFC' }]} edges={['top']}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} />

      {/* TOP FLOATING HUD: Maneuvers & Hazard Warning */}
      <View style={styles.topHUDContainer}>
        {routeData && (
          <NextManeuverHUD
            currentStep={routeData.steps && routeData.steps.length > 0 ? routeData.steps[0] : null}
            distanceMeters={routeData.steps && routeData.steps.length > 0 ? routeData.steps[0].distance_meters : 300}
            isVoiceOn={isVoiceOn}
            isDark={isDarkTheme}
            onToggleVoice={() => setIsVoiceOn(!isVoiceOn)}
          />
        )}

        <RerouteAlertBanner
          visible={showRerouteAlert}
          timeDiffMin={3}
        />

        {activeHazard && (
          <HazardAlertBanner
            hazard={activeHazard}
            onDismiss={() => setActiveHazard(null)}
          />
        )}
      </View>

      {/* FULL MAP VIEW (~70% of Screen) */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: driverLat,
            longitude: driverLng,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          }}
          showsUserLocation={false}
          showsCompass={false}
          showsTraffic={true}
          toolbarEnabled={false}
        >
          {/* Driver Vehicle Marker */}
          <Marker
            coordinate={{ latitude: driverLat, longitude: driverLng }}
            anchor={{ x: 0.5, y: 0.5 }}
            rotation={driverHeading}
          >
            <View style={styles.driverCarMarker}>
              <Ionicons name="navigate" size={26} color="#0284C7" />
            </View>
          </Marker>

          {/* Pickup / Stop / Destination Markers */}
          {phase === 'EN_ROUTE_PICKUP' || phase === 'ARRIVED_PICKUP' ? (
            <Marker coordinate={{ latitude: pickupCoord.lat, longitude: pickupCoord.lng }}>
              <View style={styles.targetMarkerPickup}>
                <Feather name="user" size={16} color="#FFFFFF" />
              </View>
            </Marker>
          ) : activeStop ? (
            <Marker coordinate={{ latitude: activeStop.latitude, longitude: activeStop.longitude }}>
              <View style={styles.targetMarkerStop}>
                <Text style={styles.stopMarkerText}>#{activeStop.sequence}</Text>
              </View>
            </Marker>
          ) : (
            <Marker coordinate={{ latitude: destCoord.lat, longitude: destCoord.lng }}>
              <View style={styles.targetMarkerDest}>
                <Feather name="flag" size={16} color="#FFFFFF" />
              </View>
            </Marker>
          )}

          {/* Hazard Marker on Map */}
          {activeHazard && (
            <Marker coordinate={{ latitude: activeHazard.latitude, longitude: activeHazard.longitude }}>
              <View style={styles.hazardMarker}>
                <MaterialCommunityIcons name="alert" size={18} color="#FFFFFF" />
              </View>
            </Marker>
          )}
        </MapView>

        {/* Floating Controls: Speedometer & Recenter & Hazard Report & Safety Toolkit & Dev Mode */}
        <View style={styles.floatingControls}>
          <SpeedometerHUD currentSpeedKmh={driverSpeed} speedLimitKmh={60} isDark={isDarkTheme} />

          <View style={styles.floatingRightCol}>
            {/* Recenter Button */}
            <TouchableOpacity
              style={[styles.floatingActionBtn, { backgroundColor: bgCard }]}
              onPress={() => {
                mapRef.current?.animateCamera({
                  center: { latitude: driverLat, longitude: driverLng },
                  zoom: 17,
                  pitch: 45,
                }, { duration: 600 })
              }}
            >
              <Feather name="crosshair" size={22} color="#0284C7" />
            </TouchableOpacity>

            {/* Feature 22: Central Safety Toolkit Button */}
            <TouchableOpacity
              style={[styles.floatingActionBtn, { backgroundColor: '#0284C7' }]}
              onPress={() => setShowSafetyToolkit(true)}
            >
              <Ionicons name="shield-checkmark" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Road Hazard Report Button */}
            <TouchableOpacity
              style={[styles.floatingActionBtn, { backgroundColor: '#F97316' }]}
              onPress={() => setShowHazardReport(true)}
            >
              <MaterialCommunityIcons name="alert-plus" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Dev Simulator Trigger */}
            <TouchableOpacity
              style={[styles.floatingActionBtn, { backgroundColor: '#475569' }]}
              onPress={() => setShowDevSheet(true)}
            >
              <Ionicons name="hardware-chip-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Feature 22: Active Safety Warning Banner */}
      {activeSafetyAlert && (
        <SafetyAlertBanner
          alertId={activeSafetyAlert.alert_id}
          alertType={activeSafetyAlert.alert_type}
          severity={activeSafetyAlert.severity}
          message={activeSafetyAlert.details?.message || 'Please confirm your safety status.'}
          resolving={resolvingAlert}
          onConfirmSafe={handleConfirmSafe}
          onNeedHelp={handleNeedHelp}
        />
      )}

      {/* Feature 21: Next Ride Opportunity Banner */}
      {nextRideOffer && (
        <NextRideOpportunityBanner
          candidate={nextRideOffer}
          loading={reservingNextRide}
          onAccept={handleAcceptNextRide}
          onDecline={handleDeclineNextRide}
        />
      )}

      {/* Feature 21: Next Ride Reserved HUD */}
      {reservedNextRide && (
        <NextRideReservedHUD
          pickupAddress={reservedNextRide.pickup.address}
          estimatedEarning={reservedNextRide.driver_earning}
          onViewDetails={() => {
            Alert.alert(
              'Reserved Next Ride Details',
              `Pickup: ${reservedNextRide.pickup.address}\nDropoff: ${reservedNextRide.destination.address}\nEst. Earning: ₹${Math.round(reservedNextRide.driver_earning)}`
            )
          }}
        />
      )}

      {/* BOTTOM SLIDING OPERATING PANEL */}
      <View style={[styles.bottomPanel, { backgroundColor: bgCard }]}>
        {phase === 'EN_ROUTE_PICKUP' ? (
          /* PHASE A: Pickup Navigation Panel */
          <View>
            <View style={styles.panelHeaderRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.customerName, { color: textPrimary }]}>Rahul S.</Text>
                  <Text style={styles.ratingBadge}>★ 4.9</Text>
                  <Text style={[styles.passengerCount, { color: textSecondary }]}>• 2 Seats</Text>
                </View>
                <Text style={[styles.panelAddress, { color: textSecondary }]} numberOfLines={1}>
                  📍 {pickupCoord.address}
                </Text>
              </View>

              <View style={styles.commBtnRow}>
                <TouchableOpacity style={styles.commBtn} onPress={() => setShowMaskedCall(true)}>
                  <Feather name="phone" size={18} color="#16A34A" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.commBtn} onPress={() => setShowPassengerChat(true)}>
                  <Feather name="message-square" size={18} color="#0284C7" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.commBtn} onPress={() => setShowCancelModal(true)}>
                  <MaterialCommunityIcons name="cancel" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.metricsRow}>
              <Text style={[styles.metricMain, { color: textPrimary }]}>
                {routeData?.distance_km || '2.4'} km • ~{routeData?.duration_min || '7'} min ETA
              </Text>
              <Text style={styles.earningTag}>🟢 ₹{fare || '544'} Earning</Text>
            </View>

            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={handleArrivedPickup}
              disabled={arriving}
              activeOpacity={0.85}
            >
              {arriving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.ctaBtnText}>✓ I'VE ARRIVED AT PICKUP</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : phase === 'ARRIVED_PICKUP' ? (
          /* FEATURES 9, 11 & 12: WAITING SYSTEM & ARRIVAL VERIFICATION PANEL */
          <View>
            {/* Feature 11: Waiting Card */}
            <WaitingCard
              isDark={isDarkTheme}
              waitingStatus={waitingStatus}
              loading={loadingWaiting}
              onOpenCall={() => setShowMaskedCall(true)}
              onOpenChat={() => setShowPassengerChat(true)}
              onOpenAssistance={() => setShowAssistance(true)}
              onOpenCancelModal={() => setShowCancelModal(true)}
              onTriggerNoShow={handleNoShowConfirm}
            />

            {/* Feature 9: PIN Verification Panel */}
            <ArrivalVerificationPanel
              isDark={isDarkTheme}
              rideId={activeRideId}
              driverLat={driverLat}
              driverLng={driverLng}
              accuracy={driverAccuracy}
              onOpenCall={() => setShowMaskedCall(true)}
              onOpenChat={() => setShowPassengerChat(true)}
              onOpenAssistance={() => setShowAssistance(true)}
              onOpenNoShow={(elapsedSec, distM, contacts) => {
                setNoShowParams({
                  elapsedSeconds: elapsedSec,
                  distanceMeters: distM,
                  contactAttempts: contacts,
                })
                setShowNoShowModal(true)
              }}
              onRideStarted={handleRideStartSuccess}
            />
          </View>
        ) : (
          /* FEATURE 10: DURING RIDE / DESTINATION TRIP PROGRESS HUD */
          <TripProgressHUD
            isDark={isDarkTheme}
            tripSeconds={tripSeconds}
            distanceRemainingKm={routeData?.distance_km || 5.4}
            durationRemainingMin={routeData?.duration_min || 12}
            currentEstimatedFare={currentEstimatedFare}
            destinationAddress={destCoord.address}
            activeStop={activeStop}
            hasActiveSOS={hasActiveSOS}
            arriving={arriving}
            onOpenCall={() => setShowMaskedCall(true)}
            onOpenChat={() => setShowPassengerChat(true)}
            onOpenAddStop={() => setShowAddStop(true)}
            onOpenUpdateDestination={() => setShowUpdateDestination(true)}
            onOpenSOS={() => {
              setHasActiveSOS(true)
              setShowSOSModal(true)
            }}
            onArriveAtStop={handleArriveAtStop}
            onDepartFromStop={handleDepartFromStop}
            onCompleteTrip={handleCompleteTrip}
          />
        )}
      </View>

      {/* MODALS & SHEETS */}
      <HazardReportSheet
        visible={showHazardReport}
        isDark={isDarkTheme}
        onClose={() => setShowHazardReport(false)}
        onSubmitHazard={async (type: HazardType) => {
          await NavigationService.reportHazard(type, driverLat, driverLng)
          setShowHazardReport(false)
          Alert.alert('Hazard Reported! ⚠️', 'Thank you for keeping fellow drivers safe.')
        }}
      />

      <MaskedCallSheet
        visible={showMaskedCall}
        isDark={isDarkTheme}
        rideId={activeRideId}
        customerName="Rahul S."
        onClose={() => setShowMaskedCall(false)}
      />

      <PassengerChatModal
        visible={showPassengerChat}
        isDark={isDarkTheme}
        rideId={activeRideId}
        customerName="Rahul S."
        onClose={() => setShowPassengerChat(false)}
        onOpenCall={() => {
          setShowPassengerChat(false)
          setShowMaskedCall(true)
        }}
      />

      <PickupAssistanceSheet
        visible={showAssistance}
        isDark={isDarkTheme}
        rideId={activeRideId}
        onClose={() => setShowAssistance(false)}
        onOpenCall={() => {
          setShowAssistance(false)
          setShowMaskedCall(true)
        }}
        onOpenChat={() => {
          setShowAssistance(false)
          setShowPassengerChat(true)
        }}
      />

      <NoShowConfirmationModal
        visible={showNoShowModal}
        isDark={isDarkTheme}
        rideId={activeRideId}
        driverLat={driverLat}
        driverLng={driverLng}
        elapsedSeconds={noShowParams.elapsedSeconds}
        distanceMeters={noShowParams.distanceMeters}
        contactAttempts={noShowParams.contactAttempts}
        onClose={() => setShowNoShowModal(false)}
        onNoShowSuccess={fee => {
          Alert.alert('No-Show Confirmed', `Cancellation fee ₹${fee.toFixed(0)} credited to your wallet.`, [
            { text: 'OK', onPress: () => router.replace('/(tabs)/dashboard') },
          ])
        }}
      />

      {/* Feature 10 Sheets */}
      <AddStopModal
        visible={showAddStop}
        isDark={isDarkTheme}
        rideId={activeRideId}
        existingStopsCount={stops.length}
        onClose={() => setShowAddStop(false)}
        onStopAdded={handleStopAdded}
      />

      <UpdateDestinationModal
        visible={showUpdateDestination}
        isDark={isDarkTheme}
        rideId={activeRideId}
        currentDestinationAddress={destCoord.address}
        currentFare={currentEstimatedFare}
        onClose={() => setShowUpdateDestination(false)}
        onDestinationUpdated={handleDestinationUpdated}
      />

      <EmergencySOSModal
        visible={showSOSModal}
        isDark={isDarkTheme}
        rideId={activeRideId}
        driverLat={driverLat}
        driverLng={driverLng}
        accuracy={driverAccuracy}
        onClose={() => setShowSOSModal(false)}
      />

      {/* Feature 12: Cancellation Modal */}
      <CancelRideModal
        visible={showCancelModal}
        isDark={isDarkTheme}
        rideId={activeRideId}
        onClose={() => setShowCancelModal(false)}
        onCancellationSuccess={msg => {
          Alert.alert('Ride Cancelled', msg, [
            { text: 'OK', onPress: () => router.replace('/(tabs)/dashboard') }
          ])
        }}
      />

      {/* Feature 13 & 21: Trip Receipt Modal */}
      <TripReceiptModal
        visible={showReceiptModal}
        isDark={isDarkTheme}
        receipt={completedReceipt}
        onClose={handleReceiptDismissed}
      />

      {/* Feature 22: Driver Safety Toolkit Modal */}
      <DriverSafetyToolkitModal
        visible={showSafetyToolkit}
        onClose={() => setShowSafetyToolkit(false)}
        rideId={activeRideId}
        driverLat={driverLat}
        driverLng={driverLng}
        onOpenTrustedContacts={() => setShowTrustedContacts(true)}
        onOpenReportIncident={() => setShowReportIncident(true)}
      />

      {/* Feature 22: Report Safety Incident Modal */}
      <ReportIncidentModal
        visible={showReportIncident}
        onClose={() => setShowReportIncident(false)}
        rideId={activeRideId}
        driverLat={driverLat}
        driverLng={driverLng}
      />

      {/* Feature 22: Trusted Contacts Management Sheet */}
      <TrustedContactsSheet
        visible={showTrustedContacts}
        onClose={() => setShowTrustedContacts(false)}
      />

      {/* Combined Developer Mode Simulation Sheet */}
      <SafetyDevSheet
        visible={showDevSheet}
        onClose={() => setShowDevSheet(false)}
        onSimulateDestinationSet={() => {
          Alert.alert('Simulated: Destination Set', 'Target: Sangli Bus Stand • Mode: Balanced')
        }}
        onInjectAlignedRide={() => {
          Alert.alert('Simulated: Aligned Ride', 'Trip moving towards Sangli (96% Match, ₹540)')
        }}
        onInjectMisalignedRide={() => {
          Alert.alert('Simulated: Misaligned Ride', 'Trip moving opposite to Sangli (Suppressed in Strict mode)')
        }}
        onSimulateDestinationReached={() => {
          Alert.alert('Simulated: Destination Reached', 'Driver within 1.0km of Sangli target. Mode reset to OFF.')
        }}
        onSimulateDestinationExpired={() => {
          Alert.alert('Simulated: Destination Expired', '2 hours elapsed / max rides reached. Reset to OFF.')
        }}
        onSimulateNearDropoff={() => {
          Alert.alert('Simulated: Near Dropoff', 'Driver within 1.8km of dropoff. Eligible for Back-to-Back!')
        }}
        onInjectNextRideOffer={cand => {
          setNextRideOffer(cand)
        }}
        onSimulateNextRideReserved={() => {
          setReservedNextRide({
            ride_id: `sim-b2b-${Date.now()}`,
            smart_score: 95.8,
            match_percentage: 96,
            human_reason: '96% Match',
            pickup_distance_km: 1.8,
            pickup_eta_min: 5,
            trip_distance_km: 14.2,
            trip_duration_min: 32,
            fare: 540.0,
            driver_earning: 432.0,
            pickup_distance_from_current_dropoff_km: 1.8,
            pickup_eta_from_current_dropoff_min: 5,
            is_back_to_back: true,
            pickup: {
              address: 'Koregaon Park North Main Rd, Pune',
              lat: 18.5362,
              lng: 73.8939,
              distance_km: 1.8,
              eta_min: 5,
            },
            destination: {
              address: 'City Center Mall, Pune',
              lat: 18.5204,
              lng: 73.8567,
            },
            category_name: 'Premium',
          })
          Alert.alert('Next Ride Reserved!', 'Locked next pickup at Koregaon Park.')
        }}
        onSimulateNextRideReleased={() => {
          setReservedNextRide(null)
          setNextRideOffer(null)
          Alert.alert('Next Ride Released', 'Reserved ride returned to dispatch pool.')
        }}
        onSimulateB2BTransition={() => {
          handleReceiptDismissed()
        }}
        onTriggerSOS={() => {
          setHasActiveSOS(true)
          setShowSOSModal(true)
        }}
        onInjectSafetyAlert={(type, msg) => {
          setActiveSafetyAlert({
            alert_id: `sim-alert-${Date.now()}`,
            alert_type: type,
            severity: 'WARNING',
            status: 'ACTIVE',
            details: { message: msg },
            created_at: new Date().toISOString(),
          })
        }}
        onSimulateImSafe={() => {
          handleConfirmSafe()
        }}
        onSimulateTripShare={() => {
          Alert.alert('Trip Share Token Generated', 'https://track.cabbooking.com/share/sim-token-89214')
        }}
        onOpenReportIncident={() => setShowReportIncident(true)}
        onReset={() => {
          setNextRideOffer(null)
          setReservedNextRide(null)
          setActiveSafetyAlert(null)
          setHasActiveSOS(false)
          Alert.alert('Reset Complete', 'All simulation states cleared.')
        }}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHUDContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 10,
    left: 12,
    right: 12,
    zIndex: 100,
    gap: 8,
  },
  mapContainer: {
    flex: 1,
  },
  driverCarMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(2, 132, 199, 0.25)',
    borderWidth: 2.5,
    borderColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetMarkerPickup: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  targetMarkerStop: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  stopMarkerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  targetMarkerDest: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  hazardMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingControls: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  floatingRightCol: {
    gap: 12,
  },
  floatingActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  bottomPanel: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  panelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 6,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '700',
  },
  ratingBadge: {
    backgroundColor: '#FEF3C7',
    color: '#D97706',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  passengerCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  panelAddress: {
    fontSize: 13,
    marginTop: 4,
  },
  commBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  commBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  metricMain: {
    fontSize: 16,
    fontWeight: '700',
  },
  earningTag: {
    fontSize: 15,
    fontWeight: '700',
    color: '#16A34A',
  },
  ctaBtn: {
    backgroundColor: '#0284C7',
    marginHorizontal: 20,
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
})
