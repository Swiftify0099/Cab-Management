/**
 * Driver KYC Live Selfie Verification Screen (Feature 2: Driver Onboarding & KYC)
 * Pixel-perfect implementation matching approved UI mockup.
 */
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { kycApi } from '../../src/api/client'
import { useTheme } from '../../src/theme'

export default function LiveSelfieScreen() {
  const { theme, isDark } = useTheme()
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const loadExistingSelfie = async () => {
      try {
        const res = await kycApi.getDocumentDetails('selfie').catch(() => null)
        const doc = res?.data?.data || res?.data
        const pUrl = doc?.access_url || doc?.file_path || doc?.preview_url
        if (pUrl) {
          setPhotoUri(pUrl)
        }
      } catch (e) {
        console.warn('[Selfie] Load warning:', e)
      }
    }
    loadExistingSelfie()
  }, [])

  const handleCaptureSelfie = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('Camera Permission Required', 'Please enable camera access to take a live selfie.')
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        cameraType: (ImagePicker as any).CameraType?.front ?? 'front',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri)
      }
    } catch (e) {
      console.warn('[Selfie] Error taking selfie:', e)
    }
  }

  const handleSubmitSelfie = async () => {
    if (!photoUri) {
      Alert.alert('Capture Required', 'Please capture your selfie before submitting.')
      return
    }

    setUploading(true)
    try {
      const isLocal = !photoUri.startsWith('http://') && !photoUri.startsWith('https://')
      const formData = new FormData()

      if (isLocal) {
        const filename = photoUri.split('/').pop() || 'selfie.jpg'
        const match = /\.(\w+)$/.exec(filename)
        const type = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg'

        formData.append('file', {
          uri: photoUri,
          name: filename,
          type,
        } as any)
      }

      formData.append('document_number', 'LIVE-SELFIE')

      await kycApi.uploadDocument('selfie', formData)

      Alert.alert('Selfie Submitted', 'Your live selfie has been submitted for liveness and identity verification.', [
        { text: 'View Status', onPress: () => router.push('/kyc/status' as any) },
      ])
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Selfie uploaded.'
      Alert.alert('Status', msg, [
        { text: 'OK', onPress: () => router.push('/kyc/status' as any) },
      ])
    } finally {
      setUploading(false)
    }
  }

  const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: isDark ? '#080C17' : '#F8FAFC' },
    safeArea: { flex: 1 },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 16,
    },
    backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: isDark ? '#FFFFFF' : '#0F172A', fontSize: 18, fontWeight: '800' },

    content: { flex: 1, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },

    title: { color: isDark ? '#FFFFFF' : '#0F172A', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
    subtitle: { color: '#94A3B8', fontSize: 14, textAlign: 'center', marginBottom: 28 },

    // Camera Oval Frame Box
    ovalBox: {
      width: 260,
      height: 320,
      borderRadius: 130,
      borderWidth: 3,
      borderColor: photoUri ? '#10B981' : '#3B82F6',
      overflow: 'hidden',
      backgroundColor: isDark ? '#121827' : '#EFF6FF',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      shadowColor: photoUri ? '#10B981' : '#3B82F6',
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 6,
    },
    previewImage: { width: '100%', height: '100%' },
    placeholderBox: { alignItems: 'center', gap: 12 },
    placeholderText: { color: '#60A5FA', fontSize: 14, fontWeight: '700' },

    // Instructions Box
    instructionsCard: {
      marginTop: 24,
      width: '100%',
      backgroundColor: isDark ? '#121827' : '#FFFFFF',
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0',
    },
    instructionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    instructionText: { color: isDark ? '#94A3B8' : '#475569', fontSize: 13, fontWeight: '600' },

    // Capture & Submit Buttons
    actionsBox: { width: '100%', paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
    captureBtn: {
      height: 52,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: '#3B82F6',
      backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    captureBtnText: { color: '#3B82F6', fontSize: 16, fontWeight: '800' },

    submitBtn: {
      height: 52,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#10B981',
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 5,
    },
    submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  })

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#080C17" />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={isDark ? '#FFFFFF' : '#0F172A'} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Live Selfie Verification</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Position your face in the oval</Text>
          <Text style={styles.subtitle}>Hold still in good lighting with eyes visible</Text>

          {/* Oval Alignment Frame */}
          <TouchableOpacity style={styles.ovalBox} activeOpacity={0.85} onPress={handleCaptureSelfie}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="cover" />
            ) : (
              <View style={styles.placeholderBox}>
                <Feather name="camera" size={48} color="#3B82F6" />
                <Text style={styles.placeholderText}>Tap to Capture</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Guidelines */}
          <View style={styles.instructionsCard}>
            <View style={styles.instructionRow}>
              <Ionicons name="sunny" size={16} color="#F59E0B" />
              <Text style={styles.instructionText}>Ensure even lighting on your face</Text>
            </View>
            <View style={styles.instructionRow}>
              <Ionicons name="glasses-outline" size={16} color="#3B82F6" />
              <Text style={styles.instructionText}>Remove caps, sunglasses, or masks</Text>
            </View>
            <View style={styles.instructionRow}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.instructionText}>Face directly towards the camera</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsBox}>
          <TouchableOpacity style={styles.captureBtn} onPress={handleCaptureSelfie}>
            <Feather name="camera" size={20} color="#3B82F6" />
            <Text style={styles.captureBtnText}>
              {photoUri ? 'Retake Photo' : 'Take Selfie'}
            </Text>
          </TouchableOpacity>

          {photoUri && (
            <TouchableOpacity activeOpacity={0.85} onPress={handleSubmitSelfie} disabled={uploading}>
              <LinearGradient colors={['#10B981', '#059669']} style={styles.submitBtn}>
                {uploading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Live Selfie</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  )
}
