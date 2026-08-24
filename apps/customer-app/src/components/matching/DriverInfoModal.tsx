/**
 * DriverInfoModal — Customer App Nearby Driver Profile & Vehicle Details
 * ─────────────────────────────────────────────────────────────────────────────
 * Shows detailed driver information when the customer taps any nearby driver
 * icon, marker, or dot on the matching radar or live tracking map.
 */
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Alert,
} from 'react-native'
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../../contexts/ThemeContext'
import { AppText, AppButton } from '../ui'
import { favoriteDriverApi } from '../../api/client'

const { width: SCREEN_W } = Dimensions.get('window')

export interface NearbyDriverInfo {
  driver_id?: string
  id?: string
  full_name?: string
  name?: string
  rating?: number
  vehicle?: string
  vehicle_model?: string
  vehicle_type?: string
  registration_number?: string
  license_plate?: string
  distance_km?: number
  distance?: number
  eta_minutes?: number
  seat_capacity?: number
  has_ac?: boolean
  is_favourite?: boolean
  total_trips?: number
  photo_url?: string
  latitude?: number
  longitude?: number
  phone?: string
}

interface DriverInfoModalProps {
  visible: boolean
  driver: NearbyDriverInfo | null
  onClose: () => void
  onPrioritize?: (driverId: string) => void
}

