/**
 * Next Ride Opportunity Banner — Feature 21 (Light & Dark Mode)
 * In-Flight continuous dispatch opportunity card presented to driver near destination.
 */
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from '../../theme'
import { BackToBackCandidate } from '../../types/backToBack'

interface Props {
  candidate: BackToBackCandidate
  onAccept: (candidate: BackToBackCandidate) => void
  onDecline: () => void
  loading?: boolean
}

export const NextRideOpportunityBanner: React.FC<Props> = ({
  candidate,
  onAccept,
  onDecline,
  loading = false,
}) => {
  const { isDark } = useTheme()

  const bgCard = isDark ? '#1E293B' : '#EFF6FF'
  const textPrimary = isDark ? '#F8FAFC' : '#1E3A8A'
  const textSecondary = isDark ? '#94A3B8' : '#3B82F6'
  const borderCol = isDark ? '#3B82F6' : '#93C5FD'

  return (
    <View style={[styles.container, { backgroundColor: bgCard, borderColor: borderCol }]}>
      {/* Header Tag */}
      <View style={styles.topRow}>
        <View style={styles.tagBadge}>
          <Ionicons name="flash" size={12} color="#FFFFFF" />
          <Text style={styles.tagText}>NEXT RIDE OPPORTUNITY</Text>
        </View>
        <Text style={styles.earningHighlight}>
          ₹{Math.round(candidate.driver_earning)} NET
        </Text>
      </View>

      {/* Ride Details Stack */}
      <View style={styles.body}>
        <View style={styles.pickupRow}>
          <View style={styles.dotPickup} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.locTitle, { color: textPrimary }]}>
              Pickup: {candidate.pickup.address}
            </Text>
            <Text style={[styles.locSub, { color: textSecondary }]}>
              {candidate.pickup_distance_from_current_dropoff_km || candidate.pickup_distance_km} km • {candidate.pickup_eta_from_current_dropoff_min || candidate.pickup_eta_min} min from current dropoff
            </Text>
          </View>
        </View>

        <View style={styles.destRow}>
          <View style={styles.dotDest} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.locTitle, { color: textPrimary }]}>
              Dropoff: {candidate.destination.address}
            </Text>
            <Text style={[styles.locSub, { color: textSecondary }]}>
              {candidate.trip_distance_km} km trip • {candidate.category_name}
            </Text>
          </View>
        </View>
      </View>

      {/* Explanation Banner */}
      <View style={styles.infoNotice}>
        <Feather name="info" size={12} color="#2563EB" />
        <Text style={styles.infoText}>
          Starts immediately after your current dropoff. No idle waiting!
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.declineBtn, { borderColor: isDark ? '#475569' : '#CBD5E1' }]}
          onPress={onDecline}
          disabled={loading}
        >
          <Text style={[styles.declineText, { color: isDark ? '#CBD5E1' : '#64748B' }]}>
            Not Now
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.acceptBtn}
          onPress={() => onAccept(candidate)}
          disabled={loading}
        >
          <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
          <Text style={styles.acceptText}>
            {loading ? 'Reserving...' : 'Accept Next Ride'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  earningHighlight: {
    fontSize: 18,
    fontWeight: '800',
    color: '#16A34A',
  },
  body: {
    gap: 8,
    marginVertical: 4,
  },
  pickupRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  dotPickup: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    marginTop: 4,
  },
  destRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  dotDest: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#EF4444',
    marginTop: 4,
  },
  locTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  locSub: {
    fontSize: 11,
    marginTop: 1,
  },
  infoNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    marginTop: 8,
  },
  infoText: {
    fontSize: 11,
    color: '#1E40AF',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  declineBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineText: {
    fontSize: 13,
    fontWeight: '700',
  },
  acceptBtn: {
    flex: 2,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  acceptText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
