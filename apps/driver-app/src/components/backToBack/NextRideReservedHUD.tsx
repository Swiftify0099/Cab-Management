/**
 * Next Ride Reserved HUD Badge — Feature 21
 * Displays on active navigation HUD when next ride is atomically reserved.
 */
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../theme'

interface Props {
  pickupAddress: string
  estimatedEarning: number
  onViewDetails?: () => void
}

export const NextRideReservedHUD: React.FC<Props> = ({
  pickupAddress,
  estimatedEarning,
  onViewDetails,
}) => {
  const { isDark } = useTheme()

  const bgCard = isDark ? '#064E3B' : '#ECFDF5'
  const textPrimary = isDark ? '#F8FAFC' : '#065F46'
  const borderCol = isDark ? '#059669' : '#A7F3D0'

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: bgCard, borderColor: borderCol }]}
      onPress={onViewDetails}
      activeOpacity={0.8}
    >
      <View style={styles.left}>
        <View style={styles.iconCircle}>
          <Ionicons name="shield-checkmark" size={16} color="#10B981" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.rowTop}>
            <Text style={[styles.title, { color: textPrimary }]}>Next Ride Reserved</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>₹{Math.round(estimatedEarning)}</Text>
            </View>
          </View>
          <Text style={[styles.subtitle, { color: isDark ? '#6EE7B7' : '#047857' }]} numberOfLines={1}>
            Pickup: {pickupAddress}
          </Text>
        </View>
      </View>
      <Feather name="chevron-right" size={16} color={isDark ? '#6EE7B7' : '#059669'} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 6,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
  },
  badge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
})
