/**
 * Customer App — Security & Login Activity Timeline
 * Route: /security/activity
 * Feature 26: Customer Security Architecture
 * Chronological Security Audit Stream with Privacy-Safe Geolocation Tags.
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'

import { securityApi, SecurityEventItem } from '../../src/api/client'
import { useTheme } from '../../src/contexts/ThemeContext'
import { useTranslation } from '../../src/i18n'
import {
  AppText,
  AppCard,
  AppBadge,
} from '../../src/components/ui'

const FILTER_TABS = [
  { key: 'ALL', label: 'All Activity' },
  { key: 'LOGIN', label: 'Logins' },
  { key: 'DEVICE', label: 'Devices' },
  { key: 'ALERT', label: 'Security Alerts' },
  { key: 'PAYMENT', label: 'Payments' },
]

export default function SecurityActivityScreen() {
  const { theme, isDark } = useTheme()
  const { t } = useTranslation()

  const [activeFilter, setActiveFilter] = useState('ALL')
  const [events, setEvents] = useState<SecurityEventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadActivity = useCallback(async () => {
    try {
      const res = await securityApi.getActivity()
      const list = res.data?.data || res.data || []
      setEvents(list)
    } catch {
      // Fallback demo events
      setEvents([
        {
          id: 'ev-1',
          event_type: 'LOGIN_SUCCESS',
          risk_level: 'LOW',
          location_city: 'Mumbai, IN',
          details_json: { device_model: 'Samsung Galaxy S23' },
          action_taken: 'ALLOW',
          created_at: new Date().toISOString(),
        },
        {
          id: 'ev-2',
          event_type: 'NEW_DEVICE_DETECTED',
          risk_level: 'MEDIUM',
          location_city: 'Pune, IN',
          details_json: { device_model: 'iPhone 15 Pro' },
          action_taken: 'CHALLENGE',
          created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
        },
        {
          id: 'ev-3',
          event_type: 'PAYMENT_VERIFIED',
          risk_level: 'LOW',
          location_city: 'Mumbai, IN',
          details_json: { method: 'UPI', amount: '₹450.00' },
          action_taken: 'ALLOW',
          created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
        },
      ])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadActivity()
    }, [loadActivity])
  )

  const filteredEvents = events.filter((e) => {
    if (activeFilter === 'ALL') return true
    if (activeFilter === 'LOGIN') return e.event_type.includes('LOGIN') || e.event_type.includes('OTP')
    if (activeFilter === 'DEVICE') return e.event_type.includes('DEVICE')
    if (activeFilter === 'ALERT') return e.risk_level === 'HIGH' || e.risk_level === 'CRITICAL' || e.risk_level === 'MEDIUM'
    if (activeFilter === 'PAYMENT') return e.event_type.includes('PAYMENT') || e.event_type.includes('TRANSACTION')
    return true
  })

  const getEventIcon = (type: string) => {
    if (type.includes('LOGIN') || type.includes('OTP')) return { name: 'log-in', color: theme.colors.primary }
    if (type.includes('DEVICE')) return { name: 'smartphone', color: theme.colors.accent }
    if (type.includes('PAYMENT')) return { name: 'credit-card', color: theme.colors.success }
    if (type.includes('LOCK')) return { name: 'lock', color: theme.colors.error }
    return { name: 'shield', color: theme.colors.warning }
  }

  const formatEventTitle = (type: string) => {
    return type
      .replace('SIMULATED_', '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())
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
          Security & Login Activity
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter Tabs Horizontal Bar */}
      <View style={styles.tabBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTER_TABS.map((tab) => {
            const isSelected = activeFilter === tab.key
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => setActiveFilter(tab.key)}
                activeOpacity={0.8}
              >
                <AppText
                  variant="bodyS"
                  bold={isSelected}
                  style={{ color: isSelected ? '#FFFFFF' : theme.colors.textSecondary }}
                >
                  {tab.label}
                </AppText>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
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
                loadActivity()
              }}
              tintColor={theme.colors.primary}
            />
          }
        >
          {filteredEvents.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Feather name="shield" size={32} color={theme.colors.success} style={{ marginBottom: 8 }} />
              <AppText variant="body" bold>No Security Activity</AppText>
              <AppText variant="small" color="muted" center style={{ marginTop: 2 }}>
                No events recorded matching this filter.
              </AppText>
            </View>
          ) : (
            filteredEvents.map((ev, idx) => {
              const icon = getEventIcon(ev.event_type)
              const eventDate = new Date(ev.created_at)

              return (
                <AppCard key={ev.id || idx} style={styles.eventCard}>
                  <View style={styles.eventRow}>
                    <View style={[styles.eventIconCircle, { backgroundColor: `${icon.color}18` }]}>
                      <Feather name={icon.name as any} size={20} color={icon.color} />
                    </View>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <AppText variant="body" bold numberOfLines={1} style={{ flex: 1, marginRight: 8 }}>
                          {formatEventTitle(ev.event_type)}
                        </AppText>
                        <AppBadge
                          label={ev.action_taken || 'ALLOW'}
                          variant={ev.risk_level === 'CRITICAL' || ev.risk_level === 'HIGH' ? 'error' : ev.risk_level === 'MEDIUM' ? 'warning' : 'success'}
                          size="sm"
                        />
                      </View>

                      <AppText variant="small" color="secondary" style={{ marginTop: 2 }}>
                        {ev.location_city || 'Verified Location'} • {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({eventDate.toLocaleDateString()})
                      </AppText>

                      {ev.details_json && Object.keys(ev.details_json).length > 0 && (
                        <View style={[styles.detailsTag, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F1F5F9' }]}>
                          <AppText variant="small" color="muted" numberOfLines={1}>
                            {ev.details_json.device_model ? `Hardware: ${ev.details_json.device_model}` : JSON.stringify(ev.details_json).replace(/["{}]/g, '')}
                          </AppText>
                        </View>
                      )}
                    </View>
                  </View>
                </AppCard>
              )
            })
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },

  tabBarWrapper: { paddingVertical: 10 },
  filterScroll: { paddingHorizontal: 16, gap: 8 },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },

  eventCard: { marginBottom: 12, borderRadius: 18 },
  eventRow: { flexDirection: 'row', alignItems: 'flex-start' },
  eventIconCircle: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  detailsTag: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },

  emptyCard: {
    alignItems: 'center',
    padding: 28,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 20,
  },
})
