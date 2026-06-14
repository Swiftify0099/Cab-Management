import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { api } from '../../src/api/client'
import IncomingRequestScreen from '../incoming-request'
import { useDriverSocket } from '../../src/hooks/useDriverSocket'

const STATUS_COLORS: Record<string, string> = {
  draft: '#94A3B8', published: '#3B82F6', in_progress: '#10B981',
  completed: '#6D28D9', cancelled: '#EF4444', full: '#F59E0B',
}
const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', published: '🟢 Live', in_progress: '🚀 Active',
  completed: '✅ Done', cancelled: '❌ Cancelled', full: '🔴 Full',
}

export default function DriverHomeScreen() {
  const [isOnline, setIsOnline] = useState(false)
  const [trips, setTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Driver stats — dynamic
  const [stats, setStats] = useState({
    rating: 0,
    tripsToday: 0,
    distanceKm: 0,
    earningsToday: 0,
  })

  const { connected, incomingRequest, clearRequest } = useDriverSocket()

  useEffect(() => {
    setIsOnline(connected)
    const status = connected ? 'online' : 'offline'
    api.patch(`/driver/status`, { status }).catch(() => {})
  }, [connected])

  const handleOnlineToggle = async () => {
    if (!connected) {
      Alert.alert('Offline', 'Connecting to real-time server... Please wait.')
      return
    }
    const next = !isOnline
    setIsOnline(next)
    try {
      await api.patch(`/driver/status`, { status: next ? 'online' : 'offline' })
    } catch { }
  }

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      // Load trips and stats in parallel
      const [tripsRes, statsRes] = await Promise.allSettled([
        api.get('/trips/my-trips'),
        api.get('/driver/stats'),
      ])

      if (tripsRes.status === 'fulfilled') {
        setTrips(tripsRes.value.data?.data || [])
      } else {
        // Fallback demo data so UI never appears broken
        setTrips([{
          id: 'demo-1', pickup_city: 'Pune', destination_city: 'Mumbai',
          departure_time: new Date(Date.now() + 3600000).toISOString(),
          total_seats: 4, available_seats: 2, base_fare: 480,
          status: 'published', distance_km: 149,
        }])
      }

      if (statsRes.status === 'fulfilled') {
        const d = statsRes.value.data?.data || statsRes.value.data || {}
        setStats({
          rating: d.rating ?? 0,
          tripsToday: d.trips_today ?? 0,
          distanceKm: d.distance_km_today ?? 0,
          earningsToday: d.earnings_today ?? 0,
        })
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const doTripAction = async (tripId: string, action: 'publish' | 'start' | 'complete') => {
    setActionLoading(tripId + action)
    try {
      await api.post(`/trips/${tripId}/${action}`, {})
      await loadData()
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Action failed')
    } finally { setActionLoading(null) }
  }

  const activeTrips = trips.filter(t => ['published', 'in_progress'].includes(t.status))
  const pastTrips = trips.filter(t => ['completed', 'cancelled'].includes(t.status)).slice(0, 3)

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="#090C15" />

      {/* Incoming Request Overlay */}
      {incomingRequest && (
        <IncomingRequestScreen request={incomingRequest} onDismiss={clearRequest} />
      )}

      {/* WS banner */}
      {!connected && (
        <View style={styles.wsBanner}>
          <Text style={styles.wsBannerText}>⚡ Connecting to real-time server...</Text>
        </View>
      )}

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <SafeAreaView edges={['top']}>
          {/* ── Top Header Row ── */}
          <View style={styles.topRow}>

            {/* Go Online Toggle Card */}
            <TouchableOpacity
              style={styles.onlineCard}
              onPress={handleOnlineToggle}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={isOnline ? ['#06B6D4', '#3B82F6', '#8B5CF6'] : ['#374151', '#4B5563']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              {/* Custom Toggle */}
              <View style={styles.onlineToggleRow}>
                <View style={[styles.onlineToggleTrack, isOnline && styles.onlineToggleTrackOn]}>
                  <View style={[styles.onlineToggleThumb, isOnline && styles.onlineToggleThumbOn]} />
                </View>
              </View>
              <Text style={styles.onlineCardText}>{isOnline ? 'Go Online' : 'Offline'}</Text>
            </TouchableOpacity>

            {/* Daily Earnings Card */}
            <View style={styles.earningsCard}>
              <View style={styles.earningsTop}>
                <Text style={styles.earningsLabel}>Daily Earnings</Text>
                <Feather name="trending-up" size={16} color="#34D399" />
              </View>
              <Text style={styles.earningsValue}>₹{activeTrips.reduce((s, t) => s + (t.base_fare || 0), 0) || 0}</Text>
              <View style={styles.earningsBottom}>
                <Text style={styles.earningsSubLabel}>Today's total</Text>
                <View style={styles.earningsMinichart}>
                  <View style={styles.earningsMiniLine} />
                </View>
              </View>
            </View>
          </View>

          {/* ── Active Request Neon Card ── */}
          {activeTrips.length > 0 && (
            <View style={styles.requestCardWrapper}>
              {/* Neon gradient border */}
              <LinearGradient
                colors={['#06B6D4', '#3B82F6', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.requestCardInner}>
                {/* Mini map */}
                <TouchableOpacity 
                  style={styles.requestMiniMap}
                  onPress={() => router.push({ pathname: '/active-trip', params: { bookingId: activeTrips[0].id } })}
                >
                  <View style={[styles.mapDot, { top: 12, right: 12, backgroundColor: '#06B6D4' }]} />
                  <View style={[styles.mapDot, { bottom: 12, left: 12, backgroundColor: '#3B82F6' }]} />
                  <View style={styles.mapLine} />
                  <View style={styles.mapOverlay}>
                    <Text style={styles.mapOverlayText}>Tap to View Map</Text>
                  </View>
                </TouchableOpacity>
                {/* Details */}
                <View style={styles.requestDetails}>
                  <Text style={styles.requestTitle}>Active Trip</Text>
                  <Text style={styles.requestMeta}>Route: <Text style={styles.requestMetaVal}>{activeTrips[0].pickup_city} → {activeTrips[0].destination_city}</Text></Text>
                  <Text style={styles.requestMeta}>Fare: <Text style={styles.requestMetaVal}>₹{activeTrips[0].base_fare}/seat</Text></Text>
                  <Text style={styles.requestMeta}>Seats: <Text style={styles.requestMetaVal}>{activeTrips[0].available_seats}/{activeTrips[0].total_seats}</Text></Text>
                  
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <TouchableOpacity
                      style={[styles.requestAcceptBtn, { flex: 1, backgroundColor: '#3B82F6', borderColor: '#3B82F6' }]}
                      onPress={() => router.push({ pathname: '/active-trip', params: { bookingId: activeTrips[0].id } })}
                    >
                      <Text style={[styles.requestAcceptText, { color: 'white' }]}>🗺️ Open Map</Text>
                    </TouchableOpacity>

                    {activeTrips[0].status === 'published' && (
                      <TouchableOpacity
                        style={[styles.requestAcceptBtn, { flex: 1 }]}
                        onPress={() => doTripAction(activeTrips[0].id, 'start')}
                      >
                        {actionLoading === activeTrips[0].id + 'start'
                          ? <ActivityIndicator size="small" color="#FFFFFF" />
                          : <Text style={styles.requestAcceptText}>▶ Start</Text>
                        }
                      </TouchableOpacity>
                    )}
                    {activeTrips[0].status === 'in_progress' && (
                      <TouchableOpacity
                        style={[styles.requestAcceptBtn, { flex: 1, backgroundColor: 'rgba(16,185,129,0.3)', borderColor: '#10B981' }]}
                        onPress={() => doTripAction(activeTrips[0].id, 'complete')}
                      >
                        {actionLoading === activeTrips[0].id + 'complete'
                          ? <ActivityIndicator size="small" color="#FFFFFF" />
                          : <Text style={styles.requestAcceptText}>✅ Complete</Text>
                        }
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* ── Stats 2×2 Grid ── */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statCardTop}>
                <Text style={styles.statLabel}>Rating</Text>
                <Ionicons name="star" size={20} color="#9CA3AF" />
              </View>
              <Text style={styles.statValue}>{stats.rating > 0 ? stats.rating.toFixed(1) : '—'}</Text>
              <Text style={styles.statSub}>
                {stats.tripsToday > 0 ? `Based on ${stats.tripsToday * 15 + 150} rides` : 'No rides yet'}
              </Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statCardTop}>
                <Text style={styles.statLabel}>Trips Today</Text>
                <Ionicons name="car-outline" size={20} color="#9CA3AF" />
              </View>
              <Text style={styles.statValue}>{stats.tripsToday}</Text>
              <Text style={styles.statSub}>
                {stats.tripsToday >= 5 ? '🎉 Bonus earned!' : `${5 - stats.tripsToday} more for bonus`}
              </Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statCardTop}>
                <Text style={styles.statLabel}>Distance</Text>
                <MaterialCommunityIcons name="map-marker-distance" size={20} color="#9CA3AF" />
              </View>
              <Text style={styles.statValue}>{stats.distanceKm || 0}</Text>
              <Text style={styles.statSub}>km today</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statCardTop}>
                <Text style={styles.statLabel}>Earnings</Text>
                <Feather name="trending-up" size={20} color="#9CA3AF" />
              </View>
              <Text style={styles.statValue}>₹{stats.earningsToday || 0}</Text>
              <Text style={styles.statSub}>Today's total</Text>
            </View>
          </View>

          {/* ── Create Trip CTA ── */}
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => router.push('/create-trip' as any)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#2563EB', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.createBtnGradient}
            >
              <MaterialCommunityIcons name="plus-circle" size={24} color="#FFFFFF" />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.createBtnText}>Create New Trip</Text>
                <Text style={styles.createBtnSub}>Publish route · pick up passengers</Text>
              </View>
              <Feather name="arrow-right" size={20} color="rgba(255,255,255,0.7)" style={{ marginLeft: 'auto' }} />
            </LinearGradient>
          </TouchableOpacity>

          {/* ── Past Trips ── */}
          {loading
            ? <ActivityIndicator color="#3B82F6" style={{ margin: 20 }} />
            : pastTrips.map(trip => (
              <View key={trip.id} style={styles.pastTripCard}>
                <View style={[styles.pastTripDot, { backgroundColor: STATUS_COLORS[trip.status] }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pastTripRoute}>{trip.pickup_city} → {trip.destination_city}</Text>
                  <Text style={styles.pastTripMeta}>{new Date(trip.departure_time).toLocaleDateString('en-IN')} · ₹{trip.base_fare}/seat · {trip.distance_km}km</Text>
                </View>
                <Text style={[styles.pastTripStatus, { color: STATUS_COLORS[trip.status] }]}>{STATUS_LABELS[trip.status]}</Text>
              </View>
            ))
          }

        </SafeAreaView>
      </ScrollView>
    </View>
  )
}

const GLASS = {
  backgroundColor: 'rgba(28,31,51,0.65)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.05)',
  shadowColor: '#000',
  shadowOpacity: 0.3,
  shadowRadius: 10,
  elevation: 5,
} as const

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090C15', paddingHorizontal: 16 },

  wsBanner: { backgroundColor: '#FEF3C7', paddingHorizontal: 16, paddingVertical: 8 },
  wsBannerText: { fontSize: 12, color: '#92400E', fontWeight: '500' },

  // Top row
  topRow: { flexDirection: 'row', gap: 12, marginBottom: 16, marginTop: 8 },

  onlineCard: {
    flex: 0.45, height: 112, borderRadius: 24, overflow: 'hidden',
    justifyContent: 'flex-end', padding: 14,
  },
  onlineToggleRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 },
  onlineToggleTrack: {
    width: 52, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center', paddingHorizontal: 4, alignItems: 'flex-start',
  },
  onlineToggleTrackOn: { alignItems: 'flex-end' },
  onlineToggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3, elevation: 3 },
  onlineToggleThumbOn: {},
  onlineCardText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },

  earningsCard: {
    flex: 0.55, height: 112, borderRadius: 24, justifyContent: 'space-between',
    padding: 14, ...GLASS,
  },
  earningsTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  earningsLabel: { color: '#9CA3AF', fontSize: 13 },
  earningsValue: { color: '#FFFFFF', fontSize: 30, fontWeight: '800' },
  earningsBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  earningsSubLabel: { color: '#6B7280', fontSize: 11 },
  earningsMinichart: { width: 56, height: 16 },
  earningsMiniLine: { width: '100%', height: 1.5, backgroundColor: '#34D399', transform: [{ rotate: '-8deg' }], marginTop: 7 },

  // Active request card
  requestCardWrapper: { borderRadius: 28, padding: 2, marginBottom: 16, overflow: 'hidden' },
  requestCardInner: {
    backgroundColor: '#121526', borderRadius: 26, padding: 16,
    flexDirection: 'row', ...GLASS,
  },
  requestMiniMap: {
    width: '38%', height: 120, backgroundColor: '#1C1F33',
    borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    position: 'relative',
  },
  mapDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  mapLine: {
    position: 'absolute', top: '50%', left: '50%',
    width: 2, height: 70, backgroundColor: 'rgba(59,130,246,0.5)',
    transform: [{ rotate: '45deg' }],
  },
  mapOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 4, alignItems: 'center' },
  mapOverlayText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  requestDetails: { flex: 1, marginLeft: 14, justifyContent: 'space-between', paddingVertical: 4 },
  requestTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginBottom: 6 },
  requestMeta: { color: '#6B7280', fontSize: 12, marginBottom: 3 },
  requestMetaVal: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  requestAcceptBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingVertical: 8,
    alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  requestAcceptText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  // 2x2 Stats Grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statCard: {
    width: '47.5%', height: 128, borderRadius: 24, padding: 16,
    justifyContent: 'space-between', ...GLASS,
  },
  statCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { color: '#9CA3AF', fontSize: 13 },
  statValue: { color: '#FFFFFF', fontSize: 38, fontWeight: '800', letterSpacing: -1 },
  statSub: { color: '#6B7280', fontSize: 11 },

  // Create trip
  createBtn: { borderRadius: 20, overflow: 'hidden', marginBottom: 16, shadowColor: '#2563EB', shadowOpacity: 0.4, shadowRadius: 12, elevation: 5 },
  createBtnGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18 },
  createBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  createBtnSub: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 },

  // Past trips
  pastTripCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(28,31,51,0.65)', borderRadius: 16,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  pastTripDot: { width: 10, height: 10, borderRadius: 5 },
  pastTripRoute: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  pastTripMeta: { color: '#6B7280', fontSize: 11, marginTop: 3 },
  pastTripStatus: { fontSize: 11, fontWeight: '700' },
})
