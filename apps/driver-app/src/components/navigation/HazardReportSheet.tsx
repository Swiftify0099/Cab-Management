/**
 * Hazard Report Sheet Component — Feature 7
 * One-tap road hazard reporting bottom sheet with 6 large driver-safe touch tiles.
 */
import React, { useState } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { HazardType } from '../../types/navigation'

interface Props {
  visible: boolean
  isDark?: boolean
  currentAddress?: string
  onClose: () => void
  onSubmitHazard: (type: HazardType) => Promise<void>
}

const HAZARDS: { id: HazardType; label: string; icon: string; iconSet: 'feather' | 'mci'; color: string }[] = [
  { id: 'construction', label: 'Construction', icon: 'cone', iconSet: 'mci', color: '#F59E0B' },
  { id: 'pothole', label: 'Pothole / Bump', icon: 'alert-octagon', iconSet: 'feather', color: '#EA580C' },
  { id: 'accident', label: 'Accident', icon: 'car-traction-control', iconSet: 'mci', color: '#DC2626' },
  { id: 'road_closed', label: 'Road Closed', icon: 'cancel', iconSet: 'mci', color: '#991B1B' },
  { id: 'heavy_traffic', label: 'Heavy Jam', icon: 'traffic-light', iconSet: 'mci', color: '#EAB308' },
  { id: 'flooding', label: 'Flooding', icon: 'water', iconSet: 'mci', color: '#0284C7' },
]

export const HazardReportSheet: React.FC<Props> = ({
  visible,
  isDark = false,
  currentAddress = 'Current GPS Location',
  onClose,
  onSubmitHazard,
}) => {
  const [submitting, setSubmitting] = useState<HazardType | null>(null)

  const handleSelect = async (type: HazardType) => {
    setSubmitting(type)
    try {
      await onSubmitHazard(type)
    } finally {
      setSubmitting(null)
      onClose()
    }
  }

  const bgSheet = isDark ? '#1E293B' : '#FFFFFF'
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A'
  const textSecondary = isDark ? '#94A3B8' : '#64748B'

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: bgSheet }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="alert-decagram" size={24} color="#F59E0B" />
              <Text style={[styles.title, { color: textPrimary }]}>Report Road Hazard</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subText, { color: textSecondary }]}>
            Tap a tile to report at your current position: {currentAddress}
          </Text>

          {/* 6 Grid Tiles */}
          <View style={styles.grid}>
            {HAZARDS.map(h => {
              const isBusy = submitting === h.id
              return (
                <TouchableOpacity
                  key={h.id}
                  style={[
                    styles.tile,
                    {
                      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                    },
                  ]}
                  onPress={() => handleSelect(h.id)}
                  disabled={submitting !== null}
                  activeOpacity={0.7}
                >
                  {isBusy ? (
                    <ActivityIndicator size="small" color={h.color} />
                  ) : (
                    <>
                      <View style={[styles.iconCircle, { backgroundColor: `${h.color}15` }]}>
                        {h.iconSet === 'feather' ? (
                          <Feather name={h.icon as any} size={24} color={h.color} />
                        ) : (
                          <MaterialCommunityIcons name={h.icon as any} size={24} color={h.color} />
                        )}
                      </View>
                      <Text style={[styles.tileLabel, { color: textPrimary }]}>{h.label}</Text>
                    </>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>

          <Text style={[styles.footerNote, { color: textSecondary }]}>
            Reports auto-expire in 2–12 hours. PostGIS clusters duplicate reports automatically.
          </Text>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 6,
  },
  subText: {
    fontSize: 12,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  tile: {
    width: '48%',
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tileLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  footerNote: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 18,
  },
})
