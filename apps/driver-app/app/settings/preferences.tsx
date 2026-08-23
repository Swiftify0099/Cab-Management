/**
 * Driver Ride Preferences Screen — Feature 6 (Approved Light Mode with Dark Mode support)
 * Configures driving focus modes, trip type permissions, pickup constraints, and destination mode.
 */
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useTheme } from '../../src/theme'
import { DrivingFocusMode, DriverPreferencesData, DestinationMode } from '../../src/types/smartRadar'
import { DriverPreferenceService } from '../../src/services/driverPreferenceService'

const MODES: { id: DrivingFocusMode; label: string; sub?: string; icon: string }[] = [
  { id: 'balanced', label: 'Balanced', sub: 'Recommended', icon: 'sliders' },
  { id: 'earnings_focus', label: 'Best Earnings', sub: 'High hourly rate', icon: 'dollar-sign' },
  { id: 'nearby_focus', label: 'Nearby Trips', sub: '< 3 km pickup', icon: 'map-pin' },
  { id: 'short_trips', label: 'Short Trips', sub: '< 6 km routes', icon: 'zap' },
  { id: 'long_trips', label: 'Long Trips', sub: '> 18 km routes', icon: 'compass' },
  { id: 'airport_focus', label: 'Airport Focus', sub: 'Airport transfers', icon: 'send' },
]

