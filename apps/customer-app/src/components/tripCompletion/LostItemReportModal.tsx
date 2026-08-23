/**
 * Feature 10: Lost Item Report Modal
 * Enables passengers to report items left behind in the vehicle post-trip.
 */
import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  Alert,
} from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from '../../contexts/ThemeContext'
import { AppText, AppButton } from '../ui'
import { tripCompletionApi } from '../../api/client'

interface LostItemReportModalProps {
  visible: boolean
  onClose: () => void
  rideId: string
  driverName?: string
}

const ITEM_CATEGORIES = [
  { id: 'PHONE', label: 'Smartphone / Tablet', icon: 'phone-portrait' },
  { id: 'WALLET', label: 'Wallet / Purse', icon: 'wallet' },
  { id: 'BAG', label: 'Backpack / Luggage', icon: 'bag-handle' },
  { id: 'KEYS', label: 'Keys', icon: 'key' },
  { id: 'GLASSES', label: 'Glasses / Sunglasses', icon: 'glasses' },
  { id: 'CLOTHING', label: 'Jacket / Clothing', icon: 'shirt' },
  { id: 'ELECTRONICS', label: 'Earphones / Charger', icon: 'headset' },
  { id: 'OTHER', label: 'Other Item', icon: 'help-circle' },
]

export function LostItemReportModal({
  visible,
  onClose,
  rideId,
  driverName = 'Driver Partner',
}: LostItemReportModalProps) {
  const { theme, isDark } = useTheme()
  const [selectedCategory, setSelectedCategory] = useState<string>('PHONE')
  const [description, setDescription] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Description Required', 'Please describe where the item was left and how it looks.')
      return
    }

    setLoading(true)
    try {
      await tripCompletionApi.reportLostItem(rideId, {
        item_category: selectedCategory,
        description: description.trim(),
        contact_phone: contactPhone.trim() || undefined,
      })
      setSubmitted(true)
      setTimeout(() => {
        setSubmitted(false)
        setDescription('')
        setContactPhone('')
        onClose()
      }, 2500)
    } catch (err: any) {
      console.error('[LostItem] Report error:', err)
      Alert.alert('Submission Error', err?.response?.data?.message || 'Could not submit report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: isDark ? theme.colors.card : '#FFFFFF' }]}>
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF' }]}>
                <MaterialCommunityIcons name="briefcase-search" size={22} color="#3B82F6" />
              </View>
              <View>
                <AppText variant="h3">Find Lost Item</AppText>
                <AppText variant="caption" color="secondary">Left in {driverName}'s vehicle</AppText>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
            {submitted ? (
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle" size={56} color="#10B981" />
                <AppText variant="h3" style={{ marginTop: 12, color: '#10B981' }}>Lost Item Ticket Created</AppText>
                <AppText variant="body" color="secondary" style={{ textAlign: 'center', marginTop: 6, lineHeight: 20 }}>
                  We have notified {driverName} and our Support Team. You will receive a call as soon as the driver checks the back seat.
                </AppText>
              </View>
            ) : (
              <>
                <AppText variant="label" color="secondary" style={styles.sectionTitle}>
                  SELECT ITEM TYPE
                </AppText>

                <View style={styles.grid}>
                  {ITEM_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat.id
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.catChip,
                          {
                            backgroundColor: isSelected
                              ? isDark ? 'rgba(59, 130, 246, 0.2)' : '#EFF6FF'
                              : isDark ? theme.colors.surface : '#F8FAFC',
                            borderColor: isSelected ? '#3B82F6' : 'transparent',
                          },
                        ]}
                        onPress={() => setSelectedCategory(cat.id)}
                      >
                        <Ionicons
                          name={cat.icon as any}
                          size={16}
                          color={isSelected ? '#3B82F6' : theme.colors.textSecondary}
                          style={{ marginRight: 6 }}
                        />
                        <AppText
                          variant="caption"
                          style={{
                            fontWeight: isSelected ? '700' : '500',
                            color: isSelected ? '#3B82F6' : theme.colors.textPrimary,
                          }}
                        >
                          {cat.label}
                        </AppText>
                      </TouchableOpacity>
                    )
                  })}
                </View>

                <AppText variant="label" color="secondary" style={[styles.sectionTitle, { marginTop: 16 }]}>
                  ITEM DESCRIPTION & SEAT LOCATION
                </AppText>

                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: isDark ? theme.colors.surface : '#F8FAFC',
                      color: theme.colors.textPrimary,
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
                    },
                  ]}
                  placeholder="e.g. Black leather wallet left on the rear passenger seat..."
                  placeholderTextColor={theme.colors.textMuted}
                  multiline
                  numberOfLines={3}
                  value={description}
                  onChangeText={setDescription}
                />

                <AppText variant="label" color="secondary" style={[styles.sectionTitle, { marginTop: 12 }]}>
                  ALTERNATIVE CONTACT NUMBER (OPTIONAL)
                </AppText>

                <TextInput
                  style={[
                    styles.phoneInput,
                    {
                      backgroundColor: isDark ? theme.colors.surface : '#F8FAFC',
                      color: theme.colors.textPrimary,
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
                    },
                  ]}
                  placeholder="If phone was lost, enter friend's number"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="phone-pad"
                  value={contactPhone}
                  onChangeText={setContactPhone}
                />

                <AppButton
                  variant="primary"
                  onPress={handleSubmit}
                  loading={loading}
                  style={styles.submitBtn}
                >
                  Submit Lost Property Ticket
                </AppButton>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    elevation: 20,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentScroll: {
    paddingHorizontal: 20,
  },
  contentContainer: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  textInput: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  phoneInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 20,
  },
  submitBtn: {
    width: '100%',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
})
