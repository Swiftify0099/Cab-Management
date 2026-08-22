/**
 * Feature 15: Payout Transaction History & Settlement Screen
 * ─────────────────────────────────────────────────────────────────────────────
 *  - Filter tabs: All, Settled / Success, Processing, Failed / Reversed
 *  - Payout reference codes, masked destinations, transfer timestamps
 *  - Safe failure reason details & retry actions
 *  - High-contrast Light Mode and low-glare OLED Dark Mode support
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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'

import { useTheme } from '../../src/theme'
import { PayoutAndWalletService } from '../../src/services/payoutAndWalletService'
import { PayoutRecordItem, SettlementBreakdownItem } from '../../src/types/payoutAndWallet'

export default function PayoutHistoryScreen() {
  const { isDark } = useTheme()
  const [activeTab, setActiveTab] = useState<'payouts' | 'settlements'>('payouts')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'PROCESSING' | 'FAILED'>('ALL')
  const [payouts, setPayouts] = useState<PayoutRecordItem[]>([])
  const [settlements, setSettlements] = useState<SettlementBreakdownItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [pRes, sRes] = await Promise.allSettled([
        PayoutAndWalletService.getPayoutHistory(1, 50),
        PayoutAndWalletService.getSettlementHistory(),
      ])

      if (pRes.status === 'fulfilled') {
        setPayouts(pRes.value.items || [])
      }
      if (sRes.status === 'fulfilled') {
        setSettlements(sRes.value || [])
      }
    } catch (err: any) {
      console.warn('Load history error:', err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const onRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  const filteredPayouts = payouts.filter(p => {
    if (statusFilter === 'ALL') return true
    if (statusFilter === 'SUCCESS') return p.status === 'SUCCESS'
    if (statusFilter === 'PROCESSING') return p.status === 'PROCESSING' || p.status === 'REQUESTED'
    if (statusFilter === 'FAILED') return p.status === 'FAILED' || p.status === 'REVERSED'
    return true
  })

  const bgCard = isDark ? '#1E293B' : '#FFFFFF'
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A'
  const textSecondary = isDark ? '#94A3B8' : '#64748B'
  const borderCol = isDark ? '#334155' : '#E2E8F0'

  return (
    <View style={[styles.root, { backgroundColor: isDark ? '#020617' : '#F8FAFC' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={{ backgroundColor: isDark ? '#020617' : '#F8FAFC' }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="arrow-left" size={22} color={textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>Payout & Settlement History</Text>
          <TouchableOpacity onPress={onRefresh}>
            <Feather name="refresh-cw" size={18} color={textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Top Mode Tabs */}
        <View style={[styles.modeTabsRow, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
          <TouchableOpacity
            style={[styles.modeTab, activeTab === 'payouts' && styles.modeTabActive]}
            onPress={() => setActiveTab('payouts')}
          >
            <Text style={[styles.modeTabText, { color: textSecondary }, activeTab === 'payouts' && styles.modeTabTextActive]}>
              Bank & UPI Payouts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, activeTab === 'settlements' && styles.modeTabActive]}
            onPress={() => setActiveTab('settlements')}
          >
            <Text style={[styles.modeTabText, { color: textSecondary }, activeTab === 'settlements' && styles.modeTabTextActive]}>
              Tax & Settlements
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'payouts' ? (
          <>
            {/* Status Filter Pills */}
            <View style={styles.filtersRow}>
              {(['ALL', 'SUCCESS', 'PROCESSING', 'FAILED'] as const).map(f => (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.filterPill,
                    { backgroundColor: statusFilter === f ? '#2563EB' : isDark ? '#1E293B' : '#F1F5F9' },
                  ]}
                  onPress={() => setStatusFilter(f)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      { color: statusFilter === f ? '#FFFFFF' : textSecondary },
                    ]}
                  >
                    {f === 'ALL' ? 'All Transfers' : f === 'SUCCESS' ? 'Settled' : f === 'PROCESSING' ? 'Processing' : 'Failed'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {loading ? (
              <ActivityIndicator color="#3B82F6" style={{ marginTop: 40 }} />
            ) : filteredPayouts.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                <MaterialCommunityIcons name="bank-transfer" size={48} color={textSecondary} />
                <Text style={[styles.emptyTitle, { color: textPrimary }]}>No Payout Records</Text>
                <Text style={[styles.emptySub, { color: textSecondary }]}>
                  Your withdrawal transactions and automated settlements will appear here.
                </Text>
              </View>
            ) : (
              filteredPayouts.map(item => {
                const isSuccess = item.status === 'SUCCESS'
                const isFailed = item.status === 'FAILED' || item.status === 'REVERSED'

                return (
                  <View
                    key={item.id}
                    style={[styles.recordCard, { backgroundColor: bgCard, borderColor: borderCol }]}
                  >
                    <View style={styles.recordHeader}>
                      <View
                        style={[
                          styles.recordIconCircle,
                          {
                            backgroundColor: isSuccess
                              ? isDark ? '#064E3B' : '#DCFCE7'
                              : isFailed
                              ? isDark ? '#7F1D1D' : '#FEE2E2'
                              : isDark ? '#78350F' : '#FEF3C7',
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={
                            isSuccess
                              ? 'check-circle-outline'
                              : isFailed
                              ? 'alert-circle-outline'
                              : 'clock-outline'
                          }
                          size={22}
                          color={isSuccess ? '#10B981' : isFailed ? '#EF4444' : '#F59E0B'}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={[styles.recordAmount, { color: textPrimary }]}>
                          ₹{item.amount.toLocaleString('en-IN')}
                        </Text>
                        <Text style={[styles.recordDest, { color: textSecondary }]}>
                          {item.destination_masked}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: isSuccess
                              ? isDark ? '#064E3B' : '#DCFCE7'
                              : isFailed
                              ? isDark ? '#7F1D1D' : '#FEE2E2'
                              : isDark ? '#78350F' : '#FEF3C7',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: isSuccess ? '#10B981' : isFailed ? '#EF4444' : '#F59E0B' },
                          ]}
                        >
                          {item.status}
                        </Text>
                      </View>
                    </View>

                    {item.failure_reason && (
                      <View style={[styles.failureBox, { backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2' }]}>
                        <Feather name="alert-triangle" size={14} color="#EF4444" />
                        <Text style={styles.failureText}>{item.failure_reason}</Text>
                      </View>
                    )}

                    <View style={styles.recordFooter}>
                      <Text style={[styles.recordMeta, { color: textSecondary }]}>
                        Ref: {item.reference}
                      </Text>
                      <Text style={[styles.recordMeta, { color: textSecondary }]}>
                        {new Date(item.requested_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>
                )
              })
            )}
          </>
        ) : (
          <>
            {/* Settlements Tab */}
            {settlements.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
                <MaterialCommunityIcons name="file-document-outline" size={48} color={textSecondary} />
                <Text style={[styles.emptyTitle, { color: textPrimary }]}>No Settlement Records</Text>
                <Text style={[styles.emptySub, { color: textSecondary }]}>
                  Weekly & Monthly consolidated tax and commission statements will appear here.
                </Text>
              </View>
            ) : (
              settlements.map(item => (
                <View
                  key={item.id}
                  style={[styles.settlementCard, { backgroundColor: bgCard, borderColor: borderCol }]}
                >
                  <View style={styles.settlementHeader}>
                    <Text style={[styles.settlementPeriod, { color: textPrimary }]}>
                      Period: {item.period_start} to {item.period_end}
                    </Text>
                    <View style={styles.settlementBadge}>
                      <Text style={styles.settlementBadgeText}>{item.status.toUpperCase()}</Text>
                    </View>
                  </View>

                  <View style={styles.settlementGrid}>
                    <View style={styles.settlementCol}>
                      <Text style={[styles.settlementLabel, { color: textSecondary }]}>Gross Earning</Text>
                      <Text style={[styles.settlementVal, { color: textPrimary }]}>
                        ₹{item.gross_earnings.toLocaleString('en-IN')}
                      </Text>
                    </View>
                    <View style={styles.settlementCol}>
                      <Text style={[styles.settlementLabel, { color: textSecondary }]}>Commission</Text>
                      <Text style={[styles.settlementVal, { color: '#EF4444' }]}>
                        -₹{item.commission_deducted.toLocaleString('en-IN')}
                      </Text>
                    </View>
                    <View style={styles.settlementCol}>
                      <Text style={[styles.settlementLabel, { color: textSecondary }]}>Net Payout</Text>
                      <Text style={[styles.settlementVal, { color: '#10B981', fontWeight: '900' }]}>
                        ₹{item.net_amount.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
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
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  modeTabsRow: { flexDirection: 'row', padding: 4, marginHorizontal: 16, borderRadius: 12, marginBottom: 8 },
  modeTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  modeTabActive: { backgroundColor: '#2563EB' },
  modeTabText: { fontSize: 13, fontWeight: '700' },
  modeTabTextActive: { color: '#FFFFFF', fontWeight: '800' },
  content: { padding: 16, paddingBottom: 40 },
  filtersRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  filterPillText: { fontSize: 12, fontWeight: '700' },
  emptyCard: { borderRadius: 18, borderWidth: 1, padding: 32, alignItems: 'center', marginVertical: 30 },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginTop: 12 },
  emptySub: { fontSize: 13, textAlign: 'center', marginTop: 6 },
  recordCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  recordHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recordIconCircle: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  recordAmount: { fontSize: 18, fontWeight: '900' },
  recordDest: { fontSize: 13, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  failureBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, marginTop: 10 },
  failureText: { color: '#EF4444', fontSize: 12, fontWeight: '600', flex: 1 },
  recordFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.1)',
  },
  recordMeta: { fontSize: 12, fontWeight: '600' },
  settlementCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  settlementHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  settlementPeriod: { fontSize: 14, fontWeight: '800' },
  settlementBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  settlementBadgeText: { color: '#16A34A', fontSize: 10, fontWeight: '800' },
  settlementGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  settlementCol: { alignItems: 'center' },
  settlementLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  settlementVal: { fontSize: 15, fontWeight: '800' },
})
