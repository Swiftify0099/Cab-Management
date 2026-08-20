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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../src/theme';
import { SupportService } from '../../src/services/supportService';
import { SupportTicketSummary } from '../../src/types/support';

export default function TicketHistoryScreen() {
  const { theme, isDark } = useTheme();
  const [tickets, setTickets] = useState<SupportTicketSummary[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const statusTabs = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await SupportService.getDriverTickets(selectedStatus);
      setTickets(res);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const getStatusBadge = (status: string) => {
    const st = status.toUpperCase();
    if (st === 'OPEN') return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' };
    if (st === 'IN_PROGRESS' || st === 'WAITING_FOR_DRIVER') return { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' };
    if (st === 'RESOLVED') return { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' };
    return { bg: '#F1F5F9', text: '#64748B', border: '#E2E8F0' };
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>My Support Tickets</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => router.push('/support/new-ticket' as any)}
        >
          <Feather name="plus" size={20} color="#6366F1" />
        </TouchableOpacity>
      </View>

      {/* Status Filter Tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {statusTabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabBtn,
                selectedStatus === tab
                  ? styles.tabBtnActive
                  : { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
              ]}
              onPress={() => setSelectedStatus(tab)}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  selectedStatus === tab ? styles.tabBtnTextActive : { color: theme.colors.textSecondary },
                ]}
              >
                {tab.replace(/_/g, ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadTickets();
            }}
            tintColor="#6366F1"
          />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#6366F1" />
          </View>
        ) : tickets.length === 0 ? (
          <View style={styles.emptyWrap}>
            <MaterialCommunityIcons name="ticket-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Support Tickets Found</Text>
            <Text style={[styles.emptySub, { color: theme.colors.textSecondary }]}>
              {selectedStatus === 'ALL'
                ? "You haven't raised any support tickets yet."
                : `No tickets with status '${selectedStatus}'.`}
            </Text>
            <TouchableOpacity
              style={styles.raiseFirstBtn}
              onPress={() => router.push('/support/new-ticket' as any)}
            >
              <Feather name="plus-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.raiseFirstBtnText}>Raise a Ticket</Text>
            </TouchableOpacity>
          </View>
        ) : (
          tickets.map((t) => {
            const badge = getStatusBadge(t.status);
            return (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.ticketCard,
                  {
                    backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
                    borderColor: isDark ? '#1E293B' : '#E2E8F0',
                  },
                ]}
                onPress={() =>
                  router.push({
                    pathname: '/support/chat' as any,
                    params: { ticket_id: t.id },
                  })
                }
                activeOpacity={0.7}
              >
                <View style={styles.ticketCardTop}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[styles.statusPill, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                      <Text style={[styles.statusPillText, { color: badge.text }]}>{t.status}</Text>
                    </View>
                    <Text style={[styles.catLabel, { color: theme.colors.textSecondary }]}>
                      {t.category} • #{t.id.slice(0, 8)}
                    </Text>
                  </View>

                  {t.unread_driver_count > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{t.unread_driver_count} NEW</Text>
                    </View>
                  )}
                </View>

                <Text style={[styles.ticketSubject, { color: theme.colors.text }]} numberOfLines={2}>
                  {t.subject}
                </Text>

                <View style={styles.ticketCardBottom}>
                  <Text style={[styles.ticketDate, { color: theme.colors.textSecondary }]}>
                    Updated {new Date(t.last_message_at || t.created_at).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.chatLinkText, { color: '#6366F1' }]}>Open Thread</Text>
                    <Feather name="chevron-right" size={14} color="#6366F1" style={{ marginLeft: 2 }} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
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
  headerTitle: { fontSize: 17, fontWeight: '800' },
  newBtn: {
    padding: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 8,
  },
  tabsWrapper: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(150, 150, 150, 0.1)' },
  tabsScroll: { paddingHorizontal: 16, gap: 8 },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tabBtnActive: { backgroundColor: '#6366F1' },
  tabBtnText: { fontSize: 12, fontWeight: '700' },
  tabBtnTextActive: { color: '#FFFFFF' },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  loadingWrap: { padding: 40, alignItems: 'center' },
  emptyWrap: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 14 },
  emptySub: { fontSize: 13, textAlign: 'center', marginTop: 6, marginBottom: 20 },
  raiseFirstBtn: {
    backgroundColor: '#6366F1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  raiseFirstBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  ticketCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  ticketCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  catLabel: { fontSize: 11, fontWeight: '600' },
  unreadBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unreadBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  ticketSubject: { fontSize: 14, fontWeight: '700', marginBottom: 10, lineHeight: 18 },
  ticketCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
  },
  ticketDate: { fontSize: 11 },
  chatLinkText: { fontSize: 12, fontWeight: '700' },
});
