/**
 * Customer App — Developer Mode Modal
 * Provides test customer switching, simulated OTP, mock family injection, and network simulation.
 * Active in __DEV__ mode.
 */
import React from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuthStore } from '../../store/auth.store'
import { AppText, AppDivider, AppButton } from '../ui'

interface DevModeModalProps {
  visible: boolean
  onClose: () => void
}

const TEST_CUSTOMERS = [
  { name: 'Pankaj Patil (Organizer)', phone: '+919876543210', role: 'customer' },
  { name: 'Priya Patil (Family Member)', phone: '+919876543211', role: 'customer' },
  { name: 'Vikram Joshi (Guest Rider)', phone: '+919876543212', role: 'customer' },
]

export default function DevModeModal({ visible, onClose }: DevModeModalProps) {
  const { theme, isDark } = useTheme()
  const { user, login } = useAuthStore()

  const handleSwitchCustomer = async (cust: typeof TEST_CUSTOMERS[0]) => {
    await login(
      {
        userId: 'dev-' + cust.phone.slice(-4),
        role: cust.role,
        phone: cust.phone,
        isNewUser: false,
        profileComplete: true,
      },
      'dev_access_token_' + cust.phone,
      'dev_refresh_token_' + cust.phone
    )
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={[styles.devBadge, { backgroundColor: `${theme.colors.warning}20` }]}>
                <Ionicons name="construct" size={18} color={theme.colors.warning} />
              </View>
              <View>
                <AppText variant="h3" bold>Developer Control Panel</AppText>
                <AppText variant="small" color="muted">Environment: Development (__DEV__)</AppText>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <AppDivider />

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            {/* Current Active Context */}
            <View style={[styles.infoCard, { backgroundColor: theme.colors.backgroundAlt }]}>
              <AppText variant="bodyS" semibold color="secondary">CURRENT ACTIVE SESSION</AppText>
              <AppText variant="body" bold style={{ marginTop: 4 }}>
                Phone: {user?.phone || 'Not logged in'}
              </AppText>
              <AppText variant="small" color="muted">
                Role: {user?.role || 'Guest'} | ID: {user?.userId || 'None'}
              </AppText>
            </View>

            {/* Test Customer Fast Switcher */}
            <AppText variant="subtitle" semibold style={{ marginTop: 16, marginBottom: 8 }}>
              Fast Customer Switching
            </AppText>
            {TEST_CUSTOMERS.map((cust) => (
              <TouchableOpacity
                key={cust.phone}
                style={[
                  styles.customerBtn,
                  {
                    backgroundColor:
                      user?.phone === cust.phone
                        ? `${theme.colors.primary}18`
                        : theme.colors.backgroundAlt,
                    borderColor:
                      user?.phone === cust.phone
                        ? theme.colors.primary
                        : theme.colors.border,
                  },
                ]}
                onPress={() => handleSwitchCustomer(cust)}
              >
                <View style={styles.custIcon}>
                  <Feather name="user" size={18} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="body" bold>{cust.name}</AppText>
                  <AppText variant="small" color="secondary">{cust.phone}</AppText>
                </View>
                {user?.phone === cust.phone && (
                  <Feather name="check-circle" size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}

            {/* Payment & Wallet Simulation (Features 11 & 12) */}
            <AppText variant="subtitle" semibold style={{ marginTop: 16, marginBottom: 8 }}>
              Payment & Wallet Simulation (F11 & F12)
            </AppText>
            <View style={[styles.infoCard, { backgroundColor: theme.colors.backgroundAlt }]}>
              <AppText variant="bodyS" semibold color="secondary" style={{ marginBottom: 8 }}>
                SIMULATE PAYMENT EVENTS
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: `${theme.colors.success}20`, borderColor: theme.colors.success }]}
                  onPress={() => Alert.alert('Simulated UPI Success', 'Payment captured via provider webhook (Order: ORD-SIM-SUCCESS).')}
                >
                  <Feather name="check" size={14} color={theme.colors.success} />
                  <AppText variant="caption" bold style={{ color: theme.colors.success, marginLeft: 4 }}>UPI Success</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: `${theme.colors.error}20`, borderColor: theme.colors.error }]}
                  onPress={() => Alert.alert('Simulated Card Decline', 'Transaction declined by issuer bank (Code: DO_NOT_HONOR).')}
                >
                  <Feather name="x" size={14} color={theme.colors.error} />
                  <AppText variant="caption" bold style={{ color: theme.colors.error, marginLeft: 4 }}>Card Decline</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: `${theme.colors.warning}20`, borderColor: theme.colors.warning }]}
                  onPress={() => Alert.alert('Simulated UPI Pending', 'Waiting for customer authorization in UPI app.')}
                >
                  <Feather name="clock" size={14} color={theme.colors.warning} />
                  <AppText variant="caption" bold style={{ color: theme.colors.warning, marginLeft: 4 }}>UPI Pending</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: `${theme.colors.primary}20`, borderColor: theme.colors.primary }]}
                  onPress={() => Alert.alert('Simulated Cash Selected', 'Payment pending driver cash confirmation upon trip completion.')}
                >
                  <Feather name="dollar-sign" size={14} color={theme.colors.primary} />
                  <AppText variant="caption" bold color="primary" style={{ marginLeft: 4 }}>Cash Mode</AppText>
                </TouchableOpacity>
              </View>

              <AppDivider marginVertical={12} />

              <AppText variant="bodyS" semibold color="secondary" style={{ marginBottom: 8 }}>
                SIMULATE WALLET & LEDGER EVENTS
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: `${theme.colors.primary}20`, borderColor: theme.colors.primary }]}
                  onPress={() => Alert.alert('Simulated Top-Up', 'Razorpay Webhook processed: ₹500 credited to CASH bucket.')}
                >
                  <Feather name="plus-circle" size={14} color={theme.colors.primary} />
                  <AppText variant="caption" bold color="primary" style={{ marginLeft: 4 }}>+₹500 Top-Up</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(217, 119, 6, 0.2)', borderColor: '#D97706' }]}
                  onPress={() => Alert.alert('Simulated Promo Credit', 'Campaign bonus: ₹100 credited to PROMO_CREDIT bucket (Expires in 3 days).')}
                >
                  <MaterialCommunityIcons name="ticket-percent-outline" size={14} color="#D97706" />
                  <AppText variant="caption" bold style={{ color: '#D97706', marginLeft: 4 }}>+₹100 Promo Credit</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(139, 92, 246, 0.2)', borderColor: '#8B5CF6' }]}
                  onPress={() => Alert.alert('Simulated Partial Refund', 'Trip dispute resolution: ₹150 refunded to customer wallet.')}
                >
                  <Feather name="rotate-ccw" size={14} color="#8B5CF6" />
                  <AppText variant="caption" bold style={{ color: '#8B5CF6', marginLeft: 4 }}>+₹150 Refund</AppText>
                </TouchableOpacity>
              </View>

              <AppDivider marginVertical={12} />

              {/* Feature 13 & 14 Simulators */}
              <AppText variant="bodyS" semibold color="secondary" style={{ marginBottom: 8 }}>
                SIMULATE PROMOTIONS & CASHBACK (FEATURE 13)
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: '#10B981' }]}
                  onPress={() => Alert.alert('First Ride Offer', 'FIRST_RIDE campaign detected: 50% discount automatically applied!')}
                >
                  <Ionicons name="flash-outline" size={14} color="#10B981" />
                  <AppText variant="caption" bold style={{ color: '#10B981', marginLeft: 4 }}>First Ride (50% Off)</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(234, 88, 12, 0.2)', borderColor: '#EA580C' }]}
                  onPress={() => Alert.alert('Cashback Processed', 'Trip completed: ₹50 post-ride cashback credited to customer promo wallet!')}
                >
                  <Ionicons name="wallet-outline" size={14} color="#EA580C" />
                  <AppText variant="caption" bold style={{ color: '#EA580C', marginLeft: 4 }}>₹50 Ride Cashback</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(79, 70, 229, 0.2)', borderColor: '#4F46E5' }]}
                  onPress={() => Alert.alert('Festival Campaign', 'Diwali Dhamaka auto-offer applied: ₹100 flat off!')}
                >
                  <MaterialCommunityIcons name="tag-outline" size={14} color="#4F46E5" />
                  <AppText variant="caption" bold style={{ color: '#4F46E5', marginLeft: 4 }}>Festival Flat ₹100</AppText>
                </TouchableOpacity>
              </View>

              <AppText variant="bodyS" semibold color="secondary" style={{ marginBottom: 8 }}>
                SIMULATE RATINGS & COMPLAINTS (FEATURE 14)
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(245, 158, 11, 0.2)', borderColor: '#F59E0B' }]}
                  onPress={() => Alert.alert('5★ Rating & Compliments', 'Authoritative 5★ rating submitted with "Clean Vehicle" and "Safe Driving" compliments.')}
                >
                  <Ionicons name="star" size={14} color="#F59E0B" />
                  <AppText variant="caption" bold style={{ color: '#F59E0B', marginLeft: 4 }}>5★ Rating + Compliments</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: '#EF4444' }]}
                  onPress={() => Alert.alert('Safety Incident Triggered', '1★ rating with SAFETY_ISSUE tag logged. Automatic SafetyIncident ticket created for safety dispatch team!')}
                >
                  <MaterialCommunityIcons name="shield-alert-outline" size={14} color="#EF4444" />
                  <AppText variant="caption" bold style={{ color: '#EF4444', marginLeft: 4 }}>🚨 Safety Escalation</AppText>
                </TouchableOpacity>
              </View>

              <AppText variant="bodyS" semibold color="secondary" style={{ marginTop: 14, marginBottom: 8 }}>
                SIMULATE PARCEL LOGISTICS (FEATURE 15)
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(99, 102, 241, 0.2)', borderColor: '#6366F1' }]}
                  onPress={() => Alert.alert('Parcel Partner Assigned', 'Nearby delivery driver Suresh More (Hero Splendor) accepted package dispatch offer!')}
                >
                  <MaterialCommunityIcons name="motorbike" size={14} color="#6366F1" />
                  <AppText variant="caption" bold style={{ color: '#6366F1', marginLeft: 4 }}>📦 Assign Partner</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: '#10B981' }]}
                  onPress={() => Alert.alert('Pickup Handover Verified', 'Sender entered 4-digit Pickup OTP. Driver verified package condition and departed in transit.')}
                >
                  <MaterialCommunityIcons name="key-variant" size={14} color="#10B981" />
                  <AppText variant="caption" bold style={{ color: '#10B981', marginLeft: 4 }}>🔑 Pickup OTP (4821)</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(6, 182, 212, 0.2)', borderColor: '#06B6D4' }]}
                  onPress={() => Alert.alert('Delivery POD Verified', 'Receiver entered Delivery OTP. Digital signature captured and driver wallet credited!')}
                >
                  <MaterialCommunityIcons name="check-decagram" size={14} color="#06B6D4" />
                  <AppText variant="caption" bold style={{ color: '#06B6D4', marginLeft: 4 }}>📬 POD & Complete</AppText>
                </TouchableOpacity>
              </View>

              <AppText variant="bodyS" semibold color="secondary" style={{ marginTop: 14, marginBottom: 8 }}>
                SIMULATE HOTEL & STAYS (FEATURE 16)
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: '#3B82F6' }]}
                  onPress={() => {
                    onClose()
                    router.push('/hotel/search' as any)
                  }}
                >
                  <MaterialCommunityIcons name="office-building" size={14} color="#3B82F6" />
                  <AppText variant="caption" bold style={{ color: '#3B82F6', marginLeft: 4 }}>🏨 Find Stays</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: '#10B981' }]}
                  onPress={() => {
                    onClose()
                    router.push({ pathname: '/hotel/confirmation' as any, params: { booking_reference: 'HTL-260822-79AB' } })
                  }}
                >
                  <MaterialCommunityIcons name="ticket-confirmation" size={14} color="#10B981" />
                  <AppText variant="caption" bold style={{ color: '#10B981', marginLeft: 4 }}>📄 Stay Voucher</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(245, 158, 11, 0.2)', borderColor: '#F59E0B' }]}
                  onPress={() => Alert.alert('Linked Airport Cab', 'Airport Transfer Cab (Pune Airport -> Taj Blue Diamond) dispatched with priority driver matching!')}
                >
                  <Ionicons name="car-sport" size={14} color="#F59E0B" />
                  <AppText variant="caption" bold style={{ color: '#F59E0B', marginLeft: 4 }}>✈️ Linked Cab</AppText>
                </TouchableOpacity>
              </View>

              <AppText variant="bodyS" semibold color="secondary" style={{ marginTop: 14, marginBottom: 8 }}>
                SIMULATE COMMERCIAL FREIGHT & TRANSPORT (FEATURE 17)
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(245, 158, 11, 0.2)', borderColor: '#F59E0B' }]}
                  onPress={() => {
                    onClose()
                    router.push('/transport/create' as any)
                  }}
                >
                  <MaterialCommunityIcons name="truck-fast" size={14} color="#F59E0B" />
                  <AppText variant="caption" bold style={{ color: '#F59E0B', marginLeft: 4 }}>🚛 Book Transport</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(99, 102, 241, 0.2)', borderColor: '#6366F1' }]}
                  onPress={() => {
                    onClose()
                    router.push({ pathname: '/transport/quotes' as any, params: { order_id: 'demo-order', reference: 'TRN-260822-7721' } })
                  }}
                >
                  <MaterialCommunityIcons name="chat-processing-outline" size={14} color="#6366F1" />
                  <AppText variant="caption" bold style={{ color: '#6366F1', marginLeft: 4 }}>💬 Transporter Quotes</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: '#10B981' }]}
                  onPress={() => {
                    onClose()
                    router.push({ pathname: '/transport/tracking' as any, params: { order_id: 'demo-order' } })
                  }}
                >
                  <MaterialCommunityIcons name="map-marker-path" size={14} color="#10B981" />
                  <AppText variant="caption" bold style={{ color: '#10B981', marginLeft: 4 }}>📍 Live Freight Track</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(6, 182, 212, 0.2)', borderColor: '#06B6D4' }]}
                  onPress={() => {
                    onClose()
                    router.push({ pathname: '/transport/pod' as any, params: { order_id: 'demo-order' } })
                  }}
                >
                  <MaterialCommunityIcons name="certificate" size={14} color="#06B6D4" />
                  <AppText variant="caption" bold style={{ color: '#06B6D4', marginLeft: 4 }}>📄 Verified POD</AppText>
                </TouchableOpacity>
              </View>

              <AppText variant="bodyS" semibold color="secondary" style={{ marginTop: 14, marginBottom: 8 }}>
                SIMULATE FLIGHT-AWARE AIRPORT SERVICE (FEATURE 18)
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: '#3B82F6' }]}
                  onPress={() => {
                    onClose()
                    router.push('/airport/book' as any)
                  }}
                >
                  <MaterialCommunityIcons name="airplane-takeoff" size={14} color="#3B82F6" />
                  <AppText variant="caption" bold style={{ color: '#3B82F6', marginLeft: 4 }}>✈️ Book Airport Cab</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(245, 158, 11, 0.2)', borderColor: '#F59E0B' }]}
                  onPress={() => {
                    onClose()
                    router.push('/airport/flight-status' as any)
                  }}
                >
                  <MaterialCommunityIcons name="radar" size={14} color="#F59E0B" />
                  <AppText variant="caption" bold style={{ color: '#F59E0B', marginLeft: 4 }}>📡 Flight Radar</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: '#10B981' }]}
                  onPress={() => {
                    onClose()
                    router.push({ pathname: '/airport/tracking' as any, params: { booking_id: 'demo-airport', reference: 'APT-260823-8821' } })
                  }}
                >
                  <MaterialCommunityIcons name="account-tie-hat" size={14} color="#10B981" />
                  <AppText variant="caption" bold style={{ color: '#10B981', marginLeft: 4 }}>🙋 Meet & Greet Track</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(168, 85, 247, 0.2)', borderColor: '#A855F7' }]}
                  onPress={() => {
                    onClose()
                    router.push({ pathname: '/airport/details' as any, params: { booking_id: 'demo-airport' } })
                  }}
                >
                  <MaterialCommunityIcons name="file-document-check-outline" size={14} color="#A855F7" />
                  <AppText variant="caption" bold style={{ color: '#A855F7', marginLeft: 4 }}>📄 Travel Voucher</AppText>
                </TouchableOpacity>
              </View>

              <AppText variant="bodyS" semibold color="secondary" style={{ marginTop: 14, marginBottom: 8 }}>
                SIMULATE CUSTOMER SECURITY & RISK (FEATURE 26)
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: '#3B82F6' }]}
                  onPress={() => {
                    onClose()
                    router.push('/security/challenge' as any)
                  }}
                >
                  <Ionicons name="key" size={14} color="#3B82F6" />
                  <AppText variant="caption" bold style={{ color: '#3B82F6', marginLeft: 4 }}>🔐 Step-Up Challenge</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: '#EF4444' }]}
                  onPress={() => {
                    onClose()
                    router.push('/security/account-protection' as any)
                  }}
                >
                  <Ionicons name="lock-closed" size={14} color="#EF4444" />
                  <AppText variant="caption" bold style={{ color: '#EF4444', marginLeft: 4 }}>🛡️ Lock Recovery UI</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(245, 158, 11, 0.2)', borderColor: '#F59E0B' }]}
                  onPress={() => Alert.alert('Velocity Anomaly Flagged', 'Risk Engine: 3 rapid failed OTP attempts detected from unknown IP. Risk score raised to 75 (HIGH). Step-up challenge active.')}
                >
                  <Ionicons name="warning" size={14} color="#F59E0B" />
                  <AppText variant="caption" bold style={{ color: '#F59E0B', marginLeft: 4 }}>⚠️ Velocity Anomaly</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(168, 85, 247, 0.2)', borderColor: '#A855F7' }]}
                  onPress={() => Alert.alert('Promo Farming Prevented', 'Multi-Account Abuse: Device fingerprint already redeemed FIRST_RIDE bonus on another account. Promo rejected.')}
                >
                  <MaterialCommunityIcons name="ticket-percent" size={14} color="#A855F7" />
                  <AppText variant="caption" bold style={{ color: '#A855F7', marginLeft: 4 }}>🎟️ Promo Farming Block</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: '#10B981' }]}
                  onPress={() => Alert.alert('Collusion Monitored', 'Customer ↔ Driver pairing velocity >4 in 24h. Flagged for settlement review without interrupting operational trip.')}
                >
                  <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                  <AppText variant="caption" bold style={{ color: '#10B981', marginLeft: 4 }}>🤝 Collusion Monitored</AppText>
                </TouchableOpacity>
              </View>

              <AppText variant="bodyS" semibold color="secondary" style={{ marginTop: 14, marginBottom: 8 }}>
                SIMULATE SMART INTELLIGENCE (FEATURE 27)
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(245, 158, 11, 0.2)', borderColor: '#F59E0B' }]}
                  onPress={() => {
                    onClose()
                    router.push('/book/cab' as any)
                  }}
                >
                  <MaterialCommunityIcons name="car-estate" size={14} color="#F59E0B" />
                  <AppText variant="caption" bold style={{ color: '#F59E0B', marginLeft: 4 }}>🧳 4 Pax+3 Bags (SUV)</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: '#3B82F6' }]}
                  onPress={() => Alert.alert('Cross-Service Intelligence', 'Hotel stay detected: Airport Transfer companion card dynamically prioritized on Home Screen.')}
                >
                  <MaterialCommunityIcons name="airplane-takeoff" size={14} color="#3B82F6" />
                  <AppText variant="caption" bold style={{ color: '#3B82F6', marginLeft: 4 }}>🏨 Hotel ➔ Airport</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: '#10B981' }]}
                  onPress={() => Alert.alert('Oversized Parcel Route', 'Parcel weight exceeds 25kg standard cab threshold -> Automatically rerouted to Goods Transport flow.')}
                >
                  <Feather name="truck" size={14} color="#10B981" />
                  <AppText variant="caption" bold style={{ color: '#10B981', marginLeft: 4 }}>📦 Parcel ➔ Transport</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: '#EF4444' }]}
                  onPress={() => Alert.alert('Demand Surge Signal', 'Real-time Demand Engine: Local booking surge active (1.4x multiplier signal sent to Fare Engine).')}
                >
                  <Ionicons name="trending-up" size={14} color="#EF4444" />
                  <AppText variant="caption" bold style={{ color: '#EF4444', marginLeft: 4 }}>⚡ 1.4x Surge Signal</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(168, 85, 247, 0.2)', borderColor: '#A855F7' }]}
                  onPress={() => Alert.alert('Smart Driver Ranking', 'Candidate Pool Scored: ETA (35%) + Rating (20%) + Idle Time (15%) + Acceptance (15%) + Destination (15%).')}
                >
                  <Ionicons name="speedometer" size={14} color="#A855F7" />
                  <AppText variant="caption" bold style={{ color: '#A855F7', marginLeft: 4 }}>🚕 Multi-Factor Match</AppText>
                </TouchableOpacity>
              </View>

              <AppText variant="bodyS" semibold color="secondary" style={{ marginTop: 14, marginBottom: 8 }}>
                SIMULATE CROSS-SERVICE ORCHESTRATION (FEATURE 28)
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: '#3B82F6' }]}
                  onPress={() => {
                    onClose()
                    router.push('/journey/sample-jrn-1' as any)
                  }}
                >
                  <MaterialCommunityIcons name="transit-connection-variant" size={14} color="#3B82F6" />
                  <AppText variant="caption" bold style={{ color: '#3B82F6', marginLeft: 4 }}>🗺️ View Journey Hub</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: '#10B981' }]}
                  onPress={() => Alert.alert('Hotel ➔ Airport Saga', 'hotel.booking.confirmed emitted -> Journey JRN-2608 created -> Airport transfer suggestion linked with hotel context.')}
                >
                  <MaterialCommunityIcons name="airplane-takeoff" size={14} color="#10B981" />
                  <AppText variant="caption" bold style={{ color: '#10B981', marginLeft: 4 }}>🏨 Hotel ➔ Airport Saga</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(245, 158, 11, 0.2)', borderColor: '#F59E0B' }]}
                  onPress={() => Alert.alert('Partial Failure Invariant', 'Airport ride dispatch timed out. Hotel stay remains CONFIRMED; Journey marked ATTENTION_REQUIRED with retry action.')}
                >
                  <Ionicons name="warning" size={14} color="#F59E0B" />
                  <AppText variant="caption" bold style={{ color: '#F59E0B', marginLeft: 4 }}>⚠️ Partial Failure / Sagas</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simBtn, { backgroundColor: 'rgba(168, 85, 247, 0.2)', borderColor: '#A855F7' }]}
                  onPress={() => Alert.alert('Event Idempotency Checked', 'hotel.booking.confirmed received twice. ProcessedEventRecord detected duplicate event_id and prevented duplicate record creation.')}
                >
                  <Feather name="repeat" size={14} color="#A855F7" />
                  <AppText variant="caption" bold style={{ color: '#A855F7', marginLeft: 4 }}>🔁 Idempotency Guard</AppText>
                </TouchableOpacity>
              </View>
            </View>

            {/* Simulated Features */}
            <AppText variant="subtitle" semibold style={{ marginTop: 16, marginBottom: 8 }}>
              Simulated Data & Bypass
            </AppText>
            <View style={[styles.infoCard, { backgroundColor: theme.colors.backgroundAlt }]}>
              <View style={styles.featureRow}>
                <Feather name="key" size={16} color={theme.colors.success} />
                <AppText variant="bodyS" style={{ marginLeft: 8, flex: 1 }}>Universal Bypass OTP: <AppText bold>123456</AppText></AppText>
              </View>
              <View style={[styles.featureRow, { marginTop: 8 }]}>
                <Feather name="shield" size={16} color={theme.colors.primary} />
                <AppText variant="bodyS" style={{ marginLeft: 8, flex: 1 }}>Security Rules: Server Authoritative (Active)</AppText>
              </View>
              <View style={[styles.featureRow, { marginTop: 8 }]}>
                <Feather name="users" size={16} color={theme.colors.accent} />
                <AppText variant="bodyS" style={{ marginLeft: 8, flex: 1 }}>Booking Participant: Self / Family / Guest</AppText>
              </View>
            </View>

            <View style={{ marginTop: 24, marginBottom: 16 }}>
              <AppButton variant="secondary" onPress={onClose}>
                Close Panel
              </AppButton>
            </View>
          </ScrollView>
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
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  devBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    padding: 6,
  },
  scroll: {
    paddingTop: 16,
  },
  infoCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  customerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  custIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  simBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
})
