/**
 * Address Picker — Customer App
 * Swiggy-style map-based location picker for saved addresses.
 * 
 * Fixed:
 * - Map gray screen → uses Dimensions for explicit pixel height
 * - Location permission requested before map renders
 * - Reverse geocodes center pin on map drag
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  Dimensions, FlatList, Keyboard
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { profileApi } from '../../src/api/client';

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function AddressPickerScreen() {
  const params = useLocalSearchParams<{ id?: string; lat?: string; lon?: string; label?: string; address?: string; targetType?: string; mode?: string }>();

  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>({
    latitude:      params.lat ? parseFloat(params.lat) : 19.0760,
    longitude:     params.lon ? parseFloat(params.lon) : 72.8777,
    latitudeDelta:  0.01,
    longitudeDelta: 0.01,
  });

  const [mapReady, setMapReady]         = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [permGranted, setPermGranted]   = useState(false);
  const [saving, setSaving]             = useState(false);

  // Form state
  const [step, setStep]           = useState<'map' | 'details'>('map');
  const [addressText, setAddressText] = useState(params.address || '');
  const [label, setLabel]         = useState(params.targetType || params.label || 'home');
  const [customLabel, setCustomLabel] = useState('');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const insets = useSafeAreaInsets();

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Request location permission and move map to user's position ──
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          setPermGranted(true);
          // If no coords provided, center on user location
          if (!params.lat && !params.lon) {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const newRegion: Region = {
              latitude:      loc.coords.latitude,
              longitude:     loc.coords.longitude,
              latitudeDelta:  0.01,
              longitudeDelta: 0.01,
            };
            setRegion(newRegion);
            // Also reverse geocode immediately
            fetchAddressFromCoords(loc.coords.latitude, loc.coords.longitude);
          }
        } else {
          console.warn('[AddressPicker] Location permission denied');
        }
      } catch (e) {
        console.warn('[AddressPicker] Location error:', e);
      }
    })();
  }, []);

  const fetchAddressFromCoords = async (lat: number, lng: number) => {
    setLoadingAddress(true);
    try {
      if (GOOGLE_API_KEY) {
        // Use Google Geocoding API
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`
        );
        const data = await res.json();
        if (data.results?.length > 0) {
          setAddressText(data.results[0].formatted_address);
          return;
        }
      }
      // Fallback: expo-location reverse geocode
      const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (places.length > 0) {
        const p = places[0];
        const parts = [p.name, p.street, p.district, p.city, p.region, p.country].filter(Boolean);
        setAddressText(parts.join(', '));
      }
    } catch (e) {
      console.warn('[AddressPicker] Reverse geocode failed:', e);
    } finally {
      setLoadingAddress(false);
    }
  };

  const onRegionChangeComplete = (newRegion: Region) => {
    setRegion(newRegion);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      fetchAddressFromCoords(newRegion.latitude, newRegion.longitude);
    }, 800);
  };

  const handleSave = async () => {
    const finalLabel = ['home', 'work', 'drop', 'other'].includes(label)
      ? label
      : customLabel.trim() || 'other';

    if (!addressText.trim()) {
      Alert.alert('Missing Address', 'Please move the pin to a location first.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        label: finalLabel,
        address_type: label === 'drop' ? 'drop' : 'general',
        address: addressText,
        latitude: region.latitude,
        longitude: region.longitude,
      };

      if (params.id) {
        await profileApi.updateAddress(params.id, payload);
      } else {
        await profileApi.addAddress(payload);
      }
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to save address.');
    } finally {
      setSaving(false);
    }

  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setPredictions([]);
      return;
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      if (!GOOGLE_API_KEY) return;
      try {
        const res = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_API_KEY}&components=country:in`);
        const data = await res.json();
        if (data.status === 'OK') {
          setPredictions(data.predictions);
        }
      } catch (e) {
        console.warn('Autocomplete error', e);
      }
    }, 500);
  };

  const handleSelectPrediction = async (placeId: string) => {
    Keyboard.dismiss();
    setSearchQuery('');
    setPredictions([]);
    setIsSearching(true);
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_API_KEY}`);
      const data = await res.json();
      if (data.status === 'OK' && data.result?.geometry?.location) {
        const { lat, lng } = data.result.geometry.location;
        const newRegion = { latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 };
        setRegion(newRegion);
        if (mapRef.current) {
          mapRef.current.animateToRegion(newRegion, 1000);
        }
        setAddressText(data.result.formatted_address || data.result.name);
      }
    } catch (e) {
      console.warn('Place details error', e);
    } finally {
      setIsSearching(false);
    }
  };

  // ── STEP 2: Label + Address Details ──
  if (step === 'details') {
    return (
      <SafeAreaView style={styles.detailsRoot}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setStep('map')} style={styles.backBtn}>
              <Feather name="arrow-left" size={24} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{params.id ? 'Edit Address' : 'Save Address'}</Text>
          </View>

          {/* Selected address preview */}
          <View style={styles.addressPreview}>
            <View style={styles.addressPreviewIcon}>
              <Ionicons name="location" size={20} color="#2563EB" />
            </View>
            <Text style={styles.addressPreviewText} numberOfLines={2}>
              {addressText || 'No address selected'}
            </Text>
            <TouchableOpacity onPress={() => setStep('map')} style={styles.changeBtn}>
              <Text style={styles.changeBtnText}>Change</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.fieldLabel}>Save As</Text>
            <View style={styles.chipRow}>
              {[
                { key: 'home',  icon: 'home'      },
                { key: 'work',  icon: 'briefcase' },
                { key: 'drop',  icon: 'map-pin'   },
                { key: 'other', icon: 'map-pin'   },
              ].map(type => (
                <TouchableOpacity
                  key={type.key}
                  style={[styles.chip, label === type.key && styles.chipActive]}
                  onPress={() => setLabel(type.key)}
                >
                  <Feather
                    name={type.icon as any}
                    size={14}
                    color={label === type.key ? '#2563EB' : '#64748B'}
                  />
                  <Text style={[styles.chipText, label === type.key && { color: '#2563EB' }]}>
                    {type.key.charAt(0).toUpperCase() + type.key.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {label === 'other' && (
              <TextInput
                style={styles.input}
                placeholder="e.g., Gym, College, Parent's House"
                placeholderTextColor="#94A3B8"
                value={customLabel}
                onChangeText={setCustomLabel}
              />
            )}

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Add More Details (Optional)</Text>
            <TextInput
              style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
              multiline
              placeholder="Flat no., building name, landmark..."
              placeholderTextColor="#94A3B8"
              value={addressText}
              onChangeText={setAddressText}
            />
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>Save Address</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── STEP 1: Map picker ──
  return (
    <View style={{ width: SCREEN_W, height: SCREEN_H, backgroundColor: '#E5E5E5' }}>
      {/* Map — using absoluteFill for robust Android rendering */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        region={region}
        onRegionChangeComplete={onRegionChangeComplete}
        showsUserLocation={permGranted}
        showsMyLocationButton={false}
        onMapReady={() => {
          setMapReady(true);
          console.log('[AddressPicker] Map loaded ✅');
        }}
        zoomEnabled
        scrollEnabled
        pitchEnabled={false}
        rotateEnabled={false}
      />

      {/* Center Pin — absolutely centered using Flexbox */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            alignItems: 'center',
            justifyContent: 'center',
            paddingBottom: 40, // Offset so the tip of the pin hits the center
          },
        ]}
        pointerEvents="none"
      >
        <View style={styles.pinBubble}>
          <Text style={styles.pinText}>📍 Move to pick location</Text>
        </View>
        <Ionicons name="location" size={48} color="#EF4444" />
        <View style={styles.pinShadow} />
      </View>

      {/* Header bar / Search */}
      <View style={[styles.mapHeaderWrap, { paddingTop: insets.top + 10 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={styles.mapBackBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.mapSearchBox}>
            <Feather name="search" size={18} color="#64748B" />
            <TextInput
              style={styles.mapSearchInput}
              placeholder="Search a location..."
              value={searchQuery}
              onChangeText={handleSearchChange}
              placeholderTextColor="#94A3B8"
              autoFocus={false}
            />
            {isSearching && <ActivityIndicator size="small" color="#2563EB" />}
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setPredictions([]); }}>
                <Feather name="x-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {predictions.length > 0 && (
          <View style={styles.predictionsContainer}>
            <FlatList
              data={predictions}
              keyExtractor={(item) => item.place_id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.predictionItem}
                  onPress={() => handleSelectPrediction(item.place_id)}
                >
                  <Feather name="map-pin" size={16} color="#64748B" style={{ marginTop: 2 }} />
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.predMainText}>{item.structured_formatting?.main_text || item.description}</Text>
                    {item.structured_formatting?.secondary_text && (
                      <Text style={styles.predSubText}>{item.structured_formatting.secondary_text}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      {/* Bottom address card */}
      <View style={styles.mapFooter}>
        <View style={styles.addressBox}>
          <View style={styles.addressBoxIcon}>
            <Feather name="map-pin" size={20} color="#2563EB" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.addressBoxLabel}>Selected Location</Text>
            {loadingAddress ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={{ color: '#94A3B8', fontSize: 13 }}>Finding address...</Text>
              </View>
            ) : (
              <Text style={styles.addressBoxText} numberOfLines={2}>
                {addressText || 'Move the pin to select a location'}
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.confirmLocationBtn, (!addressText && !loadingAddress) && { opacity: 0.5 }]}
          onPress={() => {
            if (!addressText) {
              Alert.alert('No location selected', 'Please drag the map to select a location first.');
              return;
            }
            if (params.mode === 'pick') {
              router.navigate({ 
                pathname: '/book/cab', 
                params: { [params.targetType === 'pickup' ? 'pickup' : 'destination']: addressText } 
              });
              return;
            }
            setStep('details');
          }}
        >
          <Text style={styles.confirmLocationText}>Confirm Location →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Map step ──
  mapHeaderWrap: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingHorizontal: 16, zIndex: 10,
  },
  mapBackBtn: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, elevation: 5, marginRight: 10,
  },
  mapSearchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 14, height: 46,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
  },
  mapSearchInput: { flex: 1, fontSize: 14, color: '#0F172A', fontWeight: '500', height: '100%' },
  predictionsContainer: {
    backgroundColor: '#FFF', borderRadius: 12, marginTop: 10,
    maxHeight: 250, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, elevation: 5,
    overflow: 'hidden'
  },
  predictionItem: {
    flexDirection: 'row', padding: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  predMainText: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  predSubText: { fontSize: 12, color: '#64748B', marginTop: 2 },

  pinBubble: {
    backgroundColor: '#1E293B', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, marginBottom: 4,
  },
  pinText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  pinShadow: { width: 12, height: 4, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 2, marginTop: -4 },

  mapFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 32,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, elevation: 12,
  },
  addressBox: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, gap: 12 },
  addressBoxIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  addressBoxLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginBottom: 4 },
  addressBoxText: { fontSize: 14, color: '#0F172A', fontWeight: '500', lineHeight: 20 },
  confirmLocationBtn: {
    backgroundColor: '#2563EB', borderRadius: 16, paddingVertical: 16, alignItems: 'center',
    shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  confirmLocationText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // ── Details step ──
  detailsRoot: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginLeft: 8 },

  addressPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    margin: 16, padding: 14,
    backgroundColor: '#EFF6FF', borderRadius: 14,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  addressPreviewIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#2563EB22', alignItems: 'center', justifyContent: 'center',
  },
  addressPreviewText: { flex: 1, fontSize: 13, color: '#1E3A8A', fontWeight: '500' },
  changeBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  changeBtnText: { color: '#2563EB', fontSize: 13, fontWeight: '700' },

  formContainer: { paddingHorizontal: 20, paddingTop: 4 },
  fieldLabel: {
    fontSize: 12, fontWeight: '700', color: '#64748B',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  chipRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#FFF',
  },
  chipActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  input: {
    backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 14, padding: 14, fontSize: 14, color: '#0F172A', marginBottom: 4,
  },

  footer: {
    padding: 20, paddingBottom: 36,
    backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 'auto',
  },
  saveBtn: {
    backgroundColor: '#2563EB', borderRadius: 16, paddingVertical: 16, alignItems: 'center',
    shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
