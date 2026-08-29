/**
 * Partner Notification Center & Alerts Hub
 * ─────────────────────────────────────────────────────────────────────────────
 * Real-time push notification log, account alerts, safety warnings & earnings updates.
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useTheme } from '../src/theme'
import { api } from '../src/api/client'

export interface NotificationItem {
  id: string
  category: 'TRIP' | 'EARNINGS' | 'KYC' | 'SAFETY' | 'SYSTEM'
  title: string
  message: string
  is_read: boolean
  action_route?: string
  created_at: string
}

export default function NotificationCenterScreen() {
  const { theme, isDark } = useTheme()
  const [activeTab, setActiveTab] = useState<'all' | 'trips' | 'account' | 'safety'>('all')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/driver/notifications')
      const list = res.data?.data || res.data
      setNotifications(Array.isArray(list) ? list : [])
    } catch (err: any) {
      console.warn('[NotificationCenter] loadNotifications error:', err.message)
      setNotifications([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  const onRefresh = () => {
    setRefreshing(true)
    loadNotifications()
  }

  const handleMarkAllRead = async () => {
    try {
      await api.post('/driver/notifications/mark-read', { all: true })
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch {}
  }

  const filteredList = notifications.filter(item => {
    if (activeTab === 'trips') return item.category === 'TRIP' || item.category === 'EARNINGS'
    if (activeTab === 'account') return item.category === 'KYC' || item.category === 'SYSTEM'
    if (activeTab === 'safety') return item.category === 'SAFETY'
    return true
  })

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
          <Text style={[styles.headerTitle, { color: textPrimary }]}>Notification Center</Text>
          <Text style={[styles.headerSubtitle, { color: textSecondary }]}>
            Trip Alerts, Payout Updates & Security Notices
          </Text>
        </View>
        <TouchableOpacity style={styles.markReadBtn} onPress={handleMarkAllRead}>
          <Feather name="check-circle" size={18} color="#0284C7" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsRow, { backgroundColor: isDark ? '#1E293B' : '#EDF2F7' }]}>
        {(['all', 'trips', 'account', 'safety'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabBtn,
              activeTab === tab && [styles.activeTabBtn, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }],
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === tab ? '#0284C7' : textSecondary },
              ]}
            >
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading && !refreshing ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#0284C7" />
          </View>
        ) : filteredList.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
            <MaterialCommunityIcons name="bell-outline" size={48} color={textSecondary} />
            <Text style={[styles.emptyTitle, { color: textPrimary }]}>No Notifications</Text>
            <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
              You are all caught up! New trip alerts, system updates, and payout confirmations will appear here.
            </Text>
          </View>
        ) : (
          filteredList.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.notifCard,
                { backgroundColor: bgCard, borderColor: borderCol },
                !item.is_read && { borderColor: '#0284C7', borderWidth: 1.5 },
              ]}
              onPress={() => {
                if (item.action_route) {
                  router.push(item.action_route as any)
                }
              }}
            >
              <View style={styles.notifHeader}>
                <Text style={[styles.notifTitle, { color: textPrimary }]}>{item.title}</Text>
                {!item.is_read && <View style={styles.unreadDot} />}
              </View>
              <Text style={[styles.notifMsg, { color: textSecondary }]}>{item.message}</Text>
              <Text style={[styles.notifTime, { color: textSecondary }]}>{item.created_at}</Text>
            </TouchableOpacity>
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
  markReadBtn: { padding: 8 },
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 10,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeTabBtn: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBtnText: { fontSize: 11, fontWeight: '800' },
  scroll: { flex: 1 },
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 14 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  notifCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifTitle: { fontSize: 14, fontWeight: '700' },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0284C7',
  },
  notifMsg: { fontSize: 12, marginTop: 4, lineHeight: 16 },
  notifTime: { fontSize: 10, marginTop: 8 },
})
