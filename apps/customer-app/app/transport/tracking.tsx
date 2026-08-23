/**
 * Feature 17: Live Commercial Goods Transport Tracking Screen
 * Displays live vehicle telemetry, loading/transit/unloading milestone timeline,
 * Driver & Truck details card, recipient Delivery OTP, and POD trigger.
 */
import React, { useState, useEffect } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { useLocalSearchParams, router } from 'expo-router'
import { useTheme } from '../../src/contexts/ThemeContext'
import { useTranslation } from '../../src/i18n'
import { AppText, AppButton, AppCard, AppBadge } from '../../src/components/ui'
import { transportApi } from '../../src/api/client'

const TRANSPORT_STEPS = [
  { key: 'driver_assigned', label: 'Transporter Confirmed', icon: 'shield-check-outline' },
  { key: 'arrived_pickup', label: 'Arrived at Loading Bay', icon: 'map-marker-radius-outline' },
  { key: 'loading_started', label: 'Loading Cargo & Inspection', icon: 'package-variant-closed' },
  { key: 'loaded', label: 'Loaded & Secured', icon: 'check-circle-outline' },
  { key: 'in_transit', label: 'In Transit on Highway', icon: 'truck-fast-outline' },
  { key: 'arrived_destination', label: 'Arrived Destination Dock', icon: 'warehouse' },
  { key: 'unloading_started', label: 'Unloading Freight', icon: 'dolly' },
  { key: 'delivered', label: 'Delivered & POD Verified', icon: 'certificate-outline' },
]

