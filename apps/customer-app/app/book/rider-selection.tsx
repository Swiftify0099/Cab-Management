/**
 * Customer App — Book for Someone Else (Participant Selector)
 * Route: /book/rider-selection
 * Feature 22: Book for Myself, Family Members, Saved Friends/Guests, or Corporate Employee.
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  StatusBar,
  ActivityIndicator,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Feather, Ionicons } from '@expo/vector-icons'

import { riderApi } from '../../src/api/client'
import { useTheme } from '../../src/contexts/ThemeContext'
import { useTranslation } from '../../src/i18n'
import {
  AppText,
  AppCard,
  AppButton,
  AppBadge,
} from '../../src/components/ui'

interface Participant {
  id: string
  participant_type: 'SELF' | 'FAMILY_MEMBER' | 'FRIEND_GUEST' | 'EMPLOYEE'
  name: string
  phone: string
  label: string
  is_corporate: boolean
  company_name?: string
  membership_id?: string
}

export default function RiderSelectionScreen() {
  const { theme, isDark } = useTheme()
  const { t } = useTranslation()
  const params = useLocalSearchParams()

  const [participants, setParticipants] = useState<Participant[]>([])
  const [selectedId, setSelectedId] = useState<string>('self')
  const [loading, setLoading] = useState(true)

  // Add Guest Modal State
  const [modalVisible, setModalVisible] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newRelationship, setNewRelationship] = useState('FRIEND')
  const [saving, setSaving] = useState(false)

  const loadParticipants = useCallback(async () => {
    try {
      setLoading(true)
      const res = await riderApi.listParticipants()
      if (res.data?.data) {
        setParticipants(res.data.data)
      }
    } catch {
      // Fallback local participant
      setParticipants([
        {
          id: 'self',
          participant_type: 'SELF',
          name: 'Myself',
          phone: '+91 98765 43210',
          label: 'Book for Myself',
          is_corporate: false,
        },
      ])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadParticipants()
  }, [loadParticipants])

  const handleSaveGuest = async () => {
    if (!newName.trim() || newPhone.trim().length < 10) {
      Alert.alert('Invalid Details', 'Please enter a valid passenger name and 10-digit mobile number.')
      return
    }
    try {
      setSaving(true)
      const res = await riderApi.createSavedRider({
        name: newName.trim(),
        phone: newPhone.trim(),
        relationship_type: newRelationship,
        is_favorite: true,
      })
      if (res.data?.data) {
        const created: Participant = {
          id: res.data.data.id,
          participant_type: 'FRIEND_GUEST',
          name: res.data.data.name,
          phone: res.data.data.phone,
          label: `${newRelationship}: ${res.data.data.name}`,
          is_corporate: false,
        }
        setParticipants((prev) => [...prev, created])
        setSelectedId(created.id)
      }
      setModalVisible(false)
      setNewName('')
      setNewPhone('')
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to save passenger contact.')
    } finally {
      setSaving(false)
    }
  }

  const handleConfirm = () => {
    router.back()
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'FAMILY_MEMBER':
        return 'people-outline'
      case 'EMPLOYEE':
        return 'briefcase-outline'
      case 'FRIEND_GUEST':
        return 'person-add-outline'
      default:
        return 'person-outline'
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <AppText variant="title" bold>
            Who is riding?
          </AppText>
          <AppText variant="caption" color="secondary">
            Driver will see passenger name & direct ride PIN
          </AppText>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <AppText style={{ marginTop: 12 }} color="secondary">
            Loading participants...
          </AppText>
        </View>
      ) : (
        <ScrollView style={styles.scrollArea} contentContainerStyle={{ padding: 16 }}>
          {/* Privacy Note Banner */}
          <View style={[styles.infoBanner, { backgroundColor: isDark ? '#1E293B' : '#F0F9FF', borderColor: theme.colors.primary }]}>
            <Ionicons name="shield-checkmark" size={20} color={theme.colors.primary} style={{ marginRight: 10 }} />
            <AppText variant="caption" style={{ flex: 1, color: isDark ? '#E2E8F0' : '#0369A1' }}>
              Your wallet and personal billing details remain private. Driver only sees the rider's name & masked phone.
            </AppText>
          </View>

          {/* Participant Options List */}
          <AppText variant="h3" style={{ marginVertical: 12 }}>
            Select Passenger
          </AppText>

          {participants.map((p) => {
            const isSelected = selectedId === p.id
            return (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.participantCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
                onPress={() => setSelectedId(p.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.avatarBox, { backgroundColor: isSelected ? theme.colors.primary + '20' : theme.colors.border + '40' }]}>
                  <Ionicons name={getIcon(p.participant_type) as any} size={22} color={isSelected ? theme.colors.primary : theme.colors.textSecondary} />
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <AppText variant="body" bold>
                      {p.name}
                    </AppText>
                    {p.is_corporate && (
                      <View style={{ marginLeft: 8 }}>
                        <AppBadge label="Corporate" variant="info" size="sm" />
                      </View>
                    )}
                  </View>
                  <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                    {p.label} • {p.phone || 'Account Holder'}
                  </AppText>
                </View>

                <View style={[styles.radioOuter, { borderColor: isSelected ? theme.colors.primary : theme.colors.border }]}>
                  {isSelected && <View style={[styles.radioInner, { backgroundColor: theme.colors.primary }]} />}
                </View>
              </TouchableOpacity>
            )
          })}

          {/* Add New Guest Contact Button */}
          <TouchableOpacity
            style={[styles.addGuestBtn, { borderColor: theme.colors.primary }]}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}
          >
            <Feather name="plus-circle" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <AppText variant="body" style={{ color: theme.colors.primary }} bold>
              Add a Friend or Guest Rider
            </AppText>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Bottom Confirm Action */}
      <View style={[styles.footer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
        <AppButton onPress={handleConfirm} fullWidth size="lg">
          Confirm Passenger
        </AppButton>
      </View>

      {/* Add New Guest Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <AppText variant="title" bold>
                Add Guest Passenger
              </AppText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={22} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <AppText variant="caption" color="secondary" style={{ marginBottom: 16 }}>
              The driver will receive this name and contact this phone number for pickup.
            </AppText>

            <AppText variant="caption" style={{ marginBottom: 4 }} semibold>
              Passenger Full Name
            </AppText>
            <TextInput
              style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}
              placeholder="e.g. Priya Sharma"
              placeholderTextColor="#94A3B8"
              value={newName}
              onChangeText={setNewName}
            />

            <AppText variant="caption" style={{ marginTop: 12, marginBottom: 4 }} semibold>
              10-Digit Mobile Number
            </AppText>
            <TextInput
              style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}
              placeholder="+91 98765 43210"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              value={newPhone}
              onChangeText={setNewPhone}
            />

            <AppText variant="caption" style={{ marginTop: 12, marginBottom: 4 }} semibold>
              Relationship
            </AppText>
            <View style={styles.relPills}>
              {['FRIEND', 'FAMILY', 'COLLEAGUE', 'GUEST'].map((rel) => (
                <TouchableOpacity
                  key={rel}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: newRelationship === rel ? theme.colors.primary : theme.colors.border + '40',
                    },
                  ]}
                  onPress={() => setNewRelationship(rel)}
                >
                  <AppText variant="caption" style={{ color: newRelationship === rel ? '#FFF' : theme.colors.textPrimary }} bold>
                    {rel}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ marginTop: 24 }}>
              <AppButton onPress={handleSaveGuest} loading={saving} fullWidth>
                {saving ? 'Saving...' : 'Save & Select Passenger'}
              </AppButton>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { marginRight: 14, padding: 4 },
  scrollArea: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  addGuestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginTop: 8,
    marginBottom: 24,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  relPills: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
})
