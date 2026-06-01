/**
 * Active Trip Screen
 * ─────────────────────────────────────────────────────────────
 * Shows the full driver map with:
 *  - DriverMap (Google Maps, provider="google")
 *  - Live GPS tracking + WebSocket LOCATION_UPDATE
 *  - Route polyline from current location to destination
 *  - SpeedAlert overlay
 *  - SOSButton for emergencies
 *  - EarningsPanel showing distance/ETA/fuel/toll/net earnings
 *  - Passenger info bottom sheet
 *  - Start Trip / Complete Trip action buttons
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StatusBar, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import { DriverMap }        from '../src/components/map/DriverMap';
import { SpeedAlert }       from '../src/components/map/SpeedAlert';
import { SOSButton }        from '../src/components/map/SOSButton';
import { EarningsPanel }    from '../src/components/map/EarningsPanel';
import { useLiveLocation }  from '../src/hooks/useLiveLocation';
import { useGoogleDirections } from '../src/hooks/useGoogleDirections';
import { useDriverSocket }  from '../src/hooks/useDriverSocket';
import { formatETA }        from '../src/services/googleMaps';
import type { MapStop }     from '../src/components/map/StopMarkers';

const API = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:80/api/v1';

export default function ActiveTripScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<any>(null);
  const [tripState, setTripState] = useState<'EN_ROUTE' | 'STARTED' | 'COMPLETED'>('EN_ROUTE');

  // WebSocket + GPS
  const {
    connected,
    sendLocationUpdate,
    emitTripStarted,
    emitTripCompleted,
    emitSOS,
  } = useDriverSocket();

  // Live location (auto-starts)
  const { location } = useLiveLocation(true, (loc) => {
    // Emit location update every GPS tick
    sendLocationUpdate({
      lat: loc.lat, lng: loc.lng,
      speed: loc.speed, heading: loc.heading,
      accuracy: loc.accuracy,
      trip_id: bookingId || '',
    });
  });

  // Google Directions from current position to destination
  const origin      = location ? { lat: location.lat, lng: location.lng } : null;
  const destination = booking?.trip?.to || 'Pune';

  const { route, tollSummary, fuelEstimate } = useGoogleDirections(
    origin, destination, [], 'sedan'
  );

  const etaText = route ? formatETA(route.etaTimestamp) : '--';

  // Build stop markers
  const stops: MapStop[] = booking ? [
    {
      id: 'pickup',
      label: booking.trip?.from || 'Pickup',
      lat: booking.trip?.pickup_lat || 19.076,
      lng: booking.trip?.pickup_lon || 72.877,
      type: 'pickup',
      completed: tripState !== 'EN_ROUTE',
    },
    {
      id: 'dropoff',
      label: booking.trip?.to || 'Drop-off',
      lat: booking.trip?.dropoff_lat || 18.52,
      lng: booking.trip?.dropoff_lon || 73.85,
      type: 'dropoff',
    },
  ] : [];

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  const fetchBooking = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API}/bookings/${bookingId || 'demo-1'}`, { headers });
      setBooking(res.data.data);
    } catch {
      setBooking({
        id: bookingId || 'demo-1',
        customer: { full_name: 'Sarah Johnson', phone: '+91 9876543210', rating: 4.8 },
        trip: { from: 'Mumbai', to: 'Pune', has_parcel: true, fare: 2400 },
      });
    }
  };

  const handleAction = useCallback(() => {
    if (tripState === 'EN_ROUTE') {
      setTripState('STARTED');
      emitTripStarted(bookingId || '');
    } else if (tripState === 'STARTED') {
      setTripState('COMPLETED');
      emitTripCompleted(bookingId || '');
      setTimeout(() => router.replace('/(tabs)/'), 1500);
    }
  }, [tripState, bookingId]);

  const handleSOS = useCallback((payload: any) => {
    emitSOS({ trip_id: bookingId || '', lat: location?.lat ?? 0, lng: location?.lng ?? 0 });
  }, [location, bookingId]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ─── Full-Screen Google Map ─────────────────────────── */}
      <DriverMap
        style={StyleSheet.absoluteFill}
        driverLat={location?.lat}
        driverLng={location?.lng}
        driverHeading={location?.heading}
        driverSpeed={location?.speed}
        polyline={route?.polyline ?? []}
        stops={stops}
        nightMode={false}
        trafficEnabled
        followDriver
      />

      {/* ─── Speed Alert ─────────────────────────────────────── */}
      {location && location.speed > 0 && (
        <View style={styles.speedAlertPos}>
          <SpeedAlert currentSpeed={location.speed} speedLimit={80} useVoice />
        </View>
      )}

      {/* ─── SOS Button ──────────────────────────────────────── */}
      <View style={styles.sosPos}>
        <SOSButton
          driverLat={location?.lat}
          driverLng={location?.lng}
          tripId={bookingId || ''}
          onSOS={handleSOS}
        />
      </View>

      {/* ─── Header ──────────────────────────────────────────── */}
      <SafeAreaView style={styles.headerWrapper} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="chevron-left" size={22} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {tripState === 'EN_ROUTE'
              ? 'En Route to Pickup'
              : tripState === 'STARTED'
              ? 'On Trip'
              : 'Trip Completed'}
          </Text>
          {/* Connection status dot */}
          <View style={[styles.connDot, { backgroundColor: connected ? '#10B981' : '#EF4444' }]} />
        </View>
      </SafeAreaView>

      {/* ─── Bottom Sheet ─────────────────────────────────────── */}
      <View style={styles.bottomWrapper}>
        {/* Earnings HUD */}
        <EarningsPanel
          distanceKm={route?.distanceKm ?? 0}
          etaText={etaText}
          fuelCost={fuelEstimate?.fuelCost ?? 0}
          tollCost={tollSummary?.estimatedTotal ?? 0}
          grossFare={booking?.trip?.fare ?? 0}
          nightMode
          onDetailsPress={() => router.push('/fuel-toll-calculator')}
        />

        {/* Passenger info sheet */}
        <View style={styles.bottomSheet}>
          <View style={styles.sheetTopBar} />

          {/* ETA */}
          <View style={styles.etaContainer}>
            <Text style={styles.etaText}>{etaText}</Text>
            <Text style={styles.etaSub}>
              {route ? `${route.distanceKm} km remaining` : 'Calculating route...'}
            </Text>
          </View>

          {/* Passenger Info */}
          <View style={styles.passengerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.passengerAvatar}>
                <Ionicons name="person" size={28} color="#D1D5DB" />
              </View>
              <View>
                <Text style={styles.passengerName}>
                  {booking?.customer?.full_name || 'Sarah Johnson'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  <Ionicons name="star" size={12} color="#FBBF24" style={{ marginRight: 4 }} />
                  <Text style={{ color: '#9CA3AF', fontSize: 13 }}>
                    {booking?.customer?.rating || 4.8} Rating
                  </Text>
                </View>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              {booking?.trip?.has_parcel && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>📦 Parcel</Text>
                </View>
              )}
              {/* Navigate button */}
              <TouchableOpacity
                style={styles.navBtn}
                onPress={() => router.push({
                  pathname: '/navigation',
                  params: {
                    from: booking?.trip?.from || 'Mumbai',
                    to: booking?.trip?.to || 'Pune',
                    trip_id: bookingId || '',
                    fare: String(booking?.trip?.fare || 0),
                  },
                })}
              >
                <Feather name="navigation" size={12} color="#38BDF8" />
                <Text style={styles.navBtnText}>Navigate</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Route */}
          <View style={styles.tripInfoRow}>
            <View style={styles.tripPoint}>
              <View style={[styles.dot, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.tripPointText}>
                {booking?.trip?.from || 'Pickup Location'}
              </Text>
            </View>
            <View style={styles.tripPoint}>
              <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.tripPointText}>
                {booking?.trip?.to || 'Dropoff Location'}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          {tripState !== 'COMPLETED' && (
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.iconBtn}>
                <Ionicons name="call" size={22} color="white" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn}>
                <Ionicons name="chatbubble" size={22} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryActionBtn,
                  { backgroundColor: tripState === 'EN_ROUTE' ? '#10B981' : '#EF4444' },
                ]}
                onPress={handleAction}
              >
                <Text style={styles.primaryActionText}>
                  {tripState === 'EN_ROUTE' ? 'Start Trip' : 'Complete Trip'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {tripState === 'COMPLETED' && (
            <View style={styles.completedBox}>
              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              <Text style={styles.completedText}>Trip Completed Successfully!</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F172A' },

  speedAlertPos: {
    position: 'absolute', top: 110, alignSelf: 'center', zIndex: 50,
  },
  sosPos: {
    position: 'absolute', right: 16, bottom: 380, zIndex: 50,
  },

  headerWrapper: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 40,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: 'rgba(15,23,42,0.88)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    width: 38, height: 38, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 19, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, color: 'white', fontSize: 17, fontWeight: '800' },
  connDot:     { width: 10, height: 10, borderRadius: 5 },

  bottomWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40 },

  bottomSheet: {
    backgroundColor: '#1E293B', marginHorizontal: 12, marginBottom: 20,
    borderRadius: 24, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, elevation: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  sheetTopBar: {
    width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2, alignSelf: 'center', marginBottom: 14,
  },
  etaContainer: { alignItems: 'center', marginBottom: 16 },
  etaText: { color: '#3B82F6', fontSize: 30, fontWeight: '900' },
  etaSub:  { color: '#64748B', fontSize: 12, marginTop: 2 },

  passengerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 14,
  },
  passengerAvatar: {
    width: 44, height: 44, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 22, marginRight: 10, alignItems: 'center', justifyContent: 'center',
  },
  passengerName: { color: 'white', fontSize: 16, fontWeight: '700' },
  badge: {
    backgroundColor: 'rgba(139,92,246,0.2)', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(139,92,246,0.5)',
  },
  badgeText: { color: '#A78BFA', fontSize: 11, fontWeight: '700' },
  navBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(56,189,248,0.12)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(56,189,248,0.3)',
  },
  navBtnText: { color: '#38BDF8', fontSize: 11, fontWeight: '700' },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 14 },

  tripInfoRow:    { marginBottom: 18 },
  tripPoint:      { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dot:            { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  tripPointText:  { color: '#D1D5DB', fontSize: 14, flex: 1 },

  actionsRow:      { flexDirection: 'row', alignItems: 'center' },
  iconBtn: {
    width: 50, height: 50, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 25, alignItems: 'center', justifyContent: 'center',
    marginRight: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  primaryActionBtn: {
    flex: 1, height: 50, borderRadius: 25,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5, elevation: 5,
  },
  primaryActionText: { color: 'white', fontSize: 16, fontWeight: '800' },

  completedBox:   { alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  completedText:  { color: '#10B981', fontSize: 18, fontWeight: '700', marginTop: 10 },
});


