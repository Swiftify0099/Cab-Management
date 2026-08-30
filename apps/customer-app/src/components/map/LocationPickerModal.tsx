/**
 * Interactive Map Location Picker Modal — Customer App
 * ─────────────────────────────────────────────────────────────
 * Matches Driver App pinpoint UX:
 *   • Full-screen interactive map with centered draggable pinpoint ("📍 Drag map to pinpoint")
 *   • Search bar with debounced Google Places autocomplete predictions
 *   • 1-Tap GPS recentering
 *   • Quick Saved Addresses bar (Home, Work, etc.) for instant 0-API selection
 *   • Bottom card with location badge, formatted address, Save Address action, and Confirm button
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Dimensions,
  Platform,
  Keyboard,
  FlatList,
  ScrollView,
  Alert,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import MapView, { PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps'
import { reverseGeocodeCoord, geocodeAddress, getPlaceAutocomplete } from '../../services/googleMaps'
import type { AutocompletePrediction } from '../../services/googleMaps'
import { profileApi } from '../../api/client'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

export interface SelectedLocationData {
  latitude: number
  longitude: number
  address: string
  city?: string
  state?: string
  postal_code?: string
  landmark?: string
}

export interface SavedAddressItem {
  id?: string
  label: string
  address: string
  full_address?: string
  address_type?: string
  latitude?: number
  longitude?: number
  is_default?: boolean
}

interface LocationPickerModalProps {
  visible: boolean
  title?: string
  mode?: 'pickup' | 'drop' | 'stop' | 'general'
  initialLocation?: { latitude: number; longitude: number; address?: string }
  savedAddresses?: SavedAddressItem[]
  onClose: () => void
  onConfirm: (loc: SelectedLocationData) => void
  onAddressSaved?: (newAddr: SavedAddressItem) => void
}

export default function LocationPickerModal({
  visible,
  title = 'Pick Location',
  mode = 'general',
  initialLocation,
  savedAddresses = [],
  onClose,
  onConfirm,
  onAddressSaved,
}: LocationPickerModalProps) {
  const insets = useSafeAreaInsets()
  const mapRef = useRef<any>(null)

  const [region, setRegion] = useState({
    latitude: initialLocation?.latitude || 18.5204,
    longitude: initialLocation?.longitude || 73.8567,
    latitudeDelta: 0.008,
    longitudeDelta: 0.008,
  })

  const [selectedAddress, setSelectedAddress] = useState<string>(
    initialLocation?.address || 'Locating address...'
  )
  const [resolvedCity, setResolvedCity] = useState<string>('Pune')
  const [resolvedState, setResolvedState] = useState<string>('Maharashtra')
  const [resolving, setResolving] = useState<boolean>(false)

  // Local saved addresses list for instant updates
  const [localSavedAddresses, setLocalSavedAddresses] = useState<SavedAddressItem[]>(savedAddresses)
  const [saveModalVisible, setSaveModalVisible] = useState<boolean>(false)
  const [saveLabel, setSaveLabel] = useState<string>('home')
  const [customLabel, setCustomLabel] = useState<string>('')
  const [savingAddress, setSavingAddress] = useState<boolean>(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [predictions, setPredictions] = useState<AutocompletePrediction[]>([])
  const [isSearching, setIsSearching] = useState<boolean>(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync saved addresses
  useEffect(() => {
    if (savedAddresses && savedAddresses.length > 0) {
      setLocalSavedAddresses(savedAddresses)
    } else {
      profileApi.getAddresses().then((res) => {
        const addrs = res.data?.data || res.data || []
        if (Array.isArray(addrs)) {
          setLocalSavedAddresses(addrs)
        }
      }).catch(() => {})
    }
  }, [savedAddresses, visible])

  // Reverse geocode when region changes (debounced to avoid API spam)
  const resolveCoordinates = useCallback(async (lat: number, lng: number) => {
    setResolving(true)
    try {
      const formatted = await reverseGeocodeCoord(lat, lng)
      if (formatted) {
        setSelectedAddress(formatted)
        const parts = formatted.split(',').map((p) => p.trim())
        if (parts.length >= 2) {
          setResolvedCity(parts[parts.length - 3] || parts[0] || 'City')
          setResolvedState(parts[parts.length - 2] || 'State')
        }
      } else {
        setSelectedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
      }
    } catch {
      setSelectedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
    } finally {
      setResolving(false)
    }
  }, [])

  useEffect(() => {
    if (visible && initialLocation) {
      const newReg = {
        latitude: initialLocation.latitude,
        longitude: initialLocation.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      }
      setRegion(newReg)
      if (mapRef.current?.animateToRegion) {
        mapRef.current.animateToRegion(newReg, 400)
      }
      if (!initialLocation.address) {
        resolveCoordinates(initialLocation.latitude, initialLocation.longitude)
      } else {
        setSelectedAddress(initialLocation.address)
      }
    }
  }, [visible, initialLocation, resolveCoordinates])

  // Handle Map Camera Movement
  const onRegionChangeComplete = (newRegion: any) => {
    setRegion(newRegion)
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      resolveCoordinates(newRegion.latitude, newRegion.longitude)
    }, 450)
  }

  // Current GPS Recenter
  const handleGPSRecenter = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: 'denied' }))
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is needed to pinpoint your current location.')
        return
      }
      let loc = await Location.getLastKnownPositionAsync().catch(() => null)
      if (!loc) {
        loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null)
      }
      if (!loc) return
      const nextReg = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.006,
        longitudeDelta: 0.006,
      }
      setRegion(nextReg)
      if (mapRef.current?.animateToRegion) {
        mapRef.current.animateToRegion(nextReg, 400)
      }
      resolveCoordinates(loc.coords.latitude, loc.coords.longitude)
    } catch (e) {
      console.warn('GPS recenter error:', e)
    }
  }

  // Search places autocomplete (debounced)
  const handleSearchChange = (text: string) => {
    setSearchQuery(text)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (!text.trim() || text.length < 2) {
      setPredictions([])
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await getPlaceAutocomplete(text)
        setPredictions(results)
      } catch {
        setPredictions([])
      } finally {
        setIsSearching(false)
      }
    }, 350)
  }

  const handleSelectPrediction = async (item: AutocompletePrediction) => {
    Keyboard.dismiss()
    setSearchQuery(item.mainText || item.description)
    setPredictions([])
    setResolving(true)
    try {
      const coords = await geocodeAddress(item.description)
      if (coords) {
        const targetReg = {
          latitude: coords.lat,
          longitude: coords.lng,
          latitudeDelta: 0.006,
          longitudeDelta: 0.006,
        }
        setRegion(targetReg)
        if (mapRef.current?.animateToRegion) {
          mapRef.current.animateToRegion(targetReg, 400)
        }
        setSelectedAddress(item.description)
      }
    } catch (e) {
      console.warn('Geocoding prediction failed:', e)
    } finally {
      setResolving(false)
    }
  }

  // 1-Tap select from Saved Addresses
  const handleSelectSavedAddress = (addr: SavedAddressItem) => {
    const lat = addr.latitude || 18.5204
    const lng = addr.longitude || 73.8567
    const fullText = addr.full_address || addr.address || addr.label
    setSelectedAddress(fullText)
    const targetReg = {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.006,
      longitudeDelta: 0.006,
    }
    setRegion(targetReg)
    if (mapRef.current?.animateToRegion) {
      mapRef.current.animateToRegion(targetReg, 400)
    }
  }

  // Save current location as a new Saved Address (Backend max 5 limit)
  const handleSaveToBackend = async () => {
    if (!selectedAddress) return
    const finalLabel = saveLabel === 'other' ? (customLabel.trim() || 'Other') : saveLabel
    setSavingAddress(true)
    try {
      const payload = {
        label: finalLabel,
        address_type: saveLabel,
        address: selectedAddress,
        latitude: region.latitude,
        longitude: region.longitude,
        is_default: false,
      }
      const res = await profileApi.addAddress(payload)
      const created = res.data?.data || res.data
      setSaveModalVisible(false)
      Alert.alert('Saved!', `"${finalLabel.toUpperCase()}" added to your saved addresses.`)
      if (created) {
        setLocalSavedAddresses((prev) => [...prev, created])
        onAddressSaved?.(created)
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Maximum 5 saved addresses reached. Please delete one first.'
      Alert.alert('Address Save Notice', msg)
    } finally {
      setSavingAddress(false)
    }
  }

  const handleConfirm = () => {
    onConfirm({
      latitude: region.latitude,
      longitude: region.longitude,
      address: selectedAddress,
      city: resolvedCity,
      state: resolvedState,
    })
    onClose()
  }

  const getBadgeColor = () => {
    switch (mode) {
      case 'pickup': return '#10B981'
      case 'drop': return '#EF4444'
      case 'stop': return '#F59E0B'
      default: return '#2563EB'
    }
  }

  const getBadgeIcon = () => {
    switch (mode) {
      case 'pickup': return 'radio-button-on'
      case 'drop': return 'location'
      case 'stop': return 'flag'
      default: return 'map-pin'
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Full Interactive Map */}
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
          style={(StyleSheet.absoluteFill as any)}
          initialRegion={region}
          onRegionChangeComplete={onRegionChangeComplete}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
        />

        {/* Centered Draggable Pin & Tooltip Pill (matching Driver App UX) */}
        <View style={styles.centerPinContainer} pointerEvents="none">
          <View style={styles.dragTooltipPill}>
            <Text style={styles.dragTooltipText}>📍 Drag map to pinpoint</Text>
          </View>
          <View style={styles.pinIconWrapper}>
            <MaterialCommunityIcons name="map-marker" size={44} color={getBadgeColor()} />
            <View style={styles.pinShadow} />
          </View>
        </View>

        {/* Top Header Bar & Search Input */}
        <SafeAreaView edges={['top']} style={styles.topSafeArea}>
          <View style={styles.searchBarContainer}>
            <TouchableOpacity onPress={onClose} style={styles.backButton} activeOpacity={0.7}>
              <Feather name="arrow-left" size={22} color="#0F172A" />
            </TouchableOpacity>

            <View style={styles.searchInputWrapper}>
              <Feather name="search" size={18} color="#64748B" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder={mode === 'pickup' ? 'Search pickup location...' : mode === 'drop' ? 'Search destination...' : 'Search location or landmark...'}
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={handleSearchChange}
                clearButtonMode="while-editing"
                returnKeyType="search"
              />
              {isSearching && <ActivityIndicator size="small" color="#3B82F6" style={{ marginLeft: 6 }} />}
              {searchQuery.length > 0 && !isSearching && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setPredictions([]) }}>
                  <Feather name="x-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Autocomplete Predictions Dropdown */}
          {predictions.length > 0 && (
            <View style={styles.predictionsCard}>
              <FlatList
                data={predictions}
                keyExtractor={(item) => item.placeId}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.predictionRow}
                    onPress={() => handleSelectPrediction(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.predictionIcon}>
                      <Feather name="map-pin" size={16} color="#3B82F6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.predMainText} numberOfLines={1}>
                        {item.mainText || item.description}
                      </Text>
                      <Text style={styles.predSubText} numberOfLines={1}>
                        {item.secondaryText || ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* Quick Saved Addresses Horizontal Chips (0-API selection) */}
          {predictions.length === 0 && localSavedAddresses.length > 0 && (
            <View style={styles.savedAddressesBar}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {localSavedAddresses.map((addr, idx) => {
                  const labelKey = (addr.label || '').toLowerCase()
                  const isHome = labelKey.includes('home')
                  const isWork = labelKey.includes('work') || labelKey.includes('office')
                  return (
                    <TouchableOpacity
                      key={addr.id || idx}
                      style={styles.savedChip}
                      onPress={() => handleSelectSavedAddress(addr)}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={isHome ? 'home' : isWork ? 'briefcase' : 'location'}
                        size={14}
                        color="#2563EB"
                      />
                      <Text style={styles.savedChipText} numberOfLines={1}>
                        {addr.label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            </View>
          )}
        </SafeAreaView>

        {/* Bottom Floating GPS Recenter Button */}
        <TouchableOpacity
          style={[styles.gpsFloatingBtn, { bottom: 200 + insets.bottom }]}
          onPress={handleGPSRecenter}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={24} color="#2563EB" />
        </TouchableOpacity>

        {/* Bottom Selected Location Card */}
        <View style={[styles.bottomCard, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.locationHeaderRow}>
            <View style={[styles.locationIconBadge, { backgroundColor: `${getBadgeColor()}18` }]}>
              <Ionicons name={getBadgeIcon() as any} size={20} color={getBadgeColor()} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[styles.selectedLabelText, { color: getBadgeColor() }]}>
                  {mode === 'pickup' ? 'PICKUP LOCATION' : mode === 'drop' ? 'DROP DESTINATION' : 'SELECTED LOCATION'}
                </Text>
                {/* Save Address Quick Button */}
                <TouchableOpacity
                  style={styles.saveAddressTriggerBtn}
                  onPress={() => setSaveModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <Feather name="bookmark" size={13} color="#2563EB" />
                  <Text style={styles.saveAddressTriggerText}>Save</Text>
                </TouchableOpacity>
              </View>

              {resolving ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <ActivityIndicator size="small" color="#3B82F6" style={{ marginRight: 6 }} />
                  <Text style={styles.resolvingText}>Pinpointing exact address...</Text>
                </View>
              ) : (
                <Text style={styles.addressDisplayText} numberOfLines={2}>
                  {selectedAddress}
                </Text>
              )}
            </View>
          </View>

          {/* Confirm Button */}
          <TouchableOpacity
            style={[styles.confirmButton, { backgroundColor: getBadgeColor() }, resolving && { opacity: 0.7 }]}
            onPress={handleConfirm}
            activeOpacity={0.85}
            disabled={resolving}
          >
            <Text style={styles.confirmButtonText}>
              {mode === 'pickup' ? 'Set Pickup Location' : mode === 'drop' ? 'Set Drop Location' : 'Confirm Location'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Save Address Sub-Modal */}
        {saveModalVisible && (
          <Modal transparent animationType="fade" visible={saveModalVisible} onRequestClose={() => setSaveModalVisible(false)}>
            <View style={styles.saveModalOverlay}>
              <View style={styles.saveModalCard}>
                <View style={styles.saveModalHeader}>
                  <Text style={styles.saveModalTitle}>Save to My Addresses</Text>
                  <TouchableOpacity onPress={() => setSaveModalVisible(false)}>
                    <Feather name="x" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.saveModalSub} numberOfLines={2}>{selectedAddress}</Text>

                <Text style={styles.saveLabelHeader}>LABEL</Text>
                <View style={styles.saveLabelsRow}>
                  {['home', 'work', 'gym', 'other'].map((lbl) => (
                    <TouchableOpacity
                      key={lbl}
                      style={[styles.saveLabelChip, saveLabel === lbl && styles.saveLabelChipActive]}
                      onPress={() => setSaveLabel(lbl)}
                    >
                      <Text style={[styles.saveLabelText, saveLabel === lbl && styles.saveLabelTextActive]}>
                        {lbl.charAt(0).toUpperCase() + lbl.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {saveLabel === 'other' && (
                  <TextInput
                    style={styles.customLabelInput}
                    placeholder="e.g. Grandma's House, Clinic"
                    placeholderTextColor="#94A3B8"
                    value={customLabel}
                    onChangeText={setCustomLabel}
                  />
                )}

                <TouchableOpacity
                  style={[styles.saveSubmitBtn, savingAddress && { opacity: 0.7 }]}
                  onPress={handleSaveToBackend}
                  disabled={savingAddress}
                >
                  {savingAddress ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveSubmitBtnText}>Save Address (Max 5)</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 6,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  searchInputWrapper: {
    flex: 1,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  savedAddressesBar: {
    marginTop: 8,
  },
  savedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  savedChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  predictionsCard: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    maxHeight: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    overflow: 'hidden',
  },
  predictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  predictionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  predMainText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  predSubText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  centerPinContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -110,
    marginTop: -70,
    width: 220,
    alignItems: 'center',
    zIndex: 10,
  },
  dragTooltipPill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  dragTooltipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  pinIconWrapper: {
    alignItems: 'center',
  },
  pinShadow: {
    width: 8,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 4,
    marginTop: -4,
  },
  gpsFloatingBtn: {
    position: 'absolute',
    right: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 15,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 20,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  locationIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  selectedLabelText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  saveAddressTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  saveAddressTriggerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  addressDisplayText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4,
    lineHeight: 20,
  },
  resolvingText: {
    fontSize: 13,
    color: '#64748B',
  },
  confirmButton: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  saveModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  saveModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
  },
  saveModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  saveModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  saveModalSub: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  saveLabelHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  saveLabelsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  saveLabelChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  saveLabelChipActive: {
    backgroundColor: '#2563EB',
  },
  saveLabelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  saveLabelTextActive: {
    color: '#FFFFFF',
  },
  customLabelInput: {
    height: 46,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 16,
  },
  saveSubmitBtn: {
    height: 50,
    backgroundColor: '#2563EB',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
