/**
 * Driver App — Edit Profile Screen
 * Pixel-perfect implementation matching approved UI mockup.
 */
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StyleSheet,
  StatusBar,
  Image,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { driverApi } from '../../src/api/client'
import { useTheme } from '../../src/theme'
import * as SecureStore from 'expo-secure-store'

interface DriverData {
  id?: string
  full_name?: string
  phone?: string
  email?: string
  experience_years?: number
  gender?: 'male' | 'female' | 'other'
  home_city?: string
  profile_photo?: string
  rating?: number
  total_trips?: number
  status?: string
  kyc_status?: string
  referral_code?: string
}

export default function EditProfileScreen() {
  const { theme, isDark } = useTheme()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [showPhotoModal, setShowPhotoModal] = useState(false)

  // Form fields
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [experienceYears, setExperienceYears] = useState('0')
  const [homeCity, setHomeCity] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male')
  const [photoUri, setPhotoUri] = useState<string | null>(null)

  // Read-only server fields
  const [driverId, setDriverId] = useState('DRV-PARTNER')
  const [phone, setPhone] = useState('')
  const [rating, setRating] = useState(5.0)
  const [totalTrips, setTotalTrips] = useState(0)
  const [accountStatus, setAccountStatus] = useState('Active')

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadDriverData()
  }, [])

  const loadDriverData = async () => {
    try {
      setLoading(true)
      const res = await driverApi.getProfile()
      const data: DriverData = res.data?.data || res.data || {}

      if (data.full_name) setFullName(data.full_name)
      if (data.email) setEmail(data.email)
      if (data.experience_years !== undefined) setExperienceYears(String(data.experience_years))
      if (data.home_city) setHomeCity(data.home_city)
      if (data.gender) setGender((data.gender as any) || 'male')
      if (data.profile_photo) setPhotoUri(data.profile_photo)

      // Format Driver ID
      if (data.id) {
        const shortId = data.id.replace(/-/g, '').slice(0, 4).toUpperCase()
        setDriverId(`DRV-${shortId}`)
      } else if (data.referral_code) {
        setDriverId(data.referral_code)
      }

      setRating(data.rating ?? 5.0)
      setTotalTrips(data.total_trips ?? 0)
      setAccountStatus(data.status ? data.status.charAt(0).toUpperCase() + data.status.slice(1).toLowerCase() : 'Active')

      // Get phone from SecureStore user_data if not in profile
      if (data.phone) {
        setPhone(data.phone)
      } else {
        const rawUser = await SecureStore.getItemAsync('user_data')
        if (rawUser) {
          try {
            const parsed = JSON.parse(rawUser)
            if (parsed.phone) setPhone(parsed.phone)
          } catch {}
        }
      }
    } catch (e) {
      console.warn('[EditProfile] Load error:', e)
    } finally {
      setLoading(false)
    }
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!fullName.trim() || fullName.trim().length < 2) {
      e.fullName = 'Please enter a valid name (min 2 characters)'
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      e.email = 'Please enter a valid email address'
    }
    const exp = parseInt(experienceYears, 10)
    if (isNaN(exp) || exp < 0 || exp > 50) {
      e.experienceYears = 'Experience must be between 0 and 50 years'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      await driverApi.updateProfile({
        full_name: fullName.trim(),
        email: email.trim() || undefined,
        experience_years: parseInt(experienceYears, 10) || 0,
        gender,
        home_city: homeCity.trim() || undefined,
      })

      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Failed to update profile. Please try again.'
      Alert.alert('Update Failed', msg)
    } finally {
      setSaving(false)
    }
  }

  const handlePickImage = async (useCamera: boolean) => {
    setShowPhotoModal(false)
    try {
      const permission = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Camera / Gallery permission is required.')
        return
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0]
        setPhotoUri(asset.uri)
        setUploadingPhoto(true)
        try {
          const formData = new FormData()
          const filename = asset.uri.split('/').pop() || 'photo.jpg'
          const match = /\.(\w+)$/.exec(filename)
          const type = match ? `image/${match[1]}` : 'image/jpeg'

          formData.append('photo', {
            uri: asset.uri,
            name: filename,
            type,
          } as any)

          const res = await driverApi.uploadPhoto(formData)
          const photoUrl = res.data?.data?.photo_url
          if (photoUrl) setPhotoUri(photoUrl)
          Alert.alert('Photo Updated', 'Profile photo updated successfully.')
        } catch {
          Alert.alert('Photo Saved', 'Photo updated locally.')
        } finally {
          setUploadingPhoto(false)
        }
      }
    } catch (err) {
      console.warn('[EditProfile] Photo pick error:', err)
      Alert.alert('Error', 'Could not access photo.')
    }
  }

  const initials = fullName
    ? fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'RS'

  const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 16,
    },
    headerTitle: { fontSize: 20, fontWeight: '800', color: isDark ? '#FFFFFF' : '#0F172A' },
    backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    savePillBtn: {
      backgroundColor: '#22C55E',
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderRadius: 14,
      shadowColor: '#22C55E',
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 3,
    },
    savePillText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },

    scroll: { flex: 1, paddingHorizontal: 18 },
    scrollContent: { paddingBottom: 40, paddingTop: 4 },

    // Avatar
    avatarSection: { alignItems: 'center', marginBottom: 20, marginTop: 4 },
    avatarWrapper: { position: 'relative' },
    avatarImage: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: '#1E293B',
      borderWidth: 3,
      borderColor: '#3B82F6',
    },
    avatarPlaceholder: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: '#1E3A8A',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: '#3B82F6',
    },
    avatarInitials: { fontSize: 32, fontWeight: '900', color: '#FFFFFF' },
    cameraBadge: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#3B82F6',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#0F172A',
    },

    // Cards
    card: {
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderRadius: 20,
      padding: 18,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
      shadowColor: '#000',
      shadowOpacity: isDark ? 0.2 : 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    cardTitle: { fontSize: 16, fontWeight: '800', color: isDark ? '#FFFFFF' : '#0F172A', marginBottom: 14 },

    // Form fields
    fieldGroup: { marginBottom: 14 },
    label: { fontSize: 13, fontWeight: '600', color: '#94A3B8', marginBottom: 6 },
    input: {
      height: 48,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
      backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#F8FAFC',
      fontSize: 15,
      fontWeight: '600',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    inputError: { borderColor: '#EF4444' },
    errorText: { color: '#EF4444', fontSize: 12, marginTop: 4 },

    // Experience Picker Box
    expBox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 48,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
      backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#F8FAFC',
    },
    expInput: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },

    // Gender row
    genderRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
    genderBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
      backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#F8FAFC',
      alignItems: 'center',
      justifyContent: 'center',
    },
    genderBtnActive: {
      borderColor: '#3B82F6',
      backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : '#EFF6FF',
    },
    genderText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
    genderTextActive: { color: '#3B82F6', fontWeight: '800' },

    // Restricted Identity Card 2-column Grid
    restrictedGrid: { gap: 14 },
    restrictedRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    restrictedItem: { flex: 1 },
    restrictedLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
    restrictedLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
    restrictedValue: { fontSize: 15, fontWeight: '800', color: isDark ? '#FFFFFF' : '#0F172A' },
    statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },

    // Bottom Sheet Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      padding: 24,
      paddingBottom: 40,
    },
    modalTitle: { fontSize: 18, fontWeight: '800', color: isDark ? '#FFFFFF' : '#0F172A', marginBottom: 20 },
    modalOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
    },
    modalOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    modalOptionText: { fontSize: 16, fontWeight: '600', color: isDark ? '#FFFFFF' : '#0F172A' },
    modalCancelBtn: {
      marginTop: 20,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
      alignItems: 'center',
    },
    modalCancelText: { fontSize: 16, fontWeight: '700', color: '#94A3B8' },
  })

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#0F172A' : '#F8FAFC'} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={{ marginTop: 12, color: '#94A3B8', fontSize: 14 }}>Loading Profile...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#0F172A' : '#F8FAFC'} />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={isDark ? '#FFFFFF' : '#0F172A'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity style={styles.savePillBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.savePillText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarWrapper}
              onPress={() => setShowPhotoModal(true)}
              activeOpacity={0.85}
            >
              {uploadingPhoto ? (
                <View style={styles.avatarPlaceholder}>
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              ) : photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}
              <View style={styles.cameraBadge}>
                <Feather name="camera" size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Editable Details Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Editable Details</Text>

            {/* Full Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={[styles.input, errors.fullName ? styles.inputError : null]}
                placeholder="Full Legal Name"
                placeholderTextColor="#64748B"
                value={fullName}
                onChangeText={(t) => { setFullName(t); setErrors((e) => ({ ...e, fullName: '' })) }}
                autoCapitalize="words"
              />
              {errors.fullName ? <Text style={styles.errorText}>⚠ {errors.fullName}</Text> : null}
            </View>

            {/* Email Address */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={[styles.input, errors.email ? styles.inputError : null]}
                placeholder="driver@email.com"
                placeholderTextColor="#64748B"
                value={email}
                onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: '' })) }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email ? <Text style={styles.errorText}>⚠ {errors.email}</Text> : null}
            </View>

            {/* Driving Experience */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Driving Experience</Text>
              <View style={styles.expBox}>
                <TextInput
                  style={styles.expInput}
                  value={`${experienceYears} Years`}
                  onChangeText={(t) => {
                    const num = t.replace(/\D/g, '')
                    setExperienceYears(num)
                  }}
                  keyboardType="numeric"
                  maxLength={2}
                />
                <Feather name="chevron-down" size={18} color="#94A3B8" />
              </View>
            </View>

            {/* Gender */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderRow}>
                {(['male', 'female', 'other'] as const).map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                    onPress={() => setGender(g)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Identity & Restricted Details Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Identity & Restricted 🔒 Details</Text>

            <View style={styles.restrictedGrid}>
              {/* Row 1: Driver ID & Verified Mobile */}
              <View style={styles.restrictedRow}>
                <View style={styles.restrictedItem}>
                  <View style={styles.restrictedLabelRow}>
                    <Text style={styles.restrictedLabel}>Driver ID</Text>
                    <Feather name="lock" size={11} color="#94A3B8" />
                  </View>
                  <Text style={[styles.restrictedValue, { color: '#3B82F6' }]}>{driverId}</Text>
                </View>

                <View style={styles.restrictedItem}>
                  <View style={styles.restrictedLabelRow}>
                    <Text style={styles.restrictedLabel}>Verified Mobile</Text>
                    <Feather name="check-circle" size={11} color="#10B981" />
                  </View>
                  <Text style={styles.restrictedValue}>{phone}</Text>
                </View>
              </View>

              {/* Row 2: Rating & Status */}
              <View style={styles.restrictedRow}>
                <View style={styles.restrictedItem}>
                  <View style={styles.restrictedLabelRow}>
                    <Text style={styles.restrictedLabel}>Rating</Text>
                    <Feather name="lock" size={11} color="#94A3B8" />
                  </View>
                  <Text style={styles.restrictedValue}>{rating.toFixed(1)} ★</Text>
                </View>

                <View style={styles.restrictedItem}>
                  <View style={styles.restrictedLabelRow}>
                    <Text style={styles.restrictedLabel}>Status</Text>
                    <Feather name="lock" size={11} color="#94A3B8" />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.restrictedValue}>{accountStatus}</Text>
                    <View style={styles.statusDot} />
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Photo Picker Modal Bottom Sheet */}
      <Modal
        visible={showPhotoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPhotoModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Profile Photo</Text>

            <TouchableOpacity style={styles.modalOption} onPress={() => handlePickImage(true)} activeOpacity={0.7}>
              <View style={styles.modalOptionLeft}>
                <Feather name="camera" size={20} color="#3B82F6" />
                <Text style={styles.modalOptionText}>Take Photo with Camera</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOption} onPress={() => handlePickImage(false)} activeOpacity={0.7}>
              <View style={styles.modalOptionLeft}>
                <Feather name="image" size={20} color="#10B981" />
                <Text style={styles.modalOptionText}>Choose from Gallery</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowPhotoModal(false)} activeOpacity={0.7}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  )
}
