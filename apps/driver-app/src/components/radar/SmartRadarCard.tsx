/**
 * Smart Radar Card Component — Feature 6 (Approved Light Mode with Dark Mode support)
 * Interactive card displaying candidate ride details, human badges, and atomic match selection.
 */
import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { SmartRadarCandidate } from '../../types/smartRadar'

interface Props {
  candidate: SmartRadarCandidate
  index: number
  isSelected: boolean
  isMatching: boolean
  isDark?: boolean
  onToggleSelect: (rideId: string) => void
  onInspectMap?: (candidate: SmartRadarCandidate) => void
}

export const SmartRadarCard: React.FC<Props> = ({
  candidate,
  index,
  isSelected,
  isMatching,
  isDark = false,
  onToggleSelect,
  onInspectMap,
}) => {
  const classification = candidate.classification
  const badge = classification.badge_label || '★ Great Match'

  // Dynamic Badge Color Styles
  const badgeBg =
    classification.badge_color === 'purple'
      ? isDark ? 'rgba(168,85,247,0.18)' : '#F3E8FF'
      : classification.badge_color === 'orange'
      ? isDark ? 'rgba(249,115,22,0.18)' : '#FFEDD5'
      : classification.badge_color === 'green'
      ? isDark ? 'rgba(16,185,129,0.18)' : '#DCFCE7'
      : isDark ? 'rgba(14,165,233,0.18)' : '#E0F2FE'

  const badgeTextCol =
    classification.badge_color === 'purple'
      ? '#9333EA'
      : classification.badge_color === 'orange'
      ? '#EA580C'
      : classification.badge_color === 'green'
      ? '#16A34A'
      : '#0284C7'

  // Card Colors
  const bgCard = isDark ? '#1E293B' : '#FFFFFF'
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A'
  const textSecondary = isDark ? '#94A3B8' : '#64748B'
  const borderCol = isSelected
    ? '#10B981'
    : isDark
    ? '#334155'
    : '#E2E8F0'

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: bgCard,
          borderColor: borderCol,
          borderWidth: isSelected ? 2 : 1,
        },
      ]}
    >
      {/* Top Badge & Number Row */}
      <View style={styles.topRow}>
        <View style={styles.badgeWrap}>
          <View style={[styles.indexPill, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
            <Text style={[styles.indexText, { color: textPrimary }]}>{index + 1}</Text>
          </View>
          <View style={[styles.badgePill, { backgroundColor: badgeBg }]}>
            <Text style={[styles.badgeText, { color: badgeTextCol }]}>{badge}</Text>
          </View>
        </View>

        {onInspectMap && (
          <TouchableOpacity
            style={styles.mapIconBtn}
            onPress={() => onInspectMap(candidate)}
            activeOpacity={0.7}
          >
            <Feather name="map-pin" size={14} color="#0284C7" />
            <Text style={styles.mapIconText}>Route</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Locations Column */}
      <View style={styles.locationsWrap}>
        {/* Pickup */}
        <View style={styles.locationRow}>
          <View style={styles.pickupDot} />
          <View style={styles.locationTextCol}>
            <Text style={[styles.locationAddress, { color: textPrimary }]} numberOfLines={1}>
              {candidate.pickup.address}
            </Text>
            <Text style={styles.pickupDistanceMeta}>
              {candidate.pickup.distance_km} km away • {candidate.pickup.eta_min} min ETA
            </Text>
          </View>
        </View>

        {/* Dropoff */}
        <View style={[styles.locationRow, { marginTop: 8 }]}>
          <View style={styles.dropDot} />
          <View style={styles.locationTextCol}>
            <Text style={[styles.locationAddress, { color: textPrimary }]} numberOfLines={1}>
              {candidate.destination.address}
            </Text>
          </View>
        </View>
      </View>

      {/* Trip Metadata Chip */}
      <View style={styles.metaRow}>
        <View style={[styles.metaChip, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
          <MaterialCommunityIcons name="road-variant" size={14} color="#0284C7" />
          <Text style={[styles.metaChipText, { color: textPrimary }]}>
            {candidate.trip_distance_km} km • ~{candidate.trip_duration_min} min
          </Text>
        </View>

        <View style={[styles.categoryChip, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
          <Ionicons name="car-outline" size={13} color="#64748B" />
          <Text style={[styles.categoryChipText, { color: textSecondary }]}>
            {candidate.category_name}
          </Text>
        </View>
      </View>

      {/* Bottom Pricing & Match CTA Row */}
      <View style={styles.bottomRow}>
        <View style={styles.pricingCol}>
          <Text style={[styles.fareText, { color: textSecondary }]}>
            💰 ₹{candidate.fare} Fare
          </Text>
          <Text style={styles.earningText}>
            🟢 ₹{candidate.driver_earning} Earning
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.matchBtn,
            isSelected
              ? { backgroundColor: '#10B981', borderColor: '#10B981' }
              : { backgroundColor: '#16A34A', borderColor: '#16A34A' },
          ]}
          onPress={() => onToggleSelect(candidate.ride_id)}
          disabled={isMatching}
          activeOpacity={0.8}
        >
          {isMatching && isSelected ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : isSelected ? (
            <View style={styles.selectedRow}>
              <Feather name="check" size={14} color="#FFFFFF" />
              <Text style={styles.matchBtnText}>SELECTED</Text>
            </View>
          ) : (
            <Text style={styles.matchBtnText}>MATCH ⚡</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  indexPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    fontSize: 12,
    fontWeight: '800',
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  mapIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(2,132,199,0.08)',
    gap: 4,
  },
  mapIconText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  locationsWrap: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 10,
  },
  dropDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#EF4444',
    marginRight: 10,
  },
  locationTextCol: {
    flex: 1,
  },
  locationAddress: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  pickupDistanceMeta: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  pricingCol: {},
  fareText: {
    fontSize: 11,
    fontWeight: '600',
  },
  earningText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#16A34A',
    marginTop: 1,
  },
  matchBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  matchBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
})
