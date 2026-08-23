/**
 * Feature 10: Trip Issue / Fare Dispute Modal
 * Allows passengers to report post-trip issues with automated ticket routing.
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
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from '../../contexts/ThemeContext'
import { AppText, AppButton } from '../ui'
import { tripCompletionApi } from '../../api/client'

interface TripIssueModalProps {
  visible: boolean
  onClose: () => void
  rideId: string
}

const ISSUE_CATEGORIES = [
  { id: 'FARE_DISPUTE', label: 'Fare / Overcharged Dispute', icon: 'cash' },
  { id: 'ROUTE_ISSUE', label: 'Driver took inefficient route', icon: 'navigate' },
  { id: 'DRIVER_BEHAVIOR', label: 'Driver behavior / Unprofessional', icon: 'person' },
  { id: 'TOLL_DISPUTE', label: 'Incorrect Toll / Parking Fee', icon: 'receipt' },
  { id: 'VEHICLE_CONDITION', label: 'Car cleanliness or AC issue', icon: 'car-sport' },
  { id: 'OTHER', label: 'Other Issue', icon: 'help-circle' },
]

export function TripIssueModal({
  visible,
  onClose,
  rideId,
}: TripIssueModalProps) {
  const { theme, isDark } = useTheme()
  const [selectedCategory, setSelectedCategory] = useState<string>('FARE_DISPUTE')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Details Required', 'Please provide a brief description of the issue.')
      return
    }

    setLoading(true)
    try {
      await tripCompletionApi.reportTripIssue(rideId, {
        category: selectedCategory,
        description: description.trim(),
      })
      setSubmitted(true)
      setTimeout(() => {
        setSubmitted(false)
        setDescription('')
        onClose()
      }, 2500)
    } catch (err: any) {
      console.error('[TripIssue] Submit error:', err)
      Alert.alert('Submission Error', err?.response?.data?.message || 'Could not file ticket. Please try again.')
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
              <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB' }]}>
                <Feather name="help-circle" size={22} color="#F59E0B" />
              </View>
              <View>
                <AppText variant="h3">Need Help With This Trip?</AppText>
                <AppText variant="caption" color="secondary">Trip #{rideId?.slice(0, 8).toUpperCase()}</AppText>
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
                <AppText variant="h3" style={{ marginTop: 12, color: '#10B981' }}>Support Ticket Created</AppText>
                <AppText variant="body" color="secondary" style={{ textAlign: 'center', marginTop: 6, lineHeight: 20 }}>
                  We are reviewing your trip details and will update you via notifications within 24 hours.
                </AppText>
              </View>
            ) : (
              <>
                <AppText variant="label" color="secondary" style={styles.sectionTitle}>
                  WHAT WENT WRONG?
                </AppText>

                <View style={styles.grid}>
                  {ISSUE_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat.id
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.catChip,
                          {
                            backgroundColor: isSelected
                              ? isDark ? 'rgba(245, 158, 11, 0.2)' : '#FFFBEB'
                              : isDark ? theme.colors.surface : '#F8FAFC',
                            borderColor: isSelected ? '#F59E0B' : 'transparent',
                          },
                        ]}
                        onPress={() => setSelectedCategory(cat.id)}
                      >
                        <Ionicons
                          name={cat.icon as any}
                          size={16}
                          color={isSelected ? '#F59E0B' : theme.colors.textSecondary}
                          style={{ marginRight: 6 }}
                        />
                        <AppText
                          variant="caption"
                          style={{
                            fontWeight: isSelected ? '700' : '500',
                            color: isSelected ? '#F59E0B' : theme.colors.textPrimary,
                          }}
                        >
                          {cat.label}
                        </AppText>
                      </TouchableOpacity>
                    )
                  })}
                </View>

                <AppText variant="label" color="secondary" style={[styles.sectionTitle, { marginTop: 16 }]}>
                  TELL US MORE ABOUT THE ISSUE
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
                  placeholder="Provide any specific details that can help our support team investigate..."
                  placeholderTextColor={theme.colors.textMuted}
                  multiline
                  numberOfLines={4}
                  value={description}
                  onChangeText={setDescription}
                />

                <AppButton
                  variant="primary"
                  onPress={handleSubmit}
                  loading={loading}
                  style={styles.submitBtn}
                >
                  Submit Support Request
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
    flexDirection: 'column',
    gap: 8,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  textInput: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
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
