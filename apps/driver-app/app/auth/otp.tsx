/**
 * Multi-Service Partner App — OTP Verification Screen
 * Pixel-perfect match with the luxury Multi-Service Partner design system.
 */
import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { authApi } from '../../src/api/client'

export default function MultiServiceOtpScreen() {
  const { phone } = useLocalSearchParams()
  const displayPhone = typeof phone === 'string' ? phone : '+91 9876543210'

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [timer, setTimer] = useState(30)
  const inputs = useRef<Array<TextInput | null>>([])

  // Animation values
  const contentOpacity = useRef(new Animated.Value(0)).current
  const contentTranslateY = useRef(new Animated.Value(20)).current
  const shakeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(contentTranslateY, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start()

    let int = setInterval(() => {
      setTimer(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(int)
  }, [])

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 70, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 70, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 5, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start()
  }

  const handleChange = (text: string, i: number) => {
    if (text.length > 1) {
      // Paste handling
      const arr = text.replace(/\D/g, '').split('').slice(0, 6)
      const newOtp = [...otp]
      arr.forEach((char, idx) => {
        newOtp[idx] = char
      })
      setOtp(newOtp)
      inputs.current[Math.min(arr.length, 5)]?.focus()
      return
    }

    const newOtp = [...otp]
    newOtp[i] = text
    setOtp(newOtp)
    if (text !== '' && i < 5) inputs.current[i + 1]?.focus()
  }

  const handleKeyPress = (e: any, i: number) => {
    if (e.nativeEvent.key === 'Backspace' && otp[i] === '' && i > 0) {
      inputs.current[i - 1]?.focus()
    }
  }

  const handleResend = async () => {
    if (timer > 0) return
    const rawPhone =
      typeof phone === 'string' ? phone.replace(/\s/g, '') : displayPhone.replace(/\s/g, '')
    try {
      await authApi.sendOtp(rawPhone)
      setTimer(30)
      Alert.alert('OTP Resent', 'A fresh 6-digit verification code has been dispatched.')
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Failed to resend OTP. Please try again.'
      Alert.alert('Resend Notice', detail)
    }
  }

  const handleVerify = async () => {
    const code = otp.join('')
    if (code.length < 6) {
      triggerShake()
      return
    }

    setLoading(true)
    try {
      const rawPhone =
        typeof phone === 'string' ? phone.replace(/\s/g, '') : displayPhone.replace(/\s/g, '')
      const res = await authApi.verifyOtp(rawPhone, code)
      const tokenData = res.data?.data || res.data
      const accessToken = tokenData.access_token || tokenData.access

      if (accessToken) {
        await SecureStore.setItemAsync('access_token', accessToken)
        if (tokenData.refresh_token) {
          await SecureStore.setItemAsync('refresh_token', tokenData.refresh_token)
        }
        if (tokenData.user_id) {
          await SecureStore.setItemAsync(
            'user_data',
            JSON.stringify({
              id: tokenData.user_id,
              phone: rawPhone,
              role: tokenData.role || 'driver',
            })
          )
          await AsyncStorage.setItem('user_id', tokenData.user_id || '')
        }
        await AsyncStorage.setItem('access_token', accessToken)
      }

      if (tokenData.profile_complete === false || tokenData.is_new_user === true) {
        router.replace('/onboarding/profile' as any)
      } else {
        router.replace('/(tabs)/' as any)
      }
    } catch (err: any) {
      triggerShake()
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Invalid verification code. Please check and try again.'
      Alert.alert('Verification Failed', detail)
    } finally {
      setLoading(false)
    }
  }

  const formattedPhone = (() => {
    const raw = typeof phone === 'string' ? phone : displayPhone
    const clean = raw.replace(/\D/g, '')
    if (clean.length >= 10) {
      const last4 = clean.slice(-4)
      const first2 = clean.slice(-10, -8)
      return `+91 ${first2}••• ••${last4}`
    }
    return displayPhone
  })()

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#070A14" />

      {/* Atmospheric Multi-Layered Gradient */}
      <LinearGradient
        colors={['#070A14', '#0E172F', '#091024', '#050811']}
        locations={[0, 0.35, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient Glow Elements */}
      <View style={styles.glowOrb1} />
      <View style={styles.glowOrb2} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              activeOpacity={0.8}
            >
              <Feather name="arrow-left" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.brandBadge}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.brandIconMini}
                resizeMode="cover"
              />
              <Text style={styles.brandTitle}>Partner Portal</Text>
            </View>

            {__DEV__ ? (
              <View style={styles.devBadge}>
                <Text style={styles.devBadgeText}>DEV</Text>
              </View>
            ) : (
              <View style={{ width: 38 }} />
            )}
          </View>

          {/* Main Card Content */}
          <Animated.View
            style={[
              styles.contentWrap,
              {
                opacity: contentOpacity,
                transform: [{ translateY: contentTranslateY }, { translateX: shakeAnim }],
              },
            ]}
          >
            <View style={styles.securityIconBox}>
              <Feather name="shield" size={28} color="#38BDF8" />
            </View>

            <Text style={styles.title}>Partner Verification</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit authorization PIN to
            </Text>

            {/* Masked Phone with Quick Edit Pencil */}
            <View style={styles.phoneChip}>
              <Text style={styles.phoneChipText}>{formattedPhone}</Text>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.editPhoneBtn}
                activeOpacity={0.7}
              >
                <Feather name="edit-2" size={12} color="#38BDF8" />
                <Text style={styles.editPhoneText}>Change</Text>
              </TouchableOpacity>
            </View>

            {/* 6-Digit OTP Inputs */}
            <View style={styles.otpRow}>
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={ref => {
                    inputs.current[i] = ref
                  }}
                  style={[styles.otpInput, digit !== '' && styles.otpInputFilled]}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={digit}
                  onChangeText={t => handleChange(t, i)}
                  onKeyPress={e => handleKeyPress(e, i)}
                  autoFocus={i === 0}
                  selectionColor="#3B82F6"
                />
              ))}
            </View>

            {/* Resend Action Row */}
            <View style={styles.resendRow}>
              <Text style={styles.resendText}>Didn't receive code? </Text>
              <TouchableOpacity
                disabled={timer > 0}
                onPress={handleResend}
                activeOpacity={0.7}
              >
                <Text style={[styles.resendLink, timer > 0 && styles.resendLinkDisabled]}>
                  {timer > 0 ? `Resend in ${timer}s` : 'Resend Code'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              style={[
                styles.verifyBtn,
                (loading || otp.join('').length < 6) && { opacity: 0.65 },
              ]}
              onPress={handleVerify}
              disabled={loading || otp.join('').length < 6}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={['#2563EB', '#1D4ED8']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.verifyBtnGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.verifyBtnContent}>
                    <Text style={styles.verifyBtnText}>Verify & Enter Portal</Text>
                    <Feather name="arrow-right" size={18} color="#FFFFFF" />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Dev Mode Auto Fill Helper */}
            {__DEV__ && (
              <TouchableOpacity
                style={styles.devBox}
                activeOpacity={0.8}
                onPress={() => {
                  setOtp(['1', '2', '3', '4', '5', '6'])
                }}
              >
                <Feather name="tool" size={13} color="#FBBF24" />
                <Text style={styles.devText}>Dev Mode — Tap to auto-fill 123456</Text>
              </TouchableOpacity>
            )}

            {/* Security Guarantee Footer */}
            <View style={styles.securityFooter}>
              <Feather name="lock" size={12} color="#10B981" />
              <Text style={styles.securityFooterText}>
                256-Bit SSL Transport Grid Protected
              </Text>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#070A14',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
  },
  glowOrb1: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    top: -70,
    right: -70,
  },
  glowOrb2: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    bottom: 40,
    left: -70,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 20,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIconMini: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  devBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  devBadgeText: {
    color: '#FBBF24',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  contentWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  securityIconBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13.5,
    textAlign: 'center',
    marginTop: 6,
  },
  phoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 10,
    marginBottom: 28,
    gap: 8,
  },
  phoneChipText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  editPhoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.15)',
    paddingLeft: 8,
  },
  editPhoneText: {
    color: '#38BDF8',
    fontSize: 11.5,
    fontWeight: '700',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
    width: '100%',
  },
  otpInput: {
    width: 48,
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  otpInputFilled: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 26,
  },
  resendText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  resendLink: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  resendLinkDisabled: {
    color: '#64748B',
  },
  verifyBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 16,
  },
  verifyBtnGradient: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  devBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    gap: 6,
  },
  devText: {
    color: '#FBBF24',
    fontSize: 11.5,
    fontWeight: '700',
  },
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 28,
  },
  securityFooterText: {
    color: '#64748B',
    fontSize: 11.5,
    fontWeight: '500',
  },
})
