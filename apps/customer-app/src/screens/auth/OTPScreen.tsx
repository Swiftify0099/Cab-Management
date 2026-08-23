/**
 * OTP Verification Screen — Customer App
 * StyleSheet version (NativeWind removed — caused Metro 97% hang on dynamic classNames)
 */
import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { authApi } from '../../api/client'
import { useAuthStore } from '../../store/auth.store'

const OTP_LENGTH = 6

export default function OTPScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>()
  const login = useAuthStore((s) => s.login)

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendTimer, setResendTimer] = useState(30)
  const [canResend, setCanResend] = useState(false)
  const inputRefs = useRef<(TextInput | null)[]>([])

  useEffect(() => {
    if (resendTimer <= 0) { setCanResend(true); return }
    const t = setTimeout(() => setResendTimer((p) => p - 1), 1000)
    return () => clearTimeout(t)
  }, [resendTimer])

  const handleOtpChange = (text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1)
    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)
    setError('')
    if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus()
    if (digit && index === OTP_LENGTH - 1 && newOtp.every((d) => d !== '')) {
      handleVerify(newOtp.join(''))
    }
  }

  const handleKeyPress = (event: any, index: number) => {
    if (event.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerify = useCallback(
    async (code?: string) => {
      const otpCode = code || otp.join('')
      if (otpCode.length < OTP_LENGTH) { setError('Please enter the complete 6-digit OTP'); return }
      setError('')
      setLoading(true)
      try {
        const res = await authApi.verifyOtp(phone, otpCode)
        const { data } = res.data
        await login(
          { userId: data.user_id, role: data.role, phone, isNewUser: data.is_new_user, profileComplete: data.profile_complete },
          data.access_token, data.refresh_token,
        )
        if (!data.profile_complete) router.replace('/auth/profile-setup')
        else router.replace('/(tabs)')
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Invalid OTP. Please try again.')
        setOtp(Array(OTP_LENGTH).fill(''))
        inputRefs.current[0]?.focus()
      } finally { setLoading(false) }
    },
    [otp, phone, login]
  )

  const handleResend = async () => {
    if (!canResend) return
    setCanResend(false); setResendTimer(30)
    setOtp(Array(OTP_LENGTH).fill('')); setError('')
    inputRefs.current[0]?.focus()
    try { await authApi.sendOtp(phone) }
    catch { setError('Failed to resend OTP') }
  }

  const maskedPhone = phone?.replace(/(\+91)(\d{3})\d{4}(\d{3})/, '$1$2****$3')
  const otpComplete = otp.join('').length === OTP_LENGTH

  const getBoxStyle = (idx: number) => {
    if (otp[idx]) return styles.otpBoxFilled
    if (error) return styles.otpBoxError
    return styles.otpBoxEmpty
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.content}>
          {/* Back */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconBox}>
              <Text style={{ fontSize: 40 }}>📱</Text>
            </View>
            <Text style={styles.title}>Enter OTP</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to{'\n'}
              <Text style={styles.phoneMasked}>{maskedPhone}</Text>
            </Text>
          </View>

          {/* OTP Boxes */}
          <View style={styles.otpRow}>
            {Array(OTP_LENGTH).fill(null).map((_, idx) => (
              <TextInput
                key={idx}
                ref={(ref) => { inputRefs.current[idx] = ref }}
                style={[styles.otpBox, getBoxStyle(idx)]}
                keyboardType="number-pad"
                maxLength={1}
                value={otp[idx]}
                onChangeText={(t) => handleOtpChange(t, idx)}
                onKeyPress={(e) => handleKeyPress(e, idx)}
                autoFocus={idx === 0}
                selectTextOnFocus
              />
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {__DEV__ && (
            <TouchableOpacity
              onPress={() => {
                const devArr = ['1', '2', '3', '4', '5', '6']
                setOtp(devArr)
                setError('')
                handleVerify('123456')
              }}
              style={styles.devHintBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.devHint}>🔧 Dev mode — Tap to auto-fill & verify: 123456</Text>
            </TouchableOpacity>
          )}

          {/* Verify Button */}
          <TouchableOpacity
            onPress={() => handleVerify()}
            disabled={loading || !otpComplete}
            activeOpacity={0.85}
            style={[styles.button, otpComplete && !loading ? styles.buttonActive : styles.buttonDisabled]}
          >
            {loading ? <ActivityIndicator color="white" /> : (
              <Text style={[styles.buttonText, { color: otpComplete ? '#FFFFFF' : '#94A3B8' }]}>
                Verify OTP
              </Text>
            )}
          </TouchableOpacity>

          {/* Resend */}
          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>Didn't receive the OTP? </Text>
            {canResend ? (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendBtn}>Resend OTP</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.resendTimer}>Resend in {resendTimer}s</Text>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  backBtn: { position: 'absolute', top: 16, left: 24, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 24, color: '#475569' },
  header: { alignItems: 'center', marginBottom: 40 },
  iconBox: {
    width: 80, height: 80, borderRadius: 20, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  phoneMasked: { fontWeight: '600', color: '#334155' },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 24 },
  otpBox: { width: 48, height: 56, borderRadius: 12, textAlign: 'center', fontSize: 20, fontWeight: '700', borderWidth: 2 },
  otpBoxEmpty: { borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', color: '#0F172A' },
  otpBoxFilled: { borderColor: '#2563EB', backgroundColor: '#EFF6FF', color: '#1D4ED8' },
  otpBoxError: { borderColor: '#F87171', backgroundColor: '#FEF2F2', color: '#0F172A' },
  errorText: { color: '#EF4444', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  devHintBtn: { marginBottom: 16 },
  devHint: {
    fontSize: 12, textAlign: 'center', color: '#D97706',
    backgroundColor: '#FFFBEB', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 16, marginBottom: 16,
  },
  button: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  buttonActive: { backgroundColor: '#2563EB', shadowColor: '#2563EB', shadowOpacity: 0.35, shadowRadius: 10, elevation: 4 },
  buttonDisabled: { backgroundColor: '#E2E8F0' },
  buttonText: { fontSize: 16, fontWeight: '700' },
  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  resendLabel: { fontSize: 14, color: '#64748B' },
  resendBtn: { fontSize: 14, fontWeight: '600', color: '#2563EB' },
  resendTimer: { fontSize: 14, fontWeight: '600', color: '#94A3B8' },
})
