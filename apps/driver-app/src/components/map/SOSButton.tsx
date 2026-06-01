/**
 * SOSButton Component
 * ─────────────────────────────────────────────────────────────
 * Emergency SOS floating button for the driver map screens.
 * On press:
 *  1. Emits SOS_TRIGGERED WebSocket event with GPS location
 *  2. Shows nearest hospital using Google Places API
 *  3. Displays emergency confirmation dialog
 *  4. Notifies customer, admin, and emergency contacts
 */
import React, { useState, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, Animated, Vibration,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { searchNearbyPlaces } from '../../services/googleMaps'

// ─── Types ────────────────────────────────────────────────────
interface SOSButtonProps {
  driverLat?: number
  driverLng?: number
  tripId?: string
  onSOS?: (payload: SOSPayload) => void   // Caller passes this to emit WebSocket event
}

export interface SOSPayload {
  type: 'SOS_TRIGGERED'
  trip_id: string
  lat: number
  lng: number
  timestamp: number
  nearest_hospital?: string
}

// ─── Component ────────────────────────────────────────────────
export function SOSButton({ driverLat, driverLng, tripId = '', onSOS }: SOSButtonProps) {
  const [triggered, setTriggered] = useState(false)
  const pulseAnim = useRef(new Animated.Value(1)).current

  // Pulse animation for the SOS ring
  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.5, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start()
  }

  const handleSOS = async () => {
    // Confirm before triggering
    Alert.alert(
      '🚨 Emergency SOS',
      'Are you in an emergency? This will alert your passenger, admin, and emergency contacts immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '⚠️ YES, SEND SOS',
          style: 'destructive',
          onPress: async () => {
            setTriggered(true)
            startPulse()

            // Haptic feedback
            Vibration.vibrate([0, 200, 100, 200, 100, 400])

            // Find nearest hospital
            let nearestHospital: string | undefined
            if (driverLat && driverLng) {
              try {
                const hospitals = await searchNearbyPlaces(
                  driverLat, driverLng, 'hospital', 10000
                )
                if (hospitals.length > 0) {
                  nearestHospital = `${hospitals[0].name} — ${hospitals[0].address}`
                }
              } catch { /* silent */ }
            }

            const payload: SOSPayload = {
              type: 'SOS_TRIGGERED',
              trip_id: tripId,
              lat: driverLat ?? 0,
              lng: driverLng ?? 0,
              timestamp: Date.now(),
              nearest_hospital: nearestHospital,
            }

            // Emit via parent callback (which calls WebSocket)
            onSOS?.(payload)

            // Show confirmation
            Alert.alert(
              '✅ SOS Sent',
              nearestHospital
                ? `Emergency alert sent!\n\nNearest Hospital:\n${nearestHospital}`
                : 'Emergency alert sent to passenger, admin, and contacts.',
              [{ text: 'OK', onPress: () => setTriggered(false) }]
            )
          },
        },
      ]
    )
  }

  return (
    <View style={styles.container}>
      {/* Pulse ring (visible after SOS) */}
      {triggered && (
        <Animated.View
          style={[
            styles.pulseRing,
            { transform: [{ scale: pulseAnim }], opacity: pulseAnim.interpolate({
              inputRange: [1, 1.5],
              outputRange: [0.6, 0],
            }) },
          ]}
        />
      )}

      {/* Main SOS button */}
      <TouchableOpacity
        style={[styles.button, triggered && styles.buttonActive]}
        onPress={handleSOS}
        activeOpacity={0.85}
      >
        <Ionicons name="warning" size={20} color="#fff" />
        <Text style={styles.label}>SOS</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239,68,68,0.4)',
  },
  button: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    gap: 2,
  },
  buttonActive: {
    backgroundColor: '#991B1B',
  },
  label: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
})
