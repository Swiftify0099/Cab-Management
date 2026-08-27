/**
 * Partner Penalties & Cancellation History Screen
 * Loads real cancellation audit log from /matching/drivers/cancellation-history
 * Shows tiered warning banners, penalty counts, and individual event details.
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { rideApi, driverApi } from '../../src/api/client'

interface CancellationEvent {
  id: string
  cancelled_at: string
  cancellation_code: string
  reason_label: string
  is_penalty_exempt: boolean
  penalty_applied: number
  cumulative_cancellation_rate: number
  ride_id?: string
  customer_name?: string
  pickup_address?: string
}

interface PenaltySummary {
  penalty_cancellations: number
  cancellation_rate: number
  status: string
}

const TIER_COLORS: Record<string, string> = {
  ACTIVE: '#10B981',
  WARNING: '#F59E0B',
  TEMPORARILY_SUSPENDED: '#EF4444',
  BANNED: '#7F1D1D',
}

const TIER_LABELS: Record<string, string> = {
  ACTIVE: 'Good Standing',
  WARNING: 'Warning',
  TEMPORARILY_SUSPENDED: 'Suspended',
  BANNED: 'Banned',
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    })
  } catch { return dateStr }
}

export default function PenaltiesScreen() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [events, setEvents] = useState<CancellationEvent[]>([])
  const [summary, setSummary] = useState<PenaltySummary | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [histRes, profileRes] = await Promise.allSettled([
        rideApi.getCancellationHistory(50),
        driverApi.getProfile(),
      ])

      if (histRes.status === 'fulfilled') {
        const data = histRes.value.data?.data
        setEvents(Array.isArray(data) ? data : (data?.events || []))
      }

      if (profileRes.status === 'fulfilled') {
        const d = profileRes.value.data?.data || profileRes.value.data
        setSummary({
          penalty_cancellations: d.penalty_cancellations || 0,
          cancellation_rate:     d.cancellation_rate || 0,
          status:                d.status || 'ACTIVE',
        })
      }
    } catch (err) {
      console.warn('[Penalties] Load error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const statusColor = TIER_COLORS[summary?.status || 'ACTIVE'] || '#10B981'
  const statusLabel = TIER_LABELS[summary?.status || 'ACTIVE'] || 'Active'
  const cancelRate  = ((summary?.cancellation_rate || 0) * 100).toFixed(1)
  const penaltyCount = summary?.penalty_cancellations || 0

  return (
    <View style={s.root}>
      <LinearGradient colors={['#0F172A', '#1E293B']} style={StyleSheet.absoluteFill} />
      <SafeAreaView edges={['top']} style={s.safe}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={s.title}>Penalties & Cancellations</Text>
        </View>

        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={s.loadingText}>Loading penalty history...</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={s.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); loadData() }}
                tintColor="#3B82F6"
              />
            }
          >
            {/* Summary Card */}
            <View style={[s.summaryCard, { borderColor: statusColor + '40' }]}>
              <LinearGradient
                colors={[statusColor + '20', statusColor + '08']}
                style={s.summaryGrad}
              >
                <View style={s.summaryTop}>
                  <View style={[s.statusPill, { backgroundColor: statusColor + '25', borderColor: statusColor + '60' }]}>
                    <Ionicons
                      name={summary?.status === 'ACTIVE' ? 'checkmark-circle' : 'warning'}
                      size={14}
                      color={statusColor}
                    />
                    <Text style={[s.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
                  </View>
                  <Text style={s.summaryRateLabel}>Cancellation Rate</Text>
                  <Text style={[s.summaryRate, { color: statusColor }]}>{cancelRate}%</Text>
                </View>

                <View style={s.statsRow}>
                  <View style={s.statBlock}>
                    <MaterialCommunityIcons name="cancel" size={22} color="#EF4444" />
                    <Text style={s.statValue}>{penaltyCount}</Text>
                    <Text style={s.statLabel}>Penalty{'\n'}Cancellations</Text>
                  </View>
                  <View style={s.statDivider} />
                  <View style={s.statBlock}>
                    <MaterialCommunityIcons name="format-list-bulleted" size={22} color="#60A5FA" />
                    <Text style={s.statValue}>{events.length}</Text>
                    <Text style={s.statLabel}>Total{'\n'}Events</Text>
                  </View>
                  <View style={s.statDivider} />
                  <View style={s.statBlock}>
                    <MaterialCommunityIcons name="shield-check" size={22} color="#10B981" />
                    <Text style={s.statValue}>
                      {events.filter(e => e.is_penalty_exempt).length}
                    </Text>
                    <Text style={s.statLabel}>Exempt{'\n'}Cancellations</Text>
                  </View>
                </View>

                {summary?.status === 'WARNING' && (
                  <View style={s.warningBanner}>
                    <Feather name="alert-triangle" size={14} color="#F59E0B" />
                    <Text style={s.warningText}>
                      Your cancellation rate is elevated. Frequent unexcused cancellations may lead to a temporary suspension.
                    </Text>
                  </View>
                )}
                {summary?.status === 'TEMPORARILY_SUSPENDED' && (
                  <View style={[s.warningBanner, { borderColor: '#EF444440', backgroundColor: '#EF444410' }]}>
                    <Feather name="alert-octagon" size={14} color="#EF4444" />
                    <Text style={[s.warningText, { color: '#FCA5A5' }]}>
                      Your account is temporarily suspended. Please contact support to resolve this.
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </View>

            {/* Event List */}
            <Text style={s.sectionTitle}>Cancellation History</Text>

            {events.length === 0 ? (
              <View style={s.emptyBox}>
                <Ionicons name="checkmark-done-circle" size={52} color="#10B981" />
                <Text style={s.emptyHeading}>Clean Record!</Text>
                <Text style={s.emptySub}>You have no cancellation history. Keep up the great work!</Text>
              </View>
            ) : (
              events.map((ev, idx) => (
                <View
                  key={ev.id || idx}
                  style={[
                    s.eventCard,
                    { borderLeftColor: ev.is_penalty_exempt ? '#10B981' : '#EF4444' },
                  ]}
                >
                  <View style={s.eventTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.eventCode}>{ev.reason_label || ev.cancellation_code}</Text>
                      {ev.pickup_address ? (
                        <Text style={s.eventAddress} numberOfLines={1}>📍 {ev.pickup_address}</Text>
                      ) : null}
                      <Text style={s.eventDate}>{formatDate(ev.cancelled_at)}</Text>
                    </View>
                    <View style={[
                      s.exemptBadge,
                      { backgroundColor: ev.is_penalty_exempt ? '#10B98120' : '#EF444420' },
                    ]}>
                      <Text style={[
                        s.exemptText,
                        { color: ev.is_penalty_exempt ? '#10B981' : '#EF4444' },
                      ]}>
                        {ev.is_penalty_exempt ? 'Exempt' : `₹${ev.penalty_applied || 0} Penalty`}
                      </Text>
                    </View>
                  </View>
                  {ev.customer_name ? (
                    <Text style={s.eventMeta}>Customer: {ev.customer_name}</Text>
                  ) : null}
                  <Text style={s.eventRate}>
                    Rate after event: {((ev.cumulative_cancellation_rate || 0) * 100).toFixed(1)}%
                  </Text>
                </View>
              ))
            )}

            {/* Policy Note */}
            <View style={s.policyCard}>
              <Feather name="info" size={16} color="#60A5FA" />
              <View style={{ flex: 1 }}>
                <Text style={s.policyTitle}>Cancellation Policy</Text>
                <Text style={s.policyText}>
                  • Cancel rate ≥ 20% → Warning{'\n'}
                  • Cancel rate ≥ 30% → Temporary Suspension{'\n'}
                  • Penalty-exempt reasons: Vehicle breakdown, Medical emergency, Customer no-show, App error{'\n'}
                  • Repeated unexcused cancellations may result in permanent deactivation.
                </Text>
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  )
}

const s = StyleSheet.create({
  root:            { flex: 1, backgroundColor: '#0F172A' },
  safe:            { flex: 1 },
  header:          { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 16 },
  backBtn:         { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  title:           { color: '#F1F5F9', fontSize: 20, fontWeight: '800' },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:     { color: '#64748B', fontSize: 14 },
  scroll:          { paddingHorizontal: 16, paddingBottom: 40 },

  summaryCard:     { borderRadius: 18, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
  summaryGrad:     { padding: 18 },
  summaryTop:      { alignItems: 'center', marginBottom: 16 },
  statusPill:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1, marginBottom: 8 },
  statusPillText:  { fontSize: 12, fontWeight: '700' },
  summaryRateLabel:{ color: '#94A3B8', fontSize: 12, marginBottom: 4 },
  summaryRate:     { fontSize: 38, fontWeight: '900' },

  statsRow:        { flexDirection: 'row', justifyContent: 'space-around', marginTop: 4 },
  statBlock:       { alignItems: 'center', gap: 6, flex: 1 },
  statDivider:     { width: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  statValue:       { color: '#F1F5F9', fontSize: 22, fontWeight: '800' },
  statLabel:       { color: '#64748B', fontSize: 11, textAlign: 'center', lineHeight: 15 },

  warningBanner:   { flexDirection: 'row', gap: 8, marginTop: 14, backgroundColor: '#F59E0B10', borderWidth: 1, borderColor: '#F59E0B40', borderRadius: 10, padding: 10 },
  warningText:     { color: '#FDE68A', fontSize: 12, lineHeight: 18, flex: 1 },

  sectionTitle:    { color: '#94A3B8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 },

  emptyBox:        { alignItems: 'center', paddingVertical: 48, gap: 14 },
  emptyHeading:    { color: '#F1F5F9', fontSize: 22, fontWeight: '800' },
  emptySub:        { color: '#64748B', fontSize: 14, textAlign: 'center', lineHeight: 21, paddingHorizontal: 20 },

  eventCard:       { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 3 },
  eventTop:        { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  eventCode:       { color: '#F1F5F9', fontSize: 14, fontWeight: '700', marginBottom: 3 },
  eventAddress:    { color: '#94A3B8', fontSize: 12, marginBottom: 2 },
  eventDate:       { color: '#64748B', fontSize: 11 },
  exemptBadge:     { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  exemptText:      { fontSize: 11, fontWeight: '700' },
  eventMeta:       { color: '#64748B', fontSize: 12, marginTop: 6 },
  eventRate:       { color: '#475569', fontSize: 11, marginTop: 3 },

  policyCard:      { flexDirection: 'row', gap: 12, backgroundColor: 'rgba(59,130,246,0.08)', borderRadius: 14, padding: 14, marginTop: 8, borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)' },
  policyTitle:     { color: '#60A5FA', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  policyText:      { color: '#94A3B8', fontSize: 12, lineHeight: 20 },
})
