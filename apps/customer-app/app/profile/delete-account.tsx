/**
 * Customer App — Delete Account Screen
 * Route: /profile/delete-account
 * Feature 1: Customer Core Account.
 */
import React, { useState } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { settingsApi } from '../../src/api/client'
import { useAuthStore } from '../../src/store/auth.store'
import { useTheme } from '../../src/contexts/ThemeContext'
import { useTranslation } from '../../src/i18n'
import {
  AppText,
  AppButton,
  AppCard,
  AppDivider,
} from '../../src/components/ui'

const REASONS = [
  'Privacy concerns',
  'No longer need the service',
  'Too many notifications',
  'Created a duplicate account',
  'Other reason',
]

export default function DeleteAccountScreen() {
  const { theme, isDark } = useTheme()
  const { logout } = useAuthStore()
  const { t } = useTranslation()

  const [selectedReason, setSelectedReason] = useState<string>(REASONS[0])
  const [customReason, setCustomReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirmed) {
      Alert.alert('Confirmation Required', 'Please confirm that you understand the consequences of account deletion.')
      return
    }

    Alert.alert(
      'Permanent Account Deletion',
      'Are you completely sure? You will be immediately logged out and your customer profile will be permanently deactivated.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Permanently Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true)
            const finalReason = selectedReason === 'Other reason' ? customReason : selectedReason
            try {
              await settingsApi.deleteAccount(finalReason)
              await logout()
              router.replace('/auth/phone')
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.detail || 'Failed to delete account. Please contact support.')
              setLoading(false)
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
          {t('danger.delete_account', 'Delete Account')}
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Warning Banner */}
        <View style={[styles.warningBanner, { backgroundColor: theme.colors.errorBg, borderColor: '#FECACA' }]}>
          <Ionicons name="warning" size={28} color={theme.colors.error} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText variant="body" bold style={{ color: theme.colors.error }}>
              Irreversible Action
            </AppText>
            <AppText variant="small" color="secondary" style={{ marginTop: 2 }}>
              {t('danger.delete_warning', 'Permanently deactivate your customer profile and revoke all active sessions.')}
            </AppText>
          </View>
        </View>

        {/* Consequences Checklist */}
        <AppText variant="subtitle" bold style={styles.sectionTitle}>
          What happens when you delete your account:
        </AppText>

        <AppCard style={styles.card}>
          <View style={styles.checkItem}>
            <Feather name="x-circle" size={18} color={theme.colors.error} />
            <AppText variant="bodyS" style={styles.checkText}>
              All saved addresses, routes, and emergency contacts will be deleted.
            </AppText>
          </View>
          <AppDivider marginVertical={10} />
          <View style={styles.checkItem}>
            <Feather name="x-circle" size={18} color={theme.colors.error} />
            <AppText variant="bodyS" style={styles.checkText}>
              Your family group and member shared payment privileges will be cancelled.
            </AppText>
          </View>
          <AppDivider marginVertical={10} />
          <View style={styles.checkItem}>
            <Feather name="x-circle" size={18} color={theme.colors.error} />
            <AppText variant="bodyS" style={styles.checkText}>
              You will be immediately logged out from all connected devices.
            </AppText>
          </View>
        </AppCard>

        {/* Reason Picker */}
        <AppText variant="subtitle" bold style={styles.sectionTitle}>
          Please tell us why you are leaving:
        </AppText>

        {REASONS.map((r) => (
          <TouchableOpacity
            key={r}
            style={[
              styles.reasonRow,
              {
                backgroundColor: selectedReason === r ? `${theme.colors.error}15` : theme.colors.surface,
                borderColor: selectedReason === r ? theme.colors.error : theme.colors.border,
              },
            ]}
            onPress={() => setSelectedReason(r)}
          >
            <AppText variant="body" semibold style={{ flex: 1, color: selectedReason === r ? theme.colors.error : theme.colors.textPrimary }}>
              {r}
            </AppText>
            {selectedReason === r && <Feather name="check" size={18} color={theme.colors.error} />}
          </TouchableOpacity>
        ))}

        {selectedReason === 'Other reason' && (
          <TextInput
            style={[styles.customInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
            placeholder="Tell us more (optional)"
            placeholderTextColor={theme.colors.placeholder}
            value={customReason}
            onChangeText={setCustomReason}
            multiline
          />
        )}

        {/* Confirmation Checkbox */}
        <TouchableOpacity
          style={[styles.confirmBox, { backgroundColor: theme.colors.surface, borderColor: confirmed ? theme.colors.error : theme.colors.border }]}
          onPress={() => setConfirmed(!confirmed)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, { backgroundColor: confirmed ? theme.colors.error : 'transparent', borderColor: confirmed ? theme.colors.error : theme.colors.textMuted }]}>
            {confirmed && <Feather name="check" size={14} color="#fff" />}
          </View>
          <AppText variant="bodyS" bold style={{ flex: 1, marginLeft: 12 }}>
            I understand that this action is permanent and cannot be undone.
          </AppText>
        </TouchableOpacity>

        {/* Delete Button */}
        <View style={{ marginTop: 24 }}>
          <AppButton
            onPress={handleDelete}
            loading={loading}
            variant="danger"
          >
            Permanently Delete My Account
          </AppButton>
        </View>
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
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  sectionTitle: { marginBottom: 12, marginLeft: 4, marginTop: 12 },
  card: { marginBottom: 16 },
  checkItem: { flexDirection: 'row', alignItems: 'center' },
  checkText: { flex: 1, marginLeft: 12 },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  customInput: {
    height: 80,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  confirmBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
