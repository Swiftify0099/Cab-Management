import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../src/theme';
import { NotificationService } from '../../src/services/notificationService';
import { NotificationItem, NotificationCategory } from '../../src/types/notifications';
import { NotificationCard } from '../../src/components/notifications/NotificationCard';
import { NotificationDevSheet } from '../../src/components/notifications/NotificationDevSheet';

export default function NotificationCenterScreen() {
  const { theme, isDark } = useTheme();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory>('ALL');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showDevSheet, setShowDevSheet] = useState(false);

  const categories: { id: NotificationCategory; label: string }[] = [
    { id: 'ALL', label: 'All' },
    { id: 'TRIP', label: 'Trips' },
    { id: 'EARNINGS', label: 'Earnings' },
    { id: 'PAYOUT', label: 'Payouts' },
    { id: 'SAFETY', label: 'Safety' },
    { id: 'PROMOTIONS', label: 'Promos' },
    { id: 'ACCOUNT', label: 'Account' },
  ];

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await NotificationService.getNotifications(selectedCategory);
      setNotifications(res.notifications);
      setUnreadCount(res.unread_count);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleNotificationPress = async (item: NotificationItem) => {
    if (!item.is_read) {
      await NotificationService.markAsRead(item.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    // Actionable Deep Link Navigation
    if (item.deep_link) {
      try {
        router.push(item.deep_link as any);
      } catch (e) {
        console.warn('[NotificationCenter] Deep link navigation failed:', e);
      }
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    await NotificationService.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    Alert.alert('All Caught Up', 'All notifications have been marked as read.');
  };

  const handleDelete = async (id: string) => {
    await NotificationService.deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
              <Text style={styles.markAllText}>Read all</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => router.push('/notifications/settings' as any)}
          >
            <Feather name="settings" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Categories Horizontal Tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {categories.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[
                styles.tabChip,
                selectedCategory === c.id
                  ? styles.tabChipActive
                  : { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
              ]}
              onPress={() => setSelectedCategory(c.id)}
            >
              <Text
                style={[
                  styles.tabChipText,
                  selectedCategory === c.id
                    ? styles.tabChipTextActive
                    : { color: theme.colors.textSecondary },
                ]}
              >
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Notifications Feed */}
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadNotifications();
            }}
            tintColor="#6366F1"
          />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#6366F1" />
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Feather name="bell-off" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Notifications</Text>
            <Text style={[styles.emptySub, { color: theme.colors.textSecondary }]}>
              {selectedCategory === 'ALL'
                ? "You're all caught up! New ride alerts and earnings updates will appear here."
                : `No notifications in '${selectedCategory}' category.`}
            </Text>

            {__DEV__ && (
              <TouchableOpacity
                style={styles.devTriggerBtn}
                onPress={() => setShowDevSheet(true)}
              >
                <MaterialCommunityIcons name="robot-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.devTriggerText}>Open Sandbox Simulator</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          notifications.map((item) => (
            <NotificationCard
              key={item.id}
              notification={item}
              onPress={handleNotificationPress}
              onDelete={handleDelete}
            />
          ))
        )}
      </ScrollView>

      {/* Developer Mode Sandbox Simulator */}
      <NotificationDevSheet
        visible={showDevSheet}
        onClose={() => setShowDevSheet(false)}
        onSimulated={loadNotifications}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  unreadBadge: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  markAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  markAllText: { color: '#6366F1', fontSize: 11, fontWeight: '700' },
  settingsBtn: { padding: 6 },
  tabsWrapper: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  tabsScroll: { paddingHorizontal: 16, gap: 8 },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tabChipActive: { backgroundColor: '#6366F1' },
  tabChipText: { fontSize: 12, fontWeight: '700' },
  tabChipTextActive: { color: '#FFFFFF' },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  loadingWrap: { padding: 40, alignItems: 'center' },
  emptyWrap: { padding: 40, alignItems: 'center', marginTop: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 14 },
  emptySub: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  devTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 20,
  },
  devTriggerText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
