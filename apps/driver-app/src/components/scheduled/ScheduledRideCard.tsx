import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { AvailableScheduledRide } from '../../types/scheduledTrips';

interface ScheduledRideCardProps {
  ride: AvailableScheduledRide;
  onAccept: (ride: AvailableScheduledRide) => void;
  claiming: boolean;
}

export const ScheduledRideCard: React.FC<ScheduledRideCardProps> = ({
  ride,
  onAccept,
  claiming,
}) => {
  const { theme, isDark } = useTheme();

  const formatScheduledTime = (isoString: string) => {
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

  const { date, time } = formatScheduledTime(ride.scheduled_pickup_time);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
          borderColor: isDark ? '#1E293B' : '#E2E8F0',
        },
      ]}
    >
      {/* Header: Date Pill & Fare Badge */}
      <View style={styles.topRow}>
        <View style={styles.timeBadge}>
          <Feather name="calendar" size={12} color="#0EA5E9" style={{ marginRight: 4 }} />
          <Text style={styles.dateText}>{date}</Text>
          <Text style={styles.dotSeparator}>•</Text>
          <Feather name="clock" size={12} color="#0EA5E9" style={{ marginRight: 4 }} />
          <Text style={styles.timeText}>{time}</Text>
        </View>

        <View style={styles.farePill}>
          <Text style={styles.fareText}>₹{Math.round(ride.estimated_fare)}</Text>
          <Text style={styles.estLabel}>Est.</Text>
        </View>
      </View>

      {/* Category & Distance */}
      <View style={styles.metaRow}>
        <View style={[styles.catBadge, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
          <Text style={[styles.catText, { color: theme.colors.textSecondary }]}>
            {ride.ride_category || 'Prime Sedan'}
          </Text>
        </View>
        <Text style={[styles.distText, { color: theme.colors.textSecondary }]}>
          ~{ride.estimated_distance_km} km trip
        </Text>
      </View>

      {/* Route Addresses */}
      <View style={styles.routeContainer}>
        {/* Pickup */}
        <View style={styles.stopRow}>
          <View style={styles.greenDot} />
          <Text style={[styles.addressText, { color: theme.colors.text }]} numberOfLines={1}>
            {ride.pickup_address}
          </Text>
        </View>

        {/* Route Line */}
        <View style={styles.routeConnector} />

        {/* Destination */}
        <View style={styles.stopRow}>
          <View style={styles.redSquare} />
          <Text
            style={[styles.addressText, { color: theme.colors.textSecondary }]}
            numberOfLines={1}
          >
            {ride.destination_address}
          </Text>
        </View>
      </View>

      {/* Action Claim Button */}
      <TouchableOpacity
        style={[styles.claimBtn, claiming && { opacity: 0.6 }]}
        onPress={() => onAccept(ride)}
        disabled={claiming}
        activeOpacity={0.8}
      >
        <Feather name="check-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
        <Text style={styles.claimText}>Claim Advance Reservation</Text>
      </TouchableOpacity>
    </View>
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
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  dateText: { color: '#0EA5E9', fontSize: 12, fontWeight: '800' },
  dotSeparator: { color: '#0EA5E9', marginHorizontal: 4 },
  timeText: { color: '#0EA5E9', fontSize: 12, fontWeight: '800' },
  farePill: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  fareText: { fontSize: 18, fontWeight: '900', color: '#10B981' },
  estLabel: { fontSize: 11, color: '#64748B' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catText: { fontSize: 11, fontWeight: '700' },
  distText: { fontSize: 12 },
  routeContainer: { marginBottom: 14 },
  stopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  greenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  redSquare: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#EF4444',
  },
  routeConnector: {
    width: 2,
    height: 12,
    backgroundColor: '#94A3B8',
    marginLeft: 4,
    marginVertical: 2,
  },
  addressText: { fontSize: 13, flex: 1, fontWeight: '600' },
  claimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0EA5E9',
    paddingVertical: 12,
    borderRadius: 10,
  },
  claimText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
