/**
 * Customer App — Master Profile & Account Hub
 * Feature 1: Customer Core Account.
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import * as ImagePicker from 'expo-image-picker'
import { router, useFocusEffect } from 'expo-router'
import { useAuthStore } from '../../src/store/auth.store'
import { profileApi } from '../../src/api/client'
import { useTheme } from '../../src/contexts/ThemeContext'
import { useTranslation, SUPPORTED_LANGUAGES, LanguageCode } from '../../src/i18n'
import DevModeModal from '../../src/components/dev/DevModeModal'
import {
  AppText,
  AppAvatar,
  AppDivider,
  AppBadge,
  AppSwitch,
} from '../../src/components/ui'

interface UserProfile {
  full_name?: string
  phone?: string
  email?: string
  gender?: string
  dob?: string
  profile_photo_url?: string
  is_verified?: boolean
  reward_points?: number
}

export default function ProfileTab() {
  const { theme, isDark, toggleTheme } = useTheme()
  const { user, logout } = useAuthStore()
  const { t, language, setLanguage } = useTranslation()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [langModalVisible, setLangModalVisible] = useState(false)
  const [devModalVisible, setDevModalVisible] = useState(false)

  const loadProfile = useCallback(async () => {
    try {
      const res = await profileApi.getMe()
      setProfile(res.data?.data || res.data)
    } catch {
      setProfile({ phone: user?.phone })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user])

  useFocusEffect(
    useCallback(() => {
      loadProfile()
    }, [loadProfile])
  )

  const handleLogout = async () => {
    Alert.alert(
      t('danger.logout', 'Log Out'),
      t('danger.logout_confirm', 'Are you sure you want to log out?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('danger.logout', 'Log Out'),
          style: 'destructive',
          onPress: async () => {
            await logout()
            router.replace('/auth/phone')
          },
        },
      ]
    )
  }

  const [showPreviewModal, setShowPreviewModal] = useState(false)

  const handlePickPhoto = async (fromCamera: boolean) => {
    try {
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (perm.status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera / Gallery access is required.')
        return
      }

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.85,
        })
        : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.85,
        })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploading(true)
        const asset = result.assets[0]
        const formData = new FormData() as any
        const filename = asset.uri.split('/').pop() || 'avatar.jpg'
        const match = /\.(\w+)$/.exec(filename)
        const type = match ? `image/${match[1]}` : 'image/jpeg'
        formData.append('photo', { uri: asset.uri, name: filename, type })
        await profileApi.uploadPhoto(formData)
        await loadProfile()
        Alert.alert('Photo Updated', 'Your profile photo has been updated on Cloudinary.')
      }
    } catch (e: any) {
      Alert.alert('Upload Failed', e?.response?.data?.detail || 'Could not upload photo')
    } finally {
      setUploading(false)
    }
  }

  const handleAvatarPress = () => {
    const options: any[] = []
    if (profile?.profile_photo_url) {
      options.push({ text: 'View Fullscreen Photo', onPress: () => setShowPreviewModal(true) })
    }
    options.push({ text: 'Take Photo with Camera', onPress: () => handlePickPhoto(true) })
    options.push({ text: 'Choose from Photo Gallery', onPress: () => handlePickPhoto(false) })
    options.push({ text: 'Edit Profile Details', onPress: () => router.push('/profile/edit' as any) })
    options.push({ text: 'Cancel', style: 'cancel' })
    Alert.alert('Profile Photo', 'Choose an action', options)
  }

  const displayName = profile?.full_name || user?.phone || 'Customer'
  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0]

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.backgroundAlt }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={theme.gradient.heroBg} style={styles.headerBg} />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                loadProfile()
              }}
              tintColor={theme.colors.primary}
            />
          }
        >
          {/* Top Profile Card */}
          <View style={styles.profileHeader}>
            <TouchableOpacity style={styles.avatarWrapper} onPress={handleAvatarPress} activeOpacity={0.85}>
              <AppAvatar name={displayName} imageUri={profile?.profile_photo_url} size={92} />
              <View style={[styles.verifiedBadge, { backgroundColor: theme.colors.success }]}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
              <View style={[styles.avatarEditIcon, { backgroundColor: theme.colors.primary, borderColor: theme.colors.background }]}>
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Feather name="camera" size={14} color="#fff" />
                )}
              </View>
            </TouchableOpacity>

            {loading ? (
              <ActivityIndicator color={theme.colors.white} style={{ marginTop: 14 }} />
            ) : (
              <>
                <AppText variant="h2" bold color="white" center style={{ marginBottom: 4 }}>
                  {displayName}
                </AppText>
                <AppText variant="bodyS" color="white" center style={{ opacity: 0.75, marginBottom: 12 }}>
                  {profile?.phone || user?.phone}
                </AppText>
              </>
            )}

            <TouchableOpacity
              style={[
                styles.editBtn,
                {
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  borderColor: 'rgba(255,255,255,0.2)',
                },
              ]}
              onPress={() => router.push('/profile/edit' as any)}
            >
              <Feather name="edit-2" size={14} color="#fff" />
              <AppText variant="small" semibold color="white" style={{ marginLeft: 6 }}>
                {t('profile.edit_profile', 'Edit Profile')}
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Quick Action Grid */}
          <View style={styles.quickGrid}>
            <TouchableOpacity
              style={[styles.quickCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => router.push('/profile/addresses' as any)}
              activeOpacity={0.75}
            >
              <View style={[styles.quickIcon, { backgroundColor: `${theme.colors.success}20` }]}>
                <Feather name="map-pin" size={20} color={theme.colors.success} />
              </View>
              <AppText variant="bodyS" bold style={{ marginTop: 8 }}>
                {t('quick.saved_places', 'Saved Places')}
              </AppText>
              <AppText variant="small" color="muted">Home, Work, Custom</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => router.push('/profile/family' as any)}
              activeOpacity={0.75}
            >
              <View style={[styles.quickIcon, { backgroundColor: `${theme.colors.accent}20` }]}>
                <Ionicons name="people" size={22} color={theme.colors.accent} />
              </View>
              <AppText variant="bodyS" bold style={{ marginTop: 8 }}>
                {t('quick.family', 'Family & Shared')}
              </AppText>
              <AppText variant="small" color="muted">Manage & Book for Others</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => router.push('/profile/emergency' as any)}
              activeOpacity={0.75}
            >
              <View style={[styles.quickIcon, { backgroundColor: `${theme.colors.primary}20` }]}>
                <Ionicons name="shield-checkmark" size={22} color={theme.colors.primary} />
              </View>
              <AppText variant="bodyS" bold style={{ marginTop: 8 }}>
                {t('quick.safety', 'Safety & Emergency')}
              </AppText>
              <AppText variant="small" color="muted">Trusted Contacts & SOS</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => router.push('/(tabs)/wallet' as any)}
              activeOpacity={0.75}
            >
              <View style={[styles.quickIcon, { backgroundColor: `${theme.colors.warning}20` }]}>
                <Ionicons name="wallet" size={22} color={theme.colors.warning} />
              </View>
              <AppText variant="bodyS" bold style={{ marginTop: 8 }}>
                {t('quick.wallet', 'Wallet & Pay')}
              </AppText>
              <AppText variant="small" color="muted">Balances & Methods</AppText>
            </TouchableOpacity>
          </View>

          {/* Account Settings Menu */}
          <View style={styles.menuSection}>
            <AppText variant="label" color="muted" style={styles.sectionHeader}>
              ACCOUNT & PREFERENCES
            </AppText>

            <View style={[styles.menuCard, { backgroundColor: theme.colors.surface }]}>
              {/* Personal Information */}
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => router.push('/profile/edit' as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconCircle, { backgroundColor: `${theme.colors.primary}18` }]}>
                  <Feather name="user" size={18} color={theme.colors.primary} />
                </View>
                <AppText variant="body" semibold style={{ flex: 1 }}>
                  {t('profile.personal_info', 'Personal Information')}
                </AppText>
                <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
              <AppDivider marginLeft={64} />

              {/* Security Center & Trust Hub */}
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => router.push('/security' as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconCircle, { backgroundColor: `${theme.colors.success}18` }]}>
                  <Ionicons name="shield-checkmark" size={18} color={theme.colors.success} />
                </View>
                <AppText variant="body" bold style={{ flex: 1 }}>
                  Security Center
                </AppText>
                <AppBadge label="Protected" variant="success" size="sm" style={{ marginRight: 8 }} />
                <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
              <AppDivider marginLeft={64} />

              {/* Privacy & Driver Firewall */}
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => router.push('/profile/privacy' as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconCircle, { backgroundColor: `${theme.colors.accent}18` }]}>
                  <Feather name="lock" size={18} color={theme.colors.accent} />
                </View>
                <AppText variant="body" semibold style={{ flex: 1 }}>
                  {t('settings.privacy', 'Privacy & Data Protection')}
                </AppText>
                <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
              <AppDivider marginLeft={64} />

              {/* Notification Preferences */}
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => router.push('/profile/notifications' as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconCircle, { backgroundColor: `${theme.colors.warning}18` }]}>
                  <Feather name="bell" size={18} color={theme.colors.warning} />
                </View>
                <AppText variant="body" semibold style={{ flex: 1 }}>
                  {t('settings.notifications', 'Notification Preferences')}
                </AppText>
                <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
              <AppDivider marginLeft={64} />

              {/* Active Sessions & Devices */}
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => router.push('/security/devices' as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconCircle, { backgroundColor: `${theme.colors.primary}18` }]}>
                  <Feather name="smartphone" size={18} color={theme.colors.primary} />
                </View>
                <AppText variant="body" semibold style={{ flex: 1 }}>
                  {t('settings.sessions', 'Devices & Active Sessions')}
                </AppText>
                <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
              <AppDivider marginLeft={64} />

              {/* Language Selector */}
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => setLangModalVisible(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconCircle, { backgroundColor: `${theme.colors.primary}18` }]}>
                  <Feather name="globe" size={18} color={theme.colors.primary} />
                </View>
                <AppText variant="body" semibold style={{ flex: 1 }}>
                  {t('settings.language', 'Language')}
                </AppText>
                <AppText variant="bodyS" color="secondary" style={{ marginRight: 8 }}>
                  {currentLangObj.native}
                </AppText>
                <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
              <AppDivider marginLeft={64} />

              {/* Dark Mode Toggle */}
              <View style={styles.menuRow}>
                <View style={[styles.menuIconCircle, { backgroundColor: `${theme.colors.accent}18` }]}>
                  <Feather name="moon" size={18} color={theme.colors.accent} />
                </View>
                <AppText variant="body" semibold style={{ flex: 1 }}>
                  {t('settings.dark_mode', 'Dark Mode')}
                </AppText>
                <AppSwitch value={isDark} onValueChange={toggleTheme} />
              </View>
            </View>
          </View>

          {/* Developer Control Panel Trigger */}
          <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
            <TouchableOpacity
              style={[styles.devTriggerBtn, { backgroundColor: `${theme.colors.warning}15`, borderColor: `${theme.colors.warning}35` }]}
              onPress={() => setDevModalVisible(true)}
            >
              <Ionicons name="construct" size={18} color={theme.colors.warning} />
              <AppText variant="bodyS" bold style={{ color: theme.colors.warning, marginLeft: 8 }}>
                Developer Simulation Panel (__DEV__)
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Danger Zone */}
          <View style={styles.menuSection}>
            <AppText variant="label" color="muted" style={styles.sectionHeader}>
              {t('danger.title', 'DANGER ZONE').toUpperCase()}
            </AppText>

            <View style={[styles.menuCard, { backgroundColor: theme.colors.surface }]}>
              {/* Delete Account */}
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => router.push('/profile/delete-account' as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconCircle, { backgroundColor: theme.colors.errorBg }]}>
                  <Feather name="trash-2" size={18} color={theme.colors.error} />
                </View>
                <AppText variant="body" semibold style={{ flex: 1, color: theme.colors.error }}>
                  {t('danger.delete_account', 'Delete Account')}
                </AppText>
                <Feather name="chevron-right" size={18} color={theme.colors.error} />
              </TouchableOpacity>
              <AppDivider marginLeft={64} />

              {/* Log Out */}
              <TouchableOpacity
                style={styles.menuRow}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconCircle, { backgroundColor: theme.colors.errorBg }]}>
                  <Feather name="log-out" size={18} color={theme.colors.error} />
                </View>
                <AppText variant="body" bold style={{ flex: 1, color: theme.colors.error }}>
                  {t('danger.logout', 'Log Out')}
                </AppText>
                <Feather name="chevron-right" size={18} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          </View>

          <AppText variant="small" color="muted" center style={{ marginTop: 8, marginBottom: 20 }}>
            CabBooking Mobility v2.0 • Customer Core
          </AppText>
        </ScrollView>
      </SafeAreaView>

      {/* Language Selection Modal */}
      <Modal visible={langModalVisible} transparent animationType="fade" onRequestClose={() => setLangModalVisible(false)}>
        <View style={styles.langModalOverlay}>
          <View style={[styles.langModalBox, { backgroundColor: theme.colors.surface }]}>
            <AppText variant="h3" bold style={{ marginBottom: 16 }}>
              {t('settings.language', 'Select Language')}
            </AppText>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.langOption,
                  {
                    backgroundColor: language === lang.code ? `${theme.colors.primary}18` : theme.colors.backgroundAlt,
                    borderColor: language === lang.code ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => {
                  setLanguage(lang.code)
                  setLangModalVisible(false)
                }}
              >
                <View>
                  <AppText variant="body" bold>{lang.native}</AppText>
                  <AppText variant="small" color="muted">{lang.label}</AppText>
                </View>
                {language === lang.code && <Feather name="check" size={20} color={theme.colors.primary} />}
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.langCloseBtn} onPress={() => setLangModalVisible(false)}>
              <AppText variant="body" semibold color="secondary">Cancel</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Developer Mode Modal */}
      <DevModeModal visible={devModalVisible} onClose={() => setDevModalVisible(false)} />

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
              <AppText variant="h3" bold>{displayName}</AppText>
              <TouchableOpacity
                style={[styles.previewModalClose, { backgroundColor: theme.colors.backgroundAlt }]}
                onPress={() => setShowPreviewModal(false)}
              >
                <Feather name="x" size={20} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.previewImageContainer}>
              {profile?.profile_photo_url ? (
                <Image
                  source={{ uri: profile.profile_photo_url }}
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
                  handleAvatarPress()
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
    </View>
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
  headerBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
  safeArea: { flex: 1 },
  profileHeader: { alignItems: 'center', paddingTop: 20, paddingBottom: 24, paddingHorizontal: 20 },
  avatarWrapper: { position: 'relative', marginBottom: 14 },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarEditIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  quickCard: {
    width: '48.5%',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuSection: { marginHorizontal: 16, marginBottom: 20 },
  sectionHeader: { letterSpacing: 0.5, marginBottom: 8, paddingHorizontal: 4 },
  menuCard: { borderRadius: 20, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  menuIconCircle: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  devTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  langModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  langModalBox: { width: '100%', borderRadius: 24, padding: 20 },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  langCloseBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 6 },
})
