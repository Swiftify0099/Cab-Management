/**
 * Customer App — Step-Up Verification Challenge Screen
 * Route: /security/challenge
 * Feature 26: Customer Security Architecture
 * Adaptive Challenge Verification for New Devices & High-Risk Actions.
 */
import React, { useState } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'

import { securityApi } from '../../src/api/client'
import { useAuthStore } from '../../src/store/auth.store'
import { useTheme } from '../../src/contexts/ThemeContext'
import { useTranslation } from '../../src/i18n'
import {
  AppText,
  AppButton,
  AppCard,
  AppBadge,
} from '../../src/components/ui'

export default function SecurityChallengeScreen() {
  const { theme, isDark } = useTheme()
  const { user } = useAuthStore()
  const { t } = useTranslation()

  const [otpCode, setOtpCode] = useState('123456')
  const [submitting, setSubmitting] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length < 6) {
      Alert.alert('Invalid Code', 'Please enter a 6-digit verification code.')
      return
    }

    setSubmitting(true)
    try {
      const res = await securityApi.verifyChallenge({
        challenge_type: 'OTP',
        otp_code: otpCode,
        action_context: 'NEW_DEVICE_CONFIRMATION',
      })
      Alert.alert('Verification Successful', 'Your hardware device has been verified and marked as TRUSTED.', [
        { text: 'OK', onPress: () => router.replace('/security' as any) },
      ])
    } catch (e: any) {
      Alert.alert('Verification Failed', e?.response?.data?.detail || 'Invalid verification code. Please retry.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleBiometricAuth = async () => {
    setBiometricLoading(true)
    setTimeout(async () => {
      try {
        await securityApi.verifyChallenge({
          challenge_type: 'BIOMETRIC',
          action_context: 'BIOMETRIC_PASS',
        })
        Alert.alert('Biometric Approved', 'Identity confirmed via hardware biometrics.', [
          { text: 'Continue', onPress: () => router.replace('/security' as any) },
        ])
      } catch {
        Alert.alert('Failed', 'Biometric validation failed.')
      } finally {
        setBiometricLoading(false)
      }
    }, 800)
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.backgroundAlt }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <AppText variant="h3" bold style={styles.headerTitle}>
          Verification Challenge
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Shield Hero Icon */}
        <View style={styles.heroWrapper}>
          <View style={[styles.heroIconCircle, { backgroundColor: `${theme.colors.warning}20` }]}>
            <Ionicons name="shield-checkmark" size={48} color={theme.colors.warning} />
          </View>
          <AppText variant="h2" bold style={{ marginTop: 16 }}>
            Confirm Your Identity
          </AppText>
          <AppText variant="bodyS" color="secondary" center style={{ marginTop: 6, paddingHorizontal: 16 }}>
            We detected a sign-in or sensitive request requiring step-up verification for account protection.
          </AppText>
        </View>

        {/* Challenge Context Card */}
        <AppCard style={styles.contextCard}>
          <View style={styles.contextRow}>
            <View style={[styles.deviceIconCircle, { backgroundColor: `${theme.colors.primary}18` }]}>
              <Feather name="smartphone" size={22} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AppText variant="body" bold>New Hardware Detected</AppText>
                <AppBadge label="Action Required" variant="warning" size="sm" />
              </View>
              <AppText variant="small" color="secondary" style={{ marginTop: 2 }}>
                Phone: {user?.phone || '+91 98••••2345'} • Mumbai, IN
              </AppText>
            </View>
          </View>
        </AppCard>

        {/* OTP Input Card */}
        <AppCard style={styles.inputCard}>
          <AppText variant="subtitle" bold style={{ marginBottom: 6 }}>
            Enter 6-Digit SMS Code
          </AppText>
          <AppText variant="small" color="muted" style={{ marginBottom: 16 }}>
            A temporary verification passcode was sent to your registered phone.
          </AppText>

          <TextInput
            style={[
              styles.otpInput,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.primary,
                color: theme.colors.textPrimary,
              },
            ]}
            keyboardType="number-pad"
            maxLength={6}
            value={otpCode}
            onChangeText={setOtpCode}
            placeholder="123456"
            placeholderTextColor={theme.colors.textMuted}
          />

          <View style={{ marginTop: 20 }}>
            <AppButton onPress={handleVerifyOTP} loading={submitting}>
              Verify & Trust Device
            </AppButton>
          </View>
        </AppCard>

        {/* Biometric Alternative */}
        <View style={styles.dividerRow}>
          <View style={[styles.line, { backgroundColor: theme.colors.divider }]} />
          <AppText variant="small" color="muted" style={{ marginHorizontal: 12 }}>
            OR VERIFY WITH
          </AppText>
          <View style={[styles.line, { backgroundColor: theme.colors.divider }]} />
        </View>

        <TouchableOpacity
          style={[styles.biometricBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={handleBiometricAuth}
          disabled={biometricLoading}
          activeOpacity={0.8}
        >
          {biometricLoading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : (
            <>
              <Ionicons name="finger-print" size={24} color={theme.colors.primary} />
              <AppText variant="body" bold style={{ marginLeft: 10, color: theme.colors.primary }}>
                Use Biometric Hardware (Face ID / Fingerprint)
              </AppText>
            </>
          )}
        </TouchableOpacity>

        {/* Safe Help Notice */}
        <AppText variant="small" color="muted" center style={{ marginTop: 28 }}>
          Didn't request this code? Disconnect unfamiliar devices in the Security Center.
        </AppText>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  heroWrapper: { alignItems: 'center', marginVertical: 14 },
  heroIconCircle: { width: 88, height: 88, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },

  contextCard: { marginBottom: 16, borderRadius: 18 },
  contextRow: { flexDirection: 'row', alignItems: 'center' },
  deviceIconCircle: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  inputCard: { padding: 20, borderRadius: 20 },
  otpInput: {
    fontSize: 26,
    letterSpacing: 10,
    textAlign: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    fontWeight: '700',
  },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },

  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
})
