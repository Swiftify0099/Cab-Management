/**
 * Customer App — My Parcels (Parcel Status Timeline)
 * Pixel-perfect from stitch: parcel_tracking_timeline_ui
 */
import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, StatusBar, Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import MapView from 'react-native-maps'
import { router } from 'expo-router'

const MOCK_PARCELS = [
  {
    id: 'p1',
    tracking_number: 'P-3849201',
    eta: 'Today, 6:00 PM',
    status: 'in_transit',
    is_fragile: true,
    fragile_type: 'Electronics',
    receiver_name: 'Rahul Sharma',
    receiver_address: 'Flat 4B, Pune City Center, Pune, MH',
    steps: [
      { label: 'Booking Confirmed', date: 'Oct 25, 10:00 AM', status: 'done' },
      { label: 'Driver Assigned',   date: 'Oct 25, 11:15 AM', status: 'done' },
      { label: 'In Transit (Mumbai)', date: 'Oct 26, 2:30 PM', status: 'in_progress' },
      { label: 'Out for Delivery (Pune)', date: 'Oct 27, 8:45 AM', status: 'current' },
    ],
  },
  {
    id: 'p2',
    tracking_number: 'P-2019876',
    eta: 'Delivered',
    status: 'delivered',
    is_fragile: false,
    fragile_type: '',
    receiver_name: 'Amit Singh',
    receiver_address: '45 IT Park, Pune',
    steps: [
      { label: 'Booking Confirmed', date: 'Oct 20, 9:00 AM',  status: 'done' },
      { label: 'Driver Assigned',   date: 'Oct 20, 9:45 AM',  status: 'done' },
      { label: 'In Transit',        date: 'Oct 20, 11:00 AM', status: 'done' },
      { label: 'Delivered',         date: 'Oct 20, 2:30 PM',  status: 'done' },
    ],
  },
]

const FILTERS = ['All', 'Active', 'Delivered']

