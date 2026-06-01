import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function VehicleHealthScreen() {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1C29" />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['#1A1C29', '#0F121C', '#090A10']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="chevron-left" size={28} color="#3B82F6" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vehicle Health</Text>
          <TouchableOpacity style={styles.profileBtn}>
            <View style={styles.profileIconWrap}>
              <Feather name="user" size={18} color="#3B82F6" />
            </View>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Car Showcase Area */}
          <View style={styles.carShowcase}>
            {/* Glowing arc behind car */}
            <View style={styles.glowArc} />
            
            <Image
              source={{ uri: 'https://cdn.pixabay.com/photo/2012/04/12/23/48/car-30990_1280.png' }}
              style={styles.carImage}
              resizeMode="contain"
            />
          </View>

          {/* 3 Stats Cards */}
          <View style={styles.statsRow}>
            {/* Engine Health */}
            <View style={styles.statCard}>
              <LinearGradient
                colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.03)']}
                style={StyleSheet.absoluteFill}
                borderRadius={16}
              />
              <View style={styles.iconCircleGreen}>
                <Feather name="check" size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.statTitle}>Engine{'\n'}Health</Text>
              <Text style={styles.statSub}>Optimal - No{'\n'}Issues Detected</Text>
            </View>

            {/* Fuel Estimate */}
            <View style={styles.statCard}>
              <LinearGradient
                colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.03)']}
                style={StyleSheet.absoluteFill}
                borderRadius={16}
              />
              <View style={styles.iconCircleBlue}>
                <MaterialCommunityIcons name="car-battery" size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.statTitle}>Fuel Estimate</Text>
              
              {/* Semi-circle progress */}
              <View style={styles.progressContainer}>
                <View style={styles.progressArcBg} />
                <View style={styles.progressArcFill} />
                <Text style={styles.progressText}>75%</Text>
              </View>
              
              <Text style={styles.statSubCenter}>250 miles left</Text>
            </View>

            {/* Next Service Date */}
            <View style={styles.statCard}>
              <LinearGradient
                colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.03)']}
                style={StyleSheet.absoluteFill}
                borderRadius={16}
              />
              <View style={styles.iconCircleGray}>
                <Feather name="calendar" size={14} color="#FFFFFF" />
              </View>
              <Text style={styles.statTitle}>Next Service{'\n'}Date</Text>
              <Text style={styles.statSub}>Nov 15, 2024</Text>
            </View>
          </View>

          {/* Document Renewal Alerts */}
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="bell-badge" size={20} color="#94A3B8" />
            <Text style={styles.sectionTitle}>Document Renewal Alerts</Text>
          </View>

          <View style={styles.alertsContainer}>
            <LinearGradient
              colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
              style={StyleSheet.absoluteFill}
              borderRadius={16}
            />
            
            <View style={[styles.alertRow, styles.borderBottom]}>
              <View style={styles.alertLeft}>
                <Feather name="alert-triangle" size={18} color="#EF4444" />
                <Text style={styles.alertText}>Insurance (Expires in 4 days)</Text>
              </View>
              <Text style={styles.alertTime}>00:00 hrs</Text>
            </View>
            
            <View style={styles.alertRow}>
              <View style={styles.alertLeft}>
                <Feather name="alert-triangle" size={18} color="#F59E0B" />
                <Text style={styles.alertText}>Permit (Expires in 28 days)</Text>
              </View>
              <Text style={styles.alertTime}>21:28 days</Text>
            </View>
          </View>

          {/* Manage Vehicle Button */}
          <TouchableOpacity style={styles.manageBtn} activeOpacity={0.7}>
            <LinearGradient
              colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
              style={StyleSheet.absoluteFill}
              borderRadius={16}
            />
            <View style={styles.manageLeft}>
              <Feather name="settings" size={20} color="#60A5FA" />
              <Text style={styles.manageText}>Manage Vehicle</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#94A3B8" />
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
  },
  backText: { color: '#3B82F6', fontSize: 17, marginLeft: -4 },
  headerTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  profileBtn: { width: 80, alignItems: 'flex-end', paddingRight: 8 },
  profileIconWrap: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1.5, borderColor: '#3B82F6',
    alignItems: 'center', justifyContent: 'center',
  },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  
  carShowcase: {
    width: '100%',
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 10,
  },
  glowArc: {
    position: 'absolute',
    bottom: 40,
    width: '120%',
    height: 100,
    borderTopLeftRadius: 300,
    borderTopRightRadius: 300,
    borderTopWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.8,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -10 },
  },
  carImage: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.2 }, { translateY: -10 }],
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    height: 150,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    position: 'relative',
  },
  iconCircleGreen: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#10B981',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  iconCircleBlue: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#60A5FA',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  iconCircleGray: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#475569',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  statTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginBottom: 6 },
  statSub: { color: '#94A3B8', fontSize: 11, lineHeight: 16 },
  statSubCenter: { color: '#94A3B8', fontSize: 11, textAlign: 'center', marginTop: 8 },

  progressContainer: { alignItems: 'center', justifyContent: 'center', position: 'relative', height: 45 },
  progressArcBg: {
    width: 60, height: 30,
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    borderWidth: 4, borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  progressArcFill: {
    position: 'absolute', top: 0,
    width: 60, height: 30,
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    borderWidth: 4, borderBottomWidth: 0,
    borderColor: '#3B82F6',
    borderRightColor: 'transparent',
    transform: [{ rotate: '45deg' }]
  },
  progressText: {
    position: 'absolute', bottom: -5,
    color: '#FFFFFF', fontSize: 15, fontWeight: '700'
  },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 16, paddingHorizontal: 4,
  },
  sectionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  
  alertsContainer: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16, marginBottom: 24,
    overflow: 'hidden',
  },
  alertRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, paddingHorizontal: 16,
  },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  alertLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  alertText: { color: '#F1F5F9', fontSize: 14 },
  alertTime: { color: '#94A3B8', fontSize: 13 },

  manageBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 18, paddingHorizontal: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
  },
  manageLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  manageText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
