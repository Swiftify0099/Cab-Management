/**
 * Customer App — Emergency & Trusted Contacts Screen
 * Route: /profile/emergency
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
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { emergencyApi } from '../../src/api/client'
import { useTheme } from '../../src/contexts/ThemeContext'
import { useTranslation } from '../../src/i18n'
import {
  AppText,
  AppButton,
  AppCard,
  AppBadge,
  AppSwitch,
  AppDivider,
} from '../../src/components/ui'

interface EmergencyContact {
  id: string
  name: string
  phone: string
  relationship: string
  is_primary: boolean
  auto_share_rides: boolean
}

const RELATION_PRESETS = ['Family', 'Friend', 'Parent', 'Doctor', 'Colleague', 'Other']

export default function EmergencyContactsScreen() {
  const { theme, isDark } = useTheme()
  const { t } = useTranslation()

  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [relationship, setRelationship] = useState('Family')
  const [isPrimary, setIsPrimary] = useState(false)
  const [autoShare, setAutoShare] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const loadContacts = useCallback(async () => {
    try {
      const res = await emergencyApi.getContacts()
      setContacts(res.data?.data || res.data || [])
    } catch {
      setContacts([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadContacts()
    }, [loadContacts])
  )

  const openAddModal = () => {
    setName('')
    setPhone('')
    setRelationship('Family')
    setIsPrimary(contacts.length === 0)
    setAutoShare(false)
    setErrors({})
    setModalVisible(true)
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!name.trim() || name.trim().length < 2) {
      errs.name = 'Enter contact name'
    }
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      errs.phone = 'Enter a valid 10-digit phone number'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSaveContact = async () => {
    if (!validate()) return
    setSaving(true)
    const fullPhone = `+91${phone.replace(/\D/g, '').slice(-10)}`
    try {
      await emergencyApi.addContact({
        name: name.trim(),
        phone: fullPhone,
        relationship,
        is_primary: isPrimary,
        auto_share_rides: autoShare,
      })
      setModalVisible(false)
      loadContacts()
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to add emergency contact.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteContact = (c: EmergencyContact) => {
    Alert.alert(
      t('common.delete', 'Delete Contact'),
      `Remove ${c.name} from your emergency contacts?`,
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await emergencyApi.deleteContact(c.id)
              setContacts((prev) => prev.filter((x) => x.id !== c.id))
            } catch {
              Alert.alert('Error', 'Could not delete contact.')
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
          {t('safety.title', 'Emergency Contacts')}
        </AppText>
        <TouchableOpacity
          style={[styles.addTopBtn, { backgroundColor: `${theme.colors.success}20` }]}
          onPress={openAddModal}
        >
          <Feather name="plus" size={20} color={theme.colors.success} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.success} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadContacts() }} tintColor={theme.colors.success} />}
        >
          {/* Safety Info Banner */}
          <View style={[styles.safetyBanner, { backgroundColor: `${theme.colors.success}15`, borderColor: `${theme.colors.success}30` }]}>
            <Ionicons name="shield-checkmark" size={26} color={theme.colors.success} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <AppText variant="bodyS" bold style={{ color: theme.colors.success }}>
                Instant SOS & Ride Sharing
              </AppText>
              <AppText variant="small" color="secondary" style={{ marginTop: 2 }}>
                {t('safety.desc', 'Trusted contacts receive instant SOS notifications and live GPS tracking when you travel.')}
              </AppText>
            </View>
          </View>

          {/* Contact List */}
          {contacts.length === 0 ? (
            <View style={styles.emptyState}>
              <AppText style={{ fontSize: 44, marginBottom: 12 }}>🛡️</AppText>
              <AppText variant="subtitle" bold center>
                No emergency contacts added
              </AppText>
              <AppText variant="bodyS" color="muted" center style={{ marginTop: 4, marginBottom: 20 }}>
                Add family or friends who can be reached in emergency situations.
              </AppText>
              <AppButton
                onPress={openAddModal}
                variant="primary"
              >
                {t('safety.add_contact', '+ Add Emergency Contact')}
              </AppButton>
            </View>
          ) : (
            contacts.map((contact) => (
              <AppCard key={contact.id} style={styles.contactCard}>
                <View style={styles.contactRow}>
                  <View style={[styles.avatarBox, { backgroundColor: contact.is_primary ? `${theme.colors.success}20` : `${theme.colors.primary}18` }]}>
                    <Feather
                      name={contact.is_primary ? 'shield' : 'user'}
                      size={20}
                      color={contact.is_primary ? theme.colors.success : theme.colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <AppText variant="body" bold>{contact.name}</AppText>
                      {contact.is_primary ? (
                        <AppBadge label="Primary" variant="success" size="sm" />
                      ) : (
                        <AppBadge label={contact.relationship} variant="info" size="sm" />
                      )}
                    </View>
                    <AppText variant="small" color="muted" style={{ marginTop: 2 }}>
                      {contact.phone}
                    </AppText>
                  </View>

                  <TouchableOpacity
                    style={[styles.deleteBtn, { backgroundColor: theme.colors.errorBg }]}
                    onPress={() => handleDeleteContact(contact)}
                  >
                    <Feather name="trash-2" size={16} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>

                {contact.auto_share_rides && (
                  <View style={[styles.autoShareRow, { borderTopColor: theme.colors.border }]}>
                    <Ionicons name="navigate-circle" size={14} color={theme.colors.accent} />
                    <AppText variant="caption" semibold style={{ color: theme.colors.accent, marginLeft: 6 }}>
                      Auto-sharing live trips with this contact
                    </AppText>
                  </View>
                )}
              </AppCard>
            ))
          )}

          {contacts.length > 0 && contacts.length < 5 && (
            <View style={{ marginTop: 16 }}>
              <AppButton
                onPress={openAddModal}
                variant="secondary"
              >
                {t('safety.add_contact', '+ Add Another Contact')}
              </AppButton>
            </View>
          )}
        </ScrollView>
      )}

      {/* Add Contact Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBg}>
          <View style={[styles.modalSheet, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <AppText variant="h3" bold>
                {t('safety.add_contact', 'Add Emergency Contact')}
              </AppText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <AppDivider marginVertical={12} />

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Name */}
              <View style={styles.modalField}>
                <AppText variant="label" color="secondary" style={styles.modalLabel}>
                  Contact Name *
                </AppText>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.colors.backgroundAlt, borderColor: errors.name ? theme.colors.error : theme.colors.border, color: theme.colors.textPrimary }]}
                  placeholder="e.g. Papa / Brother / Dr. Mehta"
                  placeholderTextColor={theme.colors.placeholder}
                  value={name}
                  onChangeText={(t) => {
                    setName(t)
                    setErrors((e) => ({ ...e, name: '' }))
                  }}
                />
                {errors.name ? <AppText variant="small" color="error">{errors.name}</AppText> : null}
              </View>

              {/* Phone */}
              <View style={styles.modalField}>
                <AppText variant="label" color="secondary" style={styles.modalLabel}>
                  Mobile Number *
                </AppText>
                <View style={[styles.modalPhoneRow, { backgroundColor: theme.colors.backgroundAlt, borderColor: errors.phone ? theme.colors.error : theme.colors.border }]}>
                  <AppText variant="body" bold color="secondary" style={{ marginRight: 8 }}>+91</AppText>
                  <TextInput
                    style={[styles.modalPhoneInput, { color: theme.colors.textPrimary }]}
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
                {errors.phone ? <AppText variant="small" color="error">{errors.phone}</AppText> : null}
              </View>

              {/* Relationship Presets */}
              <View style={styles.modalField}>
                <AppText variant="label" color="secondary" style={styles.modalLabel}>
                  Relationship
                </AppText>
                <View style={styles.chipRow}>
                  {RELATION_PRESETS.map((rel) => (
                    <TouchableOpacity
                      key={rel}
                      style={[styles.modalChip, { backgroundColor: relationship === rel ? `${theme.colors.success}20` : theme.colors.backgroundAlt, borderColor: relationship === rel ? theme.colors.success : theme.colors.border }]}
                      onPress={() => setRelationship(rel)}
                    >
                      <AppText variant="small" semibold style={{ color: relationship === rel ? theme.colors.success : theme.colors.textSecondary }}>
                        {rel}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <AppDivider marginVertical={12} />

              {/* Primary Toggle */}
              <AppSwitch
                label={t('safety.primary', 'Set as Primary Emergency Contact')}
                sublabel="First person alerted during an SOS event"
                value={isPrimary}
                onValueChange={setIsPrimary}
              />

              <AppDivider />

              {/* Auto Share Toggle */}
              <AppSwitch
                label={t('safety.auto_share', 'Auto-share Live Trips')}
                sublabel="Automatically share tracking link for every ride"
                value={autoShare}
                onValueChange={setAutoShare}
              />

              <View style={{ marginTop: 24, marginBottom: 20 }}>
                <AppButton
                  onPress={handleSaveContact}
                  loading={saving}
                  variant="primary"
                >
                  Save Emergency Contact
                </AppButton>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  safetyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  contactCard: { marginBottom: 12 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBox: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  autoShareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalField: { marginBottom: 16 },
  modalLabel: { marginBottom: 6, letterSpacing: 0.5 },
  modalInput: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 16 },
  modalPhoneRow: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
  modalPhoneInput: { flex: 1, fontSize: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modalChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
})
