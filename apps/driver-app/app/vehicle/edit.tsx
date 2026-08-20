/**
 * Edit Vehicle Details Screen
 * Route: /vehicle/edit?id=...
 * Allows updating non-identity vehicle fields (Color, AC, Fuel, Parcel capacity)
 * while locking core identity attributes (Registration Number, Make, Model).
 */
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { useTheme } from '../../src/theme'
import { DriverVehicle, VehicleService } from '../../src/services/vehicleService'

const COLOR_OPTIONS = [
  'Pearl White',
  'Silver Metallic',
  'Midnight Black',
  'Magma Grey',
  'Ocean Blue',
  'Ruby Red',
  'Golden Bronze',
  'Yellow',
]

const FUEL_OPTIONS: ('petrol' | 'diesel' | 'cng' | 'electric' | 'hybrid')[] = [
  'petrol',
  'diesel',
  'cng',
  'electric',
  'hybrid',
]

export default function EditVehicleScreen() {
  const { theme, isDark } = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [vehicle, setVehicle] = useState<DriverVehicle | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Editable form fields
  const [color, setColor] = useState('')
  const [fuelType, setFuelType] = useState<'petrol' | 'diesel' | 'cng' | 'electric' | 'hybrid'>('petrol')
  const [hasAc, setHasAc] = useState(true)
  const [parcelCapable, setParcelCapable] = useState(false)
  const [parcelKg, setParcelKg] = useState('50')

  useEffect(() => {
    if (!id) return
    VehicleService.getVehicleById(id).then(veh => {
      if (veh) {
        setVehicle(veh)
        setColor(veh.color)
        setFuelType(veh.fuel_type)
        setHasAc(veh.has_ac)
        setParcelCapable(veh.parcel_capable)
        setParcelKg(veh.parcel_capacity_kg ? veh.parcel_capacity_kg.toString() : '50')
      }
      setLoading(false)
    })
  }, [id])

  const handleSave = async () => {
    if (!id || !vehicle) return
    try {
      setSaving(true)
      await VehicleService.updateVehicle(id, {
        color,
        has_ac: hasAc,
        parcel_capable: parcelCapable,
        parcel_capacity_kg: parcelCapable ? parseFloat(parcelKg) || 50 : undefined,
        fuel_type: fuelType,
      })

      Alert.alert('Vehicle Updated', 'Your vehicle specifications have been saved.', [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Could not update vehicle.')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !vehicle) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color="#0EA5E9" />
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
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Edit Vehicle
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Locked Identity Banner */}
          <View
            style={[
              styles.lockedCard,
              {
                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                borderColor: isDark ? '#334155' : '#E2E8F0',
              },
            ]}
          >
            <View style={styles.lockIconWrap}>
              <Feather name="lock" size={16} color="#64748B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.lockedTitle, { color: theme.colors.text }]}>
                {vehicle.make} {vehicle.model} • {vehicle.registration_number}
              </Text>
              <Text style={[styles.lockedSub, { color: theme.colors.textSecondary }]}>
                Identity & registration details are locked to prevent compliance invalidation.
              </Text>
            </View>
          </View>

          {/* Color Selection */}
          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Vehicle Color</Text>
            <View style={styles.chipGrid}>
              {COLOR_OPTIONS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: color === c ? '#0EA5E9' : isDark ? '#1E293B' : '#F1F5F9',
                      borderColor: color === c ? '#0EA5E9' : isDark ? '#334155' : '#CBD5E1',
                    },
                  ]}
                  onPress={() => setColor(c)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: color === c ? '#FFFFFF' : theme.colors.text },
                    ]}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Fuel Type */}
          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Fuel Type</Text>
            <View style={styles.chipGrid}>
              {FUEL_OPTIONS.map(f => (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: fuelType === f ? '#0EA5E9' : isDark ? '#1E293B' : '#F1F5F9',
                      borderColor: fuelType === f ? '#0EA5E9' : isDark ? '#334155' : '#CBD5E1',
                    },
                  ]}
                  onPress={() => setFuelType(f)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: fuelType === f ? '#FFFFFF' : theme.colors.text },
                    ]}
                  >
                    {f.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* AC Toggle */}
          <View
            style={[
              styles.toggleRow,
              {
                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                borderColor: isDark ? '#334155' : '#E2E8F0',
              },
            ]}
          >
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.toggleTitle, { color: theme.colors.text }]}>
                Air Conditioning (AC)
              </Text>
              <Text style={[styles.toggleSub, { color: theme.colors.textSecondary }]}>
                Passengers can select AC preferences
              </Text>
            </View>
            <Switch
              value={hasAc}
              onValueChange={setHasAc}
              trackColor={{ true: '#0EA5E9', false: '#CBD5E1' }}
            />
          </View>

          {/* Parcel Transport Toggle */}
          <View
            style={[
              styles.toggleRow,
              {
                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                borderColor: isDark ? '#334155' : '#E2E8F0',
                marginTop: 12,
              },
            ]}
          >
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.toggleTitle, { color: theme.colors.text }]}>
                Parcel Delivery Capable
              </Text>
              <Text style={[styles.toggleSub, { color: theme.colors.textSecondary }]}>
                Accept boot space parcel delivery requests
              </Text>
            </View>
            <Switch
              value={parcelCapable}
              onValueChange={setParcelCapable}
              trackColor={{ true: '#0EA5E9', false: '#CBD5E1' }}
            />
          </View>

          {/* Save CTA */}
          <TouchableOpacity
            style={styles.saveBtn}
            disabled={saving}
            onPress={handleSave}
          >
            <LinearGradient
              colors={['#0EA5E9', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveGradient}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
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
  lockedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  lockIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  lockedSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  toggleSub: {
    fontSize: 11,
    marginTop: 2,
  },
  saveBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 30,
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
