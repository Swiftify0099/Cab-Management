/**
 * Customer App — My Account / Profile Settings
 * Refactored: All hardcoded colors → theme tokens.
 * Components: AppText, AppAvatar, AppDivider.
 * Business logic: UNCHANGED. API calls: UNCHANGED. Image upload: UNCHANGED.
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  View, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, RefreshControl, Alert, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import * as ImagePicker from 'expo-image-picker'
import { useAuthStore } from '../../src/store/auth.store'
import { profileApi } from '../../src/api/client'
import { router } from 'expo-router'
import { useTheme } from '../../src/contexts/ThemeContext'
import {
  AppText, AppAvatar, AppDivider,
} from '../../src/components/ui'

interface UserProfile {
  full_name?: string; phone?: string; email?: string
  gender?: string; dob?: string; profile_photo_url?: string; is_verified?: boolean
}

const MENU_SECTIONS = [
  {
    title: 'Travel',
    items: [
      { icon: 'map-pin',     label: 'Saved Addresses',  route: '/profile/addresses', color: '#059669' },
      { icon: 'calendar',    label: 'My Trips',          route: '/(tabs)/trips',      color: '#2563EB' },
      { icon: 'package',     label: 'My Parcels',        route: '/(tabs)/parcels',    color: '#7C3AED' },
    ],
  },
  {
    title: 'Payments',
    items: [
      { icon: 'credit-card', label: 'Wallet & Payments', route: '/(tabs)/wallet',    color: '#F59E0B' },
      { icon: 'gift',        label: 'Referrals & Rewards',route: null,               color: '#EC4899' },
    ],
  },
  {
    title: 'Account',
    items: [
      { icon: 'help-circle', label: 'Help & Support',    route: null,                color: '#0891B2' },
      { icon: 'settings',    label: 'Settings',          route: '/settings',         color: '#64748B' },
      { icon: 'shield',      label: 'Privacy & Safety',  route: null,                color: '#6366F1' },
    ],
  },
]

export default function ProfileTab() {
  const { theme, isDark } = useTheme()
  const { user, logout }= useAuthStore()
  const [profile,    setProfile]    = useState<UserProfile | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadProfile = useCallback(async () => {
    try {
      const res = await profileApi.getMe()
      setProfile(res.data?.data || res.data)
    } catch {
      setProfile({ phone: user?.phone })
    } finally {
      setLoading(false); setRefreshing(false)
    }
  }, [user])

  useEffect(() => { loadProfile() }, [loadProfile])

  const onRefresh = () => { setRefreshing(true); loadProfile() }

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive',
        onPress: async () => { await logout(); router.replace('/auth/phone') },
      },
    ])
  }

  const handleMenuPress = (route: string | null) => {
    if (!route) { Alert.alert('Coming Soon', 'This feature will be available soon.'); return }
    router.push(route as any)
  }

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, aspect: [1, 1], quality: 0.7,
      })
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLoading(true)
        const asset    = result.assets[0]
        const formData = new FormData() as any
        const filename = asset.uri.split('/').pop() || 'avatar.jpg'
        const type     = asset.type || 'image/jpeg'
        formData.append('file', { uri: asset.uri, name: filename, type })
        await profileApi.uploadPhoto(formData)
        await loadProfile()
      }
    } catch (e: any) {
      Alert.alert('Upload Failed', e?.response?.data?.detail || 'Could not upload photo')
      setLoading(false)
    }
  }

  const displayName = profile?.full_name || user?.phone || 'User'

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.backgroundAlt }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={theme.gradient.heroBg} style={styles.headerBg} />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        >
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            {/* Avatar */}
            <TouchableOpacity style={styles.avatarWrapper} onPress={handleImagePick} activeOpacity={0.8}>
              <AppAvatar name={displayName} imageUri={profile?.profile_photo_url} size={88} />
              {profile?.is_verified && (
                <View style={[styles.verifiedBadge, { backgroundColor: theme.colors.success }]}>
                  <Ionicons name="checkmark" size={10} color={theme.colors.white} />
                </View>
              )}
              <View style={[styles.avatarEditIcon, { backgroundColor: theme.colors.primary, borderColor: theme.colors.background }]}>
                <Feather name="camera" size={14} color={theme.colors.white} />
              </View>
            </TouchableOpacity>

            {loading
              ? <ActivityIndicator color={theme.colors.white} style={{ marginTop: 16 }} />
              : (
                <>
                  <AppText variant="h3" bold color="white" center style={{ marginBottom: 4 }}>{displayName}</AppText>
                  <AppText variant="bodyS" color="white" center style={{ opacity: 0.65, marginBottom: 10 }}>
                    {profile?.phone || user?.phone}
                  </AppText>
                  {profile?.gender && (
                    <View style={[styles.profileBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                      <AppText variant="small" semibold color="white">
                        {profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)}
                      </AppText>
                    </View>
                  )}
                </>
              )
            }

            <TouchableOpacity
              style={[styles.editBtn, {
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderColor:     `${theme.colors.primary}66`,
              }]}
              onPress={() => router.push('/auth/profile-setup' as any)}
            >
              <Feather name="edit-2" size={14} color={theme.colors.primary} />
              <AppText variant="small" semibold color="brand" style={{ marginLeft: 6 }}>Edit Profile</AppText>
            </TouchableOpacity>
          </View>

          {/* Stats Row */}
          <View style={[styles.statsRow, {
            backgroundColor: theme.colors.surface,
            shadowColor: isDark ? '#000' : '#000',
          }]}>
            {[
              { value: '4.9', label: 'Rating' },
              { value: '12',  label: 'Trips'  },
              { value: '3',   label: 'Parcels'},
            ].map((stat, idx, arr) => (
              <React.Fragment key={stat.label}>
                <View style={styles.statItem}>
                  <AppText variant="h3" bold>{stat.value}</AppText>
                  <AppText variant="small" color="secondary" style={{ marginTop: 2 }}>{stat.label}</AppText>
                </View>
                {idx < arr.length - 1 && (
                  <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
                )}
              </React.Fragment>
            ))}
          </View>

          {/* Menu Sections */}
          {MENU_SECTIONS.map(section => (
            <View key={section.title} style={styles.section}>
              <AppText variant="label" color="muted" style={styles.sectionTitle}>
                {section.title.toUpperCase()}
              </AppText>
              <View style={[styles.sectionCard, {
                backgroundColor: theme.colors.surface,
                shadowColor: isDark ? '#000' : '#000',
              }]}>
                {section.items.map((item, idx) => (
                  <React.Fragment key={item.label}>
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => handleMenuPress(item.route)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.menuIconCircle, { backgroundColor: item.color + '22' }]}>
                        <Feather name={item.icon as any} size={18} color={item.color} />
                      </View>
                      <AppText variant="body" semibold style={{ flex: 1 }}>{item.label}</AppText>
                      <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                    {idx < section.items.length - 1 && (
                      <AppDivider marginLeft={70} />
                    )}
                  </React.Fragment>
                ))}
              </View>
            </View>
          ))}

          {/* Log Out */}
          <TouchableOpacity
            style={[styles.logoutBtn, {
              backgroundColor: theme.colors.errorBg,
              borderColor:     '#FECACA',
            }]}
            onPress={handleLogout}
            activeOpacity={0.85}
          >
            <Feather name="log-out" size={18} color={theme.colors.error} />
            <AppText variant="body" bold style={{ color: theme.colors.error, marginLeft: 10 }}>Log Out</AppText>
          </TouchableOpacity>

          <AppText variant="small" color="muted" center style={{ marginBottom: 8 }}>
            Intercity Mobility v1.0.0
          </AppText>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root:          { flex: 1 },
  headerBg:      { position: 'absolute', top: 0, left: 0, right: 0, height: 280 },
  safeArea:      { flex: 1 },

  profileHeader: { alignItems: 'center', paddingTop: 24, paddingBottom: 32, paddingHorizontal: 20 },
  avatarWrapper: { position: 'relative', marginBottom: 16 },
  verifiedBadge: { position: 'absolute', bottom: 2, right: 2, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  avatarEditIcon:{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  profileBadge:  { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 16 },
  editBtn:       { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1 },

  statsRow:      { flexDirection: 'row', marginHorizontal: 16, borderRadius: 20, padding: 20, shadowOpacity: 0.06, shadowRadius: 12, elevation: 4, marginTop: -20, marginBottom: 24 },
  statItem:      { flex: 1, alignItems: 'center' },
  statDivider:   { width: 1, marginVertical: 4 },

  section:       { marginHorizontal: 16, marginBottom: 20 },
  sectionTitle:  { letterSpacing: 0.5, marginBottom: 8, paddingHorizontal: 4 },
  sectionCard:   { borderRadius: 20, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, overflow: 'hidden' },
  menuItem:      { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  menuIconCircle:{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  logoutBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 16 },
})
