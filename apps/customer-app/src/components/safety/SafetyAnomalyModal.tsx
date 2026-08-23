/**
 * Feature 9: Passive Safety Anomaly Modal
 * Proactively checks in with passenger if route deviation or unexpected long stop occurs.
 */
import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from '../../contexts/ThemeContext'
import { AppText, AppButton, AppBadge } from '../ui'
import { safetyApi } from '../../api/client'

interface SafetyAnomalyModalProps {
  visible: boolean
  alertId?: string
  alertType?: 'ROUTE_DEVIATION' | 'UNEXPECTED_STOP' | 'OVERSPEED' | string
  onDismiss: () => void
  onTriggerSOS: () => void
}

export function SafetyAnomalyModal({
  visible,
  alertId,
  alertType = 'ROUTE_DEVIATION',
  onDismiss,
  onTriggerSOS,
}: SafetyAnomalyModalProps) {
  const { theme, isDark } = useTheme()
  const [loading, setLoading] = useState(false)

  const isDeviation = alertType.includes('ROUTE') || alertType.includes('DEVIATION')
  const isStop = alertType.includes('STOP')

  const title = isDeviation
    ? 'Route Change Detected'
    : isStop
    ? 'Unexpected Stop Detected'
    : 'Safety Check-in'

  const description = isDeviation
    ? 'We noticed your vehicle has taken a different route from the intended path. Are you okay?'
    : isStop
    ? 'Your vehicle has been stationary for an unusual amount of time. Are you safe?'
    : 'Our automated safety monitor noticed an anomaly on your trip. Please confirm your status.'

  const handleImSafe = async () => {
    if (!alertId) {
      onDismiss()
      return
    }
    setLoading(true)
    try {
      await safetyApi.resolveSafetyAlert(alertId, 'IM_SAFE')
    } catch (err) {
      console.warn('[SafetyAnomaly] Failed to resolve alert on server:', err)
    } finally {
      setLoading(false)
      onDismiss()
    }
  }

  const handleCall112 = () => {
    onDismiss()
    onTriggerSOS()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: isDark ? theme.colors.card : '#FFFFFF' }]}>
          {/* Top Warning Icon */}
          <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7' }]}>
            <MaterialCommunityIcons
              name={isDeviation ? 'routes' : isStop ? 'car-brake-alert' : 'shield-alert'}
              size={36}
              color="#F59E0B"
            />
          </View>

          <AppBadge label="PASSIVE SAFETY MONITOR" variant="warning" size="sm" />

          <AppText variant="h3" style={styles.title}>{title}</AppText>
          <AppText variant="body" color="secondary" style={styles.sub}>
            {description}
          </AppText>

          {/* Action Buttons */}
          <View style={styles.btnCol}>
            <AppButton
              variant="success"
              onPress={handleImSafe}
              loading={loading}
              style={styles.safeBtn}
            >
              I'm Safe, Everything is Fine
            </AppButton>

            <AppButton
              variant="danger"
              onPress={handleCall112}
              style={styles.sosBtn}
            >
              Need Help / Trigger SOS
            </AppButton>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  sub: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  btnCol: {
    width: '100%',
    gap: 12,
  },
  safeBtn: {
    width: '100%',
  },
  sosBtn: {
    width: '100%',
  },
})
