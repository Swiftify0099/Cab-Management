/**
 * Partner Services Management & Authorization Hub — Phase 1
 * ─────────────────────────────────────────────────────────────────────────────
 * View and toggle registered mobility services (Cab, Parcel, Freight, Packers,
 * Airport, Corporate, Carpool, Hotel Concierge) with role-based authorization.
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useTheme } from '../src/theme'
import {
  PartnerServiceAuth,
  PartnerServiceStatus,
  PartnerServiceType,
} from '../src/services/partnerServiceAuth'

export default function PartnerServicesManagementScreen() {
  const { isDark } = useTheme()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [services, setServices] = useState<PartnerServiceStatus[]>([])

  const loadServices = useCallback(async () => {
    try {
      setLoading(true)
      const list = await PartnerServiceAuth.getApprovedServices()
      setServices(list)
    } catch (err: any) {
      console.warn('[ServicesManagement] load error:', err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadServices()
  }, [loadServices])

  const onRefresh = () => {
    setRefreshing(true)
    loadServices()
  }

  const handleToggle = async (srv: PartnerServiceStatus, val: boolean) => {
    if (!srv.is_approved) {
      Alert.alert(
        'Service Not Approved',
        `Your account has not been approved for ${srv.display_name} yet. Complete the required document verification or vehicle inspection to unlock this vertical.`
      )
      return
    }

    setServices(prev =>
      prev.map(s => (s.service_type === srv.service_type ? { ...s, is_enabled: val } : s))
    )

    await PartnerServiceAuth.toggleService(srv.service_type, val)
  }

  const bgRoot = isDark ? '#090C15' : '#F8FAFC'
  const bgCard = isDark ? '#1E293B' : '#FFFFFF'
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A'
  const textSecondary = isDark ? '#94A3B8' : '#64748B'
  const borderCol = isDark ? '#334155' : '#E2E8F0'

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: bgRoot }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderCol }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>Service Management</Text>
          <Text style={[styles.headerSubtitle, { color: textSecondary }]}>
            Service-Based Account & Active Request Filters
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadServices}>
          <Feather name="refresh-cw" size={18} color="#0284C7" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Info Banner */}
        <View style={[styles.infoBanner, { backgroundColor: isDark ? '#0F172A' : '#EFF6FF', borderColor: '#3B82F6' }]}>
          <Feather name="shield" size={20} color="#3B82F6" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.infoBannerTitle, { color: textPrimary }]}>One Account — Multi-Service Dispatch</Text>
            <Text style={[styles.infoBannerSub, { color: textSecondary }]}>
              You will only receive request offers and radar broadcasts for the approved services that are toggled ON.
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: textPrimary }]}>
          Approved Mobility Verticals ({services.filter(s => s.is_approved).length} / {services.length})
        </Text>

        {loading && !refreshing ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#0284C7" />
          </View>
        ) : (
          services.map(srv => (
            <View
              key={srv.service_type}
              style={[
                styles.serviceCard,
                { backgroundColor: bgCard, borderColor: borderCol },
                !srv.is_approved && { opacity: 0.6 },
              ]}
            >
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                onPress={() => {
                  if (srv.is_approved && srv.route) {
                    router.push(srv.route as any)
                  } else if (!srv.is_approved) {
                    Alert.alert(
                      'Service Not Approved',
                      `Complete the required verification to unlock the ${srv.display_name} workspace.`
                    )
                  }
                }}
                activeOpacity={srv.is_approved ? 0.7 : 1}
              >
                <View style={styles.serviceIconContainer}>
                  <Feather name={srv.icon as any || 'check'} size={22} color="#0284C7" />
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.serviceTitle, { color: textPrimary }]}>{srv.display_name}</Text>
                    {srv.is_approved ? (
                      <View style={styles.approvedBadge}>
                        <Text style={styles.approvedBadgeText}>APPROVED</Text>
                      </View>
                    ) : (
                      <View style={styles.pendingBadge}>
                        <Text style={styles.pendingBadgeText}>NOT APPLIED</Text>
                      </View>
                    )}
                  </View>

                  <Text style={[styles.serviceSub, { color: textSecondary }]}>
                    {srv.is_enabled && srv.is_approved ? 'Active & receiving orders' : 'Paused / Offline for this service'}
                  </Text>
                  {srv.is_approved && srv.route && (
                    <Text style={styles.openWorkspaceLink}>Tap to open workspace →</Text>
                  )}
                </View>
              </TouchableOpacity>

              <Switch
                value={srv.is_enabled && srv.is_approved}
                onValueChange={val => handleToggle(srv, val)}
                trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: '#10B981' }}
                thumbColor="#FFFFFF"
                disabled={!srv.is_approved}
              />
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  refreshBtn: { padding: 8 },
  scroll: { flex: 1 },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  infoBannerTitle: { fontSize: 13, fontWeight: '800' },
  infoBannerSub: { fontSize: 11, marginTop: 2, lineHeight: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 12 },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  serviceIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceTitle: { fontSize: 14, fontWeight: '700' },
  serviceSub: { fontSize: 11, marginTop: 2 },
  approvedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  approvedBadgeText: { color: '#10B981', fontSize: 9, fontWeight: '800' },
  pendingBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
  },
  pendingBadgeText: { color: '#64748B', fontSize: 9, fontWeight: '800' },
  openWorkspaceLink: {
    color: '#0284C7',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
})
