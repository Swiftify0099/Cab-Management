/**
 * Vehicle Details & Management Hub
 * Route: /vehicle/[id]
 * Displays vehicle specifications, live document compliance states,
 * inspection scores, active status toggle, and audit history.
 */
import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { useTheme } from '../../src/theme'
import {
  DriverVehicle,
  VehicleService,
} from '../../src/services/vehicleService'
import { VehicleStatusBadge } from '../../src/components/vehicle/VehicleStatusBadge'

export default function VehicleDetailsScreen() {
  const { theme, isDark } = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [vehicle, setVehicle] = useState<DriverVehicle | null>(null)
  const [loading, setLoading] = useState(true)

  const loadVehicle = useCallback(async () => {
    if (!id) return
    try {
      const data = await VehicleService.getVehicleById(id)
      setVehicle(data)
    } catch (e) {
      console.warn('Error loading vehicle details:', e)
    } finally {
      setLoading(false)
    }
  }, [id])

  useFocusEffect(
    useCallback(() => {
      loadVehicle()
    }, [loadVehicle])
  )

  const handleSetActive = async () => {
    if (!vehicle) return
    try {
      await VehicleService.switchActiveVehicle(vehicle.id)
      await loadVehicle()
      Alert.alert('Vehicle Activated', `${vehicle.make} ${vehicle.model} is now your active vehicle for rides.`)
    } catch (err: any) {
      Alert.alert('Activation Blocked', err.message || 'Cannot activate this vehicle.')
    }
  }

  const handleArchive = async () => {
    if (!vehicle) return
    Alert.alert(
      'Remove Vehicle',
      `Are you sure you want to remove ${vehicle.make} ${vehicle.model} (${vehicle.registration_number})?\n\nHistorical trip records will remain intact.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove Vehicle',
          style: 'destructive',
          onPress: async () => {
            try {
              await VehicleService.archiveVehicle(vehicle.id)
              router.replace('/vehicle')
            } catch (err: any) {
              Alert.alert('Action Denied', err.message || 'Cannot remove vehicle.')
            }
          },
        },
      ]
    )
  }

  if (loading || !vehicle) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    )
  }

  const isActive = vehicle.is_active && vehicle.status === 'ACTIVE'
  const isApproved = vehicle.status === 'APPROVED' || vehicle.status === 'INACTIVE' || vehicle.status === 'ACTIVE'

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
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Vehicle Hub</Text>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push(`/vehicle/edit?id=${vehicle.id}` as any)}
          >
            <Feather name="edit-2" size={18} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Main Hero Summary Card */}
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: isDark ? '#111827' : '#FFFFFF',
                borderColor: isActive
                  ? '#10B981'
                  : isDark
                  ? '#1F2937'
                  : '#E2E8F0',
                borderWidth: isActive ? 2 : 1,
              },
            ]}
          >
            {isActive && (
              <LinearGradient
                colors={['rgba(16, 185, 129, 0.15)', 'rgba(16, 185, 129, 0.02)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            )}

            <View style={styles.heroTopRow}>
              <View>
                <Text style={[styles.heroVehicleName, { color: theme.colors.text }]}>
                  {vehicle.make} {vehicle.model}
                  {vehicle.variant ? ` ${vehicle.variant}` : ''}
                </Text>
                <Text style={[styles.heroCategory, { color: theme.colors.textSecondary }]}>
                  {vehicle.vehicle_type.toUpperCase()} • {vehicle.year} • {vehicle.color}
                </Text>
              </View>
              <VehicleStatusBadge status={vehicle.status} size="md" />
            </View>

            {/* License Registration Plate */}
            <View
              style={[
                styles.regPlate,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                  borderColor: isDark ? '#334155' : '#CBD5E1',
                },
              ]}
            >
              <View style={styles.indBox}>
                <Text style={styles.indText}>IND</Text>
              </View>
              <Text style={[styles.regText, { color: theme.colors.text }]}>
                {vehicle.registration_number}
              </Text>
            </View>

            {/* Rejection Alert Banner if applicable */}
            {vehicle.rejection_reason && (
              <View style={styles.rejectionAlert}>
                <Feather name="alert-triangle" size={18} color="#EF4444" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rejectionTitle}>Action Required by Compliance</Text>
                  <Text style={styles.rejectionBody}>{vehicle.rejection_reason}</Text>
                </View>
              </View>
            )}

            {/* Specs Grid */}
            <View style={styles.specsGrid}>
              <View style={[styles.specBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
                <MaterialCommunityIcons name="gas-station" size={18} color="#0EA5E9" />
                <Text style={[styles.specVal, { color: theme.colors.text }]}>
                  {vehicle.fuel_type.toUpperCase()}
                </Text>
                <Text style={[styles.specKey, { color: theme.colors.textSecondary }]}>Fuel</Text>
              </View>

              <View style={[styles.specBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
                <Feather name="users" size={18} color="#10B981" />
                <Text style={[styles.specVal, { color: theme.colors.text }]}>
                  {vehicle.seat_capacity} Seats
                </Text>
                <Text style={[styles.specKey, { color: theme.colors.textSecondary }]}>Capacity</Text>
              </View>

              <View style={[styles.specBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
                <Ionicons name="snow" size={18} color="#6366F1" />
                <Text style={[styles.specVal, { color: theme.colors.text }]}>
                  {vehicle.has_ac ? 'Available' : 'No AC'}
                </Text>
                <Text style={[styles.specKey, { color: theme.colors.textSecondary }]}>AC System</Text>
              </View>
            </View>

            {/* Primary Action Button */}
            {!isActive && isApproved ? (
              <TouchableOpacity
                style={styles.activateHeroBtn}
                activeOpacity={0.8}
                onPress={handleSetActive}
              >
                <LinearGradient
                  colors={['#0EA5E9', '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientBtnWrap}
                >
                  <Ionicons name="flash" size={18} color="#FFFFFF" />
                  <Text style={styles.activateHeroBtnText}>Set as Active Vehicle</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : isActive ? (
              <View style={styles.activeActiveBanner}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                <Text style={styles.activeActiveText}>This is your currently active vehicle</Text>
              </View>
            ) : null}
          </View>

          {/* INSPECTION HUB SECTION */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Inspection & Safety Hub
              </Text>
            </View>

            {vehicle.inspection ? (
              <View
                style={[
                  styles.inspectionCard,
                  {
                    backgroundColor: isDark ? '#111827' : '#FFFFFF',
                    borderColor: isDark ? '#1F2937' : '#E2E8F0',
                  },
                ]}
              >
                <View style={styles.inspTopRow}>
                  <View style={styles.inspIconWrap}>
                    <Ionicons
                      name={
                        vehicle.inspection.status === 'PASSED'
                          ? 'checkmark-done-circle'
                          : 'calendar'
                      }
                      size={26}
                      color={
                        vehicle.inspection.status === 'PASSED'
                          ? '#10B981'
                          : '#0EA5E9'
                      }
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inspStatusTitle, { color: theme.colors.text }]}>
                      {vehicle.inspection.status_label}
                    </Text>
                    {vehicle.inspection.hub_location && (
                      <Text style={[styles.inspHubLoc, { color: theme.colors.textSecondary }]}>
                        {vehicle.inspection.hub_location}
                      </Text>
                    )}
                  </View>
                  {vehicle.inspection.score !== undefined && (
                    <View style={styles.scorePill}>
                      <Text style={styles.scoreText}>{vehicle.inspection.score}/100</Text>
                    </View>
                  )}
                </View>

                {vehicle.inspection.notes && (
                  <Text style={[styles.inspNotes, { color: theme.colors.textSecondary }]}>
                    "{vehicle.inspection.notes}"
                  </Text>
                )}
              </View>
            ) : (
              <View
                style={[
                  styles.inspectionCard,
                  {
                    backgroundColor: isDark ? '#111827' : '#FFFFFF',
                    borderColor: isDark ? '#1F2937' : '#E2E8F0',
                  },
                ]}
              >
                <View style={styles.inspTopRow}>
                  <Ionicons name="shield-checkmark" size={24} color="#10B981" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.inspStatusTitle, { color: theme.colors.text }]}>
                      Digital Verification Certified
                    </Text>
                    <Text style={[styles.inspHubLoc, { color: theme.colors.textSecondary }]}>
                      Physical inspection is waived for this category.
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* COMPLIANCE DOCUMENTS SECTION */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Vehicle Documents ({vehicle.documents.length})
              </Text>
            </View>

            {vehicle.documents.map(doc => {
              const isApproved = doc.status === 'approved'
              const isRejected = doc.status === 'rejected'
              const isExpired = doc.status === 'expired' || doc.is_expired

              return (
                <View
                  key={doc.id}
                  style={[
                    styles.docCard,
                    {
                      backgroundColor: isDark ? '#111827' : '#FFFFFF',
                      borderColor: isRejected || isExpired
                        ? '#EF4444'
                        : isDark
                        ? '#1F2937'
                        : '#E2E8F0',
                    },
                  ]}
                >
                  <View style={styles.docLeft}>
                    <View
                      style={[
                        styles.docIcon,
                        {
                          backgroundColor: isApproved
                            ? 'rgba(16, 185, 129, 0.12)'
                            : isRejected || isExpired
                            ? 'rgba(239, 68, 68, 0.12)'
                            : 'rgba(14, 165, 233, 0.12)',
                        },
                      ]}
                    >
                      <Feather
                        name={isApproved ? 'check-circle' : isRejected || isExpired ? 'alert-triangle' : 'clock'}
                        size={20}
                        color={isApproved ? '#10B981' : isRejected || isExpired ? '#EF4444' : '#0EA5E9'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.docTitle, { color: theme.colors.text }]}>
                        {doc.name}
                      </Text>
                      <Text
                        style={[
                          styles.docExpiryText,
                          {
                            color: isExpired
                              ? '#EF4444'
                              : isApproved
                              ? '#10B981'
                              : theme.colors.textSecondary,
                          },
                        ]}
                      >
                        {doc.expiry_label || (isApproved ? 'Verified & Active' : 'Under Compliance Review')}
                      </Text>
                      {doc.rejection_reason && (
                        <Text style={styles.docReason}>• {doc.rejection_reason}</Text>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.docActionBtn,
                      {
                        backgroundColor: isRejected || isExpired ? '#EF4444' : isDark ? '#1E293B' : '#F1F5F9',
                      },
                    ]}
                    onPress={() => router.push(`/vehicle/documents/${vehicle.id}?doc=${doc.doc_type}` as any)}
                  >
                    <Text
                      style={[
                        styles.docActionText,
                        { color: isRejected || isExpired ? '#FFFFFF' : theme.colors.text },
                      ]}
                    >
                      {isRejected || isExpired ? 'Renew' : 'View'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            })}
          </View>

          {/* AUDIT & ARCHIVE SECTION */}
          <View style={styles.dangerSection}>
            <TouchableOpacity style={styles.archiveBtn} onPress={handleArchive}>
              <Feather name="trash-2" size={16} color="#EF4444" />
              <Text style={styles.archiveBtnText}>Archive / Remove This Vehicle</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    overflow: 'hidden',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  heroVehicleName: {
    fontSize: 20,
    fontWeight: '800',
  },
  heroCategory: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  regPlate: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 8,
    alignSelf: 'flex-start',
    overflow: 'hidden',
    marginBottom: 16,
  },
  indBox: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  indText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  regText: {
    fontSize: 15,
    fontWeight: '800',
    paddingHorizontal: 10,
    letterSpacing: 1.5,
  },
  rejectionAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#EF4444',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  rejectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  rejectionBody: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 2,
  },
  specsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  specBox: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 2,
  },
  specVal: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  specKey: {
    fontSize: 10,
    fontWeight: '600',
  },
  activateHeroBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientBtnWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  activateHeroBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  activeActiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 10,
  },
  activeActiveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  inspectionCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  inspTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inspIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
  },
  inspStatusTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  inspHubLoc: {
    fontSize: 12,
    marginTop: 2,
  },
  scorePill: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scoreText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  inspNotes: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 10,
    lineHeight: 16,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  docLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  docExpiryText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  docReason: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 2,
  },
  docActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  docActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dangerSection: {
    marginTop: 10,
    alignItems: 'center',
  },
  archiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  archiveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
})
