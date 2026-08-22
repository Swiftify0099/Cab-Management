/**
 * CancelRideModal — Feature 12: Structured Driver Cancellation Modal
 * Two-step confirmation preventing accidental cancellations while enforcing
 * policy consequences, reason validation, and penalty transparency.
 */
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { WaitingAndCancellationService } from '../../services/waitingAndCancellationService'
import { CancellationReasonItem } from '../../types/waitingAndCancellation'

interface CancelRideModalProps {
  visible: boolean
  isDark: boolean
  rideId: string
  onClose: () => void
  onCancellationSuccess: (msg: string) => void
}

export function CancelRideModal({
  visible,
  isDark,
  rideId,
  onClose,
  onCancellationSuccess,
}: CancelRideModalProps) {
  const [reasons, setReasons] = useState<CancellationReasonItem[]>([])
  const [selectedReason, setSelectedReason] = useState<CancellationReasonItem | null>(null)
  const [step, setStep] = useState<'SELECT_REASON' | 'CONFIRM_CONSEQUENCE'>('SELECT_REASON')
  const [submitting, setSubmitting] = useState(false)
  const [loadingReasons, setLoadingReasons] = useState(false)

  useEffect(() => {
    if (visible) {
      setStep('SELECT_REASON')
      setSelectedReason(null)
      loadReasons()
    }
  }, [visible])

  const loadReasons = async () => {
    setLoadingReasons(true)
    try {
      const items = await WaitingAndCancellationService.getCancellationReasons()
      setReasons(items)
      if (items.length > 0) {
        setSelectedReason(items[0])
      }
    } catch {
      // Fallback loaded by service
    } finally {
      setLoadingReasons(false)
    }
  }

  const handleProceedToConfirm = () => {
    if (!selectedReason) {
      Alert.alert('Required', 'Please select a cancellation reason.')
      return
    }
    setStep('CONFIRM_CONSEQUENCE')
  }

  const handleExecuteCancellation = async () => {
    if (!selectedReason) return
    setSubmitting(true)
    try {
      const res = await WaitingAndCancellationService.cancelRideByDriver(
        rideId,
        selectedReason.code,
        selectedReason.label
      )
      onClose()
      onCancellationSuccess(res.message || 'Ride cancelled.')
    } catch (err: any) {
      Alert.alert('Cancellation Error', err.message || 'Could not cancel ride.')
    } finally {
      setSubmitting(false)
    }
  }

  const bgCard = isDark ? '#0F172A' : '#FFFFFF'
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A'
  const textSecondary = isDark ? '#94A3B8' : '#64748B'

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: bgCard }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: textPrimary }]}>
                {step === 'SELECT_REASON' ? 'Cancel Ride' : 'Confirm Cancellation'}
              </Text>
              <Text style={[styles.subTitle, { color: textSecondary }]}>
                {step === 'SELECT_REASON'
                  ? 'Please select the reason for cancelling'
                  : 'Review the policy impact before confirming'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={22} color={textSecondary} />
            </TouchableOpacity>
          </View>

          {step === 'SELECT_REASON' ? (
            /* STEP 1: Reason Selection */
            <View>
              {loadingReasons ? (
                <ActivityIndicator size="large" color="#0284C7" style={{ marginVertical: 30 }} />
              ) : (
                <ScrollView style={styles.reasonsList} showsVerticalScrollIndicator={false}>
                  {reasons.map((r, idx) => {
                    const isSelected = selectedReason?.code === r.code
                    return (
                      <TouchableOpacity
                        key={`reason-${idx}`}
                        style={[
                          styles.reasonItem,
                          { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' },
                          isSelected && styles.reasonItemSelected,
                        ]}
                        onPress={() => setSelectedReason(r)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                          {isSelected && <View style={styles.radioDot} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.reasonLabel, { color: textPrimary }]}>{r.label}</Text>
                          <View style={styles.badgeRow}>
                            {r.is_penalty_exempt ? (
                              <View style={styles.exemptBadge}>
                                <Text style={styles.exemptBadgeText}>✓ Exempt from Penalty</Text>
                              </View>
                            ) : (
                              <View style={styles.penaltyBadge}>
                                <Text style={styles.penaltyBadgeText}>⚠️ Counts to Cancellation Rate</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    )
                  })}
                </ScrollView>
              )}

              <TouchableOpacity
                style={styles.continueBtn}
                onPress={handleProceedToConfirm}
                activeOpacity={0.85}
              >
                <Text style={styles.continueBtnText}>CONTINUE</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* STEP 2: Consequence Review & Confirmation */
            <View>
              <View style={[styles.summaryCard, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                <Text style={[styles.summaryHeader, { color: textSecondary }]}>SELECTED REASON:</Text>
                <Text style={[styles.summaryReason, { color: textPrimary }]}>
                  {selectedReason?.label}
                </Text>

                <View style={styles.impactBox}>
                  {selectedReason?.is_penalty_exempt ? (
                    <View style={styles.impactRow}>
                      <Feather name="check-circle" size={18} color="#16A34A" />
                      <Text style={styles.impactTextGreen}>
                        This cancellation will NOT affect your driver rating or cancellation score.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.impactRow}>
                      <MaterialCommunityIcons name="alert-circle" size={20} color="#EF4444" />
                      <Text style={styles.impactTextRed}>
                        This is an unexcused cancellation and will increase your cancellation rate.
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.confirmActionsRow}>
                <TouchableOpacity
                  style={styles.keepRideBtn}
                  onPress={onClose}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  <Text style={styles.keepRideBtnText}>KEEP RIDE</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmCancelBtn}
                  onPress={handleExecuteCancellation}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmCancelBtnText}>CANCEL RIDE</Text>
                  )}
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
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    maxHeight: '85%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subTitle: {
    fontSize: 12,
    marginTop: 2,
  },
  reasonsList: {
    maxHeight: 320,
    marginBottom: 16,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    gap: 12,
  },
  reasonItemSelected: {
    borderWidth: 1.5,
    borderColor: '#0284C7',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: '#0284C7',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0284C7',
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  badgeRow: {
    marginTop: 4,
  },
  exemptBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  exemptBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  penaltyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  penaltyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
  },
  continueBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  summaryHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryReason: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  impactBox: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    padding: 12,
    borderRadius: 12,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  impactTextGreen: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#16A34A',
    lineHeight: 16,
  },
  impactTextRed: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
    lineHeight: 16,
  },
  confirmActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  keepRideBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  keepRideBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  confirmCancelBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmCancelBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
})
