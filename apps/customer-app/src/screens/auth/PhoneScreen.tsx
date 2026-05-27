/**
 * OTP Phone Entry Screen — Customer App Phase 2
 * NativeWind styling, animated entrance, country code picker
 */
import React, { useState, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Alert,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { authApi } from '../../api/client'

export default function PhoneScreen() {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const shakeAnim = useRef(new Animated.Value(0)).current

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start()
  }

  const handleSendOtp = async () => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length < 10) {
      setError('Please enter a valid 10-digit mobile number')
      shake()
      return
    }

    setError('')
    setLoading(true)
    const fullPhone = `+91${cleaned}`

    try {
      await authApi.sendOtp(fullPhone)
      router.push({ pathname: '/auth/otp', params: { phone: fullPhone } })
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to send OTP. Please try again.'
      setError(msg)
      shake()
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header illustration area */}
          <View className="items-center mb-10">
            <View className="w-24 h-24 rounded-3xl bg-blue-600 items-center justify-center mb-6 shadow-lg">
              <Text className="text-5xl">🚗</Text>
            </View>
            <Text className="text-3xl font-bold text-slate-900 dark:text-white text-center leading-tight">
              CabBooking
            </Text>
            <Text className="text-base text-slate-500 dark:text-slate-400 text-center mt-2">
              Enter your mobile number to continue
            </Text>
          </View>

          {/* Phone Input */}
          <Animated.View
            style={{ transform: [{ translateX: shakeAnim }] }}
            className="mb-4"
          >
            <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Mobile Number
            </Text>
            <View className={`flex-row items-center border-2 rounded-2xl px-4 h-14 ${
              error
                ? 'border-red-400 bg-red-50'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
            }`}>
              {/* Country code */}
              <View className="flex-row items-center gap-2 pr-3 border-r border-slate-300 dark:border-slate-600">
                <Text className="text-lg">🇮🇳</Text>
                <Text className="text-base font-semibold text-slate-700 dark:text-slate-200">
                  +91
                </Text>
              </View>

              <TextInput
                className="flex-1 pl-3 text-base font-medium text-slate-900 dark:text-white"
                placeholder="Enter mobile number"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(t) => {
                  setError('')
                  setPhone(t.replace(/\D/g, '').slice(0, 10))
                }}
                maxLength={10}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSendOtp}
              />

              {phone.length === 10 && (
                <Text className="text-green-500 text-xl">✓</Text>
              )}
            </View>

            {error ? (
              <Text className="text-red-500 text-sm mt-2 ml-1">{error}</Text>
            ) : null}
          </Animated.View>

          {/* OTP Info */}
          <Text className="text-xs text-slate-400 text-center mb-6">
            We'll send a 6-digit OTP to verify your number.{'\n'}
            Standard SMS rates may apply.
          </Text>

          {/* Send OTP Button */}
          <TouchableOpacity
            onPress={handleSendOtp}
            disabled={loading || phone.length < 10}
            activeOpacity={0.85}
            className={`h-14 rounded-2xl items-center justify-center ${
              phone.length === 10 && !loading
                ? 'bg-blue-600 shadow-lg shadow-blue-600/30'
                : 'bg-slate-200 dark:bg-slate-700'
            }`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className={`text-base font-bold ${
                phone.length === 10 ? 'text-white' : 'text-slate-400'
              }`}>
                Send OTP →
              </Text>
            )}
          </TouchableOpacity>

          {/* Terms */}
          <Text className="text-xs text-center text-slate-400 mt-6 px-4">
            By continuing, you agree to our{' '}
            <Text className="text-blue-500">Terms of Service</Text> and{' '}
            <Text className="text-blue-500">Privacy Policy</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
