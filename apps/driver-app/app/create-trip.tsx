/**
 * Create Trip Screen — Driver publishes a new intercity route.
 * Accessed from Home tab via "Create New Trip" button.
 */
import { useState } from 'react'
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Switch,
} from 'react-native'
import { router } from 'expo-router'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const API = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:80/api/v1'

const VEHICLE_TYPES = [
  { value: 'sedan', label: 'Sedan 🚗', seats: 4 },
  { value: 'suv', label: 'SUV 🚙', seats: 6 },
  { value: 'mini', label: 'Mini 🚕', seats: 4 },
  { value: 'tempo_traveller', label: 'Tempo Traveller 🚐', seats: 12 },
]

export default function CreateTripScreen() {
  const [form, setForm] = useState({
    pickup_city: '',
    pickup_state: 'Maharashtra',
    pickup_lat: 18.5204,
    pickup_lng: 73.8567,
    destination_city: '',
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

  const update = (key: string, value: any) => {
    setForm(p => ({ ...p, [key]: value }))
    setErrors(p => ({ ...p, [key]: '' }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.pickup_city.trim()) e.pickup_city = 'Enter pickup city'
    if (!form.destination_city.trim()) e.destination_city = 'Enter destination city'
    if (form.pickup_city.toLowerCase() === form.destination_city.toLowerCase())
      e.destination_city = 'From and to cities must be different'
    if (!form.departure_time) e.departure_time = 'Select departure time'
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

      const res = await axios.post(`${API}/trips/`, {
        pickup_city: form.pickup_city.trim(),
        pickup_state: form.pickup_state,
        pickup_lat: form.pickup_lat,
        pickup_lng: form.pickup_lng,
        destination_city: form.destination_city.trim(),
        destination_state: form.destination_state,
        destination_lat: form.destination_lat,
        destination_lng: form.destination_lng,
        departure_time: new Date(form.departure_time).toISOString(),
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

      Alert.alert(
        '✅ Trip Created!',
        `Your trip from ${form.pickup_city} to ${form.destination_city} is saved as DRAFT. Go to Home to publish it.`,
        [{ text: 'Go to Home', onPress: () => router.back() }]
      )
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to create trip')
    } finally {
      setLoading(false)
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
        {/* Route */}
        <SectionHeader title="📍 Route Details" />

        <FieldGroup>
          <Field label="Pickup City *" error={errors.pickup_city}>
            <TextInput style={[styles.input, errors.pickup_city && styles.inputError]}
              placeholder="e.g. Pune" placeholderTextColor="#94A3B8"
              value={form.pickup_city} onChangeText={v => update('pickup_city', v)} />
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
              value={form.destination_city} onChangeText={v => update('destination_city', v)} />
          </Field>
          <Field label="Destination State" error="">
            <TextInput style={styles.input} placeholder="e.g. Maharashtra" placeholderTextColor="#94A3B8"
              value={form.destination_state} onChangeText={v => update('destination_state', v)} />
          </Field>
        </FieldGroup>

        {/* Departure */}
        <SectionHeader title="🕐 Departure" />
        <Field label="Departure Date & Time *" error={errors.departure_time}>
          <TextInput style={[styles.input, errors.departure_time && styles.inputError]}
            placeholder="YYYY-MM-DD HH:MM (e.g. 2025-06-01 07:00)"
            placeholderTextColor="#94A3B8"
            value={form.departure_time}
            onChangeText={v => update('departure_time', v)} />
          <Text style={styles.fieldHint}>Format: 2025-06-01 07:00</Text>
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
