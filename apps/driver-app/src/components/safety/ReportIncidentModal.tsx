/**
 * Report Safety Incident Modal — Feature 22 (Light & Dark Mode)
 * Structured incident category selection, description, and submission.
 */
import React, { useState } from 'react'
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
import { SafetyIncidentCategory } from '../../types/driverSafety'

interface Props {
  visible: boolean
  onClose: () => void
  rideId?: string
  driverLat?: number
  driverLng?: number
}

interface CategoryOption {
  key: SafetyIncidentCategory
  title: string
  icon: string
  defaultSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

const CATEGORIES: CategoryOption[] = [
  { key: 'UNSAFE_PASSENGER', title: 'Unsafe or Aggressive Passenger', icon: 'person-circle-outline', defaultSeverity: 'HIGH' },
  { key: 'ACCIDENT', title: 'Vehicle Collision / Accident', icon: 'car-sport-outline', defaultSeverity: 'CRITICAL' },
  { key: 'ROAD_HAZARD', title: 'Severe Road Hazard / Blockage', icon: 'warning-outline', defaultSeverity: 'MEDIUM' },
  { key: 'VEHICLE_ISSUE', title: 'Vehicle Breakdown / Flat Tyre', icon: 'construct-outline', defaultSeverity: 'MEDIUM' },
  { key: 'MEDICAL_EMERGENCY', title: 'Medical Emergency Onboard', icon: 'medkit-outline', defaultSeverity: 'CRITICAL' },
  { key: 'HARASSMENT', title: 'Verbal / Physical Harassment', icon: 'shield-outline', defaultSeverity: 'HIGH' },
  { key: 'OTHER', title: 'Other Safety Concern', icon: 'alert-circle-outline', defaultSeverity: 'MEDIUM' },
]

export const ReportIncidentModal: React.FC<Props> = ({
  visible,
  onClose,
  rideId,
  driverLat,
  driverLng,
}) => {
  const { isDark } = useTheme()
  const [selectedCategory, setSelectedCategory] = useState<SafetyIncidentCategory>('UNSAFE_PASSENGER')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Description Required', 'Please provide a brief explanation of the incident.')
      return
    }

    setSubmitting(true)
    try {
      const selected = CATEGORIES.find(c => c.key === selectedCategory)
      const res = await DriverSafetyService.reportIncident({
        ride_id: rideId,
        incident_category: selectedCategory,
        severity: selected?.defaultSeverity || 'MEDIUM',
        description,
        latitude: driverLat,
        longitude: driverLng,
      })

      Alert.alert('Incident Reported', res.message || 'Safety team has received your ticket.')
      setDescription('')
      onClose()
    } catch (err: any) {
      Alert.alert('Submission Error', err.message || 'Failed to submit incident.')
    } finally {
      setSubmitting(false)
    }
  }

  const bgCard = isDark ? '#1E293B' : '#FFFFFF'
  const bgInput = isDark ? '#0F172A' : '#F1F5F9'
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
                <Feather name="alert-triangle" size={18} color="#D97706" />
              </View>
              <View>
                <Text style={[styles.title, { color: textPrimary }]}>Report Safety Incident</Text>
                <Text style={[styles.subtitle, { color: textSecondary }]}>
                  Ticket directly sent to Safety Operations
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.label, { color: textPrimary }]}>Select Incident Category</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map(cat => {
                const isSelected = selectedCategory === cat.key
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      styles.catCard,
                      { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor },
                      isSelected && { borderColor: '#D97706', backgroundColor: isDark ? '#451A03' : '#FEF3C7' },
                    ]}
                    onPress={() => setSelectedCategory(cat.key)}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={20}
                      color={isSelected ? '#D97706' : textSecondary}
                    />
                    <Text
                      style={[
                        styles.catText,
                        { color: textPrimary },
                        isSelected && { fontWeight: '700', color: isDark ? '#FEF3C7' : '#92400E' },
                      ]}
                    >
                      {cat.title}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <Text style={[styles.label, { color: textPrimary, marginTop: 14 }]}>
              Incident Details
            </Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: bgInput, color: textPrimary, borderColor }]}
              placeholder="Describe what happened clearly..."
              placeholderTextColor={textSecondary}
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
            />
          </ScrollView>

          {/* Submit CTA */}
          <View style={[styles.footer, { borderTopColor: borderColor }]}>
            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Safety Incident</Text>
              )}
            </TouchableOpacity>
          </View>
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
    backgroundColor: '#FEF3C7',
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
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  catGrid: {
    gap: 8,
  },
  catCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  catText: {
    fontSize: 13,
    flex: 1,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
    fontSize: 13,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  submitBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#D97706',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
