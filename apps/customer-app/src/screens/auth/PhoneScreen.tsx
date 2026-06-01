/**
 * OTP Phone Entry Screen — Customer App
 * Pixel-perfect UI from stitch: mobile_otp_login
 * All auth logic preserved.
 */
import React, { useState, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, StyleSheet, StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Feather, FontAwesome5 } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
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
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Abstract gradient background */}
      <LinearGradient colors={['#0A0D1A', '#0F172A', '#1E1B4B']} style={StyleSheet.absoluteFill} />

      {/* Glowing blurs */}
      <View style={[styles.glow, { top: '20%', left: -60, backgroundColor: 'rgba(6,182,212,0.18)' }]} />
      <View style={[styles.glow, { bottom: '25%', right: -60, backgroundColor: 'rgba(168,85,247,0.18)' }]} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.content}>

            {/* Logo */}
            <View style={styles.logoRow}>
              <View style={styles.logoLetters}>
                <Text style={styles.logoI}>i</Text>
                <Text style={styles.logoM}>M</Text>
              </View>
              <View style={styles.logoText}>
                <Text style={styles.logoLine}>Intercity</Text>
                <Text style={styles.logoLine}>Mobility</Text>
              </View>
            </View>

            {/* Welcome Text */}
            <Text style={styles.welcomeTitle}>
              Welcome Back!{'\n'}Log in to continue{'\n'}your journey.
            </Text>

            {/* Phone Input */}
            <Animated.View style={[styles.inputWrap, { transform: [{ translateX: shakeAnim }] }]}>
              <View style={[styles.inputBox, error ? styles.inputBoxError : null]}>
                <Feather name="phone" size={22} color="#94A3B8" />
                <View style={styles.inputDivider} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter Mobile Number"
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
                {phone.length === 10 && <Text style={{ color: '#22C55E', fontSize: 18 }}>✓</Text>}
              </View>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </Animated.View>

            {/* Get OTP Button */}
            <TouchableOpacity
              style={[styles.otpBtn, (loading || phone.length < 10) && { opacity: 0.7 }]}
              onPress={handleSendOtp}
              disabled={loading || phone.length < 10}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#0EA5E9', '#A855F7']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.otpGradient}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.otpBtnText}>Get OTP</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Social Login */}
            <Text style={styles.orText}>Or continue with social media</Text>

            <View style={styles.socialRow}>
              <TouchableOpacity style={[styles.socialBtn, { backgroundColor: '#FFFFFF' }]}>
                <FontAwesome5 name="apple" size={28} color="black" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.socialBtn, { backgroundColor: '#FFFFFF' }]}>
                <Text style={styles.googleG}>G</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.socialBtn, { backgroundColor: '#1877F2', borderColor: '#FFFFFF', borderWidth: 2 }]}>
                <FontAwesome5 name="facebook-f" size={26} color="white" />
              </TouchableOpacity>
            </View>

            {/* Terms */}
            <Text style={styles.terms}>
              By continuing, you agree to our{' '}
              <Text style={{ color: '#FFFFFF', fontWeight: '500' }}>Terms and Privacy Policy</Text>.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F172A' },
  safeArea: { flex: 1 },
  glow: {
    position: 'absolute', width: 280, height: 280, borderRadius: 140,
    shadowColor: 'transparent',
  },
  content: {
    flex: 1, paddingHorizontal: 24, paddingTop: 60,
    alignItems: 'center', justifyContent: 'center',
  },

  // Logo
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 56 },
  logoLetters: { flexDirection: 'row', alignItems: 'flex-end' },
  logoI: { color: '#FFFFFF', fontSize: 46, fontWeight: '900', letterSpacing: -2 },
  logoM: { color: '#3B82F6', fontSize: 46, fontWeight: '900', letterSpacing: -2, marginLeft: -4 },
  logoText: { marginLeft: 12, marginTop: 4 },
  logoLine: { color: '#FFFFFF', fontSize: 19, fontWeight: '700', lineHeight: 22 },

  // Welcome
  welcomeTitle: {
    color: '#FFFFFF', fontSize: 31, fontWeight: '700',
    textAlign: 'center', lineHeight: 40, marginBottom: 40,
  },

  // Input
  inputWrap: { width: '100%', marginBottom: 20 },
  inputBox: {
    width: '100%', height: 60, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20,
    paddingHorizontal: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  inputBoxError: { borderColor: '#F87171' },
  inputDivider: { width: 1, height: 24, backgroundColor: '#4B5563', marginHorizontal: 12 },
  input: { flex: 1, color: '#FFFFFF', fontSize: 17 },
  errorText: { color: '#F87171', fontSize: 13, marginTop: 8, marginLeft: 4 },

  // OTP Button
  otpBtn: {
    width: '100%', borderRadius: 50, overflow: 'hidden', marginBottom: 36,
    shadowColor: '#A855F7', shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  otpGradient: { height: 60, alignItems: 'center', justifyContent: 'center' },
  otpBtnText: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },

  orText: { color: '#9CA3AF', fontSize: 15, marginBottom: 24 },

  socialRow: { flexDirection: 'row', gap: 20, marginBottom: 'auto' as any },
  socialBtn: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 8, elevation: 5,
  },
  googleG: { color: '#3B82F6', fontSize: 28, fontWeight: '900' },

  terms: {
    color: '#6B7280', textAlign: 'center', fontSize: 13, lineHeight: 20,
    paddingHorizontal: 20, marginTop: 32,
  },
})
