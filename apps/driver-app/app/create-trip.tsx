/**
 * Multi-Step Intercity Trip Creation Wizard — Driver SuperApp
 * ─────────────────────────────────────────────────────────────
 * Complete 5-Step Flow:
 *   Step 1: Visibility & Route (Specific City with Saved Locations CRUD & Map Picker / Hex Zone Multi-Point Selection)
 *   Step 2: Service & Trip Configuration (7 Mobility Verticals: Cab, Transport, Organization, Parcel, Hotel, Airport, Packers & Movers)
 *   Step 3: Fare & 3-Way Restrictions (Base fare, Min fare, Negotiable, Women Only, Parcel, All/General)
 *   Step 4: Vehicle, Capacity Allocation & Driver Notes
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
import { VehicleService, DriverVehicle, VehicleType } from '../src/services/vehicleService'

const WIZARD_DRAFT_KEY = '@driver_trip_wizard_draft_v3'
const { width: SCREEN_W } = Dimensions.get('window')

export const isUUID = (val?: string | null): boolean => {
  if (!val) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim())
}

export const formatErrorMessage = (e: any, fallback = 'An error occurred'): string => {
  const detail = e?.response?.data?.detail ?? e?.response?.data?.message ?? e?.message
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((d: any) => (typeof d === 'string' ? d : d?.msg || JSON.stringify(d))).join('\n')
  }
  if (detail && typeof detail === 'object') {
    return Object.values(detail).map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join('\n')
  }
  return fallback
}

import MapView, { Marker, Polyline, Polygon, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps'

interface SavedLocationItem {
  id: string
  label: string
  address: string
  latitude: number
  longitude: number
  city?: string
  location_type?: string
  is_default?: boolean
}

interface VehicleItem {
  id: string
  make: string
  model: string
  registration_number: string
  vehicle_type: string
  total_seats: number
}

interface HexPointItem {
  id: string
  name: string
  lat: number
  lng: number
  selected: boolean
}

const DEFAULT_SAVED_LOCATIONS: SavedLocationItem[] = []
const DEFAULT_HEX_POINTS: HexPointItem[] = []

export default function CreateTripScreen() {
  const insets = useSafeAreaInsets()
  const [step, setStep] = useState<number>(1) // 1 to 5
  const [publishing, setPublishing] = useState<boolean>(false)

  // ── Step 1: Visibility & Route ──
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

  // Location Picker Modal & Saved Locations CRUD
  const [locationPickerTarget, setLocationPickerTarget] = useState<'pickup' | 'drop' | null>(null)
  const [savedLocModalTarget, setSavedLocModalTarget] = useState<'pickup' | 'drop' | null>(null)
  const [savedLocations, setSavedLocations] = useState<SavedLocationItem[]>(DEFAULT_SAVED_LOCATIONS)
  
  // Saved Location Edit Modal State
  const [showEditLocModal, setShowEditLocModal] = useState<boolean>(false)
  const [editingLocId, setEditingLocId] = useState<string | null>(null)
  const [locFormLabel, setLocFormLabel] = useState<string>('')
  const [locFormAddress, setLocFormAddress] = useState<string>('')
  const [locFormCity, setLocFormCity] = useState<string>('Pune')
  const [locFormLat, setLocFormLat] = useState<number>(18.5204)
  const [locFormLng, setLocFormLng] = useState<number>(73.8567)
  const [savingLoc, setSavingLoc] = useState<boolean>(false)

  // Hex Zone Multi-point Nodes
  const [hexPoints, setHexPoints] = useState<HexPointItem[]>(DEFAULT_HEX_POINTS)

  // Route & Directional Corridor Parameters
  const [maxRouteDeviationKm, setMaxRouteDeviationKm] = useState<string>('3.0')
  const [maxPickupRadiusKm, setMaxPickupRadiusKm] = useState<string>('5.0')
  const [maxDeviationLeftKm, setMaxDeviationLeftKm] = useState<string>('3.0')
  const [maxDeviationRightKm, setMaxDeviationRightKm] = useState<string>('3.0')
  const [routeData, setRouteData] = useState<RouteData | null>(null)
  const [fetchingRoute, setFetchingRoute] = useState<boolean>(false)

  // ── Step 2: Service Selection & Dynamic Metadata ──
  const [selectedService, setSelectedService] = useState<ServiceTypeKey>('cab')
  const [serviceMeta, setServiceMeta] = useState<any>(DEFAULT_SERVICE_METADATA.cab)
  const [recurrenceType, setRecurrenceType] = useState<'DAILY' | 'SPECIFIC_DATE' | 'SCHEDULED'>('DAILY')
  const [departureDate, setDepartureDate] = useState<Date>(new Date(Date.now() + 3600 * 1000 * 2))
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false)
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false)

  // Organization Master Lists
  const [orgList, setOrgList] = useState<any[]>([])
  const [orgRoutes, setOrgRoutes] = useState<any[]>([])
  const [routeMembers, setRouteMembers] = useState<any[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState<string>('')
  const [selectedRouteId, setSelectedRouteId] = useState<string>('')

  // ── Step 3: Fare & 3-Way Restrictions ──
  const [baseFare, setBaseFare] = useState<string>('450')
  const [perKmRate, setPerKmRate] = useState<string>('3.5')
  const [minFare, setMinFare] = useState<string>('350')
  const [isNegotiable, setIsNegotiable] = useState<boolean>(true)
  const [restrictionMode, setRestrictionMode] = useState<'ALL' | 'WOMEN_ONLY' | 'PARCEL_OK'>('ALL')
  const [womenOnly, setWomenOnly] = useState<boolean>(false)
  const [parcelEnabled, setParcelEnabled] = useState<boolean>(true)

  // ── Step 4: Vehicle & Capacity Allocation ──
  const [myVehicles, setMyVehicles] = useState<VehicleItem[]>([])
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('')
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType>('sedan')
  const [totalSeats, setTotalSeats] = useState<number>(4)
  const [notes, setNotes] = useState<string>('')
  const [loadingVehicles, setLoadingVehicles] = useState<boolean>(true)

  // ─── Load & Persist Draft & Master Data ──────────────────────────────────────

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
          if (draft.restrictionMode) setRestrictionMode(draft.restrictionMode)
        } catch {}
      }
    })

    // Fetch real registered driver vehicles
    setLoadingVehicles(true)
    VehicleService.getVehicles()
      .then((vehicles) => {
        if (vehicles && vehicles.length > 0) {
          const mappedVehicles: VehicleItem[] = vehicles.map((v) => ({
            id: v.id,
            make: v.make || 'Vehicle',
            model: v.model || '',
            registration_number: v.registration_number || 'MH12XX0000',
            vehicle_type: v.vehicle_type || 'sedan',
            total_seats: v.seat_capacity || 4,
          }))
          setMyVehicles(mappedVehicles)
          const active = vehicles.find((v) => v.is_active) || vehicles[0]
          if (active) {
            setSelectedVehicleId(active.id)
            setSelectedVehicleType((active.vehicle_type as VehicleType) || 'sedan')
            setTotalSeats(active.seat_capacity || 4)
          }
        }
      })
      .catch((err) => {
        console.warn('[CreateTrip] Failed to load driver vehicles:', err)
      })
      .finally(() => {
        setLoadingVehicles(false)
      })

    // Fetch driver saved locations & saved addresses
    AsyncStorage.getItem('driver_saved_addresses').then((str) => {
      if (str) {
        try {
          const parsed = JSON.parse(str)
          const extraLocs: SavedLocationItem[] = []
          if (parsed.home) {
            extraLocs.push({
              id: 'home_loc',
              label: 'Home',
              address: parsed.home.address,
              latitude: parsed.home.latitude,
              longitude: parsed.home.longitude,
              city: parsed.home.city || 'Pune',
              location_type: 'home',
              is_default: true,
            })
          }
          if (parsed.office) {
            extraLocs.push({
              id: 'office_loc',
              label: 'Office / Hub',
              address: parsed.office.address,
              latitude: parsed.office.latitude,
              longitude: parsed.office.longitude,
              city: parsed.office.city || 'Pune',
              location_type: 'office',
            })
          }
          if (parsed.other) {
            extraLocs.push({
              id: 'other_loc',
              label: 'Base Hub',
              address: parsed.other.address,
              latitude: parsed.other.latitude,
              longitude: parsed.other.longitude,
              city: parsed.other.city || 'Pune',
              location_type: 'other',
            })
          }
          if (extraLocs.length > 0) {
            setSavedLocations((prev) => [...extraLocs, ...prev.filter((p) => !extraLocs.some((e) => e.id === p.id))])
          }
        } catch {}
      }
    })

    api.get('/trips/saved-locations').then((res: any) => {
      if (res.data?.data && Array.isArray(res.data.data)) {
        setSavedLocations((prev) => [...res.data.data, ...prev])
      }
    }).catch(() => {})

    // Fetch registered organizations
    api.get('/trips/organizations').then((res: any) => {
      if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setOrgList(res.data.data)
        const first = res.data.data[0]
        setSelectedOrgId(first.id)
        loadOrgRoutes(first.id)
      }
    }).catch(() => {})
  }, [])

  const loadOrgRoutes = async (orgId: string) => {
    try {
      const res = await api.get(`/trips/organizations/${orgId}/routes`)
      if (res.data?.data && Array.isArray(res.data.data)) {
        setOrgRoutes(res.data.data)
        if (res.data.data.length > 0) {
          const firstRoute = res.data.data[0]
          setSelectedRouteId(firstRoute.id)
          loadRouteMembers(firstRoute.id)
        }
      }
    } catch {}
  }

  const loadRouteMembers = async (routeId: string) => {
    try {
      const res = await api.get(`/trips/organizations/routes/${routeId}/members`)
      if (res.data?.data && Array.isArray(res.data.data)) {
        setRouteMembers(res.data.data)
      }
    } catch {}
  }

  // Update restriction flags on mode change
  useEffect(() => {
    if (restrictionMode === 'WOMEN_ONLY') {
      setWomenOnly(true)
      setParcelEnabled(false)
    } else if (restrictionMode === 'PARCEL_OK') {
      setWomenOnly(false)
      setParcelEnabled(true)
    } else {
      setWomenOnly(false)
      setParcelEnabled(true)
    }
  }, [restrictionMode])

  // Auto-save draft
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
      restrictionMode,
    }
    AsyncStorage.setItem(WIZARD_DRAFT_KEY, JSON.stringify(draft)).catch(() => {})
  }, [pickupData, dropData, selectedService, serviceMeta, recurrenceType, baseFare, totalSeats, womenOnly, parcelEnabled, isNegotiable, restrictionMode])

  useEffect(() => {
    saveDraft()
  }, [saveDraft])

  // Fetch Polyline when coordinates change
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

  // ─── Saved Location CRUD Operations ────────────────────────────────────────

  const handleOpenAddSavedLoc = () => {
    setEditingLocId(null)
    setLocFormLabel('')
    setLocFormAddress('')
    setLocFormCity('Pune')
    setLocFormLat(18.5204)
    setLocFormLng(73.8567)
    setShowEditLocModal(true)
  }

  const handleOpenEditSavedLoc = (item: SavedLocationItem) => {
    setEditingLocId(item.id)
    setLocFormLabel(item.label)
    setLocFormAddress(item.address)
    setLocFormCity(item.city || 'Pune')
    setLocFormLat(item.latitude)
    setLocFormLng(item.longitude)
    setShowEditLocModal(true)
  }

  const handleSaveLocationForm = async () => {
    if (!locFormLabel.trim() || !locFormAddress.trim()) {
      Alert.alert('Incomplete Details', 'Please provide both label and address.')
      return
    }
    setSavingLoc(true)
    try {
      const payload = {
        label: locFormLabel.trim(),
        address: locFormAddress.trim(),
        city: locFormCity.trim(),
        latitude: locFormLat,
        longitude: locFormLng,
        location_type: 'both',
      }

      if (editingLocId && isUUID(editingLocId)) {
        const res = await api.put(`/trips/saved-locations/${editingLocId}`, payload)
        const updated = res.data?.data || { id: editingLocId, ...payload }
        setSavedLocations((prev) =>
          prev.map((l) => (l.id === editingLocId ? { ...l, ...updated } : l))
        )
      } else {
        const res = await api.post('/trips/saved-locations', payload)
        const newLoc = res.data?.data
        if (newLoc) {
          setSavedLocations((prev) => [newLoc, ...prev])
        }
      }
      setShowEditLocModal(false)
    } catch (e: any) {
      Alert.alert('Save Location Error', formatErrorMessage(e, 'Failed to save location.'))
    } finally {
      setSavingLoc(false)
    }
  }

  const handleDeleteSavedLocation = async (id: string) => {
    Alert.alert('Delete Location', 'Are you sure you want to remove this saved location?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (isUUID(id)) {
            try {
              await api.delete(`/trips/saved-locations/${id}`)
            } catch {}
          }
          setSavedLocations((prev) => prev.filter((l) => l.id !== id))
        },
      },
    ])
  }

  // ─── Hex Zone Multi-Point Selection Toggle ─────────────────────────────────

  const handleToggleHexPoint = (pointId: string) => {
    setHexPoints((prev) =>
      prev.map((p) => (p.id === pointId ? { ...p, selected: !p.selected } : p))
    )
  }

  // ─── Step Navigation ───────────────────────────────────────────────────────

  const handleNextStep = () => {
    if (step === 1) {
      if (!pickupData.address || !dropData.address) {
        Alert.alert('Incomplete Route', 'Please specify both pickup and destination locations.')
        return
      }
    } else if (step === 2) {
      if (selectedService === 'organization') {
        const currentOrg = orgList.find((o) => o.id === selectedOrgId)
        const currentRoute = orgRoutes.find((r) => r.id === selectedRouteId)
        setServiceMeta({
          ...serviceMeta,
          organization_id: selectedOrgId,
          organization_name: currentOrg?.name || 'COEP Technological University',
          route_id: selectedRouteId,
          route_name: currentRoute?.route_name || 'Campus Express Line 1',
        })
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
      const selectedHexes = hexPoints.filter((p) => p.selected).map((p) => ({ lat: p.lat, lng: p.lng }))
      const matchedVeh = myVehicles.find((v) => v.id === selectedVehicleId)
      const effectiveVehicleType = matchedVeh?.vehicle_type || selectedVehicleType || 'sedan'

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
        vehicle_type: effectiveVehicleType,
        vehicle_id: isUUID(selectedVehicleId) ? selectedVehicleId : undefined,
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
        organization_id: selectedService === 'organization' && isUUID(selectedOrgId) ? selectedOrgId : undefined,
        encoded_polyline: routeData?.encodedPolyline,
        distance_km: routeData?.distanceKm || 150.0,
        pickup_polygon: visibilityMode === 'HEX_ZONE' && selectedHexes.length >= 3 ? selectedHexes : undefined,
        notes: notes,
      }

      await api.post('/trips/publish-intercity', payload)
      await AsyncStorage.removeItem(WIZARD_DRAFT_KEY)

      Alert.alert(
        '🎉 Trip Published Successfully!',
        `Your ${SUPPORTED_SERVICES.find((s) => s.key === selectedService)?.title} trip is now active and matching eligible customer requests.`,
        [
          {
            text: 'View My Trips',
            onPress: () => router.replace('/my-trips'),
          },
        ]
      )
    } catch (e: any) {
      Alert.alert('Publish Error', formatErrorMessage(e, 'Failed to publish trip.'))
    } finally {
      setPublishing(false)
    }
  }

  // ─── Render Step 1: Visibility & Route ──────────────────────────────────────

  const renderStep1 = () => {
    return (
      <View style={styles.stepContainer}>
        {/* Visibility Mode Selector */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Route Visibility & Geofence Mode</Text>
          <Text style={styles.sectionSubtext}>Choose how customer requests are captured along your route.</Text>

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

        {/* Specific City Origin & Drop Selectors */}
        {visibilityMode === 'SPECIFIC_CITY' ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>Origin & Destination</Text>

            {/* Pickup */}
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
                  <Text style={styles.locMainText} numberOfLines={1}>{pickupData.city || 'Select Pickup'}</Text>
                  <Text style={styles.locSubText} numberOfLines={2}>{pickupData.address}</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#94A3B8" />
              </TouchableOpacity>

              <View style={styles.quickActionsRow}>
                {savedLocations.find((l) => l.id === 'home_loc' || l.location_type === 'home') && (
                  <TouchableOpacity
                    style={[styles.quickActionChip, { borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.1)' }]}
                    onPress={() => {
                      const h = savedLocations.find((l) => l.id === 'home_loc' || l.location_type === 'home')
                      if (h) setPickupData({ latitude: h.latitude, longitude: h.longitude, address: h.address, city: h.city || 'Pune' })
                    }}
                  >
                    <Text style={{ fontSize: 12 }}>🏠</Text>
                    <Text style={[styles.quickActionText, { color: '#10B981', fontWeight: '800' }]}>Home</Text>
                  </TouchableOpacity>
                )}
                {savedLocations.find((l) => l.id === 'office_loc' || l.location_type === 'office') && (
                  <TouchableOpacity
                    style={[styles.quickActionChip, { borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.1)' }]}
                    onPress={() => {
                      const o = savedLocations.find((l) => l.id === 'office_loc' || l.location_type === 'office')
                      if (o) setPickupData({ latitude: o.latitude, longitude: o.longitude, address: o.address, city: o.city || 'Pune' })
                    }}
                  >
                    <Text style={{ fontSize: 12 }}>🏢</Text>
                    <Text style={[styles.quickActionText, { color: '#60A5FA', fontWeight: '800' }]}>Office</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.quickActionChip}
                  onPress={() => setSavedLocModalTarget('pickup')}
                >
                  <Feather name="bookmark" size={13} color="#3B82F6" />
                  <Text style={styles.quickActionText}>Saved</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickActionChip}
                  onPress={() => setLocationPickerTarget('pickup')}
                >
                  <MaterialCommunityIcons name="crosshairs-gps" size={13} color="#10B981" />
                  <Text style={styles.quickActionText}>Pin Map</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.routeDivider} />

            {/* Drop */}
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
                  <Text style={styles.locMainText} numberOfLines={1}>{dropData.city || 'Select Drop'}</Text>
                  <Text style={styles.locSubText} numberOfLines={2}>{dropData.address}</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#94A3B8" />
              </TouchableOpacity>

              <View style={styles.quickActionsRow}>
                {savedLocations.find((l) => l.id === 'office_loc' || l.location_type === 'office') && (
                  <TouchableOpacity
                    style={[styles.quickActionChip, { borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.1)' }]}
                    onPress={() => {
                      const o = savedLocations.find((l) => l.id === 'office_loc' || l.location_type === 'office')
                      if (o) setDropData({ latitude: o.latitude, longitude: o.longitude, address: o.address, city: o.city || 'Pune' })
                    }}
                  >
                    <Text style={{ fontSize: 12 }}>🏢</Text>
                    <Text style={[styles.quickActionText, { color: '#60A5FA', fontWeight: '800' }]}>Office</Text>
                  </TouchableOpacity>
                )}
                {savedLocations.find((l) => l.id === 'home_loc' || l.location_type === 'home') && (
                  <TouchableOpacity
                    style={[styles.quickActionChip, { borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.1)' }]}
                    onPress={() => {
                      const h = savedLocations.find((l) => l.id === 'home_loc' || l.location_type === 'home')
                      if (h) setDropData({ latitude: h.latitude, longitude: h.longitude, address: h.address, city: h.city || 'Pune' })
                    }}
                  >
                    <Text style={{ fontSize: 12 }}>🏠</Text>
                    <Text style={[styles.quickActionText, { color: '#10B981', fontWeight: '800' }]}>Home</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.quickActionChip}
                  onPress={() => setSavedLocModalTarget('drop')}
                >
                  <Feather name="bookmark" size={13} color="#3B82F6" />
                  <Text style={styles.quickActionText}>Saved</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickActionChip}
                  onPress={() => setLocationPickerTarget('drop')}
                >
                  <MaterialCommunityIcons name="crosshairs-gps" size={13} color="#EF4444" />
                  <Text style={styles.quickActionText}>Pin Map</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          /* Hexagonal Zone Multi-Point Selector */
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>Hexagonal Geofence Pickup Points</Text>
            <Text style={styles.sectionSubtext}>
              Select multiple pick-up nodes. Only customer requests within these geofence points will be shown to you.
            </Text>

            <View style={styles.hexListContainer}>
              {hexPoints.map((hp) => (
                <TouchableOpacity
                  key={hp.id}
                  style={[styles.hexChip, hp.selected && styles.hexChipSelected]}
                  onPress={() => handleToggleHexPoint(hp.id)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name={hp.selected ? 'hexagon' : 'hexagon-outline'}
                    size={18}
                    color={hp.selected ? '#3B82F6' : '#94A3B8'}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={[styles.hexChipText, hp.selected && styles.hexChipTextSelected]}>
                    {hp.name}
                  </Text>
                  {hp.selected && <Feather name="check" size={14} color="#3B82F6" style={{ marginLeft: 6 }} />}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.hexSummaryBadge}>
              <Feather name="info" size={14} color="#3B82F6" />
              <Text style={styles.hexSummaryText}>
                {hexPoints.filter((p) => p.selected).length} Active Pickup Nodes in Polygon Corridor
              </Text>
            </View>
          </View>
        )}

        {/* Route Preview Stats */}
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

        {/* Corridor Configuration (Left/Right Deviation) */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Corridor Buffer & Highway Deviation</Text>
          <Text style={styles.sectionSubtext}>
            Control exactly how far left and right from your highway route you are willing to detour for customer pickups.
          </Text>

          <View style={styles.configInputsRow}>
            <View style={styles.configField}>
              <Text style={styles.fieldLabel}>Left Deviation (km)</Text>
              <TextInput
                style={styles.fieldInput}
                value={maxDeviationLeftKm}
                onChangeText={setMaxDeviationLeftKm}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.configField}>
              <Text style={styles.fieldLabel}>Right Deviation (km)</Text>
              <TextInput
                style={styles.fieldInput}
                value={maxDeviationRightKm}
                onChangeText={setMaxDeviationRightKm}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.configField}>
              <Text style={styles.fieldLabel}>Max Pickup Radius (km)</Text>
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
        {/* Service Vertical Grid */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Select Service Vertical</Text>
          <Text style={styles.sectionSubtext}>Choose the operational category for this published trip.</Text>

          <View style={styles.serviceGrid}>
            {SUPPORTED_SERVICES.map((srv) => {
              const isSelected = selectedService === srv.key
              return (
                <TouchableOpacity
                  key={srv.key}
                  style={[styles.serviceCard, isSelected && { borderColor: srv.color, backgroundColor: `${srv.color}12` }]}
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

        {/* Dynamic Vertical Configuration Forms */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>{SUPPORTED_SERVICES.find((s) => s.key === selectedService)?.title} Configuration</Text>

          {/* 1. Cab Service */}
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

          {/* 2. Transport / Goods */}
          {selectedService === 'transport' && (
            <View style={styles.metaForm}>
              <Text style={styles.fieldLabel}>Accepted Goods Category</Text>
              <View style={styles.pillRow}>
                {['industrial', 'electronics', 'commercial', 'machinery', 'general', 'fragile'].map((c) => (
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

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Payload Weight Capacity (kg)</Text>
              <TextInput
                style={styles.fieldInput}
                value={String(serviceMeta.weight_capacity_kg || 750)}
                onChangeText={(v) => setServiceMeta({ ...serviceMeta, weight_capacity_kg: parseInt(v) || 0 })}
                keyboardType="numeric"
              />
            </View>
          )}

          {/* 3. Organization (College & Corporate) */}
          {selectedService === 'organization' && (
            <View style={styles.metaForm}>
              <Text style={styles.fieldLabel}>Select Registered College / Corporate Organization</Text>
              <View style={styles.orgDropdownList}>
                {orgList.map((org) => {
                  const isSelected = selectedOrgId === org.id
                  return (
                    <TouchableOpacity
                      key={org.id}
                      style={[styles.orgCard, isSelected && styles.orgCardSelected]}
                      onPress={() => {
                        setSelectedOrgId(org.id)
                        loadOrgRoutes(org.id)
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={org.org_type === 'college' ? 'school' : 'business'} size={20} color={isSelected ? '#8B5CF6' : '#94A3B8'} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={[styles.orgCardTitle, isSelected && { color: '#8B5CF6' }]}>{org.name}</Text>
                        <Text style={styles.orgCardSub}>{org.code} • {org.city}</Text>
                      </View>
                      {isSelected && <Feather name="check-circle" size={18} color="#8B5CF6" />}
                    </TouchableOpacity>
                  )
                })}
              </View>

              {orgRoutes.length > 0 && (
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.fieldLabel}>Designated Route</Text>
                  {orgRoutes.map((rt) => {
                    const isSelected = selectedRouteId === rt.id
                    return (
                      <TouchableOpacity
                        key={rt.id}
                        style={[styles.routeCardItem, isSelected && styles.routeCardItemSelected]}
                        onPress={() => {
                          setSelectedRouteId(rt.id)
                          loadRouteMembers(rt.id)
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.routeItemTitle}>{rt.route_name}</Text>
                          <Text style={styles.routeItemTime}>🕒 {rt.scheduled_start_time} - {rt.scheduled_end_time} • Capacity: {rt.capacity}</Text>
                        </View>
                        {isSelected && <Feather name="check" size={16} color="#8B5CF6" />}
                      </TouchableOpacity>
                    )
                  })}
                </View>
              )}

              {routeMembers.length > 0 && (
                <View style={styles.rosterContainer}>
                  <Text style={styles.fieldLabel}>Enrolled Student Roster ({routeMembers.length} Registered)</Text>
                  {routeMembers.slice(0, 3).map((m, idx) => (
                    <View key={m.id || idx} style={styles.memberRow}>
                      <Feather name="user" size={14} color="#A78BFA" />
                      <Text style={styles.memberName}>{m.registration_no || `Student #${idx + 1}`}</Text>
                      <Text style={styles.memberStop} numberOfLines={1}>📍 {m.pickup_address}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.proximityAlertNotice}>
                <Ionicons name="notifications-circle" size={22} color="#10B981" />
                <Text style={styles.proximityAlertText}>
                  🔔 High-Priority Proximity System: When you reach within 3 KM of students, incoming call simulation, ringing and vibration alerts will be triggered automatically.
                </Text>
              </View>
            </View>
          )}

          {/* 4. Parcel Delivery */}
          {selectedService === 'parcel' && (
            <View style={styles.metaForm}>
              <Text style={styles.fieldLabel}>Max Package Weight (kg)</Text>
              <TextInput
                style={styles.fieldInput}
                value={String(serviceMeta.max_weight_kg || 25)}
                onChangeText={(v) => setServiceMeta({ ...serviceMeta, max_weight_kg: parseInt(v) || 0 })}
                keyboardType="numeric"
              />
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Dimensions (L x W x H cm)</Text>
              <TextInput
                style={styles.fieldInput}
                value={serviceMeta.max_dimensions || '60x40x40 cm'}
                onChangeText={(v) => setServiceMeta({ ...serviceMeta, max_dimensions: v })}
              />
            </View>
          )}

          {/* 5. Hotel Transfer */}
          {selectedService === 'hotel' && (
            <View style={styles.metaForm}>
              <Text style={styles.fieldLabel}>Hotel / Resort Name</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g. JW Marriott / The Ritz-Carlton"
                placeholderTextColor="#64748B"
                value={serviceMeta.hotel_name || ''}
                onChangeText={(v) => setServiceMeta({ ...serviceMeta, hotel_name: v })}
              />
            </View>
          )}

          {/* 6. Airport Transfer */}
          {selectedService === 'airport' && (
            <View style={styles.metaForm}>
              <Text style={styles.fieldLabel}>Airport & Terminal</Text>
              <TextInput
                style={styles.fieldInput}
                value={serviceMeta.airport_name || 'Pune International Airport (PNQ) - Terminal 2'}
                onChangeText={(v) => setServiceMeta({ ...serviceMeta, airport_name: v })}
              />
            </View>
          )}

          {/* 7. Packers & Movers */}
          {selectedService === 'packers' && (
            <View style={styles.metaForm}>
              <Text style={styles.fieldLabel}>Relocation Size</Text>
              <View style={styles.pillRow}>
                {['1bhk', '2bhk', '3bhk', 'villa', 'office'].map((m) => (
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

        {/* Schedule & Recurrence Selection */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Trip Schedule & Recurrence Type</Text>
          <View style={styles.pillRow}>
            {[
              { key: 'DAILY', label: 'Daily Route', icon: 'repeat' },
              { key: 'SPECIFIC_DATE', label: 'Specific Day', icon: 'calendar' },
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

  // ─── Render Step 3: Fare & 3-Way Restrictions ───────────────────────────────

  const renderStep3 = () => {
    return (
      <View style={styles.stepContainer}>
        {/* Pricing Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Pricing & Fares</Text>
          <Text style={styles.sectionSubtext}>Define base fare per passenger seat or freight consignment.</Text>

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

        {/* 3-Way Restrictions & Matching Modes */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Matching Restrictions & Preferences</Text>
          <Text style={styles.sectionSubtext}>Choose who can book this ride or cargo space.</Text>

          <View style={styles.restrictionList}>
            {/* Mode 1: Women Only */}
            <TouchableOpacity
              style={[styles.restrictionOption, restrictionMode === 'WOMEN_ONLY' && styles.restrictionOptionActive]}
              onPress={() => setRestrictionMode('WOMEN_ONLY')}
              activeOpacity={0.8}
            >
              <View style={[styles.restIconBox, { backgroundColor: '#EC489920' }]}>
                <MaterialCommunityIcons name="human-female" size={20} color="#EC4899" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.restTitle}>Only Women Trip</Text>
                <Text style={styles.restDesc}>Only match verified female passengers for safety.</Text>
              </View>
              {restrictionMode === 'WOMEN_ONLY' && <Feather name="check-circle" size={20} color="#EC4899" />}
            </TouchableOpacity>

            {/* Mode 2: Accept Parcel & Luggage */}
            <TouchableOpacity
              style={[styles.restrictionOption, restrictionMode === 'PARCEL_OK' && styles.restrictionOptionActive]}
              onPress={() => setRestrictionMode('PARCEL_OK')}
              activeOpacity={0.8}
            >
              <View style={[styles.restIconBox, { backgroundColor: '#10B98120' }]}>
                <MaterialCommunityIcons name="package-variant-closed" size={20} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.restTitle}>Accept Parcel & Luggage</Text>
                <Text style={styles.restDesc}>Accept package deliveries along your passenger corridor.</Text>
              </View>
              {restrictionMode === 'PARCEL_OK' && <Feather name="check-circle" size={20} color="#10B981" />}
            </TouchableOpacity>

            {/* Mode 3: All / General */}
            <TouchableOpacity
              style={[styles.restrictionOption, restrictionMode === 'ALL' && styles.restrictionOptionActive]}
              onPress={() => setRestrictionMode('ALL')}
              activeOpacity={0.8}
            >
              <View style={[styles.restIconBox, { backgroundColor: '#3B82F620' }]}>
                <MaterialCommunityIcons name="account-group" size={20} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.restTitle}>All Passengers (General)</Text>
                <Text style={styles.restDesc}>No gender restrictions — open for all passengers.</Text>
              </View>
              {restrictionMode === 'ALL' && <Feather name="check-circle" size={20} color="#3B82F6" />}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )
  }

  // ─── Render Step 4: Vehicle & Capacity Allocation ───────────────────────────

  const renderStep4 = () => {
    const VEHICLE_TYPES: { key: VehicleType; label: string; icon: string; defaultSeats: number }[] = [
      { key: 'sedan', label: 'Sedan', icon: 'car-side', defaultSeats: 4 },
      { key: 'suv', label: 'SUV / XL', icon: 'car-estate', defaultSeats: 6 },
      { key: 'hatchback', label: 'Hatchback', icon: 'car-hatchback', defaultSeats: 4 },
      { key: 'tempo_traveller', label: 'Tempo Traveller', icon: 'van-passenger', defaultSeats: 12 },
      { key: 'mini_bus', label: 'Mini Bus', icon: 'bus', defaultSeats: 20 },
      { key: 'bike', label: 'Bike / Two-Wheeler', icon: 'motorbike', defaultSeats: 1 },
    ]

    return (
      <View style={styles.stepContainer}>
        {/* Fleet Vehicle Picker */}
        <View style={styles.sectionCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={styles.sectionHeading}>Assigned Vehicle</Text>
            <TouchableOpacity
              onPress={() => router.push('/vehicle/add' as any)}
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <Feather name="plus-circle" size={14} color="#3B82F6" />
              <Text style={{ fontSize: 13, color: '#3B82F6', fontWeight: '600', marginLeft: 4 }}>Add Vehicle</Text>
            </TouchableOpacity>
          </View>

          {loadingVehicles ? (
            <ActivityIndicator size="small" color="#3B82F6" style={{ marginVertical: 12 }} />
          ) : myVehicles.length > 0 ? (
            myVehicles.map((veh) => {
              const isSelected = selectedVehicleId === veh.id
              return (
                <TouchableOpacity
                  key={veh.id}
                  style={[styles.vehCard, isSelected && styles.vehCardSelected]}
                  onPress={() => {
                    setSelectedVehicleId(veh.id)
                    setSelectedVehicleType((veh.vehicle_type as VehicleType) || 'sedan')
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
            })
          ) : (
            <View>
              <Text style={styles.sectionSubtext}>Select vehicle category for this trip route:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {VEHICLE_TYPES.map((vt) => {
                  const isSelected = selectedVehicleType === vt.key
                  return (
                    <TouchableOpacity
                      key={vt.key}
                      style={[
                        {
                          paddingVertical: 10,
                          paddingHorizontal: 14,
                          borderRadius: 10,
                          backgroundColor: isSelected ? '#3B82F620' : '#1E293B',
                          borderWidth: 1,
                          borderColor: isSelected ? '#3B82F6' : '#334155',
                          flexDirection: 'row',
                          alignItems: 'center',
                        },
                      ]}
                      onPress={() => {
                        setSelectedVehicleType(vt.key)
                        setTotalSeats(vt.defaultSeats)
                      }}
                    >
                      <MaterialCommunityIcons name={vt.icon as any} size={18} color={isSelected ? '#3B82F6' : '#94A3B8'} style={{ marginRight: 6 }} />
                      <Text style={{ color: isSelected ? '#FFFFFF' : '#94A3B8', fontWeight: isSelected ? '700' : '500', fontSize: 13 }}>
                        {vt.label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          )}
        </View>

        {/* Seat Capacity Counter */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Available Seat Capacity</Text>
          <Text style={styles.sectionSubtext}>Adjust available seats offered for this trip.</Text>

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
              onPress={() => setTotalSeats((s) => Math.min(60, s + 1))}
            >
              <Feather name="plus" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Driver Notes */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Driver Notes & Pickup Instructions</Text>
          <TextInput
            style={[styles.fieldInput, { height: 80, textAlignVertical: 'top' }]}
            placeholder="e.g. AC available, Non-smoking vehicle, punctual departure"
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
    const vehLabel = veh ? `${veh.make} ${veh.model}` : (selectedVehicleType || 'Sedan').toUpperCase()

    return (
      <View style={styles.stepContainer}>
        <View style={styles.reviewBanner}>
          <Text style={styles.reviewBannerTitle}>Ready to Publish Trip</Text>
          <Text style={styles.reviewBannerSub}>Review all parameters before activating live matching.</Text>
        </View>

        {/* Itemized Summary Card */}
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
            <Text style={styles.revLabel}>Schedule & Recurrence</Text>
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
            <Text style={styles.revValueText}>{totalSeats} Seats ({vehLabel})</Text>
          </View>

          <View style={styles.revDivider} />

          <View style={styles.reviewRow}>
            <Text style={styles.revLabel}>Matching Mode</Text>
            <Text style={styles.revValueText}>
              {womenOnly ? 'Women Only' : restrictionMode === 'PARCEL_OK' ? 'Parcels OK' : 'All Passengers'}
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

  // ─── Main Layout ───────────────────────────────────────────────────────────

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

      {/* Bottom Floating Navigation */}
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

      {/* Map Location Picker Modal */}
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

      {/* Saved Locations Selector & Edit Modal */}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity onPress={handleOpenAddSavedLoc} style={styles.addLocHeaderBtn}>
                  <Feather name="plus" size={16} color="#3B82F6" />
                  <Text style={styles.addLocHeaderText}>Add New</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSavedLocModalTarget(null)}>
                  <Feather name="x" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            <FlatList
              data={savedLocations}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.savedLocRowWrapper}>
                  <TouchableOpacity
                    style={styles.savedLocRow}
                    onPress={() => {
                      const locData: SelectedLocationData = {
                        latitude: item.latitude,
                        longitude: item.longitude,
                        address: item.address,
                        city: item.city || 'Pune',
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
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.locActionBtn}
                    onPress={() => handleOpenEditSavedLoc(item)}
                  >
                    <Feather name="edit-2" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.locActionBtn}
                    onPress={() => handleDeleteSavedLocation(item.id)}
                  >
                    <Feather name="trash-2" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Edit / Add Saved Location Modal Form */}
      <Modal
        visible={showEditLocModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowEditLocModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.editLocCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingLocId ? 'Edit Saved Location' : 'Add New Location'}</Text>
              <TouchableOpacity onPress={() => setShowEditLocModal(false)}>
                <Feather name="x" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Location Label</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g. Swargate Hub / Dadar Station"
              placeholderTextColor="#64748B"
              value={locFormLabel}
              onChangeText={setLocFormLabel}
            />

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Full Address</Text>
            <TextInput
              style={[styles.fieldInput, { height: 60, textAlignVertical: 'top' }]}
              placeholder="e.g. Swargate Bus Stand, Swargate, Pune"
              placeholderTextColor="#64748B"
              multiline
              value={locFormAddress}
              onChangeText={setLocFormAddress}
            />

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>City</Text>
            <TextInput
              style={styles.fieldInput}
              value={locFormCity}
              onChangeText={setLocFormCity}
            />

            <TouchableOpacity
              style={styles.saveLocModalBtn}
              onPress={handleSaveLocationForm}
              disabled={savingLoc}
            >
              {savingLoc ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveLocModalBtnText}>Save Location</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0F1D' },
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  headerStepText: { fontSize: 12, color: '#3B82F6', fontWeight: '600' },
  stepperContainer: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingVertical: 10 },
  stepIndicatorBar: { flex: 1, height: 4, borderRadius: 2 },
  stepIndicatorActive: { backgroundColor: '#3B82F6' },
  stepIndicatorInactive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  scrollContent: { padding: 16, paddingBottom: 110 },
  stepContainer: { gap: 16 },
  sectionCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sectionHeading: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  sectionSubtext: { fontSize: 12, color: '#94A3B8', marginBottom: 12 },
  modeToggleRow: { flexDirection: 'row', gap: 10 },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    gap: 8,
  },
  modeTabActive: { backgroundColor: '#2563EB', borderColor: '#3B82F6' },
  modeTabText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  modeTabTextActive: { color: '#FFFFFF', fontWeight: '700' },
  locBlock: { marginTop: 4 },
  locHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  dotIndicator: { width: 8, height: 8, borderRadius: 4 },
  locTitle: { fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5 },
  locInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 12,
  },
  locMainText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  locSubText: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  quickActionsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  quickActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 6,
  },
  quickActionText: { fontSize: 11, fontWeight: '600', color: '#E2E8F0' },
  routeDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 14 },
  hexListContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hexChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  hexChipSelected: { borderColor: '#3B82F6', backgroundColor: '#3B82F615' },
  hexChipText: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  hexChipTextSelected: { color: '#FFFFFF', fontWeight: '700' },
  hexSummaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F610',
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  hexSummaryText: { fontSize: 12, color: '#93C5FD', fontWeight: '600' },
  routeStatsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statLabel: { fontSize: 10, fontWeight: '800', color: '#64748B', letterSpacing: 0.5 },
  statVal: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  configInputsRow: { flexDirection: 'row', gap: 10 },
  configField: { flex: 1 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#94A3B8', marginBottom: 6 },
  fieldInput: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#FFFFFF',
  },
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  serviceCard: {
    width: (SCREEN_W - 64) / 2,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
  },
  srvIconCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  srvTitle: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  srvDesc: { fontSize: 11, color: '#64748B', marginTop: 2 },
  checkBadge: { position: 'absolute', top: 10, right: 10, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  metaForm: { marginTop: 4 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  choicePillActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  choicePillText: { fontSize: 12, fontWeight: '600', color: '#94A3B8' },
  choicePillTextActive: { color: '#FFFFFF', fontWeight: '700' },
  orgDropdownList: { gap: 8 },
  orgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 12,
  },
  orgCardSelected: { borderColor: '#8B5CF6', backgroundColor: '#8B5CF612' },
  orgCardTitle: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  orgCardSub: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  routeCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 10,
    marginTop: 6,
  },
  routeCardItemSelected: { borderColor: '#8B5CF6', backgroundColor: '#8B5CF612' },
  routeItemTitle: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  routeItemTime: { fontSize: 11, color: '#A78BFA', marginTop: 2 },
  rosterContainer: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  memberRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  memberName: { fontSize: 12, fontWeight: '700', color: '#E2E8F0' },
  memberStop: { fontSize: 11, color: '#94A3B8', flex: 1 },
  proximityAlertNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98115',
    padding: 12,
    borderRadius: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#10B98130',
    gap: 10,
  },
  proximityAlertText: { fontSize: 12, color: '#A7F3D0', fontWeight: '500', flex: 1, lineHeight: 17 },
  dateTimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 12,
    marginTop: 12,
  },
  dateTimeText: { fontSize: 13, color: '#FFFFFF', fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  switchTitle: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  switchDesc: { fontSize: 11, color: '#64748B', marginTop: 2 },
  restrictionList: { gap: 10 },
  restrictionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 12,
    gap: 12,
  },
  restrictionOptionActive: { borderColor: '#3B82F6', backgroundColor: '#3B82F610' },
  restIconBox: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  restTitle: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  restDesc: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  vehCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 12,
    marginBottom: 8,
  },
  vehCardSelected: { borderColor: '#3B82F6', backgroundColor: '#3B82F610' },
  vehIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  vehModelText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  vehPlateText: { fontSize: 11, color: '#64748B', marginTop: 2 },
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginVertical: 8 },
  counterBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' },
  counterValBox: { alignItems: 'center' },
  counterValText: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  counterValSub: { fontSize: 11, color: '#64748B' },
  reviewBanner: {
    backgroundColor: '#3B82F615',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3B82F630',
  },
  reviewBannerTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  reviewBannerSub: { fontSize: 12, color: '#93C5FD', marginTop: 2 },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  revLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  revValueText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  revValBadge: { backgroundColor: '#3B82F620', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  revValBadgeText: { fontSize: 11, color: '#3B82F6', fontWeight: '700' },
  revSubAddress: { fontSize: 11, color: '#64748B', marginTop: 3 },
  revDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 10 },
  publishCTA: { borderRadius: 14, overflow: 'hidden', marginTop: 10 },
  publishGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15 },
  publishCTAText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#0A0F1D',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  prevBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    gap: 6,
  },
  prevBtnText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    gap: 6,
  },
  nextBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  addLocHeaderBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addLocHeaderText: { fontSize: 13, color: '#3B82F6', fontWeight: '700' },
  savedLocRowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  savedLocRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  savedLocIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F615',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  savedLocLabel: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  savedLocAddr: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  locActionBtn: { padding: 8 },
  editLocCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 18,
    margin: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  saveLocModalBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 18,
  },
  saveLocModalBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
})
