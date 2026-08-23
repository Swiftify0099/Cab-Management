/**
 * Ride Request Developer Mode Simulation Panel — Feature 5
 * Complete suite of edge simulators for testing production dispatch behaviors across:
 * Cab Booking, Parcel Delivery, Intercity Transport, and Hotel/Airport Logistics.
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
import { DriverSoundService } from '../../services/driverSoundService'

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
  if (!__DEV__) return null

  // 🚖 1. Economy Cab Booking
  const triggerEconomySample = () => {
    const offer: RideOfferPayload = {
      offer_id: `sim-econ-${Date.now()}`,
      ride_request_id: `req-${Date.now()}`,
      service_type: 'cab',
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
        name: 'Economy Cab',
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

  // ⚡ 2. Surge 2.2x Cab Booking
  const triggerSurgeCabSample = () => {
    const offer: RideOfferPayload = {
      offer_id: `sim-surge-${Date.now()}`,
      ride_request_id: `req-surge-${Date.now()}`,
      service_type: 'cab',
      pickup: {
        address: 'Viman Nagar, Phoenix Marketcity Gate 2',
        lat: 18.5679,
        lng: 73.9143,
        distance_km: 1.8,
        eta_min: 5,
      },
      destination: {
        address: 'Baner High Street, Pune',
        lat: 18.5590,
        lng: 73.7868,
      },
      trip: {
        from: 'Viman Nagar (Phoenix Mall)',
        to: 'Baner High Street',
        distance_km: 18.4,
        duration_min: 42,
        fare: 620,
        earning: 496,
        seats: 2,
      },
      category: {
        name: 'Prime Surge 2.2x',
        icon: 'car-sport',
      },
      seat_info: {
        total_seats: 4,
        available_seats: 4,
        available_labels: ['Front Window', 'Rear Left', 'Rear Right'],
        requested_seats: 2,
      },
      expires_at: new Date(Date.now() + 180000).toISOString(),
      timeout_sec: 180,
      paid: true,
    }
    onSimulateOffer(offer)
    onClose()
  }

  // 📦 3. Parcel Delivery Request
  const triggerParcelSample = () => {
    const offer: RideOfferPayload = {
      offer_id: `sim-parcel-${Date.now()}`,
      ride_request_id: `req-parcel-${Date.now()}`,
      service_type: 'parcel',
      pickup: {
        address: 'FC Road, Deccan Gymkhana (Bookstore)',
        lat: 18.5196,
        lng: 73.8415,
        distance_km: 3.2,
        eta_min: 9,
      },
      destination: {
        address: 'Kalyani Nagar, East Avenue Road',
        lat: 18.5463,
        lng: 73.9033,
      },
      trip: {
        from: 'FC Road Deccan',
        to: 'Kalyani Nagar',
        distance_km: 9.6,
        duration_min: 22,
        fare: 210,
        earning: 168,
        seats: 0,
      },
      category: {
        name: 'Parcel Express (15kg)',
        icon: 'package',
      },
      seat_info: {
        total_seats: 4,
        available_seats: 4,
        available_labels: ['Boot / Rear Seat'],
        requested_seats: 0,
      },
      expires_at: new Date(Date.now() + 180000).toISOString(),
      timeout_sec: 180,
      paid: true,
    }
    onSimulateOffer(offer)
    onClose()
  }

  // 🚌 4. Intercity Transport Route Match
  const triggerTransportSample = () => {
    const offer: RideOfferPayload = {
      offer_id: `sim-trans-${Date.now()}`,
      ride_request_id: `req-trans-${Date.now()}`,
      service_type: 'transport',
      pickup: {
        address: 'Wakad Express Highway Toll Naka',
        lat: 18.5987,
        lng: 73.7689,
        distance_km: 5.1,
        eta_min: 14,
      },
      destination: {
        address: 'Dadar TT Circle, Mumbai',
        lat: 19.0178,
        lng: 72.8478,
      },
      trip: {
        from: 'Pune (Wakad Highway)',
        to: 'Mumbai (Dadar TT)',
        distance_km: 142.5,
        duration_min: 160,
        fare: 1450,
        earning: 1160,
        seats: 3,
      },
      category: {
        name: 'Intercity Corridor',
        icon: 'bus',
      },
      seat_info: {
        total_seats: 6,
        available_seats: 6,
        available_labels: ['Front Window', 'Middle Left', 'Rear Window'],
        requested_seats: 3,
      },
      expires_at: new Date(Date.now() + 180000).toISOString(),
      timeout_sec: 180,
      paid: true,
    }
    onSimulateOffer(offer)
    onClose()
  }

  // 🏨 5. Hotel Logistics & Airport Transfer
  const triggerHotelSample = () => {
    const offer: RideOfferPayload = {
      offer_id: `sim-hotel-${Date.now()}`,
      ride_request_id: `req-hotel-${Date.now()}`,
      service_type: 'hotel',
      pickup: {
        address: 'Pune Airport (PNQ) International Terminal',
        lat: 18.5822,
        lng: 73.9197,
        distance_km: 4.5,
        eta_min: 11,
      },
      destination: {
        address: 'JW Marriott Hotel, Senapati Bapat Road',
        lat: 18.5323,
        lng: 73.8296,
      },
      trip: {
        from: 'Pune International Airport',
        to: 'JW Marriott Luxury Hotel',
        distance_km: 15.8,
        duration_min: 38,
        fare: 890,
        earning: 712,
        seats: 2,
      },
      category: {
        name: 'Hotel Transfer Partner',
        icon: 'domain',
      },
      seat_info: {
        total_seats: 4,
        available_seats: 4,
        available_labels: ['Front Window', 'Rear Left', 'Rear Right'],
        requested_seats: 2,
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
              <Text style={styles.title}>Dispatch & Siren Edge Simulators</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Direct Hardware Siren Ringing Verifier */}
            <Text style={styles.sectionHeader}>🔊 HARDWARE SIREN & VIBRATION VERIFIER</Text>
            <TouchableOpacity
              style={[styles.btnPrimary, { backgroundColor: '#EF4444' }]}
              onPress={async () => {
                await DriverSoundService.testRinging()
              }}
            >
              <Text style={styles.btnPrimaryText}>🔔 Fire Siren Sound & Continuous Vibration (5s Test)</Text>
            </TouchableOpacity>

            {/* Offer Injections Across All Services */}
            <Text style={[styles.sectionHeader, { marginTop: 18 }]}>1. MULTI-SERVICE DISPATCH INJECTIONS</Text>
            <TouchableOpacity style={styles.btnPrimary} onPress={triggerEconomySample}>
              <Text style={styles.btnPrimaryText}>🚕 1. Inject Cab Booking Request (₹285, 180s Siren Ringing)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: '#B45309', marginTop: 8 }]} onPress={triggerSurgeCabSample}>
              <Text style={styles.btnPrimaryText}>⚡ 2. Inject Surge 2.2x Cab Booking (₹620, High Priority)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: '#D97706', marginTop: 8 }]} onPress={triggerParcelSample}>
              <Text style={styles.btnPrimaryText}>📦 3. Inject Parcel Delivery Request (₹210, 15kg Express)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: '#4338CA', marginTop: 8 }]} onPress={triggerTransportSample}>
              <Text style={styles.btnPrimaryText}>🚌 4. Inject Intercity Transport Match (₹1450, Pune → Mumbai)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: '#7C3AED', marginTop: 8 }]} onPress={triggerHotelSample}>
              <Text style={styles.btnPrimaryText}>🏨 5. Inject Hotel & Airport Transfer (₹890, Luxury Chauffeur)</Text>
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
    maxHeight: '80%',
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
