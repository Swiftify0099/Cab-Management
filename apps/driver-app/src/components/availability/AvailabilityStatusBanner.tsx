import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from '../../theme'
import {
  AvailabilityStateData,
} from '../../services/availabilityService'

interface Props {
  data: AvailabilityStateData
  onPressDiagnostics?: () => void
  onPressVehicle?: () => void
}

export function AvailabilityStatusBanner({
  data,
  onPressDiagnostics,
  onPressVehicle,
}: Props) {
  const { theme, isDark } = useTheme()

  const isOnline = data.state === 'ONLINE' || data.state === 'GOING_ONLINE'
  const isNetOk = data.networkStatus === 'CONNECTED'
  const isGpsOk = data.gpsStatus === 'EXCELLENT' || data.gpsStatus === 'GOOD'

  return (
    <View style={styles.container}>
      {/* Top Warning Banner if network or GPS issue (only when online) */}
      {isOnline && !isNetOk && (
        <View style={[styles.alertBanner, { backgroundColor: '#EF4444' }]}>
          <Feather name="wifi-off" size={14} color="#FFFFFF" />
          <Text style={styles.alertText}>
            Reconnecting to dispatch server...
          </Text>
        </View>
      )}

      {isOnline && isNetOk && !isGpsOk && (
        <View style={[styles.alertBanner, { backgroundColor: '#F59E0B' }]}>
          <Feather name="alert-triangle" size={14} color="#FFFFFF" />
          <Text style={styles.alertText}>
            GPS Signal Weak — Move to an open area for better ride matching
          </Text>
        </View>
      )}

      {/* Main Minimalist Token Chips Strip */}
      <View
        style={[
          styles.stripContainer,
          {
            backgroundColor: isDark ? '#111827' : '#FFFFFF',
            borderColor: isDark ? '#1F2937' : '#E2E8F0',
          },
        ]}
      >
        {/* Zone Tag */}
        <TouchableOpacity
          style={styles.chipItem}
          activeOpacity={0.7}
          onPress={onPressDiagnostics}
        >
          <Ionicons name="location-sharp" size={14} color="#0EA5E9" />
          <Text
            style={[styles.chipText, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {(data?.currentZone || 'Pune Central • Zone 1').split('•')[0]?.trim() || 'Central Zone'}
          </Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* GPS Minimal Dot */}
        <TouchableOpacity
          style={styles.chipItem}
          activeOpacity={0.7}
          onPress={onPressDiagnostics}
        >
          <View
            style={[
              styles.dot,
              {
                backgroundColor: isGpsOk ? '#10B981' : '#F59E0B',
              },
            ]}
          />
          <Text style={[styles.chipTextSub, { color: theme.colors.textSecondary }]}>
            GPS: {data?.gpsStatus === 'EXCELLENT' ? 'HD' : (data?.gpsStatus || 'GOOD')}
          </Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Active Vehicle Tag */}
        <TouchableOpacity
          style={styles.chipItem}
          activeOpacity={0.7}
          onPress={onPressVehicle}
        >
          <MaterialCommunityIcons name="car-side" size={16} color="#8B5CF6" />
          <Text
            style={[styles.chipText, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {data?.activeVehicle?.model
              ? `${data.activeVehicle.model}`
              : data?.activeVehicle?.registration_number
              ? `${data.activeVehicle.registration_number}`
              : 'Select Car'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 8,
  },
  alertText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  stripContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  chipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 8,
  },
})
