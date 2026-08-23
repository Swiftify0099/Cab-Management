/**
 * Customer App — Unified Activity & Scheduled Reservations Hub
 * Route: /(tabs)/trips
 * Features 23, 3, 4: One Unified Activity Hub across Rides, Parcels, Hotels, Transport, Rentals, Outstation, Airport.
 */
import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  StatusBar,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useFocusEffect } from 'expo-router'
import { Feather } from '@expo/vector-icons'

import { activityApi } from '../../src/api/client'
import { useCustomerSocket } from '../../src/hooks/useCustomerSocket'
import { useTheme } from '../../src/contexts/ThemeContext'
import { useTranslation } from '../../src/i18n'
import {
  AppText,
  AppBadge,
  AppCard,
  AppDivider,
} from '../../src/components/ui'

const SERVICE_CATEGORIES = [
  { id: 'ALL', label: 'All Services', icon: 'grid' },
  { id: 'RIDE', label: 'Rides', icon: 'car' },
  { id: 'PARCEL', label: 'Parcel', icon: 'package' },
  { id: 'HOTEL', label: 'Hotels', icon: 'home' },
  { id: 'TRANSPORT', label: 'Transport', icon: 'truck' },
  { id: 'RENTAL', label: 'Rentals', icon: 'clock' },
  { id: 'OUTSTATION', label: 'Outstation', icon: 'map-pin' },
  { id: 'AIRPORT', label: 'Airport', icon: 'navigation' },
]

const STATUS_TABS = ['Upcoming', 'Active', 'Completed', 'Cancelled']

