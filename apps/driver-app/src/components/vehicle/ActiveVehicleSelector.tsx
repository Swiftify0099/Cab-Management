import React, { useState } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../../theme'
import { DriverVehicle, VehicleService } from '../../services/vehicleService'

interface Props {
  visible: boolean
  vehicles: DriverVehicle[]
  onClose: () => void
  onSwitched: (newActiveVehicle: DriverVehicle) => void
}

export function ActiveVehicleSelector({
  visible,
  vehicles,
  onClose,
  onSwitched,
}: Props) {
  const { theme, isDark } = useTheme()
  const [switchingId, setSwitchingId] = useState<string | null>(null)

  const approvedVehicles = vehicles.filter(
    v => v.status === 'ACTIVE' || v.status === 'INACTIVE' || v.status === 'APPROVED'
  )

  const handleSelect = async (vehicle: DriverVehicle) => {
    if (vehicle.is_active) {
      onClose()
      return
    }

    Alert.alert(
      'Switch Active Vehicle',
      `Set ${vehicle.make} ${vehicle.model} (${vehicle.registration_number}) as your active vehicle?\n\nYour upcoming intercity trips and fare calculations will automatically update.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch Now',
          style: 'default',
          onPress: async () => {
            try {
              setSwitchingId(vehicle.id)
              const updated = await VehicleService.switchActiveVehicle(vehicle.id)
              onSwitched(updated)
              onClose()
            } catch (err: any) {
              Alert.alert('Activation Failed', err.message || 'Could not switch active vehicle.')
            } finally {
              setSwitchingId(null)
            }
          },
        },
      ]
    )
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheetContainer,
            { backgroundColor: isDark ? '#111827' : '#FFFFFF' },
          ]}
        >
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>
                Switch Active Vehicle
              </Text>
              <Text style={[styles.sheetSubtitle, { color: theme.colors.textSecondary }]}>
                Select an approved vehicle for your next rides
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* List of eligible vehicles */}
          <View style={styles.listContainer}>
            {approvedVehicles.map(veh => {
              const isCurrent = veh.is_active
              const isSwitching = switchingId === veh.id

              return (
                <TouchableOpacity
                  key={veh.id}
                  activeOpacity={0.8}
                  disabled={isSwitching}
                  onPress={() => handleSelect(veh)}
                  style={[
                    styles.vehicleItem,
                    {
                      backgroundColor: isCurrent
                        ? isDark
                          ? 'rgba(16, 185, 129, 0.12)'
                          : 'rgba(16, 185, 129, 0.08)'
                        : isDark
                        ? '#1F2937'
                        : '#F8FAFC',
                      borderColor: isCurrent
                        ? '#10B981'
                        : isDark
                        ? '#374151'
                        : '#E2E8F0',
                      borderWidth: isCurrent ? 2 : 1,
                    },
                  ]}
                >
                  <View style={styles.itemLeft}>
                    <View
                      style={[
                        styles.iconCircle,
                        {
                          backgroundColor: isCurrent
                            ? '#10B981'
                            : isDark
                            ? '#111827'
                            : '#E2E8F0',
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={veh.vehicle_type === 'suv' ? 'car-estate' : 'car-side'}
                        size={22}
                        color={isCurrent ? '#FFFFFF' : theme.colors.text}
                      />
                    </View>
                    <View style={styles.metaCol}>
                      <Text
                        style={[
                          styles.vehicleName,
                          { color: theme.colors.text, fontWeight: isCurrent ? '700' : '600' },
                        ]}
                      >
                        {veh.make} {veh.model}
                      </Text>
                      <Text
                        style={[styles.vehicleReg, { color: theme.colors.textSecondary }]}
                      >
                        {veh.registration_number} • {veh.seat_capacity} Seats
                      </Text>
                    </View>
                  </View>

                  <View style={styles.itemRight}>
                    {isSwitching ? (
                      <ActivityIndicator size="small" color="#0EA5E9" />
                    ) : isCurrent ? (
                      <View style={styles.activeChip}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={styles.activeChipText}>Active</Text>
                      </View>
                    ) : (
                      <View style={styles.selectChip}>
                        <Text style={styles.selectChipText}>Select</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
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
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 12,
  },
  closeBtn: {
    padding: 6,
  },
  listContainer: {
    gap: 12,
  },
  vehicleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaCol: {
    gap: 3,
  },
  vehicleName: {
    fontSize: 15,
  },
  vehicleReg: {
    fontSize: 12,
  },
  itemRight: {},
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  selectChip: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  selectChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
