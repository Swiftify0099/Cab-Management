import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme';
import { TripHistoryService } from '../../src/services/tripHistoryService';
import { DetailedTripReceipt } from '../../src/types/tripHistory';

export default function TripReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, isDark } = useTheme();
  const [receipt, setReceipt] = useState<DetailedTripReceipt | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await TripHistoryService.getTripReceiptDetails(id);
      setReceipt(data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const handleExport = async () => {
    if (!id) return;
    const statement = await TripHistoryService.exportTripReceipt(id);
    if (statement) {
      Share.share({ message: statement, title: `Trip Receipt ${id.slice(0, 8)}` });
    } else {
      Alert.alert('Export Error', 'Unable to generate receipt statement.');
    }
  };

  const handleDispute = () => {
    if (receipt?.support_dispute_link) {
      router.push(receipt.support_dispute_link as any);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      </SafeAreaView>
    );
  }

  if (!receipt) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Trip Receipt</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerLoading}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Receipt record not found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const fin = receipt.financial_breakdown;
  const route = receipt.route_timeline;
  const isCompleted = receipt.status === 'COMPLETED';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Trip Receipt</Text>

        <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
          <Feather name="share-2" size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* Net Earning Banner */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
              borderColor: isDark ? '#1E293B' : '#E2E8F0',
            },
          ]}
        >
          <View style={styles.heroTop}>
            <View style={styles.receiptTag}>
              <Text style={styles.receiptTagText}>{fin.receipt_number}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isCompleted
                    ? 'rgba(16, 185, 129, 0.15)'
                    : 'rgba(239, 68, 68, 0.15)',
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: isCompleted ? '#10B981' : '#EF4444' },
                ]}
              >
                {receipt.status}
              </Text>
            </View>
          </View>

          <Text style={[styles.netLabel, { color: theme.colors.textSecondary }]}>
            DRIVER NET EARNING
          </Text>
          <Text style={styles.netAmount}>₹{fin.driver_net_earning.toFixed(2)}</Text>

          <View style={styles.heroMetaRow}>
            <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
              Payment: {fin.payment_method.toUpperCase()} ({fin.payment_status.toUpperCase()})
            </Text>
            {fin.tip_amount > 0 && (
              <View style={styles.tipBadge}>
                <Text style={styles.tipBadgeText}>+₹{fin.tip_amount.toFixed(0)} Tip Included</Text>
              </View>
            )}
          </View>
        </View>

        {/* Route Waypoint Timeline */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Route & Duration</Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
                borderColor: isDark ? '#1E293B' : '#E2E8F0',
              },
            ]}
          >
            {/* Pickup */}
            <View style={styles.timelineRow}>
              <View style={styles.greenDot} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.addressText, { color: theme.colors.text }]}>
                  {route.pickup_address}
                </Text>
                <Text style={[styles.timestampText, { color: theme.colors.textSecondary }]}>
                  {route.pickup_time ? new Date(route.pickup_time).toLocaleTimeString('en-IN') : 'N/A'}
                </Text>
              </View>
            </View>

            {/* Intermediate Stops */}
            {route.intermediate_stops.map((s, idx) => (
              <View key={idx} style={styles.timelineRow}>
                <View style={styles.stopDot} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.addressText, { color: theme.colors.text }]}>{s.address}</Text>
                  <Text style={[styles.timestampText, { color: theme.colors.textSecondary }]}>
                    Intermediate Stop #{s.sequence}
                  </Text>
                </View>
              </View>
            ))}

            {/* Dropoff */}
            <View style={styles.timelineRow}>
              <View style={styles.redSquare} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.addressText, { color: theme.colors.text }]}>
                  {route.destination_address}
                </Text>
                <Text style={[styles.timestampText, { color: theme.colors.textSecondary }]}>
                  {route.dropoff_time ? new Date(route.dropoff_time).toLocaleTimeString('en-IN') : 'N/A'}
                </Text>
              </View>
            </View>

            <View style={styles.distanceBar}>
              <Text style={[styles.distanceText, { color: theme.colors.textSecondary }]}>
                Total Distance: {route.total_distance_km.toFixed(1)} km
              </Text>
            </View>
          </View>
        </View>

        {/* Itemized Financial Breakdown */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Itemized Fare Breakdown</Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
                borderColor: isDark ? '#1E293B' : '#E2E8F0',
              },
            ]}
          >
            <View style={styles.fareRow}>
              <Text style={[styles.fareLabel, { color: theme.colors.textSecondary }]}>Base Fare</Text>
              <Text style={[styles.fareVal, { color: theme.colors.text }]}>₹{fin.base_fare.toFixed(2)}</Text>
            </View>
            <View style={styles.fareRow}>
              <Text style={[styles.fareLabel, { color: theme.colors.textSecondary }]}>
                Distance Charge ({fin.distance_km} km)
              </Text>
              <Text style={[styles.fareVal, { color: theme.colors.text }]}>₹{fin.distance_charge.toFixed(2)}</Text>
            </View>
            <View style={styles.fareRow}>
              <Text style={[styles.fareLabel, { color: theme.colors.textSecondary }]}>
                Time Charge ({fin.duration_min} min)
              </Text>
              <Text style={[styles.fareVal, { color: theme.colors.text }]}>₹{fin.time_charge.toFixed(2)}</Text>
            </View>
            {fin.waiting_charge > 0 && (
              <View style={styles.fareRow}>
                <Text style={[styles.fareLabel, { color: theme.colors.textSecondary }]}>Waiting Charges</Text>
                <Text style={[styles.fareVal, { color: theme.colors.text }]}>₹{fin.waiting_charge.toFixed(2)}</Text>
              </View>
            )}
            {fin.tolls_charge > 0 && (
              <View style={styles.fareRow}>
                <Text style={[styles.fareLabel, { color: theme.colors.textSecondary }]}>Tolls / FASTag</Text>
                <Text style={[styles.fareVal, { color: theme.colors.text }]}>₹{fin.tolls_charge.toFixed(2)}</Text>
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.fareRow}>
              <Text style={[styles.fareBold, { color: theme.colors.text }]}>Customer Total Fare</Text>
              <Text style={[styles.fareBold, { color: theme.colors.text }]}>₹{fin.customer_final_fare.toFixed(2)}</Text>
            </View>
            <View style={styles.fareRow}>
              <Text style={[styles.deductLabel, { color: '#EF4444' }]}>(-) Platform Commission (20%)</Text>
              <Text style={[styles.deductVal, { color: '#EF4444' }]}>-₹{fin.platform_commission.toFixed(2)}</Text>
            </View>
            {fin.tip_amount > 0 && (
              <View style={styles.fareRow}>
                <Text style={[styles.tipLabel, { color: '#10B981' }]}>(+) Passenger Tip (100% Driver)</Text>
                <Text style={[styles.tipVal, { color: '#10B981' }]}>+₹{fin.tip_amount.toFixed(2)}</Text>
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.fareRow}>
              <Text style={[styles.finalLabel, { color: '#10B981' }]}>Net Driver Earnings</Text>
              <Text style={[styles.finalVal, { color: '#10B981' }]}>₹{fin.driver_net_earning.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Passenger Feedback (if any) */}
        {receipt.passenger_feedback && (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>Passenger Review</Text>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
                  borderColor: isDark ? '#1E293B' : '#E2E8F0',
                },
              ]}
            >
              <View style={styles.ratingRow}>
                <View style={styles.starsWrap}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Feather
                      key={s}
                      name="star"
                      size={16}
                      color={s <= receipt.passenger_feedback!.rating ? '#F59E0B' : '#CBD5E1'}
                    />
                  ))}
                </View>
                <Text style={[styles.ratingScore, { color: theme.colors.text }]}>
                  {receipt.passenger_feedback.rating}.0 Rating
                </Text>
              </View>

              {receipt.passenger_feedback.compliments.length > 0 && (
                <View style={styles.complimentsWrap}>
                  {receipt.passenger_feedback.compliments.map((c, i) => (
                    <View key={i} style={styles.complimentPill}>
                      <Text style={styles.complimentText}>✨ {c}</Text>
                    </View>
                  ))}
                </View>
              )}

              {receipt.passenger_feedback.feedback && (
                <Text style={[styles.feedbackQuote, { color: theme.colors.textSecondary }]}>
                  "{receipt.passenger_feedback.feedback}"
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Dispute & Support Trigger */}
        <TouchableOpacity style={styles.disputeBtn} onPress={handleDispute}>
          <Feather name="help-circle" size={16} color="#6366F1" style={{ marginRight: 6 }} />
          <Text style={styles.disputeText}>Report an Issue on this Trip</Text>
        </TouchableOpacity>
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
  exportBtn: { padding: 6 },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 14 },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  receiptTag: {
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  receiptTagText: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '800' },
  netLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginTop: 4 },
  netAmount: { fontSize: 32, fontWeight: '900', color: '#10B981', marginVertical: 4 },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  metaText: { fontSize: 11, fontWeight: '600' },
  tipBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tipBadgeText: { color: '#10B981', fontSize: 10, fontWeight: '800' },
  sectionWrap: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  greenDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', marginTop: 4 },
  stopDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#0EA5E9', marginTop: 4 },
  redSquare: { width: 10, height: 10, borderRadius: 2, backgroundColor: '#EF4444', marginTop: 4 },
  addressText: { fontSize: 13, fontWeight: '600' },
  timestampText: { fontSize: 11, marginTop: 2 },
  distanceBar: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.15)',
    paddingTop: 10,
    marginTop: 4,
  },
  distanceText: { fontSize: 12, fontWeight: '700' },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  fareLabel: { fontSize: 12 },
  fareVal: { fontSize: 12, fontWeight: '700' },
  divider: { height: 1, backgroundColor: 'rgba(150, 150, 150, 0.15)', marginVertical: 8 },
  fareBold: { fontSize: 13, fontWeight: '800' },
  deductLabel: { fontSize: 12, fontWeight: '600' },
  deductVal: { fontSize: 12, fontWeight: '800' },
  tipLabel: { fontSize: 12, fontWeight: '600' },
  tipVal: { fontSize: 12, fontWeight: '800' },
  finalLabel: { fontSize: 14, fontWeight: '900' },
  finalVal: { fontSize: 16, fontWeight: '900' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  starsWrap: { flexDirection: 'row', gap: 2 },
  ratingScore: { fontSize: 13, fontWeight: '800' },
  complimentsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  complimentPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  complimentText: { color: '#F59E0B', fontSize: 11, fontWeight: '700' },
  feedbackQuote: { fontSize: 12, fontStyle: 'italic', lineHeight: 16 },
  disputeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    marginBottom: 20,
  },
  disputeText: { color: '#6366F1', fontSize: 13, fontWeight: '800' },
});
