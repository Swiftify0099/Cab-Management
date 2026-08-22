/**
 * AddStopModal — Feature 10: Add Intermediate Stop Sheet
 * Allows driver or passenger to add waypoints during an active trip (+₹30 stop fee).
 */
import React, { useState } from 'react'
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { DuringRideService } from '../../services/duringRideService'
import { RideStopItem } from '../../types/duringRide'

interface AddStopModalProps {
  visible: boolean
  isDark: boolean
  rideId: string
  existingStopsCount: number
  onClose: () => void
  onStopAdded: (stop: RideStopItem) => void
}

const PRESET_LOCATIONS = [
  { name: 'Phoenix Mall, Viman Nagar', lat: 18.5615, lng: 73.9167 },
  { name: 'Seasons Mall, Magarpatta', lat: 18.5195, lng: 73.9312 },
  { name: 'Kalyani Nagar Metro Station', lat: 18.5475, lng: 73.9035 },
  { name: 'Pune Railway Station Gate 2', lat: 18.5284, lng: 73.8744 },
]

export function AddStopModal({
  visible,
  isDark,
  rideId,
  existingStopsCount,
  onClose,
  onStopAdded,
}: AddStopModalProps) {
  const [address, setAddress] = useState('')
  const [selectedLat, setSelectedLat] = useState<number | null>(null)
  const [selectedLng, setSelectedLng] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSelectPreset = (preset: { name: string; lat: number; lng: number }) => {
    setAddress(preset.name)
    setSelectedLat(preset.lat)
    setSelectedLng(preset.lng)
  }

  const handleConfirmAddStop = async () => {
    if (!address.trim()) {
      Alert.alert('Required', 'Please enter or select a stop address.')
      return
    }

    if (existingStopsCount >= 3) {
      Alert.alert('Limit Reached', 'Maximum 3 stops allowed per trip.')
      return
    }

    setSubmitting(true)
    const lat = selectedLat || 18.5490
    const lng = selectedLng || 73.9010

    try {
      const stop = await DuringRideService.addStop(rideId, address.trim(), lat, lng)
      Alert.alert('Stop Added! 📍', `Stop #${stop.sequence} added successfully.\n+₹30.00 stop fee applied.`)
      onStopAdded(stop)
      onClose()
    } catch (err: any) {
      Alert.alert('Add Stop Failed', err.message || 'Could not add stop.')
    } finally {
      setSubmitting(false)
    }
  }

  const bgCard = isDark ? '#0F172A' : '#FFFFFF'
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A'
  const textSecondary = isDark ? '#94A3B8' : '#64748B'

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: bgCard }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.title, { color: textPrimary }]}>Add Intermediate Stop</Text>
              <Text style={[styles.subTitle, { color: textSecondary }]}>
                Stops count: {existingStopsCount} of 3 maximum
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={22} color={textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Address Input */}
          <View style={[styles.inputWrap, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
            <MaterialCommunityIcons name="map-marker-plus" size={22} color="#0284C7" />
            <TextInput
              style={[styles.input, { color: textPrimary }]}
              placeholder="Enter stop address / landmark..."
              placeholderTextColor={textSecondary}
              value={address}
              onChangeText={setAddress}
            />
          </View>

          {/* Popular Presets */}
          <Text style={[styles.sectionTitle, { color: textSecondary }]}>POPULAR LOCATIONS:</Text>
          <View style={styles.presetsList}>
            {PRESET_LOCATIONS.map((p, idx) => (
              <TouchableOpacity
                key={`preset-${idx}`}
                style={[
                  styles.presetChip,
                  { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' },
                  address === p.name && styles.presetChipActive,
                ]}
                onPress={() => handleSelectPreset(p)}
                activeOpacity={0.8}
              >
                <Feather name="map-pin" size={14} color={address === p.name ? '#0284C7' : textSecondary} />
                <Text style={[styles.presetText, { color: textPrimary }]} numberOfLines={1}>
                  {p.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Fee Notice */}
          <View style={styles.feeNotice}>
            <MaterialCommunityIcons name="cash" size={20} color="#16A34A" />
            <Text style={styles.feeNoticeText}>
              +₹30.00 will be added to the estimated fare for this stop.
            </Text>
          </View>

          {/* Action CTA */}
          <TouchableOpacity
            style={[styles.confirmBtn, (!address.trim() || submitting) && styles.confirmBtnDisabled]}
            onPress={handleConfirmAddStop}
            disabled={!address.trim() || submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.confirmBtnText}>CONFIRM & ADD STOP</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subTitle: {
    fontSize: 12,
    marginTop: 2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 10,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  presetsList: {
    gap: 8,
    marginBottom: 16,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  presetChipActive: {
    borderWidth: 1.5,
    borderColor: '#0284C7',
  },
  presetText: {
    fontSize: 13,
    fontWeight: '500',
  },
  feeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
  },
  feeNoticeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16A34A',
  },
  confirmBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.6,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
})
