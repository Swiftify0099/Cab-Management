/**
 * Customer App — Privacy & Security Center
 * Route: /profile/privacy
 * Feature 1: Customer Core Account.
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { settingsApi } from '../../src/api/client'
import { useTheme } from '../../src/contexts/ThemeContext'
import { useTranslation } from '../../src/i18n'
import {
  AppText,
  AppCard,
  AppSwitch,
  AppDivider,
} from '../../src/components/ui'

export default function PrivacySettingsScreen() {
  const { theme, isDark } = useTheme()
  const { t } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [locationSharing, setLocationSharing] = useState(true)
  const [familyTracking, setFamilyTracking] = useState(true)
  const [personalizedAds, setPersonalizedAds] = useState(false)

  const loadSettings = useCallback(async () => {
    try {
      const res = await settingsApi.getSettings()
      const s = res.data?.data || res.data
      if (s) {
        setLocationSharing(s.privacy_location_sharing ?? true)
        setFamilyTracking(s.privacy_family_trip_tracking ?? true)
        setPersonalizedAds(s.privacy_personalized_ads ?? false)
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const updateSetting = async (key: string, val: boolean) => {
    try {
      if (key === 'location') {
        setLocationSharing(val)
        await settingsApi.updateSettings({ privacy_location_sharing: val })
      } else if (key === 'family') {
        setFamilyTracking(val)
        await settingsApi.updateSettings({ privacy_family_trip_tracking: val })
      } else if (key === 'ads') {
        setPersonalizedAds(val)
        await settingsApi.updateSettings({ privacy_personalized_ads: val })
      }
    } catch {
      Alert.alert('Error', 'Could not update privacy setting')
      loadSettings()
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
          {t('settings.privacy', 'Privacy & Security')}
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Privacy Trust Card */}
          <View style={[styles.trustBanner, { backgroundColor: `${theme.colors.primary}12`, borderColor: `${theme.colors.primary}30` }]}>
            <Ionicons name="lock-closed" size={24} color={theme.colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <AppText variant="bodyS" bold style={{ color: theme.colors.primary }}>
                Your Privacy Is Protected
              </AppText>
              <AppText variant="small" color="secondary" style={{ marginTop: 2 }}>
                We never sell your personal data. Drivers only receive masked operational details during an active ride.
              </AppText>
            </View>
          </View>

          {/* Controls */}
          <AppText variant="subtitle" bold style={styles.sectionTitle}>
            Location & Tracking
          </AppText>
          <AppCard style={styles.card}>
            <AppSwitch
              label="Location Precision Sharing"
              sublabel="Share high-accuracy GPS for seamless driver pickup"
              value={locationSharing}
              onValueChange={(v) => updateSetting('location', v)}
            />
            <AppDivider />
            <AppSwitch
              label="Family Ride Tracking"
              sublabel="Allow authorized family organizer to view live trip status"
              value={familyTracking}
              onValueChange={(v) => updateSetting('family', v)}
            />
          </AppCard>

          <AppText variant="subtitle" bold style={styles.sectionTitle}>
            Data & Personalization
          </AppText>
          <AppCard style={styles.card}>
            <AppSwitch
              label="Personalized Recommendations"
              sublabel="Show tailored route suggestions and seasonal promotions"
              value={personalizedAds}
              onValueChange={(v) => updateSetting('ads', v)}
            />
          </AppCard>

          {/* Security Summary Card */}
          <AppText variant="subtitle" bold style={styles.sectionTitle}>
            Security Safeguards
          </AppText>
          <AppCard style={styles.card}>
            <View style={styles.safeguardRow}>
              <Feather name="shield" size={18} color={theme.colors.success} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <AppText variant="bodyS" bold>End-to-End OTP Verification</AppText>
                <AppText variant="small" color="muted">Every ride requires a unique start PIN</AppText>
              </View>
            </View>
            <AppDivider marginVertical={10} />
            <View style={styles.safeguardRow}>
              <Feather name="phone-call" size={18} color={theme.colors.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <AppText variant="bodyS" bold>Number Masking</AppText>
                <AppText variant="small" color="muted">Calls and chats with drivers are anonymous</AppText>
              </View>
            </View>
          </AppCard>
        </ScrollView>
      )}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  sectionTitle: { marginBottom: 10, marginLeft: 4, marginTop: 10 },
  card: { marginBottom: 16 },
  safeguardRow: { flexDirection: 'row', alignItems: 'center' },
})
