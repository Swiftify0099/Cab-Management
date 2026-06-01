/**
 * Driver Earnings / Wallet Tab — pixel-perfect from stitch:
 * saas_wallet_transactions/SaasWalletTransactions.tsx
 */
import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const API = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:80/api/v1'

const MOCK_TXS = [
  { id: '1', label: 'Trip: Pune → Mumbai',        date: 'Today, 9:30 AM',   amount: +480, status: 'Success',  icon: 'car',        color: '#D1FAE5', iconColor: '#065F46' },
  { id: '2', label: 'Parcel Delivery Bonus',       date: 'Today, 7:15 AM',   amount: +120, status: 'Success',  icon: 'cube-outline', color: '#DBEAFE', iconColor: '#1D4ED8' },
  { id: '3', label: 'Fuel Reimbursement',          date: 'Yesterday',        amount: +95,  status: 'Pending',  icon: 'water',      color: '#FEF9C3', iconColor: '#92400E' },
  { id: '4', label: 'Trip: Nashik → Pune',         date: 'Yesterday',        amount: +380, status: 'Success',  icon: 'car',        color: '#D1FAE5', iconColor: '#065F46' },
  { id: '5', label: 'Platform Fee',                date: '3 days ago',       amount: -50,  status: 'Deducted', icon: 'cash',       color: '#FCE7F3', iconColor: '#9D174D' },
  { id: '6', label: 'Incentive — Weekend Bonus',   date: '4 days ago',       amount: +200, status: 'Success',  icon: 'gift-outline', color: '#EDE9FE', iconColor: '#5B21B6' },
]

const STATUS_PILL: Record<string, { bg: string; text: string }> = {
  Success:  { bg: '#D1FAE5', text: '#065F46' },
  Pending:  { bg: '#FEF9C3', text: '#92400E' },
  Deducted: { bg: '#FCE7F3', text: '#9D174D' },
}

