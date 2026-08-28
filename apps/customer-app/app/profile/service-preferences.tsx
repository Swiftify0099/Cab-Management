/**
 * Phase 10 — Customer Service Preferences
 * Route: /profile/service-preferences
 * Lets customers personalise their default service mode, preferred services,
 * ladies-only toggle, and communication preferences. Settings are persisted
 * to the backend via PATCH /profile and surfaced on the home screen.
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useTheme } from '../../src/contexts/ThemeContext'
import { useTranslation } from '../../src/i18n'
import { AppText, AppButton, AppCard } from '../../src/components/ui'
import { profileApi } from '../../src/api/client'

const SERVICE_OPTIONS = [
  { id: 'ride',        label: 'City Cab',          icon: 'car-sport',     iconLib: 'Ionicons' },
  { id: 'parcel',      label: 'Parcel',             icon: 'package',       iconLib: 'Feather' },
  { id: 'carpool',     label: 'Intercity Carpool',  icon: 'people',        iconLib: 'Ionicons' },
  { id: 'outstation',  label: 'Outstation',         icon: 'road-variant',  iconLib: 'MaterialCommunity' },
  { id: 'hotel',       label: 'Stay & Hotel',       icon: 'business',      iconLib: 'Ionicons' },
  { id: 'airport',     label: 'Airport Transfer',   icon: 'airplane',      iconLib: 'Ionicons' },
  { id: 'transport',   label: 'Goods Transport',    icon: 'bus',           iconLib: 'Ionicons' },
  { id: 'moving',      label: 'Packers & Movers',   icon: 'truck-fast',    iconLib: 'MaterialCommunity' },
  { id: 'rental',      label: 'Car Rental',         icon: 'key',           iconLib: 'Ionicons' },
  { id: 'corporate',   label: 'Corporate',          icon: 'briefcase',     iconLib: 'Ionicons' },
] as const

type ServiceId = typeof SERVICE_OPTIONS[number]['id']

function ServiceIcon({ icon, iconLib, size = 22, color }: { icon: string; iconLib: string; size?: number; color: string }) {
  if (iconLib === 'Feather') return <Feather name={icon as any} size={size} color={color} />
  if (iconLib === 'MaterialCommunity') return <MaterialCommunityIcons name={icon as any} size={size} color={color} />
  return <Ionicons name={icon as any} size={size} color={color} />
}

export default function ServicePreferencesScreen() {
  const { theme, isDark } = useTheme()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [defaultService, setDefaultService] = useState<ServiceId>('ride')
  const [pinnedServices, setPinnedServices] = useState<ServiceId[]>(['ride', 'carpool', 'parcel'])
  const [ladiesOnly, setLadiesOnly] = useState(false)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [arrivalAlerts, setArrivalAlerts] = useState(true)
  const [marketingEmails, setMarketingEmails] = useState(false)

  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true)
      const res = await profileApi.getProfile()
      const prefs = res?.data?.data?.service_preferences || {}
      if (prefs.default_service) setDefaultService(prefs.default_service)
      if (prefs.pinned_services?.length) setPinnedServices(prefs.pinned_services)
      if (typeof prefs.ladies_only === 'boolean') setLadiesOnly(prefs.ladies_only)
      if (typeof prefs.push_notifications === 'boolean') setPushNotifications(prefs.push_notifications)
      if (typeof prefs.arrival_alerts === 'boolean') setArrivalAlerts(prefs.arrival_alerts)
      if (typeof prefs.marketing_emails === 'boolean') setMarketingEmails(prefs.marketing_emails)
    } catch {
      // use defaults
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPreferences() }, [loadPreferences])

  const handleSave = async () => {
    setSaving(true)
    try {
      await profileApi.updateProfile({
        service_preferences: {
          default_service:    defaultService,
          pinned_services:    pinnedServices,
          ladies_only:        ladiesOnly,
          push_notifications: pushNotifications,
          arrival_alerts:     arrivalAlerts,
          marketing_emails:   marketingEmails,
        },
      } as any)
      Alert.alert('Saved!', 'Preferences updated.', [{ text: 'OK', onPress: () => router.back() }])
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const togglePinned = (id: ServiceId) => {
    setPinnedServices(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            style={{ width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={18} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <AppText variant="title" bold>Service Preferences</AppText>
            <AppText variant="caption" color="muted">Personalise your travel experience</AppText>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

          {/* Default Service */}
          <AppText style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 20, marginBottom: 8 }}>
            Default Service
          </AppText>
          <AppCard style={{ padding: 12 }}>
            <AppText variant="caption" color="muted" style={{ marginBottom: 10 }}>
              Opens when you tap "Book Now" from home.
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {SERVICE_OPTIONS.map(opt => {
                const active = defaultService === opt.id
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 7,
                      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
                      backgroundColor: active ? `${theme.colors.primary}18` : theme.colors.surface,
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                    }}
                    onPress={() => setDefaultService(opt.id)}
                  >
                    <ServiceIcon icon={opt.icon} iconLib={opt.iconLib} size={16} color={active ? theme.colors.primary : theme.colors.textSecondary} />
                    <AppText variant="caption" bold style={{ color: active ? theme.colors.primary : theme.colors.textPrimary }}>
                      {opt.label}
                    </AppText>
                    {active && <Ionicons name="checkmark-circle" size={14} color={theme.colors.primary} />}
                  </TouchableOpacity>
                )
              })}
            </View>
          </AppCard>

          {/* Pinned Services */}
          <AppText style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 20, marginBottom: 8 }}>
            Pinned on Home (max 6)
          </AppText>
          <AppCard style={{ padding: 12 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {SERVICE_OPTIONS.map(opt => {
                const pinned = pinnedServices.includes(opt.id)
                const overLimit = !pinned && pinnedServices.length >= 6
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 7,
                      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
                      backgroundColor: pinned ? '#10B98118' : theme.colors.surface,
                      borderColor: pinned ? '#10B981' : theme.colors.border,
                      opacity: overLimit ? 0.4 : 1,
                    }}
                    onPress={() => !overLimit && togglePinned(opt.id)}
                    disabled={overLimit}
                  >
                    <ServiceIcon icon={opt.icon} iconLib={opt.iconLib} size={16} color={pinned ? '#10B981' : theme.colors.textSecondary} />
                    <AppText variant="caption" bold style={{ color: pinned ? '#10B981' : theme.colors.textPrimary }}>
                      {opt.label}
                    </AppText>
                    {pinned && <Feather name="check" size={13} color="#10B981" />}
                  </TouchableOpacity>
                )
              })}
            </View>
          </AppCard>

          {/* Matching Preferences */}
          <AppText style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 20, marginBottom: 8 }}>
            Matching Preferences
          </AppText>
          <AppCard style={{ padding: 2, paddingHorizontal: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 }}>
              <View style={{ flex: 1 }}>
                <AppText variant="body" bold>Ladies-Only Trips</AppText>
                <AppText variant="caption" color="muted">Match only with female drivers on shared rides</AppText>
              </View>
              <Switch
                value={ladiesOnly}
                onValueChange={setLadiesOnly}
                trackColor={{ false: theme.colors.border, true: '#EC4899' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </AppCard>

          {/* Notifications */}
          <AppText style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 20, marginBottom: 8 }}>
            Notifications
          </AppText>
          <AppCard style={{ padding: 2, paddingHorizontal: 16 }}>
            {([
              { key: 'pushNotifications', label: 'Push Notifications',  desc: 'Ride updates and booking confirmations',   value: pushNotifications, setter: setPushNotifications, color: theme.colors.primary },
              { key: 'arrivalAlerts',     label: 'Arrival Alerts',       desc: 'Alert when driver is 10 KM away',          value: arrivalAlerts,     setter: setArrivalAlerts,     color: theme.colors.primary },
              { key: 'marketingEmails',   label: 'Promotional Emails',   desc: 'Offers, discounts and new service launches', value: marketingEmails,   setter: setMarketingEmails,   color: '#F59E0B'              },
            ] as any[]).map((pref, idx, arr) => (
              <View
                key={pref.key}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingVertical: 14,
                  borderBottomWidth: idx < arr.length - 1 ? 1 : 0,
                  borderBottomColor: theme.colors.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <AppText variant="body" bold>{pref.label}</AppText>
                  <AppText variant="caption" color="muted">{pref.desc}</AppText>
                </View>
                <Switch
                  value={pref.value}
                  onValueChange={pref.setter}
                  trackColor={{ false: theme.colors.border, true: pref.color }}
                  thumbColor="#FFFFFF"
                />
              </View>
            ))}
          </AppCard>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Save */}
        <View style={{ position: 'absolute', bottom: 32, left: 16, right: 16 }}>
          <AppButton
            onPress={handleSave}
            disabled={saving}
            variant="primary"
          >
            {saving ? 'Saving…' : 'Save Preferences'}
          </AppButton>
        </View>
      </SafeAreaView>
    </View>
  )
}
