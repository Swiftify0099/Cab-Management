/**
 * Profile Setup Screen — Customer App
 * StyleSheet version (NativeWind removed — caused Metro 97% hang on dynamic classNames)
 */
import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { profileApi } from '../../api/client'
import { useAuthStore } from '../../store/auth.store'

type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'

const GENDERS: { value: Gender; label: string; emoji: string }[] = [
  { value: 'male', label: 'Male', emoji: '👨' },
  { value: 'female', label: 'Female', emoji: '👩' },
  { value: 'other', label: 'Other', emoji: '🧑' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say', emoji: '🔒' },
]

export default function ProfileSetupScreen() {
  const setProfileComplete = useAuthStore((s) => s.setProfileComplete)
  const [fullName, setFullName] = useState('')
  const [gender, setGender] = useState<Gender | null>(null)
  const [dob, setDob] = useState('')
  const [dobDisplay, setDobDisplay] = useState('')
  const [emergencyContact, setEmergencyContact] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const formatDob = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 8)
    let formatted = digits
    if (digits.length > 2) formatted = digits.slice(0, 2) + '/' + digits.slice(2)
    if (digits.length > 4) formatted = formatted.slice(0, 5) + '/' + formatted.slice(5)
    setDobDisplay(formatted)
    if (digits.length === 8) {
      const d = digits.slice(0, 2), m = digits.slice(2, 4), y = digits.slice(4, 8)
      setDob(`${y}-${m}-${d}`)
    } else { setDob('') }
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!fullName.trim() || fullName.trim().length < 2) e.fullName = 'Please enter your full name (min 2 characters)'
    if (!gender) e.gender = 'Please select your gender'
    if (!dob) e.dob = 'Please enter a valid date of birth (DD/MM/YYYY)'
    if (!emergencyContact || emergencyContact.replace(/\D/g, '').length < 10) e.emergencyContact = 'Please enter a valid emergency contact number'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      await profileApi.setup({
        full_name: fullName.trim(), gender: gender!,
        dob, emergency_contact: `+91${emergencyContact.replace(/\D/g, '')}`,
      })
      setProfileComplete()
      router.replace('/(tabs)')
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to save profile. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>This information helps us provide a safer travel experience.</Text>
            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>
            <Text style={styles.stepText}>Step 1 of 2</Text>
          </View>

          {/* Full Name */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Full Name *</Text>
            <TextInput
              style={[styles.input, errors.fullName ? styles.inputError : styles.inputNormal]}
              placeholder="Enter your full name"
              placeholderTextColor="#94A3B8"
              value={fullName}
              onChangeText={(t) => { setFullName(t); setErrors((e) => ({ ...e, fullName: '' })) }}
              autoCapitalize="words"
            />
            {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
          </View>

          {/* Gender */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Gender *</Text>
            <View style={styles.genderRow}>
              {GENDERS.map((g) => (
                <TouchableOpacity
                  key={g.value}
                  onPress={() => { setGender(g.value); setErrors((e) => ({ ...e, gender: '' })) }}
                  style={[styles.genderBtn, gender === g.value ? styles.genderBtnActive : styles.genderBtnInactive]}
                >
                  <Text style={{ fontSize: 16 }}>{g.emoji}</Text>
                  <Text style={[styles.genderLabel, { color: gender === g.value ? '#1D4ED8' : '#475569' }]}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.gender ? <Text style={styles.errorText}>{errors.gender}</Text> : null}
          </View>

          {/* Date of Birth */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Date of Birth * (must be 18+)</Text>
            <TextInput
              style={[styles.input, errors.dob ? styles.inputError : styles.inputNormal]}
              placeholder="DD / MM / YYYY"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              value={dobDisplay}
              onChangeText={(t) => { formatDob(t); setErrors((e) => ({ ...e, dob: '' })) }}
              maxLength={10}
            />
            {errors.dob ? <Text style={styles.errorText}>{errors.dob}</Text> : null}
          </View>

          {/* Emergency Contact */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Emergency Contact *</Text>
            <Text style={styles.fieldHint}>A family member or trusted person we can reach in emergencies</Text>
            <View style={[styles.phoneRow, errors.emergencyContact ? styles.inputError : styles.inputNormal]}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="Emergency contact number"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={emergencyContact}
                onChangeText={(t) => {
                  setEmergencyContact(t.replace(/\D/g, '').slice(0, 10))
                  setErrors((e) => ({ ...e, emergencyContact: '' }))
                }}
                maxLength={10}
              />
            </View>
            {errors.emergencyContact ? <Text style={styles.errorText}>{errors.emergencyContact}</Text> : null}
          </View>

          {/* Safety Badge */}
          <View style={styles.safetyBadge}>
            <Text style={{ fontSize: 20 }}>🔒</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.safetyTitle}>Your data is secure</Text>
              <Text style={styles.safetyText}>
                Personal information is encrypted and only shared with verified drivers when required for safety.
              </Text>
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
            style={[styles.submitBtn, loading ? styles.submitBtnDisabled : styles.submitBtnActive]}
          >
            {loading ? <ActivityIndicator color="white" /> : (
              <Text style={styles.submitBtnText}>Save Profile & Continue →</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1, paddingHorizontal: 24 },
  header: { marginTop: 32, marginBottom: 32 },
  title: { fontSize: 24, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 6, lineHeight: 20 },
  progressTrack: { marginTop: 16, height: 6, backgroundColor: '#F1F5F9', borderRadius: 3 },
  progressFill: { height: '100%' as any, width: '50%' as any, backgroundColor: '#2563EB', borderRadius: 3 },
  stepText: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  field: { marginBottom: 20 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8 },
  fieldHint: { fontSize: 12, color: '#94A3B8', marginBottom: 8 },
  input: { height: 52, paddingHorizontal: 16, borderRadius: 12, borderWidth: 2, fontSize: 16, color: '#0F172A' },
  inputNormal: { borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  inputError: { borderColor: '#F87171', backgroundColor: '#FEF2F2' },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 4 },
  genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genderBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 2 },
  genderBtnActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  genderBtnInactive: { borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  genderLabel: { fontSize: 14, fontWeight: '500' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 2, paddingHorizontal: 16, height: 52 },
  countryCode: { fontSize: 14, fontWeight: '600', color: '#64748B', marginRight: 8 },
  phoneInput: { flex: 1, fontSize: 16, color: '#0F172A' },
  safetyBadge: {
    backgroundColor: '#EFF6FF', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 32,
  },
  safetyTitle: { fontSize: 14, fontWeight: '600', color: '#1E40AF' },
  safetyText: { fontSize: 12, color: '#3B82F6', marginTop: 2, lineHeight: 16 },
  submitBtn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  submitBtnActive: { backgroundColor: '#2563EB', shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  submitBtnDisabled: { backgroundColor: '#93C5FD' },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
})
