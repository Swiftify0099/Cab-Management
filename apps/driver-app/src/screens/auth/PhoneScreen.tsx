/**
 * Multi-Service Partner App — Unified Login & Auth Entry Screen
 * Exported from src/screens/auth/PhoneScreen.tsx
 */
import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  Image,
  Animated,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { authApi } from '../../api/client'

const PARTNER_SERVICES = [
  { id: 'CAB', label: 'Cabs & City Rides', icon: '🚖', perk: 'High Daily Trip Volume' },
  { id: 'PARCEL', label: 'Parcel Delivery', icon: '📦', perk: 'Same-Day Fast Payouts' },
  { id: 'TRANSPORT', label: 'Freight Logistics', icon: '🚚', perk: 'Commercial Heavy Cargo' },
  { id: 'PACKERS_MOVERS', label: 'Packers & Movers', icon: '🏠', perk: 'High-Value Shifting Orders' },
  { id: 'AIRPORT', label: 'Airport Transfers', icon: '✈️', perk: 'Guaranteed Airport Queues' },
  { id: 'CORPORATE', label: 'Corporate Commute', icon: '🏢', perk: 'Fixed Monthly Rosters' },
  { id: 'CARPOOL', label: 'Corridor Carpool', icon: '👥', perk: 'Shared Route Optimization' },
  { id: 'HOSPITALITY', label: 'Hotel Chauffeur', icon: '👔', perk: 'VIP 5-Star Hotel Guests' },
]

