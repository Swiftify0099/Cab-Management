/**
 * Customer App — Interactive Map Address Picker
 * Route: /profile/address-picker
 * Feature 2: Customer Address & Location Management.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  FlatList,
  ScrollView,
  Keyboard,
  StatusBar,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps'
import * as Location from 'expo-location'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { profileApi } from '../../src/api/client'
import { reverseGeocodeCoord, geocodeAddress, getPlaceAutocomplete } from '../../src/services/googleMaps'
import { useTheme } from '../../src/contexts/ThemeContext'
import { useTranslation } from '../../src/i18n'
import {
  AppText,
  AppButton,
  AppDivider,
  AppBadge,
} from '../../src/components/ui'

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || ''
const RECENT_SEARCHES_KEY = '@customer_recent_searches'
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

const CATEGORIES = [
  { key: 'home',    label: 'Home',    icon: 'home',       colorKey: '#059669' },
  { key: 'work',    label: 'Work',    icon: 'briefcase',  colorKey: '#2563EB' },
  { key: 'partner', label: 'Partner', icon: 'heart',      colorKey: '#EC4899' },
  { key: 'gym',     label: 'Gym',     icon: 'activity',   colorKey: '#F59E0B' },
  { key: 'other',   label: 'Other',   icon: 'map-pin',    colorKey: '#6366F1' },
]

export default function AddressPickerScreen() {
  const params = useLocalSearchParams<{
    id?: string
    lat?: string
    lon?: string
    label?: string
    address?: string
    targetType?: string
    mode?: string
  }>()

  const { theme, isDark } = useTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()

  const mapRef = useRef<MapView>(null)
  const [region, setRegion] = useState<Region>({
    latitude: params.lat ? parseFloat(params.lat) : 18.5204,
    longitude: params.lon ? parseFloat(params.lon) : 73.8567,
    latitudeDelta: 0.008,
    longitudeDelta: 0.008,
  })

  const [mapReady, setMapReady] = useState(false)
  const [loadingAddress, setLoadingAddress] = useState(false)
  const [permGranted, setPermGranted] = useState(false)
  const [saving, setSaving] = useState(false)

  // Step state
  const [step, setStep] = useState<'map' | 'details'>('map')
  const [addressText, setAddressText] = useState(params.address || '')
  const [flatBuilding, setFlatBuilding] = useState('')
  const [label, setLabel] = useState(params.label || 'home')
  const [customLabel, setCustomLabel] = useState('')
  const [isDefault, setIsDefault] = useState(false)

  // Search & Recent History
  const [searchQuery, setSearchQuery] = useState('')
  const [predictions, setPredictions] = useState<any[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load Recent Searches
  useEffect(() => {
    AsyncStorage.getItem(RECENT_SEARCHES_KEY).then((data) => {
      if (data) {
        try {
          setRecentSearches(JSON.parse(data))
        } catch {}
      }
    })
  }, [])

  const saveRecentSearch = async (query: string) => {
    if (!query.trim()) return
    const updated = [query.trim(), ...recentSearches.filter((s) => s.toLowerCase() !== query.trim().toLowerCase())].slice(0, 5)
    setRecentSearches(updated)
    try {
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
    } catch {}
  }

  const clearRecentSearches = async () => {
    setRecentSearches([])
    try {
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY)
    } catch {}
  }

  // Request Location
  useEffect(() => {
    ;(async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status === 'granted') {
          setPermGranted(true)
          if (!params.lat && !params.lon) {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
            const newRegion: Region = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              latitudeDelta: 0.008,
              longitudeDelta: 0.008,
            }
            setRegion(newRegion)
            fetchAddressFromCoords(loc.coords.latitude, loc.coords.longitude)
          }
        }
      } catch (e) {
        console.warn('Location error', e)
      }
    })()
  }, [])

  const handleRecenter = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      const newRegion = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      }
      setRegion(newRegion)
      mapRef.current?.animateToRegion(newRegion, 600)
      fetchAddressFromCoords(loc.coords.latitude, loc.coords.longitude)
    } catch {
      Alert.alert('Location Error', 'Could not fetch current GPS location.')
    }
  }

  const fetchAddressFromCoords = async (lat: number, lng: number) => {
    setLoadingAddress(true)
    try {
      const formatted = await reverseGeocodeCoord(lat, lng)
      if (formatted) {
        setAddressText(formatted)
      }
    } catch {
      // Fallback
    } finally {
      setLoadingAddress(false)
    }
  }

  const onRegionChangeComplete = (newRegion: Region) => {
    setRegion(newRegion)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      fetchAddressFromCoords(newRegion.latitude, newRegion.longitude)
    }, 700)
  }

  const handleSearchChange = (text: string) => {
    setSearchQuery(text)
    if (!text.trim() || text.length < 2) {
      setPredictions([])
      return
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await getPlaceAutocomplete(text)
        setPredictions(results)
      } catch (e) {
        console.warn('Autocomplete error', e)
      }
    }, 350)
  }

  const handleSelectPrediction = async (placeId: string, description: string) => {
    Keyboard.dismiss()
    setSearchQuery('')
    setPredictions([])
    setIsSearching(true)
    saveRecentSearch(description)
    try {
      if (GOOGLE_API_KEY) {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_API_KEY}`
        )
        const data = await res.json()
        if (data.status === 'OK' && data.result?.geometry?.location) {
          const { lat, lng } = data.result.geometry.location
          const newRegion = { latitude: lat, longitude: lng, latitudeDelta: 0.008, longitudeDelta: 0.008 }
          setRegion(newRegion)
          mapRef.current?.animateToRegion(newRegion, 800)
          setAddressText(data.result.formatted_address || description)
          return
        }
      }
      setAddressText(description)
    } catch {
      setAddressText(description)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSave = async () => {
    const finalLabel = label === 'other' ? customLabel.trim() || 'Other' : label
    const fullCombined = flatBuilding.trim()
      ? `${flatBuilding.trim()}, ${addressText}`
      : addressText

    if (!addressText.trim()) {
      Alert.alert('Missing Location', 'Please select a location on the map first.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        label: finalLabel,
        address_type: label,
        address: fullCombined,
        latitude: region.latitude,
        longitude: region.longitude,
        is_default: isDefault,
      }

      if (params.id) {
        await profileApi.updateAddress(params.id, payload)
      } else {
        await profileApi.addAddress(payload)
      }
      router.back()
    } catch (e: any) {
      Alert.alert(t('common.error', 'Error'), e?.response?.data?.detail || 'Failed to save address.')
    } finally {
      setSaving(false)
    }
  }

  // ── STEP 2: Category & Flat Details ──
  if (step === 'details') {
    return (
      <SafeAreaView style={[styles.detailsRoot, { backgroundColor: theme.colors.backgroundAlt }]} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity onPress={() => setStep('map')} style={styles.backBtn}>
              <Feather name="arrow-left" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <AppText variant="h3" bold style={styles.headerTitle}>
              {params.id ? 'Edit Place Details' : 'Save Place Details'}
            </AppText>
            <View style={{ width: 40 }} />
          </View>

          <FlatList
            data={[1]}
            keyExtractor={() => 'form'}
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            renderItem={() => (
              <View>
                {/* Location Preview Card */}
                <View style={[styles.addressPreview, { backgroundColor: `${theme.colors.primary}12`, borderColor: `${theme.colors.primary}30` }]}>
                  <View style={[styles.addressPreviewIcon, { backgroundColor: `${theme.colors.primary}20` }]}>
                    <Ionicons name="location" size={22} color={theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="label" color="secondary">SELECTED PINPOINT</AppText>
                    <AppText variant="body" bold style={{ marginTop: 2 }}>{addressText}</AppText>
                  </View>
                  <TouchableOpacity onPress={() => setStep('map')} style={styles.changeBtn}>
                    <AppText variant="small" bold color="brand">Change</AppText>
                  </TouchableOpacity>
                </View>

                {/* Category Preset Selection */}
                <AppText variant="label" color="secondary" style={styles.fieldLabel}>
                  {t('address.save_as', 'Save Place As')}
                </AppText>
                <View style={styles.chipRow}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.key}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: label === cat.key ? `${cat.colorKey}20` : theme.colors.surface,
                          borderColor: label === cat.key ? cat.colorKey : theme.colors.border,
                        },
                      ]}
                      onPress={() => setLabel(cat.key)}
                    >
                      <Feather
                        name={cat.icon as any}
                        size={16}
                        color={label === cat.key ? cat.colorKey : theme.colors.textSecondary}
                      />
                      <AppText
                        variant="small"
                        semibold
                        style={{ color: label === cat.key ? cat.colorKey : theme.colors.textSecondary }}
                      >
                        {cat.label}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>

                {label === 'other' && (
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                        color: theme.colors.textPrimary,
                        marginBottom: 16,
                      },
                    ]}
                    placeholder="e.g. Grandma's House, Doctor Clinic"
                    placeholderTextColor={theme.colors.placeholder}
                    value={customLabel}
                    onChangeText={setCustomLabel}
                  />
                )}

                {/* Flat / Building Details */}
                <AppText variant="label" color="secondary" style={styles.fieldLabel}>
                  {t('address.flat_building', 'House / Flat / Building Name & Landmark')} (Optional)
                </AppText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.textPrimary,
                      height: 80,
                      textAlignVertical: 'top',
                    },
                  ]}
                  placeholder="e.g. Flat 402, Building A, Near City Mall"
                  placeholderTextColor={theme.colors.placeholder}
                  value={flatBuilding}
                  onChangeText={setFlatBuilding}
                  multiline
                />

                {/* Submit */}
                <View style={{ marginTop: 28 }}>
                  <AppButton
                    onPress={handleSave}
                    loading={saving}
                    variant="primary"
                  >
                    Save Address & Pinpoint
                  </AppButton>
                </View>
              </View>
            )}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  // ── STEP 1: Map Picker ──
  return (
    <View style={{ width: SCREEN_W, height: SCREEN_H, backgroundColor: '#E5E5E5' }}>
      <StatusBar barStyle="dark-content" />

      {/* Interactive Google Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        region={region}
        onRegionChangeComplete={onRegionChangeComplete}
        showsUserLocation={permGranted}
        showsMyLocationButton={false}
        onMapReady={() => setMapReady(true)}
        zoomEnabled
        scrollEnabled
        pitchEnabled={false}
        rotateEnabled={false}
      />

      {/* Center Pin Indicator */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            alignItems: 'center',
            justifyContent: 'center',
            paddingBottom: 44,
          },
        ]}
        pointerEvents="none"
      >
        <View style={styles.pinBubble}>
          <AppText variant="small" bold color="white">
            📍 Drag map to pinpoint
          </AppText>
        </View>
        <Ionicons name="location" size={46} color={theme.colors.error} />
        <View style={styles.pinShadow} />
      </View>

      {/* Search Header Bar */}
      <View style={[styles.mapHeaderWrap, { paddingTop: insets.top + 8 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            style={[styles.mapBackBtn, { backgroundColor: theme.colors.surface }]}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={[styles.mapSearchBox, { backgroundColor: theme.colors.surface }]}>
            <Feather name="search" size={18} color={theme.colors.textMuted} />
            <TextInput
              style={[styles.mapSearchInput, { color: theme.colors.textPrimary }]}
              placeholder={t('address.search_placeholder', 'Search location, area...')}
              value={searchQuery}
              onChangeText={handleSearchChange}
              placeholderTextColor={theme.colors.placeholder}
            />
            {isSearching && <ActivityIndicator size="small" color={theme.colors.primary} />}
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setPredictions([]) }}>
                <Feather name="x-circle" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Predictions Dropdown */}
        {predictions.length > 0 && (
          <View style={[styles.predictionsContainer, { backgroundColor: theme.colors.surface }]}>
            <FlatList
              data={predictions}
              keyExtractor={(item) => item.place_id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.predictionItem, { borderBottomColor: theme.colors.border }]}
                  onPress={() => handleSelectPrediction(item.place_id, item.description)}
                >
                  <Feather name="map-pin" size={16} color={theme.colors.primary} style={{ marginTop: 2 }} />
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <AppText variant="body" semibold>
                      {item.structured_formatting?.main_text || item.description}
                    </AppText>
                    {item.structured_formatting?.secondary_text && (
                      <AppText variant="small" color="muted">
                        {item.structured_formatting.secondary_text}
                      </AppText>
                    )}
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Recent Searches Strip */}
        {searchQuery.length === 0 && recentSearches.length > 0 && (
          <View style={[styles.recentBox, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.recentHeader}>
              <AppText variant="label" color="secondary">{t('address.recent_searches', 'RECENT SEARCHES')}</AppText>
              <TouchableOpacity onPress={clearRecentSearches}>
                <AppText variant="caption" semibold color="brand">{t('address.clear_history', 'Clear')}</AppText>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {recentSearches.map((s, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.recentChip, { backgroundColor: theme.colors.backgroundAlt, borderColor: theme.colors.border }]}
                  onPress={() => {
                    setAddressText(s)
                    setSearchQuery('')
                  }}
                >
                  <Feather name="clock" size={12} color={theme.colors.textMuted} />
                  <AppText variant="small" numberOfLines={1} style={{ maxWidth: 140 }}>
                    {s}
                  </AppText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Recenter FAB */}
      <TouchableOpacity
        style={[styles.recenterFab, { backgroundColor: theme.colors.surface, bottom: 150 }]}
        onPress={handleRecenter}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="crosshairs-gps" size={24} color={theme.colors.primary} />
      </TouchableOpacity>

      {/* Bottom Selected Location Card */}
      <View style={[styles.mapFooter, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.addressBox}>
          <View style={[styles.addressBoxIcon, { backgroundColor: `${theme.colors.primary}18` }]}>
            <Feather name="map-pin" size={22} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="label" color="muted">SELECTED LOCATION</AppText>
            {loadingAddress ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <AppText variant="small" color="muted">Pinpointing exact address...</AppText>
              </View>
            ) : (
              <AppText variant="body" bold numberOfLines={2} style={{ marginTop: 2 }}>
                {addressText || 'Move map to select location'}
              </AppText>
            )}
          </View>
        </View>

        <AppButton
          onPress={() => {
            if (!addressText) {
              Alert.alert('No location', 'Please drag the map to pick a location first.')
              return
            }
            if (params.mode === 'pick') {
              router.navigate({
                pathname: '/book/cab',
                params: { [params.targetType === 'pickup' ? 'pickup' : 'destination']: addressText },
              } as any)
              return
            }
            setStep('details')
          }}
          variant="primary"
        >
          {t('address.confirm_location', 'Confirm Location →')}
        </AppButton>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  detailsRoot: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center' },
  addressPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  addressPreviewIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  changeBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  fieldLabel: { marginBottom: 8, letterSpacing: 0.5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  mapHeaderWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  mapBackBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    marginRight: 10,
  },
  mapSearchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  mapSearchInput: { flex: 1, fontSize: 14, fontWeight: '500', height: '100%' },
  predictionsContainer: {
    borderRadius: 16,
    marginTop: 8,
    maxHeight: 240,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  predictionItem: { flexDirection: 'row', padding: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  recentBox: {
    borderRadius: 14,
    marginTop: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  pinBubble: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 4,
  },
  pinShadow: { width: 12, height: 4, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 2, marginTop: -4 },
  recenterFab: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 5,
  },
  mapFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 12,
  },
  addressBox: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, gap: 12 },
  addressBoxIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
})
