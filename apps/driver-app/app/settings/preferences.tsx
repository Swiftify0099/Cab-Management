/**
 * Driver Ride & Service Preferences Screen — Feature 6 & Service Customizations
 * Configures driving focus modes, service type permissions, detailed service customizations,
 * pickup constraints, and destination mode.
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
  TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useTheme } from '../../src/theme'
import { DrivingFocusMode, DriverPreferencesData, DestinationMode, ServiceCustomizationsData } from '../../src/types/smartRadar'
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
  const [activeCustomTab, setActiveCustomTab] = useState<'transport' | 'airport' | 'packers' | 'parcel' | 'rental' | 'outstation' | 'carpool'>('transport')
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
      Alert.alert('Preferences Saved', 'Your Smart Ride Radar and service customizations have been synced with the server.', [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Could not sync preferences with server.')
    } finally {
      setSaving(false)
    }
  }

  const updateCustomization = (serviceKey: keyof ServiceCustomizationsData, field: string, value: any) => {
    setPreferences(prev => {
      const currentCust = prev.service_customizations || {}
      const targetService = (currentCust as any)[serviceKey] || {}
      return {
        ...prev,
        service_customizations: {
          ...currentCust,
          [serviceKey]: {
            ...targetService,
            [field]: value,
          },
        },
      }
    })
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

  const cust = preferences.service_customizations || {}

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: bgRoot }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>
          Service & Ride Preferences
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

        {/* Section 2: All Service Categories Permissions */}
        <View style={[styles.card, { backgroundColor: bgCard, borderColor: borderCol }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>
            Service Permissions & Trip Types
          </Text>
          <Text style={[styles.sectionSub, { color: textSecondary }]}>
            Toggle the service categories you are open to accepting across the platform.
          </Text>

          {/* Local City */}
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setPreferences(prev => ({ ...prev, allow_local: !prev.allow_local }))}
          >
            <View style={[styles.checkbox, preferences.allow_local && styles.checkboxActive]}>
              {preferences.allow_local && <Feather name="check" size={14} color="#FFFFFF" />}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.checkLabel, { color: textPrimary }]}>Local City Rides (Point-to-Point)</Text>
              <Text style={[styles.checkSub, { color: textSecondary }]}>Daily intracity passenger commutes</Text>
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
              <Text style={[styles.checkLabel, { color: textPrimary }]}>Airport Transfers (Flight-Aware)</Text>
              <Text style={[styles.checkSub, { color: textSecondary }]}>Terminal pickups, meet & greet, airport queue</Text>
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
              <Text style={[styles.checkLabel, { color: textPrimary }]}>Outstation & Intercity Rides</Text>
              <Text style={[styles.checkSub, { color: textSecondary }]}>High-fare highway trips, multi-city round trips</Text>
            </View>
          </TouchableOpacity>

          {/* Rental */}
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setPreferences(prev => ({ ...prev, allow_rental: !prev.allow_rental }))}
          >
            <View style={[styles.checkbox, preferences.allow_rental && styles.checkboxActive]}>
              {preferences.allow_rental && <Feather name="check" size={14} color="#FFFFFF" />}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.checkLabel, { color: textPrimary }]}>Hourly Rentals (Flexible Chauffeur)</Text>
              <Text style={[styles.checkSub, { color: textSecondary }]}>Multi-hour & multi-stop booked packages (2h–12h)</Text>
            </View>
          </TouchableOpacity>

          {/* Parcel */}
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setPreferences(prev => ({ ...prev, allow_parcel: !prev.allow_parcel }))}
          >
            <View style={[styles.checkbox, preferences.allow_parcel && styles.checkboxActive]}>
              {preferences.allow_parcel && <Feather name="check" size={14} color="#FFFFFF" />}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.checkLabel, { color: textPrimary }]}>Parcel & Courier Deliveries</Text>
              <Text style={[styles.checkSub, { color: textSecondary }]}>Documents, food & retail parcel deliveries</Text>
            </View>
          </TouchableOpacity>

          {/* Transport / Freight */}
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setPreferences(prev => ({ ...prev, allow_transport: !prev.allow_transport }))}
          >
            <View style={[styles.checkbox, preferences.allow_transport && styles.checkboxActive]}>
              {preferences.allow_transport && <Feather name="check" size={14} color="#FFFFFF" />}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.checkLabel, { color: textPrimary }]}>Commercial Goods Transport & Freight</Text>
              <Text style={[styles.checkSub, { color: textSecondary }]}>Heavy payload cargo, Tata Ace, pickup trucks</Text>
            </View>
          </TouchableOpacity>

          {/* Packers & Movers */}
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setPreferences(prev => ({ ...prev, allow_packers: !prev.allow_packers }))}
          >
            <View style={[styles.checkbox, preferences.allow_packers && styles.checkboxActive]}>
              {preferences.allow_packers && <Feather name="check" size={14} color="#FFFFFF" />}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.checkLabel, { color: textPrimary }]}>Packers & Movers (Shifting & Relocation)</Text>
              <Text style={[styles.checkSub, { color: textSecondary }]}>Home/office shifting, full inventory relocation</Text>
            </View>
          </TouchableOpacity>

          {/* Carpool Sharing */}
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setPreferences(prev => ({ ...prev, allow_carpool: !prev.allow_carpool }))}
          >
            <View style={[styles.checkbox, preferences.allow_carpool && styles.checkboxActive]}>
              {preferences.allow_carpool && <Feather name="check" size={14} color="#FFFFFF" />}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.checkLabel, { color: textPrimary }]}>Intercity Highway Carpool (Seat Sharing)</Text>
              <Text style={[styles.checkSub, { color: textSecondary }]}>Publish seat corridors & passenger ridesharing</Text>
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
              <Text style={[styles.checkLabel, { color: textPrimary }]}>Scheduled / Advance Bookings</Text>
              <Text style={[styles.checkSub, { color: textSecondary }]}>Receive early reservations for future time slots</Text>
            </View>
          </TouchableOpacity>

          {/* Ladies-Only Mode */}
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setPreferences(prev => ({ ...prev, ladies_only_accepted: !prev.ladies_only_accepted }))}
          >
            <View style={[styles.checkbox, preferences.ladies_only_accepted && styles.checkboxActive]}>
              {preferences.ladies_only_accepted && <Feather name="check" size={14} color="#FFFFFF" />}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.checkLabel, { color: textPrimary }]}>Women-Only Rides Protection Mode</Text>
              <Text style={[styles.checkSub, { color: textSecondary }]}>Accept women-only rides & safe verified matching</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Section 3: Deep Service Customizations (Per Service Fine-Tuning) */}
        <View style={[styles.card, { backgroundColor: bgCard, borderColor: borderCol }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>
            Service Customizations & Operational Capabilities
          </Text>
          <Text style={[styles.sectionSub, { color: textSecondary }]}>
            Fine-tune your vehicle capacity, labor crew, helper capabilities, and specialized equipment per service.
          </Text>

          {/* Service Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.customTabsScroll}>
            {[
              { key: 'transport', label: '🚛 Transport' },
              { key: 'airport', label: '✈️ Airport' },
              { key: 'packers', label: '📦 Packers' },
              { key: 'parcel', label: '📬 Parcel' },
              { key: 'rental', label: '⏱️ Rental' },
              { key: 'outstation', label: '🛣️ Outstation' },
              { key: 'carpool', label: '🚗 Carpool' },
            ].map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.customTabBtn,
                  activeCustomTab === tab.key && styles.customTabBtnActive,
                  { borderColor: activeCustomTab === tab.key ? '#0284C7' : borderCol },
                ]}
                onPress={() => setActiveCustomTab(tab.key as any)}
              >
                <Text
                  style={[
                    styles.customTabText,
                    activeCustomTab === tab.key && styles.customTabTextActive,
                    { color: activeCustomTab === tab.key ? '#0284C7' : textSecondary },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Tab Content 1: Transport Customization */}
          {activeCustomTab === 'transport' && (
            <View style={styles.customBody}>
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: textPrimary }]}>Max Payload Capacity</Text>
                  <Text style={[styles.settingSub, { color: textSecondary }]}>Maximum cargo payload you can carry</Text>
                </View>
                <View style={styles.chipRow}>
                  {[750, 1500, 4000, 8000].map(kg => (
                    <TouchableOpacity
                      key={kg}
                      style={[styles.smallPill, cust.transport?.max_payload_kg === kg && styles.smallPillActive]}
                      onPress={() => updateCustomization('transport', 'max_payload_kg', kg)}
                    >
                      <Text style={[styles.smallPillText, cust.transport?.max_payload_kg === kg && styles.smallPillTextActive]}>
                        {kg >= 1000 ? `${kg / 1000}T` : `${kg}kg`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={[styles.settingRow, { marginTop: 14 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: textPrimary }]}>Helpers Included</Text>
                  <Text style={[styles.settingSub, { color: textSecondary }]}>Number of loading/unloading helpers</Text>
                </View>
                <View style={styles.chipRow}>
                  {[0, 1, 2, 3].map(h => (
                    <TouchableOpacity
                      key={h}
                      style={[styles.smallPill, cust.transport?.helpers_provided === h && styles.smallPillActive]}
                      onPress={() => updateCustomization('transport', 'helpers_provided', h)}
                    >
                      <Text style={[styles.smallPillText, cust.transport?.helpers_provided === h && styles.smallPillTextActive]}>
                        {h}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={[styles.settingRow, { marginTop: 14 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: textPrimary }]}>Accept Fragile Cargo</Text>
                  <Text style={[styles.settingSub, { color: textSecondary }]}>Padded tie-downs & delicate electronics</Text>
                </View>
                <Switch
                  value={cust.transport?.accept_fragile ?? true}
                  onValueChange={v => updateCustomization('transport', 'accept_fragile', v)}
                  trackColor={{ false: '#CBD5E1', true: '#0284C7' }}
                />
              </View>
            </View>
          )}

          {/* Tab Content 2: Airport Customization */}
          {activeCustomTab === 'airport' && (
            <View style={styles.customBody}>
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: textPrimary }]}>Meet & Greet Service</Text>
                  <Text style={[styles.settingSub, { color: textSecondary }]}>Hold passenger namecard at arrival terminal</Text>
                </View>
                <Switch
                  value={cust.airport?.meet_and_greet_enabled ?? true}
                  onValueChange={v => updateCustomization('airport', 'meet_and_greet_enabled', v)}
                  trackColor={{ false: '#CBD5E1', true: '#0284C7' }}
                />
              </View>

              <View style={[styles.settingRow, { marginTop: 14 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: textPrimary }]}>Auto Flight Delay Adjustment</Text>
                  <Text style={[styles.settingSub, { color: textSecondary }]}>Automatically sync pickup window with flight radar</Text>
                </View>
                <Switch
                  value={cust.airport?.auto_flight_delay_adjust ?? true}
                  onValueChange={v => updateCustomization('airport', 'auto_flight_delay_adjust', v)}
                  trackColor={{ false: '#CBD5E1', true: '#0284C7' }}
                />
              </View>

              <View style={[styles.settingRow, { marginTop: 14 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: textPrimary }]}>Airport Queue Auto-Join</Text>
                  <Text style={[styles.settingSub, { color: textSecondary }]}>Enter virtual staging FIFO queue when inside airport hex</Text>
                </View>
                <Switch
                  value={cust.airport?.queue_mode ?? true}
                  onValueChange={v => updateCustomization('airport', 'queue_mode', v)}
                  trackColor={{ false: '#CBD5E1', true: '#0284C7' }}
                />
              </View>
            </View>
          )}

          {/* Tab Content 3: Packers Customization */}
          {activeCustomTab === 'packers' && (
            <View style={styles.customBody}>
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: textPrimary }]}>Crew Size Provided</Text>
                  <Text style={[styles.settingSub, { color: textSecondary }]}>Trained packing crew members</Text>
                </View>
                <View style={styles.chipRow}>
                  {[2, 3, 4, 6].map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.smallPill, cust.packers?.crew_size === c && styles.smallPillActive]}
                      onPress={() => updateCustomization('packers', 'crew_size', c)}
                    >
                      <Text style={[styles.smallPillText, cust.packers?.crew_size === c && styles.smallPillTextActive]}>
                        {c} Crew
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={[styles.settingRow, { marginTop: 14 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: textPrimary }]}>Furniture Assembly Service</Text>
                  <Text style={[styles.settingSub, { color: textSecondary }]}>Disassembly/reassembly of beds & wardrobes</Text>
                </View>
                <Switch
                  value={cust.packers?.provides_assembly ?? true}
                  onValueChange={v => updateCustomization('packers', 'provides_assembly', v)}
                  trackColor={{ false: '#CBD5E1', true: '#0284C7' }}
                />
              </View>

              <View style={[styles.settingRow, { marginTop: 14 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: textPrimary }]}>Multi-Layer Bubble Packing</Text>
                  <Text style={[styles.settingSub, { color: textSecondary }]}>Coring boxes, stretch wrap & foam sheets</Text>
                </View>
                <Switch
                  value={cust.packers?.provides_fragile_packing ?? true}
                  onValueChange={v => updateCustomization('packers', 'provides_fragile_packing', v)}
                  trackColor={{ false: '#CBD5E1', true: '#0284C7' }}
                />
              </View>
            </View>
          )}

          {/* Tab Content 4: Parcel Customization */}
          {activeCustomTab === 'parcel' && (
            <View style={styles.customBody}>
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: textPrimary }]}>Max Parcel Weight Limit</Text>
                  <Text style={[styles.settingSub, { color: textSecondary }]}>Maximum courier weight acceptable</Text>
                </View>
                <View style={styles.chipRow}>
                  {[5, 10, 20, 50].map(kg => (
                    <TouchableOpacity
                      key={kg}
                      style={[styles.smallPill, cust.parcel?.max_parcel_kg === kg && styles.smallPillActive]}
                      onPress={() => updateCustomization('parcel', 'max_parcel_kg', kg)}
                    >
                      <Text style={[styles.smallPillText, cust.parcel?.max_parcel_kg === kg && styles.smallPillTextActive]}>
                        {kg} kg
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={[styles.settingRow, { marginTop: 14 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: textPrimary }]}>Priority Express Deliveries</Text>
                  <Text style={[styles.settingSub, { color: textSecondary }]}>Accept urgent 45-min delivery jobs</Text>
                </View>
                <Switch
                  value={cust.parcel?.accept_express ?? true}
                  onValueChange={v => updateCustomization('parcel', 'accept_express', v)}
                  trackColor={{ false: '#CBD5E1', true: '#0284C7' }}
                />
              </View>
            </View>
          )}

          {/* Tab Content 5: Rental Customization */}
          {activeCustomTab === 'rental' && (
            <View style={styles.customBody}>
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: textPrimary }]}>Min Package Duration</Text>
                  <Text style={[styles.settingSub, { color: textSecondary }]}>Minimum rental hours acceptable</Text>
                </View>
                <View style={styles.chipRow}>
                  {[1, 2, 4].map(h => (
                    <TouchableOpacity
                      key={h}
                      style={[styles.smallPill, cust.rental?.min_package_hours === h && styles.smallPillActive]}
                      onPress={() => updateCustomization('rental', 'min_package_hours', h)}
                    >
                      <Text style={[styles.smallPillText, cust.rental?.min_package_hours === h && styles.smallPillTextActive]}>
                        {h} hr
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={[styles.settingRow, { marginTop: 14 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: textPrimary }]}>Full Day Packages (8h/12h)</Text>
                  <Text style={[styles.settingSub, { color: textSecondary }]}>Accept whole-day chauffeur contracts</Text>
                </View>
                <Switch
                  value={(cust.rental?.max_package_hours ?? 12) >= 8}
                  onValueChange={v => updateCustomization('rental', 'max_package_hours', v ? 12 : 4)}
                  trackColor={{ false: '#CBD5E1', true: '#0284C7' }}
                />
              </View>
            </View>
          )}

          {/* Tab Content 6: Outstation Customization */}
          {activeCustomTab === 'outstation' && (
            <View style={styles.customBody}>
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: textPrimary }]}>One-Way Intercity Drops</Text>
                  <Text style={[styles.settingSub, { color: textSecondary }]}>Accept single-leg outstation drops</Text>
                </View>
                <Switch
                  value={cust.outstation?.accept_one_way ?? true}
                  onValueChange={v => updateCustomization('outstation', 'accept_one_way', v)}
                  trackColor={{ false: '#CBD5E1', true: '#0284C7' }}
                />
              </View>

              <View style={[styles.settingRow, { marginTop: 14 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: textPrimary }]}>Round Trips with Overnight Stay</Text>
                  <Text style={[styles.settingSub, { color: textSecondary }]}>Accept multi-day return outstation trips</Text>
                </View>
                <Switch
                  value={cust.outstation?.accept_round_trip ?? true}
                  onValueChange={v => updateCustomization('outstation', 'accept_round_trip', v)}
                  trackColor={{ false: '#CBD5E1', true: '#0284C7' }}
                />
              </View>
            </View>
          )}

          {/* Tab Content 7: Carpool Customization */}
          {activeCustomTab === 'carpool' && (
            <View style={styles.customBody}>
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: textPrimary }]}>AC Cabin Guarantee</Text>
                  <Text style={[styles.settingSub, { color: textSecondary }]}>Climate control on all highway seats</Text>
                </View>
                <Switch
                  value={cust.carpool?.ac_available ?? true}
                  onValueChange={v => updateCustomization('carpool', 'ac_available', v)}
                  trackColor={{ false: '#CBD5E1', true: '#0284C7' }}
                />
              </View>

              <View style={[styles.settingRow, { marginTop: 14 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: textPrimary }]}>Boot Space for Large Luggage</Text>
                  <Text style={[styles.settingSub, { color: textSecondary }]}>Allows riders with suitcases</Text>
                </View>
                <Switch
                  value={cust.carpool?.luggage_friendly ?? true}
                  onValueChange={v => updateCustomization('carpool', 'luggage_friendly', v)}
                  trackColor={{ false: '#CBD5E1', true: '#0284C7' }}
                />
              </View>
            </View>
          )}
        </View>

        {/* Section 4: Pickup Constraints */}
        <View style={[styles.card, { backgroundColor: bgCard, borderColor: borderCol }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>
            Pickup Constraints & Filtering
          </Text>

          {/* Max Pickup Distance */}
          <View style={styles.constraintRow}>
            <View>
              <Text style={[styles.constraintLabel, { color: textPrimary }]}>Max Pickup Distance</Text>
              <Text style={[styles.constraintSub, { color: textSecondary }]}>Only offers within this radius</Text>
            </View>
            <View style={styles.chipRow}>
              {[3.0, 5.0, 7.0, 10.0, 15.0].map(val => (
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
              {[5, 10, 15, 20, 30].map(val => (
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

        {/* Section 5: Destination Mode (Towards Home) */}
        <View style={[styles.card, { backgroundColor: bgCard, borderColor: borderCol }]}>
          <View style={styles.destHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                Destination Mode (Towards Home)
              </Text>
              <Text style={[styles.sectionSub, { color: textSecondary }]}>
                Only receive ride opportunities that move in your direction.
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
                {preferences.destination_address || 'Target: Selected destination heading'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backBtn: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  saveBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  modeCard: {
    width: '48%',
    borderRadius: 10,
    borderWidth: 1.5,
    padding: 12,
  },
  modeIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  modeLabel: {
    fontSize: 14,
  },
  modeSub: {
    fontSize: 11,
    marginTop: 2,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  checkLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkSub: {
    fontSize: 12,
    marginTop: 1,
  },
  customTabsScroll: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  customTabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    backgroundColor: 'transparent',
  },
  customTabBtnActive: {
    backgroundColor: 'rgba(2,132,199,0.12)',
  },
  customTabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  customTabTextActive: {
    fontWeight: '700',
  },
  customBody: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: 12,
    borderRadius: 10,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  settingSub: {
    fontSize: 11,
    marginTop: 2,
  },
  constraintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  constraintLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  constraintSub: {
    fontSize: 12,
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  smallPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: 'transparent',
  },
  smallPillActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  smallPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
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
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  destTargetText: {
    fontSize: 13,
    fontWeight: '600',
  },
})
