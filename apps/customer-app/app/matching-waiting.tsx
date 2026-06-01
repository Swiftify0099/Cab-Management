import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCustomerSocket, DriverInfo } from '../src/hooks/useCustomerSocket';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:80/api/v1';

export default function MatchingWaitingScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { connected, joinTrip, on, off, socket } = useCustomerSocket();
  const [driver, setDriver] = useState<DriverInfo | null>(null);
  const [matchFailed, setMatchFailed] = useState(false);
  const [timeoutSec, setTimeoutSec] = useState(120);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (timeoutSec <= 0 && !driver) {
      setMatchFailed(true);
      return;
    }
    if (matchFailed || driver) return;
    
    const timer = setInterval(() => {
      setTimeoutSec(s => s - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeoutSec, driver, matchFailed]);

  useEffect(() => {
    if (connected && bookingId && socket) {
      joinTrip(bookingId);
      
      const handleAccepted = (data: any) => {
        if (data.booking_id === bookingId) {
          setDriver(data.driver);
        }
      };
      
      const handleFailed = (data: any) => {
        if (data.booking_id === bookingId) {
          setMatchFailed(true);
        }
      };

      socket.on('DRIVER_ACCEPTED', handleAccepted);
      socket.on('MATCHING_FAILED', handleFailed);
      
      return () => {
        socket.off('DRIVER_ACCEPTED', handleAccepted);
        socket.off('MATCHING_FAILED', handleFailed);
      };
    }
  }, [connected, bookingId, socket]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post(`${API}/bookings/${bookingId}/cancel`, { reason: 'Cancelled while waiting' }, { headers });
      router.replace('/(tabs)/trips');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to cancel');
      setCancelling(false);
    }
  };

  const handleTrackLive = () => {
    router.replace(`/track?bookingId=${bookingId}`);
  };

  if (matchFailed) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.centerContent}>
          <Text style={{ fontSize: 60, marginBottom: 16 }}>😔</Text>
          <Text style={styles.title}>No Driver Available</Text>
          <Text style={styles.subtitle}>
            No drivers are available in your area right now. Please try again in a few minutes.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.back()}>
            <Text style={styles.primaryBtnText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.replace('/(tabs)/trips')}>
            <Text style={styles.secondaryBtnText}>View My Trips</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (driver) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.centerContent}>
          <Text style={{ fontSize: 60, marginBottom: 16 }}>🎉</Text>
          <Text style={styles.title}>Driver Found!</Text>
          <Text style={styles.subtitle}>Your cab is on the way</Text>

          <View style={[styles.glassCard, { width: '90%', marginTop: 24, padding: 20 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{driver.full_name.charAt(0)}</Text>
              </View>
              <View>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>{driver.full_name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Ionicons name="star" size={14} color="#FBBF24" />
                  <Text style={{ color: '#FBBF24', marginLeft: 4 }}>{driver.rating.toFixed(1)}</Text>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Vehicle</Text>
                <Text style={styles.infoValue}>{driver.vehicle}</Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Reg. Number</Text>
                <Text style={styles.infoValue}>{driver.registration_number}</Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Distance</Text>
                <Text style={styles.infoValue}>{driver.distance_km} km</Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>ETA</Text>
                <Text style={styles.infoValue}>~{Math.round(driver.distance_km * 3)} min</Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, paddingHorizontal: 20 }}>
            <TouchableOpacity style={[styles.primaryBtn, { flex: 1, backgroundColor: '#10B981' }]}>
              <Ionicons name="call" size={18} color="#fff" />
              <Text style={[styles.primaryBtnText, { marginLeft: 8 }]}>Call Driver</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={handleTrackLive}>
              <Ionicons name="location" size={18} color="#fff" />
              <Text style={[styles.primaryBtnText, { marginLeft: 8 }]}>Track Live</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Waiting Animation (Stitch code adapted)
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Map Background Layer */}
      <View style={[StyleSheet.absoluteFillObject, { opacity: 0.2, zIndex: 0 }]}>
        <View style={{ width: '100%', height: '100%', borderWidth: 1, borderColor: '#374151', transform: [{ scale: 1.5 }, { rotate: '15deg' }] }}>
           <View style={{ width: 1, height: '100%', backgroundColor: '#6B7280', position: 'absolute', left: 80 }} />
           <View style={{ width: '100%', height: 1, backgroundColor: '#6B7280', position: 'absolute', top: 128 }} />
           <View style={{ width: 1, height: '100%', backgroundColor: '#6B7280', position: 'absolute', left: 240 }} />
           <View style={{ width: '100%', height: 1, backgroundColor: '#6B7280', position: 'absolute', top: 320 }} />
           <View style={{ width: 1, height: '100%', backgroundColor: '#6B7280', position: 'absolute', left: 160, transform: [{ rotate: '45deg' }] }} />
        </View>
      </View>

      {/* Radar Animation Area */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', position: 'relative', zIndex: 10 }}>
        
        {/* Glow Rings representing radar pulses */}
        <View style={{ width: 320, height: 320, borderRadius: 160, borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)', alignItems: 'center', justifyContent: 'center', position: 'absolute' }}>
          <View style={{ width: 256, height: 256, borderRadius: 128, borderWidth: 1, borderColor: 'rgba(192,132,252,0.5)', position: 'absolute' }} />
          <View style={[{ width: 192, height: 192, borderRadius: 96, borderWidth: 1, borderColor: 'rgba(216,180,254,0.7)', position: 'absolute' }, styles.glow]} />
          
          <View style={[{ width: '100%', height: '100%', borderRadius: 160, position: 'absolute' }, styles.radarSweep]} />
        </View>

        {/* Cars (Mocked positions) */}
        <View style={{ position: 'absolute', top: '25%', left: '20%', transform: [{ rotate: '-10deg' }] }}>
           <View style={{ width: 64, height: 4, backgroundColor: 'rgba(34,211,238,0.5)', borderRadius: 2, position: 'absolute', right: -48, top: 8 }} />
           <View style={{ width: 40, height: 20, backgroundColor: '#2563EB', borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#60A5FA', shadowColor: 'rgba(34,211,238,0.5)', shadowOpacity: 1, shadowRadius: 4, elevation: 5 }}>
             <View style={{ width: 24, height: 12, backgroundColor: '#1E3A8A', borderRadius: 2 }} />
           </View>
        </View>

        <View style={{ position: 'absolute', top: '50%', right: '15%', transform: [{ rotate: '80deg' }] }}>
           <View style={{ width: 80, height: 6, backgroundColor: 'rgba(34,211,238,0.4)', borderRadius: 3, position: 'absolute', right: -64, top: 8 }} />
           <View style={{ width: 40, height: 20, backgroundColor: '#2563EB', borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#60A5FA', shadowColor: 'rgba(34,211,238,0.5)', shadowOpacity: 1, shadowRadius: 4, elevation: 5 }}>
             <View style={{ width: 24, height: 12, backgroundColor: '#1E3A8A', borderRadius: 2 }} />
           </View>
        </View>

        <View style={{ position: 'absolute', bottom: '25%', left: '33%', transform: [{ rotate: '170deg' }] }}>
           <View style={{ width: 96, height: 6, backgroundColor: 'rgba(34,211,238,0.5)', borderRadius: 3, position: 'absolute', right: -80, top: 8 }} />
           <View style={{ width: 40, height: 20, backgroundColor: '#2563EB', borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#60A5FA', shadowColor: 'rgba(34,211,238,0.5)', shadowOpacity: 1, shadowRadius: 4, elevation: 5 }}>
             <View style={{ width: 24, height: 12, backgroundColor: '#1E3A8A', borderRadius: 2 }} />
           </View>
        </View>

        {/* Main Text Content */}
        <View style={{ position: 'absolute', zIndex: 20, alignItems: 'center', paddingHorizontal: 32, width: '100%' }}>
          <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '900', textAlign: 'center', lineHeight: 34, marginBottom: 16 }}>
            Finding the best intercity partner for you...
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 24 }}>
            Safety check: All drivers on this route are background-verified.
          </Text>
          
          <Text style={{ color: '#9CA3AF', fontSize: 14, marginTop: 24 }}>
            {timeoutSec}s remaining
          </Text>
        </View>

      </View>

      {/* Bottom Floating Card */}
      <View style={{ position: 'absolute', bottom: 0, width: '100%', paddingHorizontal: 20, paddingBottom: 32, paddingTop: 16, zIndex: 20 }}>
        <View style={[styles.glassCard, { padding: 24 }]}>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 1, borderColor: '#9CA3AF', alignItems: 'center', justifyContent: 'center', marginRight: 16, backgroundColor: 'rgba(255,255,255,0.05)' }}>
               <Ionicons name="car" size={32} color="#D1D5DB" />
            </View>
            <View>
              <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginBottom: 4 }}>Premium Intercity</Text>
              <Text style={{ color: '#9CA3AF', fontSize: 14 }}>Connecting to drivers...</Text>
            </View>
          </View>

          {/* Scanning Line Animation Mock */}
          <View style={{ width: '100%', height: 4, backgroundColor: '#1E3A8A', borderRadius: 2, overflow: 'hidden', marginTop: 8 }}>
            <View style={[{ width: '33%', height: '100%', backgroundColor: '#22D3EE', borderRadius: 2, marginLeft: '33%' }, styles.scanLine]} />
          </View>
          <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'center', marginTop: 4, opacity: 0.5, alignItems: 'center' }}>
             <View style={{ width: 4, height: 4, backgroundColor: '#A5F3FC', borderRadius: 2, marginHorizontal: 4 }} />
             <View style={{ width: 6, height: 6, backgroundColor: '#A5F3FC', borderRadius: 3, marginHorizontal: 4, transform: [{ translateY: -4 }] }} />
             <View style={{ width: 4, height: 4, backgroundColor: '#A5F3FC', borderRadius: 2, marginHorizontal: 4 }} />
             <View style={{ width: 8, height: 8, backgroundColor: '#A5F3FC', borderRadius: 4, marginHorizontal: 4, transform: [{ translateY: -2 }] }} />
          </View>
          
          <TouchableOpacity 
            style={{ marginTop: 24, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.5)' }} 
            onPress={handleCancel}
            disabled={cancelling}
          >
            <Text style={{ color: '#EF4444', fontWeight: '600' }}>{cancelling ? 'Cancelling...' : 'Cancel Search'}</Text>
          </TouchableOpacity>
        </View>
      </View>
      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, zIndex: 10 },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: '#9CA3AF', fontSize: 16, textAlign: 'center', marginBottom: 32, paddingHorizontal: 20 },
  
  glow: { shadowColor: '#A855F7', shadowOpacity: 1, shadowRadius: 30, elevation: 20 },
  radarSweep: { borderLeftWidth: 2, borderLeftColor: 'rgba(168, 85, 247, 0.2)', borderTopWidth: 2, borderTopColor: 'rgba(168, 85, 247, 0.05)', transform: [{ rotate: '45deg' }] },
  scanLine: { shadowColor: '#22D3EE', shadowOpacity: 1, shadowRadius: 10, elevation: 5 },
  
  glassCard: { backgroundColor: 'rgba(30, 35, 50, 0.85)', borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, elevation: 15 },
  
  primaryBtn: { backgroundColor: '#3B82F6', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32, width: '100%', alignItems: 'center', marginBottom: 12, flexDirection: 'row', justifyContent: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  secondaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  avatarCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  avatarText: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  
  infoBox: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, width: '48%' },
  infoLabel: { color: '#9CA3AF', fontSize: 12, marginBottom: 4 },
  infoValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
});
