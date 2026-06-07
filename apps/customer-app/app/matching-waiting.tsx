/**
 * Matching Waiting Screen
 * Handles:
 *  - MATCH_FOUND  → show driver card, prompt to book
 *  - TRIP_ACCEPTED → show confirmed card + navigate to tracking
 *  - TRIP_REJECTED → show toast, keep searching
 *  - ARRIVAL_ALERT → show 10km alert banner
 *  - 120-second timeout → show "no driver" UI
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Animated, Easing, StatusBar, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
import {
  useCustomerSocket,
  MatchFoundPayload,
  TripAcceptedPayload,
  ArrivalAlertPayload,
} from '../src/hooks/useCustomerSocket';

const API = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:80/api/v1';

type WaitState = 'searching' | 'match_found' | 'booking' | 'accepted' | 'failed'

export default function MatchingWaitingScreen() {
  const {
    bookingId,
    pendingBookingId,
    tripId: urlTripId,
  } = useLocalSearchParams<{
    bookingId: string
    pendingBookingId?: string
    tripId?: string
  }>();

  const {
    connected, joinTrip, matchFound, tripAccepted, tripRejected,
    arrivalAlert, clearMatchFound, clearTripAccepted, clearTripRejected, clearArrivalAlert,
    socket, sendLocationUpdate,
  } = useCustomerSocket();

  const [state, setState]             = useState<WaitState>('searching');
  const [timeLeft, setTimeLeft]       = useState(120);
  const [matchData, setMatchData]     = useState<MatchFoundPayload | null>(null);
  const [confirmedDriver, setConfirmedDriver] = useState<TripAcceptedPayload | null>(null);
  const [rejectionMsg, setRejectionMsg] = useState('');
  const [booking, setBooking]         = useState(false);
  const [cancelling, setCancelling]   = useState(false);

  // Pulse animation for searching dot
  const pulse = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.4, duration: 700, useNativeDriver: true, easing: Easing.ease }),
        Animated.timing(pulse, { toValue: 1.0, duration: 700, useNativeDriver: true, easing: Easing.ease }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  // 120-second search timeout
  useEffect(() => {
    if (state !== 'searching') return;
    if (timeLeft <= 0) { setState('failed'); return; }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, state]);

  // Join WebSocket room when connected
  useEffect(() => {
    if (!connected) return;
    if (bookingId) joinTrip(bookingId);
    if (urlTripId) joinTrip(urlTripId);
  }, [connected, bookingId, urlTripId]);

  // ── Phase 2: Broadcast GPS every 10s while searching ──────────────────────
  // Backend checks if customer entered any driver's 3KM route corridor.
  // On corridor entry: MATCH_FOUND is emitted back to customer.
  useEffect(() => {
    if (state !== 'searching') return;

    let intervalId: ReturnType<typeof setInterval>;
    let permGranted = false;

    const startBroadcast = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        permGranted = status === 'granted';
      } catch { /* ignore */ }

      const broadcastOnce = async () => {
        if (!permGranted) return;
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          sendLocationUpdate(loc.coords.latitude, loc.coords.longitude);
        } catch { /* GPS unavailable — skip */ }
      };

      await broadcastOnce();
      intervalId = setInterval(broadcastOnce, 10_000);
    };

    startBroadcast();
    return () => clearInterval(intervalId);
  }, [state, sendLocationUpdate]);

  // Handle MATCH_FOUND
  useEffect(() => {
    if (!matchFound) return;
    setMatchData(matchFound);
    setState('match_found');
    clearMatchFound();
  }, [matchFound]);

  // Handle TRIP_ACCEPTED
  useEffect(() => {
    if (!tripAccepted) return;
    setConfirmedDriver(tripAccepted);
    setState('accepted');
    clearTripAccepted();
  }, [tripAccepted]);

  // Handle TRIP_REJECTED (show toast, keep searching)
  useEffect(() => {
    if (!tripRejected) return;
    setRejectionMsg(tripRejected.message || 'Driver rejected — still searching...');
    clearTripRejected();
    // Auto-hide rejection message after 4s
    const t = setTimeout(() => setRejectionMsg(''), 4000);
    return () => clearTimeout(t);
  }, [tripRejected]);

  // ── Book the matched trip ──────────────────────────────────────────────────
  const handleBookMatch = useCallback(async () => {
    if (!matchData || booking) return;
    setBooking(true);
    setState('booking');
    try {
      const token = await SecureStore.getItemAsync('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post(`${API}/bookings/`, {
        trip_id:            matchData.trip_id,
        seat_count:         1,
        pending_booking_id: bookingId || pendingBookingId,
      }, { headers });
      // TRIP_ACCEPTED will come via WebSocket → handled above
    } catch (e: any) {
      Alert.alert('Booking Failed', e?.response?.data?.detail || 'Try again');
      setState('match_found');
    } finally {
      setBooking(false);
    }
  }, [matchData, booking, bookingId, pendingBookingId]);

  // ── Cancel ─────────────────────────────────────────────────────────────────
  const handleCancel = useCallback(async () => {
    setCancelling(true);
    try {
      const token = await SecureStore.getItemAsync('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      if (bookingId) {
        await axios.post(`${API}/bookings/${bookingId}/cancel`, { reason: 'Cancelled while waiting' }, { headers });
      } else if (pendingBookingId) {
        await axios.delete(`${API}/bookings/pending/${pendingBookingId}`, { headers });
      }
    } catch { /* ignore */ }
    router.replace('/(tabs)/trips' as any);
  }, [bookingId, pendingBookingId]);

  // ── Navigate to tracking ───────────────────────────────────────────────────
  const handleTrackLive = () => {
    const bid = confirmedDriver?.booking_id || bookingId;
    router.replace(`/track?bookingId=${bid}` as any);
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0F1E" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {state === 'accepted' ? 'Ride Confirmed! 🎉'
            : state === 'match_found' ? 'Match Found! 🚗'
            : state === 'failed' ? 'No Drivers Available'
            : 'Finding Your Driver...'}
        </Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Rejection toast */}
      {!!rejectionMsg && (
        <View style={styles.rejectionToast}>
          <Ionicons name="information-circle" size={18} color="#FCD34D" />
          <Text style={styles.rejectionText}>{rejectionMsg}</Text>
        </View>
      )}

      {/* Arrival Alert Banner */}
      {arrivalAlert && (
        <TouchableOpacity style={styles.arrivalBanner} onPress={clearArrivalAlert}>
          <LinearGradient colors={['#F59E0B','#EF4444']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.arrivalGrad}>
            <Text style={styles.arrivalEmoji}>🚗</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.arrivalTitle}>Driver is almost here!</Text>
              <Text style={styles.arrivalSub}>
                {arrivalAlert.distance_km.toFixed(1)} km away
                {arrivalAlert.eta_minutes ? ` · ~${arrivalAlert.eta_minutes} min` : ''}
                {arrivalAlert.driver_phone ? `  •  📞 ${arrivalAlert.driver_phone}` : ''}
              </Text>
            </View>
            <Feather name="x" size={16} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* ── SEARCHING ────────────────────────────────────────────────────── */}
        {(state === 'searching' || state === 'booking') && (
          <View style={styles.searchingCard}>
            <Animated.View style={[styles.pulseOuter, { transform: [{ scale: pulse }] }]} />
            <View style={styles.pulseInner}>
              <MaterialCommunityIcons name="car-search" size={52} color="#6366F1" />
            </View>

            <Text style={styles.searchTitle}>
              {state === 'booking' ? 'Confirming your booking...' : 'Searching for drivers near you'}
            </Text>
            <Text style={styles.searchSub}>
              {state === 'booking'
                ? 'Please wait a moment'
                : "We'll notify you the moment a driver matches your route"}
            </Text>

            {state === 'searching' && (
              <>
                <View style={styles.timerRow}>
                  <Feather name="clock" size={14} color="#9CA3AF" />
                  <Text style={styles.timerText}> {timeLeft}s remaining</Text>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${(timeLeft / 120) * 100}%` }]} />
                </View>
              </>
            )}

            {state === 'booking' && <ActivityIndicator color="#6366F1" size="large" style={{ marginTop: 24 }} />}
          </View>
        )}

        {/* ── MATCH FOUND ──────────────────────────────────────────────────── */}
        {state === 'match_found' && matchData && (
          <View style={styles.matchCard}>
            <LinearGradient colors={['rgba(99,102,241,0.2)', 'rgba(139,92,246,0.1)']} style={StyleSheet.absoluteFill} />

            <View style={styles.matchIconRow}>
              <View style={styles.matchIconCircle}>
                <MaterialCommunityIcons name="car-connected" size={36} color="#6366F1" />
              </View>
              <Text style={styles.matchLabel}>Match Found!</Text>
            </View>

            <View style={styles.matchRow}>
              <View style={styles.matchDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.matchFieldLabel}>Driver</Text>
                <Text style={styles.matchFieldValue}>{matchData.driver_name}</Text>
              </View>
            </View>
            <View style={styles.matchDivider} />
            <View style={styles.matchRow}>
              <View style={[styles.matchDot, { backgroundColor: '#3B82F6' }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.matchFieldLabel}>Route</Text>
                <Text style={styles.matchFieldValue} numberOfLines={2}>
                  {matchData.pickup_address} → {matchData.destination_address}
                </Text>
              </View>
            </View>
            <View style={styles.matchDivider} />
            <View style={styles.matchInfoRow}>
              <View style={styles.matchInfoItem}>
                <Text style={styles.matchInfoLabel}>Seats</Text>
                <Text style={styles.matchInfoValue}>{matchData.available_seats} avail.</Text>
              </View>
              <View style={styles.matchInfoItem}>
                <Text style={styles.matchInfoLabel}>Departure</Text>
                <Text style={styles.matchInfoValue}>
                  {new Date(matchData.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={styles.matchInfoItem}>
                <Text style={styles.matchInfoLabel}>Pickup dist.</Text>
                <Text style={styles.matchInfoValue}>
                  {(matchData.pickup_distance_meters / 1000).toFixed(1)} km
                </Text>
              </View>
              {matchData.women_only && (
                <View style={styles.matchInfoItem}>
                  <Text style={[styles.matchInfoValue, { color: '#F472B6' }]}>👩 Women Only</Text>
                </View>
              )}
            </View>

            <TouchableOpacity style={styles.bookNowBtn} onPress={handleBookMatch} disabled={booking}>
              <LinearGradient colors={['#6366F1', '#8B5CF6']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.bookNowGrad}>
                {booking
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.bookNowText}>Book This Ride</Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipBtn} onPress={() => { setState('searching'); setMatchData(null); }}>
              <Text style={styles.skipText}>Keep Searching</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── ACCEPTED ─────────────────────────────────────────────────────── */}
        {state === 'accepted' && confirmedDriver && (
          <View style={styles.acceptedCard}>
            <LinearGradient colors={['rgba(16,185,129,0.2)', 'rgba(5,150,105,0.1)']} style={StyleSheet.absoluteFill} />

            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={40} color="#10B981" />
            </View>
            <Text style={styles.acceptedTitle}>Your ride is confirmed!</Text>
            <Text style={styles.acceptedSub}>
              {confirmedDriver.driver?.full_name || 'Your driver'} has accepted your request.
            </Text>

            <View style={styles.driverCard}>
              <View style={styles.driverIconCircle}>
                <Ionicons name="person" size={28} color="#6366F1" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.driverName}>{confirmedDriver.driver?.full_name || '—'}</Text>
                <Text style={styles.driverSub}>
                  {confirmedDriver.driver?.vehicle || ''} • {confirmedDriver.driver?.registration_number || ''}
                </Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color="#FBBF24" />
                  <Text style={styles.ratingText}> {confirmedDriver.driver?.rating?.toFixed(1) || '4.5'}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.trackBtn} onPress={handleTrackLive}>
              <LinearGradient colors={['#10B981', '#059669']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.trackGrad}>
                <Feather name="navigation" size={18} color="#fff" />
                <Text style={styles.trackText}>Track Live</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* ── FAILED ───────────────────────────────────────────────────────── */}
        {state === 'failed' && (
          <View style={styles.failedCard}>
            <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
            <Text style={styles.failedTitle}>No drivers found</Text>
            <Text style={styles.failedSub}>
              Your pre-booking is saved. We'll notify you when a matching driver publishes a route.
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => { setTimeLeft(120); setState('searching'); }}>
              <Text style={styles.retryText}>Search Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.preLinkBtn} onPress={() => router.push('/pre-booking' as any)}>
              <Text style={styles.preLinkText}>Submit a Pre-Booking →</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Cancel Button */}
      {(state === 'searching' || state === 'match_found') && (
        <View style={styles.cancelWrap}>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={cancelling}>
            {cancelling
              ? <ActivityIndicator color="#EF4444" />
              : <Text style={styles.cancelText}>Cancel Request</Text>
            }
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:            { flex: 1, backgroundColor: '#0A0F1E' },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn:         { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerTitle:     { color: '#fff', fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },

  rejectionToast:  { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(252,211,77,0.15)', borderColor: '#FCD34D', borderWidth: 1, borderRadius: 10, marginHorizontal: 20, padding: 12, marginBottom: 8, gap: 8 },
  rejectionText:   { color: '#FCD34D', fontSize: 13, flex: 1 },

  arrivalBanner:   { marginHorizontal: 16, borderRadius: 16, marginBottom: 12, overflow: 'hidden' },
  arrivalGrad:     { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  arrivalEmoji:    { fontSize: 22 },
  arrivalTitle:    { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  arrivalSub:      { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 },

  body:            { padding: 20, paddingBottom: 120 },

  // Searching
  searchingCard:   { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 28, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  pulseOuter:      { width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(99,102,241,0.15)', position: 'absolute', top: 32 - 20, alignSelf: 'center' },
  pulseInner:      { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(99,102,241,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 28, marginTop: 8 },
  searchTitle:     { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  searchSub:       { color: '#9CA3AF', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  timerRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  timerText:       { color: '#9CA3AF', fontSize: 13 },
  progressBar:     { width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2 },
  progressFill:    { height: 4, backgroundColor: '#6366F1', borderRadius: 2 },

  // Match Found
  matchCard:       { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 28, padding: 24, borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)', overflow: 'hidden' },
  matchIconRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  matchIconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(99,102,241,0.2)', alignItems: 'center', justifyContent: 'center' },
  matchLabel:      { color: '#fff', fontSize: 22, fontWeight: '800' },
  matchRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8 },
  matchDot:        { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22C55E', marginTop: 6 },
  matchFieldLabel: { color: '#9CA3AF', fontSize: 12, marginBottom: 2 },
  matchFieldValue: { color: '#fff', fontSize: 15, fontWeight: '600' },
  matchDivider:    { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginVertical: 4 },
  matchInfoRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginVertical: 12 },
  matchInfoItem:   { alignItems: 'center', minWidth: 80 },
  matchInfoLabel:  { color: '#9CA3AF', fontSize: 11, marginBottom: 2 },
  matchInfoValue:  { color: '#fff', fontSize: 14, fontWeight: '700' },
  bookNowBtn:      { borderRadius: 16, overflow: 'hidden', marginTop: 8 },
  bookNowGrad:     { paddingVertical: 16, alignItems: 'center' },
  bookNowText:     { color: '#fff', fontSize: 17, fontWeight: '700' },
  skipBtn:         { alignItems: 'center', marginTop: 12 },
  skipText:        { color: '#9CA3AF', fontSize: 14 },

  // Accepted
  acceptedCard:    { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 28, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', overflow: 'hidden' },
  checkCircle:     { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(16,185,129,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  acceptedTitle:   { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  acceptedSub:     { color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  driverCard:      { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 16, width: '100%', marginBottom: 20, gap: 14 },
  driverIconCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(99,102,241,0.2)', alignItems: 'center', justifyContent: 'center' },
  driverName:      { color: '#fff', fontSize: 16, fontWeight: '700' },
  driverSub:       { color: '#9CA3AF', fontSize: 13, marginTop: 2 },
  ratingRow:       { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  ratingText:      { color: '#FBBF24', fontSize: 13, fontWeight: '600' },
  trackBtn:        { width: '100%', borderRadius: 16, overflow: 'hidden' },
  trackGrad:       { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  trackText:       { color: '#fff', fontSize: 17, fontWeight: '700' },

  // Failed
  failedCard:      { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 28, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  failedTitle:     { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  failedSub:       { color: '#9CA3AF', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  retryBtn:        { backgroundColor: '#6366F1', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, marginBottom: 12 },
  retryText:       { color: '#fff', fontSize: 16, fontWeight: '700' },
  preLinkBtn:      { paddingVertical: 8 },
  preLinkText:     { color: '#6366F1', fontSize: 14, fontWeight: '600' },

  cancelWrap:      { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 36, backgroundColor: 'transparent' },
  cancelBtn:       { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: '#EF4444', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  cancelText:      { color: '#EF4444', fontSize: 16, fontWeight: '600' },
});
