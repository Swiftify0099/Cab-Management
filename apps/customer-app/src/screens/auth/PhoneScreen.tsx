/**
 * OTP Phone Entry Screen — Customer App
 * Auth: Mobile OTP (primary) + Google Sign-In (secondary via expo-auth-session)
 * Refactored: StatusBar now theme-aware. All auth logic UNCHANGED.
 */
import React, { useState, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, StyleSheet, StatusBar, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import * as WebBrowser from 'expo-web-browser'
import * as Google from 'expo-auth-session/providers/google'
import { authApi } from '../../api/client'
import { useAuthStore } from '../../store/auth.store'

WebBrowser.maybeCompleteAuthSession()

const DEFAULT_GOOGLE_CLIENT_ID = '514560559715-ffbetgaeamcv7lq4soj0opug5tgbh1kj.apps.googleusercontent.com'

export default function PhoneScreen() {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const shakeAnim = useRef(new Animated.Value(0)).current
  const login = useAuthStore((s) => s.login)

  // Google OAuth via expo-auth-session
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId,
    androidClientId,
    iosClientId,
  })

  // Handle Google auth response
  React.useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.authentication?.idToken
      if (idToken) handleGoogleToken(idToken)
    } else if (response?.type === 'error') {
      setGoogleLoading(false)
      Alert.alert('Google Sign-In Failed', response.error?.message || 'Try again')
    }
  }, [response])

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
      console.error('[SendOtp Error]', err?.message, err?.response?.data || err)
      const msg = err?.response?.data?.detail || err?.response?.data?.message || (err?.message ? `Network Error: ${err.message}` : 'Failed to send OTP. Please try again.')
      setError(msg)
      shake()
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    if (!webClientId) {
      Alert.alert(
        'Google Sign-In Not Configured',
        'Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to your .env file to enable Google login.',
        [{ text: 'OK' }]
      )
      return
    }
    setGoogleLoading(true)
    try {
      if (!promptAsync) {
        throw new Error('Google Sign-In is not initialized.')
      }
      await promptAsync()
      // Response handled in useEffect above
    } catch (err: any) {
      setGoogleLoading(false)
      Alert.alert('Error', err?.message || 'Could not open Google Sign-In.')
    }
  }

  const handleGoogleToken = async (idToken: string) => {
    try {
      const res = await authApi.googleSignIn(idToken)
      const data = res.data?.data
      await login(
        {
          userId: data.user_id,
          role: data.role || 'customer',
          phone: data.phone || '',
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
    } catch (e: any) {
      Alert.alert('Sign-In Error', e?.response?.data?.detail || 'Google sign-in failed. Please try OTP.')
    } finally {
      setGoogleLoading(false)
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
                {loading
                  ? <ActivityIndicator color="white" />
                  : <Text style={styles.otpBtnText}>Get OTP</Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign-In — only active option */}
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={handleGoogleSignIn}
              disabled={googleLoading}
              activeOpacity={0.85}
            >
              {googleLoading
                ? <ActivityIndicator color="#4285F4" />
                : (
                  <>
                    <Text style={styles.googleG}>G</Text>
                    <Text style={styles.googleBtnText}>Continue with Google</Text>
                  </>
                )
              }
            </TouchableOpacity>

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
    width: '100%', borderRadius: 50, overflow: 'hidden', marginBottom: 28,
    shadowColor: '#A855F7', shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  otpGradient: { height: 60, alignItems: 'center', justifyContent: 'center' },
  otpBtnText: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },

  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  dividerText: { color: '#6B7280', fontSize: 14, marginHorizontal: 12 },

  // Google Button
  googleBtn: {
    width: '100%', height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 28, gap: 12, marginBottom: 'auto' as any,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  googleG: { color: '#4285F4', fontSize: 22, fontWeight: '900' },
  googleBtnText: { color: '#1E293B', fontSize: 16, fontWeight: '600' },

  terms: {
    color: '#6B7280', textAlign: 'center', fontSize: 13, lineHeight: 20,
    paddingHorizontal: 20, marginTop: 32,
  },
})
