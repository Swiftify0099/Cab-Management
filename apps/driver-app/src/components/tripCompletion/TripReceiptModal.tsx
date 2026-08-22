/**
 * TripReceiptModal — Feature 13: Trip Completion & Financial Receipt Modal
 * Displays transparent itemized fare breakdowns, separation of Customer Fare vs Driver Net Earning,
 * payment collection status (Cash vs Online), and 5-Star passenger rating.
 */
import React, { useState } from 'react'
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
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { RideReceiptData } from '../../types/tripCompletionAndEarnings'
import { TripCompletionAndEarningsService } from '../../services/tripCompletionAndEarningsService'

interface TripReceiptModalProps {
  visible: boolean
  isDark?: boolean
  receipt: RideReceiptData | null
  onClose: () => void
}

const RATING_TAGS = ['Polite', 'On Time', 'Clean', 'Friendly', 'Quiet', 'Helpful']

export function TripReceiptModal({
  visible,
  isDark = false,
  receipt,
  onClose,
}: TripReceiptModalProps) {
  const [selectedRating, setSelectedRating] = useState<number>(5)
  const [selectedTags, setSelectedTags] = useState<string[]>(['Polite', 'On Time'])
  const [submittingRating, setSubmittingRating] = useState(false)
  const [ratingSubmitted, setRatingSubmitted] = useState(false)
  const [showFullBreakdown, setShowFullBreakdown] = useState(false)

  if (!receipt) return null

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag))
    } else {
      setSelectedTags([...selectedTags, tag])
    }
  }

  const handleSubmitRating = async () => {
    setSubmittingRating(true)
    try {
      await TripCompletionAndEarningsService.rateCustomer(
        receipt.ride_id,
        selectedRating,
        selectedTags
      )
      setRatingSubmitted(true)
      Alert.alert('Rating Submitted ⭐', 'Thank you for rating your passenger.')
    } catch (err: any) {
      Alert.alert('Rating Error', err.message || 'Could not submit rating.')
    } finally {
      setSubmittingRating(false)
    }
  }

  const bgCard = isDark ? '#0F172A' : '#FFFFFF'
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A'
  const textSecondary = isDark ? '#94A3B8' : '#64748B'

  const isCash = receipt.payment_method === 'cash'

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: bgCard }]}>
          {/* Top Success Pill */}
          <View style={styles.successBanner}>
            <View style={styles.checkCircle}>
              <Feather name="check" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.successTitle}>Trip Completed Successfully!</Text>
            <Text style={styles.receiptNo}>Receipt #{receipt.receipt_number}</Text>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Primary Net Earning Banner */}
            <View style={[styles.netEarningBox, { backgroundColor: isDark ? '#1E293B' : '#F0FDF4' }]}>
              <Text style={styles.netEarningLabel}>YOUR NET EARNING</Text>
              <Text style={styles.netEarningAmount}>₹{receipt.driver_net_earning.toFixed(0)}</Text>

              <View style={styles.paymentNoticeRow}>
                {isCash ? (
                  <View style={styles.cashNoticeBadge}>
                    <MaterialCommunityIcons name="cash-multiple" size={18} color="#D97706" />
                    <Text style={styles.cashNoticeText}>
                      COLLECT CASH: ₹{receipt.customer_final_fare.toFixed(0)}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.onlineNoticeBadge}>
                    <Feather name="check-circle" size={16} color="#16A34A" />
                    <Text style={styles.onlineNoticeText}>
                      PAID ONLINE (₹{receipt.customer_final_fare.toFixed(0)})
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Glanceable Metrics */}
            <View style={[styles.metricsRow, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
              <View style={styles.metricCol}>
                <Text style={[styles.metricLabel, { color: textSecondary }]}>DISTANCE</Text>
                <Text style={[styles.metricVal, { color: textPrimary }]}>{receipt.distance_km} km</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.metricCol}>
                <Text style={[styles.metricLabel, { color: textSecondary }]}>DURATION</Text>
                <Text style={[styles.metricVal, { color: textPrimary }]}>{receipt.duration_min} min</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.metricCol}>
                <Text style={[styles.metricLabel, { color: textSecondary }]}>COMMISSION</Text>
                <Text style={[styles.metricVal, { color: '#EF4444' }]}>-₹{receipt.platform_commission.toFixed(0)}</Text>
              </View>
            </View>

            {/* Transparent Fare Breakdown Accordion */}
            <TouchableOpacity
              style={[styles.breakdownToggle, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
              onPress={() => setShowFullBreakdown(!showFullBreakdown)}
              activeOpacity={0.8}
            >
              <Text style={[styles.breakdownToggleText, { color: textPrimary }]}>
                {showFullBreakdown ? 'Hide Itemized Breakdown' : 'View Itemized Breakdown'}
              </Text>
              <Feather
                name={showFullBreakdown ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={textSecondary}
              />
            </TouchableOpacity>

            {showFullBreakdown && (
              <View style={[styles.breakdownBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
                <View style={styles.lineItem}>
                  <Text style={[styles.lineLabel, { color: textSecondary }]}>Base Fare</Text>
                  <Text style={[styles.lineVal, { color: textPrimary }]}>₹{receipt.base_fare.toFixed(2)}</Text>
                </View>
                <View style={styles.lineItem}>
                  <Text style={[styles.lineLabel, { color: textSecondary }]}>Distance Charge ({receipt.distance_km} km)</Text>
                  <Text style={[styles.lineVal, { color: textPrimary }]}>₹{receipt.distance_charge.toFixed(2)}</Text>
                </View>
                <View style={styles.lineItem}>
                  <Text style={[styles.lineLabel, { color: textSecondary }]}>Time Charge ({receipt.duration_min} min)</Text>
                  <Text style={[styles.lineVal, { color: textPrimary }]}>₹{receipt.time_charge.toFixed(2)}</Text>
                </View>
                {receipt.waiting_charge > 0 && (
                  <View style={styles.lineItem}>
                    <Text style={[styles.lineLabel, { color: textSecondary }]}>Waiting Charge</Text>
                    <Text style={[styles.lineVal, { color: textPrimary }]}>+₹{receipt.waiting_charge.toFixed(2)}</Text>
                  </View>
                )}
                {receipt.stops_fee > 0 && (
                  <View style={styles.lineItem}>
                    <Text style={[styles.lineLabel, { color: textSecondary }]}>Intermediate Stops Fee</Text>
                    <Text style={[styles.lineVal, { color: textPrimary }]}>+₹{receipt.stops_fee.toFixed(2)}</Text>
                  </View>
                )}
                {receipt.tolls_charge > 0 && (
                  <View style={styles.lineItem}>
                    <Text style={[styles.lineLabel, { color: textSecondary }]}>Tolls Surcharge</Text>
                    <Text style={[styles.lineVal, { color: textPrimary }]}>+₹{receipt.tolls_charge.toFixed(2)}</Text>
                  </View>
                )}
                {receipt.parking_charge > 0 && (
                  <View style={styles.lineItem}>
                    <Text style={[styles.lineLabel, { color: textSecondary }]}>Parking Fee</Text>
                    <Text style={[styles.lineVal, { color: textPrimary }]}>+₹{receipt.parking_charge.toFixed(2)}</Text>
                  </View>
                )}
                <View style={styles.lineItem}>
                  <Text style={[styles.lineLabel, { color: textSecondary }]}>Taxes & GST (5%)</Text>
                  <Text style={[styles.lineVal, { color: textPrimary }]}>₹{receipt.taxes_and_fees.toFixed(2)}</Text>
                </View>

                <View style={styles.innerDivider} />

                <View style={styles.lineItem}>
                  <Text style={[styles.lineLabelBold, { color: textPrimary }]}>Customer Final Fare</Text>
                  <Text style={[styles.lineValBold, { color: textPrimary }]}>₹{receipt.customer_final_fare.toFixed(2)}</Text>
                </View>

                <View style={styles.lineItem}>
                  <Text style={[styles.lineLabel, { color: '#EF4444' }]}>Platform Commission (20%)</Text>
                  <Text style={[styles.lineVal, { color: '#EF4444' }]}>-₹{receipt.platform_commission.toFixed(2)}</Text>
                </View>

                {receipt.tip_amount > 0 && (
                  <View style={styles.lineItem}>
                    <Text style={[styles.lineLabel, { color: '#16A34A' }]}>Passenger Tip</Text>
                    <Text style={[styles.lineVal, { color: '#16A34A' }]}>+₹{receipt.tip_amount.toFixed(2)}</Text>
                  </View>
                )}

                <View style={styles.innerDivider} />

                <View style={styles.lineItem}>
                  <Text style={[styles.lineLabelBold, { color: '#16A34A' }]}>Driver Net Payout</Text>
                  <Text style={[styles.lineValBold, { color: '#16A34A' }]}>₹{receipt.driver_net_earning.toFixed(2)}</Text>
                </View>
              </View>
            )}

            {/* Passenger Rating Card */}
            <View style={[styles.ratingCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
              <Text style={[styles.ratingTitle, { color: textPrimary }]}>Rate Passenger</Text>
              <Text style={[styles.ratingSubtitle, { color: textSecondary }]}>How was your trip experience?</Text>

              {/* 5-Star Row */}
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map(star => (
                  <TouchableOpacity
                    key={`star-${star}`}
                    onPress={() => setSelectedRating(star)}
                    disabled={ratingSubmitted}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                  >
                    <Ionicons
                      name={star <= selectedRating ? 'star' : 'star-outline'}
                      size={32}
                      color="#F59E0B"
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Tag Chips */}
              <View style={styles.tagsGrid}>
                {RATING_TAGS.map(tag => {
                  const isSelected = selectedTags.includes(tag)
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.tagChip,
                        { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' },
                        isSelected && styles.tagChipSelected,
                      ]}
                      onPress={() => handleToggleTag(tag)}
                      disabled={ratingSubmitted}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.tagChipText,
                          { color: textSecondary },
                          isSelected && styles.tagChipTextSelected,
                        ]}
                      >
                        {isSelected ? `✓ ${tag}` : tag}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              {!ratingSubmitted ? (
                <TouchableOpacity
                  style={styles.submitRatingBtn}
                  onPress={handleSubmitRating}
                  disabled={submittingRating}
                  activeOpacity={0.85}
                >
                  {submittingRating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitRatingBtnText}>SUBMIT RATING</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={styles.ratingDoneBadge}>
                  <Text style={styles.ratingDoneText}>✓ Rating Submitted</Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Primary Done / Next Ride CTA */}
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>DONE / GO ONLINE</Text>
          </TouchableOpacity>
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
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '90%',
  },
  successBanner: {
    alignItems: 'center',
    marginBottom: 16,
  },
  checkCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#16A34A',
  },
  receiptNo: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  scrollContent: {
    maxHeight: 440,
    marginBottom: 16,
  },
  netEarningBox: {
    padding: 16,
    borderRadius: 18,
    alignItems: 'center',
    marginBottom: 14,
  },
  netEarningLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
    letterSpacing: 0.5,
  },
  netEarningAmount: {
    fontSize: 38,
    fontWeight: '900',
    color: '#16A34A',
    marginVertical: 4,
  },
  paymentNoticeRow: {
    marginTop: 6,
  },
  cashNoticeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  cashNoticeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#D97706',
  },
  onlineNoticeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  onlineNoticeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#16A34A',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  metricCol: {
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(148, 163, 184, 0.25)',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metricVal: {
    fontSize: 15,
    fontWeight: '800',
  },
  breakdownToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  breakdownToggleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  breakdownBox: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 14,
    gap: 8,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lineLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  lineVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  lineLabelBold: {
    fontSize: 13,
    fontWeight: '800',
  },
  lineValBold: {
    fontSize: 13,
    fontWeight: '800',
  },
  innerDivider: {
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    marginVertical: 4,
  },
  ratingCard: {
    padding: 16,
    borderRadius: 18,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
  },
  ratingTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  ratingSubtitle: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 10,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 14,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  tagChipSelected: {
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  tagChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tagChipTextSelected: {
    color: '#0284C7',
    fontWeight: '700',
  },
  submitRatingBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  submitRatingBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  ratingDoneBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ratingDoneText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  doneBtn: {
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
  doneBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
})
