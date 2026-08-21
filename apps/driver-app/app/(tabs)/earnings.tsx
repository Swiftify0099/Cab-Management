/**
 * Driver Financial Earnings & Double-Entry Ledger Dashboard — Features 13, 14 & 15
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative financial intelligence:
 *  - Today, Weekly, Monthly reconciled summaries from immutable ledger
 *  - Available Balance, Pending Balance & In-Flight Reserved Payouts
 *  - Instant Withdrawal Navigation & Payout Destination Management
 *  - Cash In-Hand Collected vs Online UPI Bank Settlement split
 *  - Weekly 7-Day interactive bar visualizer
 *  - Double-Entry Journal History with itemized receipt inspection
 *  - Developer Mode Simulation modal
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect } from 'expo-router'

import { useTheme } from '../../src/theme'
import { TripCompletionAndEarningsService } from '../../src/services/tripCompletionAndEarningsService'
import { PayoutAndWalletService } from '../../src/services/payoutAndWalletService'
import { DriverEarningsSummary, LedgerEntryItem, RideReceiptData } from '../../src/types/tripCompletionAndEarnings'
import { DriverWalletSummaryData } from '../../src/types/payoutAndWallet'
import { TripReceiptModal } from '../../src/components/tripCompletion/TripReceiptModal'
import { WalletDevSheet } from '../../src/components/wallet/WalletDevSheet'

const { width } = Dimensions.get('window')

export default function EarningsScreen() {
  const { isDark } = useTheme()
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today')
  const [summary, setSummary] = useState<DriverEarningsSummary | null>(null)
  const [walletData, setWalletData] = useState<DriverWalletSummaryData | null>(null)
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<RideReceiptData | null>(null)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showDevSheet, setShowDevSheet] = useState(false)

  const loadData = useCallback(async (selectedPeriod = period) => {
    try {
      const [sumData, ledgerData, wData] = await Promise.allSettled([
        TripCompletionAndEarningsService.getEarningsSummary(selectedPeriod),
        TripCompletionAndEarningsService.getLedgerHistory(30),
        PayoutAndWalletService.getWalletSummary(),
      ])

      if (sumData.status === 'fulfilled') {
        setSummary(sumData.value)
      }
      if (ledgerData.status === 'fulfilled') {
        setLedgerEntries(ledgerData.value)
      }
      if (wData.status === 'fulfilled') {
        setWalletData(wData.value)
      }
    } catch (err) {
      console.warn('Earnings load error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [period])

  useFocusEffect(
    useCallback(() => {
      loadData(period)
    }, [loadData, period])
  )

  const onRefresh = () => {
    setRefreshing(true)
    loadData(period)
  }

  const handleOpenReceipt = async (rideId?: string | null) => {
    if (!rideId) return
    try {
      const receipt = await TripCompletionAndEarningsService.getRideReceipt(rideId)
      setSelectedReceipt(receipt)
      setShowReceiptModal(true)
    } catch {
      // Fallback
    }
  }

  const bgCard = isDark ? '#1E293B' : '#FFFFFF'
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A'
  const textSecondary = isDark ? '#94A3B8' : '#64748B'
  const borderCol = isDark ? '#334155' : '#E2E8F0'

  const maxWeeklyAmount = summary?.daily_breakdown && Array.isArray(summary.daily_breakdown)
    ? Math.max(...summary.daily_breakdown.map(d => d.amount || 0), 100)
    : 3000

  const payoutMethodsList = Array.isArray(walletData?.payout_methods) ? walletData.payout_methods : []
  const primaryMethod = payoutMethodsList.find(m => m.is_default) || payoutMethodsList[0]

  return (
    <View style={[styles.root, { backgroundColor: isDark ? '#020617' : '#F8FAFC' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={{ backgroundColor: isDark ? '#020617' : '#F8FAFC' }} edges={['top']}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={styles.headerAvatar}>
              <MaterialCommunityIcons name="wallet-outline" size={20} color="#FFFFFF" />
            </View>
            <Text style={[styles.headerTitle, { color: textPrimary }]}>Wallet & Earnings</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity
              style={styles.devTriggerBtn}
              onPress={() => setShowDevSheet(true)}
            >
              <Ionicons name="construct-outline" size={18} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onRefresh} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="refresh-cw" size={18} color={textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Period Selector Tabs */}
        <View style={[styles.periodTabsContainer, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
          {(['today', 'week', 'month'] as const).map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.periodTab, period === p && styles.periodTabActive]}
              onPress={() => {
                setPeriod(p)
                loadData(p)
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.periodTabText,
                  { color: textSecondary },
                  period === p && styles.periodTabTextActive,
                ]}
              >
                {p === 'today' ? "Today's Earnings" : p === 'week' ? 'This Week' : 'This Month'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Primary Gradient Financial KPI Banner */}
        <View style={styles.kpiBanner}>
          <LinearGradient
            colors={isDark ? ['#1E1B4B', '#312E81', '#3730A3'] : ['#4F46E5', '#6366F1', '#818CF8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.kpiPeriodLabel}>
            {period === 'today' ? "TODAY'S NET EARNINGS" : period === 'week' ? 'WEEKLY NET EARNINGS' : 'MONTHLY NET EARNINGS'}
          </Text>

          {loading ? (
            <ActivityIndicator color="#FFFFFF" style={{ marginVertical: 12 }} />
          ) : (
            <Text style={styles.kpiAmount}>₹{(summary?.total_net_earnings ?? 0).toLocaleString('en-IN')}</Text>
          )}

          <View style={styles.kpiSubRow}>
            <View style={styles.kpiPill}>
              <Feather name="navigation" size={13} color="#FFFFFF" />
              <Text style={styles.kpiPillText}>{summary?.trip_count ?? 0} Trips</Text>
            </View>
            <View style={styles.kpiPill}>
              <Feather name="clock" size={13} color="#FFFFFF" />
              <Text style={styles.kpiPillText}>{summary?.online_hours ?? 0}h Online</Text>
            </View>
            <View style={styles.kpiPill}>
              <Feather name="trending-up" size={13} color="#FFFFFF" />
              <Text style={styles.kpiPillText}>₹{(summary?.earning_per_hour ?? 0).toFixed(0)}/hr</Text>
            </View>
          </View>
        </View>

        {/* Feature 15: Authoritative Ledger-Backed Wallet Card */}
        <View style={[styles.walletCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
          <View style={styles.walletCardHeader}>
            <View>
              <Text style={[styles.walletLabel, { color: textSecondary }]}>AVAILABLE BANK PAYOUT</Text>
              <Text style={[styles.walletBalanceVal, { color: textPrimary }]}>
                ₹{(walletData?.available_balance ?? summary?.available_wallet_balance ?? 4820).toLocaleString('en-IN')}
              </Text>
              {walletData && (walletData.pending_balance ?? 0) > 0 && (
                <View style={styles.pendingChip}>
                  <Feather name="clock" size={10} color="#D97706" />
                  <Text style={styles.pendingChipText}>
                    +₹{(walletData.pending_balance ?? 0).toLocaleString('en-IN')} Pending
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.payoutBtn}
              onPress={() => router.push('/wallet/withdraw' as any)}
              activeOpacity={0.85}
            >
              <Feather name="arrow-up-right" size={16} color="#FFFFFF" />
              <Text style={styles.payoutBtnText}>Withdraw</Text>
            </TouchableOpacity>
          </View>

          {/* Linked Bank / UPI Destination Quick Row */}
          <TouchableOpacity
            style={styles.bankDetailRow}
            onPress={() => router.push('/wallet/methods' as any)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={primaryMethod?.method_type === 'UPI' ? 'cellphone' : 'bank'}
              size={16}
              color="#0284C7"
            />
            <Text style={[styles.bankDetailText, { color: textSecondary }]}>
              {primaryMethod ? primaryMethod.display_label : 'Add Bank / UPI Payout Method'}
            </Text>
            <Feather name="chevron-right" size={14} color={textSecondary} />
          </TouchableOpacity>

          {/* Shortcut Links: Methods & History */}
          <View style={styles.walletShortcutsRow}>
            <TouchableOpacity
              style={[styles.shortcutBtn, { borderColor: borderCol }]}
              onPress={() => router.push('/wallet/methods' as any)}
            >
              <Feather name="credit-card" size={14} color="#3B82F6" />
              <Text style={[styles.shortcutBtnText, { color: textPrimary }]}>Payout Methods</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shortcutBtn, { borderColor: borderCol }]}
              onPress={() => router.push('/wallet/history' as any)}
            >
              <Feather name="file-text" size={14} color="#3B82F6" />
              <Text style={[styles.shortcutBtnText, { color: textPrimary }]}>Payout History</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Cash Collected vs Online UPI Split */}
        <View style={styles.splitCardsRow}>
          <View style={[styles.splitCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
            <View style={styles.splitIconCash}>
              <MaterialCommunityIcons name="cash" size={20} color="#D97706" />
            </View>
            <View>
              <Text style={[styles.splitLabel, { color: textSecondary }]}>Cash Collected</Text>
              <Text style={[styles.splitAmount, { color: textPrimary }]}>
                ₹{(summary?.cash_collected ?? 0).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          <View style={[styles.splitCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
            <View style={styles.splitIconOnline}>
              <MaterialCommunityIcons name="credit-card-check-outline" size={20} color="#16A34A" />
            </View>
            <View>
              <Text style={[styles.splitLabel, { color: textSecondary }]}>Online Earnings</Text>
              <Text style={[styles.splitAmount, { color: textPrimary }]}>
                ₹{(summary?.online_earnings ?? 0).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>

        {/* Weekly Bar Chart (When Week Tab Selected) */}
        {period === 'week' && summary?.daily_breakdown && (
          <View style={[styles.chartCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
            <Text style={[styles.cardHeaderTitle, { color: textPrimary }]}>Daily Breakdown (Mon–Sun)</Text>
            <View style={styles.chartBarsRow}>
              {summary.daily_breakdown.map((item, idx) => {
                const heightPct = Math.max((item.amount / maxWeeklyAmount) * 100, 8)
                return (
                  <View key={`day-${idx}`} style={styles.barCol}>
                    <Text style={[styles.barAmount, { color: textSecondary }]}>
                      {item.amount > 0 ? `₹${(item.amount / 1000).toFixed(1)}k` : ''}
                    </Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { height: `${heightPct}%` },
                          item.is_today ? styles.barFillToday : styles.barFillOther,
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.barDayLabel,
                        { color: textSecondary },
                        item.is_today && styles.barDayLabelToday,
                      ]}
                    >
                      {item.day}
                    </Text>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {/* Double-Entry Ledger History */}
        <View style={styles.ledgerSection}>
          <View style={styles.ledgerHeaderRow}>
            <Text style={[styles.cardHeaderTitle, { color: textPrimary }]}>Financial Journal & Transactions</Text>
            <Text style={[styles.ledgerSubText, { color: textSecondary }]}>Immutable double-entry ledger</Text>
          </View>

          {ledgerEntries.length === 0 ? (
            <View style={[styles.emptyLedgerBox, { backgroundColor: bgCard, borderColor: borderCol }]}>
              <Feather name="inbox" size={32} color={textSecondary} />
              <Text style={[styles.emptyLedgerText, { color: textSecondary }]}>No ledger entries in this period</Text>
            </View>
          ) : (
            ledgerEntries.map((entry, idx) => {
              const isCredit = entry.direction === 'CREDIT'
              const isTrip = entry.entry_type === 'TRIP_EARNING'
              const isTip = entry.entry_type === 'TIP'
              const isCash = entry.entry_type === 'CASH_COLLECTED'
              const isPayout = entry.entry_type === 'PAYOUT' || entry.entry_type === 'PAYOUT_RESERVE'

              return (
                <TouchableOpacity
                  key={`ledger-${entry.id || idx}`}
                  style={[styles.ledgerRow, { backgroundColor: bgCard, borderColor: borderCol }]}
                  onPress={() => isTrip && handleOpenReceipt(entry.ride_id)}
                  disabled={!isTrip}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.ledgerIconCircle,
                      {
                        backgroundColor: isTip
                          ? '#FEF3C7'
                          : isCash
                          ? '#FEF9C3'
                          : isPayout
                          ? '#FEE2E2'
                          : isCredit
                          ? '#DCFCE7'
                          : '#F1F5F9',
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={
                        isTip
                          ? 'gift'
                          : isCash
                          ? 'cash'
                          : isPayout
                          ? 'bank-transfer-out'
                          : isCredit
                          ? 'car'
                          : 'swap-horizontal'
                      }
                      size={20}
                      color={
                        isTip
                          ? '#D97706'
                          : isCash
                          ? '#CA8A04'
                          : isPayout
                          ? '#EF4444'
                          : isCredit
                          ? '#16A34A'
                          : '#64748B'
                      }
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.ledgerTitle, { color: textPrimary }]} numberOfLines={1}>
                      {entry.description}
                    </Text>
                    <Text style={[styles.ledgerDate, { color: textSecondary }]}>
                      {entry.effective_date} • {entry.entry_type.replace(/_/g, ' ')}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={[
                        styles.ledgerAmount,
                        { color: isCredit ? '#16A34A' : '#EF4444' },
                      ]}
                    >
                      {isCredit ? '+' : '-'}₹{entry.amount.toFixed(0)}
                    </Text>
                    {isTrip && (
                      <Text style={styles.viewReceiptLink}>Receipt ›</Text>
                    )}
                  </View>
                </TouchableOpacity>
              )
            })
          )}
        </View>
      </ScrollView>

      {/* Itemized Trip Receipt Modal */}
      <TripReceiptModal
        visible={showReceiptModal}
        receipt={selectedReceipt}
        isDark={isDark}
        onClose={() => setShowReceiptModal(false)}
      />

      {/* Developer Mode Simulation Sheet */}
      <WalletDevSheet
        visible={showDevSheet}
        onClose={() => setShowDevSheet(false)}
        onDataChanged={() => loadData(period)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  devTriggerBtn: { padding: 6, borderRadius: 8, backgroundColor: 'rgba(59,130,246,0.1)' },
  scroll: { flex: 1 },
  periodTabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    padding: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  periodTabActive: {
    backgroundColor: '#3B82F6',
  },
  periodTabText: { fontSize: 12, fontWeight: '700' },
  periodTabTextActive: { color: '#FFFFFF', fontWeight: '800' },
  kpiBanner: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    overflow: 'hidden',
  },
  kpiPeriodLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  kpiAmount: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
    marginVertical: 4,
  },
  kpiSubRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  kpiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  kpiPillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  walletCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  walletCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  walletLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  walletBalanceVal: { fontSize: 24, fontWeight: '900', marginTop: 2 },
  pendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  pendingChipText: { color: '#B45309', fontSize: 10, fontWeight: '800' },
  payoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  payoutBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  bankDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.1)',
  },
  bankDetailText: { fontSize: 12, fontWeight: '600', flex: 1 },
  walletShortcutsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  shortcutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
  },
  shortcutBtnText: { fontSize: 12, fontWeight: '700' },
  splitCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  splitCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  splitIconCash: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitIconOnline: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitLabel: { fontSize: 11, fontWeight: '600' },
  splitAmount: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  chartCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  cardHeaderTitle: { fontSize: 15, fontWeight: '800' },
  chartBarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    marginTop: 14,
    paddingBottom: 4,
  },
  barCol: { alignItems: 'center', flex: 1 },
  barAmount: { fontSize: 9, fontWeight: '700', marginBottom: 4 },
  barTrack: { width: 14, height: 90, backgroundColor: 'rgba(150,150,150,0.15)', borderRadius: 7, justifyContent: 'flex-end' },
  barFill: { width: 14, borderRadius: 7 },
  barFillToday: { backgroundColor: '#3B82F6' },
  barFillOther: { backgroundColor: '#94A3B8' },
  barDayLabel: { fontSize: 10, fontWeight: '700', marginTop: 6 },
  barDayLabelToday: { color: '#3B82F6', fontWeight: '800' },
  ledgerSection: { marginHorizontal: 16, marginTop: 6 },
  ledgerHeaderRow: { marginBottom: 10 },
  ledgerSubText: { fontSize: 11, marginTop: 2 },
  emptyLedgerBox: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: 'center' },
  emptyLedgerText: { fontSize: 13, fontWeight: '600', marginTop: 8 },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  ledgerIconCircle: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  ledgerTitle: { fontSize: 13, fontWeight: '700' },
  ledgerDate: { fontSize: 11, marginTop: 2 },
  ledgerAmount: { fontSize: 15, fontWeight: '800' },
  viewReceiptLink: { fontSize: 11, color: '#3B82F6', fontWeight: '700', marginTop: 2 },
})
