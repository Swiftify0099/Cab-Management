/**
 * Customer App — Notification Preferences Screen
 * Route: /profile/notifications
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
  AppBadge,
} from '../../src/components/ui'

export default function NotificationsScreen() {
  const { theme, isDark } = useTheme()
  const { t } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [rideUpdates, setRideUpdates] = useState(true)
  const [driverArrival, setDriverArrival] = useState(true)
  const [promotions, setPromotions] = useState(true)
  const [securityAlerts, setSecurityAlerts] = useState(true)

  const loadSettings = useCallback(async () => {
    try {
      const res = await settingsApi.getSettings()
      const s = res.data?.data || res.data
      if (s) {
        setRideUpdates(s.notifications_ride_updates ?? true)
        setDriverArrival(s.notifications_driver_arrival ?? true)
        setPromotions(s.notifications_promotions ?? true)
        setSecurityAlerts(s.notifications_security_alerts ?? true)
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
      if (key === 'ride') {
        setRideUpdates(val)
        await settingsApi.updateSettings({ notifications_ride_updates: val })
      } else if (key === 'arrival') {
        setDriverArrival(val)
        await settingsApi.updateSettings({ notifications_driver_arrival: val })
      } else if (key === 'promotions') {
        setPromotions(val)
        await settingsApi.updateSettings({ notifications_promotions: val })
      }
    } catch {
      Alert.alert('Error', 'Could not update notification setting')
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
          {t('settings.notifications', 'Notification Preferences')}
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Trip & Booking Updates */}
          <AppText variant="subtitle" bold style={styles.sectionTitle}>
            Ride & Booking Alerts
          </AppText>
          <AppCard style={styles.card}>
            <AppSwitch
              label="Trip Status Updates"
              sublabel="Driver assigned, trip started, and completion receipts"
              value={rideUpdates}
              onValueChange={(v) => updateSetting('ride', v)}
            />
            <AppDivider />
            <AppSwitch
              label="Driver Arrival Proximity"
              sublabel="Real-time alert when driver arrives at pickup"
              value={driverArrival}
              onValueChange={(v) => updateSetting('arrival', v)}
            />
          </AppCard>

          {/* Offers & Marketing */}
          <AppText variant="subtitle" bold style={styles.sectionTitle}>
            Discounts & Marketing
          </AppText>
          <AppCard style={styles.card}>
            <AppSwitch
              label="Promotions & Coupons"
              sublabel="Special discounts, cashback alerts, and seasonal offers"
              value={promotions}
              onValueChange={(v) => updateSetting('promotions', v)}
            />
          </AppCard>

          {/* Safety Notices (Mandatory) */}
          <AppText variant="subtitle" bold style={styles.sectionTitle}>
            Security & Account Notices
          </AppText>
          <AppCard style={styles.card}>
            <View style={styles.mandatoryRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <AppText variant="body" bold>Safety & SOS Alerts</AppText>
                  <AppBadge label="Required" variant="warning" size="sm" />
                </View>
                <AppText variant="small" color="muted" style={{ marginTop: 2 }}>
                  Critical security alerts and emergency notices cannot be disabled
                </AppText>
              </View>
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
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
  sectionTitle: { marginBottom: 10, marginLeft: 4, marginTop: 12 },
  card: { marginBottom: 16 },
  mandatoryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
})
