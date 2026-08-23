/**
 * Feature 9: Report Incident / Safety Concern Modal
 * Allows passengers to file structured safety reports directly to Support & Safety Ops.
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
import { Feather, Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../contexts/ThemeContext'
import { AppText, AppButton } from '../ui'
import { safetyApi } from '../../api/client'

interface ReportIncidentModalProps {
  visible: boolean
  onClose: () => void
  rideId: string
  driverName?: string
}

const SAFETY_CATEGORIES = [
  { id: 'UNSAFE_DRIVING', label: 'Unsafe Driving / Speeding', icon: 'speedometer' },
  { id: 'WRONG_VEHICLE', label: 'Wrong Driver or Vehicle', icon: 'car' },
  { id: 'HARASSMENT', label: 'Inappropriate Behavior / Harassment', icon: 'warning' },
  { id: 'ROUTE_DEVIATION', label: 'Unauthorized Route Deviation', icon: 'navigate' },
  { id: 'VEHICLE_ISSUE', label: 'Vehicle Condition / Breakdown', icon: 'construct' },
  { id: 'OTHER', label: 'Other Safety Concern', icon: 'help-circle' },
]

export function ReportIncidentModal({
  visible,
  onClose,
  rideId,
  driverName = 'Driver Partner',
}: ReportIncidentModalProps) {
  const { theme, isDark } = useTheme()
  const [selectedCategory, setSelectedCategory] = useState<string>('UNSAFE_DRIVING')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Details Required', 'Please provide a brief description of what happened.')
      return
    }

    setLoading(true)
    try {
      await safetyApi.reportIncident({
        ride_id: rideId,
        category: selectedCategory,
        description: description.trim(),
      })
      setSubmitted(true)
      setTimeout(() => {
        setSubmitted(false)
        setDescription('')
        onClose()
      }, 2000)
    } catch (err: any) {
      console.error('[IncidentReport] Failed:', err)
      Alert.alert('Report Failed', err?.response?.data?.message || 'Could not submit report. Please contact 24/7 support.')
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
              <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2' }]}>
                <Feather name="alert-triangle" size={20} color="#EF4444" />
              </View>
              <View>
                <AppText variant="h3">Report Safety Concern</AppText>
                <AppText variant="caption" color="secondary">Trip with {driverName}</AppText>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
            {submitted ? (
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle" size={54} color="#10B981" />
                <AppText variant="h3" style={{ marginTop: 12, color: '#10B981' }}>Report Logged</AppText>
                <AppText variant="body" color="secondary" style={{ textAlign: 'center', marginTop: 6 }}>
                  Our 24/7 Safety Command Center has received your ticket and will review the ride telemetry immediately.
                </AppText>
              </View>
            ) : (
              <>
                <AppText variant="label" color="secondary" style={styles.sectionTitle}>
                  SELECT INCIDENT CATEGORY
                </AppText>

                <View style={styles.categoryGrid}>
                  {SAFETY_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat.id
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryChip,
                          {
                            backgroundColor: isSelected
                              ? isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEF2F2'
                              : isDark ? theme.colors.surface : '#F8FAFC',
                            borderColor: isSelected ? '#EF4444' : 'transparent',
                          },
                        ]}
                        onPress={() => setSelectedCategory(cat.id)}
                      >
                        <Ionicons
                          name={cat.icon as any}
                          size={16}
                          color={isSelected ? '#EF4444' : theme.colors.textSecondary}
                          style={{ marginRight: 8 }}
                        />
                        <AppText
                          variant="caption"
                          style={{
                            fontWeight: isSelected ? '700' : '500',
                            color: isSelected ? '#EF4444' : theme.colors.textPrimary,
                          }}
                        >
                          {cat.label}
                        </AppText>
                      </TouchableOpacity>
                    )
                  })}
                </View>

                <AppText variant="label" color="secondary" style={[styles.sectionTitle, { marginTop: 16 }]}>
                  INCIDENT DETAILS
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
                  placeholder="Describe what happened with as much detail as possible..."
                  placeholderTextColor={theme.colors.textMuted}
                  multiline
                  numberOfLines={4}
                  value={description}
                  onChangeText={setDescription}
                />

                <AppButton
                  variant="danger"
                  onPress={handleSubmit}
                  loading={loading}
                  style={styles.submitBtn}
                >
                  Submit Report to Safety Ops
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
  categoryGrid: {
    flexDirection: 'column',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
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
