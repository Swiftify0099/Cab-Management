import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

const DOCUMENTS = [
  { name: 'Aadhar Card', status: 'verified', expiry: 'Lifetime', icon: 'card-account-details' as const },
  { name: 'PAN Card', status: 'verified', expiry: 'Lifetime', icon: 'credit-card' as const },
  { name: 'Vehicle RC Book', status: 'pending', expiry: '08/2027', icon: 'car-info' as const },
  { name: 'Insurance Certificate', status: 'expiring', expiry: '07/2026', icon: 'shield-car' as const },
  { name: 'Fitness Certificate', status: 'verified', expiry: '03/2027', icon: 'check-decagram' as const },
  { name: 'Permit', status: 'verified', expiry: '11/2026', icon: 'file-check' as const },
];

export default function DocumentStatusScreen() {

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return '#10B981'; // Green
      case 'pending': return '#F59E0B'; // Yellow/Orange
      case 'expiring': return '#EF4444'; // Red
      default: return '#94A3B8';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return 'check-circle';
      case 'pending': return 'clock';
      case 'expiring': return 'alert-circle';
      default: return 'help-circle';
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#090A10" />

      {/* Dark background matching the image exactly */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={['#0F121C', '#0B0D14', '#07080C']}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color="#E2E8F0" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Document Status</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Header Summary */}
          <View style={styles.summaryContainer}>
            <View style={styles.iconCircle}>
              <Feather name="shield" size={32} color="#3B82F6" />
            </View>
            <Text style={styles.summaryTitle}>Verification in Progress</Text>
            <Text style={styles.summarySub}>Your documents are being reviewed by our team.</Text>
          </View>

          {/* Document List */}
          <View style={styles.listContainer}>
            {DOCUMENTS.map((doc, index) => (
              <View key={index} style={styles.docItem}>
                {/* Background Glass */}
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)']}
                  style={StyleSheet.absoluteFill}
                  borderRadius={16}
                />
                
                <View style={styles.docIconBox}>
                  <MaterialCommunityIcons name={doc.icon} size={24} color="#60A5FA" />
                </View>
                
                <View style={styles.docInfo}>
                  <Text style={styles.docName}>{doc.name}</Text>
                  <Text style={styles.docExpiry}>Expiry: {doc.expiry}</Text>
                </View>

                <View style={styles.docStatusBox}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(doc.status) + '20' }]}>
                    <Feather name={getStatusIcon(doc.status) as any} size={12} color={getStatusColor(doc.status)} />
                    <Text style={[styles.statusText, { color: getStatusColor(doc.status) }]}>
                      {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Bottom Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity 
            style={styles.proceedBtnWrapper} 
            activeOpacity={0.8}
            onPress={() => router.replace('/(tabs)')}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.03)']}
              style={styles.proceedBtn}
              borderRadius={20}
            >
              <Text style={styles.proceedText}>Return to Dashboard</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#090A10' },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.08)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '600', letterSpacing: 0.3 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  
  summaryContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  summaryTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  summarySub: { color: '#94A3B8', fontSize: 14, textAlign: 'center', paddingHorizontal: 20 },

  listContainer: {
    gap: 12,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  docIconBox: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 16,
  },
  docInfo: { flex: 1 },
  docName: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  docExpiry: { color: '#64748B', fontSize: 13 },
  docStatusBox: { alignItems: 'flex-end' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, gap: 6,
  },
  statusText: { fontSize: 12, fontWeight: '700' },

  bottomContainer: { paddingHorizontal: 20, paddingBottom: 30, paddingTop: 10 },
  proceedBtnWrapper: { width: '100%' },
  proceedBtn: { width: '100%', paddingVertical: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  proceedText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
