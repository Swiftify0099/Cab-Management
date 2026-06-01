/**
 * Driver Profile + Settings Hub — pixel-perfect from stitch:
 * driver_profile_settings + driver_ratings_overview_ui
 */
import { useState } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'

const MENU_SECTIONS = [
  {
    title: 'Vehicle & Documents',
    items: [
      { icon: 'file-text', label: 'Documents & Verification', route: '/kyc/status', color: '#3B82F6' },
      { icon: 'truck', label: 'Vehicle Verification', route: '/kyc/vehicle', color: '#6366F1' },
      { icon: 'activity', label: 'Vehicle Health', route: '/vehicle/health', color: '#10B981' },
      { icon: 'alert-triangle', label: 'Maintenance Alerts', route: '/vehicle/alerts', color: '#F59E0B' },
    ],
  },
  {
    title: 'Partner Hub',
    items: [
      { icon: 'award', label: 'Incentives & Quests', route: '/partner/incentives', color: '#EAB308' },
      { icon: 'users', label: 'Leaderboard', route: '/partner/leaderboard', color: '#8B5CF6' },
      { icon: 'headphones', label: 'Support Hub', route: '/partner/support', color: '#06B6D4' },
      { icon: 'book-open', label: 'Training & Certification', route: '/partner/training', color: '#10B981' },
      { icon: 'message-square', label: 'Disputes & Complaints', route: '/partner/disputes', color: '#EF4444' },
      { icon: 'alert-octagon', label: 'Penalty History', route: '/partner/penalties', color: '#F97316' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { icon: 'droplet', label: 'Fuel Expense Tracker', route: '/finance/fuel', color: '#3B82F6' },
      { icon: 'percent', label: 'Tax & Settlement', route: '/finance/tax', color: '#6D28D9' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { icon: 'settings', label: 'App Settings', route: '/settings/index', color: '#475569' },
      { icon: 'bell', label: 'Notifications', route: '/settings/notifications', color: '#F59E0B' },
      { icon: 'shield', label: 'Privacy & Security', route: '/settings/privacy', color: '#10B981' },
    ],
  },
]

const RATING_BARS = [
  { star: 5, count: 142, pct: 0.85 },
  { star: 4, count: 18, pct: 0.11 },
  { star: 3, count: 5, pct: 0.03 },
  { star: 2, count: 1, pct: 0.006 },
  { star: 1, count: 0, pct: 0 },
]

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState<'profile' | 'ratings'>('profile')

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive', onPress: async () => {
          await AsyncStorage.clear()
          router.replace('/auth/phone')
        },
      },
    ])
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#090C15" />

      {/* Profile Header Banner */}
      <LinearGradient colors={['#0F172A', '#1E3A8A']} style={styles.banner}>
        <SafeAreaView edges={['top']}>
          <View style={styles.bannerContent}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>RD</Text>
            </View>
            <View style={styles.bannerInfo}>
              <Text style={styles.driverName}>Rahul D.</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#EAB308" />
                <Text style={styles.ratingText}>4.9 · 166 trips</Text>
              </View>
              <View style={styles.badgeRow}>
                <View style={styles.badge}><Text style={styles.badgeText}>✅ KYC Verified</Text></View>
                <View style={[styles.badge, { backgroundColor: 'rgba(16,185,129,0.2)', borderColor: '#10B981' }]}>
                  <Text style={[styles.badgeText, { color: '#10B981' }]}>🟢 Online</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.editBtn}>
              <Feather name="edit-2" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'profile' && styles.tabActive]}
              onPress={() => setActiveTab('profile')}
            >
              <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'ratings' && styles.tabActive]}
              onPress={() => setActiveTab('ratings')}
            >
              <Text style={[styles.tabText, activeTab === 'ratings' && styles.tabTextActive]}>Ratings</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {activeTab === 'profile' ? (
          <>
            {/* Stats Row */}
            <View style={styles.statsRow}>
              {[
                { label: 'Total Trips', value: '166', icon: 'car-side' },
                { label: 'This Month', value: '24', icon: 'calendar' },
                { label: 'Earnings', value: '₹22k', icon: 'cash' },
              ].map((s, i) => (
                <View key={i} style={styles.statCard}>
                  <MaterialCommunityIcons name={s.icon as any} size={22} color="#3B82F6" />
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Menu Sections */}
            {MENU_SECTIONS.map((section, si) => (
              <View key={si} style={styles.menuSection}>
                <Text style={styles.menuSectionTitle}>{section.title}</Text>
                <View style={styles.menuCard}>
                  {section.items.map((item, ii) => (
                    <TouchableOpacity
                      key={ii}
                      style={[styles.menuItem, ii < section.items.length - 1 && styles.menuItemBorder]}
                      onPress={() => router.push(item.route as any)}
                    >
                      <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                        <Feather name={item.icon as any} size={18} color={item.color} />
                      </View>
                      <Text style={styles.menuLabel}>{item.label}</Text>
                      <Feather name="chevron-right" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}

            {/* Logout */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Feather name="log-out" size={18} color="#EF4444" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </>
        ) : (
          /* Ratings Tab */
          <View style={styles.ratingsWrap}>
            {/* Big Rating */}
            <View style={styles.ratingBig}>
              <Text style={styles.ratingBigNum}>4.9</Text>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map(s => (
                  <Ionicons key={s} name="star" size={20} color="#EAB308" />
                ))}
              </View>
              <Text style={styles.ratingBigSub}>Based on 166 ratings</Text>
            </View>

            {/* Breakdown bars */}
            <View style={styles.ratingBars}>
              {RATING_BARS.map(rb => (
                <View key={rb.star} style={styles.ratingBarRow}>
                  <Text style={styles.ratingBarStar}>{rb.star} ★</Text>
                  <View style={styles.ratingBarTrack}>
                    <LinearGradient
                      colors={['#3B82F6', '#8B5CF6']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={[styles.ratingBarFill, { width: `${rb.pct * 100}%` }]}
                    />
                  </View>
                  <Text style={styles.ratingBarCount}>{rb.count}</Text>
                </View>
              ))}
            </View>

            {/* Review Tags */}
            <Text style={styles.menuSectionTitle}>Passenger Feedback</Text>
            <View style={styles.tagRow}>
              {['Safe Driver', 'Punctual', 'Clean Vehicle', 'Helpful', 'Great Music', 'Smooth Ride'].map(tag => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },

  banner: { paddingBottom: 0 },
  bannerContent: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#1D4ED8', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#60A5FA' },
  avatarInitials: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  bannerInfo: { flex: 1 },
  driverName: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  ratingText: { color: '#CBD5E1', fontSize: 13 },
  badgeRow: { flexDirection: 'row', gap: 8 },
  badge: { backgroundColor: 'rgba(59,130,246,0.2)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: '#3B82F6' },
  badgeText: { color: '#93C5FD', fontSize: 11, fontWeight: '600' },
  editBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },

  tabRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 4, paddingBottom: 0 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#3B82F6' },
  tabText: { color: '#94A3B8', fontSize: 15, fontWeight: '600' },
  tabTextActive: { color: '#FFFFFF', fontWeight: '800' },

  scroll: { flex: 1 },

  statsRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, alignItems: 'center', gap: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statValue: { color: '#0F172A', fontSize: 18, fontWeight: '800' },
  statLabel: { color: '#94A3B8', fontSize: 10 },

  menuSection: { marginHorizontal: 16, marginTop: 16 },
  menuSectionTitle: { fontSize: 13, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginHorizontal: 16 },
  menuCard: { backgroundColor: '#FFFFFF', borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, color: '#0F172A', fontSize: 15, fontWeight: '600' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', marginHorizontal: 16, marginTop: 16, backgroundColor: '#FEE2E2', borderRadius: 16, paddingVertical: 14 },
  logoutText: { color: '#EF4444', fontSize: 16, fontWeight: '700' },

  ratingsWrap: { padding: 16 },
  ratingBig: { alignItems: 'center', paddingVertical: 24, backgroundColor: '#FFFFFF', borderRadius: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  ratingBigNum: { fontSize: 72, fontWeight: '900', color: '#0F172A', lineHeight: 80 },
  ratingStars: { flexDirection: 'row', gap: 4, marginBottom: 8 },
  ratingBigSub: { color: '#94A3B8', fontSize: 14 },
  ratingBars: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 16 },
  ratingBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  ratingBarStar: { color: '#6B7280', fontSize: 13, width: 32 },
  ratingBarTrack: { flex: 1, height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  ratingBarFill: { height: '100%', borderRadius: 4 },
  ratingBarCount: { color: '#6B7280', fontSize: 12, width: 28, textAlign: 'right' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  tag: { backgroundColor: '#EFF6FF', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#BFDBFE' },
  tagText: { color: '#1D4ED8', fontSize: 13, fontWeight: '600' },
})
