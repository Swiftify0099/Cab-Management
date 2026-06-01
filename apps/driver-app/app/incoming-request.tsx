import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import MapView from 'react-native-maps';

interface Props {
  request: any
  onDismiss: () => void
}

export default function IncomingRequestScreen({ request, onDismiss }: Props) {
  const timeoutLimit = request?.timeout_sec || 15;
  const [timeLeft, setTimeLeft] = useState(timeoutLimit);

  useEffect(() => {
    if (timeLeft <= 0) {
      onDismiss();
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleAccept = () => {
    onDismiss();
    router.push(`/active-trip?bookingId=${request?.booking_id || 'demo-1'}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden />

      {/* Map Background */}
      <View style={StyleSheet.absoluteFill}>
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: request?.trip?.pickup_lat || 19.0760,
            longitude: request?.trip?.pickup_lon || 72.8777,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          }}
        >
        </MapView>
      </View>

      {/* Alert Card overlay */}
      <View style={styles.alertOverlay}>
         
         {/* Glassmorphic Container with glowing borders */}
         <View style={styles.glassCard}>
            
            {/* Glowing red left, blue right edges mock */}
            <LinearGradient colors={['rgba(239, 68, 68, 0.4)', 'transparent']} start={{x:0, y:0}} end={{x:0.5, y:0}} style={StyleSheet.absoluteFillObject} />
            <LinearGradient colors={['transparent', 'rgba(59, 130, 246, 0.4)']} start={{x:0.5, y:0}} end={{x:1, y:0}} style={StyleSheet.absoluteFillObject} />

            {/* Handle */}
            <View style={styles.handle} />

            {/* Title */}
            <View style={styles.titleRow}>
               <Text style={styles.title}>Incoming Ride Request 🚨</Text>
               <View style={styles.exclamation}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>!</Text>
               </View>
            </View>

            {/* Trip Details Card inside */}
            <View style={styles.detailsCard}>
               <Text style={styles.detailsTitle}>Intercity Trip: {request?.trip?.from || 'Mumbai'} to {request?.trip?.to || 'Pune'}</Text>
               <Text style={styles.detailsText}>Estimated Payout: ₹{request?.trip?.fare || 450.00}</Text>
               <Text style={styles.detailsText}>Distance to Pickup: {request?.trip?.distance_km || 2.4} km</Text>
               {request?.trip?.has_parcel && (
                 <Text style={styles.detailsText}>📦 Package included</Text>
               )}
            </View>

            {/* Circular Timer Mock */}
            <View style={styles.timerWrapper}>
               <View style={styles.timerOuterRing}>
                  <View style={styles.timerProgress} />
               </View>
               <View style={styles.timerInner}>
                  <Text style={styles.timerText}>{timeLeft}</Text>
               </View>
            </View>
            <Text style={styles.timerLabel}>s</Text>

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
               <TouchableOpacity style={styles.rejectBtn} onPress={onDismiss}>
                  <Text style={styles.rejectText}>Reject</Text>
               </TouchableOpacity>
               
               <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept}>
                  <Text style={styles.acceptText}>Accept</Text>
               </TouchableOpacity>
            </View>

         </View>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: '#111827', zIndex: 999 },
  
  mapBg: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  mapInner: { width: '100%', height: '100%', backgroundColor: '#1E293B', position: 'relative', overflow: 'hidden' },
  road1: { position: 'absolute', top: 80, left: 40, width: 192, height: 192, borderWidth: 3, borderColor: '#334155', borderRadius: 96, opacity: 0.5 },
  road2: { position: 'absolute', top: 160, right: -20, width: 256, height: 256, borderWidth: 3, borderColor: '#334155', borderRadius: 128, opacity: 0.5 },
  
  routeHighlight: { position: 'absolute', top: 128, left: 64, width: 128, height: 128, borderLeftWidth: 4, borderBottomWidth: 4, borderColor: '#3B82F6', borderBottomLeftRadius: 24, opacity: 0.8, shadowColor: '#3B82F6', shadowOpacity: 1, shadowRadius: 10 },
  
  marker1: { position: 'absolute', top: 128, left: 64, width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff', borderWidth: 4, borderColor: '#3B82F6', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 5 },
  markerText1: { position: 'absolute', top: 144, left: 48, color: '#D1D5DB', fontWeight: 'bold', fontSize: 18 },
  
  marker2: { position: 'absolute', top: 250, left: 250, width: 16, height: 16, borderRadius: 8, backgroundColor: '#3B82F6', borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 5 },
  marker2Glow: { position: 'absolute', top: 240, left: 240, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(59,130,246,0.2)' },
  markerText2: { position: 'absolute', top: 260, left: 240, color: '#D1D5DB', fontWeight: 'bold', fontSize: 18 },
  
  alertOverlay: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 32, zIndex: 10 },
  
  glassCard: { width: '100%', backgroundColor: 'rgba(30, 41, 59, 0.8)', borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', padding: 24, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, elevation: 15, position: 'relative', overflow: 'hidden' },
  
  handle: { width: 48, height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, alignSelf: 'center', marginBottom: 24 },
  
  titleRow: { flexDirection: 'row', items: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  exclamation: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(107,114,128,0.5)', alignItems: 'center', justifyContent: 'center' },
  
  detailsCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, marginBottom: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  detailsTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  detailsText: { color: '#D1D5DB', fontSize: 16, marginBottom: 4 },
  
  timerWrapper: { alignItems: 'center', justifyContent: 'center', marginBottom: 8, position: 'relative' },
  timerOuterRing: { width: 112, height: 112, borderRadius: 56, borderWidth: 4, borderColor: 'rgba(75,85,99,0.5)', alignItems: 'center', justifyContent: 'center', position: 'absolute' },
  timerProgress: { width: '100%', height: '100%', borderRadius: 56, borderWidth: 4, borderLeftColor: 'transparent', borderTopColor: 'transparent', borderColor: '#22C55E', position: 'absolute', transform: [{ rotate: '45deg' }] },
  timerInner: { width: 96, height: 96, backgroundColor: 'rgba(17,24,39,0.8)', borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  timerText: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  timerLabel: { color: '#9CA3AF', textAlign: 'center', fontSize: 14, fontWeight: '500', marginBottom: 32 },
  
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  rejectBtn: { flex: 1, paddingVertical: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
  rejectText: { color: '#fff', fontSize: 18, fontWeight: '500' },
  acceptBtn: { flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#4ADE80', shadowColor: '#22C55E', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  acceptText: { color: '#064E3B', fontSize: 18, fontWeight: 'bold' },
});
