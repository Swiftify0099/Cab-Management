/**
 * EmergencySOSModal — Feature 10: Emergency Response & Safety SOS Modal
 * Instant direct dialer to 112, live PostGIS location broadcast, and 24/7 Safety escalation.
 */
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { DuringRideService } from '../../services/duringRideService'
import { SOSResponse } from '../../types/duringRide'

interface EmergencySOSModalProps {
  visible: boolean
  isDark: boolean
  rideId: string
  driverLat: number
  driverLng: number
  accuracy?: number
  onClose: () => void
}

export function EmergencySOSModal({
  visible,
  isDark,
  rideId,
  driverLat,
  driverLng,
  accuracy = 10.0,
  onClose,
}: EmergencySOSModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [sosResult, setSosResult] = useState<SOSResponse | null>(null)
  const [countdown, setCountdown] = useState(5)
  const [isAlertSent, setIsAlertSent] = useState(false)

  useEffect(() => {
    if (!visible) {
      setCountdown(5)
      setSosResult(null)
      setIsAlertSent(false)
      return
    }

    // Automatically broadcast safety alert
    const trigger = async () => {
      setSubmitting(true)
      try {
        const res = await DuringRideService.triggerSOS(
          rideId,
          driverLat,
          driverLng,
          accuracy,
          'Driver emergency SOS trigger'
        )
        setSosResult(res)
        setIsAlertSent(true)
      } catch (err: any) {
        console.warn('SOS trigger error:', err.message)
      } finally {
        setSubmitting(false)
      }
    }

    trigger()

    const timer = setInterval(() => {
      setCountdown(c => (c > 0 ? c - 1 : 0))
    }, 1000)

    return () => clearInterval(timer)
  }, [visible, rideId, driverLat, driverLng, accuracy])

  const handleCallPolice = () => {
    Linking.openURL('tel:112')
  }

  const handleCallAmbulance = () => {
    Linking.openURL('tel:108')
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Pulsing Emergency Header */}
          <View style={styles.headerRow}>
            <View style={styles.sosIconWrap}>
              <MaterialCommunityIcons name="alarm-light" size={32} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.title}>EMERGENCY SOS ACTIVE</Text>
              <Text style={styles.subTitle}>Safety Command Center Alerted</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Status Message */}
          <View style={styles.statusBox}>
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : isAlertSent ? (
              <View style={styles.alertSentRow}>
                <Feather name="check-circle" size={18} color="#4ADE80" />
                <Text style={styles.alertSentText}>
                  GPS Location Broadcasted • 24/7 Team Monitoring
                </Text>
              </View>
            ) : (
              <Text style={styles.locationText}>Transmitting emergency coordinates...</Text>
            )}
            <Text style={styles.coordsText}>
              📍 Lat: {driverLat.toFixed(5)}, Lng: {driverLng.toFixed(5)} (±{accuracy.toFixed(0)}m)
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsCol}>
            <TouchableOpacity style={styles.policeBtn} onPress={handleCallPolice} activeOpacity={0.85}>
              <Feather name="phone-call" size={22} color="#FFFFFF" />
              <View>
                <Text style={styles.policeBtnTitle}>CALL POLICE (112)</Text>
                <Text style={styles.policeBtnSub}>Instant direct emergency connection</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.ambulanceBtn} onPress={handleCallAmbulance} activeOpacity={0.85}>
              <MaterialCommunityIcons name="ambulance" size={22} color="#FFFFFF" />
              <View>
                <Text style={styles.policeBtnTitle}>CALL AMBULANCE (108)</Text>
                <Text style={styles.policeBtnSub}>Medical emergency assistance</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Dismiss Button */}
          <TouchableOpacity style={styles.dismissBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.dismissText}>I Am Safe (Dismiss Screen)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  container: {
    borderRadius: 24,
    backgroundColor: '#7F1D1D',
    padding: 22,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#DC2626',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sosIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  subTitle: {
    fontSize: 12,
    color: '#FECACA',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  statusBox: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    padding: 14,
    borderRadius: 14,
    marginBottom: 20,
  },
  alertSentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  alertSentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4ADE80',
  },
  locationText: {
    fontSize: 12,
    color: '#FEE2E2',
    marginBottom: 4,
  },
  coordsText: {
    fontSize: 11,
    color: '#FECACA',
  },
  actionsCol: {
    gap: 12,
    marginBottom: 18,
  },
  policeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  ambulanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#991B1B',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 14,
  },
  policeBtnTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  policeBtnSub: {
    fontSize: 11,
    color: '#FEE2E2',
    marginTop: 1,
  },
  dismissBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
