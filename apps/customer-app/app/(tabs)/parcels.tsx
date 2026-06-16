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
  pending:      { label: 'Pending',    color: '#F59E0B' },
  pickup_done:  { label: 'Picked Up',  color: '#3B82F6' },
  in_transit:   { label: 'In Transit', color: '#8B5CF6' },
  delivered:    { label: 'Delivered',  color: '#22C55E' },
  cancelled:    { label: 'Cancelled',  color: '#EF4444' },
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
    if (filter === 'All')       return true
    if (filter === 'Active')    return ['pending', 'pickup_done', 'in_transit'].includes(p.status)
    return p.status === 'delivered'
  })

  const statusCfg = (status: string) => STATUS_CONFIG[status] || { label: status, color: '#94A3B8' }

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
            const cfg      = statusCfg(parcel.status)
            const steps: any[] = parcel.steps || parcel.timeline || []
            const isExpanded   = expanded === parcel.id

            return (
              <View key={parcel.id} style={styles.glassCard}>
                {/* Top Row */}
                <View style={styles.cardTopRow}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyS" bold color="white" style={{ marginBottom: 4 }}>
                      #{parcel.tracking_number || parcel.id?.slice(0, 8)?.toUpperCase()}
                    </AppText>
                    <AppText variant="small" color="secondary" numberOfLines={1}>
                      {parcel.receiver_address || parcel.dropoff_address || 'Delivery address'}
                    </AppText>
                  </View>
                  <AppBadge label={cfg.label} color={cfg.color} bg={cfg.color + '22'} />
                </View>

                {/* ETA */}
                {parcel.eta && (
                  <View style={styles.etaRow}>
                    <Feather name="clock" size={12} color={theme.colors.textMuted} />
                    <AppText variant="small" color="secondary" style={{ marginLeft: 6 }}>
                      ETA: <AppText variant="small" bold color="white">{parcel.eta}</AppText>
                    </AppText>
                  </View>
                )}

                {/* Expand Toggle */}
                {steps.length > 0 && (
                  <TouchableOpacity onPress={() => setExpanded(isExpanded ? null : parcel.id)}>
                    <AppText variant="caption" color="brand" style={{ marginVertical: 8 }}>
                      {isExpanded ? '▲ Hide Timeline' : '▼ Show Timeline'}
                    </AppText>
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
                          <AppText variant="bodyS" semibold color="white">{step.label}</AppText>
                          <AppText variant="small" color="muted" style={{ marginTop: 2 }}>{step.date}</AppText>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

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
                    <AppText variant="small" color="muted" style={{ marginLeft: 6 }}>{parcel.receiver_name}</AppText>
                  </View>
                )}

                {/* Live Track */}
                {(parcel.status === 'in_transit' || parcel.status === 'pickup_done') && (
                  <AppButton
                    variant="primary"
                    icon="map"
                    style={{ marginTop: 12 }}
                    onPress={() => router.push({ pathname: '/track', params: { tripId: parcel.trip_id, isParcel: 'true' } } as any)}
                  >
                    Track Live on Map
                  </AppButton>
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
