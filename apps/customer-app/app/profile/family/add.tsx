/**
 * Customer App — Add Family Member Screen
 * Route: /profile/family/add
 * Feature 1: Customer Core Account.
 */
import React, { useState } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  TextInput,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { router } from 'expo-router'
import { familyApi } from '../../../src/api/client'
import { useTheme } from '../../../src/contexts/ThemeContext'
import { useTranslation } from '../../../src/i18n'
import {
  AppText,
  AppButton,
  AppSwitch,
  AppDivider,
} from '../../../src/components/ui'

const RELATIONSHIPS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Relative', 'Other']

export default function AddFamilyMemberScreen() {
  const { theme, isDark } = useTheme()
  const { t } = useTranslation()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [relationship, setRelationship] = useState('Spouse')
  const [canBook, setCanBook] = useState(true)
  const [canPay, setCanPay] = useState(true)
  const [canTrack, setCanTrack] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!name.trim() || name.trim().length < 2) {
      errs.name = 'Please enter member full name'
    }
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      errs.phone = 'Please enter a valid 10-digit mobile number'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleAdd = async () => {
    if (!validate()) return
    setLoading(true)
    const fullPhone = `+91${phone.replace(/\D/g, '').slice(-10)}`
    try {
      await familyApi.addMember({
        name: name.trim(),
        phone: fullPhone,
        relationship,
        can_book_rides: canBook,
        can_use_shared_payment: canPay,
        can_track_trips: canTrack,
      })
      Alert.alert(
        t('common.success', 'Success'),
        `${name.trim()} has been added to your family account.`,
        [{ text: 'OK', onPress: () => router.back() }]
      )
    } catch (err: any) {
      Alert.alert(
        'Add Failed',
        err?.response?.data?.detail || 'Failed to add family member. Please try again.'
      )
    } finally {
      setLoading(false)
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
          {t('family.add_member', 'Add Family Member')}
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Full Name */}
        <View style={styles.field}>
          <AppText variant="label" color="secondary" style={styles.label}>
            Member Full Name *
          </AppText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                borderColor: errors.name ? theme.colors.error : theme.colors.border,
                color: theme.colors.textPrimary,
              },
            ]}
            placeholder="e.g. Priya Patil"
            placeholderTextColor={theme.colors.placeholder}
            value={name}
            onChangeText={(t) => {
              setName(t)
              setErrors((e) => ({ ...e, name: '' }))
            }}
          />
          {errors.name ? (
            <AppText variant="small" color="error" style={{ marginTop: 4 }}>
              {errors.name}
            </AppText>
          ) : null}
        </View>

        {/* Mobile Number */}
        <View style={styles.field}>
          <AppText variant="label" color="secondary" style={styles.label}>
            Mobile Number *
          </AppText>
          <View style={[styles.phoneRow, { backgroundColor: theme.colors.surface, borderColor: errors.phone ? theme.colors.error : theme.colors.border }]}>
            <AppText variant="body" bold color="secondary" style={{ marginRight: 10 }}>
              +91
            </AppText>
            <TextInput
              style={[styles.phoneInput, { color: theme.colors.textPrimary }]}
              placeholder="9876543210"
              placeholderTextColor={theme.colors.placeholder}
              value={phone}
              onChangeText={(t) => {
                setPhone(t.replace(/\D/g, '').slice(0, 10))
                setErrors((e) => ({ ...e, phone: '' }))
              }}
              keyboardType="phone-pad"
            />
          </View>
          {errors.phone ? (
            <AppText variant="small" color="error" style={{ marginTop: 4 }}>
              {errors.phone}
            </AppText>
          ) : null}
        </View>

        {/* Relationship */}
        <View style={styles.field}>
          <AppText variant="label" color="secondary" style={styles.label}>
            Relationship
          </AppText>
          <View style={styles.chipRow}>
            {RELATIONSHIPS.map((rel) => (
              <TouchableOpacity
                key={rel}
                style={[
                  styles.chip,
                  {
                    backgroundColor: relationship === rel ? `${theme.colors.accent}20` : theme.colors.surface,
                    borderColor: relationship === rel ? theme.colors.accent : theme.colors.border,
                  },
                ]}
                onPress={() => setRelationship(rel)}
              >
                <AppText
                  variant="small"
                  semibold
                  style={{ color: relationship === rel ? theme.colors.accent : theme.colors.textSecondary }}
                >
                  {rel}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <AppDivider marginVertical={16} />

        {/* Permissions */}
        <AppText variant="subtitle" bold style={{ marginBottom: 12 }}>
          {t('family.permissions', 'Permissions')}
        </AppText>

        <View style={[styles.permCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <AppSwitch
            label={t('family.can_book', 'Can book rides')}
            sublabel="Allow member to request rides on their own"
            value={canBook}
            onValueChange={setCanBook}
          />
          <AppDivider />
          <AppSwitch
            label={t('family.can_pay', 'Use Shared Payment')}
            sublabel="Allow rides charged to organizer wallet/cards"
            value={canPay}
            onValueChange={setCanPay}
          />
          <AppDivider />
          <AppSwitch
            label={t('family.can_track', 'Trip Tracking Visibility')}
            sublabel="Allow organizer to see live ride progress"
            value={canTrack}
            onValueChange={setCanTrack}
          />
        </View>

        {/* Submit */}
        <View style={{ marginTop: 28 }}>
          <AppButton
            onPress={handleAdd}
            loading={loading}
            variant="primary"
          >
            Add Family Member
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
  field: { marginBottom: 18 },
  label: { marginBottom: 8, letterSpacing: 0.5 },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  phoneRow: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneInput: { flex: 1, fontSize: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
  permCard: { borderRadius: 16, borderWidth: 1, padding: 14 },
})
