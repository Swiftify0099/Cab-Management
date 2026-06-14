/**
 * Address Setup Screen — Customer App (Step 2 of Onboarding)
 * Add up to 5 saved addresses with labels: Home, Work, Office, Trip Point, Holiday
 * Uses Google Maps Geocoding API for lat/lng resolution.
 */
import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { profileApi } from '../../api/client'

const MAX_ADDRESSES = 5

const ADDRESS_LABELS = [
  { key: 'home',      label: 'Home',        icon: 'home' as const,        color: '#3B82F6' },
  { key: 'work',      label: 'Work',         icon: 'briefcase' as const,   color: '#8B5CF6' },
  { key: 'office',    label: 'Office',       icon: 'monitor' as const,     color: '#10B981' },
  { key: 'trip',      label: 'Trip Point',   icon: 'map-pin' as const,     color: '#F59E0B' },
  { key: 'holiday',   label: 'Holiday',      icon: 'sun' as const,         color: '#EF4444' },
]

interface AddressEntry {
  id: string
  label: string
  address: string
  is_default: boolean
  saving: boolean
}

export default function AddressSetupScreen() {
  const [addresses, setAddresses] = useState<AddressEntry[]>([])
  const [adding, setAdding] = useState(false)
  const [newLabel, setNewLabel] = useState('home')
  const [newAddress, setNewAddress] = useState('')
  const [newDefault, setNewDefault] = useState(false)
  const [saving, setSaving] = useState(false)
  const [skipping, setSkipping] = useState(false)

  const usedLabels = addresses.map(a => a.label)
  const availableLabels = ADDRESS_LABELS.filter(l => !usedLabels.includes(l.key))

  const handleAddAddress = async () => {
    if (!newAddress.trim()) {
      Alert.alert('Missing Info', 'Please enter an address.')
      return
    }
    if (addresses.length >= MAX_ADDRESSES) {
      Alert.alert('Limit Reached', `You can save up to ${MAX_ADDRESSES} addresses.`)
      return
    }

    setSaving(true)
    try {
      const MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || ''
      let latitude: number | undefined
      let longitude: number | undefined

      // Try geocoding the typed address
      if (MAPS_KEY) {
        try {
          const geo = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(newAddress)}&key=${MAPS_KEY}`
          ).then(r => r.json())
          if (geo.results?.[0]?.geometry?.location) {
            latitude = geo.results[0].geometry.location.lat
            longitude = geo.results[0].geometry.location.lng
          }
        } catch { /* non-fatal */ }
      }

      const isDefault = newDefault || addresses.length === 0

      await profileApi.addAddress({
        label: newLabel,
        address: newAddress.trim(),
        latitude,
        longitude,
        is_default: isDefault,
      })

      const newEntry: AddressEntry = {
        id: Date.now().toString(),
        label: newLabel,
        address: newAddress.trim(),
        is_default: isDefault,
        saving: false,
      }

      // If this is set as default, unset others
      setAddresses(prev => {
        const updated = isDefault ? prev.map(a => ({ ...a, is_default: false })) : prev
        return [...updated, newEntry]
      })

      setNewAddress('')
      setNewDefault(false)
      setAdding(false)

      // Auto-select next available label
      const nextAvail = ADDRESS_LABELS.find(l => ![...usedLabels, newLabel].includes(l.key))
      if (nextAvail) setNewLabel(nextAvail.key)

    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to save address. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setAddresses(prev => prev.filter(a => a.id !== id))
    // Best-effort API delete (using saved address id if it comes from backend)
  }

  const handleSetDefault = async (id: string) => {
    setAddresses(prev =>
      prev.map(a => ({ ...a, is_default: a.id === id }))
    )
  }

  const handleFinish = () => {
    router.replace('/(tabs)')
  }

  const handleSkip = async () => {
    setSkipping(true)
    // No API call needed for skip — just navigate forward
    setTimeout(() => {
      setSkipping(false)
      router.replace('/(tabs)')
    }, 300)
  }

  const getLabelConfig = (key: string) => ADDRESS_LABELS.find(l => l.key === key) || ADDRESS_LABELS[0]

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0F172A', '#1E1B4B', '#0F172A']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Save Your Addresses</Text>
          <Text style={styles.subtitle}>Add your frequent locations for faster booking. (Up to {MAX_ADDRESSES})</Text>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
          <Text style={styles.stepText}>Step 2 of 2</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Saved Addresses List */}
          {addresses.map((addr) => {
            const config = getLabelConfig(addr.label)
            return (
              <View key={addr.id} style={styles.addressCard}>
                <View style={[styles.addressIconCircle, { backgroundColor: config.color + '22' }]}>
                  <Feather name={config.icon} size={20} color={config.color} />
                </View>
                <View style={styles.addressInfo}>
                  <View style={styles.addressTitleRow}>
                    <Text style={styles.addressLabel}>{config.label}</Text>
                    {addr.is_default && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Default</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.addressText} numberOfLines={2}>{addr.address}</Text>
                </View>
                <View style={styles.addressActions}>
                  {!addr.is_default && (
                    <TouchableOpacity onPress={() => handleSetDefault(addr.id)} style={styles.actionBtn}>
                      <Ionicons name="star-outline" size={18} color="#F59E0B" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => handleDelete(addr.id)} style={styles.actionBtn}>
                    <Feather name="trash-2" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            )
          })}

          {/* Empty State */}
          {addresses.length === 0 && !adding && (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 48 }}>🏠</Text>
              <Text style={styles.emptyText}>No addresses saved yet</Text>
              <Text style={styles.emptyHint}>Add your home and work for faster booking</Text>
            </View>
          )}

          {/* Add Address Form */}
          {adding && (
            <View style={styles.addForm}>
              <Text style={styles.addFormTitle}>New Address</Text>

              {/* Label Selector */}
              <Text style={styles.addFormLabel}>Label</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.labelScroll}>
                {availableLabels.map(l => (
                  <TouchableOpacity
                    key={l.key}
                    onPress={() => setNewLabel(l.key)}
                    style={[styles.labelChip, newLabel === l.key && { backgroundColor: l.color, borderColor: l.color }]}
                  >
                    <Feather name={l.icon} size={14} color={newLabel === l.key ? '#fff' : '#94A3B8'} />
                    <Text style={[styles.labelChipText, newLabel === l.key && { color: '#fff' }]}>{l.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Address Input */}
              <Text style={styles.addFormLabel}>Full Address</Text>
              <TextInput
                style={styles.addressInput}
                placeholder="e.g. 45 MG Road, Bangalore, KA 560001"
                placeholderTextColor="#64748B"
                value={newAddress}
                onChangeText={setNewAddress}
                multiline
                returnKeyType="done"
              />

              {/* Default Toggle */}
              {addresses.length > 0 && (
                <TouchableOpacity
                  onPress={() => setNewDefault(!newDefault)}
                  style={styles.defaultToggleRow}
                >
                  <View style={[styles.checkbox, newDefault && styles.checkboxActive]}>
                    {newDefault && <Feather name="check" size={12} color="#fff" />}
                  </View>
                  <Text style={styles.defaultToggleText}>Set as default pickup address</Text>
                </TouchableOpacity>
              )}

              {/* Form Buttons */}
              <View style={styles.formBtnRow}>
                <TouchableOpacity
                  style={styles.cancelFormBtn}
                  onPress={() => { setAdding(false); setNewAddress('') }}
                >
                  <Text style={styles.cancelFormText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveAddrBtn, saving && { opacity: 0.7 }]}
                  onPress={handleAddAddress}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.saveAddrText}>Save Address</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Add More Button */}
          {!adding && addresses.length < MAX_ADDRESSES && (
            <TouchableOpacity style={styles.addBtn} onPress={() => setAdding(true)}>
              <Feather name="plus" size={18} color="#3B82F6" />
              <Text style={styles.addBtnText}>Add Address</Text>
              <Text style={styles.addBtnCount}>{addresses.length}/{MAX_ADDRESSES}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} disabled={skipping}>
            <Text style={styles.skipText}>{skipping ? 'Loading...' : 'Skip for now'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.doneBtn, addresses.length === 0 && { opacity: 0.5 }]}
            onPress={handleFinish}
            disabled={addresses.length === 0}
          >
            <LinearGradient
              colors={['#2563EB', '#7C3AED']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.doneBtnGrad}
            >
              <Text style={styles.doneBtnText}>Continue →</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  )
}

const GLASS = {
  backgroundColor: 'rgba(255,255,255,0.06)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.1)',
} as const

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F172A' },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { fontSize: 14, color: '#94A3B8', marginTop: 6, lineHeight: 20 },
  progressTrack: { marginTop: 16, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2 },
  progressFill: { height: '100%' as any, width: '100%' as any, backgroundColor: '#2563EB', borderRadius: 2 },
  stepText: { fontSize: 12, color: '#64748B', marginTop: 4 },
  scroll: { flex: 1, paddingHorizontal: 16 },

  // Address cards
  addressCard: {
    flexDirection: 'row', alignItems: 'center',
    ...GLASS, borderRadius: 16, padding: 14, marginBottom: 10,
  },
  addressIconCircle: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  addressInfo: { flex: 1 },
  addressTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  addressLabel: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  defaultBadge: {
    backgroundColor: 'rgba(59,130,246,0.2)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: '#3B82F6',
  },
  defaultBadgeText: { color: '#3B82F6', fontSize: 10, fontWeight: '700' },
  addressText: { color: '#94A3B8', fontSize: 12, lineHeight: 16 },
  addressActions: { flexDirection: 'row', gap: 8, marginLeft: 8 },
  actionBtn: { padding: 6 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptyHint: { color: '#64748B', fontSize: 13, marginTop: 6, textAlign: 'center' },

  // Add form
  addForm: { ...GLASS, borderRadius: 20, padding: 20, marginBottom: 16 },
  addFormTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 16 },
  addFormLabel: { color: '#94A3B8', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  labelScroll: { marginBottom: 16 },
  labelChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)', marginRight: 8,
  },
  labelChipText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  addressInput: {
    ...GLASS, borderRadius: 12, padding: 14, fontSize: 14,
    color: '#FFFFFF', marginBottom: 16, minHeight: 72, textAlignVertical: 'top',
  },
  defaultToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  defaultToggleText: { color: '#94A3B8', fontSize: 13 },
  formBtnRow: { flexDirection: 'row', gap: 12 },
  cancelFormBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  cancelFormText: { color: '#94A3B8', fontWeight: '600' },
  saveAddrBtn: { flex: 2, backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveAddrText: { color: '#FFFFFF', fontWeight: '700' },

  // Add button
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    ...GLASS, borderRadius: 16, padding: 16, marginBottom: 16,
    borderStyle: 'dashed',
  },
  addBtnText: { color: '#3B82F6', fontWeight: '600', flex: 1 },
  addBtnCount: { color: '#64748B', fontSize: 12 },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32,
    backgroundColor: 'rgba(15,23,42,0.95)',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
  },
  skipBtn: {
    paddingVertical: 16, paddingHorizontal: 20, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center',
  },
  skipText: { color: '#94A3B8', fontWeight: '600', fontSize: 14 },
  doneBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  doneBtnGrad: { paddingVertical: 16, alignItems: 'center' },
  doneBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
})
