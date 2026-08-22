/**
 * Navigation, Waiting & Cancellation Developer Simulation Sheet — Features 7, 8, 9, 10, 11 & 12
 * Complete 20+ Edge simulation controls for real-time routing, waiting timers,
 * free/paid transitions, no-show eligibility, structured cancellation reasons,
 * rate calculations, and performance metrics.
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
import { NavigationPhase, HazardType } from '../../types/navigation'

interface Props {
  visible: boolean
  onClose: () => void
  onSetPhase: (phase: NavigationPhase) => void
  onTriggerReroute: () => void
  onInjectHazard: (type: HazardType) => void
  onSimulateGPSQuality: (quality: 'good' | 'weak' | 'lost') => void
  onSimulateSpeed: (speed: number) => void
  onOpenMaskedCall?: () => void
  onOpenChat?: () => void
  onOpenAssistance?: () => void
  onOpenNoShow?: () => void
  onFastForwardTimer?: () => void
  onOpenAddStop?: () => void
  onOpenUpdateDestination?: () => void
  onOpenSOS?: () => void
  onSimulateStopArrival?: () => void
  onSimulateStopDepart?: () => void
  onOpenCancelModal?: () => void
  onSimulatePaidWaiting?: () => void
  onSimulateNoShowEligible?: () => void
  onReset: () => void
}

export const NavigationDevSheet: React.FC<Props> = ({
  visible,
  onClose,
  onSetPhase,
  onTriggerReroute,
  onInjectHazard,
  onSimulateGPSQuality,
  onSimulateSpeed,
  onOpenMaskedCall,
  onOpenChat,
  onOpenAssistance,
  onOpenNoShow,
  onFastForwardTimer,
  onOpenAddStop,
  onOpenUpdateDestination,
  onOpenSOS,
  onSimulateStopArrival,
  onSimulateStopDepart,
  onOpenCancelModal,
  onSimulatePaidWaiting,
  onSimulateNoShowEligible,
  onReset,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="hardware-chip-outline" size={22} color="#0284C7" />
              <Text style={styles.title}>Dev Simulators (Features 7–12)</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* 1. Lifecycle Phases */}
            <Text style={styles.sectionHeader}>1. NAVIGATION LIFECYCLE PHASES</Text>
            <View style={styles.grid}>
              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onSetPhase('EN_ROUTE_PICKUP')
                  onClose()
                }}
              >
                <Feather name="map-pin" size={16} color="#0284C7" />
                <Text style={styles.gridBtnText}>1. Nav to Pickup</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onSetPhase('ARRIVED_PICKUP')
                  onClose()
                }}
              >
                <Feather name="check-circle" size={16} color="#16A34A" />
                <Text style={styles.gridBtnText}>2. Arrived Pickup</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onSetPhase('EN_ROUTE_DESTINATION')
                  onClose()
                }}
              >
                <MaterialCommunityIcons name="navigation" size={16} color="#9333EA" />
                <Text style={styles.gridBtnText}>3. Trip to Dropoff</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onSetPhase('ARRIVED_DESTINATION')
                  onClose()
                }}
              >
                <Feather name="flag" size={16} color="#EA580C" />
                <Text style={styles.gridBtnText}>4. Arrived Dropoff</Text>
              </TouchableOpacity>
            </View>

            {/* 2. Feature 11: Waiting System Controls */}
            <Text style={styles.sectionHeader}>2. FEATURE 11: WAITING CONTROLS</Text>
            <View style={styles.grid}>
              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onSimulatePaidWaiting?.()
                  onClose()
                }}
              >
                <MaterialCommunityIcons name="clock-fast" size={16} color="#F59E0B" />
                <Text style={styles.gridBtnText}>Simulate Paid (180s+)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onSimulateNoShowEligible?.()
                  onClose()
                }}
              >
                <MaterialCommunityIcons name="account-clock" size={16} color="#EF4444" />
                <Text style={styles.gridBtnText}>No-Show Ready (300s)</Text>
              </TouchableOpacity>
            </View>

            {/* 3. Feature 12: Cancellation Controls */}
            <Text style={styles.sectionHeader}>3. FEATURE 12: CANCELLATION CONTROLS</Text>
            <View style={styles.grid}>
              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onClose()
                  onOpenCancelModal?.()
                }}
              >
                <MaterialCommunityIcons name="cancel" size={16} color="#EF4444" />
                <Text style={styles.gridBtnText}>Cancel Ride Sheet</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onClose()
                  onOpenNoShow?.()
                }}
              >
                <Feather name="user-x" size={16} color="#DC2626" />
                <Text style={styles.gridBtnText}>No-Show Dialog</Text>
              </TouchableOpacity>
            </View>

            {/* 4. Feature 10: In-Flight Navigation */}
            <Text style={styles.sectionHeader}>4. FEATURE 10: DURING RIDE CONTROLS</Text>
            <View style={styles.grid}>
              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onClose()
                  onOpenAddStop?.()
                }}
              >
                <MaterialCommunityIcons name="map-marker-plus" size={16} color="#D97706" />
                <Text style={styles.gridBtnText}>+ Add Stop Sheet</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onClose()
                  onOpenUpdateDestination?.()
                }}
              >
                <Feather name="edit-3" size={16} color="#8B5CF6" />
                <Text style={styles.gridBtnText}>Change Destination</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onClose()
                  onOpenSOS?.()
                }}
              >
                <MaterialCommunityIcons name="alarm-light" size={16} color="#EF4444" />
                <Text style={styles.gridBtnText}>Emergency SOS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onSimulateStopArrival?.()
                  onClose()
                }}
              >
                <Feather name="check-square" size={16} color="#0284C7" />
                <Text style={styles.gridBtnText}>Arrive at Stop 1</Text>
              </TouchableOpacity>
            </View>

            {/* 5. Communication & Assistance */}
            <Text style={styles.sectionHeader}>5. COMMUNICATION & ASSISTANCE</Text>
            <View style={styles.grid}>
              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onClose()
                  onOpenMaskedCall?.()
                }}
              >
                <Feather name="phone-call" size={16} color="#16A34A" />
                <Text style={styles.gridBtnText}>Masked Call</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onClose()
                  onOpenChat?.()
                }}
              >
                <Feather name="message-square" size={16} color="#0284C7" />
                <Text style={styles.gridBtnText}>Passenger Chat</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onClose()
                  onOpenAssistance?.()
                }}
              >
                <Feather name="help-circle" size={16} color="#D97706" />
                <Text style={styles.gridBtnText}>Assistance Sheet</Text>
              </TouchableOpacity>
            </View>

            {/* 6. Road Hazards */}
            <Text style={styles.sectionHeader}>6. ROAD HAZARDS</Text>
            <View style={styles.grid}>
              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onInjectHazard('heavy_traffic')
                  onClose()
                }}
              >
                <MaterialCommunityIcons name="car-multiple" size={16} color="#EF4444" />
                <Text style={styles.gridBtnText}>Traffic Jam (+8m)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onInjectHazard('accident')
                  onClose()
                }}
              >
                <MaterialCommunityIcons name="alert-octagon" size={16} color="#3B82F6" />
                <Text style={styles.gridBtnText}>Accident Ahead</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onInjectHazard('flooding')
                  onClose()
                }}
              >
                <MaterialCommunityIcons name="water" size={16} color="#06B6D4" />
                <Text style={styles.gridBtnText}>Waterlogging</Text>
              </TouchableOpacity>
            </View>

            {/* 7. GPS & Telemetry Conditions */}
            <Text style={styles.sectionHeader}>7. GPS & TELEMETRY</Text>
            <View style={styles.grid}>
              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onSimulateGPSQuality('good')
                  onClose()
                }}
              >
                <MaterialCommunityIcons name="signal-cellular-3" size={16} color="#16A34A" />
                <Text style={styles.gridBtnText}>Good GPS (8m)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onSimulateGPSQuality('weak')
                  onClose()
                }}
              >
                <MaterialCommunityIcons name="signal-cellular-1" size={16} color="#F59E0B" />
                <Text style={styles.gridBtnText}>Weak GPS (45m)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onSimulateSpeed(92)
                  onClose()
                }}
              >
                <MaterialCommunityIcons name="speedometer" size={16} color="#EF4444" />
                <Text style={styles.gridBtnText}>Overspeed 92km/h</Text>
              </TouchableOpacity>
            </View>

            {/* Reset */}
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => {
                onReset()
                onClose()
              }}
            >
              <Feather name="refresh-cw" size={16} color="#64748B" />
              <Text style={styles.resetBtnText}>Reset All to Defaults</Text>
            </TouchableOpacity>
          </ScrollView>
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
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  content: {
    padding: 16,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: '47%',
  },
  gridBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
})