export default function TransportTrackingScreen() {
  const params = useLocalSearchParams<{ order_id?: string }>()
  const orderId = params.order_id || 'demo-transport-order'

  const { theme, isDark } = useTheme()
  const { t } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchOrderDetails()
    const interval = setInterval(fetchOrderDetails, 8000)
    return () => clearInterval(interval)
  }, [orderId])

  const fetchOrderDetails = async () => {
    try {
      const res: any = await transportApi.getOrderDetails(orderId)
      if (res?.data) {
        setOrder(res.data)
      }
    } catch (err) {
      console.log('Tracking order fetch error:', err)
      // Fallback demo tracking data
      if (!order) {
        setOrder({
          order_id: orderId,
          order_reference: 'TRN-260822-7721',
          status: 'in_transit',
          pricing_mode: 'INSTANT_PRICE',
          route: {
            pickup_address: 'Bhosari Industrial Estate, Pune',
            pickup_contact_name: 'Aditya Patil',
            drop_address: 'Chakan MIDC Phase 2, Pune',
            drop_contact_name: 'Karan Shinde',
            distance_km: 18.5,
            estimated_duration_min: 35,
          },
          load: {
            goods_category: 'MACHINERY',
            goods_description: 'Precision CNC machine spares and metal crates',
            weight_kg: 450,
            package_count: 3,
          },
          handling: {
            helpers_count: 2,
            vehicle_category: 'BOLERO_PICKUP',
          },
          financials: {
            total_fare: 1850.0,
            payment_status: 'PAID',
            payment_method: 'WALLET',
          },
          driver: {
            name: 'Suresh Transporters & Logistics',
            phone: '+919822001101',
            rating: 4.9,
          },
          vehicle: {
            make_model: 'Mahindra Bolero Maxi Truck Plus 8ft',
            registration_number: 'MH 14 PF 8820',
          },
          verification: {
            delivery_otp: '8341',
            has_pod: false,
          },
        })
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleCallDriver = () => {
    if (order?.driver?.phone) {
      Linking.openURL(`tel:${order.driver.phone}`)
    } else {
      Alert.alert('Transporter Contact', 'Connecting via secure masked call...')
    }
  }

  const currentStatus = order?.status || 'created'
  const isDelivered = currentStatus === 'delivered'

  const getStepIndex = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'delivered') return 7
    if (s === 'unloading_started') return 6
    if (s === 'arrived_destination' || s === 'near_destination') return 5
    if (s === 'in_transit') return 4
    if (s === 'loaded') return 3
    if (s === 'loading_started') return 2
    if (s === 'arrived_pickup') return 1
    return 0
  }

  const activeStepIdx = getStepIndex(currentStatus)

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.colors.surface }]}
          onPress={() => router.replace('/(tabs)' as any)}
        >
          <Feather name="arrow-left" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <AppText variant="h3" bold>
            Live Freight Tracking
          </AppText>
          <AppText variant="caption" color="secondary">
            Ref: {order?.order_reference || 'TRN-260822-DEMO'}
          </AppText>
        </View>
        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: theme.colors.surface }]}
          onPress={() => {
            setRefreshing(true)
            fetchOrderDetails()
          }}
        >
          <Feather name="refresh-cw" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Highlight Banner */}
        <AppCard style={styles.statusBanner}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppBadge
              label={currentStatus.replace(/_/g, ' ').toUpperCase()}
              variant={isDelivered ? 'success' : 'info'}
            />
            <AppText variant="caption" color="secondary">
              Distance: {order?.route?.distance_km || 18.5} km
            </AppText>
          </View>
          <AppText variant="h3" bold style={{ marginTop: 8 }}>
            {isDelivered
              ? 'Goods Successfully Delivered 🎉'
              : currentStatus === 'in_transit'
              ? 'Truck in Transit to Destination'
              : currentStatus === 'loading_started'
              ? 'Cargo Loading in Progress'
              : 'Transporter En Route'}
          </AppText>
          <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
            Destination: {order?.route?.drop_address}
          </AppText>
        </AppCard>

        {/* Recipient Delivery OTP Banner */}
        {order?.verification?.delivery_otp && (
          <View style={[styles.otpCard, { backgroundColor: isDark ? '#1E293B' : '#FEF3C7', borderColor: '#F59E0B' }]}>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" bold color="warning">
                RECIPIENT VERIFICATION OTP
              </AppText>
              <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                Share with destination receiver ({order?.route?.drop_contact_name})
              </AppText>
            </View>
            <View style={styles.otpBox}>
              <AppText variant="h2" bold style={{ letterSpacing: 4, color: '#B45309' }}>
                {order.verification.delivery_otp}
              </AppText>
            </View>
          </View>
        )}

        {/* Milestone Timeline */}
        <AppCard style={styles.timelineCard}>
          <AppText variant="subtitle" bold style={{ marginBottom: 14 }}>
            Logistics Milestone Timeline
          </AppText>
          {TRANSPORT_STEPS.map((step, idx) => {
            const isCompleted = idx <= activeStepIdx
            const isCurrent = idx === activeStepIdx
            return (
              <View key={step.key} style={styles.stepRow}>
                <View style={styles.stepIndicatorCol}>
                  <View
                    style={[
                      styles.stepDot,
                      {
                        backgroundColor: isCompleted ? '#10B981' : theme.colors.border,
                        borderColor: isCurrent ? theme.colors.primary : 'transparent',
                        borderWidth: isCurrent ? 2 : 0,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={step.icon as any}
                      size={14}
                      color={isCompleted ? '#FFF' : theme.colors.textMuted}
                    />
                  </View>
                  {idx < TRANSPORT_STEPS.length - 1 && (
                    <View
                      style={[
                        styles.stepLine,
                        { backgroundColor: idx < activeStepIdx ? '#10B981' : theme.colors.border },
                      ]}
                    />
                  )}
                </View>
                <View style={styles.stepContent}>
                  <AppText
                    variant="bodyS"
                    bold={isCurrent}
                    color={isCompleted ? 'primary' : 'muted'}
                  >
                    {step.label}
                  </AppText>
                  {isCurrent && (
                    <AppText variant="caption" color="brand" bold style={{ marginTop: 2 }}>
                      ● Active Right Now
                    </AppText>
                  )}
                </View>
              </View>
            )
          })}
        </AppCard>

        {/* Driver & Commercial Truck Card */}
        {order?.driver && (
          <AppCard style={styles.driverCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.driverAvatar, { backgroundColor: theme.colors.primary }]}>
                <MaterialCommunityIcons name="truck-delivery" size={24} color="#FFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AppText variant="subtitle" bold>
                    {order.driver.name}
                  </AppText>
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={11} color="#F59E0B" />
                    <AppText variant="caption" bold style={{ marginLeft: 2, color: '#F59E0B' }}>
                      {order.driver.rating || 4.9}
                    </AppText>
                  </View>
                </View>
                <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                  {order.vehicle?.make_model} • {order.vehicle?.registration_number}
                </AppText>
              </View>
              <TouchableOpacity
                style={[styles.callBtn, { backgroundColor: '#10B981' }]}
                onPress={handleCallDriver}
              >
                <Feather name="phone" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          </AppCard>
        )}

        {/* Cargo Summary Card */}
        <AppCard style={styles.cargoCard}>
          <AppText variant="subtitle" bold style={{ marginBottom: 8 }}>
            Cargo & Handling Details
          </AppText>
          <View style={styles.infoRow}>
            <AppText variant="caption" color="secondary">
              Commodity:
            </AppText>
            <AppText variant="caption" bold>
              {order?.load?.goods_category} ({order?.load?.goods_description})
            </AppText>
          </View>
          <View style={styles.infoRow}>
            <AppText variant="caption" color="secondary">
              Payload Weight:
            </AppText>
            <AppText variant="caption" bold>
              {order?.load?.weight_kg} kg ({order?.load?.package_count} units)
            </AppText>
          </View>
          <View style={styles.infoRow}>
            <AppText variant="caption" color="secondary">
              Helpers Assigned:
            </AppText>
            <AppText variant="caption" bold>
              {order?.handling?.helpers_count} Dedicated Helpers
            </AppText>
          </View>
          <View style={styles.infoRow}>
            <AppText variant="caption" color="secondary">
              Agreed Fare:
            </AppText>
            <AppText variant="caption" bold color="brand">
              ₹{order?.financials?.total_fare} ({order?.financials?.payment_status})
            </AppText>
          </View>
        </AppCard>

        {/* View POD Button (If delivered or testable) */}
        {isDelivered && (
          <AppButton
            variant="primary"
            size="lg"
            onPress={() => router.push({ pathname: '/transport/pod' as any, params: { order_id: orderId } })}
            style={{ marginTop: 10, marginBottom: 20 }}
          >
            View Verified POD Certificate 📄
          </AppButton>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: { padding: 16, paddingBottom: 60 },
  statusBanner: { padding: 14, borderRadius: 14, marginBottom: 12 },
  otpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  otpBox: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  timelineCard: { padding: 16, borderRadius: 14, marginBottom: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 48 },
  stepIndicatorCol: { alignItems: 'center', width: 28 },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
    marginTop: -2,
    marginBottom: -2,
  },
  stepContent: { flex: 1, marginLeft: 12, paddingTop: 2 },
  driverCard: { padding: 14, borderRadius: 14, marginBottom: 12 },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cargoCard: { padding: 14, borderRadius: 14, marginBottom: 12 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
})
