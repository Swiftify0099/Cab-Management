/**
 * WaitingCard — Feature 11: Pre-Trip Waiting Panel
 * Server-authoritative timer, Free/Paid transition progress bar, and anti-fraud No-Show CTA.
 */
import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { WaitingStatus } from '../../types/waitingAndCancellation'

interface WaitingCardProps {
  isDark: boolean
  waitingStatus: WaitingStatus | null
  loading?: boolean
  onOpenCall: () => void
  onOpenChat: () => void
  onOpenAssistance: () => void
  onOpenCancelModal: () => void
  onTriggerNoShow: () => void
}

export function WaitingCard({
  isDark,
  waitingStatus,
  loading = false,
  onOpenCall,
  onOpenChat,
  onOpenAssistance,
  onOpenCancelModal,
  onTriggerNoShow,
}: WaitingCardProps) {
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`
  }

  const elapsed = waitingStatus?.elapsed_seconds || 0
  const freeRemaining = waitingStatus?.free_waiting_remaining_seconds || 0
  const isPaid = (waitingStatus?.paid_waiting_seconds || 0) > 0
  const waitingCharge = waitingStatus?.waiting_charge || 0
  const isNoShowEligible = waitingStatus?.is_no_show_eligible || false

  const bgCard = isDark ? '#1E293B' : '#FFFFFF'
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A'
  const textSecondary = isDark ? '#94A3B8' : '#64748B'

  // Free waiting progress (0 to 1)
  const freeTotal = waitingStatus?.free_waiting_seconds_total || 180
  const freeProgress = Math.min(Math.max((freeTotal - freeRemaining) / freeTotal, 0), 1)

  return (
    <View style={[styles.container, { backgroundColor: bgCard }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.statusIndicator}>
          <View style={[styles.pulseDot, { backgroundColor: isPaid ? '#F59E0B' : '#0284C7' }]} />
          <Text style={[styles.headerTitle, { color: textPrimary }]}>
            {isPaid ? 'Paid Waiting in Progress' : 'Waiting for Passenger'}
          </Text>
        </View>
        <TouchableOpacity onPress={onOpenCancelModal} style={styles.cancelLink}>
          <Text style={styles.cancelLinkText}>Cancel Ride</Text>
        </TouchableOpacity>
      </View>

      {/* Large Timer + Charge Box */}
      <View style={[styles.timerBox, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
        <View style={styles.timerCol}>
          <Text style={[styles.timerLabel, { color: textSecondary }]}>TOTAL WAITING</Text>
          <Text style={[styles.timerValue, { color: textPrimary }]}>{formatTimer(elapsed)}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.chargeCol}>
          <Text style={[styles.timerLabel, { color: textSecondary }]}>
            {isPaid ? 'WAITING FEE' : 'FREE WAITING'}
          </Text>
          {isPaid ? (
            <Text style={styles.chargeValueGold}>+₹{waitingCharge.toFixed(0)}</Text>
          ) : (
            <Text style={styles.chargeValueGreen}>{formatTimer(freeRemaining)} left</Text>
          )}
        </View>
      </View>

      {/* Free Waiting Bar */}
      {!isPaid && (
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${freeProgress * 100}%` }]} />
        </View>
      )}

      {/* Communication Quick Row */}
      <View style={styles.commRow}>
        <TouchableOpacity style={styles.commBtn} onPress={onOpenCall} activeOpacity={0.8}>
          <Feather name="phone" size={17} color="#16A34A" />
          <Text style={styles.commBtnText}>Call</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.commBtn} onPress={onOpenChat} activeOpacity={0.8}>
          <Feather name="message-square" size={17} color="#0284C7" />
          <Text style={styles.commBtnText}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.commBtn} onPress={onOpenAssistance} activeOpacity={0.8}>
          <Feather name="help-circle" size={17} color="#D97706" />
          <Text style={styles.commBtnText}>Can't Find</Text>
        </TouchableOpacity>
      </View>

      {/* No-Show Action CTA */}
      {isNoShowEligible ? (
        <TouchableOpacity
          style={styles.noShowBtnActive}
          onPress={onTriggerNoShow}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={styles.ctaRow}>
              <MaterialCommunityIcons name="account-cancel" size={20} color="#FFFFFF" />
              <Text style={styles.ctaText}>CANCEL AS NO-SHOW (₹50 FEE CREDITED)</Text>
            </View>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.waitingNoticeBox}>
          <Feather name="clock" size={14} color={textSecondary} />
          <Text style={[styles.waitingNoticeText, { color: textSecondary }]}>
            No-Show cancellation will unlock after 5 min waiting & 1 contact attempt.
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cancelLink: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  cancelLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 10,
  },
  timerCol: {
    alignItems: 'center',
  },
  chargeCol: {
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(148, 163, 184, 0.25)',
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  timerValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  chargeValueGreen: {
    fontSize: 18,
    fontWeight: '800',
    color: '#16A34A',
  },
  chargeValueGold: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F59E0B',
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0284C7',
  },
  commRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  commBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
  },
  commBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noShowBtnActive: {
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  waitingNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  waitingNoticeText: {
    fontSize: 11,
    textAlign: 'center',
  },
})
