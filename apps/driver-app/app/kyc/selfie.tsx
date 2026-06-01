import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

export default function SelfieScreen() {
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
          <Text style={styles.headerTitle}>Live Selfie</Text>
        </View>

        {/* Progress Bar (Step 4 of 4) */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressSegment, styles.progressActive]} />
          <View style={[styles.progressSegment, styles.progressActive]} />
          <View style={[styles.progressSegment, styles.progressActive]} />
          <View style={[styles.progressSegment, styles.progressActive]} />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Position your face in the oval</Text>
          <Text style={styles.subtitle}>Ensure you are in a well-lit area</Text>
          
          <View style={styles.cameraWrapper}>
            <ImageBackground
              source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000&auto=format&fit=crop' }}
              style={styles.cameraPreview}
            >
              {/* Overlay with circular cutout effect */}
              <View style={styles.overlay}>
                <View style={styles.faceOvalMask} />
              </View>
            </ImageBackground>
          </View>
          
          {/* Capture Button */}
          <TouchableOpacity style={styles.captureBtnWrapper} activeOpacity={0.8}>
            <View style={styles.captureBtnOuter}>
              <View style={styles.captureBtnInner} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Bottom Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity 
            style={styles.proceedBtnWrapper} 
            activeOpacity={0.8}
            onPress={() => router.push('/kyc/status')}
          >
            <View style={styles.glowBg} />
            
            <LinearGradient
              colors={['#10B981', '#059669']} // Green gradient for final step
              style={[styles.proceedBtn, { borderRadius: 20 }]}
            >
              <Text style={styles.proceedText}>Submit Application</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.08)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '600', letterSpacing: 0.3 },
  progressContainer: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 24 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2 },
  progressActive: { backgroundColor: '#3B82F6' },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 20, paddingTop: 20 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#94A3B8', fontSize: 15, marginBottom: 40 },
  
  cameraWrapper: {
    width: 280,
    height: 380,
    borderRadius: 140,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: 'rgba(59, 130, 246, 0.5)',
    marginBottom: 40,
  },
  cameraPreview: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  faceOvalMask: {
    width: 200,
    height: 280,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderStyle: 'dashed',
  },

  captureBtnWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },

  bottomContainer: { paddingHorizontal: 20, paddingBottom: 30, paddingTop: 10 },
  proceedBtnWrapper: { width: '100%', position: 'relative' },
  glowBg: { position: 'absolute', top: -5, left: 0, right: 0, bottom: -5, backgroundColor: 'rgba(16, 185, 129, 0.4)', borderRadius: 25, shadowColor: '#10B981', shadowOpacity: 0.8, shadowRadius: 20, shadowOffset: { width: 0, height: 0 } },
  proceedBtn: { width: '100%', paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  proceedText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
