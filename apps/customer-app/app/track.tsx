import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useCustomerSocket } from '../src/hooks/useCustomerSocket';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:80/api/v1';

export default function TrackTripScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<any>(null);
  
  const { connected, joinTrip } = useCustomerSocket();

  useEffect(() => {
    if (connected && bookingId) {
      joinTrip(bookingId);
    }
    fetchBooking();
  }, [connected, bookingId]);

  const fetchBooking = async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API}/bookings/${bookingId || 'demo-1'}`, { headers });
      setBooking(res.data.data);
    } catch {
      // Demo data fallback
      setBooking({
        driver: { full_name: 'Alex Chen', rating: 4.9, vehicle: 'Tesla Model 3, CA', registration: '8GHD52' },
        eta_minutes: 14
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Map Background */}
      <View style={StyleSheet.absoluteFill}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: booking?.pickup_lat || 19.0760,
            longitude: booking?.pickup_lon || 72.8777,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {booking?.pickup_lat && (
             <Marker coordinate={{ latitude: booking.pickup_lat, longitude: booking.pickup_lon }} />
          )}
        </MapView>
      </View>

      {/* Header */}
      <View style={styles.header}>
         <View style={{ flex: 1 }}>
            <TouchableOpacity style={{ marginBottom: 16 }} onPress={() => router.back()}>
              <Feather name="chevron-left" size={32} color="black" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Live Trip Tracking{'\n'}& Safety</Text>
         </View>
         
         <View style={{ alignItems: 'center' }}>
            <TouchableOpacity style={styles.sosBtn}>
               <View style={styles.sosRing1} />
               <View style={styles.sosRing2} />
               <MaterialCommunityIcons name="shield-check" size={32} color="white" />
            </TouchableOpacity>
            <Text style={styles.sosText}>Emergency{'\n'}SOS</Text>
         </View>
      </View>

      <View style={{ flex: 1 }} />

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
         
         {/* Driver Info */}
         <View style={styles.driverRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
               <View style={styles.driverAvatar}>
                  <Ionicons name="person" size={40} color="gray" style={{marginTop:8}}/>
               </View>
               <View>
                  <Text style={styles.driverName}>{booking?.driver?.full_name || 'Alex Chen'}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                     <Ionicons name="star" size={16} color="#0F172A" style={{ marginRight: 4 }} />
                     <Text style={{ color: '#000', fontSize: 16 }}>{booking?.driver?.rating || 4.9} Rating</Text>
                  </View>
               </View>
            </View>
            <View style={styles.driverDetails}>
               <Text style={styles.detailText}>Silver</Text>
               <Text style={styles.detailText}>{booking?.driver?.vehicle || 'Tesla Model 3, CA'}</Text>
               <Text style={styles.detailText}>{booking?.driver?.registration || '8GHD52'}</Text>
            </View>
         </View>

         {/* ETA Card */}
         <View style={styles.etaCard}>
            <Text style={styles.etaTitle}>ETA: {booking?.eta_minutes || 14} min</Text>
            <Text style={styles.etaSub}>Arriving at 5:45 PM</Text>
         </View>

         {/* Action Buttons */}
         <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn}>
               <MaterialCommunityIcons name="share" size={24} color="#64748B" style={{ marginBottom: 8 }} />
               <Text style={styles.actionText}>Share Live Trip</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionBtn}>
               <Ionicons name="chatbubble" size={24} color="#64748B" style={{ marginBottom: 8 }} />
               <Text style={styles.actionText}>Chat with Driver</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionBtn}>
               <Ionicons name="call" size={24} color="#64748B" style={{ marginBottom: 8 }} />
               <Text style={styles.actionText}>Call</Text>
            </TouchableOpacity>
         </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9FF' },
  mapBg: { ...(StyleSheet.absoluteFill as any), backgroundColor: '#E0F2FE' },
  mapLine: { position: 'absolute' },
  
  routeLine1: { position: 'absolute', top: '25%', left: 40, width: 256, height: 256, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#3B82F6', borderBottomLeftRadius: 100, transform: [{ rotate: '45deg' }] },
  marker1: { position: 'absolute', top: '20%', left: 40, width: 16, height: 16, backgroundColor: '#3B82F6', borderRadius: 8, borderWidth: 2, borderColor: 'white' },
  
  routeLine2: { position: 'absolute', top: '50%', right: '25%', width: 160, height: 160, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#3B82F6', borderTopRightRadius: 50, transform: [{ rotate: '12deg' }] },
  marker2: { position: 'absolute', bottom: '25%', right: 40, width: 24, height: 24, backgroundColor: 'gray', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  
  carMarker: { position: 'absolute', top: '42%', left: '45%', width: 48, height: 80, backgroundColor: 'white', borderRadius: 24, borderWidth: 1, borderColor: '#D1D5DB', transform: [{ rotate: '-30deg' }], alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  carWindowTop: { width: 32, height: 16, backgroundColor: '#1F2937', borderTopLeftRadius: 4, borderTopRightRadius: 4, position: 'absolute', top: 8 },
  carWindowBottom: { width: 32, height: 16, backgroundColor: '#1F2937', borderBottomLeftRadius: 4, borderBottomRightRadius: 4, position: 'absolute', bottom: 8 },
  
  tooltipWrap: { position: 'absolute', top: '50%', right: '30%', alignItems: 'center', zIndex: 20 },
  iconCircleBlue: { width: 32, height: 32, backgroundColor: '#3B82F6', borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white', marginRight: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  iconCircleOrange: { width: 32, height: 32, backgroundColor: '#F97316', borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  tooltipBox: { backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, borderWidth: 1, borderColor: '#F3F4F6' },
  tooltipText: { color: 'black', fontWeight: 'bold', fontSize: 12, textAlign: 'center', lineHeight: 16 },
  
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 20 },
  headerTitle: { color: 'black', fontSize: 36, fontWeight: '900', lineHeight: 40, textShadowColor: 'white', textShadowRadius: 10 },
  
  sosBtn: { width: 80, height: 80, backgroundColor: '#EF4444', borderRadius: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'white', shadowColor: '#EF4444', shadowOpacity: 0.5, shadowRadius: 20, elevation: 10, marginBottom: 8, position: 'relative' },
  sosRing1: { position: 'absolute', top: -10, left: -10, right: -10, bottom: -10, borderRadius: 50, borderWidth: 2, borderColor: 'rgba(239, 68, 68, 0.3)' },
  sosRing2: { position: 'absolute', top: -20, left: -20, right: -20, bottom: -20, borderRadius: 60, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.1)' },
  sosText: { color: 'black', fontWeight: 'bold', textAlign: 'center' },
  
  bottomSheet: { backgroundColor: 'rgba(255,255,255,0.95)', marginHorizontal: 16, marginBottom: 32, borderRadius: 24, padding: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, borderWidth: 1, borderColor: 'white', zIndex: 20 },
  
  driverRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  driverAvatar: { width: 64, height: 64, backgroundColor: '#D1D5DB', borderRadius: 32, marginRight: 16, borderWidth: 2, borderColor: 'white', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  driverName: { color: 'black', fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  driverDetails: { borderLeftWidth: 1, borderLeftColor: '#D1D5DB', paddingLeft: 16, paddingVertical: 4 },
  detailText: { color: 'black', fontSize: 14, lineHeight: 20 },
  
  etaCard: { backgroundColor: 'white', borderRadius: 16, paddingVertical: 24, alignItems: 'center', shadowColor: '#3B82F6', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, marginBottom: 24, borderWidth: 1, borderColor: '#EFF6FF' },
  etaTitle: { color: 'black', fontSize: 36, fontWeight: '900', marginBottom: 4 },
  etaSub: { color: '#4B5563', fontSize: 18 },
  
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: { flex: 1, backgroundColor: 'white', paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#3B82F6', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, borderWidth: 1, borderColor: '#F3F4F6', marginHorizontal: 4 },
  actionText: { color: 'black', fontSize: 12, fontWeight: '600' },
});
