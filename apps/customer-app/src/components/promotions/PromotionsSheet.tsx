/**
 * Feature 13: Unified Promotions & Offers Bottom Sheet
 * Displays active auto-applied offers, first-ride benefits, cashback campaigns,
 * and coupons with 1-tap apply, promo code manual validation, and T&C expansion.
 */
import React, { useState, useEffect } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native'
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from '../../contexts/ThemeContext'
import { useTranslation } from '../../i18n'
import { AppText, AppButton } from '../ui'
import { promotionApi } from '../../api/client'

export interface PromotionItem {
  campaign_id: string
  code?: string
  title: string
  description: string
  campaign_type: string
  discount_type: string
  discount_value: number
  max_discount_amount?: number | null
  min_fare: number
  cashback_amount: number
  service_type: string
  banner_gradient?: string[]
  expires_at?: string | null
  is_auto_offer: boolean
  terms?: string
}

interface PromotionsSheetProps {
  visible: boolean
  onClose: () => void
  bookingAmount: number
  serviceType?: string
  appliedPromoId?: string | null
  onApplyPromo: (promo: {
    campaign_id: string
    code?: string
    discount_amount: number
    cashback_amount: number
    title: string
  }) => void
}

export function PromotionsSheet({
  visible,
  onClose,
  bookingAmount,
  serviceType = 'CAB',
  appliedPromoId,
  onApplyPromo,
}: PromotionsSheetProps) {
  const { theme, isDark } = useTheme()
  const { t } = useTranslation()

  const [loading, setLoading] = useState(false)
  const [promotions, setPromotions] = useState<PromotionItem[]>([])
  const [inputCode, setInputCode] = useState('')
  const [validating, setValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [validationSuccess, setValidationSuccess] = useState<string | null>(null)
  const [expandedTermsId, setExpandedTermsId] = useState<string | null>(null)

  useEffect(() => {
    if (visible) {
      loadPromotions()
      setValidationError(null)
      setValidationSuccess(null)
    }
  }, [visible, serviceType])

  const loadPromotions = async () => {
    setLoading(true)
    try {
      const res = await promotionApi.getAvailable({ service_type: serviceType })
      const list = res.data?.data || res.data || []
      setPromotions(Array.isArray(list) ? list : [])
    } catch (err) {
      console.warn('[PromotionsSheet] Error loading available promotions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApplyCode = async (codeToApply?: string, campaignId?: string) => {
    const targetCode = codeToApply || inputCode.trim()
    if (!targetCode && !campaignId) {
      setValidationError('Please enter a valid promo code')
      return
    }

    setValidating(true)
    setValidationError(null)
    setValidationSuccess(null)

    try {
      const res = await promotionApi.applyPromo({
        code: targetCode ? targetCode.toUpperCase() : undefined,
        campaign_id: campaignId,
        booking_amount: bookingAmount > 0 ? bookingAmount : 150,
        service_type: serviceType,
      })

      const data = res.data?.data || res.data
      if (data.is_applied) {
        setValidationSuccess(data.message || 'Promo applied successfully!')
        onApplyPromo({
          campaign_id: data.campaign_id,
          code: data.code,
          discount_amount: data.discount_amount || 0,
          cashback_amount: data.cashback_amount || 0,
          title: data.title || targetCode,
        })
        setTimeout(() => {
          onClose()
        }, 600)
      } else {
        setValidationError(data.message || 'Promo code could not be applied.')
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Invalid or expired promo code.'
      setValidationError(msg)
    } finally {
      setValidating(false)
    }
  }

  const toggleTerms = (id: string) => {
    setExpandedTermsId(expandedTermsId === id ? null : id)
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <MaterialCommunityIcons name="tag-multiple" size={24} color={theme.colors.primary} />
              <AppText variant="h3" style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
                {t('promotions.title', 'Offers & Promotions')}
              </AppText>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close-circle" size={26} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Manual Promo Input Box */}
          <View style={styles.inputContainer}>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: theme.colors.backgroundAlt,
                  borderColor: validationError ? theme.colors.error : theme.colors.border,
                },
              ]}
            >
              <Ionicons name="pricetag-outline" size={18} color={theme.colors.textMuted} />
              <TextInput
                style={[styles.input, { color: theme.colors.textPrimary }]}
                placeholder={t('promotions.placeholder', 'Enter Promo Code (e.g. WELCOME50)')}
                placeholderTextColor={theme.colors.textMuted}
                value={inputCode}
                onChangeText={(text) => {
                  setInputCode(text)
                  if (validationError) setValidationError(null)
                }}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[
                  styles.applyCodeBtn,
                  { backgroundColor: inputCode.trim() ? theme.colors.primary : theme.colors.cardBorder },
                ]}
                disabled={!inputCode.trim() || validating}
                onPress={() => handleApplyCode()}
              >
                {validating ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <AppText style={styles.applyCodeBtnText}>
                    {t('promotions.apply', 'Apply')}
                  </AppText>
                )}
              </TouchableOpacity>
            </View>

            {validationError && (
              <AppText style={[styles.statusText, { color: theme.colors.error }]}>
                {validationError}
              </AppText>
            )}
            {validationSuccess && (
              <AppText style={[styles.statusText, { color: theme.colors.success }]}>
                {validationSuccess}
              </AppText>
            )}
          </View>

          {/* Available Offers List */}
          <ScrollView
            contentContainerStyle={styles.scrollList}
            showsVerticalScrollIndicator={false}
          >
            <AppText variant="caption" style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
              {t('promotions.available_offers', 'AVAILABLE OFFERS FOR YOUR RIDE')}
            </AppText>

            {loading ? (
              <View style={styles.loaderBox}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <AppText style={[styles.loaderText, { color: theme.colors.textMuted }]}>
                  {t('promotions.finding_best', 'Finding best offers for you...')}
                </AppText>
              </View>
            ) : promotions.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.colors.backgroundAlt }]}>
                <MaterialCommunityIcons name="ticket-percent-outline" size={40} color={theme.colors.textMuted} />
                <AppText style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                  {t('promotions.no_offers', 'No active offers right now')}
                </AppText>
                <AppText style={[styles.emptySub, { color: theme.colors.textMuted }]}>
                  {t('promotions.check_back', 'Check back later or enter a coupon code above.')}
                </AppText>
              </View>
            ) : (
              promotions.map((promo) => {
                const isApplied = appliedPromoId === promo.campaign_id
                const isTermsExpanded = expandedTermsId === promo.campaign_id

                return (
                  <View
                    key={promo.campaign_id}
                    style={[
                      styles.promoCard,
                      {
                        backgroundColor: theme.colors.backgroundAlt,
                        borderColor: isApplied ? theme.colors.success : theme.colors.cardBorder,
                        borderWidth: isApplied ? 1.5 : 1,
                      },
                    ]}
                  >
                    {/* Header badge row */}
                    <View style={styles.cardHeader}>
                      <View style={styles.badgeRow}>
                        {promo.is_auto_offer ? (
                          <View style={[styles.badge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                            <Ionicons name="flash" size={12} color="#10B981" />
                            <AppText style={[styles.badgeText, { color: '#10B981' }]}>
                              AUTO-APPLIED
                            </AppText>
                          </View>
                        ) : (
                          <View style={[styles.badge, { backgroundColor: 'rgba(79, 70, 229, 0.15)' }]}>
                            <Ionicons name="pricetag" size={12} color="#4F46E5" />
                            <AppText style={[styles.badgeText, { color: '#4F46E5' }]}>
                              {promo.code || 'COUPON'}
                            </AppText>
                          </View>
                        )}

                        {promo.cashback_amount > 0 && (
                          <View style={[styles.badge, { backgroundColor: 'rgba(234, 88, 12, 0.15)' }]}>
                            <Ionicons name="wallet-outline" size={12} color="#EA580C" />
                            <AppText style={[styles.badgeText, { color: '#EA580C' }]}>
                              CASHBACK
                            </AppText>
                          </View>
                        )}
                      </View>

                      {/* 1-Tap Apply Button */}
                      <TouchableOpacity
                        style={[
                          styles.applyBtn,
                          {
                            backgroundColor: isApplied
                              ? theme.colors.success
                              : theme.colors.primary,
                          },
                        ]}
                        onPress={() => handleApplyCode(promo.code, promo.campaign_id)}
                      >
                        <AppText style={styles.applyBtnText}>
                          {isApplied ? '✓ Applied' : 'Apply'}
                        </AppText>
                      </TouchableOpacity>
                    </View>

                    {/* Title and Description */}
                    <AppText variant="h4" style={[styles.promoTitle, { color: theme.colors.textPrimary }]}>
                      {promo.title}
                    </AppText>
                    <AppText style={[styles.promoDesc, { color: theme.colors.textMuted }]}>
                      {promo.description}
                    </AppText>

                    {/* Footer / Terms Accordion */}
                    <View style={styles.cardFooter}>
                      <TouchableOpacity
                        style={styles.termsBtn}
                        onPress={() => toggleTerms(promo.campaign_id)}
                      >
                        <AppText style={[styles.termsText, { color: theme.colors.primary }]}>
                          {isTermsExpanded ? 'Hide T&C ▲' : 'View T&C ▼'}
                        </AppText>
                      </TouchableOpacity>

                      {promo.min_fare > 0 && (
                        <AppText style={[styles.minFareText, { color: theme.colors.textMuted }]}>
                          Min fare: ₹{promo.min_fare}
                        </AppText>
                      )}
                    </View>

                    {isTermsExpanded && (
                      <View style={[styles.termsBox, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
                        <AppText style={[styles.termsContent, { color: theme.colors.textSecondary }]}>
                          {promo.terms || 'Standard promotion terms apply. Cannot be combined with other offers.'}
                        </AppText>
                      </View>
                    )}
                  </View>
                )
              })
            )}
          </ScrollView>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontWeight: '700',
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  applyCodeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  applyCodeBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    marginLeft: 4,
  },
  scrollList: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  sectionTitle: {
    letterSpacing: 0.8,
    fontWeight: '700',
    marginVertical: 12,
  },
  loaderBox: {
    padding: 30,
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 10,
    fontSize: 13,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginVertical: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  promoCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  applyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  applyBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  promoTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  promoDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
    paddingTop: 8,
  },
  termsBtn: {
    paddingVertical: 4,
  },
  termsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  minFareText: {
    fontSize: 12,
  },
  termsBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
  },
  termsContent: {
    fontSize: 11,
    lineHeight: 16,
  },
})
