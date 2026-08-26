/**
 * Multi-Step Intercity Trip Creation Wizard — Driver SuperApp
 * ─────────────────────────────────────────────────────────────
 * 5-Step Flow:
 *   Step 1: Visibility & Route (Specific City with Saved Locations & Pinpoint Map Picker / Hex Zone)
 *   Step 2: Service & Trip Configuration (Cab, Transport, Organization, Parcel, Hotel, Airport, Packers & Movers)
 *   Step 3: Fare & Restrictions (Base fare, Min fare, Negotiable toggle, Women Only, Parcel capability)
 *   Step 4: Vehicle, Capacity & Additional Options
 *   Step 5: Review & Publish Preview
 *
 * State is safely persisted in AsyncStorage to prevent data loss on accidental navigation.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
  Dimensions,
  Platform,
  Modal,
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import AsyncStorage from '@react-native-async-storage/async-storage'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { api } from '../src/api/client'
import { getDirections } from '../src/services/googleMaps'
import type { RouteData } from '../src/services/googleMaps'
import LocationPickerModal, { SelectedLocationData } from '../src/components/map/LocationPickerModal'
import {
  SUPPORTED_SERVICES,
  ServiceTypeKey,
  DEFAULT_SERVICE_METADATA,
} from '../src/services/tripServiceStrategy'

const WIZARD_DRAFT_KEY = '@driver_trip_wizard_draft_v2'
const { width: SCREEN_W } = Dimensions.get('window')

let MapView: any = null
let Marker: any = null
let Polyline: any = null
let Polygon: any = null
try {
  const maps = require('react-native-maps')
  MapView = maps.default
  Marker = maps.Marker
  Polyline = maps.Polyline
  Polygon = maps.Polygon
} catch (e) {
  console.warn('[CreateTrip] react-native-maps not available:', e)
}

function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  const points: { latitude: number; longitude: number }[] = []
  let index = 0, lat = 0, lng = 0
  while (index < encoded.length) {
    let b, shift = 0, result = 0
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    lat += (result & 1) ? ~(result >> 1) : (result >> 1)
    shift = 0; result = 0
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    lng += (result & 1) ? ~(result >> 1) : (result >> 1)
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 })
  }
  return points
}

interface SavedLocationItem {
  id: string
  label: string
  address: string
  latitude: number
  longitude: number
  city?: string
  location_type?: string
}

interface VehicleItem {
  id: string
  make: string
  model: string
  registration_number: string
  vehicle_type: string
  total_seats: number
}

const DEFAULT_SAVED_LOCATIONS: SavedLocationItem[] = [
  { id: '1', label: 'Swargate Bus Station', address: 'Swargate, Pune, Maharashtra 411042', latitude: 18.5018, longitude: 73.8580, city: 'Pune' },
  { id: '2', label: 'Shivajinagar Station', address: 'Shivajinagar, Pune, Maharashtra 411005', latitude: 18.5314, longitude: 73.8446, city: 'Pune' },
  { id: '3', label: 'Dadar TT Circle', address: 'Dadar East, Mumbai, Maharashtra 400014', latitude: 19.0178, longitude: 72.8478, city: 'Mumbai' },
  { id: '4', label: 'BKC Business Hub', address: 'Bandra Kurla Complex, Mumbai 400051', latitude: 19.0657, longitude: 72.8687, city: 'Mumbai' },
]

export default function CreateTripScreen() {
  const insets = useSafeAreaInsets()
  const [step, setStep] = useState<number>(1) // 1 to 5
  const [loading, setLoading] = useState<boolean>(false)
  const [publishing, setPublishing] = useState<boolean>(false)

  // Step 1: Visibility & Route
  const [visibilityMode, setVisibilityMode] = useState<'SPECIFIC_CITY' | 'HEX_ZONE'>('SPECIFIC_CITY')
  const [pickupData, setPickupData] = useState<SelectedLocationData>({
    latitude: 18.5204,
    longitude: 73.8567,
    address: 'Swargate Bus Stand, Pune, Maharashtra',
    city: 'Pune',
    state: 'Maharashtra',
  })
  const [dropData, setDropData] = useState<SelectedLocationData>({
    latitude: 19.0760,
    longitude: 72.8777,
    address: 'Dadar TT Circle, Mumbai, Maharashtra',
    city: 'Mumbai',
    state: 'Maharashtra',
  })

  // Location Picker Modal & Saved Locations Bottom Sheet
  const [locationPickerTarget, setLocationPickerTarget] = useState<'pickup' | 'drop' | null>(null)
  const [savedLocModalTarget, setSavedLocModalTarget] = useState<'pickup' | 'drop' | null>(null)
  const [savedLocations, setSavedLocations] = useState<SavedLocationItem[]>(DEFAULT_SAVED_LOCATIONS)

  // Route & Corridor Parameters
  const [maxRouteDeviationKm, setMaxRouteDeviationKm] = useState<string>('3.0')
  const [maxPickupRadiusKm, setMaxPickupRadiusKm] = useState<string>('5.0')
  const [maxDeviationLeftKm, setMaxDeviationLeftKm] = useState<string>('3.0')
  const [maxDeviationRightKm, setMaxDeviationRightKm] = useState<string>('3.0')
  const [routeData, setRouteData] = useState<RouteData | null>(null)
  const [fetchingRoute, setFetchingRoute] = useState<boolean>(false)

  // Step 2: Service Selection & Dynamic Metadata
  const [selectedService, setSelectedService] = useState<ServiceTypeKey>('cab')
  const [serviceMeta, setServiceMeta] = useState<any>(DEFAULT_SERVICE_METADATA.cab)
  const [recurrenceType, setRecurrenceType] = useState<'DAILY' | 'SPECIFIC_DATE' | 'SCHEDULED'>('DAILY')
  const [departureDate, setDepartureDate] = useState<Date>(new Date(Date.now() + 3600 * 1000 * 2))
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false)
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false)

  // Step 3: Fare & Restrictions
  const [baseFare, setBaseFare] = useState<string>('450')
  const [perKmRate, setPerKmRate] = useState<string>('3.5')
  const [minFare, setMinFare] = useState<string>('350')
  const [isNegotiable, setIsNegotiable] = useState<boolean>(true)
  const [womenOnly, setWomenOnly] = useState<boolean>(false)
  const [parcelEnabled, setParcelEnabled] = useState<boolean>(true)

  // Step 4: Vehicle & Capacity Allocation
  const [myVehicles, setMyVehicles] = useState<VehicleItem[]>([
    { id: 'v1', make: 'Maruti Suzuki', model: 'Dzire Prime', registration_number: 'MH 12 AB 1234', vehicle_type: 'sedan', total_seats: 4 },
    { id: 'v2', make: 'Toyota', model: 'Innova Crysta', registration_number: 'MH 14 CD 5678', vehicle_type: 'suv', total_seats: 6 },
  ])
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('v1')
  const [totalSeats, setTotalSeats] = useState<number>(4)
  const [notes, setNotes] = useState<string>('')

  // ─── Load & Persist Draft ──────────────────────────────────────────────────

  useEffect(() => {
    AsyncStorage.getItem(WIZARD_DRAFT_KEY).then((data) => {
      if (data) {
        try {
          const draft = JSON.parse(data)
          if (draft.pickupData) setPickupData(draft.pickupData)
          if (draft.dropData) setDropData(draft.dropData)
          if (draft.selectedService) {
            setSelectedService(draft.selectedService)
            setServiceMeta(draft.serviceMeta || DEFAULT_SERVICE_METADATA[draft.selectedService as ServiceTypeKey])
          }
          if (draft.baseFare) setBaseFare(draft.baseFare)
          if (draft.recurrenceType) setRecurrenceType(draft.recurrenceType)
          if (draft.totalSeats) setTotalSeats(draft.totalSeats)
        } catch {}
      }
    })
    // Fetch server saved locations
    api.get('/trips/saved-locations').then((res: any) => {
      if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setSavedLocations(res.data.data)
      }
    }).catch(() => {})
  }, [])

  // Auto-save draft on changes
  const saveDraft = useCallback(() => {
    const draft = {
      pickupData,
      dropData,
      selectedService,
      serviceMeta,
      recurrenceType,
      baseFare,
      totalSeats,
      womenOnly,
      parcelEnabled,
      isNegotiable,
    }
    AsyncStorage.setItem(WIZARD_DRAFT_KEY, JSON.stringify(draft)).catch(() => {})
  }, [pickupData, dropData, selectedService, serviceMeta, recurrenceType, baseFare, totalSeats, womenOnly, parcelEnabled, isNegotiable])

  useEffect(() => {
    saveDraft()
  }, [saveDraft])

  // Fetch Google Directions Polyline when coordinates change
  const fetchRoutePolyline = useCallback(async () => {
    if (!pickupData.latitude || !dropData.latitude) return
    setFetchingRoute(true)
    try {
      const res = await getDirections(
        { lat: pickupData.latitude, lng: pickupData.longitude },
        { lat: dropData.latitude, lng: dropData.longitude }
      )
      if (res) {
        setRouteData(res)
        // Auto-calculate suggested base fare
        const estFare = Math.max(300, Math.round(res.distanceKm * 3.2))
        setBaseFare(String(estFare))
        setMinFare(String(Math.round(estFare * 0.8)))
      }
    } catch (e) {
      console.warn('Failed to calculate route polyline', e)
    } finally {
      setFetchingRoute(false)
    }
  }, [pickupData, dropData])

  useEffect(() => {
    fetchRoutePolyline()
  }, [fetchRoutePolyline])

  // ─── Step Navigation & Validation ──────────────────────────────────────────

  const handleNextStep = () => {
    if (step === 1) {
      if (!pickupData.address || !dropData.address) {
        Alert.alert('Incomplete Route', 'Please specify both pickup and destination locations.')
        return
      }
    } else if (step === 2) {
      if (selectedService === 'organization' && !serviceMeta.organization_name) {
        setServiceMeta({ ...serviceMeta, organization_name: 'COEP Technological University', organization_id: 'org-coep-1' })
      }
    } else if (step === 3) {
      if (!baseFare || parseFloat(baseFare) <= 0) {
        Alert.alert('Invalid Fare', 'Please specify a valid base fare.')
        return
      }
    }
    setStep((prev) => Math.min(prev + 1, 5))
  }

  const handlePrevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1))
  }

  // ─── Publish Trip Action ───────────────────────────────────────────────────

  const handlePublishTrip = async () => {
    setPublishing(true)
    try {
      const payload = {
        pickup_lat: pickupData.latitude,
        pickup_lng: pickupData.longitude,
        destination_lat: dropData.latitude,
        destination_lng: dropData.longitude,
        pickup_address: pickupData.address,
        destination_address: dropData.address,
        pickup_city: pickupData.city || 'Pune',
        destination_city: dropData.city || 'Mumbai',
        departure_time: departureDate.toISOString(),
        total_seats: totalSeats,
        vehicle_type: myVehicles.find((v) => v.id === selectedVehicleId)?.vehicle_type || 'sedan',
        vehicle_id: selectedVehicleId,
        base_fare: parseFloat(baseFare),
        per_km_rate: parseFloat(perKmRate),
        min_fare: minFare ? parseFloat(minFare) : undefined,
        is_negotiable: isNegotiable,
        service_type: selectedService,
        visibility_mode: visibilityMode,
        recurrence_type: recurrenceType,
        max_route_deviation_km: parseFloat(maxRouteDeviationKm) || 3.0,
        max_pickup_radius_km: parseFloat(maxPickupRadiusKm) || 5.0,
        max_pickup_deviation_left_km: parseFloat(maxDeviationLeftKm) || 3.0,
        max_pickup_deviation_right_km: parseFloat(maxDeviationRightKm) || 3.0,
        women_only: womenOnly,
        parcel_enabled: parcelEnabled,
        service_metadata: serviceMeta,
        encoded_polyline: routeData?.encodedPolyline,
        distance_km: routeData?.distanceKm || 150.0,
        notes: notes,
      }

      const res = await api.post('/trips/publish-intercity', payload)
      await AsyncStorage.removeItem(WIZARD_DRAFT_KEY)

      Alert.alert(
        '🎉 Trip Published Successfully!',
        `Your ${SUPPORTED_SERVICES.find((s) => s.key === selectedService)?.title} trip is now active and matching eligible customers.`,
        [
          {
            text: 'View Dashboard',
            onPress: () => router.replace('/(tabs)/'),
          },
        ]
      )
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message || 'Failed to publish trip. Please try again.'
      Alert.alert('Publish Error', msg)
    } finally {
      setPublishing(false)
    }
  }

  // ─── Render Step 1: Visibility & Route ──────────────────────────────────────

  const renderStep1 = () => {
    return (
      <View style={styles.stepContainer}>
        {/* Visibility Option Toggle */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Route Visibility Mode</Text>
          <View style={styles.modeToggleRow}>
            <TouchableOpacity
              style={[styles.modeTab, visibilityMode === 'SPECIFIC_CITY' && styles.modeTabActive]}
              onPress={() => setVisibilityMode('SPECIFIC_CITY')}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="city"
                size={18}
                color={visibilityMode === 'SPECIFIC_CITY' ? '#FFFFFF' : '#64748B'}
              />
              <Text style={[styles.modeTabText, visibilityMode === 'SPECIFIC_CITY' && styles.modeTabTextActive]}>
                Specific City
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTab, visibilityMode === 'HEX_ZONE' && styles.modeTabActive]}
              onPress={() => setVisibilityMode('HEX_ZONE')}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="hexagon-slice-6"
                size={18}
                color={visibilityMode === 'HEX_ZONE' ? '#FFFFFF' : '#64748B'}
              />
              <Text style={[styles.modeTabText, visibilityMode === 'HEX_ZONE' && styles.modeTabTextActive]}>
                Hexagonal Zone
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pickup & Destination Selectors */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Origin & Destination</Text>

          {/* Pickup Control */}
          <View style={styles.locBlock}>
            <View style={styles.locHeaderRow}>
              <View style={[styles.dotIndicator, { backgroundColor: '#10B981' }]} />
              <Text style={styles.locTitle}>PICKUP LOCATION</Text>
            </View>
            <TouchableOpacity
              style={styles.locInputBox}
              onPress={() => setLocationPickerTarget('pickup')}
              activeOpacity={0.8}
            >
              <Feather name="map-pin" size={18} color="#10B981" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.locMainText} numberOfLines={1}>
                  {pickupData.city || 'Select Pickup Location'}
                </Text>
                <Text style={styles.locSubText} numberOfLines={2}>
                  {pickupData.address}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color="#94A3B8" />
            </TouchableOpacity>

            {/* Quick Actions for Pickup */}
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={styles.quickActionChip}
                onPress={() => setSavedLocModalTarget('pickup')}
              >
                <Feather name="bookmark" size={13} color="#3B82F6" />
                <Text style={styles.quickActionText}>Saved Locations</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionChip}
                onPress={() => setLocationPickerTarget('pickup')}
              >
                <MaterialCommunityIcons name="crosshairs-gps" size={13} color="#10B981" />
                <Text style={styles.quickActionText}>Pin on Map</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.routeDivider} />

          {/* Drop Control */}
          <View style={styles.locBlock}>
            <View style={styles.locHeaderRow}>
              <View style={[styles.dotIndicator, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.locTitle}>DROP LOCATION</Text>
            </View>
            <TouchableOpacity
              style={styles.locInputBox}
              onPress={() => setLocationPickerTarget('drop')}
              activeOpacity={0.8}
            >
              <Feather name="map-pin" size={18} color="#EF4444" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.locMainText} numberOfLines={1}>
                  {dropData.city || 'Select Drop Location'}
                </Text>
                <Text style={styles.locSubText} numberOfLines={2}>
                  {dropData.address}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color="#94A3B8" />
            </TouchableOpacity>

            {/* Quick Actions for Drop */}
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={styles.quickActionChip}
                onPress={() => setSavedLocModalTarget('drop')}
              >
                <Feather name="bookmark" size={13} color="#3B82F6" />
                <Text style={styles.quickActionText}>Saved Locations</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionChip}
                onPress={() => setLocationPickerTarget('drop')}
              >
                <MaterialCommunityIcons name="crosshairs-gps" size={13} color="#EF4444" />
                <Text style={styles.quickActionText}>Pin on Map</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Route Preview Mini Map */}
        {routeData && (
          <View style={styles.sectionCard}>
            <View style={styles.routeStatsRow}>
              <View>
                <Text style={styles.statLabel}>DISTANCE</Text>
                <Text style={styles.statVal}>{routeData.distanceKm} km</Text>
              </View>
              <View>
                <Text style={styles.statLabel}>DURATION</Text>
                <Text style={styles.statVal}>{routeData.durationMinutes} min</Text>
              </View>
              <View>
                <Text style={styles.statLabel}>CORRIDOR BUFFER</Text>
                <Text style={styles.statVal}>±{maxRouteDeviationKm} km</Text>
              </View>
            </View>
          </View>
        )}

        {/* Directional Route Configuration */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Directional Deviation & Matching Radius</Text>
          <Text style={styles.sectionSubtext}>
            Only match customers within your preferred highway corridor without long detours.
          </Text>

          <View style={styles.configInputsRow}>
            <View style={styles.configField}>
              <Text style={styles.fieldLabel}>Corridor Buffer (km)</Text>
              <TextInput
                style={styles.fieldInput}
                value={maxRouteDeviationKm}
                onChangeText={setMaxRouteDeviationKm}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.configField}>
              <Text style={styles.fieldLabel}>Max Pickup Radius</Text>
              <TextInput
                style={styles.fieldInput}
                value={maxPickupRadiusKm}
                onChangeText={setMaxPickupRadiusKm}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>
      </View>
    )
  }

  // ─── Render Step 2: Service Selection & Dynamic Configuration ───────────────

  const renderStep2 = () => {
    return (
      <View style={styles.stepContainer}>
        {/* Service Type Carousel / Cards */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Select Service Vertical</Text>
          <Text style={styles.sectionSubtext}>Choose the primary operational category for this trip.</Text>

          <View style={styles.serviceGrid}>
            {SUPPORTED_SERVICES.map((srv) => {
              const isSelected = selectedService === srv.key
              return (
                <TouchableOpacity
                  key={srv.key}
                  style={[styles.serviceCard, isSelected && { borderColor: srv.color, backgroundColor: `${srv.color}10` }]}
                  onPress={() => {
                    setSelectedService(srv.key)
                    setServiceMeta(DEFAULT_SERVICE_METADATA[srv.key])
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.srvIconCircle, { backgroundColor: `${srv.color}20` }]}>
                    <MaterialCommunityIcons name={srv.icon as any} size={22} color={srv.color} />
                  </View>
                  <Text style={[styles.srvTitle, isSelected && { color: srv.color }]}>{srv.title}</Text>
                  <Text style={styles.srvDesc} numberOfLines={2}>{srv.subtitle}</Text>
                  {isSelected && (
                    <View style={[styles.checkBadge, { backgroundColor: srv.color }]}>
                      <Feather name="check" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Dynamic Service Specific Settings */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>{SUPPORTED_SERVICES.find((s) => s.key === selectedService)?.title} Configuration</Text>

          {selectedService === 'cab' && (
            <View style={styles.metaForm}>
              <Text style={styles.fieldLabel}>Trip Purpose</Text>
              <View style={styles.pillRow}>
                {['fixed_route', 'commercial', 'contracted', 'personal'].map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.choicePill, serviceMeta.trip_purpose === p && styles.choicePillActive]}
                    onPress={() => setServiceMeta({ ...serviceMeta, trip_purpose: p })}
                  >
                    <Text style={[styles.choicePillText, serviceMeta.trip_purpose === p && styles.choicePillTextActive]}>
                      {p.replace('_', ' ').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {selectedService === 'transport' && (
            <View style={styles.metaForm}>
              <Text style={styles.fieldLabel}>Accepted Goods Category</Text>
              <View style={styles.pillRow}>
                {['general', 'industrial', 'commercial', 'electronics', 'fragile'].map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.choicePill, serviceMeta.material_category === c && styles.choicePillActive]}
                    onPress={() => setServiceMeta({ ...serviceMeta, material_category: c })}
                  >
                    <Text style={[styles.choicePillText, serviceMeta.material_category === c && styles.choicePillTextActive]}>
                      {c.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Max Weight Capacity (kg)</Text>
              <TextInput
                style={styles.fieldInput}
                value={String(serviceMeta.weight_capacity_kg || 500)}
                onChangeText={(v) => setServiceMeta({ ...serviceMeta, weight_capacity_kg: parseInt(v) || 0 })}
                keyboardType="numeric"
              />
            </View>
          )}

          {selectedService === 'organization' && (
            <View style={styles.metaForm}>
              <Text style={styles.fieldLabel}>Registered Organization / College</Text>
              <View style={styles.orgBox}>
                <Ionicons name="school" size={24} color="#8B5CF6" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.orgNameText}>{serviceMeta.organization_name || 'COEP Technological University'}</Text>
                  <Text style={styles.orgSubText}>Official Campus Route 4 • 28 Registered Students</Text>
                </View>
              </View>
              <Text style={styles.orgNoteText}>
                💡 Students registered for this route will automatically receive high-priority alerts when you reach within 3 KM.
              </Text>
            </View>
          )}

          {selectedService === 'parcel' && (
            <View style={styles.metaForm}>
              <Text style={styles.fieldLabel}>Max Package Weight (kg)</Text>
              <TextInput
                style={styles.fieldInput}
                value={String(serviceMeta.max_weight_kg || 15)}
                onChangeText={(v) => setServiceMeta({ ...serviceMeta, max_weight_kg: parseInt(v) || 0 })}
                keyboardType="numeric"
              />
            </View>
          )}

          {selectedService === 'hotel' && (
            <View style={styles.metaForm}>
              <Text style={styles.fieldLabel}>Hotel / Resort Name</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g. JW Marriott / The Westin Pune"
                value={serviceMeta.hotel_name || ''}
                onChangeText={(v) => setServiceMeta({ ...serviceMeta, hotel_name: v })}
              />
            </View>
          )}

          {selectedService === 'airport' && (
            <View style={styles.metaForm}>
              <Text style={styles.fieldLabel}>Airport & Terminal</Text>
              <TextInput
                style={styles.fieldInput}
                value={serviceMeta.airport_name || 'Pune International Airport (PNQ)'}
                onChangeText={(v) => setServiceMeta({ ...serviceMeta, airport_name: v })}
              />
            </View>
          )}

          {selectedService === 'packers' && (
            <View style={styles.metaForm}>
              <Text style={styles.fieldLabel}>Relocation Size</Text>
              <View style={styles.pillRow}>
                {['1bhk', '2bhk', '3bhk', 'office'].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.choicePill, serviceMeta.move_type === m && styles.choicePillActive]}
                    onPress={() => setServiceMeta({ ...serviceMeta, move_type: m })}
                  >
                    <Text style={[styles.choicePillText, serviceMeta.move_type === m && styles.choicePillTextActive]}>
                      {m.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Schedule & Recurrence Engine */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Trip Schedule & Recurrence</Text>
          <View style={styles.pillRow}>
            {[
              { key: 'DAILY', label: 'Daily Route', icon: 'repeat' },
              { key: 'SPECIFIC_DATE', label: 'Specific Date', icon: 'calendar' },
              { key: 'SCHEDULED', label: 'Scheduled', icon: 'clock' },
            ].map((rec) => (
              <TouchableOpacity
                key={rec.key}
                style={[styles.choicePill, recurrenceType === rec.key && styles.choicePillActive]}
                onPress={() => setRecurrenceType(rec.key as any)}
              >
                <Feather name={rec.icon as any} size={14} color={recurrenceType === rec.key ? '#FFFFFF' : '#64748B'} style={{ marginRight: 6 }} />
                <Text style={[styles.choicePillText, recurrenceType === rec.key && styles.choicePillTextActive]}>
                  {rec.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.dateTimeBtn}
            onPress={() => setShowTimePicker(true)}
          >
            <Feather name="clock" size={18} color="#3B82F6" style={{ marginRight: 10 }} />
            <Text style={styles.dateTimeText}>
              Departure Time: {departureDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </TouchableOpacity>

          {showTimePicker && (
            <DateTimePicker
              value={departureDate}
              mode="time"
              display="default"
              onChange={(evt, date) => {
                setShowTimePicker(false)
                if (date) setDepartureDate(date)
              }}
            />
          )}
        </View>
      </View>
    )
  }

  // ─── Render Step 3: Fare & Restrictions ─────────────────────────────────────

  const renderStep3 = () => {
    return (
      <View style={styles.stepContainer}>
        {/* Pricing Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Pricing & Fares</Text>
          <Text style={styles.sectionSubtext}>Define base fare per passenger seat or cargo parcel.</Text>

          <View style={styles.configInputsRow}>
            <View style={styles.configField}>
              <Text style={styles.fieldLabel}>Base Fare (₹)</Text>
              <TextInput
                style={styles.fieldInput}
                value={baseFare}
                onChangeText={setBaseFare}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.configField}>
              <Text style={styles.fieldLabel}>Min Acceptable (₹)</Text>
              <TextInput
                style={styles.fieldInput}
                value={minFare}
                onChangeText={setMinFare}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Allow Fare Negotiation</Text>
              <Text style={styles.switchDesc}>Customers can send offers within your acceptable price range.</Text>
            </View>
            <Switch
              value={isNegotiable}
              onValueChange={setIsNegotiable}
              trackColor={{ false: '#334155', true: '#3B82F6' }}
            />
          </View>
        </View>

        {/* Restrictions & Constraints */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Trip Restrictions & Preferences</Text>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Women Only Ride</Text>
              <Text style={styles.switchDesc}>Only match verified female passengers for safety.</Text>
            </View>
            <Switch
              value={womenOnly}
              onValueChange={setWomenOnly}
              trackColor={{ false: '#334155', true: '#EC4899' }}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Accept Parcel & Luggage</Text>
              <Text style={styles.switchDesc}>Allow package deliveries and luggage along this route.</Text>
            </View>
            <Switch
              value={parcelEnabled}
              onValueChange={setParcelEnabled}
              trackColor={{ false: '#334155', true: '#10B981' }}
            />
          </View>
        </View>
      </View>
    )
  }

  // ─── Render Step 4: Vehicle & Capacity ──────────────────────────────────────

  const renderStep4 = () => {
    return (
      <View style={styles.stepContainer}>
        {/* Fleet Vehicle Picker */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Assigned Vehicle</Text>
          {myVehicles.map((veh) => {
            const isSelected = selectedVehicleId === veh.id
            return (
              <TouchableOpacity
                key={veh.id}
                style={[styles.vehCard, isSelected && styles.vehCardSelected]}
                onPress={() => {
                  setSelectedVehicleId(veh.id)
                  setTotalSeats(veh.total_seats)
                }}
                activeOpacity={0.8}
              >
                <View style={styles.vehIconBox}>
                  <MaterialCommunityIcons name="car-side" size={24} color={isSelected ? '#3B82F6' : '#94A3B8'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.vehModelText}>{veh.make} {veh.model}</Text>
                  <Text style={styles.vehPlateText}>{veh.registration_number} • {veh.total_seats} Total Seats</Text>
                </View>
                {isSelected && <Feather name="check-circle" size={20} color="#3B82F6" />}
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Seat Capacity Control */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Available Seat Capacity</Text>
          <Text style={styles.sectionSubtext}>Adjust total seats offered for this trip run.</Text>

          <View style={styles.counterRow}>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setTotalSeats((s) => Math.max(1, s - 1))}
            >
              <Feather name="minus" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.counterValBox}>
              <Text style={styles.counterValText}>{totalSeats}</Text>
              <Text style={styles.counterValSub}>Seats Available</Text>
            </View>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setTotalSeats((s) => Math.min(20, s + 1))}
            >
              <Feather name="plus" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Driver Notes */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Pickup Instructions / Driver Notes</Text>
          <TextInput
            style={[styles.fieldInput, { height: 80, textAlignVertical: 'top' }]}
            placeholder="e.g. AC available, Non-smoking vehicle, punctual departure from Swargate"
            placeholderTextColor="#64748B"
            multiline
            value={notes}
            onChangeText={setNotes}
          />
        </View>
      </View>
    )
  }

  // ─── Render Step 5: Review & Publish Preview ────────────────────────────────

  const renderStep5 = () => {
    const srv = SUPPORTED_SERVICES.find((s) => s.key === selectedService)
    const veh = myVehicles.find((v) => v.id === selectedVehicleId)

    return (
      <View style={styles.stepContainer}>
        <View style={styles.reviewBanner}>
          <Text style={styles.reviewBannerTitle}>Ready to Publish Intercity Trip</Text>
          <Text style={styles.reviewBannerSub}>Review all parameters before activating live matching.</Text>
        </View>

        {/* Summary Card */}
        <View style={styles.sectionCard}>
          <View style={styles.reviewRow}>
            <Text style={styles.revLabel}>Service Vertical</Text>
            <View style={styles.revValBadge}>
              <Text style={styles.revValBadgeText}>{srv?.title}</Text>
            </View>
          </View>

          <View style={styles.revDivider} />

          <View style={styles.reviewRow}>
            <Text style={styles.revLabel}>Route</Text>
            <Text style={styles.revValueText}>{pickupData.city} → {dropData.city}</Text>
          </View>
          <Text style={styles.revSubAddress} numberOfLines={1}>📍 {pickupData.address}</Text>
          <Text style={styles.revSubAddress} numberOfLines={1}>🏁 {dropData.address}</Text>

          <View style={styles.revDivider} />

          <View style={styles.reviewRow}>
            <Text style={styles.revLabel}>Schedule</Text>
            <Text style={styles.revValueText}>
              {recurrenceType} • {departureDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>

          <View style={styles.revDivider} />

          <View style={styles.reviewRow}>
            <Text style={styles.revLabel}>Base Fare / Seat</Text>
            <Text style={[styles.revValueText, { color: '#3B82F6', fontWeight: '800' }]}>₹{baseFare}</Text>
          </View>

          <View style={styles.revDivider} />

          <View style={styles.reviewRow}>
            <Text style={styles.revLabel}>Capacity</Text>
            <Text style={styles.revValueText}>{totalSeats} Seats ({veh?.make} {veh?.model})</Text>
          </View>

          <View style={styles.revDivider} />

          <View style={styles.reviewRow}>
            <Text style={styles.revLabel}>Restrictions</Text>
            <Text style={styles.revValueText}>
              {womenOnly ? 'Women Only • ' : 'All Genders • '}
              {parcelEnabled ? 'Parcels OK' : 'No Parcels'}
            </Text>
          </View>
        </View>

        {/* Big Publish CTA */}
        <TouchableOpacity
          style={[styles.publishCTA, publishing && { opacity: 0.7 }]}
          onPress={handlePublishTrip}
          disabled={publishing}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#2563EB', '#1D4ED8']}
            style={styles.publishGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {publishing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.publishCTAText}>Publish Intercity Trip</Text>
                <Feather name="arrow-right" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    )
  }

  // ─── Main Wizard Layout ────────────────────────────────────────────────────

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
          <Feather name="arrow-left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Publish Intercity Trip</Text>
          <Text style={styles.headerStepText}>Step {step} of 5</Text>
        </View>
      </View>

      {/* Stepper Progress Bar */}
      <View style={styles.stepperContainer}>
        {[1, 2, 3, 4, 5].map((s) => (
          <View
            key={s}
            style={[
              styles.stepIndicatorBar,
              s <= step ? styles.stepIndicatorActive : styles.stepIndicatorInactive,
            ]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </ScrollView>

      {/* Bottom Floating Navigation Buttons */}
      {step < 5 && (
        <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {step > 1 ? (
            <TouchableOpacity style={styles.prevBtn} onPress={handlePrevStep} activeOpacity={0.8}>
              <Feather name="arrow-left" size={18} color="#94A3B8" />
              <Text style={styles.prevBtnText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 80 }} />
          )}

          <TouchableOpacity style={styles.nextBtn} onPress={handleNextStep} activeOpacity={0.85}>
            <Text style={styles.nextBtnText}>Continue</Text>
            <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      )}

      {/* Interactive Map Location Picker Modal (matching reference screenshot) */}
      <LocationPickerModal
        visible={locationPickerTarget !== null}
        title={locationPickerTarget === 'pickup' ? 'Select Pickup Location' : 'Select Destination Location'}
        initialLocation={locationPickerTarget === 'pickup' ? pickupData : dropData}
        onClose={() => setLocationPickerTarget(null)}
        onConfirm={(loc) => {
          if (locationPickerTarget === 'pickup') {
            setPickupData(loc)
          } else {
            setDropData(loc)
          }
        }}
      />

      {/* Saved Locations Selector Modal */}
      <Modal
        visible={savedLocModalTarget !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSavedLocModalTarget(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Saved Location</Text>
              <TouchableOpacity onPress={() => setSavedLocModalTarget(null)}>
                <Feather name="x" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={savedLocations}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.savedLocRow}
                  onPress={() => {
                    const locData: SelectedLocationData = {
                      latitude: item.latitude,
                      longitude: item.longitude,
                      address: item.address,
                      city: item.city,
                    }
                    if (savedLocModalTarget === 'pickup') setPickupData(locData)
                    else setDropData(locData)
                    setSavedLocModalTarget(null)
                  }}
                >
                  <View style={styles.savedLocIconBox}>
                    <Feather name="map-pin" size={18} color="#3B82F6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.savedLocLabel}>{item.label}</Text>
                    <Text style={styles.savedLocAddr} numberOfLines={2}>{item.address}</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color="#64748B" />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A0F1D',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerStepText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
  },
  stepperContainer: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  stepIndicatorBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  stepIndicatorActive: {
    backgroundColor: '#3B82F6',
  },
  stepIndicatorInactive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  stepContainer: {
    gap: 16,
  },
  sectionCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  sectionSubtext: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 12,
  },
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 4,
    marginTop: 8,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  modeTabActive: {
    backgroundColor: '#3B82F6',
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  modeTabTextActive: {
    color: '#FFFFFF',
  },
  locBlock: {
    marginVertical: 4,
  },
  locHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  dotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  locTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  locInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  locMainText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  locSubText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  quickActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  routeDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 14,
  },
  routeStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  statVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  configInputsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  configField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  serviceCard: {
    width: (SCREEN_W - 54) / 2,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  srvIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  srvTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  srvDesc: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 15,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaForm: {
    marginTop: 4,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  choicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  choicePillActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  choicePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  choicePillTextActive: {
    color: '#FFFFFF',
  },
  orgBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139,92,246,0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
    marginTop: 4,
  },
  orgNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  orgSubText: {
    fontSize: 12,
    color: '#C4B5FD',
    marginTop: 2,
  },
  orgNoteText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
    lineHeight: 16,
  },
  dateTimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  dateTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  switchDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  vehCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  vehCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59,130,246,0.1)',
  },
  vehIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  vehModelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  vehPlateText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginTop: 10,
  },
  counterBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValBox: {
    alignItems: 'center',
    width: 120,
  },
  counterValText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  counterValSub: {
    fontSize: 12,
    color: '#94A3B8',
  },
  reviewBanner: {
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
  },
  reviewBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#60A5FA',
  },
  reviewBannerSub: {
    fontSize: 12,
    color: '#93C5FD',
    marginTop: 2,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  revLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  revValBadge: {
    backgroundColor: 'rgba(59,130,246,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  revValBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#60A5FA',
  },
  revValueText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  revSubAddress: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  revDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 10,
  },
  publishCTA: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 10,
  },
  publishGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  publishCTAText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0B1120',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  prevBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    gap: 6,
  },
  prevBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  nextBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  savedLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  savedLocIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(59,130,246,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  savedLocLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  savedLocAddr: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
})
