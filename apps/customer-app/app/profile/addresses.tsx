/**
 * Customer App — Saved Addresses & Places Hub
 * Route: /profile/addresses
 * Feature 2: Customer Address & Location Management.
 */
import React, { useState, useCallback } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { profileApi, routeApi } from '../../src/api/client'
import { useTheme } from '../../src/contexts/ThemeContext'
import { useTranslation } from '../../src/i18n'
import {
  AppText,
  AppButton,
  AppCard,
  AppBadge,
  AppDivider,
} from '../../src/components/ui'

interface SavedAddress {
  id?: string
  label: string
  address: string
  address_type?: string
  latitude?: number
  longitude?: number
  is_default?: boolean
}

interface SavedRoute {
  id: string
  route_name: string
  pickup_label: string
  pickup_address: string
  pickup_lat: number
  pickup_lon: number
  drop_label: string
  drop_address: string
  drop_lat: number
  drop_lon: number
}

const PRESET_META: Record<string, { icon: string; colorKey: string }> = {
  home:    { icon: 'home',       colorKey: '#059669' },
  work:    { icon: 'briefcase',  colorKey: '#2563EB' },
  gym:     { icon: 'activity',   colorKey: '#F59E0B' },
  partner: { icon: 'heart',      colorKey: '#EC4899' },
  other:   { icon: 'map-pin',    colorKey: '#6366F1' },
}

