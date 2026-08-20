/**
 * My Vehicles Screen — Feature 3: Multi-Vehicle Management Hub
 * Lists active hero vehicle, approved standby vehicles, pending review vehicles,
 * fast active switching, expiry warnings, and developer mode simulation.
 */
import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect } from 'expo-router'
import { useTheme } from '../../src/theme'
import {
  DriverVehicle,
  VehicleDashboardSummary,
  VehicleService,
} from '../../src/services/vehicleService'
import { VehicleCard } from '../../src/components/vehicle/VehicleCard'
import { ActiveVehicleSelector } from '../../src/components/vehicle/ActiveVehicleSelector'

export default function MyVehiclesScreen() {
  const { theme, isDark } = useTheme()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [summary, setSummary] = useState<VehicleDashboardSummary | null>(null)
  const [vehicles, setVehicles] = useState<DriverVehicle[]>([])
  const [showSwitchModal, setShowSwitchModal] = useState(false)
  const [showDevModal, setShowDevModal] = useState(false)
  const [selectedVehicleForDev, setSelectedVehicleForDev] = useState<DriverVehicle | null>(null)

  const loadData = useCallback(async () => {
    try {
      const data = await VehicleService.getVehicles()
      const sum = await VehicleService.getDashboardSummary()
      setVehicles(data.filter(v => v.status !== 'REMOVED'))
      setSummary(sum)
    } catch (e) {
      console.warn('[MyVehicles] Error loading vehicles:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadData()
    }, [loadData])
  )

  const handleSetActive = async (vehicle: DriverVehicle) => {
    Alert.alert(
      'Switch Active Vehicle',
      `Activate ${vehicle.make} ${vehicle.model} (${vehicle.registration_number}) for your trips?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate',
          style: 'default',
          onPress: async () => {
            try {
              await VehicleService.switchActiveVehicle(vehicle.id)
              await loadData()
              Alert.alert('Success', `${vehicle.make} ${vehicle.model} is now your ACTIVE vehicle.`)
            } catch (err: any) {
              Alert.alert('Activation Failed', err.message || 'Could not activate vehicle.')
            }
          },
        },
      ]
    )
  }

  const handleArchive = async (vehicle: DriverVehicle) => {
    Alert.alert(
      'Remove Vehicle',
      `Are you sure you want to remove ${vehicle.make} ${vehicle.model} (${vehicle.registration_number}) from your account?\n\nHistorical trip records will be preserved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await VehicleService.archiveVehicle(vehicle.id)
              await loadData()
              Alert.alert('Removed', 'Vehicle has been archived.')
            } catch (err: any) {
              Alert.alert('Cannot Remove', err.message || 'Failed to remove vehicle.')
            }
          },
        },
      ]
    )
  }

  const handleDevSimulate = async (status: any, reason?: string) => {
    if (!selectedVehicleForDev) return
    try {
      await VehicleService.devSetVehicleStatus(selectedVehicleForDev.id, status, reason)
      setShowDevModal(false)
      await loadData()
      Alert.alert('Dev Mode', `Status updated to ${status} for ${selectedVehicleForDev.make} ${selectedVehicleForDev.model}`)
    } catch (err: any) {
      Alert.alert('Dev Error', err.message)
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color="#0EA5E9" />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading your vehicles...
        </Text>
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: isDark ? '#111827' : '#FFFFFF',
              borderBottomColor: isDark ? '#1F2937' : '#E2E8F0',
            },
          ]}
        >
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>My Vehicles</Text>
          <TouchableOpacity
            style={styles.addHeaderBtn}
            onPress={() => {
              if (summary && !summary.can_add_more) {
                Alert.alert('Limit Reached', `You have reached the maximum allowed vehicles (${summary.max_vehicles_allowed}). Please archive an unused vehicle to add another.`)
              } else {
                router.push('/vehicle/add')
              }
            }}
          >
            <Feather name="plus" size={20} color="#0EA5E9" />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                loadData()
              }}
              tintColor="#0EA5E9"
            />
          }
        >
          {/* Top KPI Metrics Bar */}
          {summary && (
            <View
              style={[
                styles.kpiContainer,
                {
                  backgroundColor: isDark ? '#111827' : '#FFFFFF',
                  borderColor: isDark ? '#1F2937' : '#E2E8F0',
                },
              ]}
            >
              <View style={styles.kpiItem}>
                <Text style={[styles.kpiNumber, { color: theme.colors.text }]}>
                  {summary.total_vehicles}
                </Text>
                <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>
                  Total
                </Text>
              </View>
              <View style={styles.kpiDivider} />
              <View style={styles.kpiItem}>
                <Text style={[styles.kpiNumber, { color: '#10B981' }]}>
                  {summary.active_vehicle ? '1' : '0'}
                </Text>
                <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>
                  Active
                </Text>
              </View>
              <View style={styles.kpiDivider} />
              <View style={styles.kpiItem}>
                <Text style={[styles.kpiNumber, { color: '#F59E0B' }]}>
                  {summary.pending_count}
                </Text>
                <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>
                  Pending
                </Text>
              </View>
              <View style={styles.kpiDivider} />
              <View style={styles.kpiItem}>
                <Text style={[styles.kpiNumber, { color: '#EF4444' }]}>
                  {summary.action_required_count}
                </Text>
                <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>
                  Action Req
                </Text>
              </View>
            </View>
          )}

          {/* Quick Action Switching Strip */}
          {summary?.active_vehicle && summary.standby_vehicles.some(v => v.status === 'APPROVED' || v.status === 'INACTIVE') && (
            <TouchableOpacity
              style={[
                styles.switchBanner,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F0F9FF',
                  borderColor: isDark ? '#334155' : '#BAE6FD',
                },
              ]}
              activeOpacity={0.8}
              onPress={() => setShowSwitchModal(true)}
            >
              <View style={styles.switchBannerLeft}>
                <Ionicons name="swap-horizontal" size={20} color="#0EA5E9" />
                <View>
                  <Text style={[styles.switchBannerTitle, { color: theme.colors.text }]}>
                    Switch Active Vehicle
                  </Text>
                  <Text style={[styles.switchBannerSub, { color: theme.colors.textSecondary }]}>
                    Currently driving {summary.active_vehicle.make} {summary.active_vehicle.model}
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color="#0EA5E9" />
            </TouchableOpacity>
          )}

          {/* Empty State */}
          {vehicles.length === 0 && (
            <View style={styles.emptyContainer}>
              <View
                style={[
                  styles.emptyIconCircle,
                  { backgroundColor: isDark ? '#1F2937' : '#F1F5F9' },
                ]}
              >
                <MaterialCommunityIcons name="car-multiple" size={48} color="#0EA5E9" />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                No Vehicles Added Yet
              </Text>
              <Text style={[styles.emptySub, { color: theme.colors.textSecondary }]}>
                Register your vehicle details and upload compliance documents to start accepting rides.
              </Text>
              <TouchableOpacity
                style={styles.addBtnLarge}
                onPress={() => router.push('/vehicle/add')}
              >
                <LinearGradient
                  colors={['#0EA5E9', '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientBtn}
                >
                  <Feather name="plus" size={18} color="#FFFFFF" />
                  <Text style={styles.btnText}>Add Your Vehicle</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Active Hero Vehicle */}
          {summary?.active_vehicle && (
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Active Vehicle
                </Text>
                <View style={styles.liveOnlinePill}>
                  <View style={styles.greenDot} />
                  <Text style={styles.liveOnlineText}>ONLINE READY</Text>
                </View>
              </View>
              <VehicleCard
                vehicle={summary.active_vehicle}
                onPress={() => router.push(`/vehicle/${summary.active_vehicle!.id}` as any)}
                onEdit={() => router.push(`/vehicle/edit?id=${summary.active_vehicle!.id}` as any)}
              />
            </View>
          )}

          {/* Standby & Other Vehicles */}
          {summary && summary.standby_vehicles.length > 0 && (
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Standby & Other Vehicles ({summary.standby_vehicles.length})
                </Text>
              </View>
              {summary.standby_vehicles.map(veh => (
                <VehicleCard
                  key={veh.id}
                  vehicle={veh}
                  onPress={() => router.push(`/vehicle/${veh.id}` as any)}
                  onSetActive={() => handleSetActive(veh)}
                  onEdit={() => router.push(`/vehicle/edit?id=${veh.id}` as any)}
                  onDelete={() => handleArchive(veh)}
                />
              ))}
            </View>
          )}

          {/* Add Another Vehicle CTA Footer */}
          {vehicles.length > 0 && (
            <TouchableOpacity
              style={[
                styles.addAnotherCard,
                {
                  backgroundColor: isDark ? '#111827' : '#FFFFFF',
                  borderColor: isDark ? '#1F2937' : '#E2E8F0',
                },
              ]}
              activeOpacity={0.8}
              onPress={() => {
                if (summary && !summary.can_add_more) {
                  Alert.alert('Limit Reached', `Maximum ${summary.max_vehicles_allowed} vehicles allowed per driver.`)
                } else {
                  router.push('/vehicle/add')
                }
              }}
            >
              <View style={styles.addAnotherIcon}>
                <Feather name="plus-circle" size={22} color="#0EA5E9" />
              </View>
              <View style={styles.addAnotherTextCol}>
                <Text style={[styles.addAnotherTitle, { color: theme.colors.text }]}>
                  Add Another Vehicle
                </Text>
                <Text style={[styles.addAnotherSub, { color: theme.colors.textSecondary }]}>
                  {summary ? `${summary.total_vehicles} of ${summary.max_vehicles_allowed} slots used` : 'Add up to 5 vehicles'}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}

          {/* Developer Mode Sandbox Helper */}
          {__DEV__ && vehicles.length > 0 && (
            <View style={styles.devSection}>
              <TouchableOpacity
                style={styles.devTriggerBtn}
                onPress={() => {
                  setSelectedVehicleForDev(vehicles[0])
                  setShowDevModal(true)
                }}
              >
                <Ionicons name="construct-outline" size={16} color="#F59E0B" />
                <Text style={styles.devTriggerText}>Developer Mode: Simulate Vehicle States</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Switch Active Modal */}
        <ActiveVehicleSelector
          visible={showSwitchModal}
          vehicles={vehicles}
          onClose={() => setShowSwitchModal(false)}
          onSwitched={() => loadData()}
        />

        {/* Dev Mode Simulation Options */}
        {showDevModal && selectedVehicleForDev && (
          <View style={styles.devModalOverlay}>
            <View style={[styles.devModalCard, { backgroundColor: isDark ? '#111827' : '#FFFFFF' }]}>
              <Text style={[styles.devModalTitle, { color: theme.colors.text }]}>
                Developer Simulation: {selectedVehicleForDev.make} {selectedVehicleForDev.model}
              </Text>
              <Text style={[styles.devModalSub, { color: theme.colors.textSecondary }]}>
                Simulate backend compliance approval, inspection results, or expired documents
              </Text>

              <View style={styles.devBtnGrid}>
                <TouchableOpacity
                  style={[styles.devSimBtn, { backgroundColor: '#10B981' }]}
                  onPress={() => handleDevSimulate('APPROVED')}
                >
                  <Text style={styles.devSimBtnText}>✅ Approve Vehicle</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.devSimBtn, { backgroundColor: '#EF4444' }]}
                  onPress={() => handleDevSimulate('REJECTED', 'RC scan is blurry and unreadable.')}
                >
                  <Text style={styles.devSimBtnText}>❌ Reject (RC Blurry)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.devSimBtn, { backgroundColor: '#DC2626' }]}
                  onPress={() => handleDevSimulate('EXPIRED')}
                >
                  <Text style={styles.devSimBtnText}>⚠️ Expire Insurance</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.devSimBtn, { backgroundColor: '#8B5CF6' }]}
                  onPress={() => handleDevSimulate('INSPECTION_REQUIRED')}
                >
                  <Text style={styles.devSimBtnText}>🔧 Require Inspection</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.devSimBtn, { backgroundColor: '#64748B' }]}
                  onPress={() => setShowDevModal(false)}
                >
                  <Text style={styles.devSimBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 13, fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  addHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  kpiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  kpiItem: {
    alignItems: 'center',
    flex: 1,
  },
  kpiNumber: {
    fontSize: 18,
    fontWeight: '800',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  kpiDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  switchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  switchBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  switchBannerSub: {
    fontSize: 11,
    marginTop: 2,
  },
  sectionWrap: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  liveOnlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveOnlineText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  addBtnLarge: {
    width: '100%',
    maxWidth: 280,
    borderRadius: 14,
    overflow: 'hidden',
  },
  gradientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addAnotherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addAnotherIcon: {
    marginRight: 14,
  },
  addAnotherTextCol: {
    flex: 1,
  },
  addAnotherTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  addAnotherSub: {
    fontSize: 11,
    marginTop: 2,
  },
  devSection: {
    marginTop: 30,
    alignItems: 'center',
  },
  devTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  devTriggerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
  },
  devModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  devModalCard: {
    width: '100%',
    borderRadius: 18,
    padding: 20,
  },
  devModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  devModalSub: {
    fontSize: 12,
    marginBottom: 16,
  },
  devBtnGrid: {
    gap: 10,
  },
  devSimBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  devSimBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
