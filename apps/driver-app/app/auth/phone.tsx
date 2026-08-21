/**
 * Driver Welcome Entry — pixel-perfect match with the provided design.
 */
import { useState, useEffect, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Dimensions, Image, Animated
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { authApi } from '../../src/api/client'

const { width, height } = Dimensions.get('window')

export default function DriverPhoneScreen() {
  const [showInput, setShowInput] = useState(false)
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)

  // Animation values
  const logoOpacity = useRef(new Animated.Value(0)).current
  const logoTranslateY = useRef(new Animated.Value(20)).current
  const busOpacity = useRef(new Animated.Value(0)).current
  const busTranslateY = useRef(new Animated.Value(30)).current
  const contentOpacity = useRef(new Animated.Value(0)).current
  const contentTranslateY = useRef(new Animated.Value(20)).current
  const footerOpacity = useRef(new Animated.Value(0)).current
  const footerTranslateY = useRef(new Animated.Value(20)).current
  const inputOpacity = useRef(new Animated.Value(0)).current
  const inputTranslateY = useRef(new Animated.Value(-10)).current

  useEffect(() => {
    Animated.stagger(200, [
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(logoTranslateY, { toValue: 0, duration: 800, useNativeDriver: true })
      ]),
      Animated.parallel([
        Animated.timing(busOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(busTranslateY, { toValue: 0, duration: 1000, useNativeDriver: true })
      ]),
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(contentTranslateY, { toValue: 0, duration: 800, useNativeDriver: true })
      ]),
      Animated.parallel([
        Animated.timing(footerOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(footerTranslateY, { toValue: 0, duration: 800, useNativeDriver: true })
      ])
    ]).start()
  }, [])

  useEffect(() => {
    if (showInput) {
      Animated.parallel([
        Animated.timing(inputOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(inputTranslateY, { toValue: 0, duration: 400, useNativeDriver: true })
      ]).start()
    }
  }, [showInput])

  const handleLogin = async () => {
    if (!showInput) {
      setShowInput(true)
      return
    }

    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length < 10) {
      Alert.alert('Invalid Mobile Number', 'Please enter a valid 10-digit mobile number to proceed.')
      return
    }
    setLoading(true)
    const fullPhone = `+91${cleaned}`
    try {
      await authApi.sendOtp(fullPhone)
      router.push({ pathname: '/auth/otp', params: { phone: fullPhone } })
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.response?.data?.message || 'Failed to send OTP. Please check your network and try again.'
      Alert.alert('Login Notice', detail)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = () => {
    if (!showInput) {
      setShowInput(true)
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0E1F" />
      
      {/* Absolute Background Gradient */}
      <LinearGradient
        colors={['#0B0E1F', '#1C1938', '#0F1836', '#080C17']}
        locations={[0, 0.4, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* ── Top Logo ── */}
        <Animated.View style={[styles.logoRow, { opacity: logoOpacity, transform: [{ translateY: logoTranslateY }] }]}>
          <Text style={styles.logoIP}>iP</Text>
          <View style={styles.logoTextWrap}>
            <Text style={styles.logoLine1}>Intercity</Text>
            <Text style={styles.logoLine2}>Partner</Text>
          </View>
        </Animated.View>

        {/* ── Bus Image ── */}
        <Animated.View style={[styles.busContainer, { opacity: busOpacity, transform: [{ translateY: busTranslateY }] }]}>
          <Image 
            source={require('../../assets/images/bus-3d.png')}
            style={styles.busImage}
            resizeMode="cover"
          />
        </Animated.View>

        {/* ── Bottom Content ── */}
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.bottomSection}
        >
          <Animated.View style={{ width: '100%', alignItems: 'center', opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }}>
            <Text style={styles.welcomeTitle}>Log In to Drive</Text>
            <Text style={styles.welcomeSub}>
              Enter your mobile number to continue
            </Text>

            {/* Input field */}
            <View style={[styles.inputRow, showInput && styles.inputRowActive]}>
              <View style={styles.dialCode}>
                <Text style={styles.flagEmoji}>🇮🇳</Text>
                <Text style={styles.dialCodeText}>+91</Text>
                <Feather name="chevron-down" size={14} color="#94A3B8" style={{ marginLeft: 2 }} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Mobile Number"
                placeholderTextColor="#64748B"
                keyboardType="phone-pad"
                value={phone}
                onFocus={() => setShowInput(true)}
                onChangeText={t => {
                  setShowInput(true)
                  setPhone(t.replace(/\D/g, '').slice(0, 10))
                }}
                maxLength={10}
                selectionColor="#3B82F6"
              />
            </View>

            {/* Continue / Login Button */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && { opacity: 0.6 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#2563EB', '#3B82F6']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.loginBtnGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginBtnText}>Continue</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Register Link */}
            <View style={styles.registerRow}>
              <Text style={styles.registerPrompt}>Don't have an account? </Text>
              <TouchableOpacity onPress={handleRegister} activeOpacity={0.7}>
                <Text style={styles.registerLink}>Register Driver</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>

        {/* ── Footer ── */}
        <Animated.View style={[styles.footerContainer, { opacity: footerOpacity, transform: [{ translateY: footerTranslateY }] }]}>
          <View style={styles.footer}>
            <TouchableOpacity style={styles.footerChip}>
              <Feather name="globe" size={14} color="#FFFFFF" />
              <Text style={styles.footerChipText}>English</Text>
              <Feather name="chevron-down" size={14} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity><Text style={styles.footerLink}>Help</Text></TouchableOpacity>
            <TouchableOpacity><Text style={styles.footerLink}>Terms</Text></TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0E1F' },
  safeArea: { flex: 1, justifyContent: 'space-between' },

  logoRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 16, zIndex: 10,
  },
  logoIP: {
    color: '#D4AF37', fontSize: 26, fontWeight: '900', fontStyle: 'italic', marginRight: 8,
  },
  logoTextWrap: { marginLeft: 2 },
  logoLine1: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', lineHeight: 20 },
  logoLine2: { color: '#E2E8F0', fontSize: 14, lineHeight: 16 },

  busContainer: {
    width: width,
    height: height * 0.35,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busImage: {
    width: '100%',
    height: '100%',
  },

  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  welcomeTitle: {
    color: '#FFFFFF', fontSize: 28, fontWeight: '800',
    textAlign: 'center', marginBottom: 6,
  },
  welcomeSub: {
    color: '#9CA3AF', fontSize: 14, lineHeight: 20, 
    textAlign: 'center', marginBottom: 24,
  },

  inputRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16, height: 56, marginBottom: 18, width: '100%',
  },
  inputRowActive: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59,130,246,0.08)',
    shadowColor: '#3B82F6', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  dialCode: {
    flexDirection: 'row', alignItems: 'center',
    marginRight: 12, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.15)',
    paddingRight: 12,
  },
  flagEmoji: { fontSize: 18, marginRight: 6 },
  dialCodeText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  input: { flex: 1, color: '#FFFFFF', fontSize: 17, fontWeight: '600' },

  loginBtn: { 
    width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 18,
    shadowColor: '#2563EB', shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  loginBtnGradient: { height: 54, alignItems: 'center', justifyContent: 'center' },
  loginBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

  registerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  registerPrompt: { color: '#94A3B8', fontSize: 14 },
  registerLink: { color: '#DCB260', fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },

  footerContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 24,
    width: '100%',
  },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 50,
    paddingHorizontal: 16, paddingVertical: 10, width: '100%',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  footerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, 
    paddingHorizontal: 10, paddingVertical: 4,
  },
  footerChipText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  footerLink: { color: '#94A3B8', fontSize: 13, fontWeight: '500' },
})

