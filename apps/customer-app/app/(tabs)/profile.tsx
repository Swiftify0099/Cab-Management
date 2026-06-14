/**
 * Customer App — My Account / Profile Settings
 * Shows user info (from API) + navigation to sub-screens.
 * Replaces the old "User Profile Setup" form (which belongs in onboarding only).
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Image, StatusBar, RefreshControl, Alert, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import * as ImagePicker from 'expo-image-picker'
import { useAuthStore } from '../../src/store/auth.store'
import { profileApi } from '../../src/api/client'
import { router } from 'expo-router'

interface UserProfile {
  full_name?: string
  phone?: string
  email?: string
  gender?: string
  dob?: string
  profile_photo_url?: string
  is_verified?: boolean
}

const MENU_SECTIONS = [
  {
    title: 'Travel',
    items: [
      { icon: 'map-pin', label: 'Saved Addresses', route: '/profile/addresses', color: '#059669' },
      { icon: 'calendar', label: 'My Trips', route: '/(tabs)/trips', color: '#2563EB' },
      { icon: 'package', label: 'My Parcels', route: '/(tabs)/parcels', color: '#7C3AED' },
    ],
  },
  {
    title: 'Payments',
    items: [
      { icon: 'credit-card', label: 'Wallet & Payments', route: '/(tabs)/wallet', color: '#F59E0B' },
      { icon: 'gift', label: 'Referrals & Rewards', route: null, color: '#EC4899' },
    ],
  },
  {
    title: 'Account',
    items: [
      { icon: 'help-circle', label: 'Help & Support', route: null, color: '#0891B2' },
      { icon: 'settings', label: 'Settings', route: '/settings', color: '#64748B' },
      { icon: 'shield', label: 'Privacy & Safety', route: null, color: '#6366F1' },
    ],
  },
]

export default function ProfileTab() {
  const { user, logout } = useAuthStore()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadProfile = useCallback(async () => {
    try {
      const res = await profileApi.getMe()
      setProfile(res.data?.data || res.data)
    } catch {
      // Use auth store info as fallback
      setProfile({ phone: user?.phone })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user])

  useEffect(() => { loadProfile() }, [loadProfile])

  const onRefresh = () => {
    setRefreshing(true)
    loadProfile()
  }

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout()
          router.replace('/auth/phone')
        },
      },
    ])
  }

  const handleMenuPress = (route: string | null) => {
    if (!route) {
      Alert.alert('Coming Soon', 'This feature will be available soon.')
      return
    }
    router.push(route as any)
  }

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLoading(true);
        const asset = result.assets[0];
        
        // Create FormData
        const formData = new FormData() as any;
        const filename = asset.uri.split('/').pop() || 'avatar.jpg';
        const type = asset.type || 'image/jpeg';
        
        formData.append('file', {
          uri: asset.uri,
          name: filename,
          type,
        });

        await profileApi.uploadPhoto(formData);
        await loadProfile(); // reload
      }
    } catch (e: any) {
      Alert.alert('Upload Failed', e?.response?.data?.detail || 'Could not upload photo');
      setLoading(false);
    }
  }

  const displayName = profile?.full_name || user?.phone || 'User'
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() || '')
    .join('')

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0A0F1E', '#0F172A', '#1E1B4B']} style={styles.headerBg} />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
        >
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            {/* Avatar */}
            <TouchableOpacity style={styles.avatarWrapper} onPress={handleImagePick} activeOpacity={0.8}>
              {profile?.profile_photo_url
                ? <Image source={{ uri: profile.profile_photo_url }} style={styles.avatar} />
                : (
                  <LinearGradient colors={['#3B82F6', '#8B5CF6']} style={styles.avatarGrad}>
                    <Text style={styles.avatarInitials}>{initials || '👤'}</Text>
                  </LinearGradient>
                )
              }
              {profile?.is_verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark" size={10} color="#fff" />
                </View>
              )}
              {/* Edit Icon Overlay */}
              <View style={styles.avatarEditIcon}>
                <Feather name="camera" size={14} color="#FFF" />
              </View>
            </TouchableOpacity>

            {loading
              ? <ActivityIndicator color="#fff" style={{ marginTop: 16 }} />
              : (
                <>
                  <Text style={styles.profileName}>{displayName}</Text>
                  <Text style={styles.profilePhone}>{profile?.phone || user?.phone}</Text>
                  {profile?.gender && (
                    <View style={styles.profileBadge}>
                      <Text style={styles.profileBadgeText}>
                        {profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)}
                      </Text>
                    </View>
                  )}
                </>
              )
            }

            {/* Edit Profile Button */}
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => router.push('/auth/profile-setup' as any)}
            >
              <Feather name="edit-2" size={14} color="#3B82F6" />
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>4.9</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Trips</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>3</Text>
              <Text style={styles.statLabel}>Parcels</Text>
            </View>
          </View>

          {/* Menu Sections */}
          {MENU_SECTIONS.map(section => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.sectionCard}>
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
                      <Text style={styles.menuLabel}>{item.label}</Text>
                      <Feather name="chevron-right" size={18} color="#64748B" />
                    </TouchableOpacity>
                    {idx < section.items.length - 1 && <View style={styles.menuDivider} />}
                  </React.Fragment>
                ))}
              </View>
            </View>
          ))}

          {/* Log Out */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
            <Feather name="log-out" size={18} color="#EF4444" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

          {/* App Version */}
          <Text style={styles.version}>Intercity Mobility v1.0.0</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },
  headerBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 280 },
  safeArea: { flex: 1 },

  // Profile Header
  profileHeader: { alignItems: 'center', paddingTop: 24, paddingBottom: 32, paddingHorizontal: 20 },
  avatarWrapper: { position: 'relative', marginBottom: 16 },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: '#3B82F6' },
  avatarGrad: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(59,130,246,0.5)',
  },
  avatarInitials: { color: '#fff', fontSize: 30, fontWeight: '800' },
  avatarEditIcon: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: '#3B82F6', width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#0A0F1E',
  },
  verifiedBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  profileName: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  profilePhone: { color: 'rgba(255,255,255,0.65)', fontSize: 14, marginBottom: 10 },
  profileBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4, marginBottom: 16,
  },
  profileBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(59,130,246,0.4)',
  },
  editBtnText: { color: '#3B82F6', fontWeight: '600', fontSize: 13 },

  // Stats
  statsRow: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    marginHorizontal: 16, borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
    marginTop: -20, marginBottom: 24,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: '#0F172A', fontSize: 22, fontWeight: '800' },
  statLabel: { color: '#64748B', fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#E2E8F0', marginVertical: 4 },

  // Menu Sections
  section: { marginHorizontal: 16, marginBottom: 20 },
  sectionTitle: { color: '#64748B', fontSize: 12, fontWeight: '700', marginBottom: 8, paddingHorizontal: 4, letterSpacing: 0.5, textTransform: 'uppercase' },
  sectionCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    overflow: 'hidden',
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  menuIconCircle: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, color: '#1E293B', fontSize: 15, fontWeight: '500' },
  menuDivider: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 70 },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginHorizontal: 16, backgroundColor: '#FEF2F2', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: '#FECACA', marginBottom: 16,
  },
  logoutText: { color: '#EF4444', fontWeight: '700', fontSize: 15 },

  version: { textAlign: 'center', color: '#CBD5E1', fontSize: 12, marginBottom: 8 },
})
