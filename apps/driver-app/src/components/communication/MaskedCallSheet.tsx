/**
 * MaskedCallSheet — Feature 8: Secure Masked Phone Calling Modal
 * Protects driver and passenger privacy — actual numbers are never exposed.
 */
import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { CommunicationService } from '../../services/communicationService'
import { CallStatus, CallSessionData } from '../../types/communication'

interface MaskedCallSheetProps {
  visible: boolean
  isDark: boolean
  rideId: string
  customerName?: string
  customerRating?: number
  onClose: () => void
}

export function MaskedCallSheet({
  visible,
  isDark,
  rideId,
  customerName = 'Rahul S.',
  customerRating = 4.9,
  onClose,
}: MaskedCallSheetProps) {
  const [callSession, setCallSession] = useState<CallSessionData | null>(null)
  const [status, setStatus] = useState<CallStatus>('requesting')
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeaker, setIsSpeaker] = useState(false)
  const [callSeconds, setCallSeconds] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pulseAnim = useRef(new Animated.Value(1)).current

  // Start pulse animation for ringing state
  useEffect(() => {
    if (visible && (status === 'requesting' || status === 'ringing')) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 800, useNativeDriver: true }),
        ])
      ).start()
    } else {
      pulseAnim.setValue(1)
    }
  }, [visible, status, pulseAnim])

  // Initiate call when sheet opens
  useEffect(() => {
    if (!visible) {
      if (timerRef.current) clearInterval(timerRef.current)
      setCallSeconds(0)
      setStatus('requesting')
      setErrorMessage(null)
      return
    }

    let isMounted = true
    const initiate = async () => {
      try {
        setStatus('requesting')
        const data = await CommunicationService.initiateMaskedCall(rideId)
        if (isMounted) {
          setCallSession(data)
          setStatus('ringing')

          // Simulate auto-answer in 3 seconds for seamless demo testing
          setTimeout(() => {
            if (isMounted) {
              setStatus('connected')
              CommunicationService.updateCallStatus(data.call_session_id, 'connected')
              timerRef.current = setInterval(() => {
                setCallSeconds(s => s + 1)
              }, 1000)
            }
          }, 2500)
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(err.message || 'Call could not be initiated.')
          setStatus('failed')
        }
      }
    }

    initiate()

    return () => {
      isMounted = false
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [visible, rideId])

  const handleEndCall = async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setStatus('ended')
    if (callSession?.call_session_id) {
      await CommunicationService.updateCallStatus(callSession.call_session_id, 'ended', callSeconds)
    }
    setTimeout(() => {
      onClose()
    }, 1200)
  }

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`
  }

  const bgCard = isDark ? '#0F172A' : '#FFFFFF'
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A'
  const textSecondary = isDark ? '#94A3B8' : '#64748B'

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: bgCard }]}>
          {/* Header Bar */}
          <View style={styles.topBar}>
            <View style={styles.privacyBadge}>
              <Feather name="shield" size={13} color="#16A34A" />
              <Text style={styles.privacyText}>Masked Call • Phone Numbers Private</Text>
            </View>
            <TouchableOpacity onPress={handleEndCall} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={22} color={textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Passenger Avatar & Info */}
          <View style={styles.avatarSection}>
            <Animated.View style={[styles.avatarWrap, { transform: [{ scale: pulseAnim }] }]}>
              <MaterialCommunityIcons name="account" size={48} color="#0284C7" />
            </Animated.View>
            <Text style={[styles.customerName, { color: textPrimary }]}>{customerName}</Text>
            <View style={styles.ratingRow}>
              <Text style={styles.ratingBadge}>★ {customerRating.toFixed(1)}</Text>
              <Text style={[styles.passengerRole, { color: textSecondary }]}>Passenger</Text>
            </View>
          </View>

          {/* Call Status Display */}
          <View style={styles.statusSection}>
            {errorMessage ? (
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            ) : status === 'requesting' ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#0284C7" />
                <Text style={[styles.statusText, { color: textSecondary }]}>Securing masked connection...</Text>
              </View>
            ) : status === 'ringing' ? (
              <Text style={styles.ringingText}>🔔 Ringing passenger...</Text>
            ) : status === 'connected' ? (
              <View style={styles.connectedRow}>
                <View style={styles.greenDot} />
                <Text style={styles.connectedTimer}>{formatTimer(callSeconds)}</Text>
                <Text style={[styles.proxyNumber, { color: textSecondary }]}>
                  via {callSession?.virtual_proxy_number || '+91-80-4567-8900'}
                </Text>
              </View>
            ) : (
              <Text style={[styles.statusText, { color: textSecondary }]}>Call Ended</Text>
            )}
          </View>

          {/* In-Call Action Controls */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
              onPress={() => setIsMuted(v => !v)}
              activeOpacity={0.8}
            >
              <Feather name={isMuted ? 'mic-off' : 'mic'} size={22} color={isMuted ? '#EF4444' : textPrimary} />
              <Text style={[styles.controlLabel, { color: textSecondary }]}>{isMuted ? 'Muted' : 'Mute'}</Text>
            </TouchableOpacity>

            {/* End Call Button */}
            <TouchableOpacity
              style={styles.endCallBtn}
              onPress={handleEndCall}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="phone-hangup" size={28} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlBtn, isSpeaker && styles.controlBtnActive]}
              onPress={() => setIsSpeaker(v => !v)}
              activeOpacity={0.8}
            >
              <Feather name={isSpeaker ? 'volume-2' : 'volume-1'} size={22} color={isSpeaker ? '#0284C7' : textPrimary} />
              <Text style={[styles.controlLabel, { color: textSecondary }]}>{isSpeaker ? 'Speaker' : 'Earpiece'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 40,
    alignItems: 'center',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  privacyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16A34A',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  customerName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  passengerRole: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusSection: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  ringingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0284C7',
  },
  connectedRow: {
    alignItems: 'center',
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
    marginBottom: 2,
  },
  connectedTimer: {
    fontSize: 20,
    fontWeight: '700',
    color: '#16A34A',
    letterSpacing: 1,
  },
  proxyNumber: {
    fontSize: 11,
    marginTop: 2,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
    textAlign: 'center',
  },
  controlsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  controlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  controlBtnActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  controlLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  endCallBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
})
