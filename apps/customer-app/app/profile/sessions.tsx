/**
 * Customer App — Active Devices & Sessions Screen
 * Route: /profile/sessions
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
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { settingsApi } from '../../src/api/client'
import { useTheme } from '../../src/contexts/ThemeContext'
import { useTranslation } from '../../src/i18n'
import {
  AppText,
  AppButton,
  AppCard,
  AppBadge,
  AppDivider,
} from '../../src/components/ui'

interface SessionItem {
  id: string
  device_id?: string
  device_name?: string
  ip_address?: string
  is_current?: boolean
  created_at: string
  expires_at: string
}

export default function SessionsScreen() {
  const { theme, isDark } = useTheme()
  const { t } = useTranslation()

  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [revokingAll, setRevokingAll] = useState(false)

  const loadSessions = useCallback(async () => {
    try {
      const res = await settingsApi.getSessions()
      setSessions(res.data?.data || res.data || [])
    } catch {
      setSessions([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadSessions()
    }, [loadSessions])
  )

  const handleRevokeSession = (s: SessionItem) => {
    Alert.alert(
      t('sessions.revoke', 'Revoke Session'),
      `Disconnect session from ${s.device_name || 'Device'}?`,
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('sessions.revoke', 'Revoke'),
          style: 'destructive',
          onPress: async () => {
            setRevokingId(s.id)
            try {
              await settingsApi.revokeSession(s.id)
              setSessions((prev) => prev.filter((x) => x.id !== s.id))
            } catch {
              Alert.alert('Error', 'Failed to revoke session')
            } finally {
              setRevokingId(null)
            }
          },
        },
      ]
    )
  }

  const handleRevokeAll = () => {
    Alert.alert(
      t('sessions.logout_all', 'Log Out All Devices'),
      'This will disconnect your account from all other devices and web browsers.',
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: 'Log Out All',
          style: 'destructive',
          onPress: async () => {
            setRevokingAll(true)
            try {
              await settingsApi.revokeAllSessions()
              loadSessions()
              Alert.alert('Success', 'All other active sessions have been revoked.')
            } catch {
              Alert.alert('Error', 'Failed to revoke all sessions.')
            } finally {
              setRevokingAll(false)
            }
          },
        },
      ]
    )
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
          {t('sessions.title', 'Active Sessions')}
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadSessions() }} tintColor={theme.colors.primary} />}
        >
          {/* Current Device Card */}
          <AppCard style={styles.card}>
            <View style={styles.sessionRow}>
              <View style={[styles.deviceIcon, { backgroundColor: `${theme.colors.success}20` }]}>
                <Feather name="smartphone" size={22} color={theme.colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <AppText variant="body" bold>Current Device</AppText>
                  <AppBadge label="Active Now" variant="success" size="sm" />
                </View>
                <AppText variant="small" color="muted" style={{ marginTop: 2 }}>
                  Mobile App Session • Secure Token
                </AppText>
              </View>
            </View>
          </AppCard>

          {/* Other Active Sessions */}
          <View style={styles.sectionHeader}>
            <AppText variant="subtitle" bold>
              Other Logged-In Sessions
            </AppText>
          </View>

          {sessions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Feather name="shield" size={32} color={theme.colors.success} style={{ marginBottom: 8 }} />
              <AppText variant="body" bold>No other active sessions</AppText>
              <AppText variant="small" color="muted" center style={{ marginTop: 2 }}>
                Your account is currently only active on this device.
              </AppText>
            </View>
          ) : (
            sessions.map((s, idx) => (
              <AppCard key={s.id || idx} style={styles.card}>
                <View style={styles.sessionRow}>
                  <View style={[styles.deviceIcon, { backgroundColor: `${theme.colors.primary}18` }]}>
                    <Feather name="monitor" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="body" bold>{s.device_name || 'Web / Mobile Device'}</AppText>
                    <AppText variant="small" color="muted" style={{ marginTop: 2 }}>
                      IP: {s.ip_address || 'Encrypted'} • {new Date(s.created_at).toLocaleDateString()}
                    </AppText>
                  </View>

                  <TouchableOpacity
                    style={[styles.revokeBtn, { backgroundColor: theme.colors.errorBg }]}
                    onPress={() => handleRevokeSession(s)}
                    disabled={revokingId === s.id}
                  >
                    {revokingId === s.id ? (
                      <ActivityIndicator size="small" color={theme.colors.error} />
                    ) : (
                      <AppText variant="small" bold style={{ color: theme.colors.error }}>
                        Revoke
                      </AppText>
                    )}
                  </TouchableOpacity>
                </View>
              </AppCard>
            ))
          )}

          {sessions.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <AppButton
                onPress={handleRevokeAll}
                loading={revokingAll}
                variant="danger"
              >
                {t('sessions.logout_all', 'Log Out All Other Devices')}
              </AppButton>
            </View>
          )}
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
  card: { marginBottom: 12 },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deviceIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  revokeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  sectionHeader: { marginTop: 16, marginBottom: 12, marginLeft: 4 },
  emptyCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
})
