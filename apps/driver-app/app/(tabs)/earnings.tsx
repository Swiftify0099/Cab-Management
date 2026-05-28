import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { driverApi } from '../../api/client'

export default function EarningsScreen() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod] = useState<'today' | 'weekly' | 'monthly'>('weekly')
  
  const [earnings, setEarnings] = useState({
    total_revenue: 14500,
    commission_deducted: 1450,
    net_earnings: 13050,
    completed_trips: 18,
    online_hours: 42
  })

  const [history, setHistory] = useState([
    { id: '1', date: '2026-10-15', amount: 3500, trips: 5, status: 'settled' },
    { id: '2', date: '2026-10-14', amount: 2800, trips: 4, status: 'settled' },
    { id: '3', date: '2026-10-13', amount: 4100, trips: 6, status: 'settled' },
    { id: '4', date: '2026-10-12', amount: 2650, trips: 3, status: 'settled' },
  ])

  const loadData = async () => {
    // Stub implementation to show UI design
    // In production, call: driverApi.get(`/api/v1/drivers/me/earnings?period=${period}`)
    setTimeout(() => {
      setLoading(false)
      setRefreshing(false)
    }, 1000)
  }

  useEffect(() => {
    loadData()
  }, [period])

  const onRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Earnings</Text>
        <TouchableOpacity style={styles.headerBtn}>
          <Ionicons name="help-circle-outline" size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.content}>
          {/* Period Selector */}
          <View style={styles.periodRow}>
            {(['today', 'weekly', 'monthly'] as const).map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.periodBtn, period === p ? styles.periodBtnActive : null]}
                onPress={() => setPeriod(p)}
              >
                <Text style={[styles.periodText, period === p ? styles.periodTextActive : styles.periodTextInactive]}>
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Main Card */}
          <View style={styles.mainCard}>
            <Text style={styles.mainCardTitle}>Net Earnings</Text>
            <Text style={styles.mainCardValue}>₹{earnings.net_earnings.toLocaleString()}</Text>
            
            <View style={styles.divider} />
            
            <View style={styles.mainCardRow}>
              <View>
                <Text style={styles.subCardTitle}>Total Revenue</Text>
                <Text style={styles.subCardValue}>₹{earnings.total_revenue.toLocaleString()}</Text>
              </View>
              <View>
                <Text style={styles.subCardTitle}>Platform Fee (-10%)</Text>
                <Text style={[styles.subCardValue, { textAlign: 'right' }]}>-₹{earnings.commission_deducted.toLocaleString()}</Text>
              </View>
            </View>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Ionicons name="car-outline" size={24} color="#3b82f6" style={{ marginBottom: 8 }} />
              <Text style={styles.statValue}>{earnings.completed_trips}</Text>
              <Text style={styles.statLabel}>Completed Trips</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="time-outline" size={24} color="#f59e0b" style={{ marginBottom: 8 }} />
              <Text style={styles.statValue}>{earnings.online_hours}h</Text>
              <Text style={styles.statLabel}>Online Hours</Text>
            </View>
          </View>

          {/* Settlement History */}
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Settlement History</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.historyCard}>
            {history.map((item, index) => (
              <View key={item.id} style={[styles.historyRow, index !== history.length - 1 ? styles.historyBorder : null]}>
                <View style={styles.historyLeft}>
                  <View style={styles.historyIconBox}>
                    <Ionicons name="checkmark-done" size={18} color="#10b981" />
                  </View>
                  <View>
                    <Text style={styles.historyDate}>{new Date(item.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                    <Text style={styles.historyTrips}>{item.trips} trips</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.historyAmount}>₹{item.amount.toLocaleString()}</Text>
                  <Text style={styles.historyStatus}>{item.status}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  headerBtn: { backgroundColor: '#F1F5F9', padding: 8, borderRadius: 20 },
  scroll: { flex: 1 },
  content: { padding: 20 },
  periodRow: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, marginBottom: 24 },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  periodBtnActive: { backgroundColor: '#FFFFFF', elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2 },
  periodText: { fontWeight: '600', textTransform: 'capitalize' },
  periodTextActive: { color: '#0F172A' },
  periodTextInactive: { color: '#64748B' },
  mainCard: { backgroundColor: '#059669', borderRadius: 24, padding: 24, elevation: 2, marginBottom: 24 },
  mainCardTitle: { color: '#D1FAE5', fontWeight: '600', marginBottom: 4 },
  mainCardValue: { color: '#FFFFFF', fontSize: 36, fontWeight: '900', marginBottom: 16 },
  divider: { height: 1, backgroundColor: 'rgba(16, 185, 129, 0.5)', marginBottom: 16 },
  mainCardRow: { flexDirection: 'row', justifyContent: 'space-between' },
  subCardTitle: { color: '#D1FAE5', fontSize: 12, marginBottom: 4 },
  subCardValue: { color: '#FFFFFF', fontWeight: 'bold' },
  statsGrid: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  statBox: { flex: 1, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', elevation: 1 },
  statValue: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  statLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '500', marginTop: 4 },
  historyHeader: { marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  viewAllText: { color: '#2563EB', fontWeight: '600', fontSize: 14 },
  historyCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden', marginBottom: 40 },
  historyRow: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyBorder: { borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  historyDate: { fontWeight: 'bold', color: '#0F172A' },
  historyTrips: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  historyAmount: { fontWeight: '900', color: '#0F172A' },
  historyStatus: { fontSize: 12, color: '#059669', fontWeight: '600', marginTop: 2, textTransform: 'capitalize' },
})
