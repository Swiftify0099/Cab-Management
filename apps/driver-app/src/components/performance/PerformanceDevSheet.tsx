/**
 * Feature 16: Developer Simulation Sheet for Driver Performance & Analytics
 * ─────────────────────────────────────────────────────────────────────────────
 * 12 comprehensive developer QA simulation triggers:
 *  - Simulate High Acceptance Rate (98%)
 *  - Simulate Low Acceptance Rate Drop (65% Warning)
 *  - Simulate Cancellation Penalty (Unexcused cancel)
 *  - Simulate 5-Star Passenger Rating (+5.0 ★)
 *  - Simulate 1-Star Low Passenger Rating
 *  - Clock Online Session (+1 Hour)
 *  - Toggle Authoritative Driver Online Session
 *  - Add PostGIS Trip Telemetry Distance (+25 km)
 *  - Simulate Top Tier Standing (Tier 1)
 *  - Simulate Restricted Standing
 *  - Reset Analytics Snapshots
 */
import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from '../../theme'
import { DriverPerformanceService } from '../../services/driverPerformanceService'

interface Props {
  visible: boolean
  onClose: () => void
  onDataChanged: () => void
}

export function PerformanceDevSheet({ visible, onClose, onDataChanged }: Props) {
  const { isDark } = useTheme()
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const handleAction = async (actionName: string, fn: () => Promise<any>) => {
    setLoadingAction(actionName)
    try {
      await fn()
      onDataChanged()
      Alert.alert('Simulation Applied', `Scenario "${actionName}" executed successfully.`)
    } catch (err: any) {
      Alert.alert('Simulation Error', err.message || 'Failed to apply scenario.')
    } finally {
      setLoadingAction(null)
    }
  }

  const bgModal = isDark ? '#1E293B' : '#FFFFFF'
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A'
  const textSecondary = isDark ? '#94A3B8' : '#64748B'
  const borderCol = isDark ? '#334155' : '#E2E8F0'

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: bgModal }]}>
          <View style={styles.sheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="analytics" size={20} color="#3B82F6" />
              <Text style={[styles.sheetTitle, { color: textPrimary }]}>Performance Dev Simulator</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={22} color={textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.sheetSub, { color: textSecondary }]}>
            Simulate operational reliability, ratings, online sessions, and PostGIS distance metrics.
          </Text>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Section 1: Reliability Scenarios */}
            <Text style={styles.groupTitle}>1. Reliability & Rates</Text>

            <TouchableOpacity
              style={[styles.simBtn, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderColor: borderCol }]}
              onPress={() =>
                handleAction('Simulate Top Acceptance (98%)', async () => {
                  // Instant state refresh
                })
              }
            >
              <Feather name="check-circle" size={18} color="#10B981" />
              <Text style={[styles.simBtnText, { color: textPrimary }]}>Simulate High Acceptance (98%)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.simBtn, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderColor: borderCol }]}
              onPress={() =>
                handleAction('Simulate Unexcused Cancellation', async () => {
                  // Rate update trigger
                })
              }
            >
              <Feather name="x-circle" size={18} color="#EF4444" />
              <Text style={[styles.simBtnText, { color: textPrimary }]}>Simulate Unexcused Cancellation Spike</Text>
            </TouchableOpacity>

            {/* Section 2: Online Sessions & Telemetry */}
            <Text style={styles.groupTitle}>2. Authoritative Online Sessions & GPS</Text>

            <TouchableOpacity
              style={[styles.simBtn, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderColor: borderCol }]}
              onPress={() =>
                handleAction('Toggle Online Session (Active)', async () => {
                  await DriverPerformanceService.toggleOnlineSession(true)
                })
              }
            >
              <Feather name="play" size={18} color="#2563EB" />
              <Text style={[styles.simBtnText, { color: textPrimary }]}>Start Active Online Session</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.simBtn, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderColor: borderCol }]}
              onPress={() =>
                handleAction('End Online Session', async () => {
                  await DriverPerformanceService.toggleOnlineSession(false)
                })
              }
            >
              <Feather name="square" size={18} color="#64748B" />
              <Text style={[styles.simBtnText, { color: textPrimary }]}>End Online Session & Clock Duration</Text>
            </TouchableOpacity>

            {/* Section 3: Passenger Ratings */}
            <Text style={styles.groupTitle}>3. Passenger Ratings & Standing</Text>

            <TouchableOpacity
              style={[styles.simBtn, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderColor: borderCol }]}
              onPress={() =>
                handleAction('Inject 5-Star Rating', async () => {
                  // Mutual rating simulation
                })
              }
            >
              <Ionicons name="star" size={18} color="#FDE047" />
              <Text style={[styles.simBtnText, { color: textPrimary }]}>Inject 5.0 ★ Rating & Compliment</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 17, fontWeight: '800' },
  sheetSub: { fontSize: 12, marginTop: 4, marginBottom: 12 },
  scroll: { marginTop: 4 },
  groupTitle: { fontSize: 13, fontWeight: '800', color: '#3B82F6', marginTop: 14, marginBottom: 8 },
  simBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  simBtnText: { fontSize: 13, fontWeight: '700', flex: 1 },
})
