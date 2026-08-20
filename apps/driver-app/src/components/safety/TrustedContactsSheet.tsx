/**
 * Trusted Contacts Sheet — Feature 22 (Light & Dark Mode)
 * Add and manage up to 3 verified emergency contacts.
 */
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../theme'
import { DriverSafetyService } from '../../services/driverSafetyService'
import { TrustedContactItem } from '../../types/driverSafety'

interface Props {
  visible: boolean
  onClose: () => void
}

export const TrustedContactsSheet: React.FC<Props> = ({ visible, onClose }) => {
  const { isDark } = useTheme()
  const [contacts, setContacts] = useState<TrustedContactItem[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [relationship, setRelationship] = useState('Family')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (visible) {
      loadContacts()
    }
  }, [visible])

  const loadContacts = async () => {
    setLoading(true)
    try {
      const data = await DriverSafetyService.getTrustedContacts()
      setContacts(data)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Required Fields', 'Please enter both contact name and phone number.')
      return
    }

    setAdding(true)
    try {
      await DriverSafetyService.addTrustedContact(name, phone, relationship)
      setName('')
      setPhone('')
      setShowAddForm(false)
      loadContacts()
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add contact.')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (contactId: string) => {
    Alert.alert('Remove Contact', 'Are you sure you want to remove this emergency contact?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await DriverSafetyService.deleteTrustedContact(contactId)
            loadContacts()
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to remove contact.')
          }
        },
      },
    ])
  }

  const bgCard = isDark ? '#1E293B' : '#FFFFFF'
  const bgItem = isDark ? '#0F172A' : '#F8FAFC'
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A'
  const textSecondary = isDark ? '#94A3B8' : '#64748B'
  const borderColor = isDark ? '#334155' : '#E2E8F0'

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: bgCard }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.iconCircle}>
                <Ionicons name="people" size={18} color="#16A34A" />
              </View>
              <View>
                <Text style={[styles.title, { color: textPrimary }]}>Trusted Contacts</Text>
                <Text style={[styles.subtitle, { color: textSecondary }]}>
                  {contacts.length}/3 Emergency Contacts Configured
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {loading ? (
              <ActivityIndicator style={{ paddingVertical: 20 }} color="#10B981" />
            ) : contacts.length === 0 && !showAddForm ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="shield-outline" size={40} color={textSecondary} />
                <Text style={[styles.emptyTitle, { color: textPrimary }]}>No Emergency Contacts</Text>
                <Text style={[styles.emptySub, { color: textSecondary }]}>
                  Add trusted family members or friends. In an emergency SOS, they will receive SMS alerts with your live location.
                </Text>
              </View>
            ) : (
              <View style={styles.list}>
                {contacts.map(c => (
                  <View
                    key={c.contact_id}
                    style={[styles.contactCard, { backgroundColor: bgItem, borderColor }]}
                  >
                    <View style={styles.contactLeft}>
                      <View style={styles.contactAvatar}>
                        <Text style={styles.avatarText}>{c.name[0]?.toUpperCase() || 'C'}</Text>
                      </View>
                      <View>
                        <Text style={[styles.contactName, { color: textPrimary }]}>{c.name}</Text>
                        <Text style={[styles.contactPhone, { color: textSecondary }]}>
                          {c.phone_masked} • {c.relationship}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.delBtn}
                      onPress={() => handleDelete(c.contact_id)}
                    >
                      <Feather name="trash-2" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Add Contact Form */}
            {showAddForm && (
              <View style={[styles.formWrap, { backgroundColor: bgItem, borderColor }]}>
                <Text style={[styles.formTitle, { color: textPrimary }]}>Add New Emergency Contact</Text>
                <TextInput
                  style={[styles.input, { color: textPrimary, borderColor }]}
                  placeholder="Full Name (e.g. Rahul Sharma)"
                  placeholderTextColor={textSecondary}
                  value={name}
                  onChangeText={setName}
                />
                <TextInput
                  style={[styles.input, { color: textPrimary, borderColor }]}
                  placeholder="Phone Number (+91 98765 43210)"
                  placeholderTextColor={textSecondary}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
                <View style={styles.relRow}>
                  {['Family', 'Spouse', 'Friend', 'Other'].map(r => (
                    <TouchableOpacity
                      key={r}
                      style={[
                        styles.relChip,
                        { borderColor },
                        relationship === r && { backgroundColor: '#10B981', borderColor: '#10B981' },
                      ]}
                      onPress={() => setRelationship(r)}
                    >
                      <Text
                        style={[
                          styles.relText,
                          { color: relationship === r ? '#FFFFFF' : textPrimary },
                        ]}
                      >
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={[styles.cancelFormBtn, { borderColor }]}
                    onPress={() => setShowAddForm(false)}
                  >
                    <Text style={[styles.cancelFormText, { color: textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveContactBtn, adding && { opacity: 0.6 }]}
                    onPress={handleAdd}
                    disabled={adding}
                  >
                    {adding ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.saveContactText}>Save Contact</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Bottom Action */}
          {!showAddForm && contacts.length < 3 && (
            <View style={[styles.footer, { borderTopColor: borderColor }]}>
              <TouchableOpacity
                style={styles.addContactBtn}
                onPress={() => setShowAddForm(true)}
              >
                <Feather name="user-plus" size={16} color="#FFFFFF" />
                <Text style={styles.addContactBtnText}>Add Emergency Contact</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
  },
  closeBtn: {
    padding: 6,
  },
  content: {
    padding: 20,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  list: {
    gap: 10,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  contactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  contactName: {
    fontSize: 14,
    fontWeight: '700',
  },
  contactPhone: {
    fontSize: 12,
    marginTop: 2,
  },
  delBtn: {
    padding: 8,
  },
  formWrap: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    marginTop: 10,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
  },
  relRow: {
    flexDirection: 'row',
    gap: 6,
  },
  relChip: {
    flex: 1,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  relText: {
    fontSize: 11,
    fontWeight: '600',
  },
  formActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  cancelFormBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelFormText: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveContactBtn: {
    flex: 2,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveContactText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  addContactBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  addContactBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
