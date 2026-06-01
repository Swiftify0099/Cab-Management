/**
 * Customer App — Wallet & Refunds
 * Pixel-perfect from stitch: wallet_refund_tracker_ui
 */
import { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator, StatusBar
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'

const MOCK_TRANSACTIONS = [
  { id: 'tx1', type: 'debit',  amount: 120.50, date: new Date(Date.now() - 3600000).toISOString(),    title: 'Intercity Ride to Boston',        icon: 'map-pin',    iconColor: '#3B82F6', iconBg: '#EFF6FF' },
  { id: 'tx2', type: 'credit', amount: 50.00,  date: new Date(Date.now() - 86400000).toISOString(),   title: 'Wallet Top-up',                   icon: 'arrow-right', iconColor: '#22C55E', iconBg: '#DCFCE7' },
  { id: 'tx3', type: 'debit',  amount: 35.20,  date: new Date(Date.now() - 172800000).toISOString(), title: 'Parcel Delivery - Express',         icon: 'box',    iconColor: '#8B5CF6', iconBg: '#F5F3FF' },
  { id: 'tx4', type: 'debit',  amount: 245.00, date: new Date(Date.now() - 259200000).toISOString(), title: 'Hotel Booking - NYC',              icon: 'home',   iconColor: '#F59E0B', iconBg: '#FFFBEB' },
  { id: 'tx5', type: 'credit', amount: 15.00,  date: new Date(Date.now() - 345600000).toISOString(), title: 'Refund - Cancelled Ride',          icon: 'refresh-cw', iconColor: '#64748B', iconBg: '#F1F5F9' },
]

const MOCK_REFUNDS = [
  { id: 'r1', date: 'Oct 26, 2023', title: 'Trip to San Francisco - Cancelled', amount: '+₹45.00', amountColor: '#16A34A', steps: ['done', 'done', 'done'] },
  { id: 'r2', date: 'Oct 24, 2023', title: 'Trip to Los Angeles - Cancelled',   amount: '₹120.50', amountColor: '#0F172A', steps: ['done', 'pending', 'none'] },
  { id: 'r3', date: 'Oct 23, 2023', title: 'Trip to Las Vegas - Cancelled',     amount: '₹85.20',  amountColor: '#0F172A', steps: ['active', 'none', 'none'] },
]

const TX_TABS = ['All', 'Rides', 'Parcels', 'Hotels', 'Refunds']

export default function WalletTab() {
  const [balance] = useState(185.40)
  const [refreshing, setRefreshing] = useState(false)
  const [txTab, setTxTab] = useState('All')

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 800)
  }, [])

  const StepDot = ({ status }: { status: string }) => {
    if (status === 'done') return (
      <View style={[styles.stepDot, { backgroundColor: '#16A34A' }]}>
        <Feather name="check" size={12} color="white" />
      </View>
    )
    if (status === 'pending') return (
      <View style={styles.stepDotPendingWrap}>
        <View style={[styles.stepDot, { backgroundColor: '#F59E0B' }]}>
          <Feather name="clock" size={10} color="white" />
        </View>
      </View>
    )
    if (status === 'active') return (
      <View style={styles.stepDotActiveWrap}>
        <View style={[styles.stepDot, { backgroundColor: '#F97316' }]} />
      </View>
    )
    return <View style={[styles.stepDot, { backgroundColor: '#CBD5E1' }]} />
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn}>
          <Feather name="chevron-left" size={30} color="#1D4ED8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet & Refunds</Text>
        <TouchableOpacity style={styles.filterBtn}>
          <Feather name="filter" size={22} color="#1D4ED8" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Wallet Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Wallet Balance</Text>
          <Text style={styles.balanceAmount}>₹{balance.toFixed(2)}</Text>
          <View style={styles.availableChip}>
            <Text style={styles.availableText}>Available for booking</Text>
          </View>
        </View>

        {/* Add Money Button */}
        <TouchableOpacity
          style={styles.addMoneyBtn}
          onPress={() => Alert.alert('Add Money', 'Feature coming soon')}
          activeOpacity={0.85}
        >
          <Text style={styles.addMoneyText}>+ Add Money</Text>
        </TouchableOpacity>

        {/* Refund Status Section */}
        <View style={styles.sectionPad}>
          <Text style={styles.sectionTitle}>Refund Status</Text>
        </View>

        <View style={styles.refundCard}>
          {MOCK_REFUNDS.map((refund, ri) => (
            <View key={refund.id} style={[styles.refundItem, ri < MOCK_REFUNDS.length - 1 && styles.refundBorder]}>
              <Text style={styles.refundDate}>{refund.date}</Text>
              <View style={styles.refundRow}>
                <Text style={styles.refundTitle}>{refund.title}</Text>
                <Text style={[styles.refundAmount, { color: refund.amountColor }]}>{refund.amount}</Text>
              </View>

              {/* Timeline */}
              <View style={styles.timeline}>
                <View style={[styles.timelineLine, { left: '10%', right: '50%', backgroundColor: refund.steps[0] === 'done' ? '#16A34A' : '#E2E8F0' }]} />
                <View style={[styles.timelineLine, { left: '50%', right: '10%', backgroundColor: refund.steps[1] === 'done' ? '#16A34A' : '#E2E8F0' }]} />
                <View style={styles.timelineStep}>
                  <StepDot status={refund.steps[0]} />
                  <Text style={styles.timelineLabel}>Initiated</Text>
                </View>
                <View style={styles.timelineStep}>
                  <StepDot status={refund.steps[1]} />
                  <Text style={[styles.timelineLabel, { textAlign: 'center' }]}>Bank{'\n'}Processing</Text>
                </View>
                <View style={styles.timelineStep}>
                  <StepDot status={refund.steps[2]} />
                  <Text style={[styles.timelineLabel, { textAlign: 'center', color: refund.steps[2] === 'none' ? '#94A3B8' : '#0F172A' }]}>Credited{'\n'}to Wallet</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Transaction History */}
        <View style={styles.sectionPad}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
        </View>

        {/* Tab Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.txTabRow}>
          {TX_TABS.map(t => (
            <TouchableOpacity key={t} onPress={() => setTxTab(t)} style={styles.txTabBtn}>
              <Text style={[styles.txTabText, txTab === t && styles.txTabTextActive]}>{t}</Text>
              {txTab === t && <View style={styles.txTabUnderline} />}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Transaction List */}
        <View style={styles.txList}>
          {MOCK_TRANSACTIONS.map(tx => {
            const isCredit = tx.type === 'credit'
            const dateObj = new Date(tx.date)
            return (
              <View key={tx.id} style={styles.txRow}>
                <View style={[styles.txIconCircle, { backgroundColor: tx.iconBg }]}>
                  <Feather name={tx.icon as any} size={18} color={tx.iconColor} />
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txDateText}>
                    {dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, {dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text style={styles.txTitle}>{tx.title}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.txAmount, { color: isCredit ? '#16A34A' : '#EF4444' }]}>
                    {isCredit ? `+ ₹${tx.amount.toFixed(2)}` : `- ₹${tx.amount.toFixed(2)}`}
                  </Text>
                  <Text style={styles.txSubLabel}>{isCredit ? 'Added' : 'Spent'}</Text>
                </View>
              </View>
            )
          })}
        </View>

        {/* Download Statement */}
        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          <TouchableOpacity style={styles.downloadBtn} activeOpacity={0.85}>
            <Text style={styles.downloadText}>Download Statement</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 14, backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: { width: 40 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '700', color: '#0F172A' },
  filterBtn: { width: 40, alignItems: 'flex-end' },

  // Balance card
  balanceCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, marginHorizontal: 16, marginTop: 16, padding: 20,
    shadowColor: '#94A3B8', shadowOpacity: 0.12, shadowRadius: 10, elevation: 3,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  balanceLabel: { fontSize: 17, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  balanceAmount: { fontSize: 44, fontWeight: '900', color: '#0F172A', marginBottom: 12, letterSpacing: -1 },
  availableChip: {
    backgroundColor: '#F1F5F9', alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  availableText: { color: '#334155', fontWeight: '500', fontSize: 13 },

  // Add money
  addMoneyBtn: {
    backgroundColor: '#2563EB', marginHorizontal: 16, marginTop: 12, borderRadius: 16,
    paddingVertical: 14, alignItems: 'center',
    shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  addMoneyText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },

  sectionPad: { paddingHorizontal: 16, marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A' },

  // Refund card
  refundCard: {
    backgroundColor: '#FFFFFF', marginHorizontal: 16, borderRadius: 20,
    shadowColor: '#94A3B8', shadowOpacity: 0.1, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden',
  },
  refundItem: { padding: 20 },
  refundBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  refundDate: { color: '#64748B', fontSize: 13, marginBottom: 4 },
  refundRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  refundTitle: { fontSize: 15, fontWeight: '500', color: '#0F172A', flex: 1, marginRight: 8 },
  refundAmount: { fontSize: 16, fontWeight: '700' },

  // Timeline
  timeline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 8, position: 'relative' },
  timelineLine: { position: 'absolute', top: 12, height: 3, zIndex: 0 },
  timelineStep: { alignItems: 'center', zIndex: 10, width: 72 },
  stepDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  stepDotPendingWrap: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  stepDotActiveWrap: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  timelineLabel: { fontSize: 12, color: '#0F172A', lineHeight: 16 },

  // TX tabs
  txTabRow: { paddingHorizontal: 16, paddingBottom: 4, gap: 8 },
  txTabBtn: { paddingHorizontal: 4, paddingVertical: 6, marginRight: 16, alignItems: 'center' },
  txTabText: { fontSize: 14, fontWeight: '500', color: '#64748B' },
  txTabTextActive: { color: '#2563EB', fontWeight: '700' },
  txTabUnderline: { height: 2, backgroundColor: '#2563EB', borderRadius: 1, width: '100%', marginTop: 3 },

  // TX list
  txList: { marginHorizontal: 0 },
  txRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#FFFFFF',
  },
  txIconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  txInfo: { flex: 1 },
  txDateText: { fontSize: 11, color: '#94A3B8', marginBottom: 2 },
  txTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  txAmount: { fontSize: 15, fontWeight: '700' },
  txSubLabel: { fontSize: 11, color: '#94A3B8', marginTop: 1 },

  // Download
  downloadBtn: {
    backgroundColor: '#2563EB', borderRadius: 16, paddingVertical: 16, alignItems: 'center',
    shadowColor: '#2563EB', shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  downloadText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
})
