/**
 * Saved Addresses Manager — Customer App
 * Route: /profile/addresses
 * Phase 4 (P4.1): Full CRUD for saved addresses (home, work, custom).
 * Wired to /profile/addresses API.
 */
import React, { useState, useCallback, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, ActivityIndicator, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useFocusEffect } from 'expo-router'
import { profileApi, routeApi } from '../../src/api/client'

// ── Types ────────────────────────────────────────────────────────────────────
interface SavedAddress {
  id?: string
  label: string
  address: string
  lat?: number
  lon?: number
}

interface SavedRoute {
  id: string
  route_name: string
  pickup_label: string
  pickup_address: string
  pickup_lat: number
  pickup_lon: number
  drop_label: string
  drop_address: string
  drop_lat: number
  drop_lon: number
}

const PRESET_LABELS = [
  { key: 'home',  icon: 'home',        color: '#059669' },
  { key: 'work',  icon: 'briefcase',   color: '#2563EB' },
  { key: 'gym',   icon: 'activity',    color: '#F59E0B' },
  { key: 'other', icon: 'map-pin',     color: '#6366F1' },
] as const

function labelMeta(label: string) {
  return PRESET_LABELS.find(p => p.key === label.toLowerCase()) || PRESET_LABELS[3]
}

// ── Inline form component ────────────────────────────────────────────────────
interface AddressFormProps {
  initial?: SavedAddress
  onSave: (addr: SavedAddress) => void
  onCancel: () => void
  saving: boolean
}

