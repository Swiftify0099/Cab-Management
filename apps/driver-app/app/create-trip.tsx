/**
 * Create Trip Screen — Driver publishes a new intercity route.
 * Stepper Flow with Visibility Preferences in Step 1, Map Search,
 * Conditional Hex/Zone Drawing, and Direct Home Dashboard Navigation.
 */
import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, Alert, Switch, Dimensions, Platform, Modal
} from 'react-native'
import { router } from 'expo-router'
import DateTimePicker from '@react-native-community/datetimepicker'
import { api } from '../src/api/client'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { getDirections } from '../src/services/googleMaps'
import type { RouteData, AutocompletePrediction } from '../src/services/googleMaps'
import { reverseGeocode, geocodeCity, getPlaceAutocomplete } from '../src/utils/maps'
import {
  CoverageService,
  VisibilityMode,
  ServiceCityItem,
  ServiceZoneItem,
} from '../src/services/coverageService'

// Lazy-import MapView to avoid crash if native module isn't ready
let MapView: any = null
let Marker: any = null
let Polygon: any = null
let Polyline: any = null
try {
  const maps = require('react-native-maps')
  MapView = maps.default
  Marker = maps.Marker
  Polygon = maps.Polygon
  Polyline = maps.Polyline
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

const VEHICLE_TYPES = [
  { value: 'sedan', label: 'Sedan', icon: 'car-side', seats: 4 },
  { value: 'suv', label: 'SUV', icon: 'car-estate', seats: 6 },
  { value: 'mini', label: 'Mini', icon: 'car-hatchback', seats: 4 },
  { value: 'tempo_traveller', label: 'Tempo', icon: 'van-passenger', seats: 12 },
]

interface DriverVehicle {
  id: string
  vehicle_type: string
  make: string
  model: string
  registration_number: string
  total_seats: number
  is_verified: boolean
  icon?: string
}

export default function CreateTripScreen() {
  const [isMounted, setIsMounted] = useState(false)
  const [step, setStep] = useState(1) // 1 to 4
  
  useEffect(() => {
    const t = setTimeout(() => setIsMounted(true), 300)
    return () => clearTimeout(t)
  }, [])

  const [form, setForm] = useState({
    pickup_lat: 18.5204,
    pickup_lng: 73.8567,
    destination_lat: 19.0760,
    destination_lng: 72.8777,
    pickup_city_display: 'Pune',
    destination_city_display: 'Mumbai',
    departure_time: '',
    total_seats: 4,
    vehicle_type: 'sedan',
    base_fare: '450',
    per_km_rate: '3.5',
    parcel_enabled: false,
    women_only: false,
    window_seats: 0,
    window_seat_charge: '30',
    notes: '',
  })
  
  const [loading, setLoading] = useState(false)
  const [routeData, setRouteData] = useState<RouteData | null>(null)
  const [fetchingRoute, setFetchingRoute] = useState(false)
  const [predictions, setPredictions] = useState<AutocompletePrediction[]>([])
  const [activeSearch, setActiveSearch] = useState<'pickup' | 'destination' | null>(null)
  const [myVehicles, setMyVehicles] = useState<DriverVehicle[]>([])
  const [vehiclesLoading, setVehiclesLoading] = useState(false)

  // Map Drawing State (Used ONLY when in Specific Hex / Zone Mode)
  const [pickupPolygon, setPickupPolygon] = useState<{latitude:number;longitude:number}[]>([])
  const [destinationPolygon, setDestinationPolygon] = useState<{latitude:number;longitude:number}[]>([])
  const [drawingMode, setDrawingMode] = useState<'pickup' | 'destination' | null>(null)

  // Date/Time
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)

  // Driver Request Visibility Mode Preferences (Step 1)
  const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>('all_city')
  const [availableCities, setAvailableCities] = useState<ServiceCityItem[]>([])
  const [selectedCityIds, setSelectedCityIds] = useState<string[]>([])
  const [zonesByCity, setZonesByCity] = useState<Record<string, ServiceZoneItem[]>>({})
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([])
  const [coverageLoading, setCoverageLoading] = useState(false)

  // Load coverage data on mount
  useEffect(() => {
    setCoverageLoading(true)
    Promise.all([
      CoverageService.getAvailableCities(),
      CoverageService.getDriverCoverage(),
    ])
      .then(async ([cities, coverage]) => {
        setAvailableCities(cities)
        if (coverage?.visibility_mode) {
          setVisibilityMode(coverage.visibility_mode)
        }

        const selectedIds = coverage?.covered_cities
          ?.filter(c => c.is_selected || coverage.visibility_mode === 'all_city')
          .map(c => c.city_id) || []
        setSelectedCityIds(selectedIds.length > 0 ? selectedIds : cities.map(c => c.city_id))

        // Preload zones
        const zoneMap: Record<string, ServiceZoneItem[]> = {}
        for (const city of cities) {
          const zones = await CoverageService.getCityZones(city.city_id)
          zoneMap[city.city_id] = zones
        }
        setZonesByCity(zoneMap)
      })
      .catch(err => console.warn('[CreateTrip] Coverage load error:', err))
      .finally(() => setCoverageLoading(false))
  }, [])

  // Load driver's verified vehicles for Step 2
  useEffect(() => {
    if (step !== 2 || myVehicles.length > 0) return
    setVehiclesLoading(true)
    
    api.get('/driver/my-vehicles')
      .then(res => {
        const data = res.data?.data || []
        if (data.length > 0) {
          setMyVehicles(data)
          const first = data.find((v: any) => v.is_verified) || data[0]
          if (first) {
            update('vehicle_type', first.vehicle_type)
            update('total_seats', first.total_seats || first.seat_capacity || 4)
          }
          return
        }
        throw new Error('No API vehicles')
      })
      .catch(async () => {
        try {
          const { VehicleService: VS } = require('../src/services/vehicleService')
          const vsList = await VS.getVehicles()
          const approved = vsList.filter((v: any) => v.status === 'ACTIVE' || v.status === 'APPROVED' || v.status === 'INACTIVE')
          if (approved.length > 0) {
            const mapped = approved.map((v: any) => ({
              id: v.id,
              vehicle_type: v.vehicle_type,
              make: v.make,
              model: v.model,
              registration_number: v.registration_number,
              total_seats: v.seat_capacity,
              is_verified: true,
            }))
            setMyVehicles(mapped)
            const activeVeh = approved.find((v: any) => v.is_active) || approved[0]
            if (activeVeh) {
              update('vehicle_type', activeVeh.vehicle_type)
              update('total_seats', activeVeh.seat_capacity)
            }
          }
        } catch {}
      })
      .finally(() => setVehiclesLoading(false))
  }, [step])

  const update = (key: string, value: any) => setForm(p => ({ ...p, [key]: value }))

  // Reverse Geocode when map markers move
  const handleMarkerDrag = async (type: 'pickup' | 'destination', coord: { latitude: number, longitude: number }) => {
    if (type === 'pickup') {
      update('pickup_lat', coord.latitude)
      update('pickup_lng', coord.longitude)
    } else {
      update('destination_lat', coord.latitude)
      update('destination_lng', coord.longitude)
    }

    const res = await reverseGeocode(coord.latitude, coord.longitude)
    if (res) {
      if (type === 'pickup') update('pickup_city_display', res.city)
      else update('destination_city_display', res.city)
    }
  }

  // Geocode search text
  const handleSearchTextChange = async (type: 'pickup' | 'destination', text: string) => {
    update(type === 'pickup' ? 'pickup_city_display' : 'destination_city_display', text)
    setActiveSearch(type)
    if (text.length > 2) {
      const results = await getPlaceAutocomplete(text)
      setPredictions(results)
    } else {
      setPredictions([])
    }
  }

  const handleSelectPrediction = async (prediction: AutocompletePrediction) => {
    if (!activeSearch) return
    const type = activeSearch
    setActiveSearch(null)
    setPredictions([])
    
    update(type === 'pickup' ? 'pickup_city_display' : 'destination_city_display', prediction.description)
    
    const res = await geocodeCity(prediction.description)
    if (res) {
      if (type === 'pickup') {
        update('pickup_lat', res.lat)
        update('pickup_lng', res.lon)
      } else {
        update('destination_lat', res.lat)
        update('destination_lng', res.lon)
      }
    }
  }

  // Fetch Route whenever lat/lng changes
  const fetchRoute = useCallback(async () => {
    if (!form.pickup_lat || !form.destination_lat) return
    setFetchingRoute(true)
    try {
      const data = await getDirections(
        { lat: form.pickup_lat, lng: form.pickup_lng },
        { lat: form.destination_lat, lng: form.destination_lng },
      )
      if (data) setRouteData(data)
    } catch (e) {
      console.warn('[CreateTrip] Route fetch failed:', e)
    } finally {
      setFetchingRoute(false)
    }
  }, [form.pickup_lat, form.pickup_lng, form.destination_lat, form.destination_lng])

  useEffect(() => {
    if (form.pickup_lat && form.destination_lat) {
      const t = setTimeout(fetchRoute, 1000)
      return () => clearTimeout(t)
    }
  }, [form.pickup_lat, form.pickup_lng, form.destination_lat, form.destination_lng])

  const handleMapPress = useCallback((event: any) => {
    if (!drawingMode || visibilityMode !== 'specific_hex') return
    const coord = event.nativeEvent.coordinate
    if (drawingMode === 'pickup') setPickupPolygon(prev => [...prev, coord])
    else setDestinationPolygon(prev => [...prev, coord])
  }, [drawingMode, visibilityMode])

  const handleFinishDrawing = () => {
    const poly = drawingMode === 'pickup' ? pickupPolygon : destinationPolygon
    if (poly.length > 0 && poly.length < 3) {
      Alert.alert('Too few points', 'Tap at least 3 points on the map to define a zone or reset.')
      return
    }
    setDrawingMode(null)
  }

  const removePolygonPoint = (type: 'pickup' | 'destination', index: number) => {
    if (type === 'pickup') {
      setPickupPolygon(prev => prev.filter((_, i) => i !== index))
    } else {
      setDestinationPolygon(prev => prev.filter((_, i) => i !== index))
    }
  }

  // Publish / Save Trip and navigate directly back to Home Dashboard
  const handleCreate = async () => {
    setLoading(true)
    try {
      const isoTime = form.departure_time 
        ? new Date(form.departure_time).toISOString() 
        : new Date(Date.now() + 3600000).toISOString()

      // Update driver's request visibility preferences
      try {
        await CoverageService.updateDriverCoverage({
          visibility_mode: visibilityMode,
          city_ids: selectedCityIds,
        })
      } catch (covErr) {
        console.warn('[CreateTrip] Failed to update visibility mode preference:', covErr)
      }

      await api.post(`/trips/`, {
        pickup_lat: form.pickup_lat,
        pickup_lng: form.pickup_lng,
        destination_lat: form.destination_lat,
        destination_lng: form.destination_lng,
        pickup_city: form.pickup_city_display,
        destination_city: form.destination_city_display,
        departure_time: isoTime,
        total_seats: form.total_seats,
        vehicle_type: form.vehicle_type,
        base_fare: Number(form.base_fare),
        per_km_rate: Number(form.per_km_rate),
        parcel_enabled: form.parcel_enabled,
        women_only: form.women_only,
        window_seats: form.window_seats,
        window_seat_charge: Number(form.window_seat_charge),
        notes: form.notes.trim() || null,
        encoded_polyline: routeData?.encodedPolyline || null,
        distance_km: routeData?.distanceKm || null,
        duration_minutes: routeData?.durationMinutes || null,
        pickup_polygon: visibilityMode === 'specific_hex' && pickupPolygon.length >= 3 
          ? pickupPolygon.map(c => ({ lat: c.latitude, lng: c.longitude })) 
          : null,
        destination_polygon: visibilityMode === 'specific_hex' && destinationPolygon.length >= 3 
          ? destinationPolygon.map(c => ({ lat: c.latitude, lng: c.longitude })) 
          : null,
        visibility_mode: visibilityMode,
        selected_city_ids: selectedCityIds,
        selected_zone_ids: selectedZoneIds,
      })

      Alert.alert(
        'Trip Created Successfully! 🎉',
        `Your trip from ${form.pickup_city_display} to ${form.destination_city_display} is now listed. You can start the trip from your Dashboard.`
      )
      
      // Navigate to Home Dashboard with created trip visible
      router.replace('/(tabs)')
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Could not publish trip. Please try again.'
      Alert.alert('Publish Failed', msg)
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => {
    if (step === 1 && !routeData) {
      Alert.alert('Route not found', 'Please ensure valid pickup and destination points on the map.')
      return
    }
    if (step === 2 && !form.departure_time) {
      Alert.alert('Missing Info', 'Please select a departure time.')
      return
    }
    if (step === 3 && (!form.base_fare || Number(form.base_fare) < 50)) {
      Alert.alert('Missing Info', 'Please enter a valid base fare (min ₹50).')
      return
    }
    if (step < 4) setStep(step + 1)
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color="#F8FAFC" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Trip</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Stepper Dots */}
        <View style={styles.stepperContainer}>
          {[1, 2, 3, 4].map(s => (
            <View key={s} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.stepDot, step >= s && styles.stepDotActive]}>
                {step > s ? <Feather name="check" size={10} color="#fff" /> : <Text style={styles.stepDotText}>{s}</Text>}
              </View>
              {s < 4 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.content}>
        {/* ================= STEP 1: ROUTE, MAP & VISIBILITY PREFERENCE ================= */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            {/* Visibility Mode Selector Strip at top */}
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>1. Visibility & Route</Text>
              <Text style={styles.stepSub}>Select your request visibility mode & search pickup / drop locations.</Text>
              
              <View style={styles.visibilityTabsRow}>
                <TouchableOpacity
                  style={[styles.visTab, visibilityMode === 'all_city' && styles.visTabActive]}
                  onPress={() => setVisibilityMode('all_city')}
                >
                  <Feather name="globe" size={14} color={visibilityMode === 'all_city' ? '#FFF' : '#3B82F6'} />
                  <Text style={[styles.visTabText, visibilityMode === 'all_city' && styles.visTabTextActive]}>
                    All City
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.visTab, visibilityMode === 'specific_city' && styles.visTabActive]}
                  onPress={() => setVisibilityMode('specific_city')}
                >
                  <Feather name="map-pin" size={14} color={visibilityMode === 'specific_city' ? '#FFF' : '#3B82F6'} />
                  <Text style={[styles.visTabText, visibilityMode === 'specific_city' && styles.visTabTextActive]}>
                    Specific City
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.visTab, visibilityMode === 'specific_hex' && styles.visTabActive]}
                  onPress={() => setVisibilityMode('specific_hex')}
                >
                  <MaterialCommunityIcons name="hexagon-slice-6" size={14} color={visibilityMode === 'specific_hex' ? '#FFF' : '#3B82F6'} />
                  <Text style={[styles.visTabText, visibilityMode === 'specific_hex' && styles.visTabTextActive]}>
                    Hex / Zone
                  </Text>
                </TouchableOpacity>
              </View>

              {/* City chips if specific_city is active */}
              {visibilityMode === 'specific_city' && (
                <View style={styles.cityChipsSection}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 4 }}>
                    Select Covered Cities ({selectedCityIds.length}):
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 38 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {availableCities.map(c => {
                        const isSel = selectedCityIds.includes(c.city_id)
                        return (
                          <TouchableOpacity
                            key={c.city_id}
                            style={[styles.cityChip, isSel && styles.cityChipActive]}
                            onPress={() => {
                              setSelectedCityIds(prev =>
                                isSel ? prev.filter(id => id !== c.city_id) : [...prev, c.city_id]
                              )
                            }}
                          >
                            <Text style={[styles.cityChipText, isSel && styles.cityChipTextActive]}>
                              {isSel ? '✓ ' : ''}{c.name}
                            </Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* Zone chips if specific_hex is active */}
              {visibilityMode === 'specific_hex' && (
                <View style={styles.cityChipsSection}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 4 }}>
                    Specific Hex Mode: Draw custom polygons on map below or pick zones.
                  </Text>
                </View>
              )}
            </View>

            {/* Map & Search Bar */}
            <View style={styles.mapContainer}>
              {!isMounted || !MapView ? (
                <View style={styles.mapPlaceholder}><ActivityIndicator color="#3B82F6" /></View>
              ) : (
                <MapView
                  style={styles.map}
                  scrollEnabled={!drawingMode}
                  initialRegion={{
                    latitude: (form.pickup_lat + form.destination_lat) / 2,
                    longitude: (form.pickup_lng + form.destination_lng) / 2,
                    latitudeDelta: Math.abs(form.pickup_lat - form.destination_lat) * 2 || 2,
                    longitudeDelta: Math.abs(form.pickup_lng - form.destination_lng) * 2 || 2,
                  }}
                  onPress={handleMapPress}
                >
                  {Polyline && routeData?.encodedPolyline && (
                    <Polyline coordinates={decodePolyline(routeData.encodedPolyline)} strokeColor="#3B82F6" strokeWidth={5} />
                  )}
                  {visibilityMode === 'specific_hex' && Polygon && pickupPolygon.length >= 3 && (
                    <Polygon coordinates={pickupPolygon} fillColor="rgba(34,197,94,0.18)" strokeColor="#22C55E" strokeWidth={2} />
                  )}
                  {visibilityMode === 'specific_hex' && Polygon && destinationPolygon.length >= 3 && (
                    <Polygon coordinates={destinationPolygon} fillColor="rgba(239,68,68,0.18)" strokeColor="#EF4444" strokeWidth={2} />
                  )}
                  
                  {visibilityMode === 'specific_hex' && drawingMode === 'pickup' && pickupPolygon.map((pt, i) => Marker && (
                    <Marker key={`p${i}`} coordinate={pt} onPress={() => removePolygonPoint('pickup', i)}>
                      <View style={styles.dotP} />
                    </Marker>
                  ))}
                  {visibilityMode === 'specific_hex' && drawingMode === 'destination' && destinationPolygon.map((pt, i) => Marker && (
                    <Marker key={`d${i}`} coordinate={pt} onPress={() => removePolygonPoint('destination', i)}>
                      <View style={styles.dotD} />
                    </Marker>
                  ))}

                  {Marker && <Marker coordinate={{ latitude: form.pickup_lat, longitude: form.pickup_lng }} draggable onDragEnd={(e: any) => handleMarkerDrag('pickup', e.nativeEvent.coordinate)} pinColor="green" />}
                  {Marker && <Marker coordinate={{ latitude: form.destination_lat, longitude: form.destination_lng }} draggable onDragEnd={(e: any) => handleMarkerDrag('destination', e.nativeEvent.coordinate)} pinColor="red" />}
                </MapView>
              )}

              {/* Map Floating Overlays */}
              <View style={styles.mapOverlays}>
                {/* Search Bar */}
                <View style={styles.searchCard}>
                  <View style={styles.searchRow}>
                    <View style={styles.greenDot} />
                    <TextInput 
                      style={styles.searchInput} 
                      placeholder="Search Pickup Location..." 
                      value={form.pickup_city_display} 
                      onChangeText={v => handleSearchTextChange('pickup', v)} 
                    />
                  </View>
                  <View style={styles.searchDivider} />
                  <View style={styles.searchRow}>
                    <View style={styles.redDot} />
                    <TextInput 
                      style={styles.searchInput} 
                      placeholder="Search Destination..." 
                      value={form.destination_city_display} 
                      onChangeText={v => handleSearchTextChange('destination', v)} 
                    />
                  </View>
                  {fetchingRoute && <ActivityIndicator size="small" color="#3B82F6" style={{position:'absolute', right:16, top: 40}} />}
                  {routeData && !fetchingRoute && (
                    <View style={styles.routeDistanceBadge}>
                      <Text style={styles.routeDistanceText}>{routeData.distanceKm} km · {routeData.durationMinutes} min</Text>
                    </View>
                  )}
                </View>

                {/* Autocomplete Dropdown */}
                {activeSearch && predictions.length > 0 && (
                  <View style={styles.predictionsCard}>
                    <FlatList
                      data={predictions}
                      keyExtractor={item => item.placeId}
                      keyboardShouldPersistTaps="handled"
                      renderItem={({item}) => (
                        <TouchableOpacity style={styles.predictionItem} onPress={() => handleSelectPrediction(item)}>
                          <Feather name="map-pin" size={16} color="#64748B" />
                          <View style={{ marginLeft: 10, flex: 1 }}>
                            <Text style={styles.predictionMain} numberOfLines={1}>{item.mainText}</Text>
                            <Text style={styles.predictionSub} numberOfLines={1}>{item.secondaryText}</Text>
                          </View>
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                )}

                {/* Polygon Drawing Toolbar — ONLY visible when in Specific Hex Mode */}
                {visibilityMode === 'specific_hex' && (
                  drawingMode ? (
                    <View style={styles.drawingToolbar}>
                      <Text style={styles.drawingText}>{drawingMode === 'pickup' ? 'Drawing Pickup Zone' : 'Drawing Dropoff Zone'}...</Text>
                      <TouchableOpacity style={styles.btnFinish} onPress={handleFinishDrawing}>
                        <Text style={styles.btnTextLight}>Done</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.drawingToolbarRow}>
                      <TouchableOpacity style={styles.btnDraw} onPress={() => setDrawingMode('pickup')}>
                        <Feather name="edit-2" size={14} color="#fff" />
                        <Text style={styles.btnTextLight}>{pickupPolygon.length >= 3 ? '✓ Pickup Zone' : '+ Pickup Zone'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.btnDraw, { backgroundColor: '#EF4444' }]} onPress={() => setDrawingMode('destination')}>
                        <Feather name="edit-2" size={14} color="#fff" />
                        <Text style={styles.btnTextLight}>{destinationPolygon.length >= 3 ? '✓ Dropoff Zone' : '+ Dropoff Zone'}</Text>
                      </TouchableOpacity>
                    </View>
                  )
                )}
              </View>
            </View>
          </View>
        )}

        {/* ================= STEP 2: DEPARTURE & VEHICLE ================= */}
        {step === 2 && (
          <ScrollView style={styles.stepContainer} contentContainerStyle={{ padding: 20 }}>
            <Text style={styles.stepTitle}>2. Departure & Vehicle</Text>
            
            <Text style={styles.label}>When are you leaving? *</Text>
            <TouchableOpacity style={styles.datePickerBtn} onPress={() => { setShowDatePicker(true) }}>
              <Feather name="calendar" size={20} color="#3B82F6" />
              <Text style={selectedDate ? styles.dateText : styles.placeholder}>
                {selectedDate ? selectedDate.toLocaleString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Select Date & Time'}
              </Text>
            </TouchableOpacity>

            {(Platform.OS === 'android' && showDatePicker) && (
              <DateTimePicker 
                value={selectedDate || new Date()} 
                mode="date" 
                display="calendar" 
                onChange={(_: any, date?: Date) => { 
                  setShowDatePicker(false); 
                  if(date) { 
                    setSelectedDate(date); 
                    setShowTimePicker(true); 
                  } 
                }} 
              />
            )}
            {(Platform.OS === 'android' && showTimePicker) && (
              <DateTimePicker 
                value={selectedDate || new Date()} 
                mode="time" 
                display="default" 
                onChange={(_: any, time?: Date) => { 
                  setShowTimePicker(false); 
                  if(time) { 
                    const d = new Date(selectedDate || new Date()); 
                    d.setHours(time.getHours(), time.getMinutes()); 
                    setSelectedDate(d); 
                    update('departure_time', d.toISOString()) 
                  } 
                }} 
              />
            )}

            <Text style={[styles.label, { marginTop: 24 }]}>Vehicle Selection</Text>

            {vehiclesLoading ? (
              <ActivityIndicator color="#3B82F6" style={{ marginVertical: 16 }} />
            ) : myVehicles.length > 0 ? (
              <View style={styles.vehicleGrid}>
                {myVehicles.map(v => {
                  const meta = VEHICLE_TYPES.find(vt => vt.value === v.vehicle_type) || VEHICLE_TYPES[0]
                  const isSelected = form.vehicle_type === v.vehicle_type && form.total_seats === v.total_seats
                  return (
                    <TouchableOpacity
                      key={v.id}
                      onPress={() => {
                        if (!v.is_verified) {
                          Alert.alert('Not Verified', `${v.make} ${v.model} is pending verification. Choose a verified vehicle.`)
                          return
                        }
                        update('vehicle_type', v.vehicle_type)
                        update('total_seats', v.total_seats)
                      }}
                      style={[
                        styles.vCard,
                        isSelected && styles.vCardActive,
                        !v.is_verified && { opacity: 0.5 },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={meta.icon as any}
                        size={32}
                        color={isSelected ? '#2563EB' : '#64748B'}
                      />
                      <Text style={[styles.vCardText, isSelected && styles.vCardTextActive]}>
                        {v.make} {v.model}
                      </Text>
                      <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
                        {v.registration_number} • {v.total_seats} seats
                      </Text>
                      {v.is_verified
                        ? <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>✓ Verified</Text></View>
                        : <View style={styles.pendingBadge}><Text style={styles.pendingText}>Pending</Text></View>
                      }
                    </TouchableOpacity>
                  )
                })}
              </View>
            ) : (
              <View style={styles.vehicleGrid}>
                {VEHICLE_TYPES.map(v => (
                  <TouchableOpacity
                    key={v.value}
                    onPress={() => { update('vehicle_type', v.value); update('total_seats', v.seats) }}
                    style={[styles.vCard, form.vehicle_type === v.value && styles.vCardActive]}
                  >
                    <MaterialCommunityIcons name={v.icon as any} size={32} color={form.vehicle_type === v.value ? '#2563EB' : '#64748B'} />
                    <Text style={[styles.vCardText, form.vehicle_type === v.value && styles.vCardTextActive]}>{v.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 16, marginTop: 20 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Total Passenger Seats</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={form.total_seats.toString()} onChangeText={v => update('total_seats', parseInt(v)||1)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Window Seats</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={form.window_seats.toString()} onChangeText={v => update('window_seats', parseInt(v)||0)} />
              </View>
            </View>
          </ScrollView>
        )}

        {/* ================= STEP 3: PRICING & PREFERENCES ================= */}
        {step === 3 && (
          <ScrollView style={styles.stepContainer} contentContainerStyle={{ padding: 20 }}>
            <Text style={styles.stepTitle}>3. Pricing & Preferences</Text>

            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 24 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Base Fare (₹/seat) *</Text>
                <TextInput style={styles.input} keyboardType="numeric" placeholder="e.g. 450" value={form.base_fare} onChangeText={v => update('base_fare', v)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Window Surcharge (₹)</Text>
                <TextInput style={styles.input} keyboardType="numeric" placeholder="0" value={form.window_seat_charge} onChangeText={v => update('window_seat_charge', v)} />
              </View>
            </View>

            <View style={styles.toggleCard}>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}><Text style={styles.toggleLabel}>Accept Parcels & Luggage</Text><Text style={styles.toggleSub}>Allow customers to send parcel deliveries</Text></View>
                <Switch value={form.parcel_enabled} onValueChange={v => update('parcel_enabled', v)} trackColor={{ true: '#3B82F6' }} />
              </View>
              <View style={styles.divider} />
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}><Text style={styles.toggleLabel}>Women-Only Trip</Text><Text style={styles.toggleSub}>Restrict bookings to female riders only</Text></View>
                <Switch value={form.women_only} onValueChange={v => update('women_only', v)} trackColor={{ true: '#EC4899' }} />
              </View>
            </View>

            <Text style={[styles.label, { marginTop: 20 }]}>Trip Notes & Instructions</Text>
            <TextInput 
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
              multiline 
              placeholder="Any pickup notes or landmark details..." 
              value={form.notes} 
              onChangeText={v => update('notes', v)} 
            />
          </ScrollView>
        )}

        {/* ================= STEP 4: REVIEW & PUBLISH ================= */}
        {step === 4 && (
          <ScrollView style={styles.stepContainer} contentContainerStyle={{ padding: 20 }}>
            <Text style={styles.stepTitle}>4. Review & Publish</Text>
            
            <View style={styles.summaryCard}>
              <View style={styles.summaryRoute}>
                <View style={styles.greenDot} />
                <Text style={styles.summaryCity}>{form.pickup_city_display}</Text>
                <Feather name="arrow-right" size={16} color="#94A3B8" style={{ marginHorizontal: 10 }} />
                <View style={styles.redDot} />
                <Text style={styles.summaryCity}>{form.destination_city_display}</Text>
              </View>
              <Text style={styles.summaryTime}>
                {selectedDate ? selectedDate.toLocaleString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Next Available'}
              </Text>
              <View style={styles.divider} />
              
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}><Feather name="truck" size={16} color="#64748B"/><Text style={styles.summaryValue}>{form.vehicle_type}</Text></View>
                <View style={styles.summaryItem}><Feather name="users" size={16} color="#64748B"/><Text style={styles.summaryValue}>{form.total_seats} Seats Capacity</Text></View>
                <View style={styles.summaryItem}><Feather name="map" size={16} color="#64748B"/><Text style={styles.summaryValue}>{routeData?.distanceKm || 0} km</Text></View>
                <View style={styles.summaryItem}><Feather name="tag" size={16} color="#64748B"/><Text style={styles.summaryValue}>₹{form.base_fare}/seat</Text></View>
              </View>

              {/* Visibility Preference Summary Row */}
              <View style={styles.summaryVisibilityRow}>
                <Feather name="eye" size={16} color="#2563EB" />
                <Text style={styles.summaryVisibilityText}>
                  Request Mode: <Text style={{ fontWeight: '700' }}>
                    {visibilityMode === 'all_city' ? 'All City' : visibilityMode === 'specific_city' ? `Specific City (${selectedCityIds.length})` : `Specific Hex / Zone`}
                  </Text>
                </Text>
              </View>
            </View>

            <Text style={styles.summaryInfo}>
              After publishing, you will return to your Dashboard where you can view member capacity (0/{form.total_seats}) and start the trip.
            </Text>
          </ScrollView>
        )}
      </View>

      {/* Footer Navigation */}
      <View style={styles.footer}>
        {step > 1 && (
          <TouchableOpacity style={styles.btnSecondary} onPress={() => setStep(step - 1)}>
            <Text style={styles.btnTextDark}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.btnPrimary} onPress={step === 4 ? handleCreate : nextStep} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnTextLight}>{step === 4 ? 'Publish Trip' : 'Next Step'}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { backgroundColor: '#1E293B', paddingTop: 40, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  stepperContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  stepDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  stepDotActive: { backgroundColor: '#3B82F6' },
  stepDotText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  stepLine: { width: 40, height: 3, backgroundColor: '#334155', marginHorizontal: 8, borderRadius: 2 },
  stepLineActive: { backgroundColor: '#3B82F6' },
  
  content: { flex: 1 },
  stepContainer: { flex: 1 },
  stepHeader: { padding: 14, paddingBottom: 10, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#F1F5F9' },
  stepTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  stepSub: { fontSize: 12, color: '#64748B' },
  
  // Step 1 Visibility Tabs
  visibilityTabsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  visTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 10,
    backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE',
  },
  visTabActive: { backgroundColor: '#2563EB', borderColor: '#1D4ED8' },
  visTabText: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
  visTabTextActive: { color: '#FFF' },
  cityChipsSection: { marginTop: 8 },
  cityChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0',
  },
  cityChipActive: { backgroundColor: '#3B82F6', borderColor: '#2563EB' },
  cityChipText: { fontSize: 11, color: '#475569', fontWeight: '600' },
  cityChipTextActive: { color: '#FFF', fontWeight: '700' },

  // Map Step
  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E2E8F0' },
  mapOverlays: { position: 'absolute', top: 12, left: 16, right: 16, bottom: 16, justifyContent: 'space-between', pointerEvents: 'box-none' },
  // Search Bar
  searchCard: { backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 14, padding: 10, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 5 },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  searchInput: { flex: 1, height: 38, fontSize: 14, color: '#1E293B', marginLeft: 8 },
  searchDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 4, marginLeft: 18 },
  routeDistanceBadge: { marginTop: 6, backgroundColor: '#EFF6FF', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  routeDistanceText: { fontSize: 11, color: '#3B82F6', fontWeight: '700' },
  predictionsCard: { backgroundColor: '#FFF', borderRadius: 14, marginTop: 6, paddingVertical: 6, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 5, maxHeight: 180 },
  predictionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  predictionMain: { fontSize: 14, fontWeight: '500', color: '#1E293B' },
  predictionSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  
  drawingToolbarRow: { flexDirection: 'row', gap: 10, alignSelf: 'center', marginBottom: 6 },
  drawingToolbar: { backgroundColor: '#1E293B', padding: 12, borderRadius: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  drawingText: { color: '#FFF', fontWeight: '600', fontSize: 13 },
  
  // UI Elements
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 },
  input: { backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 15, color: '#0F172A' },
  datePickerBtn: { backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  placeholder: { color: '#94A3B8', fontSize: 15 },
  dateText: { color: '#0F172A', fontSize: 15, fontWeight: '600' },
  vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  vCard: { flex: 1, minWidth: '45%', backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14, padding: 16, alignItems: 'center', gap: 6 },
  vCardActive: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
  vCardText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  vCardTextActive: { color: '#2563EB' },
  
  // Toggles
  toggleCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 2, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  toggleSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 14 },

  // Summary
  summaryCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 },
  summaryRoute: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  summaryCity: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  summaryTime: { fontSize: 14, color: '#3B82F6', fontWeight: '600', marginBottom: 14 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 14 },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '45%' },
  summaryValue: { fontSize: 13, fontWeight: '600', color: '#334155' },
  summaryInfo: { fontSize: 13, color: '#64748B', textAlign: 'center', paddingHorizontal: 16, lineHeight: 20 },

  // Footers & Buttons
  footer: { backgroundColor: '#FFF', padding: 16, borderTopWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', gap: 10 },
  btnPrimary: { flex: 1, backgroundColor: '#2563EB', borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  btnSecondary: { backgroundColor: '#F1F5F9', borderRadius: 14, padding: 16, alignItems: 'center', paddingHorizontal: 24 },
  btnTextLight: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  btnTextDark: { color: '#334155', fontSize: 15, fontWeight: '700' },
  btnDraw: { backgroundColor: '#22C55E', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  btnFinish: { backgroundColor: '#22C55E', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  
  // Dots
  greenDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22C55E' },
  redDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  dotP: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22C55E', borderWidth: 1.5, borderColor: '#fff' },
  dotD: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#fff' },

  // Badges
  verifiedBadge: { marginTop: 4, backgroundColor: '#D1FAE5', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'center' },
  verifiedText: { color: '#065F46', fontSize: 10, fontWeight: '700' },
  pendingBadge: { marginTop: 4, backgroundColor: '#FEF9C3', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'center' },
  pendingText: { color: '#92400E', fontSize: 10, fontWeight: '700' },
  summaryVisibilityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EFF6FF', padding: 10, borderRadius: 10, marginTop: 14,
  },
  summaryVisibilityText: { fontSize: 12, color: '#1E40AF' },
})
