/**
 * Customer App — Unified Notification Center
 * Route: /notifications
 * Feature 24: Real-time In-App & Push Notifications Hub with Category Filters & Deep-Linking.
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useFocusEffect } from 'expo-router'
import { Feather } from '@expo/vector-icons'

import { notificationApi } from '../../src/api/client'
import { useTheme } from '../../src/contexts/ThemeContext'
import {
  AppText,
} from '../../src/components/ui'

const CATEGORY_FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'BOOKING', label: 'Rides' },
  { id: 'PAYMENT', label: 'Payments' },
  { id: 'PROMOTION', label: 'Offers' },
  { id: 'SAFETY', label: 'Safety' },
  { id: 'SUPPORT', label: 'Support' },
]

export default function NotificationCenterScreen() {
  const { theme, isDark } = useTheme()

  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('ALL')

  const loadNotifications = useCallback(async () => {
    try {
      const res = await notificationApi.getNotifications({
        category: selectedCategory === 'ALL' ? undefined : selectedCategory,
      })
      if (res.data?.data) {
        setNotifications(res.data.data)
        setUnreadCount(res.data.unread_count || 0)
      }
    } catch {
      // Fallback
      setNotifications([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedCategory])

  useFocusEffect(
    useCallback(() => {
      loadNotifications()
    }, [loadNotifications])
  )

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch {
      Alert.alert('Error', 'Failed to mark notifications as read.')
    }
  }

  const handleNotificationPress = async (notif: any) => {
    // Mark as read locally and on server
    if (!notif.is_read) {
      try {
        await notificationApi.markAsRead(notif.id)
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        )
        setUnreadCount((c) => Math.max(0, c - 1))
      } catch {
        // Ignored
      }
    }

    // Follow deep-link if provided
    if (notif.deep_link) {
      router.push(notif.deep_link as any)
    }
  }

  const handleDeleteNotification = async (id: string) => {
    try {
      await notificationApi.deleteNotification(id)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    } catch {
      // Ignored
    }
  }

  const getCategoryIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'BOOKING':
      case 'RIDE':
        return { name: 'car', color: '#0284C7' }
      case 'PAYMENT':
        return { name: 'credit-card', color: '#16A34A' }
      case 'PROMOTION':
        return { name: 'gift', color: '#D97706' }
      case 'SAFETY':
      case 'SOS':
        return { name: 'shield', color: '#DC2626' }
      case 'SUPPORT':
        return { name: 'help-circle', color: '#7C3AED' }
      default:
        return { name: 'bell', color: '#64748B' }
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AppText variant="title" bold style={{ fontSize: 20 }}>
              Notifications
            </AppText>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <AppText style={{ color: '#FFF', fontSize: 11 }} bold>
                  {unreadCount}
                </AppText>
              </View>
            )}
          </View>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
            <AppText variant="caption" style={{ color: theme.colors.primary }} bold>
              Mark all read
            </AppText>
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter Pills */}
      <View style={{ maxHeight: 44, marginVertical: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {CATEGORY_FILTERS.map((cat) => {
            const isSelected = selectedCategory === cat.id
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => setSelectedCategory(cat.id)}
              >
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

      {/* Notifications List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <AppText style={{ marginTop: 12 }} color="secondary">
            Loading notifications...
          </AppText>
        </View>
      ) : notifications.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.centerContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadNotifications(); }} />}
        >
          <Feather name="bell-off" size={48} color={theme.colors.textSecondary} style={{ opacity: 0.5, marginBottom: 12 }} />
          <AppText variant="h3">
            No notifications yet
          </AppText>
          <AppText variant="caption" color="secondary" style={{ textAlign: 'center', marginTop: 4, paddingHorizontal: 32 }}>
            You'll receive real-time updates about your rides, payments, driver arrivals, and promotions here.
          </AppText>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadNotifications(); }} />}
        >
          {notifications.map((notif) => {
            const icon = getCategoryIcon(notif.notification_type)
            return (
              <TouchableOpacity
                key={notif.id}
                style={[
                  styles.notificationCard,
                  {
                    backgroundColor: notif.is_read ? theme.colors.surface : isDark ? '#1E293B' : '#F0F9FF',
                    borderColor: notif.is_read ? theme.colors.border : theme.colors.primary + '40',
                  },
                ]}
                onPress={() => handleNotificationPress(notif)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconBox, { backgroundColor: icon.color + '20' }]}>
                  <Feather name={icon.name as any} size={18} color={icon.color} />
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <AppText variant="body" bold={!notif.is_read} semibold={notif.is_read} style={{ fontSize: 14 }}>
                      {notif.title}
                    </AppText>
                    {!notif.is_read && <View style={styles.unreadDot} />}
                  </View>

                  <AppText variant="caption" color="secondary" style={{ marginTop: 3, lineHeight: 18 }}>
                    {notif.body}
                  </AppText>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <AppText variant="caption" style={{ color: '#94A3B8', fontSize: 11 }}>
                      {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </AppText>

                    <TouchableOpacity onPress={() => handleDeleteNotification(notif.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Feather name="trash-2" size={14} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            )
          })}
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
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { marginRight: 14, padding: 4 },
  unreadBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 8,
  },
  markAllBtn: { paddingVertical: 4 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  scrollArea: { flex: 1 },
  notificationCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0284C7',
  },
})
