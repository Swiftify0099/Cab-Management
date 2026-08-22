/**
 * Destination Active Banner — Feature 20
 * Glanceable sticky HUD card displayed on Driver Home & Radar screens.
 */
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from '../../theme'
import { DestinationModeStatusData } from '../../types/destinationMode'

interface Props {
  status: DestinationModeStatusData | null
  onOpenEdit: () => void
  onTurnOff: () => void
}

export const DestinationActiveBanner: React.FC<Props> = ({ status, onOpenEdit, onTurnOff }) => {
  const { isDark } = useTheme()

  if (!status || !status.is_active || !status.destination_address) {
    return null
  }

  const formatRemainingTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${mins}m left`
    return `${mins}m left`
  }

  const bgCard = isDark ? '#064E3B' : '#ECFDF5'
  const textPrimary = isDark ? '#F8FAFC' : '#065F46'
  const textSecondary = isDark ? '#6EE7B7' : '#047857'
  const borderCol = isDark ? '#059669' : '#A7F3D0'

  return (
    <View style={[styles.container, { backgroundColor: bgCard, borderColor: borderCol }]}>
      <View style={styles.leftRow}>
        <View style={styles.iconCircle}>
          <Ionicons name="compass" size={20} color="#10B981" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.topLine}>
            <Text style={[styles.title, { color: textPrimary }]} numberOfLines={1}>
              Towards {status.destination_address.split(',')[0]}
            </Text>
            <View style={styles.modeBadge}>
              <Text style={styles.modeBadgeText}>
                {status.mode_preference.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={[styles.subtitle, { color: textSecondary }]}>
            {formatRemainingTime(status.remaining_seconds)} • {status.rides_completed}/{status.max_rides} trips
          </Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.editBtn} onPress={onOpenEdit}>
          <Feather name="edit-2" size={14} color="#059669" />
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.offBtn} onPress={onTurnOff}>
          <Feather name="x" size={14} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    maxWidth: '70%',
  },
  modeBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  offBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
})
