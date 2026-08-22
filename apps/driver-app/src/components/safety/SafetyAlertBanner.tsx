/**
 * Safety Alert Banner & "I'm Safe" Workflow — Feature 22 (Light & Dark Mode)
 * Warning HUD triggered on route deviation, prolonged stationary stop, or speed alerts.
 */
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../theme'
import { SafetyAlertType, SafetySeverity } from '../../types/driverSafety'

interface Props {
  alertId?: string
  alertType: SafetyAlertType
  severity?: SafetySeverity
  message: string
  onConfirmSafe: () => void
  onNeedHelp: () => void
  resolving?: boolean
}

export const SafetyAlertBanner: React.FC<Props> = ({
  alertType,
  severity = 'WARNING',
  message,
  onConfirmSafe,
  onNeedHelp,
  resolving = false,
}) => {
  const { isDark } = useTheme()

  const isUrgent = severity === 'URGENT'
  const bgCard = isUrgent
    ? isDark ? '#7F1D1D' : '#FEF2F2'
    : isDark ? '#451A03' : '#FFFBEB'

  const borderCol = isUrgent ? '#EF4444' : '#F59E0B'
  const textPrimary = isUrgent
    ? isDark ? '#FEE2E2' : '#991B1B'
    : isDark ? '#FEF3C7' : '#92400E'

  const getAlertTitle = () => {
    switch (alertType) {
      case 'ROUTE_DEVIATION':
        return 'Route Deviation Detected'
      case 'LONG_STOP':
        return 'Unexpected Prolonged Stop'
      case 'OVERSPEED':
        return 'Speed Alert'
      default:
        return 'Safety Check'
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: bgCard, borderColor: borderCol }]}>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons
            name={isUrgent ? 'alert-circle' : 'warning'}
            size={20}
            color={isUrgent ? '#DC2626' : '#D97706'}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: textPrimary }]}>{getAlertTitle()}</Text>
          <Text style={[styles.message, { color: textPrimary }]}>{message}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.safeBtn, { borderColor: '#10B981' }]}
          onPress={onConfirmSafe}
          disabled={resolving}
        >
          {resolving ? (
            <ActivityIndicator size="small" color="#059669" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={16} color="#059669" />
              <Text style={styles.safeBtnText}>I'm Safe</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.helpBtn} onPress={onNeedHelp} disabled={resolving}>
          <Ionicons name="call" size={16} color="#FFFFFF" />
          <Text style={styles.helpBtnText}>Need Help (112)</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconCircle: {
    marginTop: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  message: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  safeBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  safeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  helpBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  helpBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
