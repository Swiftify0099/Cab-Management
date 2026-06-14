/**
 * Customer App — Wallet & Payments
 * Dynamic: fetches balance, transactions, and refunds from API.
 * Razorpay top-up flow wired.
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, RefreshControl, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { walletApi } from '../../src/api/client'

type TxType = 'credit' | 'debit' | 'refund'

interface Transaction {
  id: string
  type: TxType
  amount: number
  description: string
  created_at: string
  status?: string
}

interface WalletData {
  balance: number
  reward_points: number
  pending_refund: number
}

const TX_COLORS: Record<TxType, string> = {
  credit: '#22C55E',
  debit: '#EF4444',
  refund: '#F59E0B',
}

const TX_ICONS: Record<TxType, string> = {
  credit: 'arrow-down-left',
  debit: 'arrow-up-right',
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
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [activeFilter, setActiveFilter] = useState<'all' | 'credit' | 'debit' | 'refund'>('all')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadWallet = useCallback(async () => {
    try {
      const [walletRes, txRes] = await Promise.allSettled([
        walletApi.getBalance(),
        walletApi.getTransactions(),
      ])

      if (walletRes.status === 'fulfilled') {
        const d = walletRes.value.data?.data || walletRes.value.data
        setWallet({
          balance: d?.balance ?? 0,
          reward_points: d?.reward_points ?? 0,
          pending_refund: d?.pending_refund ?? 0,
        })
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
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { loadWallet() }, [loadWallet])

  const onRefresh = () => {
    setRefreshing(true)
    loadWallet()
  }

  const handleAddMoney = () => {
    router.push('/payment?mode=topup' as any)
  }

  const filteredTx = transactions.filter(t =>
    activeFilter === 'all' || t.type === activeFilter
  )

  const FILTERS = ['all', 'credit', 'debit', 'refund'] as const
  const FILTER_LABELS = { all: 'All', credit: 'Added', debit: 'Spent', refund: 'Refunds' }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <LinearGradient colors={['#0A0F1E', '#1E1B4B']} style={styles.headerGrad}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>My Wallet</Text>
            <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
              <Feather name="x" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Balance Card */}
          <View style={styles.balanceCard}>
            <LinearGradient
              colors={['rgba(59,130,246,0.2)', 'rgba(139,92,246,0.15)']}
              style={StyleSheet.absoluteFill}
            />

            {loading
              ? <ActivityIndicator color="#fff" size="large" style={{ paddingVertical: 24 }} />
              : (
                <>
                  <Text style={styles.balanceLabel}>Available Balance</Text>
                  <Text style={styles.balanceAmount}>₹{(wallet?.balance ?? 0).toFixed(2)}</Text>

                  <View style={styles.balanceSubRow}>
                    <View style={styles.balanceSubItem}>
                      <MaterialCommunityIcons name="star-circle" size={16} color="#FBBF24" />
                      <Text style={styles.balanceSubText}>{wallet?.reward_points ?? 0} pts</Text>
                    </View>
                    {(wallet?.pending_refund ?? 0) > 0 && (
                      <View style={styles.balanceSubItem}>
                        <Feather name="rotate-ccw" size={14} color="#F59E0B" />
                        <Text style={[styles.balanceSubText, { color: '#F59E0B' }]}>
                          ₹{wallet?.pending_refund} pending
                        </Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity style={styles.addMoneyBtn} onPress={handleAddMoney}>
                    <LinearGradient
                      colors={['#3B82F6', '#8B5CF6']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={styles.addMoneyGrad}
                    >
                      <Feather name="plus" size={18} color="#fff" />
                      <Text style={styles.addMoneyText}>Add Money</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )
            }
          </View>
        </LinearGradient>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              onPress={() => setActiveFilter(f)}
              style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
                {FILTER_LABELS[f]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Transactions */}
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
        >
          {loading && <ActivityIndicator color="#3B82F6" style={{ marginTop: 40 }} />}

          {!loading && filteredTx.length === 0 && (
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>💳</Text>
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptySubtitle}>Your payment history will appear here</Text>
            </View>
          )}

          {!loading && filteredTx.map(tx => (
            <View key={tx.id} style={styles.txCard}>
              <View style={[styles.txIcon, { backgroundColor: TX_COLORS[tx.type] + '22' }]}>
                <Feather name={TX_ICONS[tx.type] as any} size={20} color={TX_COLORS[tx.type]} />
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                <Text style={styles.txDate}>{formatDate(tx.created_at)}</Text>
              </View>
              <View style={styles.txAmountCol}>
                <Text style={[styles.txAmount, { color: TX_COLORS[tx.type] }]}>
                  {tx.type === 'debit' ? '-' : '+'}₹{tx.amount.toFixed(2)}
                </Text>
                {tx.status && tx.status !== 'completed' && (
                  <Text style={styles.txStatus}>{tx.status}</Text>
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
  root: { flex: 1, backgroundColor: '#F1F5F9' },
  safeArea: { flex: 1 },

  headerGrad: { paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center',
  },

  balanceCard: {
    marginHorizontal: 16, borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  balanceLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 14, marginBottom: 6 },
  balanceAmount: { color: '#FFFFFF', fontSize: 42, fontWeight: '900', letterSpacing: -1, marginBottom: 12 },
  balanceSubRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  balanceSubItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  balanceSubText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600' },
  addMoneyBtn: { borderRadius: 14, overflow: 'hidden' },
  addMoneyGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  addMoneyText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 16 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#E2E8F0', borderWidth: 1, borderColor: '#E2E8F0',
  },
  filterChipActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  filterTextActive: { color: '#FFFFFF' },

  scroll: { flex: 1, paddingHorizontal: 16 },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#334155', marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: '#94A3B8', marginTop: 4 },

  txCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 16, padding: 14, marginBottom: 10, gap: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  txIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1 },
  txDesc: { color: '#1E293B', fontSize: 14, fontWeight: '600' },
  txDate: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  txAmountCol: { alignItems: 'flex-end' },
  txAmount: { fontSize: 15, fontWeight: '800' },
  txStatus: { color: '#F59E0B', fontSize: 11, fontWeight: '600', marginTop: 2, textTransform: 'capitalize' },
})
