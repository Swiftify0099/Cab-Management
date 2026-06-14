/**
 * Profile Setup Screen — Customer App
 * Step 1 of 2: Personal Info
 * Native DateTimePicker for DOB + profile photo upload (camera/gallery)
 */
import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, StyleSheet,
  Image, Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Feather, Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import DateTimePicker from '@react-native-community/datetimepicker'
import { profileApi } from '../../api/client'
import { useAuthStore } from '../../store/auth.store'

type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'

const GENDERS: { value: Gender; label: string; emoji: string }[] = [
  { value: 'male', label: 'Male', emoji: '👨' },
  { value: 'female', label: 'Female', emoji: '👩' },
  { value: 'other', label: 'Other', emoji: '🧑' },
  { value: 'prefer_not_to_say', label: 'Prefer not', emoji: '🔒' },
]

export default function ProfileSetupScreen() {
  const setProfileComplete = useAuthStore((s) => s.setProfileComplete)

  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const [fullName, setFullName] = useState('')
  const [gender, setGender] = useState<Gender | null>(null)
  const [dob, setDob] = useState('')           // ISO yyyy-mm-dd for API
  const [dobDate, setDobDate] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [emergencyContact, setEmergencyContact] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // ── Photo Picker ───────────────────────────────────────────────────────
  const pickPhoto = async (fromCamera: boolean) => {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (permission.status !== 'granted') {
      Alert.alert('Permission Denied', 'Please allow access in Settings.')
      return
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1], mediaTypes: ImagePicker.MediaTypeOptions.Images })

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri
      setPhotoUri(uri)

      // Upload immediately
      setUploadingPhoto(true)
      try {
        const formData = new FormData()
        formData.append('photo', {
          uri,
          name: 'profile_photo.jpg',
          type: 'image/jpeg',
        } as any)
        await profileApi.uploadPhoto(formData)
      } catch {
        // Non-fatal — photo stored locally, can retry
      } finally {
        setUploadingPhoto(false)
      }
    }
  }

  const showPhotoOptions = () => {
    Alert.alert('Profile Photo', 'Choose source', [
      { text: 'Camera', onPress: () => pickPhoto(true) },
      { text: 'Gallery', onPress: () => pickPhoto(false) },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  // ── DOB ────────────────────────────────────────────────────────────────
  const handleDateChange = (_: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false)
    if (selectedDate) {
      // Validate age ≥ 18
      const today = new Date()
      const age = today.getFullYear() - selectedDate.getFullYear()
      const monthDiff = today.getMonth() - selectedDate.getMonth()
      const dayDiff = today.getDate() - selectedDate.getDate()
      const isOldEnough = age > 18 || (age === 18 && (monthDiff > 0 || (monthDiff === 0 && dayDiff >= 0)))

      if (!isOldEnough) {
        Alert.alert('Age Restriction', 'You must be at least 18 years old.')
        return
      }
      setDobDate(selectedDate)
      const y = selectedDate.getFullYear()
      const m = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const d = String(selectedDate.getDate()).padStart(2, '0')
      setDob(`${y}-${m}-${d}`)
      setErrors(e => ({ ...e, dob: '' }))
    }
  }

  const formatDobDisplay = () => {
    if (!dobDate) return 'Select Date of Birth'
    return dobDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  // ── Validation & Submit ────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {}
    if (!fullName.trim() || fullName.trim().length < 2) e.fullName = 'Enter your full name (min 2 chars)'
    if (!gender) e.gender = 'Please select your gender'
    if (!dob) e.dob = 'Please select your date of birth'
    if (!emergencyContact || emergencyContact.replace(/\D/g, '').length < 10)
      e.emergencyContact = 'Enter a valid 10-digit emergency contact'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      await profileApi.setup({
        full_name: fullName.trim(),
        gender: gender!,
        dob,
        emergency_contact: `+91${emergencyContact.replace(/\D/g, '')}`,
      })
      setProfileComplete()
      router.replace('/auth/address-setup' as any)
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to save profile. Please try again.')
    } finally {
      setLoading(false) }
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

          {/* Profile Photo */}
          <View style={styles.photoSection}>
            <TouchableOpacity style={styles.photoCircle} onPress={showPhotoOptions} activeOpacity={0.8}>
              {photoUri
                ? <Image source={{ uri: photoUri }} style={styles.photoImg} />
                : <View style={styles.photoPlaceholder}>
                    <Ionicons name="person" size={44} color="#94A3B8" />
                  </View>
              }
              <View style={styles.photoBadge}>
                {uploadingPhoto
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Feather name="camera" size={14} color="#fff" />
                }
              </View>
            </TouchableOpacity>
            <Text style={styles.photoHint}>Tap to add photo</Text>
          </View>

          {/* Full Name */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Full Name *</Text>
            <TextInput
              style={[styles.input, errors.fullName ? styles.inputError : styles.inputNormal]}
              placeholder="Enter your full name"
              placeholderTextColor="#94A3B8"
              value={fullName}
              onChangeText={(t) => { setFullName(t); setErrors(e => ({ ...e, fullName: '' })) }}
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
                  onPress={() => { setGender(g.value); setErrors(e => ({ ...e, gender: '' })) }}
                  style={[styles.genderBtn, gender === g.value ? styles.genderBtnActive : styles.genderBtnInactive]}
                >
                  <Text style={{ fontSize: 18 }}>{g.emoji}</Text>
                  <Text style={[styles.genderLabel, { color: gender === g.value ? '#1D4ED8' : '#475569' }]}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.gender ? <Text style={styles.errorText}>{errors.gender}</Text> : null}
          </View>

          {/* Date of Birth — Native Picker */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Date of Birth * (18+)</Text>
            <TouchableOpacity
              style={[styles.dateBtn, errors.dob ? styles.inputError : styles.inputNormal]}
              onPress={() => setShowDatePicker(true)}
            >
              <Feather name="calendar" size={18} color={dob ? '#0F172A' : '#94A3B8'} />
              <Text style={[styles.dateBtnText, !dob && { color: '#94A3B8' }]}>
                {formatDobDisplay()}
              </Text>
            </TouchableOpacity>
            {errors.dob ? <Text style={styles.errorText}>{errors.dob}</Text> : null}

            {/* Android inline picker */}
            {Platform.OS === 'android' && showDatePicker && (
              <DateTimePicker
                value={dobDate || new Date(2000, 0, 1)}
                mode="date"
                display="calendar"
                maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 18))}
                onChange={handleDateChange}
              />
            )}

            {/* iOS Modal picker */}
            {Platform.OS === 'ios' && (
              <Modal transparent visible={showDatePicker} animationType="slide">
                <View style={styles.iosPickerBg}>
                  <View style={styles.iosPicker}>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={{ color: '#2563EB', fontWeight: '700', fontSize: 16 }}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={dobDate || new Date(2000, 0, 1)}
                      mode="date"
                      display="spinner"
                      maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 18))}
                      onChange={handleDateChange}
                    />
                  </View>
                </View>
              </Modal>
            )}
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
                  setErrors(e => ({ ...e, emergencyContact: '' }))
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
            {loading
              ? <ActivityIndicator color="white" />
              : <Text style={styles.submitBtnText}>Save Profile & Continue →</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1, paddingHorizontal: 24 },
  header: { marginTop: 32, marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 6, lineHeight: 20 },
  progressTrack: { marginTop: 16, height: 6, backgroundColor: '#F1F5F9', borderRadius: 3 },
  progressFill: { height: '100%' as any, width: '50%' as any, backgroundColor: '#2563EB', borderRadius: 3 },
  stepText: { fontSize: 12, color: '#94A3B8', marginTop: 4 },

  // Photo
  photoSection: { alignItems: 'center', marginBottom: 28 },
  photoCircle: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 3, borderColor: '#2563EB', position: 'relative', overflow: 'visible',
  },
  photoImg: { width: 100, height: 100, borderRadius: 50 },
  photoPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  photoBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  photoHint: { color: '#94A3B8', fontSize: 12, marginTop: 8 },

  field: { marginBottom: 20 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8 },
  fieldHint: { fontSize: 12, color: '#94A3B8', marginBottom: 8 },
  input: { height: 52, paddingHorizontal: 16, borderRadius: 12, borderWidth: 2, fontSize: 16, color: '#0F172A' },
  inputNormal: { borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  inputError: { borderColor: '#F87171', backgroundColor: '#FEF2F2' },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 4 },

  genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genderBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 2 },
  genderBtnActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  genderBtnInactive: { borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  genderLabel: { fontSize: 13, fontWeight: '500' },

  // Date picker button
  dateBtn: {
    height: 52, paddingHorizontal: 16, borderRadius: 12, borderWidth: 2,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  dateBtnText: { fontSize: 16, color: '#0F172A', fontWeight: '500' },

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

  // iOS modal picker
  iosPickerBg: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  iosPicker: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40,
  },
})