export default function ParcelsTab() {
  const [parcels] = useState(MOCK_PARCELS)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState('All')
  const [expanded, setExpanded] = useState<string | null>('p1')

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 800)
  }, [])

  const filtered = parcels.filter(p => {
    if (filter === 'All') return true
    if (filter === 'Active') return ['pending', 'pickup_done', 'in_transit'].includes(p.status)
    return p.status === 'delivered'
  })

  const StepIcon = ({ status }: { status: string }) => {
    if (status === 'done') return (
      <View style={[styles.stepCircle, { backgroundColor: '#22C55E' }]}>
        <Feather name="check" size={22} color="white" />
      </View>
    )
    if (status === 'in_progress') return (
      <View style={[styles.stepCircle, { backgroundColor: '#3B82F6' }]}>
        <MaterialCommunityIcons name="truck-fast" size={22} color="white" />
      </View>
    )
    if (status === 'current') return (
      <View style={[styles.stepCircle, { backgroundColor: '#3B82F6', shadowColor: '#3B82F6', shadowOpacity: 0.5, shadowRadius: 8, elevation: 6 }]}>
        <MaterialCommunityIcons name="motorbike" size={22} color="white" />
      </View>
    )
    return <View style={[styles.stepCircle, { backgroundColor: '#CBD5E1' }]} />
  }

  const StepBadge = ({ status }: { status: string }) => {
    if (status === 'done') return (
      <View style={[styles.stepBadge, { backgroundColor: '#22C55E' }]}>
        <Text style={styles.stepBadgeText}>Completed</Text>
      </View>
    )
    if (status === 'in_progress') return (
      <View style={[styles.stepBadge, { backgroundColor: '#3B82F6' }]}>
        <Text style={styles.stepBadgeText}>In Progress</Text>
      </View>
    )
    if (status === 'current') return (
      <View style={[styles.stepBadgeLarge, { backgroundColor: '#3B82F6' }]}>
        <Text style={[styles.stepBadgeText, { lineHeight: 16, textAlign: 'center' }]}>Current{'\n'}Status</Text>
      </View>
    )
    return null
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0B132B" />

      {/* Map Background */}
      <View style={styles.mapBg}>
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: 19.0760,
            longitude: 72.8777,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          }}
        >
        </MapView>
        {/* Overlay gradient so UI is legible */}
        <LinearGradient
          colors={['transparent', 'rgba(11,19,43,0.7)', '#0B132B']}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Glassmorphic Main Container */}
      <SafeAreaView style={styles.safeArea}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={26} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Parcels</Text>
          <TouchableOpacity>
            <Feather name="share" size={22} color="black" />
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 && (
            <View style={styles.empty}>
              <Text style={{ fontSize: 52 }}>📦</Text>
              <Text style={styles.emptyText}>No parcels found</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/parcel-booking' as any)}>
                <Text style={styles.emptyBtnText}>Send a Parcel →</Text>
              </TouchableOpacity>
            </View>
          )}

          {filtered.map(parcel => (
            <View key={parcel.id} style={styles.glassCard}>
              <LinearGradient
                colors={['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.4)', 'rgba(240,249,255,0.9)']}
                style={StyleSheet.absoluteFill}
              />

              {/* Tracking ID + ETA */}
              <View style={styles.trackingBox}>
                <Text style={styles.trackingId}>
                  Tracking ID: <Text style={{ fontWeight: '700' }}>{parcel.tracking_number}</Text>
                </Text>
                <Text style={styles.etaText}>
                  Estimated Delivery: <Text style={{ fontWeight: '700' }}>{parcel.eta}</Text>
                </Text>
              </View>

              {/* Expand/collapse */}
              <TouchableOpacity onPress={() => setExpanded(expanded === parcel.id ? null : parcel.id)}>
                <Text style={styles.expandToggle}>{expanded === parcel.id ? 'Hide Timeline ▲' : 'Show Timeline ▼'}</Text>
              </TouchableOpacity>

              {expanded === parcel.id && (
                <View style={styles.timeline}>
                  {parcel.steps.map((step, i) => (
                    <View key={i} style={styles.timelineRow}>
                      <View style={styles.timelineLeft}>
                        <StepIcon status={step.status} />
                        {i < parcel.steps.length - 1 && (
                          <View style={[styles.timelineConnector, { backgroundColor: step.status === 'done' ? '#22C55E' : '#3B82F6' }]} />
                        )}
                      </View>
                      <View style={styles.timelineContent}>
                        <View style={styles.timelineContentRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.stepTitle}>{step.label}</Text>
                            <Text style={styles.stepDate}>{step.date}</Text>
                          </View>
                          <StepBadge status={step.status} />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Fragile Alert */}
              {parcel.is_fragile && (
                <View style={styles.fragileBox}>
                  <View style={styles.fragileIcon}>
                    <MaterialCommunityIcons name="glass-fragile" size={22} color="white" />
                  </View>
                  <View>
                    <Text style={styles.fragileTitle}>Fragile Item</Text>
                    <Text style={styles.fragileSub}>Handle with Care: {parcel.fragile_type}</Text>
                  </View>
                </View>
              )}

              {/* Recipient */}
              <View style={styles.recipientBox}>
                <Text style={styles.recipientTitle}>Recipient Details</Text>
                <Text style={styles.recipientName}>{parcel.receiver_name}</Text>
                <Text style={styles.recipientAddr}>{parcel.receiver_address}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}


const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E0F2FE' },
  mapBg: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  safeArea: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#000' },

  filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 12 },
  filterPill: {
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
  },
  filterPillActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  filterTextActive: { color: '#FFFFFF' },

  scroll: { flex: 1, paddingHorizontal: 16 },

  glassCard: {
    borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(255,255,255,0.6)', overflow: 'hidden',
    shadowColor: '#0C4A6E', shadowOpacity: 0.1, shadowRadius: 20, elevation: 5,
    marginBottom: 16, padding: 20,
  },

  trackingBox: {
    backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 16, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#93C5FD', shadowOpacity: 0.2, shadowRadius: 4,
  },
  trackingId: { color: '#000', fontSize: 14, fontWeight: '500', marginBottom: 2 },
  etaText: { color: '#000', fontSize: 14, fontWeight: '500' },
  expandToggle: { color: '#2563EB', fontWeight: '600', fontSize: 13, marginBottom: 12 },

  timeline: { marginBottom: 16 },
  timelineRow: { flexDirection: 'row', marginBottom: 0 },
  timelineLeft: { alignItems: 'center', marginRight: 14, width: 48 },
  stepCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  timelineConnector: { width: 2, flex: 1, minHeight: 32, marginVertical: 2 },
  timelineContent: { flex: 1, paddingTop: 4, paddingBottom: 20 },
  timelineContentRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingRight: 4 },
  stepTitle: { color: '#000', fontSize: 17, fontWeight: '700', marginBottom: 2 },
  stepDate: { color: '#6B7280', fontSize: 13 },
  stepBadge: { paddingHorizontal: 12, height: 24, justifyContent: 'center', borderRadius: 20, marginTop: 4 },
  stepBadgeLarge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, marginTop: 4 },
  stepBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },

  fragileBox: {
    backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 16, padding: 14, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#EF4444', shadowOpacity: 0.1, shadowRadius: 4,
  },
  fragileIcon: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#EF4444',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
    shadowColor: '#EF4444', shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
  },
  fragileTitle: { color: '#000', fontWeight: '700', fontSize: 15, marginBottom: 2 },
  fragileSub: { color: '#6B7280', fontSize: 13 },

  recipientBox: {
    backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#93C5FD', shadowOpacity: 0.1, shadowRadius: 4,
  },
  recipientTitle: { color: '#000', fontWeight: '700', fontSize: 14, marginBottom: 4 },
  recipientName: { color: '#1E293B', fontSize: 15, fontWeight: '500', marginBottom: 2 },
  recipientAddr: { color: '#6B7280', fontSize: 13 },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#475569', marginTop: 12, marginBottom: 20 },
  emptyBtn: { backgroundColor: '#2563EB', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
})
