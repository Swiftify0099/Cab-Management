/**
 * Customer App — Family & Shared Account Hub
 * Route: /profile/family
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
import { Feather, Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { familyApi } from '../../../src/api/client'
import { useTheme } from '../../../src/contexts/ThemeContext'
import { useTranslation } from '../../../src/i18n'
import {
  AppText,
  AppButton,
  AppCard,
  AppBadge,
  AppSwitch,
  AppDivider,
} from '../../../src/components/ui'

interface FamilyMember {
  id: string
  name: string
  phone: string
  relationship: string
  role: 'organizer' | 'member'
  status: string
  can_use_shared_payment: boolean
  can_book_rides: boolean
  can_track_trips: boolean
}

interface FamilyData {
  id: string
  family_name: string
  is_shared_payment_enabled: boolean
  shared_payment_method?: string
  members: FamilyMember[]
}

export default function FamilyHubScreen() {
  const { theme, isDark } = useTheme()
  const { t } = useTranslation()

  const [family, setFamily] = useState<FamilyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadFamily = useCallback(async () => {
    try {
      const res = await familyApi.getFamily()
      setFamily(res.data?.data || res.data)
    } catch {
      // Fallback
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadFamily()
    }, [loadFamily])
  )

  const handleToggleSharedPayment = async (val: boolean) => {
    if (!family) return
    try {
      setFamily({ ...family, is_shared_payment_enabled: val })
      await familyApi.updatePaymentSettings({ is_shared_payment_enabled: val })
    } catch {
      Alert.alert('Error', 'Failed to update shared payment setting')
      loadFamily()
    }
  }

  const handleRemoveMember = (m: FamilyMember) => {
    if (m.role === 'organizer') return
    Alert.alert(
      t('family.remove_member', 'Remove Member'),
      `${t('family.remove_confirm', 'Are you sure you want to remove')} ${m.name}?`,
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Remove'),
          style: 'destructive',
          onPress: async () => {
            setDeletingId(m.id)
            try {
              await familyApi.removeMember(m.id)
              setFamily((prev) =>
                prev ? { ...prev, members: prev.members.filter((x) => x.id !== m.id) } : null
              )
            } catch {
              Alert.alert('Error', 'Could not remove member.')
            } finally {
              setDeletingId(null)
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
          {t('family.title', 'Family & Shared')}
        </AppText>
        <TouchableOpacity
          style={[styles.addTopBtn, { backgroundColor: `${theme.colors.accent}20` }]}
          onPress={() => router.push('/profile/family/add' as any)}
        >
          <Feather name="user-plus" size={18} color={theme.colors.accent} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadFamily() }} tintColor={theme.colors.accent} />}
        >
          {/* Family Group Overview Card */}
          <AppCard style={styles.groupCard}>
            <View style={styles.groupHeader}>
              <View style={[styles.familyIconBox, { backgroundColor: `${theme.colors.accent}20` }]}>
                <Ionicons name="people" size={26} color={theme.colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="h3" bold>{family?.family_name || 'My Family Group'}</AppText>
                <AppText variant="small" color="secondary" style={{ marginTop: 2 }}>
                  {family?.members.length || 1} of 6 family members
                </AppText>
              </View>
            </View>

            <AppDivider marginVertical={14} />

            {/* Shared Payment Toggle */}
            <AppSwitch
              label={t('family.shared_payment', 'Shared Family Payment')}
              sublabel={t('family.shared_payment_desc', 'Allow family members to ride using your wallet')}
              value={family?.is_shared_payment_enabled ?? true}
              onValueChange={handleToggleSharedPayment}
            />
          </AppCard>

          {/* Members Section */}
          <View style={styles.sectionHeader}>
            <AppText variant="subtitle" bold>
              {t('family.members', 'Family Members')}
            </AppText>
            <TouchableOpacity onPress={() => router.push('/profile/family/add' as any)}>
              <AppText variant="bodyS" semibold color="brand">
                + {t('family.add_member', 'Add Member')}
              </AppText>
            </TouchableOpacity>
          </View>

          {family?.members.map((member) => (
            <AppCard key={member.id} style={styles.memberCard}>
              <View style={styles.memberHeader}>
                <View style={[styles.memberAvatar, { backgroundColor: member.role === 'organizer' ? `${theme.colors.primary}20` : `${theme.colors.accent}18` }]}>
                  <Feather
                    name={member.role === 'organizer' ? 'shield' : 'user'}
                    size={20}
                    color={member.role === 'organizer' ? theme.colors.primary : theme.colors.accent}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <AppText variant="body" bold>{member.name}</AppText>
                    {member.role === 'organizer' ? (
                      <AppBadge label="Organizer" variant="info" size="sm" />
                    ) : (
                      <AppBadge label={member.relationship} variant="info" size="sm" />
                    )}
                  </View>
                  <AppText variant="small" color="muted" style={{ marginTop: 2 }}>
                    {member.phone}
                  </AppText>
                </View>

                {member.role !== 'organizer' && (
                  <TouchableOpacity
                    style={[styles.deleteBtn, { backgroundColor: theme.colors.errorBg }]}
                    onPress={() => handleRemoveMember(member)}
                    disabled={deletingId === member.id}
                  >
                    {deletingId === member.id ? (
                      <ActivityIndicator size="small" color={theme.colors.error} />
                    ) : (
                      <Feather name="trash-2" size={16} color={theme.colors.error} />
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Permissions Chips */}
              <View style={styles.permissionsRow}>
                <View style={[styles.permChip, { backgroundColor: member.can_book_rides ? `${theme.colors.success}18` : theme.colors.backgroundAlt }]}>
                  <Ionicons name="car" size={12} color={member.can_book_rides ? theme.colors.success : theme.colors.textMuted} />
                  <AppText variant="caption" semibold style={{ color: member.can_book_rides ? theme.colors.success : theme.colors.textMuted }}>
                    Book Rides
                  </AppText>
                </View>
                <View style={[styles.permChip, { backgroundColor: member.can_use_shared_payment ? `${theme.colors.primary}18` : theme.colors.backgroundAlt }]}>
                  <Ionicons name="card" size={12} color={member.can_use_shared_payment ? theme.colors.primary : theme.colors.textMuted} />
                  <AppText variant="caption" semibold style={{ color: member.can_use_shared_payment ? theme.colors.primary : theme.colors.textMuted }}>
                    Shared Pay
                  </AppText>
                </View>
                <View style={[styles.permChip, { backgroundColor: member.can_track_trips ? `${theme.colors.accent}18` : theme.colors.backgroundAlt }]}>
                  <Ionicons name="location" size={12} color={member.can_track_trips ? theme.colors.accent : theme.colors.textMuted} />
                  <AppText variant="caption" semibold style={{ color: member.can_track_trips ? theme.colors.accent : theme.colors.textMuted }}>
                    Trip Track
                  </AppText>
                </View>
              </View>
            </AppCard>
          ))}

          {/* Add Family Member Button */}
          <View style={{ marginTop: 20 }}>
            <AppButton
              onPress={() => router.push('/profile/family/add' as any)}
              variant="secondary"
            >
              {t('family.add_member', '+ Add Family Member')}
            </AppButton>
          </View>
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
  addTopBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  groupCard: { marginBottom: 20 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  familyIconBox: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 4 },
  memberCard: { marginBottom: 12 },
  memberHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  memberAvatar: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  permissionsRow: { flexDirection: 'row', gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.06)' },
  permChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
})
