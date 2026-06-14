/**
 * Customer App — My Parcels (Parcel Status Timeline)
 * Dynamic: fetches from /parcels/my-parcels
 * Removed heavy MapView background — uses gradient instead for performance.
 */
import React, { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, StatusBar, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useFocusEffect } from 'expo-router'
import { parcelApi } from '../../src/api/client'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:      { label: 'Pending',      color: '#F59E0B' },
  pickup_done:  { label: 'Picked Up',   color: '#3B82F6' },
  in_transit:   { label: 'In Transit',  color: '#8B5CF6' },
  delivered:    { label: 'Delivered',   color: '#22C55E' },
  cancelled:    { label: 'Cancelled',   color: '#EF4444' },
}

const FILTERS = ['All', 'Active', 'Delivered'] as const

const StepIcon = ({ status }: { status: string }) => {
  const bgColor =
    status === 'done'        ? '#22C55E' :
    status === 'in_progress' ? '#3B82F6' :
    status === 'current'     ? '#8B5CF6' :
    '#CBD5E1'

  const icon =
    status === 'done'        ? 'check' :
    status === 'in_progress' ? 'truck-fast' :
    status === 'current'     ? 'motorbike' :
    null

  return (
    <View style={[styles.stepCircle, { backgroundColor: bgColor }]}>
      {icon && (
        status === 'done'
          ? <Feather name="check" size={18} color="#fff" />
          : <MaterialCommunityIcons name={icon as any} size={18} color="#fff" />
      )}
    </View>
  )
}

