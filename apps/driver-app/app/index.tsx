/**
 * Multi-Service Partner App — Animated Flash / Splash Launch Screen
 * Unified portal for Cabs, Parcels, Freight, Packers & Movers, Airport & Corporate Mobility.
 */
import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Image,
  StatusBar,
} from 'react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api } from '../src/api/client'

const { width, height } = Dimensions.get('window')

export default function MultiServiceFlashScreen() {
  const router = useRouter()
  const [bootStatus, setBootStatus] = useState('Initializing Partner Ecosystem...')

  // Animation drivers
  const logoScale = useRef(new Animated.Value(0.75)).current
  const logoOpacity = useRef(new Animated.Value(0)).current
  const pulseRing1 = useRef(new Animated.Value(0)).current
  const pulseRing2 = useRef(new Animated.Value(0)).current
  const textOpacity = useRef(new Animated.Value(0)).current
  const textTranslateY = useRef(new Animated.Value(20)).current
  const servicesOpacity = useRef(new Animated.Value(0)).current
  const progressAnim = useRef(new Animated.Value(0)).current
  const footerOpacity = useRef(new Animated.Value(0)).current
  const screenFade = useRef(new Animated.Value(1)).current

  useEffect(() => {
    let isMounted = true

    // 1. Concentric Pulse Animation Loop
    const startPulse = () => {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseRing1, {
              toValue: 1,
              duration: 2200,
              useNativeDriver: true,
            }),
            Animated.timing(pulseRing1, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.delay(900),
            Animated.timing(pulseRing2, {
              toValue: 1,
              duration: 2200,
              useNativeDriver: true,
            }),
            Animated.timing(pulseRing2, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start()
    }

    // 2. Entrance Animation Sequence
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(servicesOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(footerOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start()

    startPulse()

    // 3. Boot State & Routing Logic
    const initializeAuth = async () => {
      const startTime = Date.now()
      let destination = '/auth/phone'

      try {
        if (isMounted) setBootStatus('Connecting to Multi-Service Dispatch Grid...')
        const token = await SecureStore.getItemAsync('access_token')

        if (token) {
          if (isMounted) setBootStatus('Loading Partner Profile & Verticals...')
          if (token !== 'demo_token') {
            try {
              await api.post('/driver/claim-driver-role', {})
            } catch {}
          }
          // Check if driver profile onboarding is complete
          let isProfileComplete = false
          try {
            const onboardingRes = await api.get('/driver/me/onboarding-status')
            const obData = onboardingRes.data?.data || onboardingRes.data
            if (obData && obData.profile === true) {
              isProfileComplete = true
            }
          } catch {
            isProfileComplete = false
          }

          if (!isProfileComplete) {
            destination = '/onboarding/profile'
          } else {
            const srvStr = await AsyncStorage.getItem('partner_selected_services')
            if (srvStr) {
              try {
                const srvList = JSON.parse(srvStr)
                if (Array.isArray(srvList) && srvList.length === 1 && srvList[0] === 'HOTEL') {
                  destination = '/hotel-partner'
                } else {
                  destination = '/(tabs)'
                }
              } catch {
                destination = '/(tabs)'
              }
            } else {
              destination = '/(tabs)'
            }
          }
        }
      } catch (err) {
        console.warn('[FlashScreen] Auth check notice:', err)
      }

      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 1500 - elapsed)
      setTimeout(() => {
        if (!isMounted) return
        setBootStatus('Partner Portal Ready')

        Animated.timing(screenFade, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }).start(() => {
          if (isMounted) {
            router.replace(destination as any)
          }
        })
      }, remaining)
    }

    initializeAuth()

    return () => {
      isMounted = false
    }
  }, [])

  // Pulse ring interpolations
  const ring1Scale = pulseRing1.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.3],
  })
  const ring1Opacity = pulseRing1.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.6, 0.3, 0],
  })

  const ring2Scale = pulseRing2.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.7],
  })
  const ring2Opacity = pulseRing2.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.5, 0.2, 0],
  })

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  })

  const partnerVerticals = [
    { icon: '🚖', label: 'Rides' },
    { icon: '📦', label: 'Parcels' },
    { icon: '🚚', label: 'Freight' },
    { icon: '✈️', label: 'Airport' },
    { icon: '🏢', label: 'Corporate' },
    { icon: '🏠', label: 'Packers' },
  ]

  return (
    <Animated.View style={[styles.container, { opacity: screenFade }]}>
      <StatusBar barStyle="light-content" backgroundColor="#070A14" />

      {/* Deep Luxury Gradient */}
      <LinearGradient
        colors={['#070A14', '#0D1730', '#091024', '#04070F']}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient background glow orbs */}
      <View style={styles.glowOrbTop} />
      <View style={styles.glowOrbBottom} />

      {/* Center Branding Showcase */}
      <View style={styles.centerSection}>
        {/* Animated Pulse Rings */}
        <Animated.View
          style={[
            styles.pulseRing,
            {
              transform: [{ scale: ring1Scale }],
              opacity: ring1Opacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.pulseRingSecondary,
            {
              transform: [{ scale: ring2Scale }],
              opacity: ring2Opacity,
            },
          ]}
        />

        {/* Logo Badge */}
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Image
            source={require('../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="cover"
          />
        </Animated.View>

        {/* Text Content */}
        <Animated.View
          style={[
            styles.textWrapper,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          {/* Multi-Service Partner Badge */}
          <View style={styles.badgePill}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgePillText}>MULTI-SERVICE PARTNER PLATFORM</Text>
          </View>

          <Text style={styles.brandTitle}>CabBooking Partner</Text>
          <Text style={styles.brandSubtitle}>ONE APP • ALL VERTICALS</Text>

          {/* Service Vertical Badges Carousel */}
          <Animated.View style={[styles.servicesRow, { opacity: servicesOpacity }]}>
            {partnerVerticals.map((v, i) => (
              <View key={i} style={styles.servicePill}>
                <Text style={styles.serviceIcon}>{v.icon}</Text>
                <Text style={styles.serviceLabel}>{v.label}</Text>
              </View>
            ))}
          </Animated.View>
        </Animated.View>
      </View>

      {/* Bottom Progress & Info */}
      <Animated.View style={[styles.bottomSection, { opacity: footerOpacity }]}>
        <View style={styles.progressBarBg}>
          <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
        </View>

        <Text style={styles.bootStatusText}>{bootStatus}</Text>

        <View style={styles.securityRow}>
          <Text style={styles.securityIcon}>🛡️</Text>
          <Text style={styles.securityText}>Unified Mobility & Logistics Partner Network</Text>
        </View>
      </Animated.View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070A14',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 50,
  },
  glowOrbTop: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(37, 99, 235, 0.16)',
  },
  glowOrbBottom: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  pulseRingSecondary: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  logoWrapper: {
    width: 130,
    height: 130,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
    backgroundColor: '#0B0E1F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  textWrapper: {
    alignItems: 'center',
    marginTop: 24,
    width: '100%',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  badgePillText: {
    color: '#FBBF24',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  brandSubtitle: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 3.5,
    marginTop: 3,
    textAlign: 'center',
  },
  servicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    maxWidth: 340,
  },
  servicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 4,
  },
  serviceIcon: {
    fontSize: 12,
  },
  serviceLabel: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
  },
  bottomSection: {
    width: '85%',
    alignItems: 'center',
    paddingBottom: 10,
  },
  progressBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
  bootStatusText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 16,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  securityIcon: {
    fontSize: 12,
  },
  securityText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
})