function AddressForm({ initial, onSave, onCancel, saving }: AddressFormProps) {
  const [label, setLabel]     = useState(initial?.label   || 'home')
  const [address, setAddress] = useState(initial?.address || '')
  const [custom, setCustom]   = useState(
    initial?.label && !PRESET_LABELS.some(p => p.key === initial.label.toLowerCase())
      ? initial.label : ''
  )

  const finalLabel = PRESET_LABELS.some(p => p.key === label.toLowerCase())
    ? label : (custom.trim() || 'other')

  const handleSave = () => {
    if (!address.trim()) {
      Alert.alert('Missing Address', 'Please enter a street address.')
      return
    }
    onSave({ ...initial, label: finalLabel, address: address.trim() })
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={formStyles.container}>
        <Text style={formStyles.heading}>{initial?.id ? 'Edit Address' : 'Add Address'}</Text>

        {/* Label picker */}
        <Text style={formStyles.fieldLabel}>Label</Text>
        <View style={formStyles.chipRow}>
          {PRESET_LABELS.map(p => (
            <TouchableOpacity
              key={p.key}
              style={[formStyles.chip, label === p.key && { backgroundColor: p.color + '20', borderColor: p.color }]}
              onPress={() => { setLabel(p.key); setCustom('') }}
            >
              <Feather name={p.icon as any} size={14} color={label === p.key ? p.color : '#64748B'} />
              <Text style={[formStyles.chipText, label === p.key && { color: p.color }]}>
                {p.key.charAt(0).toUpperCase() + p.key.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
          {/* Custom label button */}
          <TouchableOpacity
            style={[formStyles.chip, !PRESET_LABELS.some(p => p.key === label) && formStyles.chipActive]}
            onPress={() => setLabel('custom')}
          >
            <Feather name="edit-2" size={14} color="#6366F1" />
            <Text style={[formStyles.chipText, { color: '#6366F1' }]}>Custom</Text>
          </TouchableOpacity>
        </View>

        {/* Custom label text input */}
        {!PRESET_LABELS.some(p => p.key === label) && (
          <TextInput
            style={formStyles.input}
            placeholder="e.g. Parents' House"
            placeholderTextColor="#94A3B8"
            value={custom}
            onChangeText={setCustom}
            autoFocus
          />
        )}

        {/* Address input */}
        <Text style={formStyles.fieldLabel}>Full Address</Text>
        <TextInput
          style={[formStyles.input, { height: 80, textAlignVertical: 'top' }]}
          placeholder="e.g. 101, Rajiv Gandhi Nagar, Pune 411001"
          placeholderTextColor="#94A3B8"
          value={address}
          onChangeText={setAddress}
          multiline
        />

        {/* Buttons */}
        <View style={formStyles.btnRow}>
          <TouchableOpacity style={formStyles.cancelBtn} onPress={onCancel}>
            <Text style={formStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[formStyles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={formStyles.saveText}>Save Address</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

export default function SavedAddressesScreen() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([])
  const [routes, setRoutes] = useState<SavedRoute[]>([])
  const [loading, setLoading]     = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingRouteId, setDeletingRouteId] = useState<string | null>(null)

  // ── Load from API ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [addrRes, routeRes] = await Promise.all([
        profileApi.getAddresses(),
        routeApi.getRoutes(),
      ])
      setAddresses(addrRes.data?.data || addrRes.data || [])
      setRoutes(routeRes.data?.data || routeRes.data || [])
    } catch {
      setAddresses([])
      setRoutes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))



  // ── Delete Address ─────────────────────────────────────────────────────────
  const handleDelete = (addr: SavedAddress) => {
    Alert.alert(
      'Delete Address',
      `Remove "${addr.label.toUpperCase()}" — ${addr.address}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            if (!addr.id) return
            setDeletingId(addr.id)
            try {
              await profileApi.deleteAddress(addr.id)
              setAddresses(prev => prev.filter(a => a.id !== addr.id))
            } catch {
              Alert.alert('Error', 'Could not delete address')
            } finally {
              setDeletingId(null)
            }
          },
        },
      ]
    )
  }

  // ── Delete Route ───────────────────────────────────────────────────────────
  const handleDeleteRoute = (r: SavedRoute) => {
    Alert.alert(
      'Delete Route',
      `Remove route "${r.route_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            setDeletingRouteId(r.id)
            try {
              await routeApi.deleteRoute(r.id)
              setRoutes(prev => prev.filter(rt => rt.id !== r.id))
            } catch {
              Alert.alert('Error', 'Could not delete route')
            } finally {
              setDeletingRouteId(null)
            }
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Addresses</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/profile/address-picker' as any)}
        >
          <Feather name="plus" size={20} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Saved Routes Section ─────────────────────────── */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Feather name="navigation" size={18} color="#6366F1" />
              <Text style={styles.sectionTitle}>Saved Routes</Text>
            </View>
            <TouchableOpacity
              style={styles.sectionAddBtn}
              onPress={() => router.push('/profile/route-picker' as any)}
            >
              <Feather name="plus" size={16} color="#6366F1" />
              <Text style={styles.sectionAddBtnText}>Add Route</Text>
            </TouchableOpacity>
          </View>

          {routes.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyRouteCard}
              onPress={() => router.push('/profile/route-picker' as any)}
            >
              <Feather name="navigation" size={24} color="#A5B4FC" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyRouteText}>Tap to save a route</Text>
              <Text style={styles.emptyRouteSub}>e.g. Home → Office</Text>
            </TouchableOpacity>
          ) : (
            routes.map((r) => (
              <View key={r.id} style={styles.routeCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.routeName}>{r.route_name}</Text>
                  <View style={styles.routeRow}>
                    <View style={[styles.routeDot, { backgroundColor: '#10B981' }]} />
                    <Text style={styles.routeAddr} numberOfLines={1}>{r.pickup_address}</Text>
                  </View>
                  <View style={styles.routeVLine} />
                  <View style={styles.routeRow}>
                    <View style={[styles.routeDot, { backgroundColor: '#EF4444' }]} />
                    <Text style={styles.routeAddr} numberOfLines={1}>{r.drop_address}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteRoute(r)}
                  disabled={deletingRouteId === r.id}
                >
                  {deletingRouteId === r.id
                    ? <ActivityIndicator size="small" color="#EF4444" />
                    : <Feather name="trash-2" size={16} color="#EF4444" />
                  }
                </TouchableOpacity>
              </View>
            ))
          )}

          {/* ── Saved Addresses Section ──────────────────────── */}
          <View style={[styles.sectionHeader, { marginTop: 20 }]}>
            <View style={styles.sectionTitleRow}>
              <Feather name="map-pin" size={18} color="#2563EB" />
              <Text style={styles.sectionTitle}>Saved Addresses</Text>
            </View>
          </View>

          {addresses.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>📍</Text>
              <Text style={styles.emptyTitle}>No saved addresses yet</Text>
              <Text style={styles.emptySub}>Tap the + button to add your first address</Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => router.push('/profile/address-picker' as any)}
              >
                <Text style={styles.emptyAddText}>+ Add Address</Text>
              </TouchableOpacity>
            </View>
          )}

          {addresses.map((addr, i) => {
            const meta = labelMeta(addr.label)
            const isDeleting = addr.id && deletingId === addr.id
            return (
              <View key={addr.id || i} style={styles.addrCard}>
                {/* Icon */}
                <View style={[styles.addrIcon, { backgroundColor: meta.color + '18' }]}>
                  <Feather name={meta.icon as any} size={22} color={meta.color} />
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.addrLabel}>
                    {addr.label.charAt(0).toUpperCase() + addr.label.slice(1)}
                  </Text>
                  <Text style={styles.addrAddress} numberOfLines={2}>{addr.address}</Text>
                </View>

                {/* Actions */}
                <View style={styles.addrActions}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => router.push({ pathname: '/profile/address-picker', params: { id: addr.id, label: addr.label, address: addr.address, lat: addr.lat, lon: addr.lon } } as any)}
                  >
                    <Feather name="edit-2" size={16} color="#2563EB" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(addr)}
                    disabled={!!isDeleting}
                  >
                    {isDeleting
                      ? <ActivityIndicator size="small" color="#EF4444" />
                      : <Feather name="trash-2" size={16} color="#EF4444" />
                    }
                  </TouchableOpacity>
                </View>
              </View>
            )
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    shadowColor: '#94A3B8', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: '#0F172A', marginLeft: 4 },
  addBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#BFDBFE',
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Address card
  addrCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16,
    marginBottom: 12,
    shadowColor: '#94A3B8', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: '#F1F5F9', gap: 12,
  },
  addrIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  addrLabel: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 3 },
  addrAddress: { fontSize: 13, color: '#64748B', lineHeight: 18 },
  addrActions: { flexDirection: 'row', gap: 8 },
  editBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },

  // Section headers
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  sectionAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EEF2FF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: '#C7D2FE',
  },
  sectionAddBtnText: { fontSize: 13, fontWeight: '700', color: '#6366F1' },

  // Route cards
  routeCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 10,
    shadowColor: '#94A3B8', shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: '#EEF2FF', gap: 12,
  },
  routeName: { fontSize: 15, fontWeight: '700', color: '#312E81', marginBottom: 8 },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  routeDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  routeVLine: { width: 2, height: 14, backgroundColor: '#E2E8F0', marginLeft: 4, marginVertical: 2 },
  routeAddr: { flex: 1, fontSize: 12, color: '#64748B', lineHeight: 16 },
  emptyRouteCard: {
    alignItems: 'center', padding: 24, borderRadius: 16,
    backgroundColor: '#F5F3FF', borderWidth: 1.5, borderColor: '#C4B5FD',
    borderStyle: 'dashed', marginBottom: 10,
  },
  emptyRouteText: { fontSize: 14, fontWeight: '700', color: '#7C3AED', marginBottom: 4 },
  emptyRouteSub: { fontSize: 12, color: '#A78BFA' },

  // Empty state
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginBottom: 24 },
  emptyAddBtn: {
    backgroundColor: '#2563EB', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12,
  },
  emptyAddText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
})

const formStyles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF', margin: 16, borderRadius: 20, padding: 20,
    shadowColor: '#94A3B8', shadowOpacity: 0.12, shadowRadius: 12, elevation: 6,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  heading: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC',
  },
  chipActive: { borderColor: '#6366F1', backgroundColor: '#EEF2FF' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  input: {
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#0F172A', backgroundColor: '#F8FAFC',
    marginBottom: 14,
  },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center',
  },
  cancelText: { color: '#64748B', fontWeight: '700', fontSize: 15 },
  saveBtn: {
    flex: 2, paddingVertical: 13, borderRadius: 12,
    backgroundColor: '#2563EB', alignItems: 'center',
    shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
  },
  saveText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
})