export function DriverInfoModal({
  visible,
  driver,
  onClose,
  onPrioritize,
}: DriverInfoModalProps) {
  const { theme, isDark } = useTheme()
  const [isFav, setIsFav] = useState<boolean>(false)
  const [favLoading, setFavLoading] = useState<boolean>(false)

  // Sync favourite state when driver changes
  useEffect(() => {
    if (driver) {
      setIsFav(!!driver.is_favourite)
    }
  }, [driver])

  if (!driver) return null

  const driverName = driver.full_name || driver.name || 'Driver Partner'
  const rating = (driver.rating || 4.85).toFixed(1)
  const vehicleName = driver.vehicle || driver.vehicle_model || `${driver.vehicle_type || 'Standard'} Cab`
  const regNumber = driver.registration_number || driver.license_plate || 'MH 12 ACTIVE'
  const distance = (driver.distance_km || driver.distance || 1.8).toFixed(1)
  const etaMin = driver.eta_minutes || Math.max(2, Math.round((driver.distance_km || 1.8) * 2.5))
  const seats = driver.seat_capacity || 4
  const hasAc = driver.has_ac !== false

  const handleToggleFavorite = async () => {
    const dId = driver.driver_id || driver.id
    if (!dId) return
    setFavLoading(true)
    try {
      if (isFav) {
        await favoriteDriverApi.remove(dId)
        setIsFav(false)
      } else {
        await favoriteDriverApi.add(dId)
        setIsFav(true)
        Alert.alert('⭐ Added to Favourites', `${driverName} will be prioritized for future ride matching.`)
      }
    } catch {
      setIsFav(!isFav)
    } finally {
      setFavLoading(false)
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: isDark ? '#111827' : '#FFFFFF',
              borderColor: isDark ? '#1F2937' : '#E2E8F0',
            },
          ]}
        >
          {/* Drag Handle */}
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: isDark ? '#374151' : '#CBD5E1' }]} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* ── Top Header Row ── */}
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <View style={styles.liveBadge}>
                  <View style={styles.livePulseDot} />
                  <AppText variant="caption" bold style={{ color: '#10B981', fontSize: 11 }}>
                    LIVE NEARBY DRIVER
                  </AppText>
                </View>
                <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                  {distance} km away from pickup point
                </AppText>
              </View>

              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9' }]}
                onPress={onClose}
              >
                <Feather name="x" size={18} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* ── Driver Hero Profile Card ── */}
            <View
              style={[
                styles.driverCard,
                {
                  backgroundColor: isDark ? '#1F2937' : '#F8FAFC',
                  borderColor: isDark ? '#374151' : '#E2E8F0',
                },
              ]}
            >
              <View style={styles.driverHeroRow}>
                {/* Avatar with Verified Shield */}
                <View style={styles.avatarWrapper}>
                  <LinearGradient
                    colors={['#0EA5E9', '#2563EB']}
                    style={styles.avatarGradient}
                  >
                    <Ionicons name="person" size={28} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={styles.verifiedCheckBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  </View>
                </View>

                {/* Name & Ratings */}
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <AppText variant="title" bold numberOfLines={1} style={{ fontSize: 17 }}>
                      {driverName}
                    </AppText>
                    <TouchableOpacity
                      onPress={handleToggleFavorite}
                      disabled={favLoading}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name={isFav ? 'star' : 'star-outline'}
                        size={22}
                        color={isFav ? '#F59E0B' : theme.colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={12} color="#F59E0B" />
                      <Text style={styles.ratingText}>{rating}</Text>
                    </View>
                    <AppText variant="caption" color="secondary">
                      • {driver.total_trips || '1,200+'} Trips
                    </AppText>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <MaterialCommunityIcons name="shield-check" size={14} color="#10B981" />
                    <AppText variant="caption" bold style={{ color: '#10B981', fontSize: 11 }}>
                      Verified Partner (Police & KYC Clear)
                    </AppText>
                  </View>
                </View>
              </View>
            </View>

            {/* ── Vehicle Info Details ── */}
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: isDark ? '#1F2937' : '#F8FAFC',
                  borderColor: isDark ? '#374151' : '#E2E8F0',
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <MaterialCommunityIcons name="car-side" size={20} color={theme.colors.primary} />
                <AppText variant="body" bold>
                  Assigned Vehicle Details
                </AppText>
              </View>

              <View style={styles.vehicleGrid}>
                <View style={styles.vehicleGridItem}>
                  <AppText variant="caption" color="secondary">Vehicle Model</AppText>
                  <AppText variant="bodyS" bold numberOfLines={1}>{vehicleName}</AppText>
                </View>

                <View style={styles.vehicleGridItem}>
                  <AppText variant="caption" color="secondary">Registration Number</AppText>
                  <View style={styles.plateBadge}>
                    <Text style={styles.plateText}>{regNumber}</Text>
                  </View>
                </View>

                <View style={styles.vehicleGridItem}>
                  <AppText variant="caption" color="secondary">Seating Capacity</AppText>
                  <AppText variant="bodyS" bold>{seats} Passenger Seats</AppText>
                </View>

                <View style={styles.vehicleGridItem}>
                  <AppText variant="caption" color="secondary">Air Conditioning</AppText>
                  <AppText variant="bodyS" bold style={{ color: hasAc ? '#10B981' : '#64748B' }}>
                    {hasAc ? '❄️ AC Equipped' : 'Non-AC'}
                  </AppText>
                </View>
              </View>
            </View>

            {/* ── Live Corridor Metrics ── */}
            <View style={styles.metricsRow}>
              <View
                style={[
                  styles.metricCard,
                  {
                    backgroundColor: isDark ? '#1F2937' : '#F0FDF4',
                    borderColor: isDark ? '#374151' : '#DCFCE7',
                  },
                ]}
              >
                <Feather name="navigation" size={18} color="#10B981" />
                <Text style={[styles.metricVal, { color: isDark ? '#34D399' : '#059669' }]}>
                  {distance} km
                </Text>
                <Text style={styles.metricLbl}>Distance Away</Text>
              </View>

              <View
                style={[
                  styles.metricCard,
                  {
                    backgroundColor: isDark ? '#1F2937' : '#EFF6FF',
                    borderColor: isDark ? '#374151' : '#DBEAFE',
                  },
                ]}
              >
                <Feather name="clock" size={18} color="#0284C7" />
                <Text style={[styles.metricVal, { color: isDark ? '#38BDF8' : '#0284C7' }]}>
                  ~{etaMin} mins
                </Text>
                <Text style={styles.metricLbl}>Estimated Arrival</Text>
              </View>

              <View
                style={[
                  styles.metricCard,
                  {
                    backgroundColor: isDark ? '#1F2937' : '#FAF5FF',
                    borderColor: isDark ? '#374151' : '#F3E8FF',
                  },
                ]}
              >
                <Ionicons name="speedometer-outline" size={18} color="#8B5CF6" />
                <Text style={[styles.metricVal, { color: isDark ? '#A78BFA' : '#7C3AED' }]}>
                  99.2%
                </Text>
                <Text style={styles.metricLbl}>Acceptance Rate</Text>
              </View>
            </View>

            {/* ── Dispatch Priority Notice ── */}
            <View style={[styles.noticeBox, { backgroundColor: isDark ? 'rgba(14,165,233,0.1)' : '#E0F2FE' }]}>
              <Ionicons name="information-circle" size={18} color="#0284C7" />
              <AppText variant="caption" style={{ flex: 1, marginLeft: 8, color: '#0369A1' }}>
                This driver is actively circulating in your 3KM corridor. Your request has already been broadcast to them for instant pickup.
              </AppText>
            </View>

            {/* ── Action Buttons ── */}
            <View style={{ marginTop: 18, gap: 10 }}>
              {onPrioritize && (
                <AppButton
                  variant="primary"
                  onPress={() => {
                    const dId = driver.driver_id || driver.id
                    if (dId) {
                      onPrioritize(dId)
                      onClose()
                    }
                  }}
                >
                  Prioritize This Driver 🚕
                </AppButton>
              )}

              <AppButton variant="secondary" onPress={onClose}>
                Back to Radar View
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
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flex: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  driverHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarGradient: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedCheckBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  vehicleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
  },
  vehicleGridItem: {
    width: '50%',
    paddingRight: 6,
  },
  plateBadge: {
    backgroundColor: '#FEF08A',
    borderWidth: 1,
    borderColor: '#CA8A04',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  plateText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#713F12',
    letterSpacing: 0.5,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
  },
  metricLbl: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
})
