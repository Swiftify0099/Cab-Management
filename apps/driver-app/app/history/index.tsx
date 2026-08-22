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
import { TripHistoryService } from '../../src/services/tripHistoryService';
import {
  TripHistoryItem,
  TripKPIPeriodSummary,
  TripStatusFilter,
  TripDateFilter,
} from '../../src/types/tripHistory';
import { TripHistoryCard } from '../../src/components/history/TripHistoryCard';
import { HistoryDevSheet } from '../../src/components/history/HistoryDevSheet';

export default function TripHistoryScreen() {
  const { theme, isDark } = useTheme();
  const [statusFilter, setStatusFilter] = useState<TripStatusFilter>('ALL');
  const [dateFilter, setDateFilter] = useState<TripDateFilter>('ALL_TIME');
  const [trips, setTrips] = useState<TripHistoryItem[]>([]);
  const [kpiSummary, setKpiSummary] = useState<TripKPIPeriodSummary>({
    period: 'ALL_TIME',
    total_completed_trips: 0,
    total_net_earnings: 0,
    total_distance_km: 0,
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showDevSheet, setShowDevSheet] = useState(false);

  const statusTabs: { id: TripStatusFilter; label: string }[] = [
    { id: 'ALL', label: 'All Trips' },
    { id: 'COMPLETED', label: 'Completed' },
    { id: 'CANCELLED', label: 'Cancelled' },
  ];

  const datePeriods: { id: TripDateFilter; label: string }[] = [
    { id: 'ALL_TIME', label: 'All Time' },
    { id: 'TODAY', label: 'Today' },
    { id: 'THIS_WEEK', label: 'This Week' },
    { id: 'THIS_MONTH', label: 'This Month' },
  ];

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await TripHistoryService.getTripHistory(statusFilter, dateFilter);
      setTrips(res.trips);
      setKpiSummary(res.kpi_summary);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, dateFilter]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Trip History</Text>

        <TouchableOpacity style={styles.sandboxBtn} onPress={() => setShowDevSheet(true)}>
          <MaterialCommunityIcons name="robot-outline" size={20} color="#10B981" />
        </TouchableOpacity>
      </View>

      {/* Status Filter Tabs */}
      <View
        style={[
          styles.statusTabContainer,
          {
            backgroundColor: isDark ? '#131B2E' : '#F1F5F9',
            borderColor: isDark ? '#1E293B' : '#E2E8F0',
          },
        ]}
      >
        {statusTabs.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.statusTabBtn, statusFilter === t.id && styles.statusTabBtnActive]}
            onPress={() => setStatusFilter(t.id)}
          >
            <Text
              style={[
                styles.statusTabText,
                statusFilter === t.id
                  ? styles.statusTabTextActive
                  : { color: theme.colors.textSecondary },
              ]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Date Filter Pills */}
      <View style={styles.periodPillContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.periodScroll}
        >
          {datePeriods.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.periodChip,
                dateFilter === p.id
                  ? styles.periodChipActive
                  : { backgroundColor: isDark ? '#131B2E' : '#FFFFFF' },
              ]}
              onPress={() => setDateFilter(p.id)}
            >
              <Text
                style={[
                  styles.periodChipText,
                  dateFilter === p.id
                    ? styles.periodChipTextActive
                    : { color: theme.colors.textSecondary },
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* KPI Summary Card */}
      <View
        style={[
          styles.kpiCard,
          {
            backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
            borderColor: isDark ? '#1E293B' : '#E2E8F0',
          },
        ]}
      >
        <View style={styles.kpiItem}>
          <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Net Earnings</Text>
          <Text style={[styles.kpiValue, { color: '#10B981' }]}>
            ₹{Math.round(kpiSummary.total_net_earnings)}
          </Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiItem}>
          <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Completed</Text>
          <Text style={[styles.kpiValue, { color: theme.colors.text }]}>
            {kpiSummary.total_completed_trips} trips
          </Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiItem}>
          <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Distance</Text>
          <Text style={[styles.kpiValue, { color: theme.colors.text }]}>
            {kpiSummary.total_distance_km} km
          </Text>
        </View>
      </View>

      {/* Trips History Feed */}
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadHistory();
            }}
            tintColor="#10B981"
          />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#10B981" />
          </View>
        ) : trips.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Feather name="navigation" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Trips Found</Text>
            <Text style={[styles.emptySub, { color: theme.colors.textSecondary }]}>
              {statusFilter === 'ALL'
                ? 'Your completed and cancelled ride history will appear here.'
                : `No ${statusFilter.toLowerCase()} trips for the selected time filter.`}
            </Text>

            {__DEV__ && (
              <TouchableOpacity
                style={styles.seedBtn}
                onPress={() => setShowDevSheet(true)}
              >
                <MaterialCommunityIcons name="plus-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.seedBtnText}>Seed Sample Completed Trip</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          trips.map((item) => <TripHistoryCard key={item.id} trip={item} />)
        )}
      </ScrollView>

      {/* Developer Mode Sandbox Simulator */}
      <HistoryDevSheet
        visible={showDevSheet}
        onClose={() => setShowDevSheet(false)}
        onSimulated={loadHistory}
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
  headerTitle: { fontSize: 17, fontWeight: '800' },
  sandboxBtn: { padding: 6 },
  statusTabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusTabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
  },
  statusTabBtnActive: { backgroundColor: '#10B981' },
  statusTabText: { fontSize: 12, fontWeight: '700' },
  statusTabTextActive: { color: '#FFFFFF' },
  periodPillContainer: { paddingVertical: 8 },
  periodScroll: { paddingHorizontal: 16, gap: 8 },
  periodChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.2)',
  },
  periodChipActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  periodChipText: { fontSize: 11, fontWeight: '700' },
  periodChipTextActive: { color: '#FFFFFF' },
  kpiCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  kpiItem: { alignItems: 'center' },
  kpiLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  kpiValue: { fontSize: 15, fontWeight: '900' },
  kpiDivider: { width: 1, height: 26, backgroundColor: 'rgba(150, 150, 150, 0.2)' },
  container: { flex: 1, paddingHorizontal: 16 },
  loadingWrap: { padding: 40, alignItems: 'center' },
  emptyWrap: { padding: 40, alignItems: 'center', marginTop: 30 },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 14 },
  emptySub: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  seedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 20,
  },
  seedBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
