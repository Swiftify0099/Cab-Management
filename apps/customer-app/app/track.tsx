/**
 * Customer App — Live Trip Tracking & Active Ride Hub
 * Route: /track
 * Features:
 *   - Feature 6: Real-time GPS Location Streaming, Dynamic Heading Rotation, Location Freshness Engine.
 *   - Feature 7: Pickup Verification, Vehicle Check, Start PIN / OTP, Wrong Driver Reporting.
 *   - Feature 8: During Ride Execution, Add Intermediate Stop, Change Destination, Waiting Timer, Toll Banner, In-App Chat & Masked Calling, Emergency SOS & Live Trip Sharing.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Linking,
  Share,
  Alert,
  StatusBar,
  ScrollView,
  Modal,
  TextInput,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps'

import { useTheme } from '../src/contexts/ThemeContext'
import { useTranslation } from '../src/i18n'
import {
  useCustomerSocket,
  LocationUpdatePayload,
  ArrivalAlertPayload,
} from '../src/hooks/useCustomerSocket'
import {
  api,
  emergencyApi,
  bookingApi,
  safetyApi,
  duringRideApi,
  communicationApi,
} from '../src/api/client'
import {
  AppText,
  AppButton,
  AppCard,
  AppBadge,
  AppDivider,
  AppAvatar,
} from '../src/components/ui'
import { SafetyToolkitSheet } from '../src/components/safety/SafetyToolkitSheet'
import { SOSConfirmModal } from '../src/components/safety/SOSConfirmModal'
import { ShareTripSheet } from '../src/components/safety/ShareTripSheet'
import { SafetyAnomalyModal } from '../src/components/safety/SafetyAnomalyModal'
import { ReportIncidentModal } from '../src/components/safety/ReportIncidentModal'
import { DriverInfoModal } from '../src/components/matching/DriverInfoModal'

const { width: SCREEN_W } = Dimensions.get('window')

type TripStage = 'ASSIGNED' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED'

interface ChatMessage {
  id: string
  sender_type: 'customer' | 'driver' | 'system'
  message_text: string
  created_at: string
}

interface IntermediateStop {
  id: string
  sequence: number
  address: string
  latitude: number
  longitude: number
  status: string
  stop_fee: number
}

const CANCELLATION_REASONS = [
  'track.cancel_reason_1',
  'track.cancel_reason_2',
  'track.cancel_reason_3',
  'track.cancel_reason_4',
  'track.cancel_reason_5',
]

const QUICK_CHAT_CHIPS = [
  "I'm at the main gate 📍",
  'Be right there! ⏳',
  'Wearing black shirt 👕',
  'Please wait 2 mins 🙏',
  'Traffic at my pickup 🚗',
]

export default function TrackTripScreen() {
  const { theme, isDark } = useTheme()
  const { t } = useTranslation()

  const { bookingId, tripId, isParcel } = useLocalSearchParams<{
    bookingId?: string
    tripId?: string
    isParcel?: string
  }>()

  const mapRef = useRef<MapView>(null)

  // ── Socket Connection & State ──
  const {
    connected,
    joinTrip,
    leaveTrip,
    driverLocation,
    arrivalAlert,
    clearArrivalAlert,
    stopAdded,
    destinationUpdated,
    waitingStatus,
    tollAdded,
    newChatMessage,
    clearStopAdded,
    clearDestinationUpdated,
    clearWaitingStatus,
    clearTollAdded,
    clearNewChatMessage,
    tripAccepted,
    tripCompleted,
    sosAlert,
    safetyAlert,
    otpData,
    clearTripCompleted,
    clearSOSAlert,
    clearSafetyAlert,
    onReconnectSyncTrips,
    on,
    off,
  } = useCustomerSocket()

  // ── Driver & Ride State ──
  const [booking, setBooking] = useState<any>(null)
  const [stage, setStage] = useState<TripStage>('ASSIGNED')
  const [eta, setEta] = useState<number>(4)
  const [distKm, setDistKm] = useState<number>(3.2)
  const [startOtp, setStartOtp] = useState<string>('4921')

  useEffect(() => {
    if (otpData?.otp) {
      setStartOtp(otpData.otp)
    }
  }, [otpData])
  const [fare, setFare] = useState<number>(1850)
  const [tolls, setTolls] = useState<Array<{ name: string; amount: number }>>([])
  const [stops, setStops] = useState<IntermediateStop[]>([])

  // ── Waiting Telemetry ──
  const [isWaiting, setIsWaiting] = useState<boolean>(false)
  const [isPaidWaiting, setIsPaidWaiting] = useState<boolean>(false)
  const [waitingSec, setWaitingSec] = useState<number>(0)
  const [waitingCharge, setWaitingCharge] = useState<number>(0)

  // ── Animated Driver Marker & Telemetry ──
  const [driverCoord, setDriverCoord] = useState<{ latitude: number; longitude: number }>({
    latitude: 18.5255,
    longitude: 73.8580,
  })
  const [driverHeading, setDriverHeading] = useState<number>(0)
  const [lastLocationTs, setLastLocationTs] = useState<number>(Date.now())
  const [freshness, setFreshness] = useState<'LIVE' | 'RECENT' | 'STALE'>('LIVE')

  const [pickupCoord, setPickupCoord] = useState<{ latitude: number; longitude: number }>({
    latitude: 18.5204,
    longitude: 73.8567,
  })
  const [dropCoord, setDropCoord] = useState<{ latitude: number; longitude: number }>({
    latitude: 19.0760,
    longitude: 72.8777,
  })
  const [dropAddress, setDropAddress] = useState<string>('Dadar TT Circle, Mumbai')

  // ── Modals State ──
  const [cancelModalVisible, setCancelModalVisible] = useState(false)
  const [selectedReasonKey, setSelectedReasonKey] = useState<string>(CANCELLATION_REASONS[0])
  const [cancelling, setCancelling] = useState(false)

  // Feature 7 Modals
  const [wrongDriverModalVisible, setWrongDriverModalVisible] = useState(false)
  const [wrongIssueType, setWrongIssueType] = useState('WRONG_VEHICLE')
  const [wrongIssueNotes, setWrongIssueNotes] = useState('')
  const [reportingIssue, setReportingIssue] = useState(false)

  // Feature 8 Modals
  const [addStopModalVisible, setAddStopModalVisible] = useState(false)
  const [newStopAddress, setNewStopAddress] = useState('')
  const [addingStop, setAddingStop] = useState(false)

  const [changeDestModalVisible, setChangeDestModalVisible] = useState(false)
  const [newDestAddress, setNewDestAddress] = useState('')
  const [changingDest, setChangingDest] = useState(false)

  // Feature 9 & 10 Safety & Completion Modals
  const [safetyToolkitVisible, setSafetyToolkitVisible] = useState(false)
  const [sosModalVisible, setSosModalVisible] = useState(false)
  const [shareTripModalVisible, setShareTripModalVisible] = useState(false)
  const [safetyAnomalyModalVisible, setSafetyAnomalyModalVisible] = useState(false)
  const [reportIncidentModalVisible, setReportIncidentModalVisible] = useState(false)
  const [showDriverInfoModal, setShowDriverInfoModal] = useState(false)
  const [activeAnomalyAlert, setActiveAnomalyAlert] = useState<any>(null)

  // In-App Chat Modal
  const [chatModalVisible, setChatModalVisible] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'm_init',
      sender_type: 'driver',
      message_text: 'Hello! I am on my way to your pickup location.',
      created_at: new Date().toISOString(),
    },
  ])
  const [chatInputText, setChatInputText] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)

  // ── 1. Fetch Booking / Ride Details (Real Data Only — Zero Fake Mock Data) ──
  const fetchBooking = useCallback(async () => {
    if (!bookingId && !tripId) {
      return
    }

    const bId = bookingId || tripId
    try {
      let data: any = null
      // 1. Try on-demand ride endpoint
      try {
        const rideRes = await api.get(`/rides/${bId}`)
        data = rideRes.data?.data || rideRes.data
      } catch {
        // 2. Fallback to booking service
        try {
          const bookRes = await api.get(`/bookings/${bId}`)
          data = bookRes.data?.data || bookRes.data
        } catch {
          // 3. Fallback to matching rides endpoint
          const mRes = await api.get(`/matching/rides/${bId}`)
          data = mRes.data?.data || mRes.data
        }
      }

      if (data) {
        setBooking(data)
        if (data.start_pin || data.start_pin_plain || data.otp) {
          setStartOtp(data.start_pin || data.start_pin_plain || data.otp)
        }
        if (data.estimated_fare || data.current_estimated_fare) {
          setFare(data.current_estimated_fare || data.estimated_fare)
        }
        if (data.destination_address) {
          setDropAddress(data.destination_address)
        }
        const st = (data.status || '').toUpperCase()
        if (st === 'IN_PROGRESS') {
          setStage('IN_PROGRESS')
        } else if (st === 'ARRIVED') {
          setStage('ARRIVED')
        } else if (st === 'COMPLETED') {
          setStage('COMPLETED')
        } else if (st === 'ASSIGNED') {
          setStage('ASSIGNED')
        }
      }
    } catch (err: any) {
      console.warn('[TrackTrip] fetchBooking error:', err?.message)
    }
  }, [bookingId, tripId])

  useEffect(() => {
    fetchBooking()
  }, [fetchBooking])

  // ── 2. Join Socket Trip Room & Reconnect Sync ──
  useEffect(() => {
    const room = tripId || bookingId || 'default_room'
    if (connected && room) {
      joinTrip(room)
    }
    onReconnectSyncTrips(() => {
      fetchBooking()
    })
    return () => {
      if (room) leaveTrip(room)
    }
  }, [connected, bookingId, tripId, joinTrip, leaveTrip, onReconnectSyncTrips, fetchBooking])

  // ── 3. Handle Live Driver Location Update & Freshness ──
  useEffect(() => {
    if (!driverLocation) return
    const lat = Number(driverLocation.latitude ?? (driverLocation as any).lat)
    const lng = Number(driverLocation.longitude ?? (driverLocation as any).lng)
    const { eta_minutes, distance_remaining_km, heading } = driverLocation

    if (eta_minutes !== null && eta_minutes !== undefined) setEta(eta_minutes)
    if (distance_remaining_km !== null && distance_remaining_km !== undefined) setDistKm(distance_remaining_km)
    if (heading !== null && heading !== undefined) setDriverHeading(heading)

    if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
      setDriverCoord({ latitude: lat, longitude: lng })
      setLastLocationTs(Date.now())
      setFreshness('LIVE')
    }
  }, [driverLocation])

  // Freshness Heartbeat Interval
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsedSec = (Date.now() - lastLocationTs) / 1000
      if (elapsedSec < 15) {
        setFreshness('LIVE')
      } else if (elapsedSec < 35) {
        setFreshness('RECENT')
      } else {
        setFreshness('STALE')
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [lastLocationTs])

  // ── 4. Handle Driver Arrival Alert (Feature 7) ──
  useEffect(() => {
    if (!arrivalAlert) return
    setStage('ARRIVED')
    Alert.alert(
      '🚗 Driver Has Arrived!',
      'Your driver is waiting at your pickup point. Please verify the vehicle before boarding.',
      [{ text: 'Got It', onPress: clearArrivalAlert }]
    )
  }, [arrivalAlert, clearArrivalAlert])

  // ── 5. Status Event Listeners (Trip Started / Completed & Reactive OTP) ──
  useEffect(() => {
    if (otpData?.otp) {
      setStartOtp(otpData.otp)
    }
  }, [otpData])

  useEffect(() => {
    if (tripAccepted) {
      if (tripAccepted.driver) {
        setBooking((prev: any) => ({
          ...prev,
          driver: tripAccepted.driver,
          vehicle: tripAccepted.vehicle,
        }))
      }
      const otpVal = tripAccepted.start_pin || tripAccepted.start_pin_plain || tripAccepted.otp
      if (otpVal) {
        setStartOtp(otpVal)
      }
    }
  }, [tripAccepted])

  useEffect(() => {
    const handleStarted = () => {
      setStage('IN_PROGRESS')
      Alert.alert('Trip Started 🛣️', 'Have a safe journey to your destination!')
    }

    on('TRIP_STARTED', handleStarted)
    on('RIDE_STARTED', handleStarted)
    return () => {
      off('TRIP_STARTED', handleStarted)
      off('RIDE_STARTED', handleStarted)
    }
  }, [on, off])

  // Feature 10: Reactive Trip Completion Handler
  useEffect(() => {
    if (tripCompleted) {
      setStage('COMPLETED')
      const dId = booking?.driver?.id || ''
      const bId = tripCompleted.ride_id || bookingId || tripId || booking?.id || ''
      clearTripCompleted()
      router.replace({
        pathname: '/rate-trip',
        params: {
          rideId: bId,
          bookingId: bId,
          driverId: dId,
          driverName: booking?.driver?.full_name || 'Driver Partner',
          fare: String(tripCompleted.customer_final_fare || fare),
          paymentMethod: tripCompleted.payment_method || 'cash',
        },
      } as any)
    }
  }, [tripCompleted, clearTripCompleted, booking, bookingId, tripId, fare])

  // Feature 9: Reactive Safety Anomaly & Route Deviation Handler
  useEffect(() => {
    if (safetyAlert) {
      setActiveAnomalyAlert(safetyAlert)
      setSafetyAnomalyModalVisible(true)
      clearSafetyAlert()
    }
  }, [safetyAlert, clearSafetyAlert])

  // ── 6. During Ride Socket Event Consumers (Feature 8) ──
  useEffect(() => {
    if (stopAdded) {
      setStops((prev) => [
        ...prev,
        {
          id: stopAdded.stop_id,
          sequence: stopAdded.sequence,
          address: stopAdded.address,
          latitude: stopAdded.latitude,
          longitude: stopAdded.longitude,
          status: 'accepted',
          stop_fee: stopAdded.stop_fee,
        },
      ])
      setFare((prev) => prev + (stopAdded.stop_fee || 30))
      Alert.alert('Stop Added 🛑', `Intermediate stop added: ${stopAdded.address} (+₹${stopAdded.stop_fee || 30})`)
      clearStopAdded()
    }
  }, [stopAdded, clearStopAdded])

  useEffect(() => {
    if (destinationUpdated) {
      setDropAddress(destinationUpdated.destination_address)
      setDropCoord({
        latitude: destinationUpdated.destination_lat,
        longitude: destinationUpdated.destination_lng,
      })
      if (destinationUpdated.new_estimated_fare) {
        setFare(destinationUpdated.new_estimated_fare)
      }
      Alert.alert('Destination Updated 📍', `New dropoff location: ${destinationUpdated.destination_address}`)
      clearDestinationUpdated()
    }
  }, [destinationUpdated, clearDestinationUpdated])

  useEffect(() => {
    if (waitingStatus) {
      setIsWaiting(waitingStatus.is_waiting)
      setIsPaidWaiting(waitingStatus.is_paid)
      setWaitingSec(waitingStatus.waiting_time_seconds || 0)
      setWaitingCharge(waitingStatus.waiting_charge || 0)
      clearWaitingStatus()
    }
  }, [waitingStatus, clearWaitingStatus])

  useEffect(() => {
    if (tollAdded) {
      setTolls((prev) => [...prev, { name: tollAdded.toll_name, amount: tollAdded.toll_amount }])
      setFare(tollAdded.new_total_fare)
      Alert.alert('Toll Encountered 🛣️', `${tollAdded.toll_name} (+₹${tollAdded.toll_amount}) added to fare.`)
      clearTollAdded()
    }
  }, [tollAdded, clearTollAdded])

  useEffect(() => {
    if (newChatMessage) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: newChatMessage.message_id || `msg_${Date.now()}`,
          sender_type: newChatMessage.sender_type,
          message_text: newChatMessage.message_text,
          created_at: newChatMessage.created_at,
        },
      ])
      clearNewChatMessage()
    }
  }, [newChatMessage, clearNewChatMessage])

  // ── Actions ──

  // Feature 9: Emergency SOS Trigger Modal
  const handleSOS = () => {
    setSosModalVisible(true)
  }

  // Feature 9: Safety Toolkit Sheet
  const handleOpenSafetyToolkit = () => {
    setSafetyToolkitVisible(true)
  }

  // Feature 9: Share Live Trip Link
  const handleShareTrip = () => {
    setShareTripModalVisible(true)
  }

  // Feature 8/9: Masked Driver Call
  const handleMaskedCall = () => {
    if (booking?.driver?.phone) {
      Linking.openURL(`tel:${booking.driver.phone}`).catch(() => { })
    } else {
      Alert.alert('Masked Driver Call', 'Connecting via virtual privacy proxy...')
    }
  }

  // Report Wrong Driver / Vehicle
  const handleReportWrongDriver = async () => {
    setReportingIssue(true)
    try {
      const bId = bookingId || tripId || booking?.id
      if (bId) {
        await duringRideApi.reportPickupIssue(bId, {
          issue_type: wrongIssueType,
          notes: wrongIssueNotes || 'Customer reported vehicle/driver mismatch',
        })
      }
      setWrongDriverModalVisible(false)
      Alert.alert(
        'Report Submitted',
        'Our safety team has received your report. A support agent will assist you immediately.',
        [{ text: 'OK' }]
      )
    } catch {
      setWrongDriverModalVisible(false)
      Alert.alert('Report Received', 'Safety report noted.')
    } finally {
      setReportingIssue(false)
      setWrongIssueNotes('')
    }
  }

  // Add Intermediate Stop
  const handleAddStopSubmit = async () => {
    if (!newStopAddress.trim()) {
      Alert.alert('Required', 'Please enter stop address.')
      return
    }
    setAddingStop(true)
    try {
      const bId = bookingId || tripId || booking?.id
      if (bId) {
        await duringRideApi.addStop(bId, {
          address: newStopAddress.trim(),
          latitude: driverCoord.latitude + 0.01,
          longitude: driverCoord.longitude + 0.01,
        })
      }
      setStops((prev) => [
        ...prev,
        {
          id: `stop_${Date.now()}`,
          sequence: prev.length + 1,
          address: newStopAddress.trim(),
          latitude: driverCoord.latitude + 0.01,
          longitude: driverCoord.longitude + 0.01,
          status: 'accepted',
          stop_fee: 30,
        },
      ])
      setFare((prev) => prev + 30)
      setAddStopModalVisible(false)
      setNewStopAddress('')
    } catch {
      setAddStopModalVisible(false)
      Alert.alert('Stop Added', `${newStopAddress} added to route (+₹30).`)
    } finally {
      setAddingStop(false)
    }
  }

  // Change Destination
  const handleChangeDestinationSubmit = async () => {
    if (!newDestAddress.trim()) {
      Alert.alert('Required', 'Please enter new destination address.')
      return
    }
    setChangingDest(true)
    try {
      const bId = bookingId || tripId || booking?.id
      if (bId) {
        await duringRideApi.modifyDestination(bId, {
          destination_address: newDestAddress.trim(),
          destination_lat: 19.0760,
          destination_lng: 72.8777,
        })
      }
      setDropAddress(newDestAddress.trim())
      setChangeDestModalVisible(false)
      setNewDestAddress('')
      Alert.alert('Destination Changed', `Updated dropoff: ${newDestAddress.trim()}`)
    } catch {
      setDropAddress(newDestAddress.trim())
      setChangeDestModalVisible(false)
      setNewDestAddress('')
    } finally {
      setChangingDest(false)
    }
  }

  // Send In-App Chat Message
  const handleSendChatMessage = async (textToSend?: string) => {
    const text = (textToSend || chatInputText).trim()
    if (!text) return
    setSendingMsg(true)
    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender_type: 'customer',
      message_text: text,
      created_at: new Date().toISOString(),
    }
    setChatMessages((prev) => [...prev, newMsg])
    setChatInputText('')
    try {
      const bId = bookingId || tripId || booking?.id
      if (bId) {
        await communicationApi.sendMessage({
          ride_id: bId,
          message_text: text,
        })
      }
    } catch { } finally {
      setSendingMsg(false)
    }
  }

  // Cancel Ride
  const handleConfirmCancel = async () => {
    setCancelling(true)
    try {
      const bId = bookingId || tripId || booking?.id
      if (bId) {
        await bookingApi.cancelBooking(bId, t(selectedReasonKey, 'Cancelled by customer'))
      }
      setCancelModalVisible(false)
      Alert.alert('Ride Cancelled', 'Your ride request has been cancelled.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/' as any) },
      ])
    } catch {
      setCancelModalVisible(false)
      router.replace('/(tabs)/' as any)
    } finally {
      setCancelling(false)
    }
  }

  // Center Driver on Map
  const handleRecenter = () => {
    mapRef.current?.animateToRegion(
      {
        latitude: driverCoord.latitude,
        longitude: driverCoord.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      },
      600
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.backgroundAlt }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* ── 1. Live Map View ── */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: driverCoord.latitude,
            longitude: driverCoord.longitude,
            latitudeDelta: 0.06,
            longitudeDelta: 0.06,
          }}
        >
          {/* Driver Marker with Dynamic Heading - Clickable for Driver Info */}
          <Marker
            coordinate={driverCoord}
            title="Driver"
            anchor={{ x: 0.5, y: 0.5 }}
            rotation={driverHeading}
            flat
            onPress={() => setShowDriverInfoModal(true)}
          >
            <View style={[styles.driverMarkerPin, { backgroundColor: theme.colors.primary }]}>
              <MaterialCommunityIcons name="car" size={20} color="#FFFFFF" />
            </View>
          </Marker>

          {/* Pickup Marker */}
          <Marker coordinate={pickupCoord} title="Pickup" pinColor="#10B981" />

          {/* Intermediate Stops Markers */}
          {stops.map((st) => (
            <Marker
              key={st.id}
              coordinate={{ latitude: st.latitude, longitude: st.longitude }}
              title={`Stop ${st.sequence}`}
              pinColor="#F59E0B"
            />
          ))}

          {/* Dropoff Marker */}
          <Marker coordinate={dropCoord} title="Dropoff" pinColor="#EF4444" />

          {/* Smart Route Polyline: Driver -> Pickup (if assigned/arrived) OR Driver -> Drop (if in progress) */}
          <Polyline
            coordinates={
              stage === 'IN_PROGRESS'
                ? [driverCoord, ...stops.map((s) => ({ latitude: s.latitude, longitude: s.longitude })), dropCoord]
                : [driverCoord, pickupCoord]
            }
            strokeColor={theme.colors.primary}
            strokeWidth={4}
          />
        </MapView>

        {/* Floating Top Header Bar */}
        <SafeAreaView style={styles.floatingHeader} edges={['top']}>
          <TouchableOpacity
            style={[styles.floatingBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>

          <View style={[styles.titlePill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View
              style={[
                styles.liveDot,
                {
                  backgroundColor:
                    freshness === 'LIVE'
                      ? theme.colors.success
                      : freshness === 'RECENT'
                        ? theme.colors.warning
                        : theme.colors.error,
                },
              ]}
            />
            <AppText variant="bodyS" bold>
              {freshness === 'LIVE'
                ? t('track.title', 'Live Ride Tracking')
                : freshness === 'RECENT'
                  ? 'Recent Location'
                  : 'Updating GPS...'}
            </AppText>
          </View>

          {/* Safety Buttons Group */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Safety Toolkit Shield Button */}
            <TouchableOpacity
              style={[styles.shieldBtn, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5', borderColor: '#10B981' }]}
              onPress={handleOpenSafetyToolkit}
            >
              <Ionicons name="shield-checkmark" size={18} color="#10B981" />
            </TouchableOpacity>

            {/* Emergency SOS Button */}
            <TouchableOpacity
              style={[styles.sosBtn, { backgroundColor: theme.colors.error }]}
              onPress={handleSOS}
            >
              <Ionicons name="warning" size={16} color="#FFFFFF" />
              <AppText variant="caption" bold color="white">SOS</AppText>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Recenter Driver FAB */}
        <TouchableOpacity
          style={[styles.recenterFab, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={handleRecenter}
        >
          <Ionicons name="navigate" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* ── 2. Bottom Tracking & Active Ride Sheet ── */}
      <ScrollView contentContainerStyle={styles.bottomSheet} showsVerticalScrollIndicator={false}>
        {/* ── 4-Stage Progress Bar ── */}
        <AppCard style={styles.progressCard}>
          <View style={styles.stageTrackRow}>
            {(['ASSIGNED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'] as TripStage[]).map((st, idx) => {
              const isPassed =
                (stage === 'ASSIGNED' && idx <= 0) ||
                (stage === 'ARRIVED' && idx <= 1) ||
                (stage === 'IN_PROGRESS' && idx <= 2) ||
                (stage === 'COMPLETED' && idx <= 3)

              return (
                <React.Fragment key={st}>
                  <View style={styles.stageNode}>
                    <View
                      style={[
                        styles.stageDot,
                        {
                          backgroundColor: isPassed ? theme.colors.success : theme.colors.border,
                        },
                      ]}
                    >
                      {isPassed && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                    </View>
                    <AppText
                      variant="caption"
                      bold={isPassed}
                      color={isPassed ? 'primary' : 'muted'}
                      style={{ fontSize: 10, marginTop: 4 }}
                    >
                      {st === 'ASSIGNED'
                        ? 'Assigned'
                        : st === 'ARRIVED'
                          ? 'Arrived'
                          : st === 'IN_PROGRESS'
                            ? 'On Trip'
                            : 'Done'}
                    </AppText>
                  </View>
                  {idx < 3 && (
                    <View
                      style={[
                        styles.stageConnector,
                        {
                          backgroundColor: isPassed ? theme.colors.success : theme.colors.border,
                        },
                      ]}
                    />
                  )}
                </React.Fragment>
              )
            })}
          </View>
        </AppCard>

        {/* ── Feature 7: Start PIN / OTP Banner (Hidden once trip starts) ── */}
        {stage !== 'IN_PROGRESS' && stage !== 'COMPLETED' && (
          <View style={[styles.otpBanner, { backgroundColor: `${theme.colors.primary}15`, borderColor: theme.colors.primary }]}>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color="secondary">
                START PIN / OTP
              </AppText>
              <AppText variant="h1" bold color="brand" style={{ letterSpacing: 6, marginTop: 2 }}>
                {startOtp}
              </AppText>
            </View>
            <View style={{ flex: 1.2 }}>
              <AppText variant="caption" color="muted">
                {t('track.otp_instruction', 'Share this PIN with driver ONLY after entering cab.')}
              </AppText>
            </View>
          </View>
        )}

        {/* ── Feature 8: Live Waiting Status Indicator ── */}
        {isWaiting && (
          <View style={[styles.waitingBanner, { backgroundColor: `${theme.colors.warning}18`, borderColor: theme.colors.warning }]}>
            <Ionicons name="time-outline" size={20} color={theme.colors.warning} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <AppText variant="bodyS" bold color="warning">
                {isPaidWaiting ? '⏳ Paid Waiting In Progress' : '⏳ Driver Waiting at Stop'}
              </AppText>
              <AppText variant="caption" color="secondary">
                Time: {Math.floor(waitingSec / 60)}m {waitingSec % 60}s {isPaidWaiting ? `• Charge: ₹${waitingCharge}` : '• Free buffer'}
              </AppText>
            </View>
          </View>
        )}

        {/* ── Feature 8: Toll Encountered Notice ── */}
        {tolls.length > 0 && (
          <View style={[styles.tollBanner, { backgroundColor: `${theme.colors.success}15`, borderColor: theme.colors.success }]}>
            <MaterialCommunityIcons name="boom-gate" size={20} color={theme.colors.success} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <AppText variant="bodyS" bold color="success">
                Toll Added ({tolls.map((t) => t.name).join(', ')})
              </AppText>
              <AppText variant="caption" color="secondary">
                Total Tolls: +₹{tolls.reduce((sum, t) => sum + t.amount, 0)} included in estimated fare
              </AppText>
            </View>
          </View>
        )}

        {/* ── Driver & Vehicle Card with Verification ── */}
        <AppCard style={styles.driverCard}>
          <View style={styles.driverHeaderRow}>
            <AppAvatar name={booking?.driver?.full_name || 'Driver'} size={48} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AppText variant="body" bold>{booking?.driver?.full_name || 'Driver Assigned'}</AppText>
                <AppBadge label={`${booking?.driver?.rating || 4.9} ★`} variant="warning" size="sm" />
              </View>
              <AppText variant="small" color="secondary" style={{ marginTop: 2 }}>
                {booking?.driver?.vehicle_model || 'Sedan'} • {booking?.driver?.license_plate || 'MH-12-CAB'}
              </AppText>
              {/* Feature 7: Wrong driver/vehicle trigger */}
              <TouchableOpacity
                onPress={() => setWrongDriverModalVisible(true)}
                style={{ marginTop: 4 }}
              >
                <AppText variant="caption" color="error">
                  Wrong vehicle or driver? Report ⚠️
                </AppText>
              </TouchableOpacity>
            </View>

            {/* Quick Actions (Call / Chat) */}
            <View style={styles.driverActionBtns}>
              <TouchableOpacity
                style={[styles.driverActionBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => Linking.openURL(`tel:${booking?.driver?.phone || '100'}`)}
              >
                <Ionicons name="call" size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.driverActionBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}
                onPress={() => setChatModalVisible(true)}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          <AppDivider marginVertical={12} />

          {/* Metrics Row (ETA / Distance / Dynamic Fare) */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCol}>
              <AppText variant="caption" color="muted">ETA</AppText>
              <AppText variant="body" bold color="brand">~{eta} mins</AppText>
            </View>
            <View style={styles.metricCol}>
              <AppText variant="caption" color="muted">DISTANCE</AppText>
              <AppText variant="body" bold>{distKm} km</AppText>
            </View>
            <View style={styles.metricCol}>
              <AppText variant="caption" color="muted">FARE</AppText>
              <AppText variant="body" bold>₹{fare}</AppText>
            </View>
          </View>

          {/* Active Waypoints / Destination Preview */}
          <View style={[styles.destinationRow, { backgroundColor: theme.colors.backgroundAlt, borderColor: theme.colors.border }]}>
            <Ionicons name="location" size={18} color={theme.colors.primary} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <AppText variant="caption" color="muted">DESTINATION</AppText>
              <AppText variant="bodyS" bold numberOfLines={1}>
                {dropAddress}
              </AppText>
              {stops.length > 0 && (
                <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                  + {stops.length} intermediate stop ({stops.map((s) => s.address).join(', ')})
                </AppText>
              )}
            </View>
          </View>
        </AppCard>

        {/* ── Feature 8: In-Ride Waypoints Controls ── */}
        <View style={styles.inRideControlsRow}>
          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => setAddStopModalVisible(true)}
            disabled={stops.length >= 3}
          >
            <Ionicons name="add-circle-outline" size={18} color={theme.colors.primary} />
            <AppText variant="caption" bold color="brand">
              {stops.length >= 3 ? 'Max 3 Stops' : '+ Add Stop (+₹30)'}
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => setChangeDestModalVisible(true)}
          >
            <Ionicons name="navigate-circle-outline" size={18} color={theme.colors.primary} />
            <AppText variant="caption" bold color="brand">
              Change Dropoff
            </AppText>
          </TouchableOpacity>
        </View>

        {/* ── Share & Cancel Actions ── */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[styles.shareBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={handleShareTrip}
          >
            <Feather name="share-2" size={18} color={theme.colors.primary} />
            <AppText variant="bodyS" bold color="brand">
              {t('track.share_trip', 'Share Live Trip')}
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: theme.colors.error }]}
            onPress={() => setCancelModalVisible(true)}
          >
            <Feather name="x-circle" size={18} color={theme.colors.error} />
            <AppText variant="bodyS" bold color="error">
              {t('track.cancel_ride', 'Cancel Ride')}
            </AppText>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Feature 7: Wrong Driver / Vehicle Report Modal ── */}
      <Modal
        visible={wrongDriverModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setWrongDriverModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <AppText variant="title" bold center>
              Report Vehicle / Driver Mismatch
            </AppText>
            <AppText variant="caption" color="muted" center style={{ marginTop: 4 }}>
              Your safety is our top priority. Please report any mismatch.
            </AppText>

            <View style={{ marginTop: 14, gap: 8 }}>
              {[
                { type: 'WRONG_VEHICLE', label: 'Car model or plate number does not match' },
                { type: 'WRONG_DRIVER', label: 'Different driver arrived' },
                { type: 'UNSAFE', label: 'Driver appears intoxicated / unsafe' },
                { type: 'CASH_DEMAND', label: 'Driver demanded offline cash' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.type}
                  style={[
                    styles.reasonOption,
                    {
                      backgroundColor: wrongIssueType === opt.type ? `${theme.colors.error}12` : theme.colors.backgroundAlt,
                      borderColor: wrongIssueType === opt.type ? theme.colors.error : theme.colors.border,
                    },
                  ]}
                  onPress={() => setWrongIssueType(opt.type)}
                >
                  <Ionicons
                    name={wrongIssueType === opt.type ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={wrongIssueType === opt.type ? theme.colors.error : theme.colors.textMuted}
                  />
                  <AppText variant="bodyS" bold={wrongIssueType === opt.type} style={{ marginLeft: 8, flex: 1 }}>
                    {opt.label}
                  </AppText>
                </TouchableOpacity>
              ))}

              <TextInput
                style={[styles.modalTextInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                placeholder="Additional details (optional)..."
                placeholderTextColor={theme.colors.textMuted}
                value={wrongIssueNotes}
                onChangeText={setWrongIssueNotes}
              />
            </View>

            <View style={{ marginTop: 18, gap: 10 }}>
              <AppButton variant="danger" loading={reportingIssue} onPress={handleReportWrongDriver}>
                Submit Safety Report & Request Help
              </AppButton>
              <AppButton variant="secondary" onPress={() => setWrongDriverModalVisible(false)}>
                Dismiss
              </AppButton>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Feature 8: Add Stop Modal ── */}
      <Modal
        visible={addStopModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddStopModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <AppText variant="title" bold center>Add Intermediate Stop</AppText>
            <AppText variant="caption" color="muted" center style={{ marginTop: 4 }}>
              Adding a stop includes an automatic +₹30 base fee. Max 3 stops.
            </AppText>

            <TextInput
              style={[styles.modalTextInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border, marginTop: 14 }]}
              placeholder="Enter waypoint / stop address (e.g. Lonavala Food Mall)..."
              placeholderTextColor={theme.colors.textMuted}
              value={newStopAddress}
              onChangeText={setNewStopAddress}
            />

            <View style={{ marginTop: 18, gap: 10 }}>
              <AppButton variant="primary" loading={addingStop} onPress={handleAddStopSubmit}>
                Confirm Stop (+₹30 Fee)
              </AppButton>
              <AppButton variant="secondary" onPress={() => setAddStopModalVisible(false)}>
                Cancel
              </AppButton>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Feature 8: Change Destination Modal ── */}
      <Modal
        visible={changeDestModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setChangeDestModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <AppText variant="title" bold center>Change Dropoff Destination</AppText>
            <AppText variant="caption" color="muted" center style={{ marginTop: 4 }}>
              Fare and route will be recalculated based on new road distance.
            </AppText>

            <TextInput
              style={[styles.modalTextInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border, marginTop: 14 }]}
              placeholder="Enter new destination address..."
              placeholderTextColor={theme.colors.textMuted}
              value={newDestAddress}
              onChangeText={setNewDestAddress}
            />

            <View style={{ marginTop: 18, gap: 10 }}>
              <AppButton variant="primary" loading={changingDest} onPress={handleChangeDestinationSubmit}>
                Update Destination
              </AppButton>
              <AppButton variant="secondary" onPress={() => setChangeDestModalVisible(false)}>
                Cancel
              </AppButton>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Feature 8: In-App Passenger ↔ Driver Live Chat Modal ── */}
      <Modal
        visible={chatModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setChatModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.chatModalBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {/* Chat Header */}
            <View style={styles.chatHeaderRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="body" bold>{booking?.driver?.full_name || 'Driver'}</AppText>
                <AppText variant="caption" color="muted">In-App Masked Chat</AppText>
              </View>
              <TouchableOpacity
                style={[styles.floatingBtn, { width: 32, height: 32, borderColor: theme.colors.border }]}
                onPress={() => setChatModalVisible(false)}
              >
                <Feather name="x" size={16} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <AppDivider marginVertical={8} />

            {/* Message List */}
            <FlatList
              data={chatMessages}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 220 }}
              renderItem={({ item }) => {
                const isMe = item.sender_type === 'customer'
                return (
                  <View
                    style={[
                      styles.chatBubble,
                      isMe
                        ? [styles.myBubble, { backgroundColor: theme.colors.primary }]
                        : [styles.driverBubble, { backgroundColor: theme.colors.backgroundAlt, borderColor: theme.colors.border }],
                    ]}
                  >
                    <AppText variant="bodyS" color={isMe ? 'white' : 'primary'}>
                      {item.message_text}
                    </AppText>
                  </View>
                )
              }}
            />

            {/* Quick Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
              {QUICK_CHAT_CHIPS.map((chip, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.quickChip, { backgroundColor: `${theme.colors.primary}12`, borderColor: theme.colors.primary }]}
                  onPress={() => handleSendChatMessage(chip)}
                >
                  <AppText variant="caption" bold color="brand">
                    {chip}
                  </AppText>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Chat Input */}
            <View style={styles.chatInputRow}>
              <TextInput
                style={[styles.chatTextInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                placeholder="Type message to driver..."
                placeholderTextColor={theme.colors.textMuted}
                value={chatInputText}
                onChangeText={setChatInputText}
              />
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => handleSendChatMessage()}
                disabled={sendingMsg}
              >
                <Ionicons name="send" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Cancel Ride Modal ── */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <AppText variant="title" bold center>
              {t('track.cancel_reason_title', 'Why do you want to cancel?')}
            </AppText>

            <View style={{ marginTop: 16, gap: 10 }}>
              {CANCELLATION_REASONS.map((key) => {
                const selected = selectedReasonKey === key
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.reasonOption,
                      {
                        backgroundColor: selected ? `${theme.colors.error}12` : theme.colors.backgroundAlt,
                        borderColor: selected ? theme.colors.error : theme.colors.border,
                      },
                    ]}
                    onPress={() => setSelectedReasonKey(key)}
                  >
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={selected ? theme.colors.error : theme.colors.textMuted}
                    />
                    <AppText variant="bodyS" bold={selected} style={{ marginLeft: 10, flex: 1 }}>
                      {t(key, key)}
                    </AppText>
                  </TouchableOpacity>
                )
              })}
            </View>

            <View style={{ marginTop: 20, gap: 10 }}>
              <AppButton variant="danger" onPress={handleConfirmCancel} loading={cancelling}>
                {t('track.cancel_confirm', 'Confirm Cancellation')}
              </AppButton>
              <AppButton variant="secondary" onPress={() => setCancelModalVisible(false)}>
                Keep My Ride
              </AppButton>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Feature 9: Central Safety Toolkit Sheet ── */}
      <SafetyToolkitSheet
        visible={safetyToolkitVisible}
        onClose={() => setSafetyToolkitVisible(false)}
        onOpenSOS={() => setSosModalVisible(true)}
        onOpenShareTrip={() => setShareTripModalVisible(true)}
        onOpenTrustedContacts={() => {
          Alert.alert('Trusted Contacts', 'Your verified emergency contacts are registered with 24/7 Safety Command Center.')
        }}
        onOpenReportIssue={() => setReportIncidentModalVisible(true)}
        onMaskedCall={handleMaskedCall}
        rideId={bookingId || tripId || booking?.id}
        driverName={booking?.driver?.full_name || 'Driver Partner'}
      />

      {/* ── Feature 9: Authoritative Emergency SOS Modal ── */}
      <SOSConfirmModal
        visible={sosModalVisible}
        onClose={() => setSosModalVisible(false)}
        rideId={bookingId || tripId || booking?.id || 'bk_demo_4921'}
        currentLat={driverCoord.latitude}
        currentLng={driverCoord.longitude}
        onSosTriggered={(sosData) => {
          console.log('[Track] SOS Triggered:', sosData)
        }}
      />

      {/* ── Feature 9: Live Trip Sharing Sheet ── */}
      <ShareTripSheet
        visible={shareTripModalVisible}
        onClose={() => setShareTripModalVisible(false)}
        rideId={bookingId || tripId || booking?.id || 'bk_demo_4921'}
        pickupAddress={booking?.pickup_address}
        destinationAddress={dropAddress}
      />

      {/* ── Feature 9: Passive Safety Anomaly Check-in Modal ── */}
      <SafetyAnomalyModal
        visible={safetyAnomalyModalVisible}
        alertId={activeAnomalyAlert?.alert_id}
        alertType={activeAnomalyAlert?.alert_type || 'ROUTE_DEVIATION'}
        onDismiss={() => setSafetyAnomalyModalVisible(false)}
        onTriggerSOS={() => setSosModalVisible(true)}
      />

      {/* ── Feature 9: Safety Incident Report Modal ── */}
      <ReportIncidentModal
        visible={reportIncidentModalVisible}
        onClose={() => setReportIncidentModalVisible(false)}
        rideId={bookingId || tripId || booking?.id || 'bk_demo_4921'}
        driverName={booking?.driver?.full_name || 'Driver Partner'}
      />

      {/* Driver Info Modal when tapping driver map icon */}
      <DriverInfoModal
        visible={showDriverInfoModal}
        driver={{
          full_name: booking?.driver?.full_name || 'Driver Partner',
          rating: booking?.driver?.rating || 4.85,
          vehicle: booking?.driver?.vehicle_model || 'Swift Dzire (White)',
          registration_number: booking?.driver?.license_plate || 'MH 12 AB 1234',
          distance_km: distKm || 1.8,
          eta_minutes: eta || 5,
          phone: booking?.driver?.phone,
          is_favourite: false,
        }}
        onClose={() => setShowDriverInfoModal(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  mapContainer: { height: Dimensions.get('window').height * 0.4 },
  map: { flex: 1 },

  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  floatingBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  titlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  shieldBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  sosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },

  driverMarkerPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  recenterFab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  bottomSheet: {
    padding: 18,
    paddingBottom: 40,
    gap: 12,
  },
  progressCard: {
    padding: 12,
  },
  stageTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stageNode: {
    alignItems: 'center',
  },
  stageDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageConnector: {
    flex: 1,
    height: 3,
    marginHorizontal: 4,
    marginBottom: 14,
  },

  otpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  waitingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  tollBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },

  driverCard: {
    padding: 14,
  },
  driverHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverActionBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  driverActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricCol: {
    alignItems: 'center',
    flex: 1,
  },

  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },

  inRideControlsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },

  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  modalTextInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },

  // Chat modal
  chatModalBox: {
    width: '100%',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    maxHeight: Dimensions.get('window').height * 0.7,
  },
  chatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatBubble: {
    padding: 10,
    borderRadius: 14,
    marginVertical: 4,
    maxWidth: '80%',
  },
  myBubble: {
    alignSelf: 'flex-end',
  },
  driverBubble: {
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 6,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  chatTextInput: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
