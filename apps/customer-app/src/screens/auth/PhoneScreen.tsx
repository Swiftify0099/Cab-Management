/**
 * OTP Phone Entry Screen — Customer App
 * StyleSheet version (NativeWind removed — caused Metro 97% hang on dynamic classNames)
 */
import React, { useState, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, Alert, ScrollView, StyleSheet,
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconBox}>
              <Text style={{ fontSize: 48 }}>🚗</Text>
            </View>
            <Text style={styles.title}>CabBooking</Text>
            <Text style={styles.subtitle}>Enter your mobile number to continue</Text>
          </View>

          {/* Phone Input */}
          <Animated.View style={[styles.inputWrapper, { transform: [{ translateX: shakeAnim }] }]}>
            <Text style={styles.label}>Mobile Number</Text>
            <View style={[styles.inputRow, error ? styles.inputRowError : styles.inputRowNormal]}>
              <View style={styles.countryCode}>
                <Text style={{ fontSize: 18 }}>🇮🇳</Text>
                <Text style={styles.countryText}>+91</Text>
              </View>
              <TextInput
                style={styles.input}
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
              {phone.length === 10 && <Text style={{ color: '#22C55E', fontSize: 20 }}>✓</Text>}
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </Animated.View>

          <Text style={styles.otpHint}>
            We'll send a 6-digit OTP to verify your number.{'\n'}Standard SMS rates may apply.
          </Text>

          {/* Send OTP Button */}
          <TouchableOpacity
            onPress={handleSendOtp}
            disabled={loading || phone.length < 10}
            activeOpacity={0.85}
            style={[styles.button, phone.length === 10 && !loading ? styles.buttonActive : styles.buttonDisabled]}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={[styles.buttonText, { color: phone.length === 10 ? '#FFFFFF' : '#94A3B8' }]}>
                Send OTP →
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.terms}>
            By continuing, you agree to our{' '}
            <Text style={{ color: '#3B82F6' }}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={{ color: '#3B82F6' }}>Privacy Policy</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1, paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  iconBox: {
    width: 96, height: 96, borderRadius: 24, backgroundColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
    shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A', textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#64748B', textAlign: 'center', marginTop: 8 },
  inputWrapper: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 2,
    borderRadius: 16, paddingHorizontal: 16, height: 56,
  },
  inputRowNormal: { borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  inputRowError: { borderColor: '#F87171', backgroundColor: '#FEF2F2' },
  countryCode: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingRight: 12, borderRightWidth: 1, borderRightColor: '#CBD5E1',
  },
  countryText: { fontSize: 16, fontWeight: '600', color: '#334155' },
  input: { flex: 1, paddingLeft: 12, fontSize: 16, fontWeight: '500', color: '#0F172A' },
  errorText: { color: '#EF4444', fontSize: 14, marginTop: 8, marginLeft: 4 },
  otpHint: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginBottom: 24, lineHeight: 18 },
  button: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  buttonActive: {
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB', shadowOpacity: 0.35, shadowRadius: 10, elevation: 4,
  },
  buttonDisabled: { backgroundColor: '#E2E8F0' },
  buttonText: { fontSize: 16, fontWeight: '700' },
  terms: { fontSize: 12, textAlign: 'center', color: '#94A3B8', marginTop: 24, paddingHorizontal: 16 },
})