export default function TripsTab() {
  const { theme, isDark } = useTheme()
  const { t } = useTranslation()

  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState('Upcoming')
  const [searchQuery, setSearchQuery] = useState('')

  // Socket integration for live updates
  const { onReconnectSyncTrips, reservationDriverAssigned, clearReservationDriverAssigned } = useCustomerSocket()

  const loadActivities = useCallback(async () => {
    try {
      const res = await activityApi.getActivity({
        category: selectedCategory === 'ALL' ? undefined : selectedCategory,
        status_filter: selectedStatus.toUpperCase(),
      })
      setActivities(res.data?.data || [])
    } catch {
      // Fallback
      setActivities([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedCategory, selectedStatus])

  useFocusEffect(
    useCallback(() => {
      loadActivities()
    }, [loadActivities])
  )

  useEffect(() => {
    onReconnectSyncTrips(() => {
      loadActivities()
    })
  }, [onReconnectSyncTrips, loadActivities])

  useEffect(() => {
    if (!reservationDriverAssigned) return
    loadActivities()
    clearReservationDriverAssigned()
  }, [reservationDriverAssigned, clearReservationDriverAssigned, loadActivities])

  const getStatusBadge = (statusGroup: string, statusLabel: string) => {
    if (statusGroup === 'active') return <AppBadge label={statusLabel} variant="success" size="sm" />
    if (statusGroup === 'upcoming') return <AppBadge label={statusLabel} variant="info" size="sm" />
    if (statusGroup === 'cancelled') return <AppBadge label={statusLabel} variant="error" size="sm" />
    return <AppBadge label={statusLabel} variant="default" size="sm" />
  }

  const filteredItems = activities.filter((it) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      it.title?.toLowerCase().includes(q) ||
      it.subtitle?.toLowerCase().includes(q) ||
      it.service_name?.toLowerCase().includes(q)
    )
  })

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <View style={{ flex: 1 }}>
          <AppText variant="title" bold style={{ fontSize: 22 }}>
            Activity & History
          </AppText>
          <AppText variant="caption" color="secondary">
            Unified bookings, orders, stays & rentals
          </AppText>
        </View>

        <TouchableOpacity
          style={[styles.headerActionBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
          onPress={() => router.push('/support' as any)}
        >
          <Feather name="help-circle" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Feather name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.textPrimary }]}
          placeholder="Search by destination, parcel, or hotel..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Feather name="x" size={16} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Service Category Pills */}
      <View style={{ maxHeight: 44, marginVertical: 6 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {SERVICE_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Feather
                  name={cat.icon as any}
                  size={14}
                  color={isSelected ? '#FFF' : theme.colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <AppText
                  variant="caption"
                  style={{
                    color: isSelected ? '#FFF' : theme.colors.textPrimary,
                  }}
                  bold={isSelected}
                >
                  {cat.label}
                </AppText>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* Status Segmented Tabs */}
      <View style={[styles.statusTabsWrapper, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
        {STATUS_TABS.map((tab) => {
          const isSelected = selectedStatus === tab
          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.statusTabBtn,
                { backgroundColor: isSelected ? theme.colors.surface : 'transparent' },
              ]}
              onPress={() => setSelectedStatus(tab)}
            >
              <AppText
                variant="caption"
                style={{
                  color: isSelected ? theme.colors.primary : theme.colors.textSecondary,
                }}
                bold={isSelected}
              >
                {tab}
              </AppText>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Main Content Area */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <AppText style={{ marginTop: 12 }} color="secondary">
            Loading your activities...
          </AppText>
        </View>
      ) : filteredItems.length === 0 ? (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadActivities(); }} />}
          contentContainerStyle={styles.centerContainer}
        >
          <Feather name="calendar" size={48} color={theme.colors.textSecondary} style={{ opacity: 0.5, marginBottom: 12 }} />
          <AppText variant="h3">
            No {selectedStatus.toLowerCase()} activities
          </AppText>
          <AppText variant="caption" color="secondary" style={{ textAlign: 'center', marginTop: 4, paddingHorizontal: 32 }}>
            When you book rides, parcels, stays, or rentals, your orders will appear here with live tracking & receipts.
          </AppText>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadActivities(); }} />}
        >
          {filteredItems.map((item) => (
            <AppCard
              key={`${item.reference_type}-${item.id}`}
              style={styles.activityCard}
              onPress={() => {
                if (item.deep_link) {
                  router.push(item.deep_link as any)
                } else {
                  router.push(`/activity/${item.id}?reference_type=${item.reference_type}&reference_id=${item.reference_id}` as any)
                }
              }}
            >
              {/* Top Row: Service Badge & Status */}
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.serviceIconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                    <Feather name={item.icon as any} size={16} color={theme.colors.primary} />
                  </View>
                  <AppText variant="caption" style={{ marginLeft: 8 }} bold>
                    {item.service_name}
                  </AppText>
                </View>
                {getStatusBadge(item.status_group, item.status_label)}
              </View>

              <View style={{ marginVertical: 8 }}>
                <AppDivider />
              </View>

              {/* Title & Route */}
              <AppText variant="body" bold style={{ fontSize: 15 }} numberOfLines={1}>
                {item.title}
              </AppText>
              <AppText variant="caption" color="secondary" style={{ marginTop: 2 }} numberOfLines={1}>
                {item.subtitle}
              </AppText>

              {/* Bottom Row: Amount & Action */}
              <View style={styles.cardFooter}>
                <View>
                  <AppText variant="caption" color="secondary">
                    Total Fare
                  </AppText>
                  <AppText variant="body" bold style={{ color: theme.colors.textPrimary }}>
                    {item.currency}{item.amount.toFixed(2)}
                  </AppText>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: theme.colors.border }]}
                    onPress={() => router.push(`/support/new-ticket?ref_type=${item.reference_type}&ref_id=${item.reference_id}` as any)}
                  >
                    <Feather name="help-circle" size={14} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
                    <AppText variant="caption" color="secondary" semibold>
                      Get Help
                    </AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primaryActionBtn, { backgroundColor: theme.colors.primary }]}
                    onPress={() => {
                      if (item.deep_link) {
                        router.push(item.deep_link as any)
                      }
                    }}
                  >
                    <AppText variant="caption" style={{ color: '#FFF' }} bold>
                      {item.status_group === 'active' ? 'Track Live' : 'View Details'}
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>
            </AppCard>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14 },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusTabsWrapper: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 4,
    padding: 4,
    borderRadius: 10,
  },
  statusTabBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  listContainer: { flex: 1 },
  activityCard: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  primaryActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
})
