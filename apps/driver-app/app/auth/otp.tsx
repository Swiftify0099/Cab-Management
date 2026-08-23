/**
 * Driver OTP Verification — pixel-perfect match with stitch:
 * driver_otp_verification/DriverOtpVerification.tsx
 */
import { useState, useRef, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { authApi } from '../../src/api/client'

export default function DriverOtpScreen() {
  const { phone } = useLocalSearchParams()
  const displayPhone = typeof phone === 'string' ? phone : '+91 9876543210'

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [timer, setTimer] = useState(30)
  const inputs = useRef<Array<TextInput | null>>([])

  useEffect(() => {
    let int = setInterval(() => {
      setTimer(prev => prev > 0 ? prev - 1 : 0)
    }, 1000)
    return () => clearInterval(int)
  }, [])

  const handleChange = (text: string, i: number) => {
    if (text.length > 1) {
      // Paste handling
      const arr = text.replace(/\D/g, '').split('').slice(0, 6)
      const newOtp = [...otp]
      arr.forEach((char, idx) => { newOtp[idx] = char })
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
    const rawPhone = typeof phone === 'string' ? phone.replace(/\s/g, '') : displayPhone.replace(/\s/g, '')
    try {
      await authApi.sendOtp(rawPhone)
      setTimer(30)
      Alert.alert('OTP Sent', 'A new verification code has been sent.')
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Failed to resend OTP. Please try again.'
      Alert.alert('Resend Failed', detail)
    }
  }

  const handleVerify = async () => {
    const code = otp.join('')
    if (code.length < 6) return
    setLoading(true)
    try {
      const rawPhone = typeof phone === 'string' ? phone.replace(/\s/g, '') : displayPhone.replace(/\s/g, '')
      const res = await authApi.verifyOtp(rawPhone, code)
      // APIResponse wrapper: { data: { access_token, ... } }
      const tokenData = res.data?.data || res.data
      const accessToken = tokenData.access_token || tokenData.access
      if (accessToken) {
        // ── Store everything in SecureStore — single source of truth ──
        await SecureStore.setItemAsync('access_token', accessToken)
        if (tokenData.refresh_token) {
          await SecureStore.setItemAsync('refresh_token', tokenData.refresh_token)
        }
        // Store user metadata as JSON so hooks can read driver_id from SecureStore
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
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Invalid verification code. Please check and try again.'
      Alert.alert('Verification Failed', detail)
    } finally {
      setLoading(false)
    }
  }

  const maskedPhone = (() => {
    const raw = typeof phone === 'string' ? phone : displayPhone
    const clean = raw.replace(/\D/g, '')
    if (clean.length >= 10) {
      const last2 = clean.slice(-2)
      const first5 = clean.slice(0, 5)
      return `+91 ${first5} •••${last2}`
    }
    return displayPhone
  })()

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0E1F" />

      {/* Abstract Background Gradient Elements */}
      <View style={styles.bgBlob1} />
      <View style={styles.bgBlob2} />
      
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          
          {/* Header with Back, Logo, and Dev Mode Badge */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
              <Feather name="arrow-left" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.logoRow}>
              <Text style={styles.logoIP}>iP</Text>
              <Text style={styles.logoTitle}>Intercity Partner</Text>
            </View>

            {__DEV__ ? (
              <View style={styles.devBadge}>
                <Text style={styles.devBadgeText}>DEV</Text>
              </View>
            ) : (
              <View style={{ width: 40 }} />
            )}
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>Verify Mobile Number</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit OTP to{'\n'}
              <Text style={styles.phoneHighlight}>{maskedPhone}</Text>
            </Text>

            {/* 6-Digit OTP Inputs */}
            <View style={styles.otpRow}>
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={ref => { inputs.current[i] = ref }}
                  style={[styles.otpInput, digit !== '' && styles.otpInputActive]}
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

            {/* Resend Row */}
            <View style={styles.resendRow}>
              <Text style={styles.resendText}>Didn't receive code? </Text>
              <TouchableOpacity disabled={timer > 0} onPress={handleResend} activeOpacity={0.7}>
                <Text style={[styles.resendLink, timer > 0 && styles.resendLinkDisabled]}>
                  {timer > 0 ? `Resend OTP in ${timer}s` : 'Resend Now'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Verify & Proceed Button */}
            <TouchableOpacity 
              style={[styles.verifyBtn, (loading || otp.join('').length < 6) && { opacity: 0.6 }]}
              onPress={handleVerify}
              disabled={loading || otp.join('').length < 6}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#2563EB', '#3B82F6']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.verifyBtnGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.verifyBtnText}>Verify & Proceed</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {__DEV__ && (
              <TouchableOpacity
                style={styles.devBox}
                activeOpacity={0.8}
                onPress={() => {
                  setOtp(['1', '2', '3', '4', '5', '6'])
                }}
              >
                <Text style={styles.devText}>🔧 Dev Mode — Tap to auto-fill 123456</Text>
              </TouchableOpacity>
            )}

          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0E1F' },
  bgBlob1: { position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(37,99,235,0.12)', top: -80, right: -80 },
  bgBlob2: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(220,178,96,0.08)', bottom: 60, left: -60 },
  
  container: { flex: 1, paddingHorizontal: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginBottom: 48,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoIP: { color: '#DCB260', fontSize: 20, fontWeight: '900', fontStyle: 'italic' },
  logoTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  devBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  devBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  
  content: { flex: 1, alignItems: 'center' },
  title: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  subtitle: { color: '#94A3B8', fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 36 },
  phoneHighlight: { color: '#FFFFFF', fontWeight: '700' },
  
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 28, width: '100%' },
  otpInput: {
    width: 48,
    height: 58,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  otpInputActive: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59,130,246,0.1)',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  
  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 32 },
  resendText: { color: '#94A3B8', fontSize: 14 },
  resendLink: { color: '#3B82F6', fontSize: 14, fontWeight: '700' },
  resendLinkDisabled: { color: '#64748B' },
  
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
  verifyBtnGradient: { height: 54, alignItems: 'center', justifyContent: 'center' },
  verifyBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

  devBox: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(220,178,96,0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(220,178,96,0.25)',
  },
  devText: { color: '#DCB260', fontSize: 12, fontWeight: '600' },
})