export default function ParcelsTab() {
  const [parcels, setParcels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<typeof FILTERS[number]>('All')
  const [expanded, setExpanded] = useState<string | null>(null)

  const loadParcels = useCallback(async () => {
    try {
      const res = await parcelApi.getMyParcels()
      const data = res.data?.data || res.data || []
      setParcels(Array.isArray(data) ? data : [])
    } catch {
      setParcels([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { loadParcels() }, [loadParcels]))

  const onRefresh = () => { setRefreshing(true); loadParcels() }

  const filtered = parcels.filter(p => {
    if (filter === 'All') return true
    if (filter === 'Active') return ['pending', 'pickup_done', 'in_transit'].includes(p.status)
    return p.status === 'delivered'
  })

  const statusCfg = (status: string) => STATUS_CONFIG[status] || { label: status, color: '#94A3B8' }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Gradient background — replaces heavy MapView */}
      <LinearGradient
        colors={['#0B132B', '#1C3A70', '#0B132B']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Parcels</Text>
          <TouchableOpacity
            style={styles.sendBtn}
            onPress={() => router.push('/parcel-booking' as any)}
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterPill, filter === f && styles.filterPillActive]}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          style={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {loading && (
            <View style={styles.centered}>
              <ActivityIndicator color="#3B82F6" size="large" />
              <Text style={styles.loadingText}>Loading parcels...</Text>
            </View>
          )}

          {!loading && filtered.length === 0 && (
            <View style={styles.empty}>
              <Text style={{ fontSize: 56 }}>📦</Text>
              <Text style={styles.emptyText}>No parcels found</Text>
              <Text style={styles.emptyHint}>
                {filter === 'All' ? 'Send your first parcel!' : `No ${filter.toLowerCase()} parcels`}
              </Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/parcel-booking' as any)}>
                <Text style={styles.emptyBtnText}>Send a Parcel →</Text>
              </TouchableOpacity>
            </View>
          )}

          {!loading && filtered.map(parcel => {
            const cfg = statusCfg(parcel.status)
            const steps: any[] = parcel.steps || parcel.timeline || []
            const isExpanded = expanded === parcel.id

            return (
              <View key={parcel.id} style={styles.glassCard}>
                {/* Top Row: Tracking + Status */}
                <View style={styles.cardTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.trackingId}>
                      #{parcel.tracking_number || parcel.id?.slice(0, 8)?.toUpperCase()}
                    </Text>
                    <Text style={styles.etaText} numberOfLines={1}>
                      {parcel.receiver_address || parcel.dropoff_address || 'Delivery address'}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: cfg.color + '22', borderColor: cfg.color }]}>
                    <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>

                {/* ETA */}
                {parcel.eta && (
                  <View style={styles.etaRow}>
                    <Feather name="clock" size={12} color="#94A3B8" />
                    <Text style={styles.etaLabel}>ETA: <Text style={{ color: '#fff', fontWeight: '700' }}>{parcel.eta}</Text></Text>
                  </View>
                )}

                {/* Expand Toggle */}
                {steps.length > 0 && (
                  <TouchableOpacity onPress={() => setExpanded(isExpanded ? null : parcel.id)}>
                    <Text style={styles.expandToggle}>
                      {isExpanded ? '▲ Hide Timeline' : '▼ Show Timeline'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Timeline */}
                {isExpanded && steps.length > 0 && (
                  <View style={styles.timeline}>
                    {steps.map((step: any, i: number) => (
                      <View key={i} style={styles.timelineRow}>
                        <View style={styles.timelineLeft}>
                          <StepIcon status={step.status} />
                          {i < steps.length - 1 && (
                            <View style={[styles.connector, { backgroundColor: step.status === 'done' ? '#22C55E' : '#334155' }]} />
                          )}
                        </View>
                        <View style={styles.timelineContent}>
                          <Text style={styles.stepTitle}>{step.label}</Text>
                          <Text style={styles.stepDate}>{step.date}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Fragile Alert */}
                {parcel.is_fragile && (
                  <View style={styles.fragileRow}>
                    <MaterialCommunityIcons name="glass-fragile" size={14} color="#EF4444" />
                    <Text style={styles.fragileText}>Fragile — Handle with care</Text>
                  </View>
                )}

                {/* Receiver */}
                {parcel.receiver_name && (
                  <View style={styles.receiverRow}>
                    <Ionicons name="person-outline" size={14} color="#64748B" />
                    <Text style={styles.receiverText}>{parcel.receiver_name}</Text>
                  </View>
                )}
                {/* Live Track Button */}
                {(parcel.status === 'in_transit' || parcel.status === 'pickup_done') && (
                  <TouchableOpacity
                    style={{ marginTop: 12, backgroundColor: '#3B82F6', borderRadius: 12, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                    onPress={() => router.push({ pathname: '/track', params: { tripId: parcel.trip_id, isParcel: 'true' } } as any)}
                  >
                    <Feather name="map" size={16} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Track Live on Map</Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          })}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#3B82F6', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 12 },
  filterPill: {
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  filterPillActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  filterText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.65)' },
  filterTextActive: { color: '#FFFFFF' },

  scroll: { flex: 1, paddingHorizontal: 16 },

  centered: { alignItems: 'center', paddingTop: 60 },
  loadingText: { color: '#64748B', marginTop: 12 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginTop: 12 },
  emptyHint: { color: '#64748B', fontSize: 13, marginTop: 4, marginBottom: 24 },
  emptyBtn: { backgroundColor: '#2563EB', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    padding: 16, marginBottom: 14,
  },

  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  trackingId: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, marginBottom: 4 },
  etaText: { color: '#94A3B8', fontSize: 12 },
  statusBadge: {
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 10,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },

  etaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  etaLabel: { color: '#94A3B8', fontSize: 12 },

  expandToggle: { color: '#3B82F6', fontWeight: '600', fontSize: 13, marginVertical: 8 },

  timeline: { marginTop: 8, marginBottom: 8 },
  timelineRow: { flexDirection: 'row', marginBottom: 0 },
  timelineLeft: { alignItems: 'center', marginRight: 12, width: 40 },
  stepCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  connector: { width: 2, flex: 1, minHeight: 24, marginVertical: 2 },
  timelineContent: { flex: 1, paddingTop: 6, paddingBottom: 20 },
  stepTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  stepDate: { color: '#64748B', fontSize: 12, marginTop: 2 },

  fragileRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  fragileText: { color: '#EF4444', fontSize: 12, fontWeight: '600' },

  receiverRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  receiverText: { color: '#64748B', fontSize: 12 },
})