export default function DriverPhoneScreen() {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedServiceIndex, setSelectedServiceIndex] = useState(0)

  // Animation values
  const headerOpacity = useRef(new Animated.Value(0)).current
  const heroScale = useRef(new Animated.Value(0.92)).current
  const heroOpacity = useRef(new Animated.Value(0)).current
  const cardTranslateY = useRef(new Animated.Value(30)).current
  const cardOpacity = useRef(new Animated.Value(0)).current
  const shakeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.stagger(150, [
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(heroOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.spring(heroScale, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(cardTranslateY, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      ]),
    ]).start()
  }, [])

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 70, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 70, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 5, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start()
  }

  const handleLogin = async () => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length < 10) {
      triggerShake()
      Alert.alert(
        'Invalid Mobile Number',
        'Please enter a valid 10-digit mobile number to access your Partner Account.'
      )
      return
    }

    setLoading(true)
    const fullPhone = `+91${cleaned}`
    try {
      await authApi.sendOtp(fullPhone)
      router.push({ pathname: '/auth/otp', params: { phone: fullPhone } })
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Unable to send verification OTP. Please verify your connection and retry.'
      Alert.alert('Partner Authentication', detail)
    } finally {
      setLoading(false)
    }
  }

  const activeService = PARTNER_SERVICES[selectedServiceIndex]

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#070A14" />

      <LinearGradient
        colors={['#070A14', '#0E172F', '#091024', '#050811']}
        locations={[0, 0.35, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.glowOrb1} />
      <View style={styles.glowOrb2} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Top Header ── */}
            <Animated.View style={[styles.headerRow, { opacity: headerOpacity }]}>
              <View style={styles.brandBadgeWrap}>
                <Image
                  source={require('../../../assets/icon.png')}
                  style={styles.brandIconMini}
                  resizeMode="cover"
                />
                <View>
                  <Text style={styles.brandNameText}>CabBooking</Text>
                  <View style={styles.partnerBadgeTag}>
                    <Text style={styles.partnerBadgeTagText}>PARTNER PLATFORM</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.supportChip}
                onPress={() =>
                  Alert.alert(
                    '24x7 Partner Helpline',
                    'Dedicated Toll-Free Support for Fleet Owners & Drivers:\n\n📞 1800-CAB-PARTNER\n✉️ partner-support@cabbooking.com'
                  )
                }
                activeOpacity={0.8}
              >
                <Feather name="phone-call" size={13} color="#38BDF8" />
              </TouchableOpacity>
            </Animated.View>

            {/* ── Multi-Service Hero Platform Showcase ── */}
            <Animated.View
              style={[
                styles.heroBannerWrap,
                {
                  opacity: heroOpacity,
                  transform: [{ scale: heroScale }],
                },
              ]}
            >
              <Image
                source={require('../../../assets/images/partner-multi-hero.jpg')}
                style={styles.heroImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(7, 10, 20, 0.95)']}
                locations={[0.4, 1]}
                style={StyleSheet.absoluteFill}
              />

              <View style={styles.heroOverlayContent}>
                <View style={styles.heroLivePill}>
                  <View style={styles.livePulseDot} />
                  <Text style={styles.heroLivePillText}>9 MOBILITY & FREIGHT VERTICALS</Text>
                </View>
                <Text style={styles.heroTitleText}>One Partner App, Endless Earnings</Text>
                <Text style={styles.heroSubText}>
                  {activeService.icon} {activeService.label} • {activeService.perk}
                </Text>
              </View>
            </Animated.View>

            {/* ── Multi-Service Quick Selector Ribbon ── */}
            <View style={styles.servicesRibbon}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.servicesRibbonContent}
              >
                {PARTNER_SERVICES.map((s, idx) => {
                  const isSelected = idx === selectedServiceIndex
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[
                        styles.serviceChip,
                        isSelected && styles.serviceChipSelected,
                      ]}
                      onPress={() => setSelectedServiceIndex(idx)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.serviceChipIcon}>{s.icon}</Text>
                      <Text
                        style={[
                          styles.serviceChipLabel,
                          isSelected && styles.serviceChipLabelSelected,
                        ]}
                      >
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            </View>

            {/* ── Floating Glassmorphic Login Card ── */}
            <Animated.View
              style={[
                styles.loginCard,
                {
                  opacity: cardOpacity,
                  transform: [{ translateY: cardTranslateY }, { translateX: shakeAnim }],
                },
              ]}
            >
              <Text style={styles.loginCardTitle}>Partner Portal Access</Text>
              <Text style={styles.loginCardSubtitle}>
                Enter your mobile number to log in or register as a new fleet/service partner.
              </Text>

              {/* Phone Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>MOBILE NUMBER</Text>
                <View
                  style={[
                    styles.inputFieldWrap,
                    phone.length === 10 && styles.inputFieldWrapValid,
                  ]}
                >
                  <View style={styles.dialCodeBox}>
                    <Text style={styles.flagIcon}>🇮🇳</Text>
                    <Text style={styles.dialCodeText}>+91</Text>
                  </View>

                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter 10-digit number"
                    placeholderTextColor="#64748B"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={t => setPhone(t.replace(/\D/g, '').slice(0, 10))}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                    selectionColor="#3B82F6"
                  />

                  {phone.length === 10 && (
                    <View style={styles.checkBadge}>
                      <Feather name="check" size={14} color="#10B981" />
                    </View>
                  )}
                </View>
              </View>

              {/* Primary Button */}
              <TouchableOpacity
                style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={['#2563EB', '#1D4ED8']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.primaryBtnGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <View style={styles.primaryBtnContent}>
                      <Text style={styles.primaryBtnText}>Continue with OTP</Text>
                      <Feather name="arrow-right" size={18} color="#FFFFFF" />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Seamless Auto-Registration Notice */}
              <View style={styles.registerRow}>
                <Feather name="check-circle" size={13} color="#10B981" style={{ marginRight: 6 }} />
                <Text style={styles.registerPromptText}>
                  New Partner? Enter mobile number above for instant registration.
                </Text>
              </View>
            </Animated.View>

            {/* ── Trust & Security Badges ── */}
            <View style={styles.footerWrap}>
              <View style={styles.trustBadgeRow}>
                <Feather name="shield" size={13} color="#10B981" />
                <Text style={styles.trustBadgeText}>
                  Bank-Grade Encryption • Instant UPI Settlements
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070A14' },
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
  glowOrb1: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
  },
  glowOrb2: {
    position: 'absolute',
    bottom: 40,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  brandBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIconMini: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  brandNameText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  partnerBadgeTag: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  partnerBadgeTagText: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '800',
  },
  supportChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBannerWrap: {
    width: '100%',
    height: 190,
    borderRadius: 22,
    overflow: 'hidden',
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    position: 'relative',
    backgroundColor: '#0B1226',
  },
  heroImage: { width: '100%', height: '100%' },
  heroOverlayContent: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    right: 14,
  },
  heroLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    marginBottom: 6,
    gap: 6,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  heroLivePillText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '800',
  },
  heroTitleText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  heroSubText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  servicesRibbon: { marginVertical: 14 },
  servicesRibbonContent: { gap: 8, paddingRight: 10 },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6,
  },
  serviceChipSelected: {
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    borderColor: '#3B82F6',
  },
  serviceChipIcon: { fontSize: 14 },
  serviceChipLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  serviceChipLabelSelected: { color: '#FFFFFF', fontWeight: '700' },
  loginCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  loginCardTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  loginCardSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 20,
  },
  inputContainer: { marginBottom: 18 },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  inputFieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    height: 56,
    paddingHorizontal: 14,
  },
  inputFieldWrapValid: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  dialCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.15)',
    paddingRight: 10,
    marginRight: 10,
  },
  flagIcon: { fontSize: 18, marginRight: 6 },
  dialCodeText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  textInput: { flex: 1, color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: { borderRadius: 16, overflow: 'hidden' },
  primaryBtnGradient: { height: 54, alignItems: 'center', justifyContent: 'center' },
  primaryBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  footerWrap: { marginTop: 24, alignItems: 'center', gap: 10 },
  trustBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trustBadgeText: { color: '#94A3B8', fontSize: 11.5, fontWeight: '600' },
  registerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  registerPromptText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
})
