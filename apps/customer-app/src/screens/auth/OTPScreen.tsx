/**
 * OTP Verification Screen — Customer App Phase 2
 * 6-digit OTP input with auto-advance, resend timer, NativeWind
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
  BackHandler,
  Alert,
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

  // Resend timer
  useEffect(() => {
    if (resendTimer <= 0) {
      setCanResend(true)
      return
    }
    const t = setTimeout(() => setResendTimer((p) => p - 1), 1000)
    return () => clearTimeout(t)
  }, [resendTimer])

  const handleOtpChange = (text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1)
    const newOtp = [...otp]
    newOtp[index] = digit

    setOtp(newOtp)
    setError('')

    // Auto-advance
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when complete
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
      if (otpCode.length < OTP_LENGTH) {
        setError('Please enter the complete 6-digit OTP')
        return
      }

      setError('')
      setLoading(true)

      try {
        const res = await authApi.verifyOtp(phone, otpCode)
        const { data } = res.data

        await login(
          {
            userId: data.user_id,
            role: data.role,
            phone,
            isNewUser: data.is_new_user,
            profileComplete: data.profile_complete,
          },
          data.access_token,
          data.refresh_token,
        )

        if (!data.profile_complete) {
          router.replace('/auth/profile-setup')
        } else {
          router.replace('/(tabs)')
        }
      } catch (err: any) {
        const msg = err?.response?.data?.detail || 'Invalid OTP. Please try again.'
        setError(msg)
        // Clear OTP boxes on error
        setOtp(Array(OTP_LENGTH).fill(''))
        inputRefs.current[0]?.focus()
      } finally {
        setLoading(false)
      }
    },
    [otp, phone, login]
  )

  const handleResend = async () => {
    if (!canResend) return
    setCanResend(false)
    setResendTimer(30)
    setOtp(Array(OTP_LENGTH).fill(''))
    setError('')
    inputRefs.current[0]?.focus()

    try {
      await authApi.sendOtp(phone)
    } catch {
      setError('Failed to resend OTP')
    }
  }

  const maskedPhone = phone?.replace(/(\+91)(\d{3})\d{4}(\d{3})/, '$1$2****$3')

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="flex-1 px-6 justify-center">
          {/* Back */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute top-4 left-6 w-10 h-10 items-center justify-center"
          >
            <Text className="text-2xl text-slate-600 dark:text-slate-300">←</Text>
          </TouchableOpacity>

          {/* Header */}
          <View className="items-center mb-10">
            <View className="w-20 h-20 rounded-2xl bg-blue-50 dark:bg-blue-900/30 items-center justify-center mb-6">
              <Text className="text-4xl">📱</Text>
            </View>
            <Text className="text-2xl font-bold text-slate-900 dark:text-white text-center">
              Enter OTP
            </Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400 text-center mt-2 leading-5">
              We sent a 6-digit code to{'\n'}
              <Text className="font-semibold text-slate-700 dark:text-slate-200">
                {maskedPhone}
              </Text>
            </Text>
          </View>

          {/* OTP Input Boxes */}
          <View className="flex-row justify-center gap-3 mb-6">
            {Array(OTP_LENGTH).fill(null).map((_, idx) => (
              <TextInput
                key={idx}
                ref={(ref) => { inputRefs.current[idx] = ref }}
                className={`w-12 h-14 rounded-xl text-center text-xl font-bold border-2 ${
                  otp[idx]
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : error
                    ? 'border-red-400 bg-red-50 dark:bg-red-900/10 text-slate-900 dark:text-white'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white'
                }`}
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

          {/* Error */}
          {error ? (
            <Text className="text-red-500 text-sm text-center mb-4">{error}</Text>
          ) : null}

          {/* Dev OTP hint */}
          {__DEV__ && (
            <Text className="text-xs text-center text-amber-500 bg-amber-50 dark:bg-amber-900/20 rounded-xl py-2 px-4 mb-4">
              🔧 Dev mode — use OTP: 123456
            </Text>
          )}

          {/* Verify Button */}
          <TouchableOpacity
            onPress={() => handleVerify()}
            disabled={loading || otp.join('').length < OTP_LENGTH}
            activeOpacity={0.85}
            className={`h-14 rounded-2xl items-center justify-center mb-6 ${
              otp.join('').length === OTP_LENGTH && !loading
                ? 'bg-blue-600 shadow-lg shadow-blue-600/30'
                : 'bg-slate-200 dark:bg-slate-700'
            }`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className={`text-base font-bold ${
                otp.join('').length === OTP_LENGTH ? 'text-white' : 'text-slate-400'
              }`}>
                Verify OTP
              </Text>
            )}
          </TouchableOpacity>

          {/* Resend */}
          <View className="flex-row justify-center items-center gap-1">
            <Text className="text-sm text-slate-500 dark:text-slate-400">
              Didn't receive the OTP?{' '}
            </Text>
            {canResend ? (
              <TouchableOpacity onPress={handleResend}>
                <Text className="text-sm font-semibold text-blue-600">Resend OTP</Text>
              </TouchableOpacity>
            ) : (
              <Text className="text-sm font-semibold text-slate-400">
                Resend in {resendTimer}s
              </Text>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
