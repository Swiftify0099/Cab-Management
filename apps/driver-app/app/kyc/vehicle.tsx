import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

export default function VehicleAssetVerificationScreen() {
  const [photos, setPhotos] = useState({
    front: false,
    side: false,
    rear: false,
    interior: false,
  });

  const handleAddPhoto = (type: keyof typeof photos) => {
    // Mock adding a photo
    setPhotos(prev => ({ ...prev, [type]: !prev[type] }));
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerIcon} onPress={() => router.back()}>
            <Feather name="chevron-left" size={28} color="#2563EB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vehicle Asset Verification</Text>
          <TouchableOpacity style={styles.headerIcon}>
            <Feather name="help-circle" size={22} color="#2563EB" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Live Image Preview Area */}
          <View style={styles.previewContainer}>
            <ImageBackground
              source={{ uri: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?q=80&w=1000&auto=format&fit=crop' }}
              style={styles.previewImage}
              imageStyle={{ borderRadius: 12, opacity: 0.8 }}
            >
              {/* Dark overlay for contrast */}
              <View style={styles.previewOverlay}>
                <Text style={styles.previewText}>Live Image Preview</Text>
                
                {/* Camera Focus Brackets */}
                <View style={styles.focusBrackets}>
                  {/* Top Left */}
                  <View style={[styles.bracket, styles.bracketTL]} />
                  {/* Top Right */}
                  <View style={[styles.bracket, styles.bracketTR]} />
                  {/* Bottom Left */}
                  <View style={[styles.bracket, styles.bracketBL]} />
                  {/* Bottom Right */}
                  <View style={[styles.bracket, styles.bracketBR]} />
                  
                  {/* Center Camera Icon */}
                  <View style={styles.cameraCircle}>
                    <Feather name="camera" size={20} color="#334155" />
                  </View>
                </View>
              </View>
            </ImageBackground>
          </View>

          <Text style={styles.guideText}>Guide for take photos</Text>

          {/* Photo Rows */}
          <View style={styles.photoList}>
            {/* 1. Front View */}
            <View style={styles.photoRow}>
              <View style={styles.iconBox}>
                <MaterialCommunityIcons name="car" size={32} color="#64748B" />
              </View>
              <Text style={styles.rowTitle}>1. Front View</Text>
              <TouchableOpacity 
                style={[styles.addBtn, photos.front && styles.addBtnDone]} 
                onPress={() => handleAddPhoto('front')}
              >
                <Text style={[styles.addBtnText, photos.front && styles.addBtnTextDone]}>
                  {photos.front ? 'Added' : 'Add Photo'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 2. Side View */}
            <View style={styles.photoRow}>
              <View style={styles.iconBox}>
                <MaterialCommunityIcons name="car-side" size={32} color="#64748B" />
              </View>
              <Text style={styles.rowTitle}>2. Side View</Text>
              <TouchableOpacity 
                style={[styles.addBtn, photos.side && styles.addBtnDone]} 
                onPress={() => handleAddPhoto('side')}
              >
                <Text style={[styles.addBtnText, photos.side && styles.addBtnTextDone]}>
                  {photos.side ? 'Added' : 'Add Photo'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 3. Rear View */}
            <View style={styles.photoRow}>
              <View style={styles.iconBox}>
                <MaterialCommunityIcons name="car-back" size={32} color="#64748B" />
              </View>
              <Text style={styles.rowTitle}>3. Rear View</Text>
              <TouchableOpacity 
                style={[styles.addBtn, photos.rear && styles.addBtnDone]} 
                onPress={() => handleAddPhoto('rear')}
              >
                <Text style={[styles.addBtnText, photos.rear && styles.addBtnTextDone]}>
                  {photos.rear ? 'Added' : 'Add Photo'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 4. Interior View */}
            <View style={styles.photoRow}>
              <View style={styles.iconBox}>
                <MaterialCommunityIcons name="car-seat" size={32} color="#64748B" />
              </View>
              <Text style={styles.rowTitle}>4. Interior View</Text>
              <TouchableOpacity 
                style={[styles.addBtn, photos.interior && styles.addBtnDone]} 
                onPress={() => handleAddPhoto('interior')}
              >
                <Text style={[styles.addBtnText, photos.interior && styles.addBtnTextDone]}>
                  {photos.interior ? 'Added' : 'Add Photo'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.footerNote}>Please ensure photos are clear and show the entire vehicle.</Text>
          
        </ScrollView>

        {/* Bottom Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity 
            style={styles.finalizeBtnWrapper} 
            activeOpacity={0.8}
            onPress={() => router.replace('/(tabs)')}
          >
            <LinearGradient
              colors={['#0EA5E9', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.finalizeGradient, { borderRadius: 12 }]}
            >
              <Text style={styles.finalizeText}>Finalize Registration</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  
  // Preview
  previewContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  previewText: {
    position: 'absolute',
    top: 16,
    left: 16,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  focusBrackets: {
    width: 120,
    height: 120,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bracket: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#FFFFFF',
  },
  bracketTL: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 8 },
  bracketTR: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 8 },
  bracketBL: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 8 },
  bracketBR: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 8 },
  cameraCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  guideText: {
    fontSize: 15,
    color: '#334155',
    marginBottom: 12,
  },

  // Photo Rows
  photoList: {
    gap: 12,
    marginBottom: 24,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  rowTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  addBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#2563EB',
    backgroundColor: '#FFFFFF',
  },
  addBtnDone: {
    backgroundColor: '#2563EB',
  },
  addBtnText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
  addBtnTextDone: {
    color: '#FFFFFF',
  },

  footerNote: {
    textAlign: 'center',
    color: '#475569',
    fontSize: 14,
    paddingHorizontal: 10,
    marginBottom: 20,
  },

  bottomContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  finalizeBtnWrapper: {
    width: '100%',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  finalizeGradient: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finalizeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
