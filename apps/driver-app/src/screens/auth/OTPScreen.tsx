/**
 * Driver OTP Verification Screen
 * 6-digit OTP with auto-advance, resend timer, dark theme
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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

const OTP_LENGTH = 6
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:80/api/v1'

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
      const res = await axios.post(`${BASE_URL}/auth/otp/verify`, {
        phone,
        otp_code: otpCode,
        role: 'driver',
      })
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

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View className="flex-1 px-6 justify-center">
          <TouchableOpacity onPress={() => router.back()} className="absolute top-4 left-6">
            <Text className="text-2xl text-slate-400">←</Text>
          </TouchableOpacity>

          <View className="items-center mb-10">
            <View className="w-20 h-20 rounded-2xl bg-amber-500/20 border border-amber-500/40 items-center justify-center mb-6">
              <Text className="text-4xl">📱</Text>
            </View>
            <Text className="text-2xl font-bold text-white text-center">Enter OTP</Text>
            <Text className="text-sm text-slate-400 text-center mt-2 leading-5">
              Code sent to{'\n'}
              <Text className="font-semibold text-slate-200">{maskedPhone}</Text>
            </Text>
          </View>

          {/* OTP Boxes */}
          <View className="flex-row justify-center gap-3 mb-6">
            {Array(OTP_LENGTH).fill(null).map((_, idx) => (
              <TextInput
                key={idx}
                ref={ref => { inputRefs.current[idx] = ref }}
                className={`w-12 h-14 rounded-xl text-center text-xl font-bold border-2 ${
                  otp[idx]
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                    : error
                    ? 'border-red-500 bg-red-900/10 text-white'
                    : 'border-slate-700 bg-slate-800 text-white'
                }`}
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

          {error ? <Text className="text-red-400 text-sm text-center mb-4">{error}</Text> : null}

          {__DEV__ && (
            <Text className="text-xs text-center text-amber-500 bg-amber-900/20 rounded-xl py-2 px-4 mb-4">
              Dev mode — OTP: 123456
            </Text>
          )}

          <TouchableOpacity
            onPress={() => handleVerify()}
            disabled={loading || otp.join('').length < OTP_LENGTH}
            activeOpacity={0.85}
            className={`h-14 rounded-2xl items-center justify-center mb-6 ${
              otp.join('').length === OTP_LENGTH && !loading ? 'bg-amber-500' : 'bg-slate-700'
            }`}
          >
            {loading
              ? <ActivityIndicator color="#0F172A" />
              : <Text className={`text-base font-bold ${otp.join('').length === OTP_LENGTH ? 'text-slate-900' : 'text-slate-500'}`}>
                  Verify OTP
                </Text>
            }
          </TouchableOpacity>

          <View className="flex-row justify-center items-center gap-1">
            <Text className="text-sm text-slate-500">Didn't receive it? </Text>
            {canResend
              ? <TouchableOpacity onPress={async () => {
                  setCanResend(false); setResendTimer(30)
                  await axios.post(`${BASE_URL}/auth/otp/send`, { phone })
                }}>
                  <Text className="text-sm font-semibold text-amber-400">Resend</Text>
                </TouchableOpacity>
              : <Text className="text-sm text-slate-600">Resend in {resendTimer}s</Text>
            }
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
