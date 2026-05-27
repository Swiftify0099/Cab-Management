/**
 * Driver Profile Tab — Show driver info, KYC status, vehicle details.
 */
import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Switch, ActivityIndicator, Alert,
} from 'react-native'
import { router } from 'expo-router'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const API = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:80/api/v1'

const KYC_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  under_review: '#3B82F6',
  approved: '#10B981',
  rejected: '#EF4444',
}

export default function DriverProfileScreen() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [womenOnly, setWomenOnly] = useState(false)

  useEffect(() => { loadProfile() }, [])

  const loadProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await axios.get(`${API}/driver/me`, { headers })
      setProfile(res.data.data)
    } catch {
      // Demo data
      setProfile({
        full_name: 'Ramesh Patil',
        phone: '+919876543210',
        email: null,
        kyc_status: 'approved',
        status: 'online',
        rating: 4.8,
        total_trips: 142,
        total_earnings: 68400,
        wallet_balance: 1240,
        vehicle: {
          make: 'Maruti', model: 'Swift Dzire',
          year: 2022, color: 'White',
          registration_number: 'MH12AB1234',
          vehicle_type: 'sedan', seat_capacity: 4,
          has_ac: true, parcel_capable: true,
        },
      })
    } finally {
      setLoading(false) }
  }

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['access_token', 'refresh_token'])
          router.replace('/')
        },
      },
    ])
  }

  if (loading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#3B82F6" />
    </View>
  )

  const kycColor = KYC_COLORS[profile?.kyc_status] || '#94A3B8'

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Avatar + Name */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.full_name?.charAt(0) || 'D'}
          </Text>
        </View>
        <Text style={styles.name}>{profile?.full_name || 'Driver'}</Text>
        <Text style={styles.phone}>{profile?.phone}</Text>

        {/* KYC Badge */}
        <View style={[styles.kycBadge, { borderColor: kycColor, backgroundColor: kycColor + '20' }]}>
          <View style={[styles.kycDot, { backgroundColor: kycColor }]} />
          <Text style={[styles.kycText, { color: kycColor }]}>
            KYC {(profile?.kyc_status || 'pending').replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { icon: '⭐', label: 'Rating', value: profile?.rating?.toFixed(1) || '5.0' },
          { icon: '🚗', label: 'Trips', value: profile?.total_trips || 0 },
          { icon: '💰', label: 'Wallet', value: `₹${profile?.wallet_balance || 0}` },
        ].map(s => (
          <View key={s.label} style={styles.statCard}>
            <Text style={styles.statIcon}>{s.icon}</Text>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Vehicle Card */}
      {profile?.vehicle && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🚗 My Vehicle</Text>
          <View style={styles.vehicleGrid}>
            {[
              ['Make & Model', `${profile.vehicle.make} ${profile.vehicle.model}`],
              ['Year', profile.vehicle.year],
              ['Color', profile.vehicle.color],
              ['Reg No.', profile.vehicle.registration_number],
              ['Seats', profile.vehicle.seat_capacity],
              ['Type', profile.vehicle.vehicle_type?.replace('_', ' ')],
            ].map(([label, val]) => (
              <View key={label as string} style={styles.vehicleRow}>
                <Text style={styles.vehicleLabel}>{label}</Text>
                <Text style={styles.vehicleValue}>{val}</Text>
              </View>
            ))}
          </View>
          <View style={styles.vehicleTags}>
            {profile.vehicle.has_ac && <Tag label="❄️ AC" color="#3B82F6" />}
            {profile.vehicle.parcel_capable && <Tag label="📦 Parcel OK" color="#8B5CF6" />}
          </View>
        </View>
      )}

      {/* Preferences */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Preferences</Text>
        <View style={styles.prefRow}>
          <View>
            <Text style={styles.prefLabel}>Accept Women-Only Trips</Text>
            <Text style={styles.prefSubLabel}>Show your cab for female passengers only</Text>
          </View>
          <Switch value={womenOnly} onValueChange={setWomenOnly}
            trackColor={{ false: '#475569', true: '#EC4899' }}
            thumbColor="#FFFFFF" />
        </View>
      </View>

      {/* Settings */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        {[
          { icon: '📄', label: 'My Documents', sub: 'Aadhaar, License, RC Book' },
          { icon: '🏦', label: 'Bank Account', sub: 'Settlement details' },
          { icon: '🔔', label: 'Notifications', sub: 'Manage alerts' },
          { icon: '🆘', label: 'Support', sub: 'Help & complaints' },
        ].map(item => (
          <TouchableOpacity key={item.label} style={styles.menuItem} activeOpacity={0.7}>
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuSub}>{item.sub}</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.8}>
        <Text style={styles.logoutText}>🚪 Log Out</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  )
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.tag, { backgroundColor: color + '20', borderColor: color }]}>
      <Text style={[styles.tagText, { color }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' },
  header: { backgroundColor: '#1E293B', alignItems: 'center', paddingTop: 32, paddingBottom: 28, paddingHorizontal: 20 },
  avatar: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: '#2563EB',
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#FFFFFF' },
  name: { fontSize: 20, fontWeight: '800', color: '#F8FAFC', marginBottom: 2 },
  phone: { fontSize: 13, color: '#94A3B8', marginBottom: 12 },
  kycBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  kycDot: { width: 7, height: 7, borderRadius: 4 },
  kycText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  statsRow: { flexDirection: 'row', gap: 10, margin: 16 },
  statCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  statLabel: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, marginHorizontal: 16, marginBottom: 12, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 12 },
  vehicleGrid: { gap: 8 },
  vehicleRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  vehicleLabel: { fontSize: 12, color: '#94A3B8' },
  vehicleValue: { fontSize: 12, fontWeight: '600', color: '#334155' },
  vehicleTags: { flexDirection: 'row', gap: 8, marginTop: 12 },
  tag: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 11, fontWeight: '700' },
  prefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  prefLabel: { fontSize: 13, fontWeight: '600', color: '#334155' },
  prefSubLabel: { fontSize: 11, color: '#94A3B8', marginTop: 2, maxWidth: 220 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  menuIcon: { fontSize: 18, width: 32 },
  menuContent: { flex: 1 },
  menuLabel: { fontSize: 13, fontWeight: '600', color: '#334155' },
  menuSub: { fontSize: 11, color: '#94A3B8', marginTop: 1 },
  menuArrow: { fontSize: 22, color: '#CBD5E1' },
  logoutBtn: {
    marginHorizontal: 16, marginBottom: 8, padding: 16,
    backgroundColor: '#FEF2F2', borderRadius: 14,
    borderWidth: 1, borderColor: '#FECACA', alignItems: 'center',
  },
  logoutText: { color: '#EF4444', fontWeight: '700', fontSize: 14 },
})
