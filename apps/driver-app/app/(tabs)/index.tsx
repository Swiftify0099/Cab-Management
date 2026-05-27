/**
 * Driver Home Tab — Trip Management + Real-Time Incoming Requests
 * Shows online toggle, active trip, quick-create button, and WS overlay.
 */
import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  Switch, StyleSheet, ActivityIndicator, Alert,
} from 'react-native'
import { router } from 'expo-router'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import IncomingRequestScreen from '../incoming-request'
import { useDriverSocket } from '../../src/hooks/useDriverSocket'

const API = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:80/api/v1'

const STATUS_COLORS: Record<string, string> = {
  draft: '#94A3B8',
  published: '#3B82F6',
  in_progress: '#10B981',
  completed: '#6D28D9',
  cancelled: '#EF4444',
  full: '#F59E0B',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  published: '🟢 Published',
  in_progress: '🚀 In Progress',
  completed: '✅ Completed',
  cancelled: '❌ Cancelled',
  full: '🔴 Full',
}

export default function DriverHomeScreen() {
  const [isOnline, setIsOnline] = useState(false)
  const [trips, setTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Real-time WebSocket integration
  const { connected, incomingRequest, clearRequest, sendHeartbeat } = useDriverSocket()

  // Handle online toggle — update driver status on backend
  const handleOnlineToggle = async (value: boolean) => {
    setIsOnline(value)
    try {
      const headers = await getAuthHeader()
      await axios.patch(`${API}/driver/status`, { status: value ? 'online' : 'offline' }, { headers })
    } catch {
      // Status update is best-effort
    }
  }

  useEffect(() => {
    loadTrips()
  }, [])

  const getAuthHeader = async () => {
    const token = await AsyncStorage.getItem('access_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const loadTrips = async () => {
    setLoading(true)
    try {
      const headers = await getAuthHeader()
      const res = await axios.get(`${API}/trips/my-trips`, { headers })
      setTrips(res.data.data || [])
    } catch {
      // Demo data while backend is being set up
      setTrips([
        {
          id: 'demo-1',
          pickup_city: 'Pune',
          destination_city: 'Mumbai',
          departure_time: new Date(Date.now() + 3600000).toISOString(),
          total_seats: 4,
          available_seats: 2,
          base_fare: 480,
          status: 'published',
          distance_km: 149,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const doTripAction = async (tripId: string, action: 'publish' | 'start' | 'complete') => {
    setActionLoading(tripId + action)
    try {
      const headers = await getAuthHeader()
      await axios.post(`${API}/trips/${tripId}/${action}`, {}, { headers })
      await loadTrips()
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  const activeTrips = trips.filter(t => ['published', 'in_progress'].includes(t.status))
  const pastTrips = trips.filter(t => ['completed', 'cancelled'].includes(t.status)).slice(0, 5)

  return (
    <View style={{ flex: 1 }}>
      {/* Incoming Request Overlay — appears over everything */}
      {incomingRequest && (
        <IncomingRequestScreen
          request={incomingRequest}
          onDismiss={clearRequest}
        />
      )}

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* WS Status indicator */}
        {!connected && (
          <View style={styles.wsWarning}>
            <Text style={styles.wsWarningText}>⚠️ Connecting to real-time server...</Text>
          </View>
        )}
        {/* Online Toggle Card */}
      <View style={styles.onlineCard}>
        <View>
          <Text style={styles.onlineTitle}>{isOnline ? '🟢 You are Online' : '🔴 You are Offline'}</Text>
          <Text style={styles.onlineSubtitle}>{isOnline ? 'Accepting trip requests' : 'Go online to start earning'}</Text>
        </View>
        <Switch
          value={isOnline}
          onValueChange={handleOnlineToggle}
          trackColor={{ false: '#475569', true: '#3B82F6' }}
          thumbColor={isOnline ? '#FFFFFF' : '#94A3B8'}
          ios_backgroundColor="#475569"
        />
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'Today', value: '₹0', icon: '💰' },
          { label: 'Trips', value: trips.length.toString(), icon: '🚗' },
          { label: 'Rating', value: '5.0★', icon: '⭐' },
        ].map(s => (
          <View key={s.label} style={styles.statCard}>
            <Text style={styles.statIcon}>{s.icon}</Text>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Create Trip CTA */}
      <TouchableOpacity
        style={styles.createBtn}
        onPress={() => router.push('/create-trip' as any)}
        activeOpacity={0.85}
      >
        <Text style={styles.createBtnText}>+ Create New Trip</Text>
        <Text style={styles.createBtnSub}>Publish your route and pick up passengers</Text>
      </TouchableOpacity>

      {/* Active Trips */}
      <Text style={styles.sectionTitle}>Active Trips</Text>
      {loading ? (
        <ActivityIndicator color="#3B82F6" style={{ margin: 20 }} />
      ) : activeTrips.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🛣️</Text>
          <Text style={styles.emptyText}>No active trips</Text>
          <Text style={styles.emptySubText}>Create a trip and start accepting passengers</Text>
        </View>
      ) : (
        activeTrips.map(trip => (
          <TripCard
            key={trip.id}
            trip={trip}
            onAction={doTripAction}
            actionLoading={actionLoading}
          />
        ))
      )}

      {/* Past Trips */}
      {pastTrips.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Recent History</Text>
          {pastTrips.map(trip => (
            <TripCard key={trip.id} trip={trip} onAction={doTripAction} actionLoading={actionLoading} />
          ))}
        </>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
    </View>
  )
}

function TripCard({ trip, onAction, actionLoading }: {
  trip: any
  onAction: (id: string, action: 'publish' | 'start' | 'complete') => void
  actionLoading: string | null
}) {
  const depTime = new Date(trip.departure_time)
  const color = STATUS_COLORS[trip.status] || '#94A3B8'

  return (
    <View style={styles.tripCard}>
      {/* Route */}
      <View style={styles.tripRoute}>
        <View style={[styles.statusDot, { backgroundColor: color }]} />
        <Text style={styles.tripCities}>{trip.pickup_city} → {trip.destination_city}</Text>
        <Text style={[styles.statusBadge, { color }]}>{STATUS_LABELS[trip.status]}</Text>
      </View>

      {/* Details */}
      <View style={styles.tripDetails}>
        <Text style={styles.tripMeta}>📅 {depTime.toLocaleDateString('en-IN')} {depTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
        <Text style={styles.tripMeta}>💺 {trip.available_seats}/{trip.total_seats} seats  📍 {trip.distance_km} km  💰 ₹{trip.base_fare}/seat</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.tripActions}>
        {trip.status === 'draft' && (
          <ActionBtn label="Publish" color="#3B82F6" loading={actionLoading === trip.id + 'publish'}
            onPress={() => onAction(trip.id, 'publish')} />
        )}
        {trip.status === 'published' && (
          <ActionBtn label="▶ Start Trip" color="#10B981" loading={actionLoading === trip.id + 'start'}
            onPress={() => onAction(trip.id, 'start')} />
        )}
        {trip.status === 'in_progress' && (
          <ActionBtn label="✅ Complete Trip" color="#6D28D9" loading={actionLoading === trip.id + 'complete'}
            onPress={() => onAction(trip.id, 'complete')} />
        )}
      </View>
    </View>
  )
}

function ActionBtn({ label, color, onPress, loading }: {
  label: string; color: string; onPress: () => void; loading: boolean
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      style={[styles.actionBtn, { backgroundColor: color, opacity: loading ? 0.6 : 1 }]}
      activeOpacity={0.8}
    >
      {loading
        ? <ActivityIndicator color="#fff" size="small" />
        : <Text style={styles.actionBtnText}>{label}</Text>
      }
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9', paddingTop: 16 },
  wsWarning: {
    backgroundColor: '#FEF3C7', paddingHorizontal: 16, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center',
  },
  wsWarningText: { fontSize: 12, color: '#92400E', fontWeight: '500' },
  onlineCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1E293B', borderRadius: 16, marginHorizontal: 16, marginBottom: 12,
    padding: 16,
  },
  onlineTitle: { color: '#F8FAFC', fontSize: 15, fontWeight: '700' },
  onlineSubtitle: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  statsRow: {
    flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 12,
  },
  statCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  statLabel: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  createBtn: {
    marginHorizontal: 16, marginBottom: 20, padding: 18,
    backgroundColor: '#2563EB', borderRadius: 16,
    shadowColor: '#2563EB', shadowOpacity: 0.35, shadowRadius: 12, elevation: 4,
  },
  createBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginBottom: 2 },
  createBtnSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#334155', marginHorizontal: 16, marginBottom: 8 },
  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, marginHorizontal: 16, padding: 28,
    alignItems: 'center', marginBottom: 12,
  },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  emptySubText: { fontSize: 12, color: '#94A3B8', marginTop: 4, textAlign: 'center' },
  tripCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, marginHorizontal: 16, marginBottom: 12,
    padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  tripRoute: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  tripCities: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0F172A' },
  statusBadge: { fontSize: 11, fontWeight: '700' },
  tripDetails: { marginBottom: 12, gap: 4 },
  tripMeta: { fontSize: 12, color: '#64748B' },
  tripActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  actionBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
})
