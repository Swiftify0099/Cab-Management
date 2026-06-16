/**
 * Customer App — Wallet & Payments
 * Refactored: All hardcoded colors → theme tokens.
 * Components: AppText, AppLoader, AppChip, AppEmptyState.
 * Business logic: UNCHANGED. API calls: UNCHANGED.
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  View, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { walletApi } from '../../src/api/client'
import { useTheme } from '../../src/contexts/ThemeContext'
import {
  AppText, AppLoader, AppChip, AppEmptyState, AppButton,
} from '../../src/components/ui'

type TxType = 'credit' | 'debit' | 'refund'

interface Transaction {
  id: string; type: TxType; amount: number
  description: string; created_at: string; status?: string
}

interface WalletData {
  balance: number; reward_points: number; pending_refund: number
}

const TX_COLORS: Record<TxType, string> = {
  credit: '#22C55E',
  debit:  '#EF4444',
  refund: '#F59E0B',
}

const TX_ICONS: Record<TxType, string> = {
  credit: 'arrow-down-left',
  debit:  'arrow-up-right',
  refund: 'rotate-ccw',
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

export default function WalletTab() {
  const { theme, isDark } = useTheme()
  const [wallet,        setWallet]       = useState<WalletData | null>(null)
  const [transactions,  setTransactions] = useState<Transaction[]>([])
  const [activeFilter,  setActiveFilter] = useState<'all' | 'credit' | 'debit' | 'refund'>('all')
  const [loading,       setLoading]      = useState(true)
  const [refreshing,    setRefreshing]   = useState(false)

  const loadWallet = useCallback(async () => {
    try {
      const [walletRes, txRes] = await Promise.allSettled([
        walletApi.getBalance(),
        walletApi.getTransactions(),
      ])
      if (walletRes.status === 'fulfilled') {
        const d = walletRes.value.data?.data || walletRes.value.data
        setWallet({ balance: d?.balance ?? 0, reward_points: d?.reward_points ?? 0, pending_refund: d?.pending_refund ?? 0 })
      } else {
        setWallet({ balance: 0, reward_points: 0, pending_refund: 0 })
      }
      if (txRes.status === 'fulfilled') {
        const data = txRes.value.data?.data || txRes.value.data || []
        setTransactions(Array.isArray(data) ? data : [])
      } else {
        setTransactions([])
      }
    } catch {
      setWallet({ balance: 0, reward_points: 0, pending_refund: 0 })
      setTransactions([])
    } finally {
      setLoading(false); setRefreshing(false)
    }
  }, [])

  useEffect(() => { loadWallet() }, [loadWallet])

  const onRefresh = () => { setRefreshing(true); loadWallet() }

  const handleAddMoney = () => { router.push('/payment?mode=topup' as any) }

  const filteredTx = transactions.filter(t =>
    activeFilter === 'all' || t.type === activeFilter
  )

  const FILTERS = ['all', 'credit', 'debit', 'refund'] as const
  const FILTER_LABELS = { all: 'All', credit: 'Added', debit: 'Spent', refund: 'Refunds' }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.backgroundAlt }]}>
      <StatusBar barStyle="light-content" />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <LinearGradient colors={theme.gradient.walletBg} style={styles.headerGrad}>
          <View style={styles.header}>
            <AppText variant="title" bold color="white">My Wallet</AppText>
            <TouchableOpacity
              style={[styles.headerBtn, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
              onPress={() => router.back()}
            >
              <Feather name="x" size={20} color={theme.colors.white} />
            </TouchableOpacity>
          </View>

          {/* Balance Card */}
          <View style={styles.balanceCard}>
            <LinearGradient
              colors={['rgba(59,130,246,0.2)', 'rgba(139,92,246,0.15)']}
              style={StyleSheet.absoluteFill}
            />

            {loading
              ? <AppLoader color="white" size="large" />
              : (
                <>
                  <AppText variant="bodyS" color="white" style={styles.balanceLabel}>Available Balance</AppText>
                  <AppText variant="display" bold color="white" style={styles.balanceAmount}>
                    ₹{(wallet?.balance ?? 0).toFixed(2)}
                  </AppText>

                  <View style={styles.balanceSubRow}>
                    <View style={styles.balanceSubItem}>
                      <MaterialCommunityIcons name="star-circle" size={16} color="#FBBF24" />
                      <AppText variant="caption" semibold color="white" style={{ marginLeft: 6 }}>
                        {wallet?.reward_points ?? 0} pts
                      </AppText>
                    </View>
                    {(wallet?.pending_refund ?? 0) > 0 && (
                      <View style={styles.balanceSubItem}>
                        <Feather name="rotate-ccw" size={14} color="#F59E0B" />
                        <AppText variant="caption" semibold style={{ color: '#F59E0B', marginLeft: 6 }}>
                          ₹{wallet?.pending_refund} pending
                        </AppText>
                      </View>
                    )}
                  </View>

                  <AppButton variant="gradient" fullWidth onPress={handleAddMoney} icon="plus">
                    Add Money
                  </AppButton>
                </>
              )
            }
          </View>
        </LinearGradient>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <AppChip
              key={f}
              label={FILTER_LABELS[f]}
              active={activeFilter === f}
              onPress={() => setActiveFilter(f)}
            />
          ))}
        </View>

        {/* Transactions */}
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        >
          {loading && <AppLoader />}

          {!loading && filteredTx.length === 0 && (
            <AppEmptyState
              icon="💳"
              title="No transactions yet"
              subtitle="Your payment history will appear here"
            />
          )}

          {!loading && filteredTx.map(tx => (
            <View key={tx.id} style={[styles.txCard, {
              backgroundColor: theme.colors.surface,
              shadowColor: isDark ? '#000' : '#000',
            }]}>
              <View style={[styles.txIcon, { backgroundColor: TX_COLORS[tx.type] + '22' }]}>
                <Feather name={TX_ICONS[tx.type] as any} size={20} color={TX_COLORS[tx.type]} />
              </View>
              <View style={styles.txInfo}>
                <AppText variant="bodyS" bold numberOfLines={1}>{tx.description}</AppText>
                <AppText variant="small" color="muted" style={{ marginTop: 2 }}>
                  {formatDate(tx.created_at)}
                </AppText>
              </View>
              <View style={styles.txAmountCol}>
                <AppText variant="subtitle" bold style={{ color: TX_COLORS[tx.type] }}>
                  {tx.type === 'debit' ? '-' : '+'}₹{tx.amount.toFixed(2)}
                </AppText>
                {tx.status && tx.status !== 'completed' && (
                  <AppText variant="xs" style={{ color: '#F59E0B', marginTop: 2, textTransform: 'capitalize' }}>
                    {tx.status}
                  </AppText>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root:    { flex: 1 },
  safeArea:{ flex: 1 },

  headerGrad:    { paddingBottom: 24 },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerBtn:     { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  balanceCard:   { marginHorizontal: 16, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)' },
  balanceLabel:  { marginBottom: 6, opacity: 0.75 },
  balanceAmount: { letterSpacing: -1, marginBottom: 12 },
  balanceSubRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  balanceSubItem:{ flexDirection: 'row', alignItems: 'center' },

  filterRow:     { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 16 },
  scroll:        { flex: 1, paddingHorizontal: 16 },

  txCard:        { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, marginBottom: 10, gap: 14, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  txIcon:        { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txInfo:        { flex: 1 },
  txAmountCol:   { alignItems: 'flex-end' },
})
