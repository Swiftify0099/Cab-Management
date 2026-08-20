/**
 * NoShowConfirmationModal — Feature 8: Anti-Fraud Customer No-Show Verification Modal
 * Ensures driver meets all authoritative requirements before cancelling.
 */
import React, { useState } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { CommunicationService } from '../../services/communicationService'

interface NoShowConfirmationModalProps {
  visible: boolean
  isDark: boolean
  rideId: string
  elapsedSeconds: number
  distanceMeters: number
  contactAttempts: number
  driverLat: number
  driverLng: number
  onClose: () => void
  onNoShowSuccess: (fee: number) => void
}

export function NoShowConfirmationModal({
  visible,
  isDark,
  rideId,
  elapsedSeconds,
  distanceMeters,
  contactAttempts,
  driverLat,
  driverLng,
  onClose,
  onNoShowSuccess,
}: NoShowConfirmationModalProps) {
  const [submitting, setSubmitting] = useState(false)

  const isTimeMet = elapsedSeconds >= 300 // 5 minutes
  const isProximityMet = distanceMeters <= 150.0
  const isContactMet = contactAttempts >= 1
  const isEligible = isTimeMet && isProximityMet && isContactMet

  const formatMinSec = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}m ${s < 10 ? '0' : ''}${s}s`
  }

  const handleConfirmNoShow = async () => {
    if (!isEligible || submitting) return

    setSubmitting(true)
    try {
      const res = await CommunicationService.processNoShow(rideId, driverLat, driverLng)
      if (res.success) {
        Alert.alert(
          'Customer No-Show Confirmed',
          `Ride cancelled. ₹${res.cancellation_fee.toFixed(2)} compensation has been credited to your wallet.`,
          [{ text: 'OK', onPress: () => onNoShowSuccess(res.cancellation_fee) }]
        )
      }
    } catch (err: any) {
      Alert.alert('No-Show Validation Failed', err.message || 'Could not verify no-show.')
    } finally {
      setSubmitting(false)
    }
  }

  const bgCard = isDark ? '#0F172A' : '#FFFFFF'
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A'
  const textSecondary = isDark ? '#94A3B8' : '#64748B'

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: bgCard }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.warnIconWrap}>
              <Feather name="alert-triangle" size={24} color="#EA580C" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.title, { color: textPrimary }]}>Customer No-Show</Text>
              <Text style={[styles.subTitle, { color: textSecondary }]}>Anti-fraud verification checklist</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={22} color={textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Checklist Criteria */}
          <View style={styles.checklist}>
            {/* 1. Waiting Timer */}
            <View style={[styles.checkRow, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
              <View style={styles.checkIcon}>
                <Feather
                  name={isTimeMet ? 'check-circle' : 'clock'}
                  size={20}
                  color={isTimeMet ? '#16A34A' : '#EA580C'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.checkTitle, { color: textPrimary }]}>5-Minute Waiting Time</Text>
                <Text style={[styles.checkSub, { color: textSecondary }]}>
                  {formatMinSec(elapsedSeconds)} elapsed {isTimeMet ? '(Completed ✓)' : '(Need 5m 00s)'}
                </Text>
              </View>
            </View>

            {/* 2. PostGIS GPS Proximity */}
            <View style={[styles.checkRow, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
              <View style={styles.checkIcon}>
                <Feather
                  name={isProximityMet ? 'check-circle' : 'map-pin'}
                  size={20}
                  color={isProximityMet ? '#16A34A' : '#EA580C'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.checkTitle, { color: textPrimary }]}>At Pickup Location</Text>
                <Text style={[styles.checkSub, { color: textSecondary }]}>
                  {distanceMeters.toFixed(1)}m from pickup {isProximityMet ? '(<150m OK ✓)' : '(Too far >150m)'}
                </Text>
              </View>
            </View>

            {/* 3. Contact Attempt */}
            <View style={[styles.checkRow, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
              <View style={styles.checkIcon}>
                <Feather
                  name={isContactMet ? 'check-circle' : 'phone-call'}
                  size={20}
                  color={isContactMet ? '#16A34A' : '#EA580C'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.checkTitle, { color: textPrimary }]}>Contact Attempt</Text>
                <Text style={[styles.checkSub, { color: textSecondary }]}>
                  {contactAttempts} attempt(s) made {isContactMet ? '(Call/Chat logged ✓)' : '(Please call or chat first)'}
                </Text>
              </View>
            </View>
          </View>

          {/* Fee Credit Preview */}
          <View style={styles.feeCard}>
            <MaterialCommunityIcons name="wallet-outline" size={24} color="#16A34A" />
            <View style={{ flex: 1 }}>
              <Text style={styles.feeTitle}>Driver Compensation</Text>
              <Text style={styles.feeSub}>₹50.00 will be credited to your wallet.</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.keepWaitingBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.keepWaitingText}>Keep Waiting</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.noShowBtn, !isEligible && styles.noShowBtnDisabled]}
              onPress={handleConfirmNoShow}
              disabled={!isEligible || submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.noShowBtnText}>Confirm No-Show</Text>
              )}
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
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  container: {
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  warnIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(234, 88, 12, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subTitle: {
    fontSize: 12,
    marginTop: 2,
  },
  checklist: {
    gap: 10,
    marginBottom: 16,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    gap: 12,
  },
  checkIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkSub: {
    fontSize: 11,
    marginTop: 2,
  },
  feeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    padding: 12,
    borderRadius: 14,
    gap: 12,
    marginBottom: 20,
  },
  feeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16A34A',
  },
  feeSub: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  keepWaitingBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(148, 163, 184, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepWaitingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  noShowBtn: {
    flex: 1.2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noShowBtnDisabled: {
    backgroundColor: '#CBD5E1',
    opacity: 0.6,
  },
  noShowBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
