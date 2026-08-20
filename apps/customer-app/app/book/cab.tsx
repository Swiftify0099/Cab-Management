/**
 * Book Cab Screen — Ride Search, Route Preview & Ride Selection
 * Phase 2: Real fares only, DatePicker, dynamic saved places, correct payment navigation
 */
import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, ScrollView, ActivityIndicator, Alert, Switch, StatusBar, Modal, Platform, Dimensions,
} from 'react-native'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps'
import DateTimePicker from '@react-native-community/datetimepicker'
import { api, profileApi, bookingApi, parcelApi, routeApi } from '../../src/api/client'
import { geocodeCity, getRoutePolyline } from '../../src/utils/maps'

const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjRlYjFhNDY4Y2ExZDQ0NmU4OWQ0Yjk3ZWI5ZGEzN2FjIiwiaCI6Im11cm11cjY0In0='


const VEHICLE_TYPE_META: Record<string, { label: string; icon: string; seats: number }> = {
  sedan:    { label: 'Sedan',    icon: 'car-side',           seats: 5  },
  suv:      { label: 'SUV',     icon: 'car-sports',         seats: 7  },
  minibus:  { label: 'Mini Bus',icon: 'bus-side',           seats: 16 },
  bus:      { label: 'Bus',     icon: 'bus-alert',          seats: 19 },
  coach:    { label: 'Coach',   icon: 'bus-school',         seats: 25 },
  volvo:    { label: 'Volvo',   icon: 'bus-double-decker',  seats: 50 },
  parcel:   { label: 'Parcel',  icon: 'truck-delivery',     seats: 2  },
}

interface Trip {
  id: string; pickup_city: string; destination_city: string
  departure_time: string; available_seats: number; total_seats: number
  base_fare: number; distance_km: number; parcel_enabled: boolean; women_only: boolean
  vehicle_type?: string
}
interface FareEstimate {
  vehicle_type: string; per_seat_fare: number; total_fare: number
  distance_km: number; eta_minutes: number
}

