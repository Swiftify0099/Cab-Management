/**
 * Destination Mode Modal — Feature 20 (Light & Dark Mode)
 * Search destination, choose mode (Flexible, Balanced, Strict), set max rides, and activate/turn off.
 */
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from '../../theme'
import { DestinationModeService } from '../../services/destinationModeService'
import {
  DestinationModeStatusData,
  DestinationPreferenceMode,
} from '../../types/destinationMode'

interface Props {
  visible: boolean
  onClose: () => void
  onModeUpdated?: (status: DestinationModeStatusData) => void
}

interface DestinationPreset {
  name: string
  address: string
  lat: number
  lng: number
  category: string
}

const PRESET_DESTINATIONS: DestinationPreset[] = [
  {
    name: 'Sangli City Center',
    address: 'Sangli Bus Stand, Maharashtra',
    lat: 16.8524,
    lng: 74.5815,
    category: 'Intercity',
  },
  {
    name: 'Pune Airport (PNQ)',
    address: 'Lohegaon Airport Terminal 2, Pune',
    lat: 18.5822,
    lng: 73.9197,
    category: 'Airport',
  },
  {
    name: 'Mumbai CSMT',
    address: 'Chhatrapati Shivaji Maharaj Terminus, Mumbai',
    lat: 18.9401,
    lng: 72.8351,
    category: 'Intercity',
  },
  {
    name: 'Satara Highway Junction',
    address: 'NH48 Satara Bypass, Satara',
    lat: 17.6805,
    lng: 74.0183,
    category: 'Intercity',
  },
  {
    name: 'Hinjawadi IT Park',
    address: 'Phase 1 Quadron Business Park, Hinjawadi',
    lat: 18.5913,
    lng: 73.7389,
    category: 'City Hub',
  },
]

