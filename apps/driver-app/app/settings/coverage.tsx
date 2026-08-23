/**
 * Driver Request Coverage Screen — Feature 6 / PostGIS Radar Model
 * Configures Driver Request Visibility Preferences:
 * 1. ALL CITY: Receive eligible ride requests from ANY of your allowed/configured cities (e.g. Sangli, Kolhapur, Pune).
 * 2. SPECIFIC CITY: Narrow down to one or more specific cities.
 * 3. SPECIFIC HEX / ZONE: Narrow down to specific operational zones / hex cells.
 */
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useTheme } from '../../src/theme'
import {
  CoverageService,
  VisibilityMode,
  ServiceCityItem,
  ServiceZoneItem,
} from '../../src/services/coverageService'

const VISIBILITY_MODES: {
  id: VisibilityMode
  title: string
  subtitle: string
  icon: string
}[] = [
  {
    id: 'all_city',
    title: 'All City Mode',
    subtitle: 'See live ride requests from all your configured covered cities',
    icon: 'globe',
  },
  {
    id: 'specific_city',
    title: 'Specific City Mode',
    subtitle: 'Narrow down visibility to only selected cities',
    icon: 'map-pin',
  },
  {
    id: 'specific_hex',
    title: 'Specific Hex / Zone',
    subtitle: 'Narrow down to specific operational zones or radar cells',
    icon: 'hexagon',
  },
]

