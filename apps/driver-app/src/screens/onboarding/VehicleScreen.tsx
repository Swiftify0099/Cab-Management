/**
 * Driver Onboarding Screen — Step 2: Vehicle Setup
 */
import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, StyleSheet, Switch
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { api } from '../../api/client'

const VEHICLE_TYPES = [
  { value: 'sedan', label: 'Sedan 🚗', seats: 4 },
  { value: 'suv', label: 'SUV 🚙', seats: 6 },
  { value: 'mini', label: 'Mini 🚕', seats: 4 },
  { value: 'tempo_traveller', label: 'Tempo Traveller 🚐', seats: 12 },
]

export default function VehicleScreen() {
  const [form, setForm] = useState({
    make: '',
    model: '',
    year: '',
    registration_number: '',
    vehicle_type: 'sedan',
    seat_capacity: 4,
    color: '',
    has_ac: true,
    parcel_capable: false,
  })
  
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const update = (key: string, value: any) => {
    setForm(p => ({ ...p, [key]: value }))
    setErrors(p => ({ ...p, [key]: '' }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.make.trim()) e.make = 'Make is required'
    if (!form.model.trim()) e.model = 'Model is required'
    if (!form.year.trim() || isNaN(Number(form.year)) || form.year.length !== 4) e.year = 'Valid year is required'
    if (!form.registration_number.trim()) e.registration_number = 'Reg. Number is required'
    if (!form.color.trim()) e.color = 'Color is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleNext = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      await api.post('/driver/me/vehicle', {
        ...form,
        year: Number(form.year),
      })
      router.push('/onboarding/documents')
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Failed to save vehicle details.'
      Alert.alert('Error', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <Text style={styles.logoEmoji}>🚗</Text>
            </View>
            <Text style={styles.headerTitle}>Vehicle Details</Text>
            <Text style={styles.headerSubtitle}>Tell us about the vehicle you'll be driving</Text>
          </View>

          {/* Stepper */}
          <View style={styles.stepperContainer}>
            {[1, 2, 3, 4].map((step, i) => (
              <View key={step} style={styles.stepItem}>
                <View style={[styles.stepCircle, step <= 2 ? styles.stepActive : styles.stepInactive]}>
                  <Text style={[styles.stepNumber, step <= 2 ? styles.stepNumberActive : styles.stepNumberInactive]}>
                    {step < 2 ? '✓' : step === 2 ? '🚗' : step}
                  </Text>
                </View>
                <Text style={[styles.stepLabel, step <= 2 ? styles.stepLabelActive : styles.stepLabelInactive]}>
                  {step === 1 ? 'Profile' : step === 2 ? 'Vehicle' : step === 3 ? 'Docs' : 'Review'}
                </Text>
                {i < 3 && <View style={[styles.stepConnector, step < 2 ? styles.stepConnectorActive : styles.stepConnectorInactive]} />}
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Basic Information</Text>
            
            <View style={styles.fieldGroup}>
              <Field label="Make (Brand) *" error={errors.make}>
                <TextInput style={[styles.input, errors.make && styles.inputError]} placeholder="e.g. Maruti Suzuki" placeholderTextColor="#64748B"
                  value={form.make} onChangeText={t => update('make', t)} />
              </Field>
              <Field label="Model *" error={errors.model}>
                <TextInput style={[styles.input, errors.model && styles.inputError]} placeholder="e.g. Dzire" placeholderTextColor="#64748B"
                  value={form.model} onChangeText={t => update('model', t)} />
              </Field>
            </View>

            <View style={styles.fieldGroup}>
              <Field label="Year *" error={errors.year}>
                <TextInput style={[styles.input, errors.year && styles.inputError]} placeholder="e.g. 2022" placeholderTextColor="#64748B"
                  keyboardType="numeric" maxLength={4} value={form.year} onChangeText={t => update('year', t)} />
              </Field>
              <Field label="Color *" error={errors.color}>
                <TextInput style={[styles.input, errors.color && styles.inputError]} placeholder="e.g. White" placeholderTextColor="#64748B"
                  value={form.color} onChangeText={t => update('color', t)} />
              </Field>
            </View>

            <View style={{ marginBottom: 16 }}>
              <Field label="Registration Number *" error={errors.registration_number}>
                <TextInput style={[styles.input, errors.registration_number && styles.inputError]} placeholder="e.g. MH 12 AB 1234" placeholderTextColor="#64748B"
                  autoCapitalize="characters" value={form.registration_number} onChangeText={t => update('registration_number', t.toUpperCase())} />
              </Field>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Type & Capacity</Text>
            
            <Text style={styles.label}>Vehicle Type *</Text>
            <View style={styles.vehicleGrid}>
              {VEHICLE_TYPES.map(v => (
                <TouchableOpacity key={v.value} onPress={() => { update('vehicle_type', v.value); update('seat_capacity', v.seats) }}
                  style={[styles.vehicleOption, form.vehicle_type === v.value && styles.vehicleOptionActive]} activeOpacity={0.8}>
                  <Text style={[styles.vehicleLabel, form.vehicle_type === v.value && styles.vehicleLabelActive]}>{v.label}</Text>
                  <Text style={[styles.vehicleSub, form.vehicle_type === v.value && styles.vehicleSubActive]}>{v.seats} seats</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ marginTop: 16 }}>
              <ToggleRow label="Air Conditioning (AC)" sub="Vehicle has working AC" value={form.has_ac} onChange={v => update('has_ac', v)} />
              <View style={styles.divider} />
              <ToggleRow label="Parcel Delivery" sub="Willing to carry parcels/packages" value={form.parcel_capable} onChange={v => update('parcel_capable', v)} />
            </View>
          </View>

          <TouchableOpacity onPress={handleNext} disabled={loading} activeOpacity={0.85}
            style={[styles.button, loading ? styles.buttonDisabled : styles.buttonActive]}>
            {loading ? <ActivityIndicator color="#0F172A" /> : <Text style={styles.buttonTextActive}>Continue to Documents →</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>← Back</Text></TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, marginBottom: 16 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {!!error && <Text style={styles.errorText}>⚠ {error}</Text>}
    </View>
  )
}

function ToggleRow({ label, sub, value, onChange }: { label: string; sub: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleSub}>{sub}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: '#475569', true: '#F59E0B' }} thumbColor="#FFFFFF" />
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F172A' },
  flex: { flex: 1 },
  scroll: { flex: 1, paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 48, paddingTop: 8 },
  header: { alignItems: 'center', marginBottom: 28, marginTop: 12 },
  logoBox: { width: 72, height: 72, borderRadius: 20, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 1, borderColor: '#334155' },
  logoEmoji: { fontSize: 36 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  headerSubtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 6 },
  stepperContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 24, paddingHorizontal: 8 },
  stepItem: { alignItems: 'center', flex: 1, position: 'relative' },
  stepCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  stepActive: { backgroundColor: '#F59E0B' },
  stepInactive: { backgroundColor: '#1E293B', borderWidth: 1.5, borderColor: '#334155' },
  stepNumber: { fontSize: 14, fontWeight: '700' },
  stepNumberActive: { color: '#0F172A' },
  stepNumberInactive: { color: '#475569' },
  stepLabel: { fontSize: 10, fontWeight: '600' },
  stepLabelActive: { color: '#F59E0B' },
  stepLabelInactive: { color: '#475569' },
  stepConnector: { position: 'absolute', top: 20, right: 0, width: '50%', height: 1.5 },
  stepConnectorActive: { backgroundColor: '#F59E0B' },
  stepConnectorInactive: { backgroundColor: '#1E293B' },
  card: { backgroundColor: '#1E293B', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 18 },
  fieldGroup: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#CBD5E1', marginBottom: 8 },
  input: { height: 52, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1.5, borderColor: '#334155', backgroundColor: '#0F172A', fontSize: 15, color: '#FFFFFF' },
  inputError: { borderColor: '#EF4444', backgroundColor: 'rgba(127,29,29,0.15)' },
  errorText: { color: '#F87171', fontSize: 12, marginTop: 6 },
  vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vehicleOption: { flex: 1, minWidth: '45%', borderWidth: 1.5, borderColor: '#334155', borderRadius: 12, padding: 12, backgroundColor: '#0F172A', alignItems: 'center' },
  vehicleOptionActive: { borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.1)' },
  vehicleLabel: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  vehicleLabelActive: { color: '#F59E0B' },
  vehicleSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  vehicleSubActive: { color: '#FBBF24' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  toggleSub: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  divider: { height: 1, backgroundColor: '#334155', marginVertical: 4 },
  button: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  buttonActive: { backgroundColor: '#F59E0B', shadowColor: '#F59E0B', shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  buttonDisabled: { backgroundColor: '#334155' },
  buttonTextActive: { color: '#0F172A', fontSize: 15, fontWeight: '700' },
  backBtn: { alignItems: 'center', paddingVertical: 12 },
  backBtnText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
})
