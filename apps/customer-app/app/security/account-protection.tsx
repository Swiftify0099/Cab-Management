/**
 * Customer App — Account Protection & Recovery Screen
 * Route: /security/account-protection
 * Feature 26: Customer Security Architecture
 * Safe, Automated Recovery Workflow for Temporarily Restricted / Locked Accounts.
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
  AppDivider,
} from '../../src/components/ui'

export default function AccountProtectionScreen() {
  const { theme, isDark } = useTheme()
  const { user } = useAuthStore()
  const { t } = useTranslation()

  const [phone, setPhone] = useState(user?.phone || '+919876543210')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [otpCode, setOtpCode] = useState('123456')
  const [recovering, setRecovering] = useState(false)

  const handleRecoverAccount = async () => {
    if (!phone || !otpCode) {
      Alert.alert('Required Fields', 'Please enter your registered phone and the 6-digit recovery OTP.')
      return
    }

    setRecovering(true)
    try {
      const res = await securityApi.recoverAccount({
        phone: phone.trim(),
        otp_code: otpCode.trim(),
        emergency_contact_phone: emergencyPhone.trim() || undefined,
      })

      Alert.alert(
        'Account Restored',
        'Your account security hold has been lifted and your access is fully restored.',
        [
          {
            text: 'Return to App',
            onPress: () => router.replace('/(tabs)/profile' as any),
          },
        ]
      )
    } catch (e: any) {
      Alert.alert(
        'Recovery Failed',
        e?.response?.data?.detail || 'Could not verify recovery credentials. Please retry or contact support.'
      )
    } finally {
      setRecovering(false)
    }
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
          Account Protection
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Protection Shield Hero */}
        <View style={styles.heroWrapper}>
          <View style={[styles.heroIconCircle, { backgroundColor: `${theme.colors.primary}18` }]}>
            <Ionicons name="lock-closed" size={46} color={theme.colors.primary} />
          </View>
          <AppText variant="h2" bold style={{ marginTop: 16 }}>
            Account Temporarily Protected
          </AppText>
          <AppText variant="bodyS" color="secondary" center style={{ marginTop: 6, paddingHorizontal: 12 }}>
            To safeguard your identity, payment instruments, and trip privacy, some account actions have been placed on temporary hold.
          </AppText>
        </View>

        {/* Safe Explanation Box */}
        <AppCard style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle" size={22} color={theme.colors.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <AppText variant="bodyS" bold>
                Why is my account protected?
              </AppText>
              <AppText variant="small" color="secondary" style={{ marginTop: 2 }}>
                We detected an unfamiliar sign-in location, multiple rapid login attempts, or an unverified hardware session.
              </AppText>
            </View>
          </View>
        </AppCard>

        {/* Recovery Form */}
        <AppCard style={styles.formCard}>
          <AppText variant="subtitle" bold style={{ marginBottom: 4 }}>
            Multi-Factor Recovery
          </AppText>
          <AppText variant="small" color="muted" style={{ marginBottom: 16 }}>
            Enter your credentials to verify account ownership.
          </AppText>

          {/* Registered Phone */}
          <AppText variant="bodyS" semibold style={styles.inputLabel}>
            Registered Phone Number
          </AppText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.textPrimary,
              },
            ]}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+91 98765 43210"
            placeholderTextColor={theme.colors.textMuted}
          />

          {/* Emergency Guardian Contact Phone (Optional secondary) */}
          <AppText variant="bodyS" semibold style={styles.inputLabel}>
            Guardian / Emergency Contact (Optional)
          </AppText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.textPrimary,
              },
            ]}
            value={emergencyPhone}
            onChangeText={setEmergencyPhone}
            keyboardType="phone-pad"
            placeholder="+91 98765 43211"
            placeholderTextColor={theme.colors.textMuted}
          />

          {/* 6-Digit SMS Recovery Code */}
          <AppText variant="bodyS" semibold style={styles.inputLabel}>
            6-Digit Recovery Passcode
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
            value={otpCode}
            onChangeText={setOtpCode}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="123456"
            placeholderTextColor={theme.colors.textMuted}
          />

          <View style={{ marginTop: 22 }}>
            <AppButton onPress={handleRecoverAccount} loading={recovering}>
              Verify & Restore Access
            </AppButton>
          </View>
        </AppCard>

        {/* Secondary Action: Contact Support */}
        <TouchableOpacity
          style={[styles.supportBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={() => router.push('/support' as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="headset-outline" size={20} color={theme.colors.textPrimary} />
          <AppText variant="bodyS" bold style={{ marginLeft: 8 }}>
            Need Help? Contact 24/7 Security Operations Hub
          </AppText>
        </TouchableOpacity>
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

  infoCard: { padding: 14, borderRadius: 16, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start' },

  formCard: { padding: 20, borderRadius: 20, marginBottom: 16 },
  inputLabel: { marginBottom: 6, marginTop: 10 },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
  },
  otpInput: {
    fontSize: 22,
    letterSpacing: 8,
    textAlign: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    fontWeight: '700',
  },

  supportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 8,
  },
})
