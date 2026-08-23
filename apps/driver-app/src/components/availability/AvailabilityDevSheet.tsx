import React from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from '../../theme'
import {
  AvailabilityService,
  AvailabilityStateData,
} from '../../services/availabilityService'

interface Props {
  visible: boolean
  data: AvailabilityStateData
  onClose: () => void
}

export function AvailabilityDevSheet({ visible, data, onClose }: Props) {
  if (!__DEV__) return null
  const { theme, isDark } = useTheme()

  const handleSim = (action: any) => {
    AvailabilityService.devSimulate(action)
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheetContainer,
            { backgroundColor: isDark ? '#111827' : '#FFFFFF' },
          ]}
        >
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>
                Availability & Diagnostics (Dev Mode)
              </Text>
              <Text style={[styles.sheetSubtitle, { color: theme.colors.textSecondary }]}>
                Real-time connection metrics & edge-case simulation
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            {/* Live Metrics Grid */}
            <View
              style={[
                styles.metricsBox,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}
            >
              <View style={styles.metricRow}>
                <Text style={[styles.mLabel, { color: theme.colors.textSecondary }]}>
                  Current State
                </Text>
                <Text style={[styles.mVal, { color: '#0EA5E9' }]}>{data.state}</Text>
              </View>

              <View style={styles.metricRow}>
                <Text style={[styles.mLabel, { color: theme.colors.textSecondary }]}>
                  Network Status
                </Text>
                <Text
                  style={[
                    styles.mVal,
                    { color: data.networkStatus === 'CONNECTED' ? '#10B981' : '#EF4444' },
                  ]}
                >
                  {data.networkStatus}
                </Text>
              </View>

              <View style={styles.metricRow}>
                <Text style={[styles.mLabel, { color: theme.colors.textSecondary }]}>
                  GPS Status
                </Text>
                <Text style={[styles.mVal, { color: '#8B5CF6' }]}>
                  {data.gpsStatus} ({data.lat?.toFixed(4)}, {data.lng?.toFixed(4)})
                </Text>
              </View>

              <View style={styles.metricRow}>
                <Text style={[styles.mLabel, { color: theme.colors.textSecondary }]}>
                  Current Zone
                </Text>
                <Text style={[styles.mVal, { color: theme.colors.text }]}>
                  {data.currentZone}
                </Text>
              </View>

              <View style={styles.metricRow}>
                <Text style={[styles.mLabel, { color: theme.colors.textSecondary }]}>
                  Active Vehicle
                </Text>
                <Text style={[styles.mVal, { color: theme.colors.text }]}>
                  {data.activeVehicle
                    ? `${data.activeVehicle.make} ${data.activeVehicle.model} (${data.activeVehicle.registration_number})`
                    : 'None'}
                </Text>
              </View>

              {data.autoOfflineReason && (
                <View style={styles.metricRow}>
                  <Text style={[styles.mLabel, { color: '#EF4444' }]}>Auto Offline Reason</Text>
                  <Text style={[styles.mVal, { color: '#EF4444' }]}>{data.autoOfflineReason}</Text>
                </View>
              )}
            </View>

            {/* Simulation Triggers */}
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Edge-Case Simulators
            </Text>

            <View style={styles.simBtnGrid}>
              <TouchableOpacity
                style={[styles.simBtn, { backgroundColor: '#EF4444' }]}
                onPress={() => handleSim('DROP_NETWORK')}
              >
                <Text style={styles.simBtnText}>🌐 Simulate Network Drop</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.simBtn, { backgroundColor: '#10B981' }]}
                onPress={() => handleSim('RESTORE_NETWORK')}
              >
                <Text style={styles.simBtnText}>📶 Restore Network</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.simBtn, { backgroundColor: '#F59E0B' }]}
                onPress={() => handleSim('LOST_GPS')}
              >
                <Text style={styles.simBtnText}>📍 Simulate GPS Lost</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.simBtn, { backgroundColor: '#3B82F6' }]}
                onPress={() => handleSim('RESTORE_GPS')}
              >
                <Text style={styles.simBtnText}>🎯 Restore HD GPS Lock</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.simBtn, { backgroundColor: '#DC2626' }]}
                onPress={() => handleSim('AUTO_OFFLINE')}
              >
                <Text style={styles.simBtnText}>⏱️ Trigger Auto-Offline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.simBtn, { backgroundColor: '#64748B' }]}
                onPress={() => handleSim('RESET')}
              >
                <Text style={styles.simBtnText}>🔄 Reset to Defaults</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sheetSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  scroll: {
    marginBottom: 20,
  },
  metricsBox: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 8,
    marginBottom: 16,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  mLabel: {
    fontSize: 12,
  },
  mVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  simBtnGrid: {
    gap: 8,
  },
  simBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  simBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
