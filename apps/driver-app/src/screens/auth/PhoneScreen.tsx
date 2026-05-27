/**
 * Driver App — Phone entry screen for OTP login
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
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import axios from 'axios'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:80/api/v1'

export default function DriverPhoneScreen() {
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

  const handleSend = async () => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length < 10) {
      setError('Enter a valid 10-digit mobile number')
      shake()
      return
    }

    setError('')
    setLoading(true)
    const fullPhone = `+91${cleaned}`

    try {
      await axios.post(`${BASE_URL}/auth/otp/send`, { phone: fullPhone })
      router.push({ pathname: '/auth/otp', params: { phone: fullPhone } })
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Failed to send OTP'
      setError(msg)
      shake()
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View className="items-center mb-10">
            <View className="w-24 h-24 rounded-3xl bg-amber-500 items-center justify-center mb-6 shadow-xl">
              <Text className="text-5xl">🚗</Text>
            </View>
            <Text className="text-3xl font-bold text-white text-center">
              CabBooking Driver
            </Text>
            <Text className="text-sm text-slate-400 text-center mt-2">
              Start earning — enter your mobile number
            </Text>
          </View>

          {/* Badge row */}
          <View className="flex-row justify-center gap-3 mb-8">
            {['Flexible Hours', 'Daily Earnings', 'Safe & Secure'].map((b) => (
              <View key={b} className="bg-slate-800 px-3 py-1.5 rounded-full">
                <Text className="text-xs text-amber-400 font-medium">{b}</Text>
              </View>
            ))}
          </View>

          {/* Phone Input */}
          <Animated.View
            style={{ transform: [{ translateX: shakeAnim }] }}
            className="mb-4"
          >
            <Text className="text-sm font-semibold text-slate-300 mb-2">
              Mobile Number
            </Text>
            <View className={`flex-row items-center border-2 rounded-2xl px-4 h-14 ${
              error
                ? 'border-red-500 bg-red-900/20'
                : 'border-slate-700 bg-slate-800'
            }`}>
              <View className="flex-row items-center gap-2 pr-3 border-r border-slate-600">
                <Text className="text-lg">🇮🇳</Text>
                <Text className="text-base font-semibold text-slate-200">+91</Text>
              </View>
              <TextInput
                className="flex-1 pl-3 text-base font-medium text-white"
                placeholder="Enter mobile number"
                placeholderTextColor="#64748B"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(t) => {
                  setError('')
                  setPhone(t.replace(/\D/g, '').slice(0, 10))
                }}
                maxLength={10}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSend}
              />
              {phone.length === 10 && (
                <Text className="text-green-400 text-xl">✓</Text>
              )}
            </View>
            {error ? (
              <Text className="text-red-400 text-sm mt-2 ml-1">{error}</Text>
            ) : null}
          </Animated.View>

          <TouchableOpacity
            onPress={handleSend}
            disabled={loading || phone.length < 10}
            activeOpacity={0.85}
            className={`h-14 rounded-2xl items-center justify-center mt-2 ${
              phone.length === 10 && !loading
                ? 'bg-amber-500 shadow-lg'
                : 'bg-slate-700'
            }`}
          >
            {loading ? (
              <ActivityIndicator color="#0F172A" />
            ) : (
              <Text className={`text-base font-bold ${
                phone.length === 10 ? 'text-slate-900' : 'text-slate-500'
              }`}>
                Send OTP →
              </Text>
            )}
          </TouchableOpacity>

          {__DEV__ && (
            <Text className="text-xs text-center text-amber-500 mt-4">
              🔧 Dev mode — OTP: 123456
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
