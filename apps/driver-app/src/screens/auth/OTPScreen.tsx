/**
 * Driver OTP Verification Screen
 * StyleSheet version (NativeWind removed — caused Metro 99.9% hang on dynamic classNames)
 */
import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { authApi, BASE_URL } from '../../api/client'
import * as SecureStore from 'expo-secure-store'

const OTP_LENGTH = 6

export default function DriverOTPScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>()
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendTimer, setResendTimer] = useState(30)
  const [canResend, setCanResend] = useState(false)
  const inputRefs = useRef<(TextInput | null)[]>([])

  useEffect(() => {
    if (resendTimer <= 0) { setCanResend(true); return }
    const t = setTimeout(() => setResendTimer(p => p - 1), 1000)
    return () => clearTimeout(t)
  }, [resendTimer])

  const handleOtpChange = (text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1)
    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)
    setError('')
    if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus()
    if (digit && index === OTP_LENGTH - 1 && newOtp.every(d => d !== '')) {
      handleVerify(newOtp.join(''))
    }
  }

  const handleKeyPress = (event: any, index: number) => {
    if (event.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerify = useCallback(async (code?: string) => {
    const otpCode = code || otp.join('')
    if (otpCode.length < OTP_LENGTH) { setError('Enter the complete 6-digit OTP'); return }

    setError('')
    setLoading(true)
    try {
      const res = await authApi.verifyOtp(phone, otpCode)
      const { data } = res.data
      await SecureStore.setItemAsync('access_token', data.access_token)
      await SecureStore.setItemAsync('refresh_token', data.refresh_token)
      await SecureStore.setItemAsync('driver_user', JSON.stringify({
        userId: data.user_id,
        phone,
        role: data.role,
        isNewUser: data.is_new_user,
        profileComplete: data.profile_complete,
      }))

      if (!data.profile_complete) {
        router.replace('/onboarding/profile')
      } else {
        router.replace('/(tabs)')
      }
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Invalid OTP. Try again.'
      setError(msg)
      setOtp(Array(OTP_LENGTH).fill(''))
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }, [otp, phone])

  const maskedPhone = phone?.replace(/(\+91)(\d{3})\d{4}(\d{3})/, '$1$2****$3')

  const getBoxStyle = (idx: number) => {
    if (otp[idx]) return styles.otpBoxFilled
    if (error) return styles.otpBoxError
    return styles.otpBoxEmpty
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.content}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconBox}>
              <Text style={{ fontSize: 40 }}>📱</Text>
            </View>
            <Text style={styles.title}>Enter OTP</Text>
            <Text style={styles.subtitle}>
              Code sent to{'\n'}
              <Text style={styles.phoneMasked}>{maskedPhone}</Text>
            </Text>
          </View>

          {/* OTP Boxes */}
          <View style={styles.otpRow}>
            {Array(OTP_LENGTH).fill(null).map((_, idx) => (
              <TextInput
                key={idx}
                ref={ref => { inputRefs.current[idx] = ref }}
                style={[styles.otpBox, getBoxStyle(idx)]}
                keyboardType="number-pad"
                maxLength={1}
                value={otp[idx]}
                onChangeText={t => handleOtpChange(t, idx)}
                onKeyPress={e => handleKeyPress(e, idx)}
                autoFocus={idx === 0}
                selectTextOnFocus
              />
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {__DEV__ && (
            <Text style={styles.devHint}>
              Dev mode — OTP: 123456
            </Text>
          )}

          <TouchableOpacity
            onPress={() => handleVerify()}
            disabled={loading || otp.join('').length < OTP_LENGTH}
            activeOpacity={0.85}
            style={[styles.button, otp.join('').length === OTP_LENGTH && !loading ? styles.buttonActive : styles.buttonDisabled]}
          >
            {loading
              ? <ActivityIndicator color="#0F172A" />
              : <Text style={[styles.buttonText, { color: otp.join('').length === OTP_LENGTH ? '#0F172A' : '#64748B' }]}>
                  Verify OTP
                </Text>
            }
          </TouchableOpacity>

          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>Didn't receive it? </Text>
            {canResend
              ? <TouchableOpacity onPress={async () => {
                  setCanResend(false); setResendTimer(30)
                  await authApi.sendOtp(phone)
                }}>
                  <Text style={styles.resendBtn}>Resend</Text>
                </TouchableOpacity>
              : <Text style={styles.resendTimer}>Resend in {resendTimer}s</Text>
            }
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  backBtn: { position: 'absolute', top: 16, left: 24, width: 40, height: 40, justifyContent: 'center' },
  backText: { fontSize: 24, color: '#94A3B8' },
  header: { alignItems: 'center', marginBottom: 40 },
  iconBox: {
    width: 80, height: 80, borderRadius: 20, backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: 'rgba(245, 158, 11, 0.4)', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  phoneMasked: { fontWeight: '600', color: '#E2E8F0' },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 24 },
  otpBox: { width: 48, height: 56, borderRadius: 12, textAlign: 'center', fontSize: 20, fontWeight: 'bold', borderWidth: 2 },
  otpBoxEmpty: { borderColor: '#334155', backgroundColor: '#1E293B', color: '#FFFFFF' },
  otpBoxFilled: { borderColor: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#FBBF24' },
  otpBoxError: { borderColor: '#EF4444', backgroundColor: 'rgba(127, 29, 29, 0.1)', color: '#FFFFFF' },
  errorText: { color: '#F87171', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  devHint: {
    fontSize: 12, textAlign: 'center', color: '#F59E0B',
    backgroundColor: 'rgba(120, 53, 15, 0.2)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 16, marginBottom: 16,
  },
  button: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  buttonActive: { backgroundColor: '#F59E0B' },
  buttonDisabled: { backgroundColor: '#334155' },
  buttonText: { fontSize: 16, fontWeight: 'bold' },
  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 },
  resendLabel: { fontSize: 14, color: '#64748B' },
  resendBtn: { fontSize: 14, fontWeight: '600', color: '#FBBF24' },
  resendTimer: { fontSize: 14, color: '#475569' },
})
