/**
 * Feature 9: Authoritative Emergency SOS Modal
 * 3-Second Press & Hold Activation to Prevent Accidental Triggers.
 * Real-time PostGIS location transmission, 112 police alert & Safety Ops escalation.
 */
import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Vibration,
  Linking,
  ActivityIndicator,
} from 'react-native'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from '../../contexts/ThemeContext'
import { AppText, AppButton, AppBadge } from '../ui'
import { safetyApi } from '../../api/client'

interface SOSConfirmModalProps {
  visible: boolean
  onClose: () => void
  rideId: string
  currentLat?: number
  currentLng?: number
  onSosTriggered?: (sosData: any) => void
}

const HOLD_DURATION_MS = 3000

export function SOSConfirmModal({
  visible,
  onClose,
  rideId,
  currentLat = 18.5204,
  currentLng = 73.8567,
  onSosTriggered,
}: SOSConfirmModalProps) {
  const { theme, isDark } = useTheme()
  const [isHolding, setIsHolding] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [isTriggered, setIsTriggered] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sosResult, setSosResult] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const holdProgress = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const timerRef = useRef<any>(null)
  const countIntervalRef = useRef<any>(null)

  // Pulsing animation when active
  useEffect(() => {
    if (isTriggered) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start()
    }
  }, [isTriggered])

  const handlePressIn = () => {
    if (isTriggered || loading) return
    setIsHolding(true)
    setCountdown(3)
    setErrorMessage(null)
    Vibration.vibrate(100)

    Animated.timing(holdProgress, {
      toValue: 1,
      duration: HOLD_DURATION_MS,
      useNativeDriver: false,
    }).start()

    let count = 3
    countIntervalRef.current = setInterval(() => {
      count -= 1
      if (count >= 1) {
        setCountdown(count)
        Vibration.vibrate(80)
      }
    }, 1000)

    timerRef.current = setTimeout(() => {
      triggerSOSAuthoritative()
    }, HOLD_DURATION_MS)
  }

  const handlePressOut = () => {
    if (isTriggered || loading) return
    setIsHolding(false)
    setCountdown(3)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (countIntervalRef.current) clearInterval(countIntervalRef.current)
    
    Animated.timing(holdProgress, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start()
  }

  const triggerSOSAuthoritative = async () => {
    if (countIntervalRef.current) clearInterval(countIntervalRef.current)
    setLoading(true)
    Vibration.vibrate([100, 200, 100, 200, 400])

    try {
      const res = await safetyApi.triggerSOS({
        ride_id: rideId,
        latitude: currentLat,
        longitude: currentLng,
        accuracy: 10.0,
        reason: 'Customer pressed Emergency SOS button in Customer App',
      })

      const data = res.data?.data || res.data
      setSosResult(data)
      setIsTriggered(true)
      onSosTriggered?.(data)
    } catch (err: any) {
      console.error('[SOS] Trigger failed:', err)
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to trigger SOS. Call 112 immediately.')
    } finally {
      setLoading(false)
      setIsHolding(false)
    }
  }

  const handleCall112Direct = () => {
    Linking.openURL('tel:112').catch(() => {})
  }

  const handleClose = () => {
    if (isHolding) handlePressOut()
    onClose()
  }

  const progressInterpolate = holdProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  })

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: isDark ? theme.colors.card : '#FFFFFF' }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.badgeRow}>
              <View style={[styles.statusDot, { backgroundColor: isTriggered ? '#EF4444' : '#F59E0B' }]} />
              <AppText variant="caption" style={{ fontWeight: '700', color: isTriggered ? '#EF4444' : '#F59E0B' }}>
                {isTriggered ? 'SOS ACTIVE — EMERGENCY DISPATCHED' : 'EMERGENCY PROTOCOL'}
              </AppText>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {isTriggered ? (
            /* ACTIVE SOS DISPATCHED VIEW */
            <View style={styles.triggeredContainer}>
              <Animated.View style={[styles.triggeredIconCircle, { transform: [{ scale: pulseAnim }] }]}>
                <MaterialCommunityIcons name="alarm-light" size={48} color="#FFFFFF" />
              </Animated.View>

              <AppText variant="h2" style={styles.triggeredTitle}>Emergency Alert Sent!</AppText>
              <AppText variant="body" color="secondary" style={styles.triggeredSub}>
                Your live GPS coordinates have been securely shared with our 24/7 Safety Command Center and local authorities (112).
              </AppText>

              <View style={[styles.infoBox, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2' }]}>
                <View style={styles.infoRow}>
                  <Ionicons name="shield-checkmark" size={18} color="#EF4444" />
                  <AppText variant="bodyS" style={styles.infoText}>Safety Team is actively tracking this ride</AppText>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="location" size={18} color="#EF4444" />
                  <AppText variant="bodyS" style={styles.infoText}>
                    GPS: {currentLat.toFixed(5)}, {currentLng.toFixed(5)} (PostGIS SRID 4326)
                  </AppText>
                </View>
              </View>

              {/* Call 112 Button */}
              <AppButton
                variant="danger"
                onPress={handleCall112Direct}
                style={styles.call112Btn}
              >
                Call Police (112) Directly
              </AppButton>

              <TouchableOpacity style={styles.dismissBtn} onPress={handleClose}>
                <AppText variant="body" color="secondary">Close Emergency Window</AppText>
              </TouchableOpacity>
            </View>
          ) : (
            /* PRESS AND HOLD ACTIVATION VIEW */
            <View style={styles.holdContainer}>
              <AppText variant="h3" style={styles.holdTitle}>Emergency Assistance</AppText>
              <AppText variant="caption" color="secondary" style={styles.holdSub}>
                To prevent accidental triggers, press and hold the button below for 3 full seconds.
              </AppText>

              {/* Central Hold Button */}
              <View style={styles.buttonWrapper}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  disabled={loading}
                  style={[
                    styles.holdCircle,
                    { backgroundColor: isHolding ? '#DC2626' : '#EF4444' }
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator size="large" color="#FFFFFF" />
                  ) : (
                    <View style={styles.innerHoldContent}>
                      <MaterialCommunityIcons name="alarm-light" size={44} color="#FFFFFF" />
                      <AppText style={styles.holdText}>{isHolding ? `HOLD (${countdown}s)` : 'HOLD 3s'}</AppText>
                      <AppText style={styles.sosWord}>SOS</AppText>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Circular Progress Bar Indicator */}
                {isHolding && (
                  <View style={styles.progressBarTrack}>
                    <Animated.View
                      style={[
                        styles.progressBarFill,
                        { width: progressInterpolate }
                      ]}
                    />
                  </View>
                )}
              </View>

              {errorMessage && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <AppText variant="caption" style={styles.errorText}>{errorMessage}</AppText>
                </View>
              )}

              {/* Direct 112 Call Shortcut */}
              <View style={[styles.fallbackBox, { backgroundColor: isDark ? theme.colors.surface : '#F8FAFC' }]}>
                <View style={styles.fallbackLeft}>
                  <Feather name="phone-call" size={18} color="#EF4444" />
                  <View style={styles.fallbackTextCol}>
                    <AppText variant="bodyS" bold>Immediate Police Helpline</AppText>
                    <AppText variant="caption" color="secondary">Dial 112 immediately if in extreme danger</AppText>
                  </View>
                </View>
                <TouchableOpacity style={styles.callShortcutBtn} onPress={handleCall112Direct}>
                  <AppText style={styles.callShortcutText}>Call 112</AppText>
                </TouchableOpacity>
              </View>
            </View>
          )}
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
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 25,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdContainer: {
    alignItems: 'center',
  },
  holdTitle: {
    textAlign: 'center',
    marginBottom: 6,
  },
  holdSub: {
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  buttonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    width: '100%',
  },
  holdCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 16,
  },
  innerHoldContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  sosWord: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  progressBarTrack: {
    width: '80%',
    height: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 3,
    marginTop: 18,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#EF4444',
    borderRadius: 3,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  errorText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  fallbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    borderRadius: 14,
    padding: 14,
    marginTop: 20,
  },
  fallbackLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  fallbackTextCol: {
    flex: 1,
  },
  callShortcutBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  callShortcutText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  triggeredContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  triggeredIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  triggeredTitle: {
    color: '#EF4444',
    marginBottom: 8,
  },
  triggeredSub: {
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  infoBox: {
    width: '100%',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontWeight: '500',
  },
  call112Btn: {
    width: '100%',
    marginBottom: 12,
  },
  dismissBtn: {
    paddingVertical: 8,
  },
})
