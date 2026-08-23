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

export default function Step1Screen() {
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
          <Text style={styles.headerTitle}>Personal Documents</Text>
        </View>

        {/* Progress Bar (Step 1 of 4) */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressSegment, styles.progressActive]} />
          <View style={[styles.progressSegment, styles.progressInactive]} />
          <View style={[styles.progressSegment, styles.progressInactive]} />
          <View style={[styles.progressSegment, styles.progressInactive]} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Aadhaar Card Section */}
          <View style={styles.cardWrapper}>
            <View style={styles.glassCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.03)']}
                style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
              />
              
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Aadhaar Card Upload</Text>
                <View style={styles.statusIconGreen}>
                  <Feather name="check" size={14} color="#FFFFFF" />
                </View>
              </View>

              <TouchableOpacity 
                style={styles.uploadArea} 
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/kyc/documents' as any, params: { doc_type: 'aadhaar' } })}
              >
                <View style={styles.cameraBox}>
                  <View style={styles.cameraDashedBorder} />
                  <MaterialCommunityIcons name="camera" size={36} color="#60A5FA" />
                </View>
                <Text style={styles.uploadText}>Upload Front & Back</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>Ensure no glare on ID</Text>
          </View>

          {/* PAN Card Section */}
          <View style={styles.cardWrapper}>
            <View style={styles.glassCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.03)']}
                style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
              />
              
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>PAN Card Upload</Text>
                <View style={styles.statusIconYellow}>
                  <Text style={styles.exclamationText}>!</Text>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.uploadArea} 
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/kyc/documents' as any, params: { doc_type: 'pan' } })}
              >
                <View style={styles.cameraBox}>
                  <View style={styles.cameraDashedBorder} />
                  <MaterialCommunityIcons name="camera" size={36} color="#60A5FA" />
                </View>
                <Text style={styles.uploadText}>Upload Front</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>Please use good lighting</Text>
          </View>

        </ScrollView>

        {/* Bottom Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity 
            style={styles.proceedBtnWrapper} 
            activeOpacity={0.8}
            onPress={() => router.push('/kyc/step2')}
          >
            {/* Outer Glow */}
            <View style={styles.glowBg} />
            
            <LinearGradient
              colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.05)']}
              style={[styles.proceedBtn, { borderRadius: 20 }]}
            >
              <Text style={styles.proceedText}>Proceed to Vehicle Documents</Text>
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
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 24,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  progressActive: {
    backgroundColor: '#3B82F6',
  },
  progressInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  cardWrapper: {
    marginBottom: 30,
  },
  glassCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    padding: 24,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 220,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusIconGreen: {
    position: 'absolute',
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconYellow: {
    position: 'absolute',
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#B45309',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exclamationText: {
    color: '#FDE047',
    fontSize: 14,
    fontWeight: '800',
  },

  uploadArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBox: {
    width: 80,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  cameraDashedBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'dashed',
  },
  uploadText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
  
  helperText: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
  },

  bottomContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 10,
  },
  proceedBtnWrapper: {
    width: '100%',
    position: 'relative',
  },
  glowBg: {
    position: 'absolute',
    top: -5,
    left: 0,
    right: 0,
    bottom: -5,
    backgroundColor: 'rgba(59, 130, 246, 0.4)',
    borderRadius: 25,
    shadowColor: '#3B82F6',
    shadowOpacity: 0.8,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  proceedBtn: {
    width: '100%',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  proceedText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