export const DestinationModeModal: React.FC<Props> = ({ visible, onClose, onModeUpdated }) => {
  const { isDark } = useTheme()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<DestinationModeStatusData | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTarget, setSelectedTarget] = useState<DestinationPreset | null>(null)
  const [selectedMode, setSelectedMode] = useState<DestinationPreferenceMode>('balanced')
  const [maxRides, setMaxRides] = useState(2)

  useEffect(() => {
    if (visible) {
      loadStatus()
    }
  }, [visible])

  const loadStatus = async () => {
    setLoading(true)
    try {
      const data = await DestinationModeService.getStatus()
      setStatus(data)
      if (data.is_active && data.destination_address) {
        setSelectedTarget({
          name: data.destination_address.split(',')[0],
          address: data.destination_address,
          lat: data.destination_lat || 16.8524,
          lng: data.destination_lng || 74.5815,
          category: 'Active Target',
        })
        setSelectedMode(data.mode_preference)
        setMaxRides(data.max_rides)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPreset = (preset: DestinationPreset) => {
    setSelectedTarget(preset)
    setSearchQuery(preset.name)
  }

  const handleActivate = async () => {
    if (!selectedTarget) {
      Alert.alert('Destination Required', 'Please select or search for your desired destination.')
      return
    }

    setLoading(true)
    try {
      await DestinationModeService.setDestinationMode({
        destination_address: selectedTarget.address,
        destination_lat: selectedTarget.lat,
        destination_lng: selectedTarget.lng,
        preference_mode: selectedMode,
        max_rides: maxRides,
        turn_off: false,
      })
      const updated = await DestinationModeService.getStatus()
      setStatus(updated)
      onModeUpdated?.(updated)
      Alert.alert('Destination Mode Active', `Prioritizing rides moving you toward ${selectedTarget.name}.`)
      onClose()
    } catch (err: any) {
      Alert.alert('Activation Error', err.message || 'Failed to activate Destination Mode.')
    } finally {
      setLoading(false)
    }
  }

  const handleTurnOff = async () => {
    setLoading(true)
    try {
      await DestinationModeService.setDestinationMode({ turn_off: true })
      const updated = await DestinationModeService.getStatus()
      setStatus(updated)
      setSelectedTarget(null)
      setSearchQuery('')
      onModeUpdated?.(updated)
      Alert.alert('Destination Mode Disabled', 'Returned to normal dispatch matching.')
      onClose()
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to turn off Destination Mode.')
    } finally {
      setLoading(false)
    }
  }

  const filteredPresets = PRESET_DESTINATIONS.filter(
    p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const bgCard = isDark ? '#1E293B' : '#FFFFFF'
  const bgInput = isDark ? '#0F172A' : '#F1F5F9'
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A'
  const textSecondary = isDark ? '#94A3B8' : '#64748B'
  const borderColor = isDark ? '#334155' : '#E2E8F0'

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: bgCard }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.iconCircle}>
                <Ionicons name="navigate" size={18} color="#059669" />
              </View>
              <View>
                <Text style={[styles.title, { color: textPrimary }]}>Destination Mode</Text>
                <Text style={[styles.subtitle, { color: textSecondary }]}>
                  Head towards home or your next stop
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Active Status Highlight */}
            {status?.is_active && (
              <View style={styles.activeBanner}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="checkmark-circle" size={18} color="#059669" />
                  <Text style={styles.activeBannerTitle}>Destination Mode is ACTIVE</Text>
                </View>
                <Text style={styles.activeBannerSub}>
                  Target: {status.destination_address} • {status.rides_completed}/{status.max_rides} trips
                </Text>
              </View>
            )}

            {/* Search Input */}
            <Text style={[styles.sectionLabel, { color: textPrimary }]}>Where are you heading?</Text>
            <View style={[styles.searchBox, { backgroundColor: bgInput, borderColor }]}>
              <Feather name="search" size={18} color={textSecondary} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search city, station, or landmark..."
                placeholderTextColor={textSecondary}
                style={[styles.searchInput, { color: textPrimary }]}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Feather name="x-circle" size={16} color={textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Popular Presets */}
            <Text style={[styles.subLabel, { color: textSecondary }]}>POPULAR DESTINATIONS</Text>
            <View style={styles.presetList}>
              {filteredPresets.map(preset => {
                const isSelected = selectedTarget?.name === preset.name
                return (
                  <TouchableOpacity
                    key={preset.name}
                    style={[
                      styles.presetItem,
                      { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor },
                      isSelected && { borderColor: '#10B981', backgroundColor: isDark ? '#064E3B' : '#ECFDF5' },
                    ]}
                    onPress={() => handleSelectPreset(preset)}
                  >
                    <View style={styles.presetLeft}>
                      <Ionicons
                        name={preset.category === 'Airport' ? 'airplane' : 'location'}
                        size={18}
                        color={isSelected ? '#10B981' : '#64748B'}
                      />
                      <View>
                        <Text style={[styles.presetName, { color: textPrimary }]}>{preset.name}</Text>
                        <Text style={[styles.presetAddress, { color: textSecondary }]} numberOfLines={1}>
                          {preset.address}
                        </Text>
                      </View>
                    </View>
                    {isSelected && <Feather name="check" size={18} color="#10B981" />}
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Mode Preference Selector */}
            <Text style={[styles.sectionLabel, { color: textPrimary, marginTop: 16 }]}>
              Matching Preference
            </Text>
            <View style={styles.modeContainer}>
              {(['flexible', 'balanced', 'strict'] as DestinationPreferenceMode[]).map(mode => {
                const isSelected = selectedMode === mode
                const labels: Record<DestinationPreferenceMode, { title: string; desc: string }> = {
                  flexible: { title: 'Flexible', desc: 'Accepts general direction' },
                  balanced: { title: 'Balanced (Recommended)', desc: 'Prioritizes forward progress' },
                  strict: { title: 'Strict', desc: 'Direct route matches only' },
                }
                return (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.modeOption,
                      { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor },
                      isSelected && { borderColor: '#10B981', backgroundColor: isDark ? '#064E3B' : '#ECFDF5' },
                    ]}
                    onPress={() => setSelectedMode(mode)}
                  >
                    <View style={styles.radioOuter}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modeTitle, { color: textPrimary }]}>{labels[mode].title}</Text>
                      <Text style={[styles.modeDesc, { color: textSecondary }]}>{labels[mode].desc}</Text>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Max Rides Counter */}
            <View style={[styles.maxRidesRow, { borderColor }]}>
              <View>
                <Text style={[styles.maxRidesTitle, { color: textPrimary }]}>Limit Destination Rides</Text>
                <Text style={[styles.maxRidesSub, { color: textSecondary }]}>
                  Auto-disables after reaching destination or trip limit
                </Text>
              </View>
              <View style={styles.counterRow}>
                {[1, 2, 3].map(count => (
                  <TouchableOpacity
                    key={count}
                    style={[
                      styles.countBtn,
                      { backgroundColor: bgInput, borderColor },
                      maxRides === count && { backgroundColor: '#10B981', borderColor: '#10B981' },
                    ]}
                    onPress={() => setMaxRides(count)}
                  >
                    <Text
                      style={[
                        styles.countBtnText,
                        { color: maxRides === count ? '#FFFFFF' : textPrimary },
                      ]}
                    >
                      {count}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={[styles.footer, { borderTopColor: borderColor }]}>
            {status?.is_active && (
              <TouchableOpacity
                style={[styles.turnOffBtn, { borderColor: '#EF4444' }]}
                onPress={handleTurnOff}
                disabled={loading}
              >
                <Text style={styles.turnOffBtnText}>Turn Off</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.activateBtn,
                !selectedTarget && { opacity: 0.6 },
                { flex: status?.is_active ? 2 : 1 },
              ]}
              onPress={handleActivate}
              disabled={loading || !selectedTarget}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.activateBtnText}>
                  {status?.is_active ? 'Update Destination' : 'Activate Destination Mode'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
  },
  closeBtn: {
    padding: 6,
  },
  content: {
    padding: 20,
  },
  activeBanner: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  activeBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
  },
  activeBannerSub: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  presetList: {
    gap: 8,
  },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  presetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  presetName: {
    fontSize: 14,
    fontWeight: '600',
  },
  presetAddress: {
    fontSize: 12,
    marginTop: 1,
  },
  modeContainer: {
    gap: 8,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  modeTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  modeDesc: {
    fontSize: 12,
    marginTop: 1,
  },
  maxRidesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  maxRidesTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  maxRidesSub: {
    fontSize: 11,
    marginTop: 2,
    maxWidth: 200,
  },
  counterRow: {
    flexDirection: 'row',
    gap: 6,
  },
  countBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    gap: 10,
  },
  turnOffBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  turnOffBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  activateBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activateBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