export default function RequestCoverageScreen() {
  const { theme, isDark } = useTheme()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>('all_city')
  const [availableCities, setAvailableCities] = useState<ServiceCityItem[]>([])
  const [selectedCityIds, setSelectedCityIds] = useState<string[]>([])
  const [zonesByCity, setZonesByCity] = useState<Record<string, ServiceZoneItem[]>>({})
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([])

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [cities, coverage] = await Promise.all([
          CoverageService.getAvailableCities(),
          CoverageService.getDriverCoverage(),
        ])

        setAvailableCities(cities)
        setVisibilityMode(coverage.visibility_mode || 'all_city')

        const selectedIds = coverage.covered_cities
          ?.filter(c => c.is_selected || coverage.visibility_mode === 'all_city')
          .map(c => c.city_id) || []
        
        setSelectedCityIds(selectedIds.length > 0 ? selectedIds : cities.map(c => c.city_id))

        // Preload zones for available cities
        const zoneMap: Record<string, ServiceZoneItem[]> = {}
        for (const city of cities) {
          const zones = await CoverageService.getCityZones(city.city_id)
          zoneMap[city.city_id] = zones
        }
        setZonesByCity(zoneMap)
      } catch (err) {
        console.warn('[CoverageScreen] load error:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleToggleCity = (cityId: string) => {
    if (visibilityMode === 'all_city') {
      setSelectedCityIds(prev =>
        prev.includes(cityId) ? prev.filter(id => id !== cityId) : [...prev, cityId]
      )
    } else {
      // In specific city, toggle selection
      setSelectedCityIds(prev =>
        prev.includes(cityId) ? prev.filter(id => id !== cityId) : [...prev, cityId]
      )
    }
  }

  const handleSave = async () => {
    if (selectedCityIds.length === 0 && visibilityMode !== 'specific_hex') {
      Alert.alert('Selection Required', 'Please select at least one city for ride coverage.')
      return
    }

    setSaving(true)
    try {
      const ok = await CoverageService.updateDriverCoverage({
        visibility_mode: visibilityMode,
        city_ids: selectedCityIds,
      })

      if (ok) {
        Alert.alert(
          'Coverage Updated',
          'Your request visibility preferences have been saved. Your radar will now reflect requests in your selected scope.',
          [{ text: 'OK', onPress: () => router.back() }]
        )
      } else {
        Alert.alert('Save Failed', 'Could not update coverage on the server. Please retry.')
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'An error occurred while saving coverage.')
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
          Request Coverage
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

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View style={[styles.banner, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF', borderColor: '#38BDF8' }]}>
          <Feather name="info" size={18} color="#0284C7" style={{ marginTop: 2 }} />
          <Text style={[styles.bannerText, { color: isDark ? '#E2E8F0' : '#0369A1' }]}>
            Coverage mode controls which customer ride requests appear on your Live Radar. Your current GPS location separately ranks your priority & dispatch ETA.
          </Text>
        </View>

        {/* Section 1: Visibility Mode Choice */}
        <Text style={[styles.sectionTitle, { color: textPrimary }]}>
          Visibility Mode
        </Text>

        <View style={styles.modesContainer}>
          {VISIBILITY_MODES.map(mode => {
            const isSelected = visibilityMode === mode.id
            return (
              <TouchableOpacity
                key={mode.id}
                style={[
                  styles.modeCard,
                  { backgroundColor: bgCard, borderColor: isSelected ? '#0284C7' : borderCol },
                  isSelected && styles.modeCardSelected,
                ]}
                onPress={() => setVisibilityMode(mode.id)}
                activeOpacity={0.8}
              >
                <View style={styles.modeCardHeader}>
                  <View style={[styles.modeIconBox, { backgroundColor: isSelected ? '#0284C7' : (isDark ? '#334155' : '#F1F5F9') }]}>
                    <Feather
                      name={mode.icon as any}
                      size={20}
                      color={isSelected ? '#FFFFFF' : (isDark ? '#94A3B8' : '#64748B')}
                    />
                  </View>
                  <View style={styles.modeTextCol}>
                    <Text style={[styles.modeTitle, { color: textPrimary }]}>
                      {mode.title}
                    </Text>
                    <Text style={[styles.modeSubtitle, { color: textSecondary }]}>
                      {mode.subtitle}
                    </Text>
                  </View>
                  <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                </View>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Section 2: City Selection */}
        <View style={styles.citySectionHeader}>
          <Text style={[styles.sectionTitle, { color: textPrimary, marginBottom: 0 }]}>
            {visibilityMode === 'all_city' ? 'Configured Covered Cities' : 'Selected Cities'}
          </Text>
          <Text style={[styles.cityCountBadge, { color: '#0284C7' }]}>
            {selectedCityIds.length} Selected
          </Text>
        </View>
        <Text style={[styles.sectionSubtitle, { color: textSecondary }]}>
          {visibilityMode === 'all_city'
            ? 'Any booking occurring inside these cities will be pushed to your radar.'
            : 'Only bookings with pickup inside these specific cities will be visible.'}
        </Text>

        <View style={styles.cityGrid}>
          {availableCities.map(city => {
            const isSelected = selectedCityIds.includes(city.city_id)
            return (
              <TouchableOpacity
                key={city.city_id}
                style={[
                  styles.cityCard,
                  { backgroundColor: bgCard, borderColor: isSelected ? '#0284C7' : borderCol },
                  isSelected && { backgroundColor: isDark ? '#0C4A6E' : '#F0F9FF' },
                ]}
                onPress={() => handleToggleCity(city.city_id)}
                activeOpacity={0.7}
              >
                <View style={styles.cityCardContent}>
                  <View>
                    <Text style={[styles.cityName, { color: textPrimary }]}>
                      {city.name}
                    </Text>
                    <Text style={[styles.cityState, { color: textSecondary }]}>
                      {city.state}, {city.country}
                    </Text>
                  </View>
                  <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                    {isSelected && <Feather name="check" size={14} color="#FFFFFF" />}
                  </View>
                </View>

                {/* Sub-zones indicator */}
                {zonesByCity[city.city_id]?.length > 0 && (
                  <View style={styles.zonesPreview}>
                    <Text style={[styles.zonesPreviewText, { color: textSecondary }]} numberOfLines={1}>
                      Zones: {zonesByCity[city.city_id].map(z => z.name).join(' • ')}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Section 3: Summary Preview */}
        <View style={[styles.summaryCard, { backgroundColor: bgCard, borderColor: borderCol }]}>
          <Text style={[styles.summaryTitle, { color: textPrimary }]}>
            Current Matching Rules
          </Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: textSecondary }]}>Mode:</Text>
            <Text style={[styles.summaryValue, { color: '#0284C7' }]}>
              {visibilityMode === 'all_city'
                ? 'All City (Covered Cities)'
                : visibilityMode === 'specific_city'
                ? 'Specific City Filter'
                : 'Specific Hex / Zone'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: textSecondary }]}>Active Scope:</Text>
            <Text style={[styles.summaryValue, { color: textPrimary }]}>
              {selectedCityIds
                .map(id => availableCities.find(c => c.city_id === id)?.name)
                .filter(Boolean)
                .join(', ') || 'None selected'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: textSecondary }]}>Dispatch:</Text>
            <Text style={[styles.summaryValue, { color: '#10B981' }]}>
              First Driver to Accept Wins
            </Text>
          </View>
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
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  scrollBody: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  banner: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
    marginBottom: 20,
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 14,
  },
  modesContainer: {
    gap: 10,
    marginBottom: 24,
  },
  modeCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  modeCardSelected: {
    borderWidth: 2,
  },
  modeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modeTextCol: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  modeSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleActive: {
    borderColor: '#0284C7',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0284C7',
  },
  citySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cityCountBadge: {
    fontSize: 13,
    fontWeight: '600',
  },
  cityGrid: {
    gap: 10,
    marginBottom: 24,
  },
  cityCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  cityCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cityName: {
    fontSize: 15,
    fontWeight: '700',
  },
  cityState: {
    fontSize: 12,
    marginTop: 2,
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
  zonesPreview: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148, 163, 184, 0.2)',
  },
  zonesPreviewText: {
    fontSize: 11,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
  },
})
