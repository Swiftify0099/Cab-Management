/**
 * FatigueAlert Component
 * ─────────────────────────────────────────────────────────────
 * Full-screen modal alert for driver fatigue detection.
 * Triggered after 4 hours of continuous driving.
 * Shows nearest hotels and fuel stations for a recommended rest stop.
 */
import React from 'react'
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, StatusBar,
} from 'react-native'
import { Ionicons, Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useNearbyPlaces } from '../../hooks/useNearbyPlaces'

// ─── Types ────────────────────────────────────────────────────
interface FatigueAlertProps {
  visible: boolean
  driveHours: number
  driverLat?: number
  driverLng?: number
  onDismiss: () => void
  onBreakTaken: () => void
}

// ─── Component ────────────────────────────────────────────────
export function FatigueAlert({
  visible,
  driveHours,
  driverLat,
  driverLng,
  onDismiss,
  onBreakTaken,
}: FatigueAlertProps) {
  const { places: hotels }   = useNearbyPlaces(driverLat ?? null, driverLng ?? null, 'lodging',   10000, visible)
  const { places: fuelStops }= useNearbyPlaces(driverLat ?? null, driverLng ?? null, 'gas_station', 5000, visible)

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.backdrop}>
        <LinearGradient
          colors={['#0F172A', '#1E293B']}
          style={styles.card}
        >
          {/* Warning Icon */}
          <View style={styles.iconRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="warning" size={36} color="#F59E0B" />
            </View>
          </View>

          <Text style={styles.title}>⚠️ Driver Fatigue Alert</Text>
          <Text style={styles.subtitle}>
            You have been driving for{' '}
            <Text style={{ color: '#F59E0B', fontWeight: '800' }}>
              {driveHours.toFixed(1)} hours
            </Text>{' '}
            without a break.
          </Text>
          <Text style={styles.body}>
            Fatigue significantly increases accident risk. Please take a{' '}
            <Text style={{ color: '#10B981', fontWeight: '700' }}>20-minute break</Text>.
          </Text>

          {/* Nearby Hotels */}
          {hotels.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>🏨 Nearby Rest Stops</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {hotels.slice(0, 4).map(h => (
                  <View key={h.placeId} style={styles.placeChip}>
                    <Text style={styles.placeName} numberOfLines={1}>{h.name}</Text>
                    <Text style={styles.placeRating}>⭐ {h.rating}</Text>
                  </View>
                ))}
              </ScrollView>
            </>
          )}

          {/* Nearby Fuel */}
          {fuelStops.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>⛽ Nearby Fuel Stations</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                {fuelStops.slice(0, 4).map(f => (
                  <View key={f.placeId} style={[styles.placeChip, styles.fuelChip]}>
                    <Text style={styles.placeName} numberOfLines={1}>{f.name}</Text>
                    <Text style={styles.placeAddr} numberOfLines={1}>{f.address}</Text>
                  </View>
                ))}
              </ScrollView>
            </>
          )}

          {/* Actions */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss}>
              <Feather name="x" size={14} color="#94A3B8" />
              <Text style={styles.dismissText}>Skip</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.breakBtn} onPress={onBreakTaken}>
              <Ionicons name="cafe" size={16} color="#fff" />
              <Text style={styles.breakText}>I'm Taking a Break</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  iconRow:   { alignItems: 'center', marginBottom: 16 },
  iconCircle:{
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(245,158,11,0.15)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(245,158,11,0.4)',
  },
  title:    { color: '#F1F5F9', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: '#CBD5E1', fontSize: 15, textAlign: 'center', marginBottom: 8 },
  body:     { color: '#94A3B8', fontSize: 13, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  sectionLabel: { color: '#64748B', fontSize: 12, fontWeight: '700', marginBottom: 8, letterSpacing: 0.5 },
  placeChip: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minWidth: 130,
  },
  fuelChip: { borderColor: 'rgba(245,158,11,0.3)' },
  placeName:   { color: '#F1F5F9', fontSize: 12, fontWeight: '600', marginBottom: 3 },
  placeRating: { color: '#F59E0B', fontSize: 11, fontWeight: '500' },
  placeAddr:   { color: '#64748B', fontSize: 10 },
  btnRow: { flexDirection: 'row', gap: 12 },
  dismissBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 14,
  },
  dismissText: { color: '#94A3B8', fontWeight: '600', fontSize: 14 },
  breakBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#10B981', borderRadius: 14, paddingVertical: 14,
    shadowColor: '#10B981', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  breakText: { color: '#fff', fontWeight: '800', fontSize: 14 },
})
