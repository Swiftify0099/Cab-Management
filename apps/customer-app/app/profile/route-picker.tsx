/**
 * Route Picker — Customer App
 * /profile/route-picker
 *
 * 3-step flow:
 *   Step 1 (pickup)  → user searches/drags map to set Pickup location
 *   Step 2 (drop)    → user searches/drags map to set Drop location
 *   Step 3 (name)    → user names the route and saves
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, FlatList, Keyboard, Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { routeApi } from '../../src/api/client';

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type StepType = 'pickup' | 'drop' | 'name';

interface LocationPoint {
  address: string;
  label: string;
  lat: number;
  lon: number;
}

export default function RoutePickerScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const [step, setStep] = useState<StepType>('pickup');
  const [permGranted, setPermGranted] = useState(false);
  const [saving, setSaving] = useState(false);

  // Map state
  const [region, setRegion] = useState<Region>({
    latitude: 19.0760,
    longitude: 72.8777,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [mapReady, setMapReady] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [addressText, setAddressText] = useState('');

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Saved points
  const [pickup, setPickup] = useState<LocationPoint | null>(null);
  const [drop, setDrop] = useState<LocationPoint | null>(null);

  // Name step
  const [routeName, setRouteName] = useState('');

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setPermGranted(true);
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const newRegion: Region = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setRegion(newRegion);
        fetchAddressFromCoords(loc.coords.latitude, loc.coords.longitude);
      }
    })();
  }, []);

  // Reset address when step changes to drop
  useEffect(() => {
    if (step === 'drop') {
      setAddressText('');
      setSearchQuery('');
      setPredictions([]);
    }
  }, [step]);

  const fetchAddressFromCoords = async (lat: number, lng: number) => {
    setLoadingAddress(true);
    try {
      if (GOOGLE_API_KEY) {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`
        );
        const data = await res.json();
        if (data.results?.length > 0) {
          setAddressText(data.results[0].formatted_address);
          return;
        }
      }
      const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (places.length > 0) {
        const p = places[0];
        const parts = [p.name, p.street, p.district, p.city, p.region, p.country].filter(Boolean);
        setAddressText(parts.join(', '));
      }
    } catch (e) {
      console.warn('[RoutePicker] Geocode error:', e);
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

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) { setPredictions([]); return; }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      if (!GOOGLE_API_KEY) return;
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_API_KEY}&components=country:in`
        );
        const data = await res.json();
        if (data.status === 'OK') setPredictions(data.predictions);
      } catch (e) { console.warn('Autocomplete error', e); }
    }, 500);
  };

  const handleSelectPrediction = async (placeId: string, description: string) => {
    Keyboard.dismiss();
    setSearchQuery('');
    setPredictions([]);
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_API_KEY}`
      );
      const data = await res.json();
      if (data.status === 'OK' && data.result?.geometry?.location) {
        const { lat, lng } = data.result.geometry.location;
        const newRegion = { latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 };
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 800);
        setAddressText(data.result.formatted_address || description);
      }
    } catch (e) { console.warn('Place details error', e); }
    finally { setIsSearching(false); }
  };

  const handleConfirmPoint = () => {
    if (!addressText) {
      Alert.alert('No location', 'Please drag the map or search a location first.');
      return;
    }
    if (step === 'pickup') {
      setPickup({ address: addressText, label: 'Pickup', lat: region.latitude, lon: region.longitude });
      // Auto-generate route name suggestion
      const city = addressText.split(',')[0]?.trim() || 'From';
      setRouteName(city + ' → ');
      setStep('drop');
    } else if (step === 'drop') {
      setDrop({ address: addressText, label: 'Drop', lat: region.latitude, lon: region.longitude });
      const city = addressText.split(',')[0]?.trim() || 'To';
      setRouteName(prev => prev + city);
      setStep('name');
    }
  };

  const handleSaveRoute = async () => {
    if (!pickup || !drop) return;
    if (!routeName.trim()) {
      Alert.alert('Name required', 'Please give this route a name.');
      return;
    }
    setSaving(true);
    try {
      await routeApi.addRoute({
        route_name: routeName.trim(),
        pickup_label: pickup.label,
        pickup_address: pickup.address,
        pickup_lat: pickup.lat,
        pickup_lon: pickup.lon,
        drop_label: drop.label,
        drop_address: drop.address,
        drop_lat: drop.lat,
        drop_lon: drop.lon,
      });
      Alert.alert('Route Saved! 🎉', `"${routeName.trim()}" has been saved.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to save route. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── STEP 3: Name the route ──
  if (step === 'name') {
    return (
      <SafeAreaView style={styles.detailsRoot}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep('drop')} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Name Your Route</Text>
        </View>

        {/* Route Summary */}
        <View style={styles.routeSummary}>
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, { backgroundColor: '#10B981' }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.routePointLabel}>PICKUP</Text>
              <Text style={styles.routePointAddress} numberOfLines={2}>{pickup?.address}</Text>
            </View>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, { backgroundColor: '#EF4444' }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.routePointLabel}>DROP</Text>
              <Text style={styles.routePointAddress} numberOfLines={2}>{drop?.address}</Text>
            </View>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.fieldLabel}>Route Name</Text>
          <TextInput
            style={styles.routeNameInput}
            placeholder="e.g. Home → Office"
            placeholderTextColor="#94A3B8"
            value={routeName}
            onChangeText={setRouteName}
            autoFocus
          />
          <Text style={styles.hint}>This name will appear as a quick-select chip when booking a cab.</Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSaveRoute}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.saveBtnText}>Save Route</Text>
                </>
            }
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── STEP 1 & 2: Map picker ──
  const isPickup = step === 'pickup';
  const accentColor = isPickup ? '#10B981' : '#EF4444';
  const stepLabel = isPickup ? 'Set Pickup Location' : 'Set Drop Location';
  const stepNum = isPickup ? '1/2' : '2/2';

  return (
    <View style={{ width: SCREEN_W, height: SCREEN_H, backgroundColor: '#E5E5E5' }}>
      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
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

      {/* Center Pin */}
      <View
        style={{ ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 }}
        pointerEvents="none"
      >
        <View style={[styles.pinBubble, { backgroundColor: accentColor }]}>
          <Text style={styles.pinText}>{isPickup ? '📍 Pickup' : '🏁 Drop'}</Text>
        </View>
        <Ionicons name="location" size={48} color={accentColor} />
        <View style={[styles.pinShadow]} />
      </View>

      {/* Header + Search */}
      <View style={[styles.mapHeaderWrap, { paddingTop: insets.top + 8 }]}>
        {/* Step indicator */}
        <View style={styles.stepRow}>
          <TouchableOpacity style={styles.mapBackBtn} onPress={() => {
            if (step === 'drop') setStep('pickup');
            else router.back();
          }}>
            <Feather name="arrow-left" size={22} color="#0F172A" />
          </TouchableOpacity>
          <View style={[styles.stepBadge, { backgroundColor: accentColor }]}>
            <Text style={styles.stepBadgeText}>{stepNum}</Text>
          </View>
          <Text style={styles.stepTitle}>{stepLabel}</Text>
        </View>

        {/* Search Box */}
        <View style={styles.mapSearchBox}>
          <Feather name="search" size={18} color="#64748B" />
          <TextInput
            style={styles.mapSearchInput}
            placeholder={`Search ${isPickup ? 'pickup' : 'drop'} location...`}
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholderTextColor="#94A3B8"
          />
          {isSearching && <ActivityIndicator size="small" color={accentColor} />}
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setPredictions([]); }}>
              <Feather name="x-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
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
                  onPress={() => handleSelectPrediction(item.place_id, item.description)}
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

        {/* Pickup progress strip (when on drop step) */}
        {!isPickup && pickup && (
          <View style={styles.pickupStrip}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.pickupStripText} numberOfLines={1}> ✅ Pickup: {pickup.address}</Text>
          </View>
        )}
      </View>

      {/* Bottom card */}
      <View style={styles.mapFooter}>
        <View style={styles.addressBox}>
          <View style={[styles.addressBoxIcon, { backgroundColor: accentColor + '20' }]}>
            <Feather name="map-pin" size={20} color={accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.addressBoxLabel}>{isPickup ? 'Pickup Location' : 'Drop Location'}</Text>
            {loadingAddress ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <ActivityIndicator size="small" color={accentColor} />
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
          style={[styles.confirmBtn, { backgroundColor: accentColor }, (!addressText && !loadingAddress) && { opacity: 0.5 }]}
          onPress={handleConfirmPoint}
        >
          <Text style={styles.confirmBtnText}>
            {isPickup ? 'Confirm Pickup →' : 'Confirm Drop →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Map Step ──
  mapHeaderWrap: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingHorizontal: 16, zIndex: 10,
  },
  stepRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 10,
  },
  mapBackBtn: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, elevation: 5, marginRight: 10,
  },
  stepBadge: {
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginRight: 8,
  },
  stepBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  stepTitle: { fontSize: 16, fontWeight: '700', color: '#FFF', textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 4 },
  mapSearchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 14, height: 48,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
    marginBottom: 8,
  },
  mapSearchInput: { flex: 1, fontSize: 14, color: '#0F172A', fontWeight: '500', height: '100%' },
  predictionsContainer: {
    backgroundColor: '#FFF', borderRadius: 12,
    maxHeight: 250, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, elevation: 5,
    overflow: 'hidden', marginBottom: 8,
  },
  predictionItem: { flexDirection: 'row', padding: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  predMainText: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  predSubText: { fontSize: 12, color: '#64748B', marginTop: 2 },
  pickupStrip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ECFDF5', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#6EE7B7',
  },
  pickupStripText: { fontSize: 12, fontWeight: '600', color: '#065F46', flex: 1 },

  pinBubble: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, marginBottom: 4 },
  pinText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  pinShadow: { width: 12, height: 4, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 2, marginTop: -4 },

  mapFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 32,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, elevation: 12,
  },
  addressBox: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, gap: 12 },
  addressBoxIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  addressBoxLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginBottom: 4 },
  addressBoxText: { fontSize: 14, color: '#0F172A', fontWeight: '500', lineHeight: 20 },
  confirmBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  confirmBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // ── Name Step / Details ──
  detailsRoot: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginLeft: 8 },

  routeSummary: {
    margin: 16, padding: 16, backgroundColor: '#FFF', borderRadius: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  routePoint: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  routeDot: { width: 14, height: 14, borderRadius: 7, marginTop: 4 },
  routePointLabel: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 1, marginBottom: 2 },
  routePointAddress: { fontSize: 13, color: '#0F172A', fontWeight: '500', lineHeight: 18 },
  routeLine: { width: 2, height: 20, backgroundColor: '#E2E8F0', marginLeft: 6, marginVertical: 6 },

  formSection: { paddingHorizontal: 20, paddingTop: 8 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  routeNameInput: {
    backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 14, padding: 16, fontSize: 16, color: '#0F172A',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  hint: { fontSize: 12, color: '#94A3B8', marginTop: 8, lineHeight: 18 },

  footer: { padding: 20, paddingBottom: 36, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 'auto' },
  saveBtn: {
    backgroundColor: '#2563EB', borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
    shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
