/**
 * Profile Setup Screen — Mandatory after first login.
 * Collects name, gender, DOB, emergency contact.
 * NativeWind styled, multi-step layout.
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
import { profileApi } from '../../api/client'
import { useAuthStore } from '../../store/auth.store'

type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'

const GENDERS: { value: Gender; label: string; emoji: string }[] = [
  { value: 'male', label: 'Male', emoji: '👨' },
  { value: 'female', label: 'Female', emoji: '👩' },
  { value: 'other', label: 'Other', emoji: '🧑' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say', emoji: '🔒' },
]

export default function ProfileSetupScreen() {
  const setProfileComplete = useAuthStore((s) => s.setProfileComplete)

  const [fullName, setFullName] = useState('')
  const [gender, setGender] = useState<Gender | null>(null)
  const [dob, setDob] = useState('')  // YYYY-MM-DD
  const [dobDisplay, setDobDisplay] = useState('')  // DD/MM/YYYY display
  const [emergencyContact, setEmergencyContact] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const formatDob = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 8)
    let formatted = digits
    if (digits.length > 2) formatted = digits.slice(0, 2) + '/' + digits.slice(2)
    if (digits.length > 4) formatted = formatted.slice(0, 5) + '/' + formatted.slice(5)

    setDobDisplay(formatted)

    // Convert to YYYY-MM-DD
    if (digits.length === 8) {
      const d = digits.slice(0, 2)
      const m = digits.slice(2, 4)
      const y = digits.slice(4, 8)
      setDob(`${y}-${m}-${d}`)
    } else {
      setDob('')
    }
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!fullName.trim() || fullName.trim().length < 2) {
      e.fullName = 'Please enter your full name (min 2 characters)'
    }
    if (!gender) e.gender = 'Please select your gender'
    if (!dob) e.dob = 'Please enter a valid date of birth (DD/MM/YYYY)'
    if (!emergencyContact || emergencyContact.replace(/\D/g, '').length < 10) {
      e.emergencyContact = 'Please enter a valid emergency contact number'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    setLoading(true)
    try {
      await profileApi.setup({
        full_name: fullName.trim(),
        gender: gender!,
        dob,
        emergency_contact: `+91${emergencyContact.replace(/\D/g, '')}`,
      })

      setProfileComplete()
      router.replace('/(tabs)')
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to save profile. Please try again.'
      Alert.alert('Error', msg)
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
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="mt-8 mb-8">
            <Text className="text-2xl font-bold text-slate-900 dark:text-white">
              Complete Your Profile
            </Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-5">
              This information helps us provide a safer travel experience.
            </Text>
            {/* Progress bar */}
            <View className="mt-4 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
              <View className="h-full w-1/2 bg-blue-600 rounded-full" />
            </View>
            <Text className="text-xs text-slate-400 mt-1">Step 1 of 2</Text>
          </View>

          {/* Full Name */}
          <View className="mb-5">
            <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Full Name *
            </Text>
            <TextInput
              className={`h-13 px-4 rounded-xl border-2 text-base text-slate-900 dark:text-white ${
                errors.fullName
                  ? 'border-red-400 bg-red-50'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
              }`}
              placeholder="Enter your full name"
              placeholderTextColor="#94A3B8"
              value={fullName}
              onChangeText={(t) => { setFullName(t); setErrors((e) => ({ ...e, fullName: '' })) }}
              autoCapitalize="words"
            />
            {errors.fullName ? (
              <Text className="text-red-500 text-xs mt-1">{errors.fullName}</Text>
            ) : null}
          </View>

          {/* Gender */}
          <View className="mb-5">
            <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Gender *
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {GENDERS.map((g) => (
                <TouchableOpacity
                  key={g.value}
                  onPress={() => { setGender(g.value); setErrors((e) => ({ ...e, gender: '' })) }}
                  className={`flex-row items-center gap-2 px-4 py-2.5 rounded-xl border-2 ${
                    gender === g.value
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                  }`}
                >
                  <Text className="text-base">{g.emoji}</Text>
                  <Text className={`text-sm font-medium ${
                    gender === g.value
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.gender ? (
              <Text className="text-red-500 text-xs mt-1">{errors.gender}</Text>
            ) : null}
          </View>

          {/* Date of Birth */}
          <View className="mb-5">
            <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Date of Birth * (must be 18+)
            </Text>
            <TextInput
              className={`h-13 px-4 rounded-xl border-2 text-base text-slate-900 dark:text-white ${
                errors.dob
                  ? 'border-red-400 bg-red-50'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
              }`}
              placeholder="DD / MM / YYYY"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              value={dobDisplay}
              onChangeText={(t) => { formatDob(t); setErrors((e) => ({ ...e, dob: '' })) }}
              maxLength={10}
            />
            {errors.dob ? (
              <Text className="text-red-500 text-xs mt-1">{errors.dob}</Text>
            ) : null}
          </View>

          {/* Emergency Contact */}
          <View className="mb-8">
            <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Emergency Contact *
            </Text>
            <Text className="text-xs text-slate-400 mb-2">
              A family member or trusted person we can reach in emergencies
            </Text>
            <View className={`flex-row items-center border-2 rounded-xl px-4 h-13 ${
              errors.emergencyContact
                ? 'border-red-400 bg-red-50'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
            }`}>
              <Text className="text-sm font-semibold text-slate-500 mr-2">+91</Text>
              <TextInput
                className="flex-1 text-base text-slate-900 dark:text-white"
                placeholder="Emergency contact number"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={emergencyContact}
                onChangeText={(t) => {
                  setEmergencyContact(t.replace(/\D/g, '').slice(0, 10))
                  setErrors((e) => ({ ...e, emergencyContact: '' }))
                }}
                maxLength={10}
              />
            </View>
            {errors.emergencyContact ? (
              <Text className="text-red-500 text-xs mt-1">{errors.emergencyContact}</Text>
            ) : null}
          </View>

          {/* Safety Badge */}
          <View className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 mb-8 flex-row items-start gap-3">
            <Text className="text-xl">🔒</Text>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                Your data is secure
              </Text>
              <Text className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 leading-4">
                Personal information is encrypted and only shared with verified drivers when required for safety.
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
            className={`h-14 rounded-2xl items-center justify-center ${
              loading ? 'bg-blue-400' : 'bg-blue-600 shadow-lg shadow-blue-600/30'
            }`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-base font-bold">
                Save Profile & Continue →
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
