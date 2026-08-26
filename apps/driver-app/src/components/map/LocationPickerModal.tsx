/**
 * Interactive Map Location Picker Modal
 * UX matches pinpoint reference design:
 * - Search bar with debounce & Google Places / geocoding predictions
 * - Centered draggable pinpoint with "📍 Drag map to pinpoint" tooltip pill
 * - 1-Tap GPS recentering
 * - Bottom card with location icon, "SELECTED LOCATION", formatted address, and "Confirm Location" button
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
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { reverseGeocodeCoord, geocodeAddress, getPlaceAutocomplete } from '../../services/googleMaps'
import type { AutocompletePrediction } from '../../services/googleMaps'

let MapView: any = null
let Marker: any = null
try {
  const maps = require('react-native-maps')
  MapView = maps.default
  Marker = maps.Marker
} catch (e) {
  console.warn('[LocationPickerModal] react-native-maps not available:', e)
}

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

interface LocationPickerModalProps {
  visible: boolean
  title?: string
  initialLocation?: { latitude: number; longitude: number; address?: string }
  onClose: () => void
  onConfirm: (loc: SelectedLocationData) => void
}

export default function LocationPickerModal({
  visible,
  title = 'Pick Location',
  initialLocation,
  onClose,
  onConfirm,
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

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [predictions, setPredictions] = useState<AutocompletePrediction[]>([])
  const [isSearching, setIsSearching] = useState<boolean>(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reverse geocode when region changes
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
    } catch (e) {
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
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') return
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
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

  // Search places autocomplete
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

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Full Interactive Map */}
        {MapView ? (
          <MapView
            ref={mapRef}
            style={(StyleSheet.absoluteFill as any)}
            initialRegion={region}
            onRegionChangeComplete={onRegionChangeComplete}
            showsUserLocation
            showsMyLocationButton={false}
            showsCompass={false}
          />
        ) : (
          <View style={[(StyleSheet.absoluteFill as any), styles.mapFallback]}>
            <Text style={{ color: '#64748B' }}>Interactive Map View</Text>
          </View>
        )}

        {/* Centered Draggable Pin & Tooltip Pill (matching screenshot) */}
        <View style={styles.centerPinContainer} pointerEvents="none">
          <View style={styles.dragTooltipPill}>
            <Text style={styles.dragTooltipText}>📍 Drag map to pinpoint</Text>
          </View>
          <View style={styles.pinIconWrapper}>
            <MaterialCommunityIcons name="map-marker" size={44} color="#EF4444" />
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
                placeholder="Search location, area, or landmark..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={handleSearchChange}
                clearButtonMode="while-editing"
                returnKeyType="search"
              />
              {isSearching && <ActivityIndicator size="small" color="#3B82F6" style={{ marginLeft: 6 }} />}
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
        </SafeAreaView>

        {/* Bottom Floating GPS Recenter Button */}
        <TouchableOpacity
          style={[styles.gpsFloatingBtn, { bottom: 170 + insets.bottom }]}
          onPress={handleGPSRecenter}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={24} color="#2563EB" />
        </TouchableOpacity>

        {/* Bottom Selected Location Card (matching screenshot) */}
        <View style={[styles.bottomCard, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.locationHeaderRow}>
            <View style={styles.locationIconBadge}>
              <Feather name="map-pin" size={18} color="#2563EB" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.selectedLabelText}>SELECTED LOCATION</Text>
              {resolving ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <ActivityIndicator size="small" color="#3B82F6" style={{ marginRight: 6 }} />
                  <Text style={styles.resolvingText}>Resolving address...</Text>
                </View>
              ) : (
                <Text style={styles.addressDisplayText} numberOfLines={2}>
                  {selectedAddress}
                </Text>
              )}
            </View>
          </View>

          {/* Big Blue Confirm Button */}
          <TouchableOpacity
            style={[styles.confirmButton, resolving && { opacity: 0.7 }]}
            onPress={handleConfirm}
            activeOpacity={0.85}
            disabled={resolving}
          >
            <Text style={styles.confirmButtonText}>Confirm Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  mapFallback: {
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
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
    alignItems: 'center',
    marginBottom: 16,
  },
  locationIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedLabelText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  addressDisplayText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
    lineHeight: 20,
  },
  resolvingText: {
    fontSize: 13,
    color: '#64748B',
  },
  confirmButton: {
    backgroundColor: '#2563EB',
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
})
