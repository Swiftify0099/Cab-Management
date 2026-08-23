/**
 * Customer App — Multi-Bucket Wallet & Funds Ledger (Feature 12)
 * Manages:
 * - Cash Wallet Balance
 * - Promotional Credits Balance (non-withdrawable)
 * - Referral Rewards Balance
 * - Pending Refunds
 * - Saved Payment Methods Management
 * - Reward Points Redemption
 * - Full double-entry Ledger History with filters
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { walletApi, paymentApi } from '../../src/api/client'
import { useTheme } from '../../src/contexts/ThemeContext'
import {
  AppText,
  AppLoader,
  AppChip,
  AppEmptyState,
  AppButton,
  AppDivider,
  AppCard,
} from '../../src/components/ui'
import SavedMethodsSheet from '../../src/components/payment/SavedMethodsSheet'

interface LedgerEntry {
  id: string
  type: 'credit' | 'debit' | 'refund'
  ledger_type: string
  direction: string
  bucket: string
  amount: number
  description: string
  balance_after: number
  expires_at?: string
  created_at: string
}

interface WalletSummary {
  cash_balance: number
  promo_credit_balance: number
  referral_reward_balance: number
  pending_refund_balance: number
  total_usable_balance: number
  reward_points: number
  reward_value: number
}

const TX_COLORS: Record<string, string> = {
  credit: '#16A34A',
  debit: '#EF4444',
  refund: '#D97706',
}

const TX_ICONS: Record<string, string> = {
  credit: 'arrow-down-left',
  debit: 'arrow-up-right',
  refund: 'rotate-ccw',
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function WalletTab() {
  const { theme, isDark } = useTheme()
  const [wallet, setWallet] = useState<WalletSummary>({
    cash_balance: 0,
    promo_credit_balance: 0,
    referral_reward_balance: 0,
    pending_refund_balance: 0,
    total_usable_balance: 0,
    reward_points: 0,
    reward_value: 0,
  })
  const [transactions, setTransactions] = useState<LedgerEntry[]>([])
  const [activeFilter, setActiveFilter] = useState<'all' | 'credit' | 'debit' | 'refund'>('all')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Modals
  const [showSavedMethods, setShowSavedMethods] = useState(false)
  const [showRedeemModal, setShowRedeemModal] = useState(false)
  const [redeemPointsInput, setRedeemPointsInput] = useState('')
  const [redeeming, setRedeeming] = useState(false)

  const loadWallet = useCallback(async () => {
    try {
      const [walletRes, txRes] = await Promise.allSettled([
        walletApi.getSummary(),
        walletApi.getLedger({ type: activeFilter }),
      ])

      if (walletRes.status === 'fulfilled') {
        const d = walletRes.value.data?.data || {}
        setWallet({
          cash_balance: d.cash_balance ?? d.balance ?? 0,
          promo_credit_balance: d.promo_credit_balance ?? 0,
          referral_reward_balance: d.referral_reward_balance ?? 0,
          pending_refund_balance: d.pending_refund_balance ?? 0,
          total_usable_balance: d.total_usable_balance ?? (d.cash_balance || 0),
          reward_points: d.reward_points ?? 0,
          reward_value: d.reward_value ?? 0,
        })
      }

      if (txRes.status === 'fulfilled') {
        const data = txRes.value.data?.data?.transactions || txRes.value.data?.data || []
        setTransactions(Array.isArray(data) ? data : [])
      } else {
        setTransactions([])
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [activeFilter])

  useEffect(() => {
    loadWallet()
  }, [loadWallet])

  const onRefresh = () => {
    setRefreshing(true)
    loadWallet()
  }

  const handleAddMoney = () => {
    router.push('/payment?mode=topup' as any)
  }

  const handleRedeemPoints = async () => {
    const pts = parseInt(redeemPointsInput, 10)
    if (isNaN(pts) || pts < 10) {
      Alert.alert('Invalid Points', 'Minimum 10 reward points required to redeem')
      return
    }
    if (pts > wallet.reward_points) {
      Alert.alert('Insufficient Points', `You only have ${wallet.reward_points} reward points`)
      return
    }
    setRedeeming(true)
    try {
      await walletApi.redeemPoints(pts)
      setShowRedeemModal(false)
      setRedeemPointsInput('')
      await loadWallet()
      Alert.alert('🎉 Points Redeemed!', `₹${(pts * 0.1).toFixed(2)} added to your wallet.`)
    } catch (e: any) {
      Alert.alert('Redemption Failed', e?.response?.data?.detail || 'Could not redeem points')
    } finally {
      setRedeeming(false)
    }
  }

  const FILTERS = ['all', 'credit', 'debit', 'refund'] as const
  const FILTER_LABELS = { all: 'All Activity', credit: 'Added', debit: 'Spent', refund: 'Refunds' }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <SafeAreaView style={styles.safeArea}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <View>
            <AppText variant="title" bold>My Funds & Wallet</AppText>
            <AppText variant="small" color="muted">Double-Entry Authoritative Ledger</AppText>
          </View>
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}
            onPress={() => setShowSavedMethods(true)}
          >
            <Feather name="credit-card" size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        >
          {/* Main Available Balance Card */}
          <LinearGradient
            colors={isDark ? ['#0F172A', '#1E293B'] : ['#0284C7', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mainBalanceCard}
          >
            <View style={styles.balanceHeaderRow}>
              <View>
                <AppText variant="bodyS" color="white" style={{ opacity: 0.9 }}>Total Usable Balance</AppText>
                <AppText variant="display" bold color="white" style={{ marginTop: 2 }}>
                  ₹{wallet.total_usable_balance.toFixed(2)}
                </AppText>
              </View>
              <View style={styles.currencyBadge}>
                <AppText variant="caption" bold color="white">INR ₹</AppText>
              </View>
            </View>

            {/* Sub-Buckets Breakdown */}
            <View style={styles.subBucketRow}>
              <View style={styles.subBucketItem}>
                <AppText variant="caption" color="white" style={{ opacity: 0.75 }}>Cash Balance</AppText>
                <AppText variant="bodyS" bold color="white">₹{wallet.cash_balance.toFixed(2)}</AppText>
              </View>
              <View style={styles.bucketDivider} />
              <View style={styles.subBucketItem}>
                <AppText variant="caption" color="white" style={{ opacity: 0.75 }}>Promo Credits</AppText>
                <AppText variant="bodyS" bold color="white">₹{wallet.promo_credit_balance.toFixed(2)}</AppText>
              </View>
              <View style={styles.bucketDivider} />
              <View style={styles.subBucketItem}>
                <AppText variant="caption" color="white" style={{ opacity: 0.75 }}>Referrals</AppText>
                <AppText variant="bodyS" bold color="white">₹{wallet.referral_reward_balance.toFixed(2)}</AppText>
              </View>
            </View>

            {wallet.pending_refund_balance > 0 && (
              <View style={styles.pendingRefundBanner}>
                <Feather name="clock" size={14} color="#FDE047" />
                <AppText variant="caption" bold style={{ color: '#FDE047', marginLeft: 6 }}>
                  ₹{wallet.pending_refund_balance.toFixed(2)} pending refund processing
                </AppText>
              </View>
            )}

            {/* Action Buttons Row */}
            <View style={styles.cardActionsRow}>
              <TouchableOpacity style={styles.actionBtnWhite} onPress={handleAddMoney}>
                <Feather name="plus-circle" size={16} color="#0284C7" />
                <AppText variant="bodyS" bold style={{ color: '#0284C7', marginLeft: 6 }}>
                  Add Money
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtnOutline} onPress={() => setShowSavedMethods(true)}>
                <Feather name="credit-card" size={16} color="white" />
                <AppText variant="bodyS" bold color="white" style={{ marginLeft: 6 }}>
                  Saved Methods
                </AppText>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Reward Points Card */}
          <View style={[styles.rewardCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
            <View style={styles.rewardLeft}>
              <View style={styles.rewardIconWrap}>
                <MaterialCommunityIcons name="star-circle" size={28} color="#EAB308" />
              </View>
              <View>
                <AppText variant="body" bold>{wallet.reward_points} Reward Points</AppText>
                <AppText variant="small" color="muted">Worth ₹{wallet.reward_value.toFixed(2)} in ride deductions</AppText>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.redeemBtn, { backgroundColor: `${theme.colors.primary}18` }]}
              onPress={() => setShowRedeemModal(true)}
              disabled={wallet.reward_points < 10}
            >
              <AppText variant="small" bold color="primary">Redeem</AppText>
            </TouchableOpacity>
          </View>

          {/* Activity Section Header & Filters */}
          <View style={styles.activityHeaderRow}>
            <AppText variant="subtitle" semibold>Ledger Activity</AppText>
            <AppText variant="small" color="muted">{transactions.length} records</AppText>
          </View>

          <View style={styles.filterRow}>
            {FILTERS.map((f) => (
              <AppChip
                key={f}
                label={FILTER_LABELS[f]}
                active={activeFilter === f}
                onPress={() => setActiveFilter(f)}
              />
            ))}
          </View>

          {/* Transactions Ledger List */}
          {loading ? (
            <View style={styles.loadingBox}>
              <AppLoader />
              <AppText variant="bodyS" color="muted" style={{ marginTop: 8 }}>Loading ledger history...</AppText>
            </View>
          ) : transactions.length === 0 ? (
            <AppEmptyState
              icon="💳"
              title="No transactions found"
              subtitle="All payments, refunds, and promo credits will appear here."
            />
          ) : (
            transactions.map((tx) => {
              const txType = tx.direction === 'CREDIT' ? 'credit' : 'debit'
              const color = TX_COLORS[txType]
              return (
                <View
                  key={tx.id}
                  style={[
                    styles.txCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.cardBorder,
                    },
                  ]}
                >
                  <View style={[styles.txIconBox, { backgroundColor: `${color}18` }]}>
                    <Feather name={TX_ICONS[txType] as any} size={18} color={color} />
                  </View>

                  <View style={styles.txInfo}>
                    <View style={styles.txTitleRow}>
                      <AppText variant="bodyS" bold numberOfLines={1} style={{ flex: 1 }}>
                        {tx.description}
                      </AppText>
                      <AppText variant="bodyS" bold style={{ color }}>
                        {tx.direction === 'CREDIT' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                      </AppText>
                    </View>

                    <View style={styles.txMetaRow}>
                      <AppText variant="caption" color="muted">
                        {formatDate(tx.created_at)} • Bal: ₹{tx.balance_after.toFixed(2)}
                      </AppText>
                      {tx.bucket !== 'CASH' && (
                        <View style={[styles.bucketTag, { backgroundColor: `${theme.colors.primary}15` }]}>
                          <AppText variant="caption" bold color="primary">
                            {tx.bucket.replace('_', ' ')}
                          </AppText>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              )
            })
          )}
        </ScrollView>

        {/* Saved Methods Sheet */}
        <SavedMethodsSheet
          visible={showSavedMethods}
          onClose={() => setShowSavedMethods(false)}
        />

        {/* Redeem Points Modal */}
        <Modal visible={showRedeemModal} transparent animationType="fade" onRequestClose={() => setShowRedeemModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.modalHeader}>
                <AppText variant="h3" bold>Redeem Reward Points</AppText>
                <TouchableOpacity onPress={() => setShowRedeemModal(false)}>
                  <Feather name="x" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <AppText variant="bodyS" color="muted" style={{ marginTop: 4 }}>
                Convert points directly to cash wallet balance. 10 Points = ₹1.00
              </AppText>

              <View style={[styles.modalInputBox, { borderColor: theme.colors.inputBorder, backgroundColor: theme.colors.backgroundAlt }]}>
                <TextInput
                  style={[styles.modalInput, { color: theme.colors.textPrimary }]}
                  placeholder={`Available: ${wallet.reward_points} pts`}
                  placeholderTextColor={theme.colors.placeholder}
                  keyboardType="numeric"
                  value={redeemPointsInput}
                  onChangeText={setRedeemPointsInput}
                />
              </View>

              <View style={styles.modalBtnRow}>
                <AppButton variant="outline" style={{ flex: 1, marginRight: 8 }} onPress={() => setShowRedeemModal(false)}>
                  Cancel
                </AppButton>
                <AppButton
                  variant="primary"
                  style={{ flex: 1 }}
                  loading={redeeming}
                  onPress={handleRedeemPoints}
                >
                  Convert
                </AppButton>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    paddingHorizontal: 20,
  },
  mainBalanceCard: {
    padding: 20,
    borderRadius: 24,
    marginTop: 6,
    marginBottom: 16,
  },
  balanceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  currencyBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  subBucketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 16,
  },
  subBucketItem: {
    flex: 1,
    alignItems: 'center',
  },
  bucketDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  pendingRefundBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(234, 179, 8, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 12,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  actionBtnWhite: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 12,
    borderRadius: 14,
  },
  actionBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    borderRadius: 14,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  rewardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rewardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  redeemBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  activityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  loadingBox: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  txIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txInfo: {
    flex: 1,
  },
  txTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  bucketTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalInputBox: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginTop: 16,
    marginBottom: 20,
  },
  modalInput: {
    height: 48,
    fontSize: 16,
    fontWeight: '600',
  },
  modalBtnRow: {
    flexDirection: 'row',
  },
})
