/**
 * Pre-Booking Screen — Customer
 *
 * Allows a customer to register travel intent BEFORE any driver has created
 * a matching trip.  Backend stores it in pending_bookings and instantly
 * reverse-scans published trips.  Customer is notified via WebSocket
 * when a match is found.
 *
 * Women-Only option enforces women-only driver filter.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Switch, ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:80/api/v1';

interface PlaceSuggestion {
  label: string;
  lat: number;
  lng: number;
}

export default function PreBookingScreen() {
  // Form state
  const [pickupAddress,  setPickupAddress]  = useState('');
  const [pickupLat,      setPickupLat]      = useState('');
  const [pickupLng,      setPickupLng]      = useState('');
  const [destAddress,    setDestAddress]    = useState('');
  const [destLat,        setDestLat]        = useState('');
  const [destLng,        setDestLng]        = useState('');
  const [travelDate,     setTravelDate]     = useState('');
  const [fromTime,       setFromTime]       = useState('');
  const [toTime,         setToTime]         = useState('');
  const [seats,          setSeats]          = useState(1);
  const [parcel,         setParcel]         = useState(false);
  const [womenOnly,      setWomenOnly]      = useState(false);

  // UI state
  const [loading,        setLoading]        = useState(false);
  const [submitted,      setSubmitted]      = useState(false);
  const [submittedId,    setSubmittedId]    = useState<string | null>(null);
  const [mapRegion,      setMapRegion]      = useState({
    latitude: 19.0760, longitude: 72.8777,
    latitudeDelta: 0.5, longitudeDelta: 0.5,
  });

  const today = new Date().toISOString().split('T')[0];

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (!pickupAddress.trim()) return 'Enter pickup address';
    if (!pickupLat || !pickupLng) return 'Enter pickup coordinates (lat, lng)';
    if (!destAddress.trim()) return 'Enter destination address';
    if (!destLat || !destLng) return 'Enter destination coordinates (lat, lng)';
    if (!travelDate.trim()) return 'Enter travel date (YYYY-MM-DD)';
    if (!fromTime.trim()) return 'Enter from time (HH:MM)';
    if (!toTime.trim()) return 'Enter to time (HH:MM)';
    if (isNaN(parseFloat(pickupLat)) || isNaN(parseFloat(pickupLng))) return 'Invalid pickup coordinates';
    if (isNaN(parseFloat(destLat))   || isNaN(parseFloat(destLng)))   return 'Invalid destination coordinates';
    return null;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const err = validate();
    if (err) { Alert.alert('Incomplete', err); return; }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post(`${API}/bookings/pending`, {
        pickup_address:      pickupAddress.trim(),
        pickup_lat:          parseFloat(pickupLat),
        pickup_lng:          parseFloat(pickupLng),
        destination_address: destAddress.trim(),
        destination_lat:     parseFloat(destLat),
        destination_lng:     parseFloat(destLng),
        travel_date:         travelDate.trim(),
        from_time:           fromTime.trim(),
        to_time:             toTime.trim(),
        seats_required:      seats,
        parcel,
        women_only:          womenOnly,
      }, { headers });

      setSubmittedId(res.data?.data?.id || null);
      setSubmitted(true);
    } catch (e: any) {
      Alert.alert('Submission Failed', e?.response?.data?.detail || 'Please check your details');
    } finally {
      setLoading(false);
    }
  };

  // ── Success Screen ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0F1E" />
        <View style={styles.successContainer}>
          <LinearGradient
            colors={['rgba(99,102,241,0.2)', 'transparent']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color="#6366F1" />
          </View>
          <Text style={styles.successTitle}>Pre-Booking Submitted!</Text>
          <Text style={styles.successSub}>
            We'll notify you instantly when a driver matches your route.{'\n'}
            Keep the app open for real-time alerts.
          </Text>
          {womenOnly && (
            <View style={styles.womenBadge}>
              <Text style={styles.womenBadgeText}>👩 Women-only filter active — only female drivers will match</Text>
            </View>
          )}

          <View style={styles.successActions}>
            <TouchableOpacity
              style={styles.waitBtn}
              onPress={() => router.push(
                `/matching-waiting?bookingId=&pendingBookingId=${submittedId}` as any
              )}
            >
              <LinearGradient colors={['#6366F1','#8B5CF6']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.waitBtnGrad}>
                <Feather name="bell" size={18} color="#fff" />
                <Text style={styles.waitBtnText}>Wait for Notification</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(tabs)/home' as any)}>
              <Text style={styles.homeBtnText}>Go to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0F1E" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pre-Book a Ride</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.form}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Map Preview */}
        <View style={styles.mapPreview}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFill}
            region={mapRegion}
            scrollEnabled={false}
            zoomEnabled={false}
          >
            {pickupLat && pickupLng && !isNaN(parseFloat(pickupLat)) && (
              <Marker
                coordinate={{ latitude: parseFloat(pickupLat), longitude: parseFloat(pickupLng) }}
                pinColor="#6366F1"
                title="Pickup"
              />
            )}
            {destLat && destLng && !isNaN(parseFloat(destLat)) && (
              <Marker
                coordinate={{ latitude: parseFloat(destLat), longitude: parseFloat(destLng) }}
                pinColor="#EF4444"
                title="Destination"
              />
            )}
          </MapView>
          <View style={styles.mapLabel}>
            <MaterialCommunityIcons name="map-marker-path" size={16} color="#6366F1" />
            <Text style={styles.mapLabelText}> Pre-booking route preview</Text>
          </View>
        </View>

        {/* Pickup Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: '#22C55E' }]} />
            <Text style={styles.sectionTitle}>Pickup Point</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Full pickup address"
            placeholderTextColor="#4B5563"
            value={pickupAddress}
            onChangeText={setPickupAddress}
            multiline
          />
          <View style={styles.coordRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 8 }]}
              placeholder="Latitude (e.g. 19.076)"
              placeholderTextColor="#4B5563"
              keyboardType="numeric"
              value={pickupLat}
              onChangeText={v => {
                setPickupLat(v);
                const lat = parseFloat(v);
                const lng = parseFloat(pickupLng);
                if (!isNaN(lat) && !isNaN(lng)) {
                  setMapRegion(r => ({ ...r, latitude: lat, longitude: lng }));
                }
              }}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Longitude (e.g. 72.877)"
              placeholderTextColor="#4B5563"
              keyboardType="numeric"
              value={pickupLng}
              onChangeText={setPickupLng}
            />
          </View>
        </View>

        {/* Destination Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.sectionTitle}>Destination</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Full destination address"
            placeholderTextColor="#4B5563"
            value={destAddress}
            onChangeText={setDestAddress}
            multiline
          />
          <View style={styles.coordRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 8 }]}
              placeholder="Latitude"
              placeholderTextColor="#4B5563"
              keyboardType="numeric"
              value={destLat}
              onChangeText={setDestLat}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Longitude"
              placeholderTextColor="#4B5563"
              keyboardType="numeric"
              value={destLng}
              onChangeText={setDestLng}
            />
          </View>
        </View>

        {/* Travel Window */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="calendar" size={16} color="#6366F1" />
            <Text style={styles.sectionTitle}> Travel Window</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder={`Travel Date (YYYY-MM-DD, e.g. ${today})`}
            placeholderTextColor="#4B5563"
            value={travelDate}
            onChangeText={setTravelDate}
          />
          <View style={styles.coordRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 8 }]}
              placeholder="From (HH:MM)"
              placeholderTextColor="#4B5563"
              value={fromTime}
              onChangeText={setFromTime}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="To (HH:MM)"
              placeholderTextColor="#4B5563"
              value={toTime}
              onChangeText={setToTime}
            />
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="sliders" size={16} color="#6366F1" />
            <Text style={styles.sectionTitle}> Preferences</Text>
          </View>

          {/* Seat Counter */}
          <View style={styles.seatRow}>
            <Text style={styles.seatLabel}>Seats Required</Text>
            <View style={styles.seatCounter}>
              <TouchableOpacity
                style={styles.seatBtn}
                onPress={() => setSeats(s => Math.max(1, s - 1))}
              >
                <Feather name="minus" size={18} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.seatNum}>{seats}</Text>
              <TouchableOpacity
                style={styles.seatBtn}
                onPress={() => setSeats(s => Math.min(10, s + 1))}
              >
                <Feather name="plus" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Parcel Toggle */}
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>📦 Include Parcel</Text>
              <Text style={styles.toggleSub}>Adds ₹50 parcel charge</Text>
            </View>
            <Switch
              value={parcel}
              onValueChange={setParcel}
              trackColor={{ false: '#374151', true: '#6366F1' }}
              thumbColor="#fff"
            />
          </View>

          {/* Women-Only Toggle */}
          <View style={[styles.toggleRow, womenOnly && styles.toggleRowActive]}>
            <View>
              <Text style={styles.toggleLabel}>👩 Women-Only Ride</Text>
              <Text style={styles.toggleSub}>Only female drivers will match your booking</Text>
            </View>
            <Switch
              value={womenOnly}
              onValueChange={setWomenOnly}
              trackColor={{ false: '#374151', true: '#EC4899' }}
              thumbColor="#fff"
            />
          </View>
          {womenOnly && (
            <View style={styles.womenNote}>
              <Ionicons name="shield-checkmark" size={14} color="#F472B6" />
              <Text style={styles.womenNoteText}> Safety first — exclusively matched with women drivers</Text>
            </View>
          )}
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color="#6366F1" />
          <Text style={styles.infoText}>
            {' '}Your pre-booking is stored for 24 hours. You'll receive an instant notification when a driver publishes a matching route.
          </Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <LinearGradient
            colors={['#6366F1', '#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.submitGrad}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <MaterialCommunityIcons name="calendar-check" size={20} color="#fff" />
                  <Text style={styles.submitText}> Submit Pre-Booking</Text>
                </>
            }
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:            { flex: 1, backgroundColor: '#0A0F1E' },

  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn:         { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerTitle:     { color: '#fff', fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },

  form:            { padding: 20, paddingBottom: 48 },

  mapPreview:      { height: 180, borderRadius: 20, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)' },
  mapLabel:        { position: 'absolute', bottom: 10, left: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(10,15,30,0.75)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  mapLabelText:    { color: '#A78BFA', fontSize: 12 },

  section:         { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  sectionHeader:   { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionDot:      { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  sectionTitle:    { color: '#fff', fontSize: 15, fontWeight: '700' },

  input:           { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 10 },
  coordRow:        { flexDirection: 'row' },

  seatRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  seatLabel:       { color: '#fff', fontSize: 14, fontWeight: '600' },
  seatCounter:     { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' },
  seatBtn:         { padding: 10, paddingHorizontal: 14 },
  seatNum:         { color: '#fff', fontSize: 18, fontWeight: '700', paddingHorizontal: 16 },

  toggleRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  toggleRowActive: { borderRadius: 12, backgroundColor: 'rgba(236,72,153,0.07)', paddingHorizontal: 8, marginHorizontal: -8 },
  toggleLabel:     { color: '#fff', fontSize: 14, fontWeight: '600' },
  toggleSub:       { color: '#6B7280', fontSize: 12, marginTop: 2 },

  womenNote:       { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(244,114,182,0.1)', borderRadius: 10, padding: 10, marginTop: 4 },
  womenNoteText:   { color: '#F472B6', fontSize: 12 },

  infoCard:        { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(99,102,241,0.1)', borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)' },
  infoText:        { color: '#A78BFA', fontSize: 13, flex: 1, lineHeight: 18 },

  submitBtn:       { borderRadius: 18, overflow: 'hidden' },
  submitGrad:      { paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  submitText:      { color: '#fff', fontSize: 17, fontWeight: '700' },

  // Success
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, overflow: 'hidden' },
  successIcon:      { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(99,102,241,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  successTitle:     { color: '#fff', fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  successSub:       { color: '#9CA3AF', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  womenBadge:       { backgroundColor: 'rgba(244,114,182,0.15)', borderRadius: 12, padding: 12, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(244,114,182,0.3)' },
  womenBadgeText:   { color: '#F472B6', fontSize: 13, textAlign: 'center' },
  successActions:   { width: '100%', gap: 12 },
  waitBtn:          { borderRadius: 16, overflow: 'hidden' },
  waitBtnGrad:      { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  waitBtnText:      { color: '#fff', fontSize: 16, fontWeight: '700' },
  homeBtn:          { borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  homeBtnText:      { color: '#9CA3AF', fontSize: 15 },
});
