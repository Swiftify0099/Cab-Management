/**
 * Features 20, 21 & 22 Developer Simulation Sandbox Sheet
 * 20 Comprehensive Edge Controls for Destination Mode, Back-to-Back Continuous Dispatch,
 * and Driver Safety Intelligence.
 */
import React from 'react'
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { BackToBackCandidate } from '../../types/backToBack'
import { SafetyAlertType } from '../../types/driverSafety'

interface Props {
  visible: boolean
  onClose: () => void
  onSimulateDestinationSet: () => void
  onSimulateDestinationReached: () => void
  onSimulateDestinationExpired: () => void
  onInjectAlignedRide: () => void
  onInjectMisalignedRide: () => void
  onSimulateNearDropoff: () => void
  onInjectNextRideOffer: (candidate: BackToBackCandidate) => void
  onSimulateNextRideReserved: () => void
  onSimulateNextRideReleased: () => void
  onSimulateB2BTransition: () => void
  onTriggerSOS: () => void
  onInjectSafetyAlert: (type: SafetyAlertType, msg: string) => void
  onSimulateImSafe: () => void
  onSimulateTripShare: () => void
  onOpenReportIncident: () => void
  onReset: () => void
}

export const SafetyDevSheet: React.FC<Props> = ({
  visible,
  onClose,
  onSimulateDestinationSet,
  onSimulateDestinationReached,
  onSimulateDestinationExpired,
  onInjectAlignedRide,
  onInjectMisalignedRide,
  onSimulateNearDropoff,
  onInjectNextRideOffer,
  onSimulateNextRideReserved,
  onSimulateNextRideReleased,
  onSimulateB2BTransition,
  onTriggerSOS,
  onInjectSafetyAlert,
  onSimulateImSafe,
  onSimulateTripShare,
  onOpenReportIncident,
  onReset,
}) => {
  if (!__DEV__) return null;
  const injectSampleNextRide = () => {
    const candidate: BackToBackCandidate = {
      ride_id: `sim-b2b-${Date.now()}`,
      smart_score: 95.8,
      match_percentage: 96,
      human_reason: '96% Match • Next Pickup 1.8km',
      pickup_distance_km: 1.8,
      pickup_eta_min: 5,
      trip_distance_km: 14.2,
      trip_duration_min: 32,
      fare: 540.0,
      driver_earning: 432.0,
      pickup_distance_from_current_dropoff_km: 1.8,
      pickup_eta_from_current_dropoff_min: 5,
      is_back_to_back: true,
      pickup: {
        address: 'Koregaon Park North Main Rd, Pune',
        lat: 18.5362,
        lng: 73.8939,
        distance_km: 1.8,
        eta_min: 5,
      },
      destination: {
        address: 'City Center Mall, Pune',
        lat: 18.5204,
        lng: 73.8567,
      },
      category_name: 'Premium',
    }
    onInjectNextRideOffer(candidate)
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="hardware-chip-outline" size={22} color="#0284C7" />
              <Text style={styles.title}>Dev Simulators (Features 20, 21 & 22)</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Feature 20: Destination Mode */}
            <Text style={styles.sectionHeader}>FEATURE 20: DESTINATION MODE</Text>
            <View style={styles.grid}>
              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onSimulateDestinationSet()
                  onClose()
                }}
              >
                <Ionicons name="navigate" size={16} color="#059669" />
                <Text style={styles.gridBtnText}>1. Target: Sangli</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onInjectAlignedRide()
                  onClose()
                }}
              >
                <Feather name="target" size={16} color="#10B981" />
                <Text style={styles.gridBtnText}>2. Aligned Ride</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onInjectMisalignedRide()
                  onClose()
                }}
              >
                <Feather name="slash" size={16} color="#F59E0B" />
                <Text style={styles.gridBtnText}>3. Reverse Ride</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onSimulateDestinationReached()
                  onClose()
                }}
              >
                <Ionicons name="checkmark-done" size={16} color="#0284C7" />
                <Text style={styles.gridBtnText}>4. Dest Reached</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onSimulateDestinationExpired()
                  onClose()
                }}
              >
                <Feather name="clock" size={16} color="#EF4444" />
                <Text style={styles.gridBtnText}>5. Dest Expired</Text>
              </TouchableOpacity>
            </View>

            {/* Feature 21: Back-to-Back Continuous Dispatch */}
            <Text style={styles.sectionHeader}>FEATURE 21: BACK-TO-BACK RIDES</Text>
            <View style={styles.grid}>
              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onSimulateNearDropoff()
                  onClose()
                }}
              >
                <MaterialCommunityIcons name="map-marker-distance" size={16} color="#2563EB" />
                <Text style={styles.gridBtnText}>6. Near Dropoff</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.gridBtn} onPress={injectSampleNextRide}>
                <Ionicons name="flash" size={16} color="#3B82F6" />
                <Text style={styles.gridBtnText}>7. Next Ride Offer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onSimulateNextRideReserved()
                  onClose()
                }}
              >
                <Ionicons name="lock-closed" size={16} color="#059669" />
                <Text style={styles.gridBtnText}>8. Next Reserved</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onSimulateNextRideReleased()
                  onClose()
                }}
              >
                <Feather name="unlock" size={16} color="#F59E0B" />
                <Text style={styles.gridBtnText}>9. Release Next</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onSimulateB2BTransition()
                  onClose()
                }}
              >
                <MaterialCommunityIcons name="transit-connection-variant" size={16} color="#7C3AED" />
                <Text style={styles.gridBtnText}>10. No-Idle Switch</Text>
              </TouchableOpacity>
            </View>

            {/* Feature 22: Driver Safety & Anomalies */}
            <Text style={styles.sectionHeader}>FEATURE 22: DRIVER SAFETY INTELLIGENCE</Text>
            <View style={styles.grid}>
              <TouchableOpacity
                style={[styles.gridBtn, { backgroundColor: '#FEE2E2', borderColor: '#DC2626' }]}
                onPress={() => {
                  onTriggerSOS()
                  onClose()
                }}
              >
                <Ionicons name="warning" size={16} color="#DC2626" />
                <Text style={[styles.gridBtnText, { color: '#DC2626' }]}>11. 🚨 Trigger SOS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onInjectSafetyAlert('ROUTE_DEVIATION', 'Driver is 650m off route path.')
                  onClose()
                }}
              >
                <Feather name="corner-up-right" size={16} color="#D97706" />
                <Text style={styles.gridBtnText}>12. Route Deviation</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onInjectSafetyAlert('LONG_STOP', 'Vehicle stationary for 5 minutes.')
                  onClose()
                }}
              >
                <Feather name="pause-circle" size={16} color="#D97706" />
                <Text style={styles.gridBtnText}>13. Long Stop</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onInjectSafetyAlert('OVERSPEED', 'Speed 88 km/h in 50 km/h zone.')
                  onClose()
                }}
              >
                <MaterialCommunityIcons name="speedometer" size={16} color="#DC2626" />
                <Text style={styles.gridBtnText}>14. Speed Alert</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onSimulateImSafe()
                  onClose()
                }}
              >
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.gridBtnText}>15. 'I'm Safe' Tap</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onSimulateTripShare()
                  onClose()
                }}
              >
                <Feather name="share-2" size={16} color="#0284C7" />
                <Text style={styles.gridBtnText}>16. Share Trip Link</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onClose()
                  onOpenReportIncident()
                }}
              >
                <Feather name="file-text" size={16} color="#7C3AED" />
                <Text style={styles.gridBtnText}>17. Report Incident</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.gridBtn, { backgroundColor: '#F1F5F9' }]}
                onPress={() => {
                  onReset()
                  onClose()
                }}
              >
                <Feather name="refresh-cw" size={16} color="#64748B" />
                <Text style={styles.gridBtnText}>18. Reset All</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  content: {
    padding: 20,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridBtn: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    gap: 6,
  },
  gridBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
})
