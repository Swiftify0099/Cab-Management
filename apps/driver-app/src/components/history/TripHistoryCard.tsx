import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../theme';
import { TripHistoryItem } from '../../types/tripHistory';

interface TripHistoryCardProps {
  trip: TripHistoryItem;
}

export const TripHistoryCard: React.FC<TripHistoryCardProps> = ({ trip }) => {
  const { theme, isDark } = useTheme();

  const formatTripDate = (isoString: string) => {
    if (!isoString) return { date: '', time: '' };
    const d = new Date(isoString);
    const date = d.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const time = d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return { date, time };
  };

  const { date, time } = formatTripDate(trip.created_at);
  const isCompleted = trip.is_completed || trip.status === 'COMPLETED';
  const isCancelled = trip.is_cancelled || trip.status === 'CANCELLED';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
          borderColor: isDark ? '#1E293B' : '#E2E8F0',
        },
      ]}
      onPress={() => router.push(`/history/${trip.id}` as any)}
      activeOpacity={0.7}
    >
      {/* Header: Date/Time + Status Badge + Net Earning */}
      <View style={styles.topRow}>
        <View style={styles.dateCol}>
          <Text style={[styles.dateText, { color: theme.colors.text }]}>{date}</Text>
          <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>{time}</Text>
        </View>

        <View style={styles.rightHeader}>
          {isCompleted ? (
            <View style={styles.completedBadge}>
              <Text style={styles.completedText}>COMPLETED</Text>
            </View>
          ) : isCancelled ? (
            <View style={styles.cancelledBadge}>
              <Text style={styles.cancelledText}>CANCELLED</Text>
            </View>
          ) : (
            <View style={styles.activeBadge}>
              <Text style={styles.activeText}>{trip.status}</Text>
            </View>
          )}

          <Text
            style={[
              styles.fareText,
              { color: isCompleted ? '#10B981' : isCancelled ? '#64748B' : theme.colors.text },
            ]}
          >
            {isCancelled ? '₹0.00' : `₹${Math.round(trip.driver_net_earning)}`}
          </Text>
        </View>
      </View>

      {/* Route Addresses */}
      <View style={styles.routeContainer}>
        <View style={styles.stopRow}>
          <View style={styles.greenDot} />
          <Text style={[styles.addressText, { color: theme.colors.text }]} numberOfLines={1}>
            {trip.pickup_address}
          </Text>
        </View>

        <View style={styles.routeConnector} />

        <View style={styles.stopRow}>
          <View style={styles.redSquare} />
          <Text
            style={[styles.addressText, { color: theme.colors.textSecondary }]}
            numberOfLines={1}
          >
            {trip.destination_address}
          </Text>
        </View>
      </View>

      {/* Footer: Distance + Payment Mode + Receipt Trigger */}
      <View style={[styles.footerRow, { borderTopColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
        <View style={styles.footerMeta}>
          <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
            {trip.distance_km > 0 ? `${trip.distance_km.toFixed(1)} km` : 'Standard Trip'}
          </Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
            {trip.payment_method.toUpperCase()}
          </Text>
        </View>

        <View style={styles.viewReceiptRow}>
          <Text style={styles.viewReceiptText}>View Receipt</Text>
          <Feather name="chevron-right" size={14} color="#6366F1" style={{ marginLeft: 2 }} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateCol: { gap: 2 },
  dateText: { fontSize: 13, fontWeight: '800' },
  timeText: { fontSize: 11 },
  rightHeader: { alignItems: 'flex-end', gap: 4 },
  completedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  completedText: { color: '#10B981', fontSize: 9, fontWeight: '800' },
  cancelledBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cancelledText: { color: '#EF4444', fontSize: 9, fontWeight: '800' },
  activeBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeText: { color: '#6366F1', fontSize: 9, fontWeight: '800' },
  fareText: { fontSize: 16, fontWeight: '900' },
  routeContainer: { marginVertical: 4 },
  stopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  redSquare: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#EF4444',
  },
  routeConnector: {
    width: 2,
    height: 10,
    backgroundColor: '#94A3B8',
    marginLeft: 3,
    marginVertical: 2,
  },
  addressText: { fontSize: 12, flex: 1, fontWeight: '600' },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  footerMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 11, fontWeight: '600' },
  metaDot: { color: '#94A3B8' },
  viewReceiptRow: { flexDirection: 'row', alignItems: 'center' },
  viewReceiptText: { color: '#6366F1', fontSize: 11, fontWeight: '700' },
});
