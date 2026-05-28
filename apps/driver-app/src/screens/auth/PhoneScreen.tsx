/**
 * Driver App — Phone entry screen for OTP login
 * StyleSheet version (NativeWind removed — caused Metro 99.9% hang on dynamic classNames)
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
  StyleSheet,
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoBox}>
              <Text style={{ fontSize: 48 }}>🚗</Text>
            </View>
            <Text style={styles.title}>CabBooking Driver</Text>
            <Text style={styles.subtitle}>Start earning — enter your mobile number</Text>
          </View>

          {/* Badge row */}
          <View style={styles.badgeRow}>
            {['Flexible Hours', 'Daily Earnings', 'Safe & Secure'].map((b) => (
              <View key={b} style={styles.badge}>
                <Text style={styles.badgeText}>{b}</Text>
              </View>
            ))}
          </View>

          {/* Phone Input */}
          <Animated.View style={[styles.inputContainer, { transform: [{ translateX: shakeAnim }] }]}>
            <Text style={styles.label}>Mobile Number</Text>
            <View style={[styles.inputRow, error ? styles.inputRowError : styles.inputRowNormal]}>
              <View style={styles.countryCode}>
                <Text style={{ fontSize: 18 }}>🇮🇳</Text>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <TextInput
                style={styles.input}
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
              {phone.length === 10 && <Text style={styles.checkIcon}>✓</Text>}
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </Animated.View>

          <TouchableOpacity
            onPress={handleSend}
            disabled={loading || phone.length < 10}
            activeOpacity={0.85}
            style={[styles.button, phone.length === 10 && !loading ? styles.buttonActive : styles.buttonDisabled]}
          >
            {loading ? (
              <ActivityIndicator color="#0F172A" />
            ) : (
              <Text style={[styles.buttonText, { color: phone.length === 10 ? '#0F172A' : '#64748B' }]}>
                Send OTP →
              </Text>
            )}
          </TouchableOpacity>

          {__DEV__ && (
            <Text style={styles.devHint}>🔧 Dev mode — OTP: 123456</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  scroll: { flex: 1, paddingHorizontal: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoBox: {
    width: 96, height: 96, borderRadius: 24, backgroundColor: '#F59E0B',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 8 },
  badgeRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  badge: { backgroundColor: '#1E293B', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '500', color: '#FBBF24' },
  inputContainer: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#CBD5E1', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 2,
    borderRadius: 16, paddingHorizontal: 16, height: 56,
  },
  inputRowNormal: { borderColor: '#334155', backgroundColor: '#1E293B' },
  inputRowError: { borderColor: '#EF4444', backgroundColor: 'rgba(127, 29, 29, 0.2)' },
  countryCode: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingRight: 12, borderRightWidth: 1, borderRightColor: '#475569',
  },
  countryCodeText: { fontSize: 16, fontWeight: '600', color: '#E2E8F0' },
  input: { flex: 1, paddingLeft: 12, fontSize: 16, fontWeight: '500', color: '#FFFFFF' },
  checkIcon: { color: '#4ADE80', fontSize: 20 },
  errorText: { color: '#F87171', fontSize: 14, marginTop: 8, marginLeft: 4 },
  button: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  buttonActive: { backgroundColor: '#F59E0B', shadowColor: '#F59E0B', shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  buttonDisabled: { backgroundColor: '#334155' },
  buttonText: { fontSize: 16, fontWeight: 'bold' },
  devHint: { fontSize: 12, textAlign: 'center', color: '#F59E0B', marginTop: 16 },
})
