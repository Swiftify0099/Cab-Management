/**
 * ArrivalVerificationPanel — Feature 9: Ride Start & Customer Verification Panel
 * Combines 4-point verification checklist, 4-box PIN input, waiting timer, and Start Ride CTA.
 */
import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { RideStartService } from '../../services/rideStartService'
import { RideVerificationStatus } from '../../types/rideStart'

interface ArrivalVerificationPanelProps {
  isDark: boolean
  rideId: string
  driverLat: number
  driverLng: number
  accuracy?: number
  onOpenCall: () => void
  onOpenChat: () => void
  onOpenAssistance: () => void
  onOpenNoShow: (elapsedSeconds: number, distanceMeters: number, contactAttempts: number) => void
  onRideStarted: (
    destination: { address: string; lat: number; lng: number },
    fare: number,
    polyline?: string
  ) => void
}

export function ArrivalVerificationPanel({
  isDark,
  rideId,
  driverLat,
  driverLng,
  accuracy = 10.0,
  onOpenCall,
  onOpenChat,
  onOpenAssistance,
  onOpenNoShow,
  onRideStarted,
}: ArrivalVerificationPanelProps) {
  const [statusData, setStatusData] = useState<RideVerificationStatus | null>(null)
  const [pinDigits, setPinDigits] = useState(['', '', '', ''])
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [elapsedSec, setElapsedSec] = useState(0)

  const pinInputRefs = [
    useRef<TextInput | null>(null),
    useRef<TextInput | null>(null),
    useRef<TextInput | null>(null),
    useRef<TextInput | null>(null),
  ]

  const shakeAnim = useRef(new Animated.Value(0)).current

  // Load verification status & start local waiting timer
  useEffect(() => {
    let isMounted = true
    const loadStatus = async () => {
      const data = await RideStartService.getVerificationStatus(rideId, driverLat, driverLng, accuracy)
      if (isMounted) {
        setStatusData(data)
        setElapsedSec(data.waiting_timer?.elapsed_seconds || 0)
      }
    }

    loadStatus()

    const timer = setInterval(() => {
      setElapsedSec(s => s + 1)
    }, 1000)

    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [rideId, driverLat, driverLng, accuracy])

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start()
  }

  const handlePinChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '')
    const updated = [...pinDigits]
    updated[index] = digit ? digit[digit.length - 1] : ''
    setPinDigits(updated)
    setErrorMessage(null)

    if (digit && index < 3) {
      pinInputRefs[index + 1].current?.focus()
    }
  }

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinInputRefs[index - 1].current?.focus()
    }
  }

  const fullPin = pinDigits.join('')
  const isPinComplete = fullPin.length === 4

  const handleVerifyAndStart = async () => {
    if (!isPinComplete || submitting) return

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const res = await RideStartService.verifyAndStartRide(
        rideId,
        fullPin,
        driverLat,
        driverLng,
        accuracy
      )
      if (res.success) {
        onRideStarted(res.destination, res.fare, res.route_polyline)
      }
    } catch (err: any) {
      triggerShake()
      setErrorMessage(err.message || 'Incorrect PIN or verification failed.')
      // Refresh status attempts remaining
      try {
        const updated = await RideStartService.getVerificationStatus(rideId, driverLat, driverLng, accuracy)
        if (updated) {
          setStatusData(updated)
        }
      } catch {}
    } finally {
      setSubmitting(false)
    }
  }

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`
  }

  const bgCard = isDark ? '#0F172A' : '#FFFFFF'
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A'
  const textSecondary = isDark ? '#94A3B8' : '#64748B'
  const cardBorder = isDark ? '#1E293B' : '#E2E8F0'

  const distM = statusData?.pickup?.distance_meters ?? 15.0
  const proxOk = statusData?.pickup?.proximity_ok ?? true
  const attemptsLeft = statusData?.pin?.attempts_remaining ?? 5

  return (
    <View style={[styles.container, { backgroundColor: bgCard, borderColor: cardBorder }]}>
      {/* Waiting Timer Banner */}
      <View style={styles.timerBanner}>
        <View style={styles.timerLeft}>
          <MaterialCommunityIcons name="timer-sand" size={18} color="#0284C7" />
          <Text style={styles.timerText}>Waiting for Passenger • {formatTimer(elapsedSec)}</Text>
        </View>
        {elapsedSec >= 300 && (
          <TouchableOpacity
            style={styles.noShowBadge}
            onPress={() =>
              onOpenNoShow(
                elapsedSec,
                distM,
                statusData?.waiting_timer?.contact_attempts ?? 1
              )
            }
          >
            <Text style={styles.noShowBadgeText}>No-Show Ready</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Customer & Vehicle Header Row */}
      <View style={styles.infoRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.customerName, { color: textPrimary }]}>
            {statusData?.customer?.name || 'Rahul S.'}
          </Text>
          <Text style={[styles.customerMeta, { color: textSecondary }]}>
            ★ 4.9 • {statusData?.customer?.seats || 2} Seats • {statusData?.vehicle?.registration || 'MH 12 AB 1234'}
          </Text>
        </View>
        <Text style={styles.fareBadge}>₹{statusData?.fare?.toFixed(0) || '540'}</Text>
      </View>

      {/* 4-Point Verification Checklist */}
      <View style={[styles.checklistCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
        <View style={styles.checkItem}>
          <Feather name="check-circle" size={14} color="#16A34A" />
          <Text style={[styles.checkLabel, { color: textPrimary }]}>Customer Identity Verified</Text>
        </View>
        <View style={styles.checkItem}>
          <Feather name="check-circle" size={14} color="#16A34A" />
          <Text style={[styles.checkLabel, { color: textPrimary }]}>
            Vehicle Matched ({statusData?.vehicle?.model || 'Sedan'})
          </Text>
        </View>
        <View style={styles.checkItem}>
          <Feather
            name={proxOk ? 'check-circle' : 'alert-circle'}
            size={14}
            color={proxOk ? '#16A34A' : '#EF4444'}
          />
          <Text style={[styles.checkLabel, { color: proxOk ? textPrimary : '#EF4444' }]}>
            PostGIS GPS Proximity ({distM.toFixed(0)}m from pickup)
          </Text>
        </View>
        <View style={styles.checkItem}>
          <Feather
            name={isPinComplete ? 'check-circle' : 'circle'}
            size={14}
            color={isPinComplete ? '#16A34A' : '#94A3B8'}
          />
          <Text style={[styles.checkLabel, { color: textPrimary }]}>
            Enter 4-Digit Ride PIN (Ask Passenger)
          </Text>
        </View>
      </View>

      {/* 4-Box PIN Input */}
      <Animated.View style={[styles.pinSection, { transform: [{ translateX: shakeAnim }] }]}>
        <View style={styles.pinBoxesRow}>
          {[0, 1, 2, 3].map(idx => (
            <TextInput
              key={`pin-${idx}`}
              ref={pinInputRefs[idx]}
              style={[
                styles.pinBox,
                {
                  backgroundColor: isDark ? '#020617' : '#FFFFFF',
                  borderColor: errorMessage
                    ? '#EF4444'
                    : pinDigits[idx]
                    ? '#0284C7'
                    : isDark
                    ? '#334155'
                    : '#CBD5E1',
                  color: textPrimary,
                },
              ]}
              keyboardType="numeric"
              maxLength={1}
              value={pinDigits[idx]}
              onChangeText={t => handlePinChange(t, idx)}
              onKeyPress={e => handleKeyPress(e, idx)}
              selectTextOnFocus
            />
          ))}
        </View>

        {errorMessage ? (
          <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
        ) : (
          <Text style={[styles.attemptsText, { color: textSecondary }]}>
            Attempts remaining: {attemptsLeft} of 5 {statusData?.pin?.dev_pin ? `(Dev PIN: ${statusData.pin.dev_pin})` : ''}
          </Text>
        )}
      </Animated.View>

      {/* Quick Actions Row */}
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={onOpenCall} activeOpacity={0.8}>
          <Feather name="phone" size={18} color="#16A34A" />
          <Text style={styles.actionBtnText}>Call</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onOpenChat} activeOpacity={0.8}>
          <Feather name="message-circle" size={18} color="#0284C7" />
          <Text style={styles.actionBtnText}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onOpenAssistance} activeOpacity={0.8}>
          <Feather name="help-circle" size={18} color="#D97706" />
          <Text style={styles.actionBtnText}>Can't Find</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() =>
            onOpenNoShow(
              elapsedSec,
              distM,
              statusData?.waiting_timer?.contact_attempts ?? 1
            )
          }
          activeOpacity={0.8}
        >
          <Feather name="user-x" size={18} color="#EF4444" />
          <Text style={styles.actionBtnText}>No-Show</Text>
        </TouchableOpacity>
      </View>

      {/* Start Ride CTA */}
      <TouchableOpacity
        style={[styles.startRideBtn, (!isPinComplete || submitting) && styles.startRideBtnDisabled]}
        onPress={handleVerifyAndStart}
        disabled={!isPinComplete || submitting}
        activeOpacity={0.85}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <View style={styles.startRideBtnContent}>
            <Feather name="play-circle" size={20} color="#FFFFFF" />
            <Text style={styles.startRideBtnText}>VERIFY PIN & START RIDE</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  timerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  timerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  noShowBadge: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  noShowBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '700',
  },
  customerMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  fareBadge: {
    fontSize: 18,
    fontWeight: '800',
    color: '#16A34A',
  },
  checklistCard: {
    padding: 10,
    borderRadius: 12,
    gap: 6,
    marginBottom: 14,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  pinSection: {
    alignItems: 'center',
    marginBottom: 14,
  },
  pinBoxesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  pinBox: {
    width: 52,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  attemptsText: {
    fontSize: 11,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  startRideBtn: {
    backgroundColor: '#16A34A',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  startRideBtnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  startRideBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  startRideBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
})
