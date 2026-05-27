/**
 * Driver Onboarding Screen — Step 1: Profile Setup
 * Collected after OTP login for new drivers.
 */
import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:80/api/v1'

const ONBOARDING_STEPS = [
  { id: 1, title: 'Profile', icon: '👤' },
  { id: 2, title: 'Vehicle', icon: '🚗' },
  { id: 3, title: 'Documents', icon: '📄' },
  { id: 4, title: 'Review', icon: '✅' },
]

export default function DriverOnboardingScreen() {
  const [fullName, setFullName] = useState('')
  const [homeCity, setHomeCity] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!fullName.trim() || fullName.trim().length < 2) {
      e.fullName = 'Please enter your full name'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleNext = async () => {
    if (!validate()) return
    setLoading(true)

    try {
      const token = await SecureStore.getItemAsync('access_token')
      await axios.post(
        `${BASE_URL}/driver/setup`,
        { full_name: fullName.trim(), home_city: homeCity.trim() || undefined },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      router.push('/onboarding/vehicle')
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Please try again')
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
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="mt-6 mb-8">
            <Text className="text-2xl font-bold text-white">Driver Onboarding</Text>
            <Text className="text-sm text-slate-400 mt-1">
              Set up your account to start accepting rides
            </Text>
          </View>

          {/* Stepper */}
          <View className="flex-row justify-between mb-8">
            {ONBOARDING_STEPS.map((step, i) => (
              <View key={step.id} className="items-center flex-1">
                <View className={`w-10 h-10 rounded-full items-center justify-center ${
                  step.id === 1
                    ? 'bg-amber-500'
                    : 'bg-slate-700'
                }`}>
                  <Text className={`text-sm font-bold ${
                    step.id === 1 ? 'text-slate-900' : 'text-slate-500'
                  }`}>
                    {step.id}
                  </Text>
                </View>
                <Text className={`text-xs mt-1 ${
                  step.id === 1 ? 'text-amber-400' : 'text-slate-500'
                }`}>
                  {step.title}
                </Text>
                {i < ONBOARDING_STEPS.length - 1 && (
                  <View className="absolute right-0 top-5 w-1/2 h-0.5 bg-slate-700" />
                )}
              </View>
            ))}
          </View>

          {/* Form Card */}
          <View className="bg-slate-800 rounded-2xl p-6 mb-6">
            <Text className="text-lg font-bold text-white mb-6">Basic Information</Text>

            {/* Full Name */}
            <View className="mb-5">
              <Text className="text-sm font-semibold text-slate-300 mb-2">Full Name *</Text>
              <TextInput
                className={`h-13 px-4 rounded-xl border-2 text-base text-white ${
                  errors.fullName
                    ? 'border-red-500 bg-red-900/20'
                    : 'border-slate-600 bg-slate-700'
                }`}
                placeholder="Enter your full name"
                placeholderTextColor="#64748B"
                value={fullName}
                onChangeText={(t) => { setFullName(t); setErrors((e) => ({ ...e, fullName: '' })) }}
                autoCapitalize="words"
              />
              {errors.fullName ? (
                <Text className="text-red-400 text-xs mt-1">{errors.fullName}</Text>
              ) : null}
            </View>

            {/* Home City */}
            <View>
              <Text className="text-sm font-semibold text-slate-300 mb-2">Home City</Text>
              <TextInput
                className="h-13 px-4 rounded-xl border-2 border-slate-600 bg-slate-700 text-base text-white"
                placeholder="e.g. Pune, Mumbai"
                placeholderTextColor="#64748B"
                value={homeCity}
                onChangeText={setHomeCity}
                autoCapitalize="words"
              />
              <Text className="text-xs text-slate-500 mt-1">
                Optional — helps match you with nearby routes
              </Text>
            </View>
          </View>

          {/* Requirements info */}
          <View className="bg-amber-900/20 border border-amber-700/50 rounded-2xl p-4 mb-8">
            <Text className="text-sm font-semibold text-amber-400 mb-2">📋 Documents Required</Text>
            {['Driving License', 'Aadhaar Card', 'Vehicle RC', 'Vehicle Insurance', 'PAN Card'].map((doc) => (
              <View key={doc} className="flex-row items-center gap-2 mb-1">
                <Text className="text-amber-600">•</Text>
                <Text className="text-sm text-slate-300">{doc}</Text>
              </View>
            ))}
            <Text className="text-xs text-slate-500 mt-2">
              You'll upload these in the next steps. Keep them handy.
            </Text>
          </View>

          {/* Next Button */}
          <TouchableOpacity
            onPress={handleNext}
            disabled={loading}
            activeOpacity={0.85}
            className={`h-14 rounded-2xl items-center justify-center ${
              loading ? 'bg-amber-400' : 'bg-amber-500'
            }`}
          >
            {loading ? (
              <ActivityIndicator color="#0F172A" />
            ) : (
              <Text className="text-slate-900 text-base font-bold">
                Continue to Vehicle Setup →
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