export default function BookCabScreen() {
  const params = useLocalSearchParams<{
    pickup?: string; destination?: string;
    parcelSearch?: string; weight?: string; parcelType?: string; parcelImageUri?: string;
  }>()

  const [step, setStep] = useState<'form' | 'results'>('form')
  const [fromCity, setFromCity] = useState(params.pickup || '')
  const [toCity, setToCity] = useState(params.destination || '')
  const [activeInput, setActiveInput] = useState<'from' | 'to'>('from')
  // Date picker state
  const [isPreBooking, setIsPreBooking] = useState(false)
  const [travelDate, setTravelDate] = useState<Date>(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [seats, setSeats] = useState(1)
  const [withParcel, setWithParcel] = useState(false)
  const [womenOnly, setWomenOnly] = useState(false)
  const [isPriority, setIsPriority] = useState(false)  // Emergency/priority dispatch
  const [loading, setLoading] = useState(false)
  const [trips, setTrips] = useState<Trip[]>([])
  const [fares, setFares] = useState<FareEstimate[]>([])
  const [resultMode, setResultMode] = useState<'trips' | 'fares' | 'none'>('none')
  const [selectedVehicle, setSelectedVehicle] = useState('')
  const [booking, setBooking] = useState(false)
  const [chooseSeat, setChooseSeat] = useState(false)
  const [routeCoords, setRouteCoords] = useState<{latitude: number, longitude: number}[]>([])
  const [pickupCoords, setPickupCoords] = useState<{lat: number, lon: number} | null>(null)
  const [destCoords, setDestCoords] = useState<{lat: number, lon: number} | null>(null)
  // Saved addresses and routes from profile
  const [savedPlaces, setSavedPlaces] = useState<{label: string; address: string; address_type: string}[]>([]);
  const [savedRoutes, setSavedRoutes] = useState<{id: string; route_name: string; pickup_address: string; drop_address: string}[]>([]);
  const [recentDests, setRecentDests] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      // Load saved addresses and routes when screen comes into focus
      profileApi.getAddresses().then(res => {
        const data = res.data?.data || res.data || [];
        if (Array.isArray(data)) setSavedPlaces(data);
      }).catch(() => {});
      routeApi.getRoutes().then(res => {
        const data = res.data?.data || res.data || [];
        if (Array.isArray(data)) setSavedRoutes(data);
      }).catch(() => {});
    }, [])
  );

  useEffect(() => {
    if (params.parcelSearch === 'true') {
      setWithParcel(true)
    }
  }, [params.parcelSearch])

  // Sync params back to local state when returning from map picker
  useEffect(() => {
    if (params.pickup && params.pickup !== fromCity) {
      setFromCity(params.pickup);
      setActiveInput('to'); // auto advance
    }
    if (params.destination && params.destination !== toCity) {
      setToCity(params.destination);
    }
  }, [params.pickup, params.destination]);

  const dateLabel = travelDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeLabel = travelDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  const handleDateChange = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false)
    if (selected) setTravelDate(selected)
  }

  const handleTimeChange = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false)
    if (selected) setTravelDate(selected)
  }

  const handleSearch = async () => {
    if (!fromCity.trim() || !toCity.trim()) {
      Alert.alert('Fill in all fields', 'Please enter From and To city.')
      return
    }
    setLoading(true)
    setTrips([])
    setFares([])
    setResultMode('none')
    try {
      let startLoc = null
      let endLoc = null
      try {
        startLoc = await geocodeCity(fromCity.trim())
        endLoc = await geocodeCity(toCity.trim())
      } catch (e) {
        console.warn('Geocoding failed:', e)
      }

      if (!startLoc && !endLoc) {
        Alert.alert(
          'Location Not Found',
          `Could not find coordinates for:\n• ${fromCity}\n• ${toCity}\n\nPlease use the map icon 📍 to pick your locations precisely.`
        )
        setLoading(false)
        return
      }
      if (!startLoc) {
        Alert.alert('Pickup Not Found', `Could not find "${fromCity}". Tap the 📍 map icon next to Pickup to select it on the map.`)
        setLoading(false)
        return
      }
      if (!endLoc) {
        Alert.alert('Destination Not Found', `Could not find "${toCity}". Tap the 📍 map icon next to Destination to select it on the map.`)
        setLoading(false)
        return
      }

      setPickupCoords(startLoc)
      setDestCoords(endLoc)

      // Use local date (not UTC) to avoid off-by-one day for IST users
      const d = isPreBooking ? travelDate : new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

      // ── Try: Search existing published trips ──
      try {
        const res = await api.post('/trips/search', {
          from_lat: startLoc.lat, from_lng: startLoc.lon,
          to_lat: endLoc.lat,   to_lng: endLoc.lon,
          departure_date: dateStr,
          seats_needed: seats,
          with_parcel: withParcel,
          women_only: womenOnly,
        })
        const foundTrips: Trip[] = res.data?.data || []
        if (foundTrips.length > 0) {
          setTrips(foundTrips)
          setResultMode('trips')
          // Auto-select first trip's vehicle type
          setSelectedVehicle(foundTrips[0].vehicle_type || 'sedan')
        } else {
          // No trips → try fare estimate
          throw new Error('no trips')
        }
      } catch {
        // ── Fallback: fare estimate for pending booking ──
        try {
          const fareRes = await api.post('/bookings/fare', {
            from_lat: startLoc.lat, from_lng: startLoc.lon,
            to_lat: endLoc.lat,   to_lng: endLoc.lon,
            departure_time: new Date(dateStr + 'T08:00').toISOString(),
            seats, with_parcel: withParcel,
          })
          const fareData: FareEstimate[] = fareRes.data?.data || []
          if (fareData.length > 0) {
            setFares(fareData)
            setResultMode('fares')
            setSelectedVehicle(fareData[0].vehicle_type)
          } else {
            setResultMode('none')
          }
        } catch {
          setResultMode('none')
        }
      }

      // ── Polyline from ORS (non-blocking) ──
      try {
        const polyline = await getRoutePolyline(startLoc, endLoc, ORS_API_KEY)
        if (polyline) setRouteCoords(polyline)
      } catch { /* non-fatal */ }

    } finally {
      setLoading(false)
      setStep('results')
    }
  }

  const handleBookTrip = async (trip: Trip) => {
    setBooking(true)
    try {
      if (params.parcelSearch === 'true') {
        const weight = parseFloat(params.weight || '5')
        const parcelType = params.parcelType || 'others'
        const res = await parcelApi.createBooking({
          trip_id: trip.id,
          sender_name: 'Me',
          sender_phone: '1234567890',
          receiver_name: 'Receiver',
          receiver_phone: '0987654321',
          receiver_address: toCity,
          weight_kg: weight,
          description: parcelType,
          fragile: parcelType === 'fragile',
          urgent: isPriority,
        })
        
        const newParcelId = res.data?.data?.id || res.data?.id
        if (newParcelId && params.parcelImageUri) {
          try {
            const formData = new FormData() as any
            const filename = params.parcelImageUri.split('/').pop() || 'parcel.jpg'
            formData.append('file', {
              uri: params.parcelImageUri,
              name: filename,
              type: 'image/jpeg',
            })
            await parcelApi.uploadPhoto(newParcelId, formData)
          } catch (e) {
            console.warn('Failed to upload parcel image', e)
          }
        }

        Alert.alert('📦 Parcel Requested!', `Driver for ${trip.vehicle_type} will review your request.`, [
          { text: 'View Parcels', onPress: () => router.push('/(tabs)/parcels' as any) }
        ])
        return
      }

      const res = await api.post('/bookings/', {
        trip_id: trip.id,
        seat_count: seats,
        has_parcel: withParcel,
        seat_preference: chooseSeat ? 'window' : 'any',
      })
      const newBooking = res.data?.data
      const bookingId = newBooking?.id

      if (bookingId) {
        if (chooseSeat) {
          router.push(`/book/seats?bookingId=${bookingId}&tripId=${trip.id}&fare=${newBooking.total_fare}` as any)
        } else {
          router.push(`/payment?bookingId=${bookingId}` as any)
        }
      } else {
        Alert.alert('🎉 Booked!', `${seats} seat(s) on ${trip.pickup_city} → ${trip.destination_city}`, [
          { text: 'View Trips', onPress: () => router.push('/(tabs)/trips' as any) }
        ])
      }
    } catch (e: any) {
      Alert.alert('Booking Failed', e?.response?.data?.detail || 'Please try again')
    } finally { setBooking(false) }
  }

  const savedPickups = savedPlaces.filter(p => p.address_type === 'pickup' || p.address_type === 'general').slice(0, 4);
  const savedDrops = savedPlaces.filter(p => p.address_type === 'drop' || p.address_type === 'general').slice(0, 4);

  // ── STEP 1: Address Entry (Clean Stepper, No Map) ─────────────────
  if (step === 'form') {
    return (
      <SafeAreaView style={styles.formRoot} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

        {/* Header */}
        <View style={styles.formHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.formBack}>
            <Feather name="arrow-left" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.formHeaderTitle}>Plan Your Ride</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.stepperContainer} showsVerticalScrollIndicator={false}>
          
          {/* STEP 1: Locations */}
          <View style={styles.stepBlock}>
            <View style={styles.stepTitleRow}>
              <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>1</Text></View>
              <Text style={styles.stepTitleText}>Where to?</Text>
            </View>
            
            {/* Saved Routes — quick-fill both fields at once */}
            {savedRoutes.length > 0 && (
              <View style={styles.routeChipsSection}>
                <View style={styles.routeChipsHeader}>
                  <Feather name="navigation" size={14} color="#6366F1" />
                  <Text style={styles.routeChipsLabel}>Saved Routes</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                  {savedRoutes.map(r => (
                    <TouchableOpacity
                      key={r.id}
                      style={styles.routeChip}
                      onPress={() => {
                        setFromCity(r.pickup_address);
                        setToCity(r.drop_address);
                        setActiveInput('to');
                      }}
                    >
                      <Feather name="navigation" size={13} color="#6366F1" style={{ marginRight: 5 }} />
                      <Text style={styles.routeChipText} numberOfLines={1}>{r.route_name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.locationCard}>
              <View style={styles.locationRow}>
                <View style={styles.locationDotBlue} />
                <TextInput
                  style={styles.locationInput}
                  placeholder="Pickup City (e.g. Pune)"
                  placeholderTextColor="#94A3B8"
                  value={fromCity}
                  onChangeText={setFromCity}
                  onFocus={() => setActiveInput('from')}
                  autoCapitalize="words"
                />
                <TouchableOpacity onPress={() => router.push('/profile/address-picker?targetType=pickup&mode=pick')}>
                  <Feather name="map" size={20} color="#2563EB" style={{ padding: 8 }} />
                </TouchableOpacity>
              </View>
              <View style={styles.locationDivider} />
              <View style={styles.locationRow}>
                <View style={styles.locationDotSquare} />
                <TextInput
                  style={styles.locationInput}
                  placeholder="Destination City (e.g. Mumbai)"
                  placeholderTextColor="#94A3B8"
                  value={toCity}
                  onChangeText={setToCity}
                  onFocus={() => setActiveInput('to')}
                  autoCapitalize="words"
                />
                <TouchableOpacity onPress={() => router.push('/profile/address-picker?targetType=drop&mode=pick')}>
                  <Feather name="map" size={20} color="#EF4444" style={{ padding: 8 }} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Saved Places Chips */}
            {(activeInput === 'from' ? savedPickups : savedDrops).length > 0 && (
              <View style={styles.savedRow}>
                {(activeInput === 'from' ? savedPickups : savedDrops).map(p => (
                  <TouchableOpacity
                    key={p.label}
                    style={styles.savedChip}
                    onPress={() => {
                      if (activeInput === 'from') setFromCity(p.address || '');
                      else setToCity(p.address || '');
                    }}
                  >
                    <Feather name="map-pin" size={12} color={activeInput === 'from' ? "#6366F1" : "#EF4444"} style={{ marginRight: 5 }} />
                    <Text style={styles.savedChipText}>{p.label?.charAt(0).toUpperCase() + (p.label?.slice(1) || '')}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* STEP 2: Pre-book & Schedule */}
          <View style={styles.stepBlock}>
            <View style={styles.stepTitleRow}>
              <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>2</Text></View>
              <Text style={styles.stepTitleText}>Schedule</Text>
            </View>

            <View style={styles.cardBlock}>
              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Pre-book for later?</Text>
                  <Text style={styles.toggleSub}>Schedule a ride in advance</Text>
                </View>
                <Switch value={isPreBooking} onValueChange={setIsPreBooking} trackColor={{ false: '#E2E8F0', true: '#6366F1' }} thumbColor="#fff" />
              </View>

              {isPreBooking && (
                <View style={styles.datePickerRow}>
                  <TouchableOpacity style={styles.datePicker} onPress={() => setShowDatePicker(true)}>
                    <Feather name="calendar" size={16} color="#64748B" />
                    <Text style={styles.datePickerText}>{dateLabel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.datePicker} onPress={() => setShowTimePicker(true)}>
                    <Feather name="clock" size={16} color="#64748B" />
                    <Text style={styles.datePickerText}>{timeLabel}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Android Pickers */}
          {Platform.OS === 'android' && showDatePicker && (
            <DateTimePicker value={travelDate} mode="date" display="calendar" minimumDate={new Date()} onChange={handleDateChange} />
          )}
          {Platform.OS === 'android' && showTimePicker && (
            <DateTimePicker value={travelDate} mode="time" display="clock" onChange={handleTimeChange} />
          )}

          {/* iOS Pickers Modal */}
          {Platform.OS === 'ios' && (showDatePicker || showTimePicker) && (
            <Modal transparent visible animationType="slide">
              <View style={styles.iosPickerBg}>
                <View style={styles.iosPicker}>
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
                    <TouchableOpacity onPress={() => { setShowDatePicker(false); setShowTimePicker(false) }}>
                      <Text style={{ color: '#2563EB', fontWeight: '700', fontSize: 16 }}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker value={travelDate} mode={showDatePicker ? "date" : "time"} display="spinner" minimumDate={new Date()} onChange={showDatePicker ? handleDateChange : handleTimeChange} />
                </View>
              </View>
            </Modal>
          )}

          {/* STEP 3: Preferences */}
          <View style={styles.stepBlock}>
            <View style={styles.stepTitleRow}>
              <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>3</Text></View>
              <Text style={styles.stepTitleText}>Preferences</Text>
            </View>

            <View style={styles.cardBlock}>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>👥 Required Seats</Text>
                <View style={styles.seatCounter}>
                  <TouchableOpacity onPress={() => setSeats(s => Math.max(1, s - 1))} style={styles.seatBtn}>
                    <Feather name="minus" size={16} color="#6366F1" />
                  </TouchableOpacity>
                  <Text style={styles.seatCount}>{seats}</Text>
                  <TouchableOpacity onPress={() => setSeats(s => Math.min(10, s + 1))} style={styles.seatBtn}>
                    <Feather name="plus" size={16} color="#6366F1" />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>📦 Add Parcel</Text>
                <Switch value={withParcel} onValueChange={setWithParcel} trackColor={{ false: '#E2E8F0', true: '#6366F1' }} thumbColor="#fff" />
              </View>
            </View>
          </View>
          
          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Done Button */}
        <View style={styles.doneWrap}>
          <TouchableOpacity
            style={[styles.doneBtn, loading && { opacity: 0.6 }]}
            onPress={handleSearch}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.doneBtnText}>{isPreBooking ? 'Find Scheduled Rides' : 'Search Rides Now'}</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // ── STEP 2: Ride Selection (dark bottom sheet) ────────
  return (
    <View style={styles.resultsRoot}>
      <StatusBar hidden />

      {/* Full-screen Map Background */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={{ width: Dimensions.get('window').width, height: Dimensions.get('window').height }}
        initialRegion={
          pickupCoords && destCoords ? {
            latitude: (pickupCoords.lat + destCoords.lat) / 2,
            longitude: (pickupCoords.lon + destCoords.lon) / 2,
            latitudeDelta: Math.abs(pickupCoords.lat - destCoords.lat) * 1.5 + 0.5,
            longitudeDelta: Math.abs(pickupCoords.lon - destCoords.lon) * 1.5 + 0.5,
          } : { latitude: 19.0760, longitude: 72.8777, latitudeDelta: 4, longitudeDelta: 4 }
        }
      >
        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeColor="#3B82F6" strokeWidth={4} lineDashPattern={undefined} />
        )}
        {pickupCoords && routeCoords.length === 0 && destCoords && (
          <Polyline
            coordinates={[
              { latitude: pickupCoords.lat, longitude: pickupCoords.lon },
              { latitude: destCoords.lat, longitude: destCoords.lon },
            ]}
            strokeColor="#3B82F6"
            strokeWidth={3}
            lineDashPattern={[8, 4]}
          />
        )}
      </MapView>

      {/* Map Controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity style={styles.mapCtrlBtn}><Feather name="plus" size={20} color="#94A3B8" /></TouchableOpacity>
        <View style={styles.mapCtrlDivider} />
        <TouchableOpacity style={styles.mapCtrlBtn}><Feather name="minus" size={20} color="#94A3B8" /></TouchableOpacity>
      </View>

      {/* Header on map */}
      <SafeAreaView style={styles.mapHeaderWrap}>
        <View style={styles.mapHeader}>
          <TouchableOpacity onPress={() => setStep('form')} style={styles.mapBack}>
            <Feather name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <Text style={styles.mapTitle}>Ride Selection &{'\n'}Route Preview</Text>
        </View>
      </SafeAreaView>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        <View style={styles.bsHandle} />

        <View style={styles.bsHeaderRow}>
          <View>
            <Text style={styles.bsTitle}>
              {resultMode === 'trips' ? `${trips.length} Ride${trips.length !== 1 ? 's' : ''} Found` : 'Select Ride Type'}
            </Text>
            <Text style={styles.bsSubtitle}>{fromCity} → {toCity} • {dateLabel}</Text>
          </View>
          <TouchableOpacity style={styles.bsCloseBtn} onPress={() => setStep('form')}>
            <Feather name="x" size={18} color="#D1D5DB" />
          </TouchableOpacity>
        </View>

        {/* ── TRIPS mode: real trip cards ── */}
        {resultMode === 'trips' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehicleScroll} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            {trips.map((trip) => {
              const meta = VEHICLE_TYPE_META[trip.vehicle_type || 'sedan'] || VEHICLE_TYPE_META['sedan']
              const isSelected = selectedVehicle === trip.id
              const etaMin = Math.round(trip.distance_km * 0.5)
              return (
                <TouchableOpacity
                  key={trip.id}
                  style={[styles.vehicleCard, isSelected && styles.vehicleCardActive]}
                  onPress={() => setSelectedVehicle(trip.id)}
                  activeOpacity={0.85}
                >
                  {isSelected && (
                    <LinearGradient colors={['rgba(139,92,246,0.2)', 'transparent']} style={StyleSheet.absoluteFill} />
                  )}
                  <Text style={styles.vehicleLabel}>{meta.label}</Text>
                  <View style={styles.vehicleIconBox}>
                    <MaterialCommunityIcons name={meta.icon as any} size={48} color={isSelected ? '#E5E7EB' : '#94A3B8'} />
                  </View>
                  <View style={styles.vehicleMeta}>
                    <Feather name="clock" size={11} color="#9CA3AF" />
                    <Text style={styles.vehicleMetaText}> {Math.floor(etaMin/60)}h {etaMin%60}m</Text>
                  </View>
                  <View style={styles.vehicleMeta}>
                    <Feather name="user" size={11} color="#9CA3AF" />
                    <Text style={styles.vehicleMetaText}> {trip.available_seats} seats left</Text>
                  </View>
                  {trip.women_only && (
                    <View style={styles.womenBadge}><Text style={styles.womenBadgeText}>👩 Women Only</Text></View>
                  )}
                  <Text style={styles.vehiclePrice}>₹{trip.base_fare}</Text>
                  <Text style={styles.vehiclePriceSub}>per seat • incl. tolls</Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        )}

        {/* ── FARES mode: fare estimates for pending booking ── */}
        {resultMode === 'fares' && fares.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehicleScroll} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            {fares.map((fare) => {
              const meta = VEHICLE_TYPE_META[fare.vehicle_type] || VEHICLE_TYPE_META['sedan']
              const isSelected = selectedVehicle === fare.vehicle_type
              return (
                <TouchableOpacity
                  key={fare.vehicle_type}
                  style={[styles.vehicleCard, isSelected && styles.vehicleCardActive]}
                  onPress={() => setSelectedVehicle(fare.vehicle_type)}
                  activeOpacity={0.85}
                >
                  {isSelected && (
                    <LinearGradient colors={['rgba(139,92,246,0.2)', 'transparent']} style={StyleSheet.absoluteFill} />
                  )}
                  <Text style={styles.vehicleLabel}>{meta.label}</Text>
                  <View style={styles.vehicleIconBox}>
                    <MaterialCommunityIcons name={meta.icon as any} size={48} color={isSelected ? '#E5E7EB' : '#94A3B8'} />
                  </View>
                  <View style={styles.vehicleMeta}>
                    <Feather name="clock" size={11} color="#9CA3AF" />
                    <Text style={styles.vehicleMetaText}> {Math.floor(fare.eta_minutes/60)}h {fare.eta_minutes%60}m</Text>
                  </View>
                  <View style={styles.vehicleMeta}>
                    <Feather name="map-pin" size={11} color="#9CA3AF" />
                    <Text style={styles.vehicleMetaText}> {fare.distance_km}km</Text>
                  </View>
                  <Text style={styles.vehiclePrice}>₹{fare.per_seat_fare}</Text>
                  <Text style={styles.vehiclePriceSub}>estimated • incl. tolls</Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        )}

        {/* ── No results ── */}
        {resultMode === 'none' && (
          <View style={styles.noResults}>
            <Text style={{ fontSize: 36 }}>🔍</Text>
            <Text style={styles.noResultsText}>No rides found for this route</Text>
            <Text style={styles.noResultsSub}>Try different dates or pre-book for a later trip</Text>
          </View>
        )}

        {/* Options row — chips */}
        <View style={styles.optionsRow}>
          {/* Choose Seat chip */}
          <TouchableOpacity
            style={[styles.filterChip, chooseSeat && styles.filterChipActive]}
            onPress={() => setChooseSeat(v => !v)}
          >
            <Feather name="grid" size={14} color={chooseSeat ? '#6366F1' : '#94A3B8'} />
            <Text style={[styles.filterChipText, chooseSeat && styles.filterChipTextActive]}>Choose Seat</Text>
          </TouchableOpacity>

          {/* Women-only chip (P4.4) */}
          <TouchableOpacity
            style={[styles.filterChip, womenOnly && styles.filterChipWomen]}
            onPress={() => setWomenOnly(v => !v)}
          >
            <Text style={{ fontSize: 14 }}>👩</Text>
            <Text style={[styles.filterChipText, womenOnly && { color: '#EC4899' }]}>Women Only</Text>
          </TouchableOpacity>

          {/* Priority / Emergency chip */}
          <TouchableOpacity
            style={[styles.filterChip, isPriority && styles.filterChipPriority]}
            onPress={() => {
              setIsPriority(v => !v)
              if (!isPriority) Alert.alert('⚡ Priority Dispatch', 'Your request will be sent to the nearest available driver immediately. A small priority fee may apply.')
            }}
          >
            <Text style={{ fontSize: 14 }}>⚡</Text>
            <Text style={[styles.filterChipText, isPriority && { color: '#F97316' }]}>Priority</Text>
          </TouchableOpacity>

          {/* Coupon button */}
          <TouchableOpacity style={styles.couponBtn}>
            <Text style={styles.couponText}>Coupon</Text>
            <MaterialCommunityIcons name="tag-outline" size={14} color="white" />
          </TouchableOpacity>
        </View>

        {/* Book Now / Next */}
        <View style={styles.bookBtnWrap}>
          <TouchableOpacity
            style={[styles.bookNowBtn, booking && { opacity: 0.7 }]}
            onPress={async () => {
              if (resultMode === 'trips' && trips.length > 0) {
                const trip = trips.find(t => t.id === selectedVehicle) || trips[0]
                handleBookTrip(trip)
              } else if (resultMode === 'fares') {
                // Create pending booking → matching wait
                setBooking(true)
                try {
                  const dateStr = travelDate.toISOString().split('T')[0]
                  const res = await api.post('/bookings/pending', {
                    pickup_address: fromCity,
                    pickup_lat: pickupCoords?.lat || 0,
                    pickup_lng: pickupCoords?.lon || 0,
                    destination_address: toCity,
                    destination_lat: destCoords?.lat || 0,
                    destination_lng: destCoords?.lon || 0,
                    travel_date: dateStr,
                    from_time: '00:00', to_time: '23:59',
                    seats_required: seats,
                    parcel: withParcel,
                    women_only: womenOnly,
                    vehicle_type: selectedVehicle,
                    priority: isPriority,
                  })
                  const pbId = res.data?.data?.id
                  router.push(`/matching-waiting?pendingBookingId=${pbId}` as any)
                } catch (e: any) {
                  Alert.alert('Error', e?.response?.data?.detail || 'Could not create request')
                } finally { setBooking(false) }
              } else {
                router.push('/pre-booking' as any)
              }
            }}
            disabled={booking}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#06B6D4', '#3B82F6', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.bookNowGradient}>
              {booking
                ? <ActivityIndicator color="white" />
                : <Text style={styles.bookNowText}>
                    {resultMode === 'trips' ? 'Book Shared Seat' : resultMode === 'fares' ? 'Find a Driver' : 'Pre-Book for Later'}
                  </Text>
              }
              <Feather name={resultMode === 'trips' ? 'check-circle' : 'search'} size={20} color="white" style={{ marginLeft: 8 }} />
            </LinearGradient>
          </TouchableOpacity>

          {resultMode === 'fares' && (
            <TouchableOpacity
              style={{ marginTop: 12, borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)', borderRadius: 16, paddingVertical: 13, alignItems: 'center', backgroundColor: 'rgba(139,92,246,0.08)' }}
              onPress={() => router.push('/pre-booking' as any)}
            >
              <Text style={{ color: '#A78BFA', fontSize: 14, fontWeight: '600' }}>No driver? Pre-Book for later →</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  // ── Form Stepper ─────────────────────────────────────────────
  formRoot: { flex: 1, backgroundColor: '#F8FAFC' },
  formHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  formBack: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  formHeaderTitle: { color: '#0F172A', fontSize: 18, fontWeight: '700' },
  stepperContainer: { padding: 20, paddingBottom: 100 },
  
  stepBlock: { marginBottom: 24 },
  stepTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stepBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  stepBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  stepTitleText: { fontSize: 16, fontWeight: '700', color: '#0F172A' },

  cardBlock: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },

  locationCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 },
  locationRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  locationDotBlue: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3B82F6', marginRight: 14 },
  locationDotSquare: { width: 10, height: 10, backgroundColor: '#EF4444', marginRight: 14 },
  locationDivider: { width: 1, height: 20, backgroundColor: '#E2E8F0', marginLeft: 4, marginVertical: 4 },
  locationInput: { flex: 1, color: '#0F172A', fontSize: 15, paddingVertical: 8 },
  
  savedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  savedChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#C7D2FE' },
  savedChipText: { color: '#4F46E5', fontSize: 13, fontWeight: '500' },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  toggleLabel: { color: '#0F172A', fontSize: 15, fontWeight: '600' },
  toggleSub: { color: '#64748B', fontSize: 12, marginTop: 2 },
  
  datePickerRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  datePicker: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F8FAFC', borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  datePickerText: { color: '#0F172A', fontSize: 14, fontWeight: '500' },
  
  seatCounter: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  seatBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  seatCount: { color: '#0F172A', fontSize: 18, fontWeight: '700', minWidth: 20, textAlign: 'center' },

  doneWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#F8FAFC', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  doneBtn: { backgroundColor: '#2563EB', borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  doneBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // ── Results ───────────────────────────────────────────
  resultsRoot: { width: Dimensions.get('window').width, height: Dimensions.get('window').height, backgroundColor: '#111827' },
  mapControls: {
    position: 'absolute', top: '45%', left: 16,
    backgroundColor: 'rgba(30,41,59,0.85)', borderRadius: 14,
    overflow: 'hidden', borderWidth: 1, borderColor: '#4B5563',
  },
  mapCtrlBtn: { padding: 12, alignItems: 'center', justifyContent: 'center' },
  mapCtrlDivider: { height: 1, backgroundColor: '#4B5563' },
  mapHeaderWrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  mapHeader: { paddingHorizontal: 24, paddingTop: 48, flexDirection: 'row', alignItems: 'flex-end', gap: 16 },
  mapBack: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  mapTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '700', lineHeight: 36, textShadowColor: '#000', textShadowRadius: 8 },

  iosPickerBg: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  iosPicker: {
    backgroundColor: '#1E293B', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40,
  },

  // Women badge on trip cards
  womenBadge: {
    backgroundColor: 'rgba(236,72,153,0.2)', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2, marginTop: 4,
  },
  womenBadgeText: { color: '#F9A8D4', fontSize: 10, fontWeight: '700' },

  // No results state
  noResults: { alignItems: 'center', paddingVertical: 20 },
  noResultsText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15, marginTop: 8 },
  noResultsSub: { color: '#6B7280', fontSize: 12, marginTop: 4, textAlign: 'center' },

  // bsSubtitle
  bsSubtitle: { color: '#94A3B8', fontSize: 12, marginTop: 2 },

  // Bottom sheet
  bottomSheet: {
    position: 'absolute', bottom: 0, width: '100%', height: '58%',
    backgroundColor: 'rgba(31,41,55,0.95)', borderTopLeftRadius: 30, borderTopRightRadius: 30,
    borderTopWidth: 1, borderTopColor: '#4B5563',
    shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 20, elevation: 20,
  },
  bsHandle: { width: 48, height: 6, backgroundColor: '#4B5563', borderRadius: 3, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  bsHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 16 },
  bsTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', letterSpacing: 0.3 },
  bsCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center' },

  vehicleScroll: { height: 210 },
  vehicleCard: {
    width: 140, height: 200, backgroundColor: 'rgba(55,65,81,0.6)',
    borderRadius: 20, marginRight: 14, borderWidth: 1, borderColor: '#4B5563', padding: 12,
    overflow: 'hidden',
  },
  vehicleCardActive: { borderColor: '#8B5CF6' },
  vehicleLabel: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', marginBottom: 8 },
  vehicleIconBox: { height: 64, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  vehicleMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  vehicleMetaText: { color: '#D1D5DB', fontSize: 11 },
  vehiclePrice: { color: '#FFFFFF', fontWeight: '700', fontSize: 18, marginTop: 6, lineHeight: 22 },
  vehiclePriceSub: { color: '#9CA3AF', fontSize: 10 },

  optionsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginTop: 4, marginBottom: 8, gap: 8,
  },
  // Filter chips (P4.4)
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#374151', paddingHorizontal: 11, paddingVertical: 9,
    borderRadius: 20, borderWidth: 1, borderColor: '#4B5563',
  },
  filterChipActive: { borderColor: '#6366F1', backgroundColor: 'rgba(99,102,241,0.15)' },
  filterChipWomen: { borderColor: '#EC4899', backgroundColor: 'rgba(236,72,153,0.15)' },
  filterChipPriority: { borderColor: '#F97316', backgroundColor: 'rgba(249,115,22,0.15)' },
  filterChipText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  filterChipTextActive: { color: '#818CF8' },
  couponBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#374151', paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 14, borderWidth: 1, borderColor: '#4B5563', gap: 6,
  },
  couponText: { color: '#FFFFFF', fontSize: 12 },

  bookBtnWrap: { paddingHorizontal: 24, paddingBottom: 24 },
  bookNowBtn: { borderRadius: 20, overflow: 'hidden', shadowColor: '#3B82F6', shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  bookNowGradient: { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  bookNowText: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },

  // Saved routes chips
  routeChipsSection: { marginBottom: 12 },
  routeChipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  routeChipsLabel: { fontSize: 12, fontWeight: '700', color: '#6366F1', textTransform: 'uppercase', letterSpacing: 0.5 },
  routeChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EEF2FF', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1.5, borderColor: '#C7D2FE', marginRight: 8,
    maxWidth: 180,
  },
  routeChipText: { fontSize: 13, fontWeight: '600', color: '#4338CA' },
})
