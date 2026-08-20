/**
 * UpdateDestinationModal — Feature 10: Destination Modification Screen
 * Authoritative destination update with fare recalculation preview.
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
import { DestinationUpdateResponse } from '../../types/duringRide'

interface UpdateDestinationModalProps {
  visible: boolean
  isDark: boolean
  rideId: string
  currentDestinationAddress: string
  currentFare: number
  onClose: () => void
  onDestinationUpdated: (update: DestinationUpdateResponse) => void
}

const DESTINATION_PRESETS = [
  { name: 'World Trade Center, Kharadi', lat: 18.552, lng: 73.935, estFare: 580 },
  { name: 'Hinjawadi Phase 1 Circle', lat: 18.5912, lng: 73.7389, estFare: 740 },
  { name: 'Pune Airport Terminal 2', lat: 18.5822, lng: 73.9197, estFare: 544 },
  { name: 'Swargate Bus Terminal', lat: 18.5018, lng: 73.8582, estFare: 420 },
]

export function UpdateDestinationModal({
  visible,
  isDark,
  rideId,
  currentDestinationAddress,
  currentFare,
  onClose,
  onDestinationUpdated,
}: UpdateDestinationModalProps) {
  const [newAddress, setNewAddress] = useState('')
  const [selectedLat, setSelectedLat] = useState<number | null>(null)
  const [selectedLng, setSelectedLng] = useState<number | null>(null)
  const [previewFare, setPreviewFare] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSelectPreset = (p: { name: string; lat: number; lng: number; estFare: number }) => {
    setNewAddress(p.name)
    setSelectedLat(p.lat)
    setSelectedLng(p.lng)
    setPreviewFare(p.estFare)
  }

  const handleConfirmUpdate = async () => {
    if (!newAddress.trim()) {
      Alert.alert('Required', 'Please enter or select a new destination.')
      return
    }

    setSubmitting(true)
    const lat = selectedLat || 18.552
    const lng = selectedLng || 73.935

    try {
      const res = await DuringRideService.updateDestination(rideId, lat, lng, newAddress.trim())
      Alert.alert('Destination Updated! 🏁', `Trip updated to ${res.destination.address}.\nNew Estimated Fare: ₹${res.estimated_fare.toFixed(0)}`)
      onDestinationUpdated(res)
      onClose()
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Could not update destination.')
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
              <Text style={[styles.title, { color: textPrimary }]}>Change Destination</Text>
              <Text style={[styles.subTitle, { color: textSecondary }]} numberOfLines={1}>
                Current: {currentDestinationAddress}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={22} color={textSecondary} />
            </TouchableOpacity>
          </View>

          {/* New Destination Input */}
          <View style={[styles.inputWrap, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
            <MaterialCommunityIcons name="map-marker-distance" size={22} color="#0284C7" />
            <TextInput
              style={[styles.input, { color: textPrimary }]}
              placeholder="Search / enter new destination..."
              placeholderTextColor={textSecondary}
              value={newAddress}
              onChangeText={t => {
                setNewAddress(t)
                setPreviewFare(null)
              }}
            />
          </View>

          {/* Presets */}
          <Text style={[styles.sectionTitle, { color: textSecondary }]}>SUGGESTED DESTINATIONS:</Text>
          <View style={styles.presetsList}>
            {DESTINATION_PRESETS.map((p, idx) => (
              <TouchableOpacity
                key={`dest-${idx}`}
                style={[
                  styles.presetChip,
                  { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' },
                  newAddress === p.name && styles.presetChipActive,
                ]}
                onPress={() => handleSelectPreset(p)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.presetName, { color: textPrimary }]} numberOfLines={1}>
                    {p.name}
                  </Text>
                </View>
                <Text style={styles.presetFare}>~₹{p.estFare}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Fare Comparison Card */}
          <View style={[styles.fareCard, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
            <View style={styles.fareCol}>
              <Text style={[styles.fareLabel, { color: textSecondary }]}>Current Fare</Text>
              <Text style={[styles.fareValue, { color: textPrimary }]}>₹{currentFare.toFixed(0)}</Text>
            </View>
            <Feather name="arrow-right" size={20} color="#0284C7" />
            <View style={styles.fareCol}>
              <Text style={[styles.fareLabel, { color: textSecondary }]}>Updated Estimate</Text>
              <Text style={styles.fareValueGreen}>
                ₹{previewFare ? previewFare.toFixed(0) : '—'}
              </Text>
            </View>
          </View>

          {/* Action CTA */}
          <TouchableOpacity
            style={[styles.confirmBtn, (!newAddress.trim() || submitting) && styles.confirmBtnDisabled]}
            onPress={handleConfirmUpdate}
            disabled={!newAddress.trim() || submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.confirmBtnText}>UPDATE DESTINATION</Text>
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
    maxWidth: '85%',
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  presetChipActive: {
    borderWidth: 1.5,
    borderColor: '#0284C7',
  },
  presetName: {
    fontSize: 13,
    fontWeight: '500',
  },
  presetFare: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16A34A',
  },
  fareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 14,
    borderRadius: 14,
    marginBottom: 20,
  },
  fareCol: {
    alignItems: 'center',
  },
  fareLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  fareValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  fareValueGreen: {
    fontSize: 18,
    fontWeight: '800',
    color: '#16A34A',
    marginTop: 2,
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
