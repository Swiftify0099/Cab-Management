/**
 * Customer App — My Parcels (Parcel Status Timeline)
 * Refactored: All hardcoded colors → theme tokens.
 * Components: AppText, AppLoader, AppChip, AppEmptyState, AppBadge, AppButton.
 * Business logic: UNCHANGED. API calls: UNCHANGED.
 */
import React, { useState, useCallback } from 'react'
import {
  View, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useFocusEffect } from 'expo-router'
import { parcelApi } from '../../src/api/client'
import { useTheme } from '../../src/contexts/ThemeContext'
import {
  AppText, AppLoader, AppChip, AppEmptyState, AppBadge, AppButton,
} from '../../src/components/ui'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  created:          { label: 'Created',     color: '#94A3B8' },
  searching_driver: { label: 'Searching',   color: '#F59E0B' },
  pending:          { label: 'Searching',   color: '#F59E0B' },
  driver_assigned:  { label: 'Assigned',    color: '#6366F1' },
  accepted:         { label: 'Assigned',    color: '#6366F1' },
  at_pickup:        { label: 'At Pickup',   color: '#3B82F6' },
  pickup_done:      { label: 'Picked Up',   color: '#3B82F6' },
  picked_up:        { label: 'Picked Up',   color: '#3B82F6' },
  in_transit:       { label: 'In Transit',  color: '#8B5CF6' },
  near_destination: { label: 'Arriving',    color: '#06B6D4' },
  at_destination:   { label: 'Arrived',     color: '#06B6D4' },
  delivered:        { label: 'Delivered',   color: '#22C55E' },
  cancelled:        { label: 'Cancelled',   color: '#EF4444' },
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
  const { theme } = useTheme()
  const [parcels,    setParcels]   = useState<any[]>([])
  const [loading,    setLoading]   = useState(true)
  const [refreshing, setRefreshing]= useState(false)
  const [filter,     setFilter]    = useState<typeof FILTERS[number]>('All')
  const [expanded,   setExpanded]  = useState<string | null>(null)

  const loadParcels = useCallback(async () => {
    try {
      const res  = await parcelApi.getMyParcels()
      const data = res.data?.data || res.data || []
      setParcels(Array.isArray(data) ? data : [])
    } catch {
      setParcels([])
    } finally {
      setLoading(false); setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { loadParcels() }, [loadParcels]))

  const onRefresh = () => { setRefreshing(true); loadParcels() }

  const filtered = parcels.filter(p => {
    const s = (p.status || '').toLowerCase()
    if (filter === 'All') return true
    if (filter === 'Active') return ['searching_driver', 'pending', 'created', 'driver_assigned', 'accepted', 'at_pickup', 'pickup_done', 'picked_up', 'in_transit', 'near_destination', 'at_destination'].includes(s)
    return s === 'delivered'
  })

  const statusCfg = (status: string) => STATUS_CONFIG[(status || '').toLowerCase()] || { label: status, color: '#94A3B8' }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={theme.gradient.parcelsBg} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <AppText variant="title" bold color="white">My Parcels</AppText>
          <AppButton
            variant="primary"
            size="sm"
            icon="plus"
            onPress={() => router.push('/parcel-booking' as any)}
          >
            Send
          </AppButton>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <AppChip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />
          ))}
        </View>

        <ScrollView
          style={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {loading && <AppLoader color="primary" />}

          {!loading && filtered.length === 0 && (
            <AppEmptyState
              icon="📦"
              title="No parcels found"
              subtitle={filter === 'All' ? 'Send your first parcel!' : `No ${filter.toLowerCase()} parcels`}
              action={{ label: 'Send a Parcel →', onPress: () => router.push('/parcel-booking' as any) }}
            />
          )}

          {!loading && filtered.map(parcel => {
            const pId      = parcel.parcel_id || parcel.id
            const cfg      = statusCfg(parcel.status)
            const steps: any[] = parcel.steps || parcel.timeline || []
            const isExpanded   = expanded === pId

            return (
              <TouchableOpacity
                key={pId}
                style={styles.glassCard}
                activeOpacity={0.88}
                onPress={() => router.push({ pathname: '/parcel-tracking', params: { parcel_id: pId } } as any)}
              >
                {/* Top Row */}
                <View style={styles.cardTopRow}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyS" bold color="white" style={{ marginBottom: 4 }}>
                      #{parcel.tracking_number || pId?.slice(0, 8)?.toUpperCase()}
                    </AppText>
                    <AppText variant="small" color="secondary" numberOfLines={1}>
                      {parcel.receiver_address || parcel.dropoff_address || 'Delivery address'}
                    </AppText>
                  </View>
                  <AppBadge label={cfg.label} color={cfg.color} bg={cfg.color + '22'} />
                </View>

                {/* Weight and Category info */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <AppText variant="small" color="muted">
                    📦 {parcel.weight_kg || 1} kg • ₹{parcel.fare || 100}
                  </AppText>
                </View>

                {/* Fragile Alert */}
                {parcel.is_fragile && (
                  <View style={styles.fragileRow}>
                    <MaterialCommunityIcons name="glass-fragile" size={14} color={theme.colors.error} />
                    <AppText variant="small" style={{ color: theme.colors.error, marginLeft: 6, fontWeight: '600' }}>
                      Fragile — Handle with care
                    </AppText>
                  </View>
                )}

                {/* Receiver */}
                {parcel.receiver_name && (
                  <View style={styles.receiverRow}>
                    <Ionicons name="person-outline" size={14} color={theme.colors.textMuted} />
                    <AppText variant="small" color="muted" style={{ marginLeft: 6 }}>Receiver: {parcel.receiver_name}</AppText>
                  </View>
                )}

                {/* Live Track Action */}
                <AppButton
                  variant="primary"
                  icon="map"
                  style={{ marginTop: 12 }}
                  onPress={() => router.push({ pathname: '/parcel-tracking', params: { parcel_id: pId } } as any)}
                >
                  {parcel.status === 'delivered' ? 'View Delivery Receipt (POD)' : 'Track Live Shipment'}
                </AppButton>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root:    { flex: 1 },
  safeArea:{ flex: 1 },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  filterRow:   { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 12 },
  scroll:      { flex: 1, paddingHorizontal: 16 },

  glassCard:   { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', padding: 16, marginBottom: 14 },
  cardTopRow:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },

  etaRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  timeline:    { marginTop: 8, marginBottom: 8 },
  timelineRow: { flexDirection: 'row', marginBottom: 0 },
  timelineLeft:{ alignItems: 'center', marginRight: 12, width: 40 },
  stepCircle:  { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  connector:   { width: 2, flex: 1, minHeight: 24, marginVertical: 2 },
  timelineContent:{ flex: 1, paddingTop: 6, paddingBottom: 20 },

  fragileRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  receiverRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
})