export default function EarningsScreen() {
  const [tab, setTab] = useState<'week' | 'month' | 'year'>('week')
  const [balance, setBalance] = useState(4520)
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchEarnings() }, [])

  const fetchEarnings = async () => {
    setLoading(true)
    try {
      const token = await AsyncStorage.getItem('access_token')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await axios.get(`${API}/driver/earnings`, { headers })
      if (res.data?.data?.total_earnings) setBalance(res.data.data.total_earnings)
    } catch { } finally { setLoading(false) }
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <SafeAreaView style={{ backgroundColor: '#F8FAFC' }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerAvatar}>
            <Feather name="user" size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.headerTitle}>Wallet</Text>
          <TouchableOpacity>
            <Feather name="bell" size={24} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* Balance Banner */}
        <View style={styles.balanceBanner}>
          <LinearGradient
            colors={['#4F46E5', '#6366F1', '#818CF8']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Blobs */}
          <View style={[styles.blob, { top: -20, right: -30, backgroundColor: 'rgba(99,102,241,0.5)' }]} />
          <View style={[styles.blob, { bottom: -30, left: -20, backgroundColor: 'rgba(129,140,248,0.4)' }]} />

          <Text style={styles.balanceLabel}>Total Balance</Text>
          {loading
            ? <ActivityIndicator color="#FFF" style={{ marginVertical: 8 }} />
            : <Text style={styles.balanceValue}>₹{balance.toLocaleString('en-IN')}</Text>
          }
          <Text style={styles.balanceSub}>Available Balance</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          {[
            { icon: 'plus', label: 'Add Money' },
            { icon: 'swap-horizontal', label: 'Send to Bank', lib: 'MC' },
            { icon: 'history', label: 'History', lib: 'MC' },
          ].map((a, i) => (
            <TouchableOpacity key={i} style={styles.actionBtn}>
              <View style={styles.actionIconCircle}>
                {a.lib === 'MC'
                  ? <MaterialCommunityIcons name={a.icon as any} size={24} color="#0F172A" />
                  : <Feather name={a.icon as any} size={20} color="#0F172A" />
                }
              </View>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Period Tabs */}
        <View style={styles.periodRow}>
          {(['week', 'month', 'year'] as const).map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.periodBtn, tab === p && styles.periodBtnActive]}
              onPress={() => setTab(p)}
            >
              <Text style={[styles.periodBtnText, tab === p && styles.periodBtnTextActive]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Payment Methods */}
        <Text style={styles.sectionTitle}>Payment Methods</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 28 }}>
          {/* VISA */}
          <View style={[styles.payCard, { backgroundColor: '#F1F5F9' }]}>
            <View style={styles.payCardTop}>
              <Text style={styles.visaText}>VISA</Text>
              <View style={styles.mastercardIcon}>
                <View style={[styles.mcCircle, { backgroundColor: '#EB001B', left: 0 }]} />
                <View style={[styles.mcCircle, { backgroundColor: '#FF5F00', right: 0 }]} />
              </View>
            </View>
            <Text style={styles.payCardName}>Visa •••• 1234</Text>
            <View style={styles.payCardExpRow}>
              <Text style={styles.payCardExpLabel}>Expiry</Text>
              <Text style={styles.payCardExpLabel}>09/26</Text>
            </View>
          </View>
          {/* Razorpay */}
          <View style={[styles.payCard, { backgroundColor: '#E0F2FE', borderColor: '#BFDBFE' }]}>
            <View style={styles.payCardActiveBadge}>
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            </View>
            <Text style={styles.razorpayLogo}>1</Text>
            <Text style={styles.payCardName}>Razorpay Wallet</Text>
          </View>
          {/* PhonePe */}
          <View style={[styles.payCard, { backgroundColor: '#F1F5F9', marginRight: 0 }]}>
            <View style={styles.phonePeIcon}>
              <Text style={styles.phonePeText}>पे</Text>
            </View>
            <Text style={styles.payCardName}>PhonePe UPI</Text>
            <Text style={styles.payCardUpiId}>john.doe@ybl</Text>
          </View>
        </ScrollView>

        {/* Transactions */}
        <View style={styles.txHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity style={styles.seeAllBtn}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {MOCK_TXS.map(tx => (
          <View key={tx.id} style={styles.txRow}>
            <View style={[styles.txIcon, { backgroundColor: tx.color }]}>
              <Ionicons name={tx.icon as any} size={22} color={tx.iconColor} />
            </View>
            <View style={styles.txInfo}>
              <Text style={styles.txLabel}>{tx.label}</Text>
              <Text style={styles.txDate}>{tx.date}</Text>
            </View>
            <View style={styles.txRight}>
              <Text style={[styles.txAmount, { color: tx.amount > 0 ? '#065F46' : '#9D174D' }]}>
                {tx.amount > 0 ? '+' : ''}₹{Math.abs(tx.amount)}
              </Text>
              <View style={[styles.txPill, { backgroundColor: STATUS_PILL[tx.status].bg }]}>
                <Text style={[styles.txPillText, { color: STATUS_PILL[tx.status].text }]}>{tx.status}</Text>
              </View>
            </View>
          </View>
        ))}

      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A' },

  scroll: { flex: 1, paddingHorizontal: 20 },

  balanceBanner: {
    height: 192, borderRadius: 24, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
    borderWidth: 1, borderColor: '#6366F1',
    shadowColor: '#6366F1', shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  blob: { position: 'absolute', width: 180, height: 180, borderRadius: 90, opacity: 0.5 },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '500', marginBottom: 6 },
  balanceValue: { color: '#FFFFFF', fontSize: 48, fontWeight: '900', letterSpacing: -1 },
  balanceSub: { color: '#C7D2FE', fontSize: 13, marginTop: 4 },

  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  actionBtn: { flex: 1, alignItems: 'center', backgroundColor: '#E0F2FE', borderRadius: 20, paddingVertical: 16, marginHorizontal: 4, borderWidth: 1, borderColor: '#BFDBFE' },
  actionIconCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: '#0F172A', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionLabel: { color: '#0F172A', fontSize: 12, fontWeight: '600', textAlign: 'center' },

  periodRow: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, marginBottom: 24 },
  periodBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  periodBtnActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  periodBtnText: { color: '#94A3B8', fontWeight: '600', fontSize: 14 },
  periodBtnTextActive: { color: '#1D4ED8', fontWeight: '800' },

  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 14 },

  // Payment cards
  payCard: { width: 160, borderRadius: 20, padding: 16, marginRight: 14, borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'space-between', minHeight: 110 },
  payCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  visaText: { color: '#1A1F71', fontWeight: '900', fontSize: 20, fontStyle: 'italic' },
  mastercardIcon: { width: 36, height: 22, position: 'relative' },
  mcCircle: { position: 'absolute', width: 20, height: 20, borderRadius: 10, top: 1 },
  payCardName: { color: '#0F172A', fontWeight: '700', fontSize: 14, marginBottom: 4 },
  payCardExpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  payCardExpLabel: { color: '#94A3B8', fontSize: 11 },
  payCardActiveBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#3B82F6', borderRadius: 10, padding: 2 },
  razorpayLogo: { color: '#1D4ED8', fontWeight: '900', fontSize: 28, fontStyle: 'italic', marginBottom: 16 },
  phonePeIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#673AB7', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  phonePeText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  payCardUpiId: { color: '#94A3B8', fontSize: 11 },

  txHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  seeAllBtn: { borderWidth: 1, borderColor: '#CBD5E1', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  seeAllText: { color: '#1D4ED8', fontSize: 13, fontWeight: '600' },

  txRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  txIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  txInfo: { flex: 1 },
  txLabel: { color: '#0F172A', fontWeight: '700', fontSize: 15, marginBottom: 3 },
  txDate: { color: '#94A3B8', fontSize: 13 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontWeight: '800', fontSize: 16, marginBottom: 4 },
  txPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  txPillText: { fontSize: 11, fontWeight: '700' },
})
