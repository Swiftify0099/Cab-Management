/**
 * Create Trip Screen — Driver publishes a new intercity route.
 * Stepper Redesign with Massive Map & Geo-only matching.
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

// Vehicles registered and verified by the driver (fetched from API in Step 2)
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

const { height } = Dimensions.get('window')

export default function CreateTripScreen() {
  const [isMounted, setIsMounted] = useState(false)
  
  // STEPPER STATE
  const [step, setStep] = useState(1) // 1 to 4
  
  useEffect(() => {
    const t = setTimeout(() => setIsMounted(true), 300)
    return () => clearTimeout(t)
  }, [])

  // P3.4 — Load driver's verified vehicles when Step 2 is reached
  useEffect(() => {
    if (step !== 2 || myVehicles.length > 0) return
    setVehiclesLoading(true)
    
    // Attempt live API with fallback to VehicleService
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

  const [form, setForm] = useState({
    pickup_lat: 18.5204,
    pickup_lng: 73.8567,
    destination_lat: 19.0760,
    destination_lng: 72.8777,
    pickup_city_display: '', // Used only for UI display, not sent to DB
    destination_city_display: '', // Used only for UI display, not sent to DB
    departure_time: '',
    total_seats: 4,
    vehicle_type: 'sedan',
    base_fare: '',
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
  // P3.4 — Verified vehicles from API
  const [myVehicles, setMyVehicles] = useState<DriverVehicle[]>([])
  const [vehiclesLoading, setVehiclesLoading] = useState(false)

  // Map Drawing State
  const [pickupPolygon, setPickupPolygon] = useState<{latitude:number;longitude:number}[]>([])
  const [destinationPolygon, setDestinationPolygon] = useState<{latitude:number;longitude:number}[]>([])
  const [drawingMode, setDrawingMode] = useState<'pickup' | 'destination' | null>(null)

  // Date/Time
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date')

  const update = (key: string, value: any) => setForm(p => ({ ...p, [key]: value }))

  // Reverse Geocode when map markers move to update display strings
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

  // Geocode typed city when user searches
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
    if (!drawingMode) return
    const coord = event.nativeEvent.coordinate
    if (drawingMode === 'pickup') setPickupPolygon(prev => [...prev, coord])
    else setDestinationPolygon(prev => [...prev, coord])
  }, [drawingMode])

  const handleFinishDrawing = () => {
    const poly = drawingMode === 'pickup' ? pickupPolygon : destinationPolygon
    if (poly.length > 0 && poly.length < 3) {
      Alert.alert('Too few points', 'Tap at least 3 points on the map or remove all pins.')
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

  const handleCreate = async () => {
    setLoading(true)
    try {
      const isoTime = new Date(form.departure_time).toISOString()

      const res = await api.post(`/trips/`, {
        pickup_lat: form.pickup_lat,
        pickup_lng: form.pickup_lng,
        destination_lat: form.destination_lat,
        destination_lng: form.destination_lng,
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
        pickup_polygon: pickupPolygon.length >= 3 ? pickupPolygon.map(c => ({ lat: c.latitude, lng: c.longitude })) : null,
        destination_polygon: destinationPolygon.length >= 3 ? destinationPolygon.map(c => ({ lat: c.latitude, lng: c.longitude })) : null,
      })

      const tripId = res?.data?.data?.id || res?.data?.trip_id || 'demo'
      router.replace({
        pathname: '/trip-live',
        params: {
          tripId,
          from: form.pickup_city_display,
          to: form.destination_city_display,
          totalSeats: form.total_seats.toString(),
          departureTime: isoTime,
        },
      })
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
        {/* ================= STEP 1: ROUTE & MAP ================= */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>Route & Service Areas</Text>
              <Text style={styles.stepSub}>Drag pins to set locations. Tap buttons to draw polygons.</Text>
            </View>

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
                  {Polygon && pickupPolygon.length >= 3 && <Polygon coordinates={pickupPolygon} fillColor="rgba(34,197,94,0.18)" strokeColor="#22C55E" strokeWidth={2} />}
                  {Polygon && destinationPolygon.length >= 3 && <Polygon coordinates={destinationPolygon} fillColor="rgba(239,68,68,0.18)" strokeColor="#EF4444" strokeWidth={2} />}
                  
                  {drawingMode === 'pickup' && pickupPolygon.map((pt, i) => Marker && <Marker key={`p${i}`} coordinate={pt} onPress={() => removePolygonPoint('pickup', i)}><View style={styles.dotP} /></Marker>)}
                  {drawingMode === 'destination' && destinationPolygon.map((pt, i) => Marker && <Marker key={`d${i}`} coordinate={pt} onPress={() => removePolygonPoint('destination', i)}><View style={styles.dotD} /></Marker>)}

                  {Marker && <Marker coordinate={{ latitude: form.pickup_lat, longitude: form.pickup_lng }} draggable onDragEnd={(e: any) => handleMarkerDrag('pickup', e.nativeEvent.coordinate)} pinColor="green" />}
                  {Marker && <Marker coordinate={{ latitude: form.destination_lat, longitude: form.destination_lng }} draggable onDragEnd={(e: any) => handleMarkerDrag('destination', e.nativeEvent.coordinate)} pinColor="red" />}
                </MapView>
              )}

              {/* Map Floating Overlays */}
              <View style={styles.mapOverlays}>
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

                {drawingMode ? (
                  <View style={styles.drawingToolbar}>
                    <Text style={styles.drawingText}>{drawingMode === 'pickup' ? 'Drawing Pickup' : 'Drawing Dropoff'}...</Text>
                    <TouchableOpacity style={styles.btnFinish} onPress={handleFinishDrawing}><Text style={styles.btnTextLight}>Done</Text></TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.drawingToolbarRow}>
                    <TouchableOpacity style={styles.btnDraw} onPress={() => setDrawingMode('pickup')}>
                      <Feather name="edit-2" size={14} color="#fff" />
                      <Text style={styles.btnTextLight}>{pickupPolygon.length >= 3 ? '✓ Pickup Area' : '+ Pickup Area'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btnDraw, { backgroundColor: '#EF4444' }]} onPress={() => setDrawingMode('destination')}>
                      <Feather name="edit-2" size={14} color="#fff" />
                      <Text style={styles.btnTextLight}>{destinationPolygon.length >= 3 ? '✓ Dropoff Area' : '+ Dropoff Area'}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* ================= STEP 2: DEPARTURE & VEHICLE ================= */}
        {step === 2 && (
          <ScrollView style={styles.stepContainer} contentContainerStyle={{ padding: 20 }}>
            <Text style={styles.stepTitle}>Departure & Vehicle</Text>
            
            <Text style={styles.label}>When are you leaving? *</Text>
            <TouchableOpacity style={styles.datePickerBtn} onPress={() => { setPickerMode('date'); setShowDatePicker(true) }}>
              <Feather name="calendar" size={20} color="#3B82F6" />
              <Text style={selectedDate ? styles.dateText : styles.placeholder}>
                {selectedDate ? selectedDate.toLocaleString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Select Date & Time'}
              </Text>
            </TouchableOpacity>

            {(Platform.OS === 'android' && showDatePicker) && <DateTimePicker value={selectedDate || new Date()} mode="date" display="calendar" onChange={(_: any, date?: Date) => { setShowDatePicker(false); if(date) { setSelectedDate(date); setShowTimePicker(true); } }} />}
            {(Platform.OS === 'android' && showTimePicker) && <DateTimePicker value={selectedDate || new Date()} mode="time" display="default" onChange={(_: any, time?: Date) => { setShowTimePicker(false); if(time) { const d = new Date(selectedDate!); d.setHours(time.getHours(), time.getMinutes()); setSelectedDate(d); update('departure_time', d.toISOString()) } }} />}
            {Platform.OS === 'ios' && (
              <Modal transparent visible={showDatePicker || showTimePicker} animationType="slide">
                <View style={styles.iosPickerBg}>
                  <View style={styles.iosPicker}>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 }}>
                      <TouchableOpacity onPress={() => { setShowDatePicker(false); setShowTimePicker(false) }}><Text style={styles.btnTextBlue}>Done</Text></TouchableOpacity>
                    </View>
                    <DateTimePicker value={selectedDate || new Date()} mode={showTimePicker ? 'time' : 'date'} display="inline" onChange={(_: any, d?: Date) => { if(d){ setSelectedDate(d); update('departure_time', d.toISOString()) } }} />
                    {!showTimePicker && <TouchableOpacity style={styles.btnPrimary} onPress={() => { setShowDatePicker(false); setShowTimePicker(true) }}><Text style={styles.btnTextLight}>Next: Time</Text></TouchableOpacity>}
                  </View>
                </View>
              </Modal>
            )}

            <Text style={[styles.label, { marginTop: 24 }]}>Vehicle Type</Text>

            {vehiclesLoading ? (
              <ActivityIndicator color="#3B82F6" style={{ marginVertical: 16 }} />
            ) : myVehicles.length > 0 ? (
              // ── API vehicles: driver's actual registered cars ──
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
              // ── Fallback: static vehicle type grid ──
              <View>
                <View style={[styles.vehicleGrid]}>
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
                <View style={styles.noVehicleBanner}>
                  <Feather name="alert-circle" size={14} color="#B45309" />
                  <Text style={styles.noVehicleText}>
                    No verified vehicles found. Add a vehicle in your profile first.
                  </Text>
                </View>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 16, marginTop: 20 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Total Seats</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={form.total_seats.toString()} onChangeText={v => update('total_seats', parseInt(v)||1)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Window Seats</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={form.window_seats.toString()} onChangeText={v => update('window_seats', parseInt(v)||0)} />
              </View>
            </View>
          </ScrollView>
        )}

        {/* ================= STEP 3: PRICING & OPTIONS ================= */}
        {step === 3 && (
          <ScrollView style={styles.stepContainer} contentContainerStyle={{ padding: 20 }}>
            <Text style={styles.stepTitle}>Pricing & Preferences</Text>

            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 24 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Base Fare (₹/seat) *</Text>
                <TextInput style={styles.input} keyboardType="numeric" placeholder="e.g. 500" value={form.base_fare} onChangeText={v => update('base_fare', v)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Window Surcharge (₹)</Text>
                <TextInput style={styles.input} keyboardType="numeric" placeholder="0" value={form.window_seat_charge} onChangeText={v => update('window_seat_charge', v)} />
              </View>
            </View>

            <View style={styles.toggleCard}>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}><Text style={styles.toggleLabel}>Accept Parcels</Text><Text style={styles.toggleSub}>Allow customers to send luggage</Text></View>
                <Switch value={form.parcel_enabled} onValueChange={v => update('parcel_enabled', v)} trackColor={{ true: '#3B82F6' }} />
              </View>
              <View style={styles.divider} />
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}><Text style={styles.toggleLabel}>Women-Only Trip</Text><Text style={styles.toggleSub}>Restrict bookings to female riders</Text></View>
                <Switch value={form.women_only} onValueChange={v => update('women_only', v)} trackColor={{ true: '#EC4899' }} />
              </View>
            </View>

            <Text style={[styles.label, { marginTop: 16 }]}>Special Instructions</Text>
            <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]} multiline placeholder="Any specific details for passengers..." value={form.notes} onChangeText={v => update('notes', v)} />
          </ScrollView>
        )}

        {/* ================= STEP 4: REVIEW ================= */}
        {step === 4 && (
          <ScrollView style={styles.stepContainer} contentContainerStyle={{ padding: 20 }}>
            <Text style={styles.stepTitle}>Review & Publish</Text>
            
            <View style={styles.summaryCard}>
              <View style={styles.summaryRoute}>
                <View style={styles.greenDot} />
                <Text style={styles.summaryCity}>{form.pickup_city_display}</Text>
                <Feather name="arrow-right" size={16} color="#94A3B8" style={{ marginHorizontal: 10 }} />
                <View style={styles.redDot} />
                <Text style={styles.summaryCity}>{form.destination_city_display}</Text>
              </View>
              <Text style={styles.summaryTime}>{selectedDate?.toLocaleString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
              <View style={styles.divider} />
              
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}><Feather name="truck" size={16} color="#64748B"/><Text style={styles.summaryValue}>{form.vehicle_type}</Text></View>
                <View style={styles.summaryItem}><Feather name="users" size={16} color="#64748B"/><Text style={styles.summaryValue}>{form.total_seats} Seats</Text></View>
                <View style={styles.summaryItem}><Feather name="map" size={16} color="#64748B"/><Text style={styles.summaryValue}>{routeData?.distanceKm || 0} km</Text></View>
                <View style={styles.summaryItem}><Feather name="tag" size={16} color="#64748B"/><Text style={styles.summaryValue}>₹{form.base_fare}/seat</Text></View>
              </View>
            </View>

            <Text style={styles.summaryInfo}>Trip will be saved as DRAFT. You can publish it from the Home screen when you are ready to drive.</Text>
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
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnTextLight}>{step === 4 ? 'Save Trip Draft' : 'Next Step'}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { backgroundColor: '#1E293B', paddingTop: 40, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
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
  stepHeader: { padding: 20, paddingBottom: 10, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#F1F5F9' },
  stepTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 6 },
  stepSub: { fontSize: 14, color: '#64748B' },
  
  // Map Step
  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E2E8F0' },
  mapOverlays: { position: 'absolute', top: 20, left: 20, right: 20, bottom: 20, justifyContent: 'space-between', pointerEvents: 'box-none' },
  // Search Bar
  searchCard: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  searchInput: { flex: 1, height: 40, fontSize: 15, color: '#1E293B', marginLeft: 10 },
  searchDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 6, marginLeft: 20 },
  routeDistanceBadge: { marginTop: 10, backgroundColor: '#EFF6FF', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  routeDistanceText: { fontSize: 12, color: '#3B82F6', fontWeight: '700' },
  predictionsCard: { backgroundColor: '#FFF', borderRadius: 16, marginTop: 8, paddingVertical: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, maxHeight: 200 },
  predictionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  predictionMain: { fontSize: 15, fontWeight: '500', color: '#1E293B' },
  predictionSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  
  drawingToolbarRow: { flexDirection: 'row', gap: 10, alignSelf: 'center' },
  drawingToolbar: { backgroundColor: '#1E293B', padding: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  drawingText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  
  // UI Elements
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8 },
  input: { backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, padding: 16, fontSize: 16, color: '#0F172A' },
  datePickerBtn: { backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  placeholder: { color: '#94A3B8', fontSize: 16 },
  dateText: { color: '#0F172A', fontSize: 16, fontWeight: '600' },
  vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  vCard: { flex: 1, minWidth: '45%', backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 16, padding: 20, alignItems: 'center', gap: 10 },
  vCardActive: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
  vCardText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  vCardTextActive: { color: '#2563EB' },
  
  // Toggles
  toggleCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 4, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 10 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  toggleSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 16 },

  // Summary
  summaryCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 },
  summaryRoute: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  summaryCity: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  summaryTime: { fontSize: 15, color: '#3B82F6', fontWeight: '600', marginBottom: 20 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginTop: 20 },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '40%' },
  summaryValue: { fontSize: 15, fontWeight: '600', color: '#334155' },
  summaryInfo: { fontSize: 14, color: '#64748B', textAlign: 'center', paddingHorizontal: 20, lineHeight: 22 },

  // Footers & Buttons
  footer: { backgroundColor: '#FFF', padding: 20, borderTopWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', gap: 12 },
  btnPrimary: { flex: 1, backgroundColor: '#2563EB', borderRadius: 16, padding: 18, alignItems: 'center', shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btnSecondary: { backgroundColor: '#F1F5F9', borderRadius: 16, padding: 18, alignItems: 'center', paddingHorizontal: 30 },
  btnTextLight: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  btnTextDark: { color: '#334155', fontSize: 16, fontWeight: '700' },
  btnDraw: { backgroundColor: '#22C55E', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5, elevation: 4 },
  btnFinish: { backgroundColor: '#22C55E', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  btnTextBlue: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
  
  // Dots
  greenDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22C55E' },
  redDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  dotP: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22C55E', borderWidth: 1.5, borderColor: '#fff' },
  dotD: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#fff' },

  // iOS Picker
  iosPickerBg: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  iosPicker: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },

  // P3.4 — Verified vehicle badges
  verifiedBadge: {
    marginTop: 4, backgroundColor: '#D1FAE5', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'center',
  },
  verifiedText: { color: '#065F46', fontSize: 10, fontWeight: '700' },
  pendingBadge: {
    marginTop: 4, backgroundColor: '#FEF9C3', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'center',
  },
  pendingText: { color: '#92400E', fontSize: 10, fontWeight: '700' },
  noVehicleBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFBEB', borderRadius: 10, padding: 10, marginTop: 10,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  noVehicleText: { color: '#92400E', fontSize: 12, fontWeight: '600', flex: 1 },
})
