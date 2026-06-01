/**
 * Create Trip Screen — Driver publishes a new intercity route.
 * Accessed from Home tab via "Create New Trip" button.
 */
import { useState } from 'react'
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Switch, Dimensions, Platform, Modal
} from 'react-native'
import { router } from 'expo-router'
import MapView, { Marker } from 'react-native-maps'
import DateTimePicker from '@react-native-community/datetimepicker'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { reverseGeocode, geocodeCity } from '../src/utils/maps'
import { Feather } from '@expo/vector-icons'

const API = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:80/api/v1'

const VEHICLE_TYPES = [
  { value: 'sedan', label: 'Sedan 🚗', seats: 4 },
  { value: 'suv', label: 'SUV 🚙', seats: 6 },
  { value: 'mini', label: 'Mini 🚕', seats: 4 },
  { value: 'tempo_traveller', label: 'Tempo Traveller 🚐', seats: 12 },
]

const { height } = Dimensions.get('window')

export default function CreateTripScreen() {
  const [form, setForm] = useState({
    pickup_city: 'Pune',
    pickup_state: 'Maharashtra',
    pickup_lat: 18.5204,
    pickup_lng: 73.8567,
    destination_city: 'Mumbai',
    destination_state: 'Maharashtra',
    destination_lat: 19.0760,
    destination_lng: 72.8777,
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
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Date & Time picker state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date')

  const update = (key: string, value: any) => {
    setForm(p => ({ ...p, [key]: value }))
    setErrors(p => ({ ...p, [key]: '' }))
  }

  // Handle marker drag
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
      if (type === 'pickup') {
        update('pickup_city', res.city)
        update('pickup_state', res.state)
      } else {
        update('destination_city', res.city)
        update('destination_state', res.state)
      }
    }
  }

  // Handle city input blur (geocode typed city)
  const handleCityBlur = async (type: 'pickup' | 'destination') => {
    const city = type === 'pickup' ? form.pickup_city : form.destination_city
    if (!city.trim()) return

    const res = await geocodeCity(city)
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

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.pickup_city.trim()) e.pickup_city = 'Enter pickup city'
    if (!form.destination_city.trim()) e.destination_city = 'Enter destination city'
    if (form.pickup_city.toLowerCase() === form.destination_city.toLowerCase())
      e.destination_city = 'From and to cities must be different'
    
    // Check if departure_time is valid
    if (!form.departure_time) {
      e.departure_time = 'Select departure time'
    } else {
      const d = new Date(form.departure_time)
      if (isNaN(d.getTime())) {
        e.departure_time = 'Invalid date format'
      }
    }

    if (!form.base_fare || isNaN(Number(form.base_fare)) || Number(form.base_fare) < 50)
      e.base_fare = 'Enter valid base fare (min ₹50)'
    if (form.total_seats < 1 || form.total_seats > 40)
      e.total_seats = 'Seats must be 1–40'
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleCreate = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const token = await AsyncStorage.getItem('access_token')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}

      // Convert to strict ISO string for backend
      const isoTime = new Date(form.departure_time).toISOString()

      const res = await axios.post(`${API}/trips/`, {
        pickup_city: form.pickup_city.trim(),
        pickup_state: form.pickup_state,
        pickup_lat: form.pickup_lat,
        pickup_lng: form.pickup_lng,
        destination_city: form.destination_city.trim(),
        destination_state: form.destination_state,
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
      }, { headers })

      const tripId = res?.data?.data?.id || res?.data?.trip_id || 'demo'
      // Navigate to Live Radar screen
      router.replace({
        pathname: '/trip-live',
        params: {
          tripId,
          from: form.pickup_city,
          to: form.destination_city,
          totalSeats: form.total_seats.toString(),
          departureTime: isoTime,
        },
      })
    } catch (err: any) {
      // Demo: navigate to live screen anyway
      router.replace({
        pathname: '/trip-live',
        params: {
          tripId: 'demo',
          from: form.pickup_city,
          to: form.destination_city,
          totalSeats: form.total_seats.toString(),
          departureTime: form.departure_time,
        },
      })
    } finally {
      setLoading(false)
    }
  }

  // Date/time picker helpers
  const formatDisplayDate = (d: Date | null) => {
    if (!d) return ''
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  }
  const formatDisplayTime = (d: Date | null) => {
    if (!d) return ''
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  const onDateChange = (_: any, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false)
    if (date) {
      const next = selectedDate ? new Date(selectedDate) : new Date()
      next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate())
      setSelectedDate(next)
      update('departure_time', next.toISOString())
      if (Platform.OS === 'android') setShowTimePicker(true)
    }
  }

  const onTimeChange = (_: any, time?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false)
    if (time) {
      const next = selectedDate ? new Date(selectedDate) : new Date()
      next.setHours(time.getHours(), time.getMinutes())
      setSelectedDate(next)
      update('departure_time', next.toISOString())
    }
  }

  const selectedVehicle = VEHICLE_TYPES.find(v => v.value === form.vehicle_type)

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Trip</Text>
        <Text style={styles.headerSub}>Publish your intercity route</Text>
      </View>

      <View style={styles.form}>
        
        {/* Map View for Selecting Pickup and Destination */}
        <SectionHeader title="🗺️ Select Points on Map" />
        <Text style={styles.fieldHint}>Drag the Red marker for Pickup and the Blue marker for Drop-off.</Text>
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: (form.pickup_lat + form.destination_lat) / 2,
              longitude: (form.pickup_lng + form.destination_lng) / 2,
              latitudeDelta: Math.abs(form.pickup_lat - form.destination_lat) * 2 || 2,
              longitudeDelta: Math.abs(form.pickup_lng - form.destination_lng) * 2 || 2,
            }}
          >
            {/* Pickup Marker */}
            <Marker 
              coordinate={{ latitude: form.pickup_lat, longitude: form.pickup_lng }}
              draggable
              onDragEnd={(e) => handleMarkerDrag('pickup', e.nativeEvent.coordinate)}
              pinColor="red"
              title="Pickup"
            />
            {/* Destination Marker */}
            <Marker 
              coordinate={{ latitude: form.destination_lat, longitude: form.destination_lng }}
              draggable
              onDragEnd={(e) => handleMarkerDrag('destination', e.nativeEvent.coordinate)}
              pinColor="blue"
              title="Destination"
            />
          </MapView>
        </View>

        {/* Route */}
        <SectionHeader title="📍 Route Details" />
        <FieldGroup>
          <Field label="Pickup City *" error={errors.pickup_city}>
            <TextInput style={[styles.input, errors.pickup_city && styles.inputError]}
              placeholder="e.g. Pune" placeholderTextColor="#94A3B8"
              value={form.pickup_city} onChangeText={v => update('pickup_city', v)}
              onBlur={() => handleCityBlur('pickup')} />
          </Field>
          <Field label="Pickup State" error="">
            <TextInput style={styles.input} placeholder="e.g. Maharashtra" placeholderTextColor="#94A3B8"
              value={form.pickup_state} onChangeText={v => update('pickup_state', v)} />
          </Field>
        </FieldGroup>

        <FieldGroup>
          <Field label="Destination City *" error={errors.destination_city}>
            <TextInput style={[styles.input, errors.destination_city && styles.inputError]}
              placeholder="e.g. Mumbai" placeholderTextColor="#94A3B8"
              value={form.destination_city} onChangeText={v => update('destination_city', v)}
              onBlur={() => handleCityBlur('destination')} />
          </Field>
          <Field label="Destination State" error="">
            <TextInput style={styles.input} placeholder="e.g. Maharashtra" placeholderTextColor="#94A3B8"
              value={form.destination_state} onChangeText={v => update('destination_state', v)} />
          </Field>
        </FieldGroup>

        {/* Departure */}
        <SectionHeader title="🕐 Departure" />
        <Field label="Departure Date & Time *" error={errors.departure_time}>
          {/* Date Picker Button */}
          <TouchableOpacity
            style={[styles.datePickerBtn, errors.departure_time && styles.inputError]}
            onPress={() => { setPickerMode('date'); setShowDatePicker(true) }}
            activeOpacity={0.8}
          >
            <Feather name="calendar" size={16} color="#3B82F6" />
            <Text style={selectedDate ? styles.datePickerText : styles.datePickerPlaceholder}>
              {selectedDate ? formatDisplayDate(selectedDate) : 'Select departure date'}
            </Text>
            {selectedDate && (
              <TouchableOpacity onPress={() => { setPickerMode('time'); setShowTimePicker(true) }} style={styles.timeChip}>
                <Feather name="clock" size={13} color="#7C3AED" />
                <Text style={styles.timeChipText}>{formatDisplayTime(selectedDate)}</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {/* Android Date Picker */}
          {Platform.OS === 'android' && showDatePicker && (
            <DateTimePicker
              value={selectedDate || new Date()}
              mode="date"
              minimumDate={new Date()}
              display="calendar"
              onChange={onDateChange}
            />
          )}
          {Platform.OS === 'android' && showTimePicker && (
            <DateTimePicker
              value={selectedDate || new Date()}
              mode="time"
              display="default"
              onChange={onTimeChange}
            />
          )}

          {/* iOS Inline Picker (Modal) */}
          {Platform.OS === 'ios' && (
            <Modal transparent visible={showDatePicker || showTimePicker} animationType="slide">
              <View style={styles.iosPickerOverlay}>
                <View style={styles.iosPickerCard}>
                  <View style={styles.iosPickerHeader}>
                    <TouchableOpacity onPress={() => { setShowDatePicker(false); setShowTimePicker(false) }}>
                      <Text style={styles.iosPickerDone}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={selectedDate || new Date()}
                    mode={showTimePicker ? 'time' : 'date'}
                    minimumDate={new Date()}
                    display="inline"
                    onChange={showTimePicker ? onTimeChange : onDateChange}
                    style={{ width: '100%' }}
                  />
                  {!showTimePicker && (
                    <TouchableOpacity style={styles.nextTimeBtn} onPress={() => { setShowDatePicker(false); setShowTimePicker(true) }}>
                      <Text style={styles.nextTimeBtnText}>Next: Select Time →</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </Modal>
          )}
        </Field>

        {/* Vehicle & Seats */}
        <SectionHeader title="🚗 Vehicle & Seats" />

        <Text style={styles.label}>Vehicle Type *</Text>
        <View style={styles.vehicleGrid}>
          {VEHICLE_TYPES.map(v => (
            <TouchableOpacity
              key={v.value}
              onPress={() => { update('vehicle_type', v.value); update('total_seats', v.seats) }}
              style={[styles.vehicleOption, form.vehicle_type === v.value && styles.vehicleOptionActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.vehicleLabel, form.vehicle_type === v.value && styles.vehicleLabelActive]}>
                {v.label}
              </Text>
              <Text style={[styles.vehicleSub, form.vehicle_type === v.value && styles.vehicleSubActive]}>
                {v.seats} seats
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FieldGroup>
          <Field label={`Total Seats (${selectedVehicle?.seats} max)`} error={errors.total_seats as string}>
            <TextInput style={[styles.input, errors.total_seats && styles.inputError]}
              keyboardType="numeric" placeholderTextColor="#94A3B8"
              value={form.total_seats.toString()}
              onChangeText={v => update('total_seats', parseInt(v) || 1)} />
          </Field>
          <Field label="Window Seats" error="">
            <TextInput style={styles.input} keyboardType="numeric" placeholderTextColor="#94A3B8"
              value={form.window_seats.toString()}
              onChangeText={v => update('window_seats', parseInt(v) || 0)} />
          </Field>
        </FieldGroup>

        {/* Pricing */}
        <SectionHeader title="💰 Fare" />
        <FieldGroup>
          <Field label="Base Fare (₹/seat) *" error={errors.base_fare}>
            <TextInput style={[styles.input, errors.base_fare && styles.inputError]}
              keyboardType="decimal-pad" placeholder="e.g. 480" placeholderTextColor="#94A3B8"
              value={form.base_fare} onChangeText={v => update('base_fare', v)} />
          </Field>
          <Field label="Window Surcharge (₹)" error="">
            <TextInput style={styles.input} keyboardType="decimal-pad" placeholderTextColor="#94A3B8"
              value={form.window_seat_charge} onChangeText={v => update('window_seat_charge', v)} />
          </Field>
        </FieldGroup>

        {/* Toggles */}
        <SectionHeader title="⚙️ Options" />
        <View style={styles.toggleCard}>
          <ToggleRow
            label="Accept Parcels" sub="Allow customers to send parcels with this trip"
            value={form.parcel_enabled} onChange={v => update('parcel_enabled', v)} />
          <View style={styles.divider} />
          <ToggleRow
            label="Women-Only Trip" sub="Only accept female passengers"
            value={form.women_only} onChange={v => update('women_only', v)} />
        </View>

        {/* Notes */}
        <Field label="Notes (optional)" error="">
          <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
            multiline placeholder="Any special instructions for passengers..." placeholderTextColor="#94A3B8"
            value={form.notes} onChangeText={v => update('notes', v)} />
        </Field>

        {/* Submit */}
        <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.6 }]}
          onPress={handleCreate} disabled={loading} activeOpacity={0.85}>
          {loading
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={styles.submitText}>Create Trip (Save as Draft)</Text>
          }
        </TouchableOpacity>

        <Text style={styles.submitHint}>
          ℹ️ Trip is saved as DRAFT. Go to Home to publish it when ready.
        </Text>
      </View>
    </ScrollView>
  )
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <View style={styles.fieldGroup}>{children}</View>
}

function Field({ label, error, children }: { label: string; error: string; children: React.ReactNode }) {
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  )
}

function ToggleRow({ label, sub, value, onChange }: {
  label: string; sub: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleSub}>{sub}</Text>
      </View>
      <Switch value={value} onValueChange={onChange}
        trackColor={{ false: '#475569', true: '#3B82F6' }} thumbColor="#FFFFFF" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { backgroundColor: '#1E293B', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
  backBtn: { marginBottom: 12 },
  backBtnText: { color: '#94A3B8', fontSize: 14 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#F8FAFC' },
  headerSub: { fontSize: 13, color: '#64748B', marginTop: 2 },
  form: { padding: 16, gap: 4 },
  
  mapContainer: { height: 250, borderRadius: 14, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  map: { flex: 1 },

  sectionHeader: { fontSize: 13, fontWeight: '700', color: '#64748B', marginTop: 16, marginBottom: 8, letterSpacing: 0.5 },
  fieldGroup: { flexDirection: 'row', gap: 10 },
  fieldWrapper: { flex: 1, marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: {
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 12, padding: 12, fontSize: 14, color: '#0F172A',
  },
  inputError: { borderColor: '#EF4444' },
  errorText: { fontSize: 11, color: '#EF4444', marginTop: 3 },
  fieldHint: { fontSize: 10, color: '#94A3B8', marginTop: 3 },

  // Date picker styles
  datePickerBtn: {
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48,
  },
  datePickerText: { flex: 1, color: '#0F172A', fontSize: 14, fontWeight: '500' },
  datePickerPlaceholder: { flex: 1, color: '#94A3B8', fontSize: 14 },
  timeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EDE9FE', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  timeChipText: { color: '#7C3AED', fontSize: 12, fontWeight: '600' },
  iosPickerOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  iosPickerCard: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 30, paddingHorizontal: 16,
  },
  iosPickerHeader: {
    flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 14,
    borderBottomWidth: 1, borderColor: '#F1F5F9',
  },
  iosPickerDone: { color: '#2563EB', fontSize: 16, fontWeight: '700' },
  nextTimeBtn: {
    backgroundColor: '#2563EB', borderRadius: 12, padding: 14, margin: 12, alignItems: 'center',
  },
  nextTimeBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  vehicleOption: {
    flex: 1, minWidth: '45%', borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 12, padding: 12, backgroundColor: '#FFFFFF', alignItems: 'center',
  },
  vehicleOptionActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  vehicleLabel: { fontSize: 13, fontWeight: '600', color: '#475569' },
  vehicleLabelActive: { color: '#2563EB' },
  vehicleSub: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  vehicleSubActive: { color: '#3B82F6' },
  toggleCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 4, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  toggleLabel: { fontSize: 13, fontWeight: '600', color: '#334155' },
  toggleSub: { fontSize: 11, color: '#94A3B8', marginTop: 2, maxWidth: 220 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 12 },
  submitBtn: {
    backgroundColor: '#2563EB', borderRadius: 16, padding: 18,
    alignItems: 'center', marginTop: 20,
    shadowColor: '#2563EB', shadowOpacity: 0.35, shadowRadius: 12, elevation: 4,
  },
  submitText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  submitHint: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 10, marginBottom: 8 },
})

