import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { UpcomingReservedTrip } from '../../types/scheduledTrips';

interface UpcomingReservationCardProps {
  trip: UpcomingReservedTrip;
  onStartHeading: (tripId: string) => void;
  onCancel: (trip: UpcomingReservedTrip) => void;
  starting: boolean;
}

export const UpcomingReservationCard: React.FC<UpcomingReservationCardProps> = ({
  trip,
  onStartHeading,
  onCancel,
  starting,
}) => {
  const { theme, isDark } = useTheme();

  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return 'Pickup time now!';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `Starts in ${hrs}h ${mins}m`;
    return `Starts in ${mins} min`;
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const isUrgent = trip.countdown_seconds <= 1800; // <= 30 mins

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
          borderColor: isUrgent
            ? '#F59E0B'
            : isDark
            ? 'rgba(14, 165, 233, 0.3)'
            : '#BAE6FD',
        },
      ]}
    >
      {/* Header: Countdown Banner & Fare */}
      <View style={styles.headerRow}>
        <View
          style={[
            styles.countdownPill,
            { backgroundColor: isUrgent ? 'rgba(245, 158, 11, 0.15)' : 'rgba(14, 165, 233, 0.15)' },
          ]}
        >
          <Feather
            name="clock"
            size={13}
            color={isUrgent ? '#F59E0B' : '#0EA5E9'}
            style={{ marginRight: 5 }}
          />
          <Text
            style={[
              styles.countdownText,
              { color: isUrgent ? '#F59E0B' : '#0EA5E9' },
            ]}
          >
            {formatCountdown(trip.countdown_seconds)}
          </Text>
        </View>

        <Text style={styles.fareText}>₹{Math.round(trip.estimated_fare)}</Text>
      </View>

      {/* Pickup Scheduled Time */}
      <View style={styles.timeScheduleRow}>
        <Text style={[styles.scheduleLabel, { color: theme.colors.textSecondary }]}>
          Scheduled Pickup:
        </Text>
        <Text style={[styles.scheduleTime, { color: theme.colors.text }]}>
          {formatTime(trip.scheduled_pickup_time)}
        </Text>
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

      {/* Passenger Info Row */}
      <View
        style={[
          styles.passengerRow,
          { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' },
        ]}
      >
        <View style={styles.passengerInfo}>
          <Feather name="user" size={14} color="#64748B" style={{ marginRight: 6 }} />
          <Text style={[styles.passengerName, { color: theme.colors.text }]}>
            {trip.customer_name}
          </Text>
        </View>

        <TouchableOpacity onPress={() => onCancel(trip)}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Action CTA: Start Heading */}
      <TouchableOpacity
        style={[
          styles.startBtn,
          trip.is_ready_to_start ? styles.startBtnActive : styles.startBtnDisabled,
          starting && { opacity: 0.6 },
        ]}
        onPress={() => onStartHeading(trip.id)}
        disabled={!trip.is_ready_to_start || starting}
        activeOpacity={0.8}
      >
        <Feather name="navigation" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
        <Text style={styles.startBtnText}>
          {trip.scheduled_status === 'DISPATCHED'
            ? 'Continue Navigation to Pickup'
            : trip.is_ready_to_start
            ? 'Start Heading to Pickup'
            : `Available ${Math.ceil(trip.countdown_seconds / 60) - 45}m before pickup`}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  countdownText: { fontSize: 12, fontWeight: '800' },
  fareText: { fontSize: 18, fontWeight: '900', color: '#10B981' },
  timeScheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  scheduleLabel: { fontSize: 12 },
  scheduleTime: { fontSize: 12, fontWeight: '800' },
  routeContainer: { marginBottom: 12 },
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
  passengerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  passengerInfo: { flexDirection: 'row', alignItems: 'center' },
  passengerName: { fontSize: 12, fontWeight: '700' },
  cancelText: { color: '#EF4444', fontSize: 12, fontWeight: '700' },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  startBtnActive: { backgroundColor: '#10B981' },
  startBtnDisabled: { backgroundColor: '#64748B', opacity: 0.6 },
  startBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
