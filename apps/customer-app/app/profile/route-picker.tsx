/**
 * Customer App — Saved Route 3-Step Wizard
 * Route: /profile/route-picker
 * Feature 2: Customer Address & Location Management.
 */
import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Dimensions,
  StatusBar,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather, Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps'
import * as Location from 'expo-location'
import { routeApi } from '../../src/api/client'
import { useTheme } from '../../src/contexts/ThemeContext'
import { useTranslation } from '../../src/i18n'
import {
  AppText,
  AppButton,
  AppCard,
  AppDivider,
  AppBadge,
} from '../../src/components/ui'

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || ''
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

type StepType = 'pickup' | 'drop' | 'name'

interface LocationPoint {
  address: string
  label: string
  lat: number
  lon: number
}

export default function RoutePickerScreen() {
  const { theme, isDark } = useTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const mapRef = useRef<MapView>(null)

  const [step, setStep] = useState<StepType>('pickup')
  const [permGranted, setPermGranted] = useState(false)
  const [saving, setSaving] = useState(false)

  // Map state
  const [region, setRegion] = useState<Region>({
    latitude: 18.5204,
    longitude: 73.8567,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  })
  const [loadingAddress, setLoadingAddress] = useState(false)
  const [addressText, setAddressText] = useState('')

  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const [predictions, setPredictions] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Saved points
  const [pickup, setPickup] = useState<LocationPoint | null>(null)
  const [drop, setDrop] = useState<LocationPoint | null>(null)
  const [routeName, setRouteName] = useState('')

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status === 'granted') {
          setPermGranted(true)
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
          const newRegion: Region = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }
          setRegion(newRegion)
          fetchAddressFromCoords(loc.coords.latitude, loc.coords.longitude)
        }
      } catch (e) {
        console.warn('Location error', e)
      }
    })()
  }, [])

  useEffect(() => {
    if (step === 'drop') {
      setAddressText('')
      setSearchQuery('')
      setPredictions([])
    }
  }, [step])

  const fetchAddressFromCoords = async (lat: number, lng: number) => {
    setLoadingAddress(true)
    try {
      if (GOOGLE_API_KEY) {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`
        )
        const data = await res.json()
        if (data.results?.length > 0) {
          setAddressText(data.results[0].formatted_address)
          return
        }
      }
      const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
      if (places.length > 0) {
        const p = places[0]
        const parts = [p.name, p.street, p.district, p.city, p.region, p.country].filter(Boolean)
        setAddressText(parts.join(', '))
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
    if (!text.trim()) {
      setPredictions([])
      return
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(async () => {
      if (!GOOGLE_API_KEY) return
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
            text
          )}&key=${GOOGLE_API_KEY}&components=country:in`
        )
        const data = await res.json()
        if (data.status === 'OK') setPredictions(data.predictions)
      } catch (e) {
        console.warn('Autocomplete error', e)
      }
    }, 400)
  }

  const handleSelectPrediction = async (placeId: string, description: string) => {
    Keyboard.dismiss()
    setSearchQuery('')
    setPredictions([])
    setIsSearching(true)
    try {
      if (GOOGLE_API_KEY) {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_API_KEY}`
        )
        const data = await res.json()
        if (data.status === 'OK' && data.result?.geometry?.location) {
          const { lat, lng } = data.result.geometry.location
          const newRegion = { latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }
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

  const handleConfirmPoint = () => {
    if (!addressText) {
      Alert.alert('Missing Location', 'Please select a location on the map first.')
      return
    }
    if (step === 'pickup') {
      setPickup({ address: addressText, label: 'Pickup', lat: region.latitude, lon: region.longitude })
      const city = addressText.split(',')[0]?.trim() || 'From'
      setRouteName(city + ' → ')
      setStep('drop')
    } else if (step === 'drop') {
      setDrop({ address: addressText, label: 'Drop', lat: region.latitude, lon: region.longitude })
      const city = addressText.split(',')[0]?.trim() || 'To'
      setRouteName((prev) => prev + city)
      setStep('name')
    }
  }

  const handleSaveRoute = async () => {
    if (!pickup || !drop) return
    if (!routeName.trim()) {
      Alert.alert('Route Name Required', 'Please enter a name for this saved route.')
      return
    }
    setSaving(true)
    try {
      await routeApi.addRoute({
        route_name: routeName.trim(),
        pickup_label: pickup.label,
        pickup_address: pickup.address,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lon,
        drop_label: drop.label,
        drop_address: drop.address,
        drop_lat: drop.lat,
        drop_lng: drop.lon,
      })
      Alert.alert(t('common.success', 'Success'), `"${routeName.trim()}" has been saved!`, [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (e: any) {
      Alert.alert(t('common.error', 'Error'), e?.response?.data?.detail || 'Failed to save route.')
    } finally {
      setSaving(false)
    }
  }

  // ── STEP 3: Route Name & Confirmation ──
  if (step === 'name') {
    return (
      <SafeAreaView style={[styles.detailsRoot, { backgroundColor: theme.colors.backgroundAlt }]} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => setStep('drop')} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <AppText variant="h3" bold style={styles.headerTitle}>
            Name Your Saved Route
          </AppText>
          <View style={{ width: 40 }} />
        </View>

        <View style={{ padding: 20, flex: 1 }}>
          {/* Route Connection Card */}
          <AppCard style={styles.routeSummaryCard}>
            <View style={styles.routePoint}>
              <View style={[styles.routeDot, { backgroundColor: theme.colors.success }]} />
              <View style={{ flex: 1 }}>
                <AppText variant="label" color="secondary">PICKUP POINT</AppText>
                <AppText variant="body" bold numberOfLines={2} style={{ marginTop: 2 }}>{pickup?.address}</AppText>
              </View>
            </View>

            <View style={[styles.routeLine, { backgroundColor: theme.colors.border }]} />

            <View style={styles.routePoint}>
              <View style={[styles.routeDot, { backgroundColor: theme.colors.error }]} />
              <View style={{ flex: 1 }}>
                <AppText variant="label" color="secondary">DROP DESTINATION</AppText>
                <AppText variant="body" bold numberOfLines={2} style={{ marginTop: 2 }}>{drop?.address}</AppText>
              </View>
            </View>
          </AppCard>

          {/* Name Field */}
          <AppText variant="label" color="secondary" style={styles.fieldLabel}>
            Route Nickname *
          </AppText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.textPrimary,
              },
            ]}
            placeholder="e.g. Daily Commute, Home to Office"
            placeholderTextColor={theme.colors.placeholder}
            value={routeName}
            onChangeText={setRouteName}
            autoFocus
          />
          <AppText variant="small" color="muted" style={{ marginTop: 8 }}>
            This saved route will appear as a 1-tap shortcut on your home booking screen.
          </AppText>

          <View style={{ marginTop: 'auto', marginBottom: 20 }}>
            <AppButton
              onPress={handleSaveRoute}
              loading={saving}
              variant="primary"
            >
              Save Favorite Route
            </AppButton>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  // ── STEP 1 & 2: Map Picker (Pickup or Drop) ──
  const isPickup = step === 'pickup'
  const accentColor = isPickup ? theme.colors.success : theme.colors.error
  const stepLabel = isPickup ? 'Step 1: Set Pickup Location' : 'Step 2: Set Drop Location'
  const stepNum = isPickup ? '1 / 2' : '2 / 2'

  return (
    <View style={{ width: SCREEN_W, height: SCREEN_H, backgroundColor: '#E5E5E5' }}>
      <StatusBar barStyle="dark-content" />

      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        region={region}
        onRegionChangeComplete={onRegionChangeComplete}
        showsUserLocation={permGranted}
        showsMyLocationButton={false}
        zoomEnabled
        scrollEnabled
        pitchEnabled={false}
        rotateEnabled={false}
      />

      {/* Center Pin Indicator */}
      <View
        style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', paddingBottom: 44 }]}
        pointerEvents="none"
      >
        <View style={[styles.pinBubble, { backgroundColor: accentColor }]}>
          <AppText variant="small" bold color="white">
            {isPickup ? '📍 Pickup' : '🏁 Drop'}
          </AppText>
        </View>
        <Ionicons name="location" size={46} color={accentColor} />
        <View style={styles.pinShadow} />
      </View>

      {/* Header Bar */}
      <View style={[styles.mapHeaderWrap, { paddingTop: insets.top + 8 }]}>
        <View style={styles.stepRow}>
          <TouchableOpacity
            style={[styles.mapBackBtn, { backgroundColor: theme.colors.surface }]}
            onPress={() => {
              if (step === 'drop') setStep('pickup')
              else router.back()
            }}
          >
            <Feather name="arrow-left" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={[styles.stepBadge, { backgroundColor: accentColor }]}>
            <AppText variant="caption" bold color="white">{stepNum}</AppText>
          </View>
          <AppText variant="body" bold color="white" style={styles.stepTitleShadow}>
            {stepLabel}
          </AppText>
        </View>

        {/* Search Input */}
        <View style={[styles.mapSearchBox, { backgroundColor: theme.colors.surface }]}>
          <Feather name="search" size={18} color={theme.colors.textMuted} />
          <TextInput
            style={[styles.mapSearchInput, { color: theme.colors.textPrimary }]}
            placeholder={`Search ${isPickup ? 'pickup' : 'drop'} location...`}
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholderTextColor={theme.colors.placeholder}
          />
          {isSearching && <ActivityIndicator size="small" color={accentColor} />}
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setPredictions([]) }}>
              <Feather name="x-circle" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
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
                  <Feather name="map-pin" size={16} color={accentColor} style={{ marginTop: 2 }} />
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

        {!isPickup && pickup && (
          <View style={[styles.pickupStrip, { backgroundColor: `${theme.colors.success}18`, borderColor: `${theme.colors.success}35` }]}>
            <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
            <AppText variant="small" bold style={{ color: theme.colors.success, marginLeft: 6, flex: 1 }} numberOfLines={1}>
              Pickup: {pickup.address}
            </AppText>
          </View>
        )}
      </View>

      {/* Bottom Action Footer */}
      <View style={[styles.mapFooter, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.addressBox}>
          <View style={[styles.addressBoxIcon, { backgroundColor: `${accentColor}18` }]}>
            <Feather name="map-pin" size={22} color={accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="label" color="muted">
              {isPickup ? 'CONFIRM PICKUP POINT' : 'CONFIRM DROP POINT'}
            </AppText>
            {loadingAddress ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <ActivityIndicator size="small" color={accentColor} />
                <AppText variant="small" color="muted">Pinpointing address...</AppText>
              </View>
            ) : (
              <AppText variant="body" bold numberOfLines={2} style={{ marginTop: 2 }}>
                {addressText || 'Move map to select location'}
              </AppText>
            )}
          </View>
        </View>

        <AppButton
          onPress={handleConfirmPoint}
          variant="primary"
          style={{ backgroundColor: accentColor }}
        >
          {isPickup ? 'Confirm Pickup Location →' : 'Confirm Drop Location →'}
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
  routeSummaryCard: { padding: 16, borderRadius: 16, marginBottom: 20 },
  routePoint: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  routeDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  routeLine: { width: 2, height: 24, marginLeft: 5, marginVertical: 6 },
  fieldLabel: { marginBottom: 8, letterSpacing: 0.5 },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  mapHeaderWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  mapBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    marginRight: 10,
  },
  stepBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, marginRight: 8 },
  stepTitleShadow: { textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  mapSearchBox: {
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
    maxHeight: 220,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  predictionItem: { flexDirection: 'row', padding: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  pickupStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  pinBubble: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 4 },
  pinShadow: { width: 12, height: 4, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 2, marginTop: -4 },
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
