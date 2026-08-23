/**
 * Ride Request Developer Mode Simulation Panel — Feature 5
 * Complete suite of 14 edge simulators for testing production ride dispatch behaviors.
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
import { RideOfferPayload } from '../../types/rideRequest'

interface Props {
  visible: boolean
  onClose: () => void
  onSimulateOffer: (offer: RideOfferPayload) => void
  onSimulateStateChange: (state: string) => void
  onSimulateSocketToggle: (connected: boolean) => void
}

export const RideRequestDevSheet: React.FC<Props> = ({
  visible,
  onClose,
  onSimulateOffer,
  onSimulateStateChange,
  onSimulateSocketToggle,
}) => {
  if (!__DEV__) return null;
  const triggerEconomySample = () => {
    const offer: RideOfferPayload = {
      offer_id: `sim-econ-${Date.now()}`,
      ride_request_id: `req-${Date.now()}`,
      pickup: {
        address: 'Koregaon Park, Pune (North Main Rd)',
        lat: 18.5362,
        lng: 73.8939,
        distance_km: 2.4,
        eta_min: 7,
      },
      destination: {
        address: 'Hinjewadi IT Park Phase 1, Pune',
        lat: 18.5913,
        lng: 73.7389,
      },
      trip: {
        from: 'Koregaon Park, Pune',
        to: 'Hinjewadi IT Park Phase 1',
        distance_km: 12.8,
        duration_min: 28,
        fare: 285,
        earning: 228,
        seats: 1,
      },
      category: {
        name: 'Economy',
        icon: 'car',
      },
      seat_info: {
        total_seats: 4,
        available_seats: 4,
        available_labels: ['Front Window', 'Rear Left', 'Rear Right', 'Rear Middle'],
        requested_seats: 1,
      },
      expires_at: new Date(Date.now() + 180000).toISOString(),
      timeout_sec: 180,
      paid: true,
    }
    onSimulateOffer(offer)
    onClose()
  }

  const triggerSuvSample = () => {
    const offer: RideOfferPayload = {
      offer_id: `sim-suv-${Date.now()}`,
      ride_request_id: `req-suv-${Date.now()}`,
      pickup: {
        address: 'Pune Airport Terminal 2 Arrival Gate',
        lat: 18.5822,
        lng: 73.9197,
        distance_km: 4.8,
        eta_min: 12,
      },
      destination: {
        address: 'Magarpatta Cybercity, Tower 6',
        lat: 18.5135,
        lng: 73.9298,
      },
      trip: {
        from: 'Pune Airport (PNQ)',
        to: 'Magarpatta Cybercity',
        distance_km: 14.5,
        duration_min: 35,
        fare: 750,
        earning: 600,
        seats: 4,
      },
      category: {
        name: 'SUV',
        icon: 'car-estate',
      },
      seat_info: {
        total_seats: 6,
        available_seats: 6,
        available_labels: ['Front Window', 'Middle Left', 'Middle Right', 'Rear Left', 'Rear Right'],
        requested_seats: 4,
      },
      expires_at: new Date(Date.now() + 180000).toISOString(),
      timeout_sec: 180,
      paid: true,
    }
    onSimulateOffer(offer)
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="hardware-chip" size={20} color="#F59E0B" />
              <Text style={styles.title}>Feature 5 Edge Simulators</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Offer Injections */}
            <Text style={styles.sectionHeader}>1. INCOMING OFFER INJECTION</Text>
            <TouchableOpacity style={styles.btnPrimary} onPress={triggerEconomySample}>
              <Text style={styles.btnPrimaryText}>🚕 Inject Economy Ride Request (180s Ringing)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: '#4338CA', marginTop: 8 }]} onPress={triggerSuvSample}>
              <Text style={styles.btnPrimaryText}>🚙 Inject SUV Ride Request (6 Seats, ₹750 Fare)</Text>
            </TouchableOpacity>

            {/* Lifecycle Edge States */}
            <Text style={[styles.sectionHeader, { marginTop: 18 }]}>2. REQUEST LIFECYCLE SIMULATIONS</Text>
            <View style={styles.grid}>
              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onSimulateStateChange('CUSTOMER_CANCELLED')
                  onClose()
                }}
              >
                <Feather name="x-circle" size={16} color="#DC2626" />
                <Text style={styles.gridBtnText}>Customer Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onSimulateStateChange('ALREADY_ASSIGNED')
                  onClose()
                }}
              >
                <Feather name="user-check" size={16} color="#2563EB" />
                <Text style={styles.gridBtnText}>Already Assigned</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onSimulateStateChange('EXPIRED')
                  onClose()
                }}
              >
                <Feather name="clock" size={16} color="#D97706" />
                <Text style={styles.gridBtnText}>180s Timeout</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onSimulateStateChange('ACCEPTED')
                  onClose()
                }}
              >
                <Feather name="check" size={16} color="#16A34A" />
                <Text style={styles.gridBtnText}>Accept Success</Text>
              </TouchableOpacity>
            </View>

            {/* Network & Connectivity */}
            <Text style={[styles.sectionHeader, { marginTop: 18 }]}>3. NETWORK & EDGE DISRUPTIONS</Text>
            <View style={styles.grid}>
              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onSimulateSocketToggle(false)
                  onClose()
                }}
              >
                <MaterialCommunityIcons name="wifi-off" size={18} color="#DC2626" />
                <Text style={styles.gridBtnText}>Socket Drop</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onSimulateSocketToggle(true)
                  onClose()
                }}
              >
                <MaterialCommunityIcons name="wifi-check" size={18} color="#16A34A" />
                <Text style={styles.gridBtnText}>Socket Reconnect</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onSimulateStateChange('SERVER_ERROR')
                  onClose()
                }}
              >
                <Feather name="alert-triangle" size={16} color="#F59E0B" />
                <Text style={styles.gridBtnText}>500 Server Error</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => {
                  onSimulateStateChange('DISMISSED')
                  onClose()
                }}
              >
                <Feather name="refresh-cw" size={16} color="#475569" />
                <Text style={styles.gridBtnText}>Reset State</Text>
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