export default function DriverRidePreferencesScreen() {
  const { theme, isDark } = useTheme()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preferences, setPreferences] = useState<DriverPreferencesData>(
    DriverPreferenceService.getCachedPreferences()
  )

  useEffect(() => {
    DriverPreferenceService.getPreferences().then(data => {
      setPreferences(data)
      setLoading(false)
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await DriverPreferenceService.updatePreferences(preferences)
      Alert.alert('Preferences Saved', 'Your Smart Ride Radar and matching preferences have been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Could not sync preferences with server.')
    } finally {
      setSaving(false)
    }
  }

  const bgRoot = isDark ? '#090C15' : '#F8FAFC'
  const bgCard = isDark ? '#1E293B' : '#FFFFFF'
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A'
  const textSecondary = isDark ? '#94A3B8' : '#64748B'
  const borderCol = isDark ? '#334155' : '#E2E8F0'

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: bgRoot, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0284C7" />
      </View>
    )
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: bgRoot }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>
          Ride Preferences
        </Text>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Request Coverage (All City / Specific City / Hex) */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: isDark ? '#0C4A6E' : '#E0F2FE', borderColor: '#0284C7', marginBottom: 16 }]}
          onPress={() => router.push('/settings/coverage' as any)}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <View style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: '#0284C7', justifyContent: 'center', alignItems: 'center' }}>
                <Feather name="map" size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#F8FAFC' : '#0F172A' }}>
                  Request Coverage
                </Text>
                <Text style={{ fontSize: 12, color: isDark ? '#BAE6FD' : '#0369A1', marginTop: 2 }}>
                  Configure All City, Specific City, or Zone/Hex preferences
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={20} color="#0284C7" />
          </View>
        </TouchableOpacity>

        {/* Section 1: Driving Focus Mode */}
        <View style={[styles.card, { backgroundColor: bgCard, borderColor: borderCol }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>
            Driving Focus Mode
          </Text>
          <Text style={[styles.sectionSub, { color: textSecondary }]}>
            Choose how our smart scoring engine prioritizes opportunities for you.
          </Text>

          <View style={styles.modeGrid}>
            {MODES.map(m => {
              const isSelected = preferences.mode === m.id
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.modeCard,
                    {
                      borderColor: isSelected ? '#0284C7' : borderCol,
                      backgroundColor: isSelected
                        ? isDark
                          ? 'rgba(2,132,199,0.15)'
                          : '#EFF6FF'
                        : isDark
                        ? '#0F172A'
                        : '#F8FAFC',
                    },
                  ]}
                  onPress={() => setPreferences(prev => ({ ...prev, mode: m.id }))}
                  activeOpacity={0.7}
                >
                  <View style={styles.modeIconRow}>
                    <Feather
                      name={m.icon as any}
                      size={16}
                      color={isSelected ? '#0284C7' : textSecondary}
                    />
                    <Text
                      style={[
                        styles.modeLabel,
                        { color: isSelected ? '#0284C7' : textPrimary, fontWeight: isSelected ? '800' : '600' },
                      ]}
                    >
                      {m.label}
                    </Text>
                  </View>
                  {m.sub && (
                    <Text style={[styles.modeSub, { color: isSelected ? '#0284C7' : textSecondary }]}>
                      {m.sub}
                    </Text>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Section 2: Trip Types Permissions */}
        <View style={[styles.card, { backgroundColor: bgCard, borderColor: borderCol }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>
            Trip Types
          </Text>
          <Text style={[styles.sectionSub, { color: textSecondary }]}>
            Toggle the service categories you are open to accepting.
          </Text>

          {/* Local */}
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setPreferences(prev => ({ ...prev, allow_local: !prev.allow_local }))}
          >
            <View style={[styles.checkbox, preferences.allow_local && styles.checkboxActive]}>
              {preferences.allow_local && <Feather name="check" size={14} color="#FFFFFF" />}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.checkLabel, { color: textPrimary }]}>Local City Rides (Instant)</Text>
              <Text style={[styles.checkSub, { color: textSecondary }]}>Point-to-point daily commutes</Text>
            </View>
          </TouchableOpacity>

          {/* Airport */}
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setPreferences(prev => ({ ...prev, allow_airport: !prev.allow_airport }))}
          >
            <View style={[styles.checkbox, preferences.allow_airport && styles.checkboxActive]}>
              {preferences.allow_airport && <Feather name="check" size={14} color="#FFFFFF" />}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.checkLabel, { color: textPrimary }]}>Airport Transfers (High Earning)</Text>
              <Text style={[styles.checkSub, { color: textSecondary }]}>Airport geofenced departure/arrivals</Text>
            </View>
          </TouchableOpacity>

          {/* Scheduled */}
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setPreferences(prev => ({ ...prev, allow_scheduled: !prev.allow_scheduled }))}
          >
            <View style={[styles.checkbox, preferences.allow_scheduled && styles.checkboxActive]}>
              {preferences.allow_scheduled && <Feather name="check" size={14} color="#FFFFFF" />}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.checkLabel, { color: textPrimary }]}>Scheduled Rides (Advance Booking)</Text>
              <Text style={[styles.checkSub, { color: textSecondary }]}>Pre-booked time slots</Text>
            </View>
          </TouchableOpacity>

          {/* Outstation */}
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setPreferences(prev => ({ ...prev, allow_outstation: !prev.allow_outstation }))}
          >
            <View style={[styles.checkbox, preferences.allow_outstation && styles.checkboxActive]}>
              {preferences.allow_outstation && <Feather name="check" size={14} color="#FFFFFF" />}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.checkLabel, { color: textPrimary }]}>Outstation / Intercity Trips</Text>
              <Text style={[styles.checkSub, { color: textSecondary }]}>Long routes requiring highway permit</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Section 3: Pickup Constraints */}
        <View style={[styles.card, { backgroundColor: bgCard, borderColor: borderCol }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>
            Pickup Constraints
          </Text>

          {/* Max Pickup Distance */}
          <View style={styles.constraintRow}>
            <View>
              <Text style={[styles.constraintLabel, { color: textPrimary }]}>Max Pickup Distance</Text>
              <Text style={[styles.constraintSub, { color: textSecondary }]}>Only offers within this radius</Text>
            </View>
            <View style={styles.chipRow}>
              {[3.0, 5.0, 7.0, 10.0].map(val => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.smallPill,
                    preferences.max_pickup_distance_km === val && styles.smallPillActive,
                  ]}
                  onPress={() => setPreferences(prev => ({ ...prev, max_pickup_distance_km: val }))}
                >
                  <Text
                    style={[
                      styles.smallPillText,
                      preferences.max_pickup_distance_km === val && styles.smallPillTextActive,
                    ]}
                  >
                    {val} km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Max Pickup ETA */}
          <View style={[styles.constraintRow, { marginTop: 16 }]}>
            <View>
              <Text style={[styles.constraintLabel, { color: textPrimary }]}>Max Pickup ETA</Text>
              <Text style={[styles.constraintSub, { color: textSecondary }]}>Travel time to customer</Text>
            </View>
            <View style={styles.chipRow}>
              {[5, 10, 15, 20].map(val => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.smallPill,
                    preferences.max_pickup_eta_min === val && styles.smallPillActive,
                  ]}
                  onPress={() => setPreferences(prev => ({ ...prev, max_pickup_eta_min: val }))}
                >
                  <Text
                    style={[
                      styles.smallPillText,
                      preferences.max_pickup_eta_min === val && styles.smallPillTextActive,
                    ]}
                  >
                    {val} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Section 4: Destination Mode (Towards Home) */}
        <View style={[styles.card, { backgroundColor: bgCard, borderColor: borderCol }]}>
          <View style={styles.destHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                Destination Mode (Towards Home)
              </Text>
              <Text style={[styles.sectionSub, { color: textSecondary }]}>
                Only receive ride opportunities that move in your heading.
              </Text>
            </View>
            <Switch
              value={preferences.destination_mode !== 'off'}
              onValueChange={val =>
                setPreferences(prev => ({
                  ...prev,
                  destination_mode: val ? 'flexible' : 'off',
                }))
              }
              trackColor={{ false: '#CBD5E1', true: '#0284C7' }}
            />
          </View>

          {preferences.destination_mode !== 'off' && (
            <View style={[styles.destTargetBox, { backgroundColor: isDark ? '#0F172A' : '#EFF6FF' }]}>
              <Feather name="map-pin" size={16} color="#0284C7" />
              <Text style={[styles.destTargetText, { color: textPrimary }]}>
                {preferences.destination_address || 'Target: Pune Station / Home'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  saveBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  card: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  sectionSub: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 14,
    lineHeight: 17,
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeCard: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  modeIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeLabel: {
    fontSize: 13,
  },
  modeSub: {
    fontSize: 10,
    marginTop: 3,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  checkLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  checkSub: {
    fontSize: 11,
    marginTop: 1,
  },
  constraintRow: {
    paddingVertical: 4,
  },
  constraintLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  constraintSub: {
    fontSize: 11,
    marginTop: 1,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  smallPillActive: {
    backgroundColor: '#0284C7',
  },
  smallPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  smallPillTextActive: {
    color: '#FFFFFF',
  },
  destHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  destTargetBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    gap: 8,
  },
  destTargetText: {
    fontSize: 13,
    fontWeight: '700',
  },
})
