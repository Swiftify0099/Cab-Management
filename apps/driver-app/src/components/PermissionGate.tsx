/**
 * PermissionGate Screen
 * ─────────────────────────────────────────────────────────────
 * Full-screen premium permission request UI shown at startup.
 * Displays each required permission with icon + status indicator.
 * Only unblocks the app once location (critical) is granted.
 */
import React, { useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  ScrollView,
  Platform,
} from 'react-native'
import * as SplashScreen from 'expo-splash-screen'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons, Feather } from '@expo/vector-icons'
import type { PermissionStatus } from '../hooks/useStartupPermissions'

// ─── Types ─────────────────────────────────────────────────────
interface PermItem {
  key: keyof Omit<PermissionStatus, 'allCriticalGranted' | 'isChecking'>
  icon: string
  iconLib: 'ionicons' | 'feather'
  title: string
  description: string
  required: boolean
}

const PERMISSIONS: PermItem[] = [
  {
    key: 'location',
    icon: 'location',
    iconLib: 'ionicons',
    title: 'Location Access',
    description: 'Required to match you with nearby passengers and track trips in real-time.',
    required: true,
  },
  {
    key: 'backgroundLocation',
    icon: 'navigate-circle',
    iconLib: 'ionicons',
    title: 'Background Location',
    description: 'Allows trip tracking even when the app is minimised.',
    required: false,
  },
  {
    key: 'notifications',
    icon: 'notifications',
    iconLib: 'ionicons',
    title: 'Push Notifications',
    description: 'Receive instant alerts for new ride requests and trip updates.',
    required: false,
  },
  {
    key: 'camera',
    icon: 'camera',
    iconLib: 'ionicons',
    title: 'Camera',
    description: 'Capture photos for KYC document verification and profile photo.',
    required: false,
  },
  {
    key: 'mediaLibrary',
    icon: 'images',
    iconLib: 'ionicons',
    title: 'Gallery Access',
    description: 'Upload KYC documents and profile photos from your gallery.',
    required: false,
  },
  {
    key: 'contacts',
    icon: 'people',
    iconLib: 'ionicons',
    title: 'Contacts',
    description: 'Used for emergency contact features and quick-dial passengers.',
    required: false,
  },
]

// ─── Status colour/icon helpers ────────────────────────────────
function statusColor(s: string) {
  if (s === 'granted') return '#10B981'
  if (s === 'denied')  return '#EF4444'
  if (s === 'unavailable') return '#64748B'
  return '#F59E0B'  // pending
}

function statusLabel(s: string) {
  if (s === 'granted')    return 'Granted'
  if (s === 'denied')     return 'Denied'
  if (s === 'unavailable') return 'N/A'
  return 'Pending'
}

function statusIcon(s: string) {
  if (s === 'granted')    return 'checkmark-circle'
  if (s === 'denied')     return 'close-circle'
  if (s === 'unavailable') return 'remove-circle'
  return 'time'
}

// ─── PermissionGate ─────────────────────────────────────────────
interface Props {
  status: PermissionStatus
  onRequestAll: () => Promise<void>
  isChecking: boolean
}

export function PermissionGate({ status, onRequestAll, isChecking }: Props) {
  // Entrance animation
  const fadeAnim  = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(40)).current
  const pulseAnim = useRef(new Animated.Value(1)).current

  // Hide splash screen as soon as the permission UI is ready to show
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {})
  }, [])

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
    ]).start()
  }, [])

  // Pulse the CTA button
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#050811" />
      <LinearGradient
        colors={['#050811', '#0A1020', '#060D1E']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Ambient glow blob */}
      <View style={styles.glowBlob1} />
      <View style={styles.glowBlob2} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Header icon */}
          <View style={styles.headerIconWrap}>
            <LinearGradient
              colors={['rgba(245,158,11,0.2)', 'rgba(245,158,11,0.06)']}
              style={styles.headerIconBg}
            >
              <Ionicons name="shield-checkmark" size={44} color="#F59E0B" />
            </LinearGradient>
          </View>

          {/* Title */}
          <Text style={styles.title}>App Permissions</Text>
          <Text style={styles.subtitle}>
            CabBooking needs a few permissions to deliver the best driver experience.
            {'\n'}Location access is required to get started.
          </Text>

          {/* Permission cards */}
          <View style={styles.cardList}>
            {PERMISSIONS.map((perm) => {
              const rawStatus = status[perm.key] as string
              const color = statusColor(rawStatus)

              return (
                <View key={perm.key} style={styles.card}>
                  {/* Left icon */}
                  <View style={[styles.iconCircle, { borderColor: color + '40', backgroundColor: color + '18' }]}>
                    <Ionicons
                      name={perm.icon as any}
                      size={22}
                      color={color}
                    />
                  </View>

                  {/* Text */}
                  <View style={styles.cardText}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.cardTitle}>{perm.title}</Text>
                      {perm.required && (
                        <View style={styles.requiredBadge}>
                          <Text style={styles.requiredText}>Required</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.cardDesc} numberOfLines={2}>
                      {perm.description}
                    </Text>
                  </View>

                  {/* Status */}
                  <View style={styles.statusWrap}>
                    <Ionicons
                      name={statusIcon(rawStatus) as any}
                      size={20}
                      color={color}
                    />
                    <Text style={[styles.statusText, { color }]}>
                      {statusLabel(rawStatus)}
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>

          {/* CTA Button */}
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[styles.ctaBtn, isChecking && styles.ctaBtnDisabled]}
              onPress={onRequestAll}
              disabled={isChecking}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGrad}
              >
                {isChecking ? (
                  <Text style={styles.ctaText}>Requesting permissions…</Text>
                ) : (
                  <>
                    <Ionicons name="lock-open" size={20} color="#fff" />
                    <Text style={styles.ctaText}>Grant Permissions</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.footNote}>
            You can manage these permissions anytime in your device Settings.
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050811' },

  glowBlob1: {
    position: 'absolute', top: -80, left: -60,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(245,158,11,0.07)',
  },
  glowBlob2: {
    position: 'absolute', bottom: 40, right: -80,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(56,189,248,0.05)',
  },

  scroll: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },

  // Header
  headerIconWrap: { alignItems: 'center', marginBottom: 24 },
  headerIconBg: {
    width: 90, height: 90, borderRadius: 45,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)',
  },

  title: {
    color: '#F1F5F9',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 10,
  },

  // Cards
  cardList: { gap: 10, marginBottom: 28 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },

  iconCircle: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },

  cardText: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  cardTitle: { color: '#F1F5F9', fontSize: 14, fontWeight: '700' },

  requiredBadge: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  requiredText: { color: '#F59E0B', fontSize: 9, fontWeight: '800' },

  cardDesc: { color: '#475569', fontSize: 12, lineHeight: 17 },

  statusWrap: { alignItems: 'center', gap: 3, minWidth: 50 },
  statusText: { fontSize: 10, fontWeight: '700' },

  // CTA
  ctaBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 16,
  },
  ctaBtnDisabled: { opacity: 0.6 },
  ctaGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 17,
    paddingHorizontal: 28,
  },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '900' },

  footNote: {
    color: '#334155',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
})
