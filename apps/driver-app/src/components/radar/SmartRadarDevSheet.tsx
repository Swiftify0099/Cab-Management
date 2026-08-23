/**
 * Smart Radar Developer Simulation Sheet — Feature 6
 * 14 Edge simulation scenarios for testing multi-offer matching, atomic race conditions, and preference modes.
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
import { SmartRadarCandidate } from '../../types/smartRadar'

interface Props {
  visible: boolean
  onClose: () => void
  onInjectCandidate: (candidate: SmartRadarCandidate) => void
  onSimulateMatchOutcome: (won: boolean) => void
  onSimulateModeChange: (mode: string) => void
  onReset: () => void
}

export const SmartRadarDevSheet: React.FC<Props> = ({
  visible,
  onClose,
  onInjectCandidate,
  onSimulateMatchOutcome,
  onSimulateModeChange,
  onReset,
}) => {
  if (!__DEV__) return null;
  const injectAirportRide = () => {
    const candidate: SmartRadarCandidate = {
      ride_id: `sim-airport-${Date.now()}`,
      smart_score: 96.2,
      match_percentage: 96,
      human_reason: '96% Match • Airport Express',
      classification: {
        trip_type: 'AIRPORT',
        distance_class: 'MEDIUM',
        demand_level: 'NORMAL',
        earning_class: 'HIGH_EARNING',
        badge_label: '✈️ Airport Trip • 96% Match',
        badge_color: 'purple',
        earning_per_km: 38.0,
        earning_per_hour: 1050.0,
      },
      pickup_distance_km: 1.8,
      pickup_eta_min: 5,
      trip_distance_km: 15.2,
      trip_duration_min: 34,
      fare: 720.0,
      driver_earning: 576.0,
      pickup: {
        address: 'Kalyani Nagar Trump Towers, Pune',
        lat: 18.5478,
        lng: 73.9023,
        distance_km: 1.8,
        eta_min: 5,
      },
      destination: {
        address: 'Pune Airport (PNQ) Terminal 2 VIP Departure',
        lat: 18.5822,
        lng: 73.9197,
      },
      seats: 2,
      category_name: 'Premium',
      scoring_version: 'v1',
    }
    onInjectCandidate(candidate)
    onClose()
  }

  const injectHighDemandRide = () => {
    const candidate: SmartRadarCandidate = {
      ride_id: `sim-surge-${Date.now()}`,
      smart_score: 93.5,
      match_percentage: 94,
      human_reason: '94% Match • High Surge 1.8x',
      classification: {
        trip_type: 'LOCAL',
        distance_class: 'LONG',
        demand_level: 'VERY_HIGH',
        earning_class: 'HIGH_EARNING',
        badge_label: '🔥 High Demand • ₹36/km',
        badge_color: 'orange',
        earning_per_km: 36.5,
        earning_per_hour: 1120.0,
      },
      pickup_distance_km: 2.9,
      pickup_eta_min: 8,
      trip_distance_km: 24.5,
      trip_duration_min: 44,
      fare: 1100.0,
      driver_earning: 880.0,
      pickup: {
        address: 'Senapati Bapat Road ICC Tech Park',
        lat: 18.5314,
        lng: 73.8298,
        distance_km: 2.9,
        eta_min: 8,
      },
      destination: {
        address: 'Hinjewadi Megapolis Circle',
        lat: 18.5913,
        lng: 73.7389,
      },
      seats: 1,
      category_name: 'Economy',
      scoring_version: 'v1',
    }
    onInjectCandidate(candidate)
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="hardware-chip" size={20} color="#F59E0B" />
              <Text style={styles.title}>Smart Radar Edge Simulators</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* 1. Opportunity Injections */}
            <Text style={styles.sectionHeader}>1. INJECT RADAR OPPORTUNITY</Text>
            <TouchableOpacity style={styles.btnPrimary} onPress={injectAirportRide}>
              <Text style={styles.btnPrimaryText}>✈️ Inject Airport Express Ride (₹576 Earning)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnPrimary, { backgroundColor: '#EA580C', marginTop: 8 }]}
              onPress={injectHighDemandRide}
            >
              <Text style={styles.btnPrimaryText}>🔥 Inject 1.8x Surge Ride (₹880 Earning)</Text>
            </TouchableOpacity>

            {/* 2. Atomic Match Outcome Simulations */}
            <Text style={[styles.sectionHeader, { marginTop: 16 }]}>2. ATOMIC MATCH OUTCOME SIMULATIONS</Text>
            <View style={styles.grid}>
              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onSimulateMatchOutcome(true)
                  onClose()
                }}
              >
                <Feather name="check-circle" size={16} color="#16A34A" />
                <Text style={styles.gridBtnText}>Simulate Match Win</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onSimulateMatchOutcome(false)
                  onClose()
                }}
              >
                <Feather name="x-circle" size={16} color="#DC2626" />
                <Text style={styles.gridBtnText}>Simulate Match Loss</Text>
              </TouchableOpacity>
            </View>

            {/* 3. Driving Focus Mode Switcher */}
            <Text style={[styles.sectionHeader, { marginTop: 16 }]}>3. DRIVING FOCUS MODE SWITCH</Text>
            <View style={styles.grid}>
              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onSimulateModeChange('balanced')
                  onClose()
                }}
              >
                <Feather name="sliders" size={16} color="#0284C7" />
                <Text style={styles.gridBtnText}>Balanced Mode</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onSimulateModeChange('earnings_focus')
                  onClose()
                }}
              >
                <Feather name="dollar-sign" size={16} color="#16A34A" />
                <Text style={styles.gridBtnText}>Earnings Focus</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onSimulateModeChange('nearby_focus')
                  onClose()
                }}
              >
                <Feather name="map-pin" size={16} color="#EA580C" />
                <Text style={styles.gridBtnText}>Nearby Focus</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onSimulateModeChange('airport_focus')
                  onClose()
                }}
              >
                <Feather name="send" size={16} color="#9333EA" />
                <Text style={styles.gridBtnText}>Airport Focus</Text>
              </TouchableOpacity>
            </View>

            {/* 4. Reset */}
            <TouchableOpacity
              style={[styles.btnPrimary, { backgroundColor: '#475569', marginTop: 18 }]}
              onPress={() => {
                onReset()
                onClose()
              }}
            >
              <Text style={styles.btnPrimaryText}>🔄 Reset Radar Candidate Pool</Text>
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
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    maxHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  content: {
    paddingVertical: 14,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  btnPrimary: {
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  gridBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
})
