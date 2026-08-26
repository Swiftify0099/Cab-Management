/**
 * Customer App — Edit Profile Screen
 * Route: /profile/edit
 * Feature 1: Customer Core Account.
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import DateTimePicker from '@react-native-community/datetimepicker'
import { router } from 'expo-router'
import { profileApi } from '../../src/api/client'
import { useAuthStore } from '../../src/store/auth.store'
import { useTheme } from '../../src/contexts/ThemeContext'
import { useTranslation } from '../../src/i18n'
import {
  AppText,
  AppAvatar,
  AppButton,
  AppDivider,
  AppBadge,
} from '../../src/components/ui'

type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'

const GENDERS: { value: Gender; label: string; emoji: string }[] = [
  { value: 'male', label: 'Male', emoji: '👨' },
  { value: 'female', label: 'Female', emoji: '👩' },
  { value: 'other', label: 'Other', emoji: '🧑' },
  { value: 'prefer_not_to_say', label: 'Prefer not', emoji: '🔒' },
]

export default function EditProfileScreen() {
  const { theme, isDark } = useTheme()
  const { user } = useAuthStore()
  const { t } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [gender, setGender] = useState<Gender>('male')
  const [dob, setDob] = useState('')
  const [dobDate, setDobDate] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const loadProfile = useCallback(async () => {
    setLoading(true)
    try {
      const res = await profileApi.getMe()
      const p = res.data?.data || res.data
      if (p) {
        setFullName(p.full_name || '')
        setEmail(p.email || '')
        setGender(p.gender || 'male')
        if (p.dob) {
          setDob(p.dob)
          setDobDate(new Date(p.dob))
        }
        setPhotoUri(p.profile_photo_url || p.profile_photo || null)
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const handlePickPhoto = async (fromCamera: boolean) => {
    try {
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (perm.status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera / Gallery access is required.')
        return
      }

      const res = fromCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: true, aspect: [1, 1] })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.85, allowsEditing: true, aspect: [1, 1], mediaTypes: ['images'] })

      if (!res.canceled && res.assets[0]) {
        const asset = res.assets[0]
        setPhotoUri(asset.uri)
        setUploadingPhoto(true)

        const formData = new FormData() as any
        const filename = asset.uri.split('/').pop() || 'avatar.jpg'
        const match = /\.(\w+)$/.exec(filename)
        const type = match ? `image/${match[1]}` : 'image/jpeg'
        formData.append('photo', { uri: asset.uri, name: filename, type })

        const resUpload = await profileApi.uploadPhoto(formData)
        const newUrl = resUpload.data?.data?.photo_url || resUpload.data?.data?.preview_url || resUpload.data?.photo_url
        if (newUrl) {
          setPhotoUri(newUrl)
          if (user) {
            useAuthStore.getState().setUser({
              ...user,
              avatar_url: newUrl,
              profile_photo: newUrl,
            })
          }
        }
        Alert.alert('Photo Updated', 'Your profile photo has been successfully updated on Cloudinary.')
      }
    } catch (e: any) {
      Alert.alert('Upload Error', e?.response?.data?.detail || 'Failed to upload photo')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleRemovePhoto = async () => {
    try {
      setUploadingPhoto(true)
      await profileApi.deletePhoto()
      setPhotoUri(null)
      if (user) {
        useAuthStore.getState().setUser({
          ...user,
          avatar_url: undefined,
          profile_photo: undefined,
        })
      }
      Alert.alert('Photo Removed', 'Your profile photo has been removed.')
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to remove photo')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const showPhotoMenu = () => {
    const options: any[] = []
    if (photoUri) {
      options.push({ text: 'View Fullscreen Photo', onPress: () => setShowPreviewModal(true) })
    }
    options.push({ text: 'Take Photo with Camera', onPress: () => handlePickPhoto(true) })
    options.push({ text: 'Choose from Photo Gallery', onPress: () => handlePickPhoto(false) })
    if (photoUri) {
      options.push({ text: 'Remove Photo', style: 'destructive', onPress: handleRemovePhoto })
    }
    options.push({ text: 'Cancel', style: 'cancel' })
    Alert.alert('Profile Photo', 'Update or preview your profile photo', options)
  }

  const handleDateChange = (_: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false)
    if (selectedDate) {
      const today = new Date()
      const age = today.getFullYear() - selectedDate.getFullYear()
      if (age < 18) {
        Alert.alert('Age Requirement', 'You must be at least 18 years old.')
        return
      }
      setDobDate(selectedDate)
      const y = selectedDate.getFullYear()
      const m = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const d = String(selectedDate.getDate()).padStart(2, '0')
      setDob(`${y}-${m}-${d}`)
      setErrors((e) => ({ ...e, dob: '' }))
    }
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!fullName.trim() || fullName.trim().length < 2) {
      errs.fullName = 'Please enter a valid full name'
    }
    if (email.trim() && !/\S+@\S+\.\S+/.test(email.trim())) {
      errs.email = 'Please enter a valid email address'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      await profileApi.updateMe({
        full_name: fullName.trim(),
        email: email.trim() || undefined,
        gender,
        dob: dob || undefined,
      })
      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (err: any) {
      Alert.alert('Update Failed', err?.response?.data?.detail || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.backgroundAlt }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <AppText variant="h3" bold style={styles.headerTitle}>
          {t('profile.edit_profile', 'Edit Profile')}
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity style={styles.avatarWrapper} onPress={showPhotoMenu} activeOpacity={0.85}>
              <AppAvatar name={fullName || user?.phone || 'User'} imageUri={photoUri || undefined} size={100} />
              <View style={[styles.cameraBadge, { backgroundColor: theme.colors.primary, borderColor: theme.colors.backgroundAlt }]}>
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Feather name="camera" size={16} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={showPhotoMenu}>
              <AppText variant="bodyS" semibold color="brand" style={{ marginTop: 8 }}>
                Change Profile Photo
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            {/* Verified Phone (Read-Only) */}
            <View style={styles.field}>
              <AppText variant="label" color="secondary" style={styles.label}>
                {t('profile.phone', 'Phone Number')} (Verified)
              </AppText>
              <View style={[styles.readOnlyBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Feather name="phone" size={18} color={theme.colors.textMuted} />
                <AppText variant="body" bold style={{ flex: 1, marginLeft: 10 }}>
                  {user?.phone || 'Phone'}
                </AppText>
                <AppBadge label="Verified" variant="success" size="sm" />
              </View>
            </View>

            {/* Full Name */}
            <View style={styles.field}>
              <AppText variant="label" color="secondary" style={styles.label}>
                {t('profile.full_name', 'Full Name')} *
              </AppText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: errors.fullName ? theme.colors.error : theme.colors.border,
                    color: theme.colors.textPrimary,
                  },
                ]}
                placeholder="Enter your full name"
                placeholderTextColor={theme.colors.placeholder}
                value={fullName}
                onChangeText={(t) => {
                  setFullName(t)
                  setErrors((e) => ({ ...e, fullName: '' }))
                }}
              />
              {errors.fullName ? (
                <AppText variant="small" color="error" style={{ marginTop: 4 }}>
                  {errors.fullName}
                </AppText>
              ) : null}
            </View>

            {/* Email Address */}
            <View style={styles.field}>
              <AppText variant="label" color="secondary" style={styles.label}>
                {t('profile.email', 'Email Address')} (Optional)
              </AppText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: errors.email ? theme.colors.error : theme.colors.border,
                    color: theme.colors.textPrimary,
                  },
                ]}
                placeholder="name@example.com"
                placeholderTextColor={theme.colors.placeholder}
                value={email}
                onChangeText={(t) => {
                  setEmail(t)
                  setErrors((e) => ({ ...e, email: '' }))
                }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email ? (
                <AppText variant="small" color="error" style={{ marginTop: 4 }}>
                  {errors.email}
                </AppText>
              ) : null}
            </View>

            {/* Gender Selection */}
            <View style={styles.field}>
              <AppText variant="label" color="secondary" style={styles.label}>
                {t('profile.gender', 'Gender')}
              </AppText>
              <View style={styles.genderRow}>
                {GENDERS.map((g) => (
                  <TouchableOpacity
                    key={g.value}
                    style={[
                      styles.genderChip,
                      {
                        backgroundColor: gender === g.value ? `${theme.colors.primary}20` : theme.colors.surface,
                        borderColor: gender === g.value ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() => setGender(g.value)}
                  >
                    <AppText style={{ fontSize: 16 }}>{g.emoji}</AppText>
                    <AppText
                      variant="small"
                      semibold
                      style={{ color: gender === g.value ? theme.colors.primary : theme.colors.textSecondary }}
                    >
                      {g.label}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Date of Birth */}
            <View style={styles.field}>
              <AppText variant="label" color="secondary" style={styles.label}>
                {t('profile.dob', 'Date of Birth')} (18+)
              </AppText>
              <TouchableOpacity
                style={[
                  styles.dateBtn,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <Feather name="calendar" size={18} color={theme.colors.primary} />
                <AppText variant="body" style={{ marginLeft: 10, color: dob ? theme.colors.textPrimary : theme.colors.textMuted }}>
                  {dobDate ? dobDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Select Date of Birth'}
                </AppText>
              </TouchableOpacity>

              {Platform.OS === 'android' && showDatePicker && (
                <DateTimePicker
                  value={dobDate || new Date(2000, 0, 1)}
                  mode="date"
                  display="calendar"
                  maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 18))}
                  onChange={handleDateChange}
                />
              )}

              {Platform.OS === 'ios' && (
                <Modal transparent visible={showDatePicker} animationType="slide">
                  <View style={styles.iosModalBg}>
                    <View style={[styles.iosPickerBox, { backgroundColor: theme.colors.surface }]}>
                      <View style={styles.iosPickerHeader}>
                        <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                          <AppText variant="body" bold color="brand">Done</AppText>
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
          </View>

          {/* Submit Button */}
          <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
            <AppButton
              onPress={handleSave}
              loading={saving}
              variant="primary"
            >
              {t('common.save', 'Save Changes')}
            </AppButton>
          </View>
        </ScrollView>
      )}

      {/* Fullscreen Avatar Preview Modal */}
      <Modal
        visible={showPreviewModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPreviewModal(false)}
      >
        <View style={styles.previewModalOverlay}>
          <View style={[styles.previewModalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.previewModalHeader}>
              <AppText variant="h3" bold>Profile Photo Preview</AppText>
              <TouchableOpacity
                style={[styles.previewModalClose, { backgroundColor: theme.colors.backgroundAlt }]}
                onPress={() => setShowPreviewModal(false)}
              >
                <Feather name="x" size={20} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.previewImageContainer}>
              {photoUri ? (
                <Image
                  source={{ uri: photoUri }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              ) : null}
            </View>

            <View style={styles.previewFooter}>
              <TouchableOpacity
                style={[styles.previewActionBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  setShowPreviewModal(false)
                  showPhotoMenu()
                }}
              >
                <Feather name="camera" size={16} color="#fff" />
                <AppText variant="bodyS" bold color="white" style={{ marginLeft: 6 }}>
                  Change Photo
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.previewCloseBtn, { backgroundColor: theme.colors.border }]}
                onPress={() => setShowPreviewModal(false)}
              >
                <AppText variant="bodyS" semibold color="secondary">
                  Close
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  previewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  previewModalContent: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
  },
  previewModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  previewModalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImageContainer: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    backgroundColor: '#000',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  previewActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCloseBtn: {
    paddingHorizontal: 20,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  avatarSection: { alignItems: 'center', marginVertical: 20 },
  avatarWrapper: { position: 'relative' },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: { paddingHorizontal: 20 },
  field: { marginBottom: 18 },
  label: { marginBottom: 8, letterSpacing: 0.5 },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  readOnlyBox: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  genderRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  genderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  dateBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iosModalBg: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  iosPickerBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  iosPickerHeader: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 },
})
