import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import MapView, { PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { api } from '../src/api/client';

interface Props {
  request: any
  onDismiss: () => void
}

export default function IncomingRequestScreen({ request, onDismiss }: Props) {
  const timeoutLimit = request?.timeout_sec || 40;
  const [timeLeft, setTimeLeft]     = useState(timeoutLimit);
  const [responding, setResponding] = useState(false);
  const [mapError, setMapError]     = useState(false);

  const mountedRef  = React.useRef(true);
  const soundRef    = useRef<any>(null);  // expo-av Audio.Sound instance

  useEffect(() => { return () => { mountedRef.current = false } }, []);

  // ── Sound alert: load + play loop while card is shown ────────────────
  useEffect(() => {
    let sound: any = null;
    const startSound = async () => {
      try {
        const { Audio } = await import('expo-av');
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound: s } = await Audio.Sound.createAsync(
          { uri: 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg' },
          { shouldPlay: true, isLooping: true, volume: 1.0 }
        );
        sound = s;
        soundRef.current = s;
      } catch {
        // expo-av not available (Expo Go / bare) — use vibration fallback
        Vibration.vibrate([0, 400, 200, 400], true);
      }
    };
    startSound();
    return () => {
      sound?.stopAsync().catch(() => {});
      sound?.unloadAsync().catch(() => {});
      soundRef.current = null;
      Vibration.cancel();
    };
  }, []);

  const stopAlerts = useCallback(() => {
    soundRef.current?.stopAsync().catch(() => {});
    soundRef.current?.unloadAsync().catch(() => {});
    soundRef.current = null;
    Vibration.cancel();
  }, []);

  // ── 40-second countdown ──────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      if (!mountedRef.current) return;
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timer);
          stopAlerts();
          onDismiss();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [stopAlerts]); // stopAlerts is stable (useCallback)

  // ── API helpers ──────────────────────────────────────────────────────
  const respondToRequest = useCallback(async (accepted: boolean) => {
    if (responding) return;
    setResponding(true);
    try {
      await api.post('/matching/respond', {
        booking_id:         request?.booking_id,
        accepted,
        pending_booking_id: request?.pending_booking_id ?? null,
      });
    } catch (e: any) {
      console.warn('[IncomingRequest] Respond error:', e?.response?.data || e.message);
    } finally {
      if (mountedRef.current) setResponding(false);
    }
  }, [request?.booking_id, responding]);

  const handleAccept = async () => {
    stopAlerts();
    await respondToRequest(true);
    onDismiss();
    router.push(`/active-trip?bookingId=${request?.booking_id || ''}`);
  };

  const handleReject = async () => {
    stopAlerts();
    await respondToRequest(false);
    onDismiss();
  };

  // Color shifts red as time runs out
  const progress   = timeLeft / timeoutLimit;
  const timerColor = progress > 0.5 ? '#22C55E' : progress > 0.25 ? '#F59E0B' : '#EF4444';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden />

      {/* Map Background — with crash-safe fallback */}
      <View style={StyleSheet.absoluteFill}>
        {mapError ? (
          // Fallback gradient when map fails to load (bad API key / no Play Services)
          <LinearGradient
            colors={['#0F172A', '#1E293B', '#0F172A']}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <MapView
            // Use Google provider only on Android; default on iOS to avoid SDK crash
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
            style={StyleSheet.absoluteFill}
            initialRegion={{
              latitude:      request?.pickup_lat || request?.trip?.pickup_lat || 19.0760,
              longitude:     request?.pickup_lng || request?.trip?.pickup_lon || 72.8777,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }}
          />
        )}
      </View>

      {/* Alert Card */}
      <View style={styles.alertOverlay}>
        <View style={styles.glassCard}>
          <LinearGradient
            colors={['rgba(239, 68, 68, 0.4)', 'transparent']}
            start={{x:0,y:0}} end={{x:0.5,y:0}}
            style={StyleSheet.absoluteFillObject}
          />
          <LinearGradient
            colors={['transparent', 'rgba(59, 130, 246, 0.4)']}
            start={{x:0.5,y:0}} end={{x:1,y:0}}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.handle} />

          {/* Title */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>Incoming Ride Request</Text>
            <Text style={{ fontSize: 22 }}>🚨</Text>
          </View>
          {(request?.paid) && (
            <View style={styles.paidBadge}>
              <Text style={styles.paidBadgeText}>✅ PAID — Customer confirmed</Text>
            </View>
          )}

          {/* Trip Details */}
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>
              {request?.pickup_address || request?.trip?.from || 'Pickup'}{'\n'}
              → {request?.destination_address || request?.trip?.to || 'Destination'}
            </Text>
            <Text style={styles.detailsText}>Estimated Payout: ₹{request?.fare || request?.trip?.fare || '—'}</Text>
            <Text style={styles.detailsText}>Seats: {request?.seats || request?.trip?.seats || 1}</Text>
            {(request?.parcel || request?.trip?.has_parcel) && (
              <Text style={styles.detailsText}>📦 Package included</Text>
            )}
            {(request?.women_only) && (
              <Text style={[styles.detailsText, { color: '#F472B6' }]}>👩 Women-only trip</Text>
            )}
          </View>

          {/* Countdown Ring */}
          <View style={styles.timerWrapper}>
            <View style={[styles.timerOuterRing, { borderColor: 'rgba(75,85,99,0.5)' }]}>
              <View style={[styles.timerProgress, { borderColor: timerColor }]} />
            </View>
            <View style={styles.timerInner}>
              <Text style={[styles.timerText, { color: timerColor }]}>{timeLeft}</Text>
            </View>
          </View>
          <Text style={styles.timerLabel}>seconds to respond</Text>

          {/* Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={handleReject}
              disabled={responding}
            >
              {responding
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.rejectText}>Reject</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={handleAccept}
              disabled={responding}
            >
              {responding
                ? <ActivityIndicator color="#064E3B" size="small" />
                : <Text style={styles.acceptText}>Accept ✓</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { ...StyleSheet.absoluteFillObject, backgroundColor: '#111827', zIndex: 999 },
  alertOverlay: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 32, zIndex: 10 },
  glassCard:    { width: '100%', backgroundColor: 'rgba(30,41,59,0.9)', borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', padding: 24, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, elevation: 15, position: 'relative', overflow: 'hidden' },
  handle:       { width: 48, height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  titleRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title:        { color: '#fff', fontSize: 20, fontWeight: 'bold', flex: 1 },
  detailsCard:  { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  detailsTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 8, lineHeight: 22 },
  detailsText:  { color: '#D1D5DB', fontSize: 14, marginBottom: 4 },
  timerWrapper: { alignItems: 'center', justifyContent: 'center', height: 112, marginBottom: 4 },
  timerOuterRing: { width: 112, height: 112, borderRadius: 56, borderWidth: 4, alignItems: 'center', justifyContent: 'center', position: 'absolute' },
  timerProgress:  { width: '100%', height: '100%', borderRadius: 56, borderWidth: 4, borderLeftColor: 'transparent', borderTopColor: 'transparent', position: 'absolute', transform: [{ rotate: '45deg' }] },
  timerInner:   { width: 96, height: 96, backgroundColor: 'rgba(17,24,39,0.85)', borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  timerText:    { fontSize: 38, fontWeight: 'bold' },
  timerLabel:   { color: '#9CA3AF', textAlign: 'center', fontSize: 12, marginBottom: 20 },
  actionsRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  rejectBtn:    { flex: 1, paddingVertical: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
  rejectText:   { color: '#fff', fontSize: 17, fontWeight: '500' },
  acceptBtn:    { flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#4ADE80', shadowColor: '#22C55E', shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 },
  acceptText:   { color: '#064E3B', fontSize: 17, fontWeight: 'bold' },
  paidBadge:    { backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(34,197,94,0.4)', alignSelf: 'flex-start', marginBottom: 12 },
  paidBadgeText:{ color: '#4ADE80', fontSize: 13, fontWeight: '700' },
});