export default function SavedAddressesScreen() {
  const { theme, isDark } = useTheme()
  const { t } = useTranslation()

  const [addresses, setAddresses] = useState<SavedAddress[]>([])
  const [routes, setRoutes] = useState<SavedRoute[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'places' | 'routes'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingRouteId, setDeletingRouteId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [addrRes, routeRes] = await Promise.all([
        profileApi.getAddresses(),
        routeApi.getRoutes(),
      ])
      setAddresses(addrRes.data?.data || addrRes.data || [])
      setRoutes(routeRes.data?.data || routeRes.data || [])
    } catch {
      setAddresses([])
      setRoutes([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadData()
    }, [loadData])
  )

  const handleDeleteAddress = (addr: SavedAddress) => {
    if (!addr.id) return
    Alert.alert(
      t('common.delete', 'Delete Address'),
      `${t('address.delete_confirm', 'Are you sure you want to delete')} "${addr.label.toUpperCase()}"?`,
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            setDeletingId(addr.id!)
            try {
              await profileApi.deleteAddress(addr.id!)
              setAddresses((prev) => prev.filter((a) => a.id !== addr.id))
            } catch {
              Alert.alert(t('common.error', 'Error'), 'Could not delete address.')
            } finally {
              setDeletingId(null)
            }
          },
        },
      ]
    )
  }

  const handleDeleteRoute = (r: SavedRoute) => {
    Alert.alert(
      t('common.delete', 'Delete Route'),
      `${t('address.delete_route_confirm', 'Are you sure you want to delete')} "${r.route_name}"?`,
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            setDeletingRouteId(r.id)
            try {
              await routeApi.deleteRoute(r.id)
              setRoutes((prev) => prev.filter((rt) => rt.id !== r.id))
            } catch {
              Alert.alert(t('common.error', 'Error'), 'Could not delete route.')
            } finally {
              setDeletingRouteId(null)
            }
          },
        },
      ]
    )
  }

  const getMeta = (label: string) => {
    const key = label.toLowerCase()
    return PRESET_META[key] || PRESET_META.other
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
          {t('address.title', 'Saved Places')}
        </AppText>
        <TouchableOpacity
          style={[styles.addTopBtn, { backgroundColor: `${theme.colors.primary}18` }]}
          onPress={() => router.push('/profile/address-picker' as any)}
        >
          <Feather name="plus" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: theme.colors.border }]}>
        {(['all', 'places', 'routes'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabBtn,
              activeTab === tab && {
                borderBottomColor: theme.colors.primary,
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <AppText
              variant="bodyS"
              semibold
              style={{
                color: activeTab === tab ? theme.colors.primary : theme.colors.textSecondary,
                textTransform: 'capitalize',
              }}
            >
              {tab === 'all'
                ? `All (${addresses.length + routes.length})`
                : tab === 'places'
                ? `Places (${addresses.length})`
                : `Routes (${routes.length})`}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                loadData()
              }}
              tintColor={theme.colors.primary}
            />
          }
        >
          {/* ── Saved Routes Section ── */}
          {(activeTab === 'all' || activeTab === 'routes') && (
            <View style={{ marginBottom: 20 }}>
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Feather name="navigation" size={18} color={theme.colors.accent} />
                  <AppText variant="subtitle" bold>
                    {t('address.saved_routes', 'Saved Routes')}
                  </AppText>
                </View>
                <TouchableOpacity
                  style={[styles.sectionAddBtn, { backgroundColor: `${theme.colors.accent}15`, borderColor: `${theme.colors.accent}30` }]}
                  onPress={() => router.push('/profile/route-picker' as any)}
                >
                  <Feather name="plus" size={14} color={theme.colors.accent} />
                  <AppText variant="small" semibold style={{ color: theme.colors.accent, marginLeft: 4 }}>
                    {t('address.add_route', 'Add Route')}
                  </AppText>
                </TouchableOpacity>
              </View>

              {routes.length === 0 ? (
                <TouchableOpacity
                  style={[
                    styles.emptyRouteCard,
                    {
                      backgroundColor: `${theme.colors.accent}10`,
                      borderColor: `${theme.colors.accent}35`,
                    },
                  ]}
                  onPress={() => router.push('/profile/route-picker' as any)}
                  activeOpacity={0.8}
                >
                  <Feather name="navigation" size={24} color={theme.colors.accent} style={{ marginBottom: 6 }} />
                  <AppText variant="bodyS" bold style={{ color: theme.colors.accent }}>
                    + Save Favorite Route
                  </AppText>
                  <AppText variant="small" color="muted">
                    e.g. Pune Station → Mumbai Airport
                  </AppText>
                </TouchableOpacity>
              ) : (
                routes.map((r) => (
                  <AppCard key={r.id} style={styles.routeCard}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <AppText variant="body" bold>{r.route_name}</AppText>
                        <AppBadge label="Quick Route" variant="info" size="sm" />
                      </View>
                      <View style={styles.routeRow}>
                        <View style={[styles.routeDot, { backgroundColor: theme.colors.success }]} />
                        <AppText variant="small" color="secondary" numberOfLines={1} style={{ flex: 1 }}>
                          {r.pickup_address}
                        </AppText>
                      </View>
                      <View style={[styles.routeVLine, { backgroundColor: theme.colors.border }]} />
                      <View style={styles.routeRow}>
                        <View style={[styles.routeDot, { backgroundColor: theme.colors.error }]} />
                        <AppText variant="small" color="secondary" numberOfLines={1} style={{ flex: 1 }}>
                          {r.drop_address}
                        </AppText>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.deleteBtn, { backgroundColor: theme.colors.errorBg }]}
                      onPress={() => handleDeleteRoute(r)}
                      disabled={deletingRouteId === r.id}
                    >
                      {deletingRouteId === r.id ? (
                        <ActivityIndicator size="small" color={theme.colors.error} />
                      ) : (
                        <Feather name="trash-2" size={16} color={theme.colors.error} />
                      )}
                    </TouchableOpacity>
                  </AppCard>
                ))
              )}
            </View>
          )}

          {/* ── Saved Places Section ── */}
          {(activeTab === 'all' || activeTab === 'places') && (
            <View>
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Feather name="map-pin" size={18} color={theme.colors.primary} />
                  <AppText variant="subtitle" bold>
                    {t('address.title', 'Saved Places')}
                  </AppText>
                </View>
                <TouchableOpacity
                  style={[styles.sectionAddBtn, { backgroundColor: `${theme.colors.primary}15`, borderColor: `${theme.colors.primary}30` }]}
                  onPress={() => router.push('/profile/address-picker' as any)}
                >
                  <Feather name="plus" size={14} color={theme.colors.primary} />
                  <AppText variant="small" semibold color="brand" style={{ marginLeft: 4 }}>
                    {t('address.add_new', 'Add Place')}
                  </AppText>
                </TouchableOpacity>
              </View>

              {addresses.length === 0 ? (
                <View style={styles.emptyState}>
                  <AppText style={{ fontSize: 44, marginBottom: 12 }}>📍</AppText>
                  <AppText variant="subtitle" bold center>
                    {t('address.no_addresses', 'No saved places yet')}
                  </AppText>
                  <AppText variant="bodyS" color="muted" center style={{ marginTop: 4, marginBottom: 20 }}>
                    Save Home, Work, and favorite drop points for faster 1-tap bookings.
                  </AppText>
                  <AppButton
                    onPress={() => router.push('/profile/address-picker' as any)}
                    variant="primary"
                  >
                    {t('address.add_new', '+ Add New Address')}
                  </AppButton>
                </View>
              ) : (
                addresses.map((addr) => {
                  const meta = getMeta(addr.label)
                  const isDeleting = addr.id && deletingId === addr.id
                  return (
                    <AppCard key={addr.id || addr.address} style={styles.addrCard}>
                      <View style={[styles.addrIcon, { backgroundColor: `${meta.colorKey}18` }]}>
                        <Feather name={meta.icon as any} size={22} color={meta.colorKey} />
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <AppText variant="body" bold>
                            {addr.label.charAt(0).toUpperCase() + addr.label.slice(1)}
                          </AppText>
                          {addr.is_default && (
                            <AppBadge label="Default" variant="success" size="sm" />
                          )}
                        </View>
                        <AppText variant="small" color="muted" numberOfLines={2} style={{ marginTop: 2 }}>
                          {addr.address}
                        </AppText>
                      </View>

                      <View style={styles.addrActions}>
                        <TouchableOpacity
                          style={[styles.editBtn, { backgroundColor: `${theme.colors.primary}15` }]}
                          onPress={() =>
                            router.push({
                              pathname: '/profile/address-picker',
                              params: {
                                id: addr.id,
                                label: addr.label,
                                address: addr.address,
                                lat: addr.latitude ? String(addr.latitude) : undefined,
                                lon: addr.longitude ? String(addr.longitude) : undefined,
                              },
                            } as any)
                          }
                        >
                          <Feather name="edit-2" size={16} color={theme.colors.primary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.deleteBtn, { backgroundColor: theme.colors.errorBg }]}
                          onPress={() => handleDeleteAddress(addr)}
                          disabled={!!isDeleting}
                        >
                          {isDeleting ? (
                            <ActivityIndicator size="small" color={theme.colors.error} />
                          ) : (
                            <Feather name="trash-2" size={16} color={theme.colors.error} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </AppCard>
                  )
                })
              )}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
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
  addTopBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  emptyRouteCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  routeVLine: { width: 2, height: 12, marginLeft: 3, marginVertical: 2 },
  addrCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  addrIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  addrActions: { flexDirection: 'row', gap: 8 },
  editBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
})
