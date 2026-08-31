/**
 * Driver Onboarding Screen — Step 2: Vehicle Setup
 * Searchable Indian Vehicle Catalog (Brand -> Model -> Type & Capacity Auto-fill)
 * Selectable Year & Color with Upper-Case Registration Number.
 */
import React, { useState, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Modal,
  FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api } from '../../api/client'
import {
  VEHICLE_BRANDS_CATALOG,
  POPULAR_VEHICLE_COLORS,
  VEHICLE_YEARS,
  getModelDetails,
  VehicleBrandInfo,
  VehicleModelInfo,
} from '../../constants/vehicleCatalog'

export default function VehicleScreen() {
  const [form, setForm] = useState({
    make: 'Maruti Suzuki',
    model: 'Dzire',
    year: '2023',
    registration_number: '',
    vehicle_type: 'sedan',
    seat_capacity: 4,
    color: 'Pearl White',
    fuel_type: 'CNG',
    display_type: 'Sedan',
  })

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Modal States for Searchable Pickers
  const [showBrandModal, setShowBrandModal] = useState(false)
  const [showModelModal, setShowModelModal] = useState(false)
  const [showColorModal, setShowColorModal] = useState(false)
  const [showYearModal, setShowYearModal] = useState(false)

  // Search queries inside Modals
  const [brandSearch, setBrandSearch] = useState('')
  const [modelSearch, setModelSearch] = useState('')
  const [customColor, setCustomColor] = useState('')

  // Load existing vehicle if available
  useEffect(() => {
    let isMounted = true
    api.get('/driver/vehicles').catch(() => api.get('/driver/me/vehicle')).then(res => {
      const vData = res.data?.data || res.data
      const veh = Array.isArray(vData) ? vData[0] : vData
      if (veh && isMounted) {
        setForm(p => ({
          ...p,
          make: veh.make || p.make,
          model: veh.model || p.model,
          year: veh.year ? String(veh.year) : p.year,
          registration_number: veh.registration_number || p.registration_number,
          vehicle_type: veh.vehicle_type || p.vehicle_type,
          seat_capacity: veh.seat_capacity || p.seat_capacity,
          color: veh.color || p.color,
          fuel_type: veh.fuel_type || p.fuel_type,
        }))
      }
    }).catch(() => {})
    return () => { isMounted = false }
  }, [])

  const update = (key: string, value: any) => {
    setForm(p => ({ ...p, [key]: value }))
    setErrors(p => ({ ...p, [key]: '' }))
  }

  // Handle Brand Selection
  const handleSelectBrand = (brand: VehicleBrandInfo) => {
    const firstModel = brand.models[0]
    setForm(p => ({
      ...p,
      make: brand.brand,
      model: firstModel ? firstModel.model : '',
      vehicle_type: firstModel ? firstModel.vehicle_type : p.vehicle_type,
      seat_capacity: firstModel ? firstModel.seat_capacity : p.seat_capacity,
      display_type: firstModel ? firstModel.display_type : 'Car',
      fuel_type: firstModel?.fuel_types[0] || 'Petrol',
    }))
    setBrandSearch('')
    setShowBrandModal(false)
  }

  // Handle Model Selection (Auto-calculates Type & Capacity)
  const handleSelectModel = (modelInfo: VehicleModelInfo) => {
    setForm(p => ({
      ...p,
      model: modelInfo.model,
      vehicle_type: modelInfo.vehicle_type,
      seat_capacity: modelInfo.seat_capacity,
      display_type: modelInfo.display_type,
      fuel_type: modelInfo.fuel_types[0] || 'Petrol',
    }))
    setModelSearch('')
    setShowModelModal(false)
  }

  // Selected Brand object
  const currentBrand = useMemo(() => {
    return VEHICLE_BRANDS_CATALOG.find(
      b => b.brand.toLowerCase() === form.make.toLowerCase()
    ) || VEHICLE_BRANDS_CATALOG[0]
  }, [form.make])

  // Filtered Brands for Modal
  const filteredBrands = useMemo(() => {
    if (!brandSearch.trim()) return VEHICLE_BRANDS_CATALOG
    const q = brandSearch.toLowerCase()
    return VEHICLE_BRANDS_CATALOG.filter(
      b => b.brand.toLowerCase().includes(q) || b.models.some(m => m.model.toLowerCase().includes(q))
    )
  }, [brandSearch])

  // Filtered Models for Modal
  const filteredModels = useMemo(() => {
    const list = currentBrand ? currentBrand.models : []
    if (!modelSearch.trim()) return list
    const q = modelSearch.toLowerCase()
    return list.filter(m => m.model.toLowerCase().includes(q) || m.display_type.toLowerCase().includes(q))
  }, [currentBrand, modelSearch])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.make.trim()) e.make = 'Brand is required'
    if (!form.model.trim()) e.model = 'Model is required'
    if (!form.year.trim() || isNaN(Number(form.year)) || form.year.length !== 4) e.year = 'Valid year is required'
    if (!form.registration_number.trim() || form.registration_number.trim().length < 6) {
      e.registration_number = 'Enter valid registration number (e.g. MH 12 AB 1234)'
    }
    if (!form.color.trim()) e.color = 'Color is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleNext = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const payload = {
        ...form,
        year: Number(form.year),
        seat_capacity: Number(form.seat_capacity),
        status: 'APPROVED',
        is_active: true,
      }

      // 1. Post to backend
      await api.post('/driver/me/vehicle', payload).catch(() => api.post('/driver/vehicles', payload)).catch(() => {})

      // 2. Cache in local storage for instant trip creation & active vehicle switcher
      await AsyncStorage.setItem('driver_active_vehicle', JSON.stringify(payload))
      await AsyncStorage.setItem('driver_vehicle_details', JSON.stringify(payload))

      router.push('/onboarding/documents')
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Failed to save vehicle details.'
      Alert.alert('Error', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <Text style={styles.logoEmoji}>🚗</Text>
            </View>
            <Text style={styles.headerTitle}>Vehicle Details</Text>
            <Text style={styles.headerSubtitle}>Select your vehicle brand, model & registration details</Text>
          </View>

          {/* Stepper (Step 2 of 4) */}
          <View style={styles.stepperContainer}>
            {[1, 2, 3, 4].map((step, i) => (
              <View key={step} style={styles.stepItem}>
                <View style={[styles.stepCircle, step <= 2 ? styles.stepActive : styles.stepInactive]}>
                  <Text style={[styles.stepNumber, step <= 2 ? styles.stepNumberActive : styles.stepNumberInactive]}>
                    {step < 2 ? '✓' : step === 2 ? '🚗' : step}
                  </Text>
                </View>
                <Text style={[styles.stepLabel, step <= 2 ? styles.stepLabelActive : styles.stepLabelInactive]}>
                  {step === 1 ? 'Profile' : step === 2 ? 'Vehicle' : step === 3 ? 'Docs' : 'Review'}
                </Text>
                {i < 3 && <View style={[styles.stepConnector, step < 2 ? styles.stepConnectorActive : styles.stepConnectorInactive]} />}
              </View>
            ))}
          </View>

          {/* Card: Brand & Model Selection */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Vehicle Specification</Text>
              <View style={styles.badgeCatalog}>
                <Feather name="check-circle" size={12} color="#10B981" />
                <Text style={styles.badgeCatalogText}>Catalog Auto-Sync</Text>
              </View>
            </View>

            {/* Brand (Make) Picker Trigger */}
            <Text style={styles.label}>Vehicle Brand (Make) *</Text>
            <TouchableOpacity
              style={[styles.pickerTrigger, errors.make && styles.inputError]}
              onPress={() => setShowBrandModal(true)}
              activeOpacity={0.8}
            >
              <View style={styles.pickerTriggerLeft}>
                <Text style={styles.brandIconMini}>{currentBrand.logo_icon}</Text>
                <Text style={styles.pickerValueText}>{form.make || 'Select Brand'}</Text>
              </View>
              <Feather name="chevron-down" size={18} color="#94A3B8" />
            </TouchableOpacity>
            {errors.make && <Text style={styles.errorText}>⚠ {errors.make}</Text>}

            {/* Model Picker Trigger */}
            <Text style={[styles.label, { marginTop: 14 }]}>Vehicle Model *</Text>
            <TouchableOpacity
              style={[styles.pickerTrigger, errors.model && styles.inputError]}
              onPress={() => setShowModelModal(true)}
              activeOpacity={0.8}
            >
              <View style={styles.pickerTriggerLeft}>
                <Feather name="layers" size={18} color="#F59E0B" style={{ marginRight: 8 }} />
                <Text style={styles.pickerValueText}>{form.model || 'Select Model'}</Text>
              </View>
              <View style={styles.modelTagBadge}>
                <Text style={styles.modelTagText}>{form.display_type}</Text>
                <Feather name="chevron-down" size={16} color="#94A3B8" style={{ marginLeft: 4 }} />
              </View>
            </TouchableOpacity>
            {errors.model && <Text style={styles.errorText}>⚠ {errors.model}</Text>}

            {/* Auto-Calculated Type & Capacity Readout Card */}
            <View style={styles.autoCalcBox}>
              <View style={styles.calcCol}>
                <Text style={styles.calcLabel}>BODY TYPE</Text>
                <Text style={styles.calcValue}>{form.vehicle_type.toUpperCase()}</Text>
              </View>
              <View style={styles.calcDivider} />
              <View style={styles.calcCol}>
                <Text style={styles.calcLabel}>CAPACITY</Text>
                <Text style={styles.calcValue}>{form.seat_capacity} SEATER</Text>
              </View>
              <View style={styles.calcDivider} />
              <View style={styles.calcCol}>
                <Text style={styles.calcLabel}>FUEL</Text>
                <Text style={styles.calcValue}>{form.fuel_type}</Text>
              </View>
            </View>
          </View>

          {/* Card: Color, Year & Registration */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Identity & Registration</Text>

            <View style={styles.fieldGroup}>
              {/* Year Selector */}
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Manufacturing Year *</Text>
                <TouchableOpacity
                  style={styles.pickerTrigger}
                  onPress={() => setShowYearModal(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.pickerValueText}>{form.year}</Text>
                  <Feather name="calendar" size={16} color="#94A3B8" />
                </TouchableOpacity>
                {errors.year && <Text style={styles.errorText}>⚠ {errors.year}</Text>}
              </View>

              {/* Color Selector */}
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Vehicle Color *</Text>
                <TouchableOpacity
                  style={styles.pickerTrigger}
                  onPress={() => setShowColorModal(true)}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[styles.colorDot, { backgroundColor: form.color.toLowerCase().includes('white') ? '#FFFFFF' : form.color.toLowerCase().includes('black') ? '#000000' : form.color.toLowerCase().includes('silver') ? '#C0C0C0' : form.color.toLowerCase().includes('red') ? '#EF4444' : form.color.toLowerCase().includes('blue') ? '#3B82F6' : '#F59E0B' }]} />
                    <Text style={styles.pickerValueText} numberOfLines={1}>{form.color}</Text>
                  </View>
                  <Feather name="chevron-down" size={16} color="#94A3B8" />
                </TouchableOpacity>
                {errors.color && <Text style={styles.errorText}>⚠ {errors.color}</Text>}
              </View>
            </View>

            {/* Registration Number Field */}
            <View style={{ marginTop: 14 }}>
              <Text style={styles.label}>Vehicle Registration Number (RTO) *</Text>
              <View style={styles.regInputContainer}>
                <View style={styles.indBadge}>
                  <Text style={styles.indBadgeText}>IND</Text>
                </View>
                <TextInput
                  style={[styles.regInput, errors.registration_number && styles.inputError]}
                  placeholder="e.g. MH 12 AB 1234"
                  placeholderTextColor="#64748B"
                  autoCapitalize="characters"
                  maxLength={14}
                  value={form.registration_number}
                  onChangeText={t => update('registration_number', t.toUpperCase())}
                />
              </View>
              {errors.registration_number && (
                <Text style={styles.errorText}>⚠ {errors.registration_number}</Text>
              )}
              <Text style={styles.regHint}>Must match with the RC Book you will upload next</Text>
            </View>
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            onPress={handleNext}
            disabled={loading}
            activeOpacity={0.85}
            style={[styles.button, loading ? styles.buttonDisabled : styles.buttonActive]}
          >
            {loading ? (
              <ActivityIndicator color="#0F172A" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.buttonTextActive}>Continue to Documents</Text>
                <Feather name="arrow-right" size={18} color="#0F172A" />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back to Profile</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Brand Selection Modal ── */}
      <Modal visible={showBrandModal} transparent animationType="slide" onRequestClose={() => setShowBrandModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Vehicle Brand</Text>
              <TouchableOpacity onPress={() => setShowBrandModal(false)} style={styles.modalCloseBtn}>
                <Feather name="x" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.modalSearchBar}>
              <Feather name="search" size={18} color="#94A3B8" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search brand (e.g. Maruti, Tata, Toyota...)"
                placeholderTextColor="#64748B"
                value={brandSearch}
                onChangeText={setBrandSearch}
                autoCorrect={false}
              />
              {brandSearch.length > 0 && (
                <TouchableOpacity onPress={() => setBrandSearch('')}>
                  <Feather name="x-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Brands List */}
            <FlatList
              data={filteredBrands}
              keyExtractor={item => item.brand}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => {
                const isSelected = form.make === item.brand
                return (
                  <TouchableOpacity
                    style={[styles.modalItemRow, isSelected && styles.modalItemRowActive]}
                    onPress={() => handleSelectBrand(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.brandIconCircle}>
                      <Text style={{ fontSize: 20 }}>{item.logo_icon}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.modalItemTitle, isSelected && styles.modalItemTitleActive]}>
                        {item.brand}
                      </Text>
                      <Text style={styles.modalItemSub}>
                        {item.models.length} models • {item.models.map(m => m.model).slice(0, 3).join(', ')}...
                      </Text>
                    </View>
                    {isSelected && <Feather name="check" size={20} color="#F59E0B" />}
                  </TouchableOpacity>
                )
              }}
            />
          </View>
        </View>
      </Modal>

      {/* ── Model Selection Modal ── */}
      <Modal visible={showModelModal} transparent animationType="slide" onRequestClose={() => setShowModelModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Select {form.make} Model</Text>
                <Text style={styles.modalSubtitle}>Auto-assigns category, body type & seating capacity</Text>
              </View>
              <TouchableOpacity onPress={() => setShowModelModal(false)} style={styles.modalCloseBtn}>
                <Feather name="x" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.modalSearchBar}>
              <Feather name="search" size={18} color="#94A3B8" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder={`Search in ${form.make} models...`}
                placeholderTextColor="#64748B"
                value={modelSearch}
                onChangeText={setModelSearch}
                autoCorrect={false}
              />
            </View>

            {/* Models List */}
            <FlatList
              data={filteredModels}
              keyExtractor={item => item.model}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => {
                const isSelected = form.model === item.model
                return (
                  <TouchableOpacity
                    style={[styles.modalItemRow, isSelected && styles.modalItemRowActive]}
                    onPress={() => handleSelectModel(item)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.brandIconCircle, { backgroundColor: isSelected ? 'rgba(245,158,11,0.2)' : '#1E293B' }]}>
                      <Feather name="truck" size={18} color={isSelected ? '#F59E0B' : '#94A3B8'} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.modalItemTitle, isSelected && styles.modalItemTitleActive]}>
                          {item.model}
                        </Text>
                        <View style={styles.typeBadge}>
                          <Text style={styles.typeBadgeText}>{item.display_type}</Text>
                        </View>
                      </View>
                      <Text style={styles.modalItemSub}>
                        {item.seat_capacity} Seater • Fuels: {item.fuel_types.join(', ')}
                      </Text>
                    </View>
                    {isSelected && <Feather name="check" size={20} color="#F59E0B" />}
                  </TouchableOpacity>
                )
              }}
            />
          </View>
        </View>
      </Modal>

      {/* ── Color Palette Modal ── */}
      <Modal visible={showColorModal} transparent animationType="slide" onRequestClose={() => setShowColorModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Choose Vehicle Color</Text>
              <TouchableOpacity onPress={() => setShowColorModal(false)} style={styles.modalCloseBtn}>
                <Feather name="x" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.colorPaletteGrid}>
              {POPULAR_VEHICLE_COLORS.map(c => {
                const isSelected = form.color === c.name
                return (
                  <TouchableOpacity
                    key={c.name}
                    style={[styles.colorOption, isSelected && styles.colorOptionActive]}
                    onPress={() => {
                      update('color', c.name)
                      setShowColorModal(false)
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.colorCircle, { backgroundColor: c.hex, borderColor: c.border }]} />
                    <Text style={[styles.colorName, isSelected && styles.colorNameActive]}>{c.name}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Custom Color Input */}
            <View style={{ marginTop: 14 }}>
              <Text style={styles.label}>Or type custom color</Text>
              <View style={styles.customColorRow}>
                <TextInput
                  style={styles.customColorInput}
                  placeholder="e.g. Dark Maroon / Bronze"
                  placeholderTextColor="#64748B"
                  value={customColor}
                  onChangeText={setCustomColor}
                />
                <TouchableOpacity
                  style={styles.customColorBtn}
                  onPress={() => {
                    if (customColor.trim()) {
                      update('color', customColor.trim())
                      setCustomColor('')
                      setShowColorModal(false)
                    }
                  }}
                >
                  <Text style={styles.customColorBtnText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Year Selection Modal ── */}
      <Modal visible={showYearModal} transparent animationType="slide" onRequestClose={() => setShowYearModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: '60%' }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Manufacturing Year</Text>
              <TouchableOpacity onPress={() => setShowYearModal(false)} style={styles.modalCloseBtn}>
                <Feather name="x" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={VEHICLE_YEARS}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.yearItemRow, form.year === item && styles.yearItemRowActive]}
                  onPress={() => {
                    update('year', item)
                    setShowYearModal(false)
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.yearText, form.year === item && styles.yearTextActive]}>{item}</Text>
                  {form.year === item && <Feather name="check" size={18} color="#F59E0B" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F172A' },
  flex: { flex: 1 },
  scroll: { flex: 1, paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 48, paddingTop: 8 },

  header: { alignItems: 'center', marginBottom: 24, marginTop: 8 },
  logoBox: {
    width: 68, height: 68, borderRadius: 20, backgroundColor: '#1E293B',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#334155',
  },
  logoEmoji: { fontSize: 32 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  headerSubtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 4 },

  stepperContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20, paddingHorizontal: 8 },
  stepItem: { alignItems: 'center', flex: 1, position: 'relative' },
  stepCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  stepActive: { backgroundColor: '#F59E0B' },
  stepInactive: { backgroundColor: '#1E293B', borderWidth: 1.5, borderColor: '#334155' },
  stepNumber: { fontSize: 14, fontWeight: '700' },
  stepNumberActive: { color: '#0F172A' },
  stepNumberInactive: { color: '#475569' },
  stepLabel: { fontSize: 10, fontWeight: '600' },
  stepLabelActive: { color: '#F59E0B' },
  stepLabelInactive: { color: '#475569' },
  stepConnector: { position: 'absolute', top: 19, right: 0, width: '50%', height: 1.5 },
  stepConnectorActive: { backgroundColor: '#F59E0B' },
  stepConnectorInactive: { backgroundColor: '#1E293B' },

  card: {
    backgroundColor: '#1E293B', borderRadius: 20, padding: 18, marginBottom: 16,
    borderWidth: 1, borderColor: '#334155',
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  badgeCatalog: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(16,185,129,0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  badgeCatalogText: { color: '#10B981', fontSize: 10.5, fontWeight: '700' },

  label: { fontSize: 13, fontWeight: '600', color: '#CBD5E1', marginBottom: 6 },
  fieldGroup: { flexDirection: 'row', gap: 12 },

  pickerTrigger: {
    height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: '#334155',
    backgroundColor: '#0F172A', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 14,
  },
  pickerTriggerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  brandIconMini: { fontSize: 18, marginRight: 8 },
  pickerValueText: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '700' },
  modelTagBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245,158,11,0.12)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  modelTagText: { color: '#F59E0B', fontSize: 11, fontWeight: '700' },

  autoCalcBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: '#0F172A', borderRadius: 14, paddingVertical: 12, marginTop: 16,
    borderWidth: 1, borderColor: '#334155',
  },
  calcCol: { alignItems: 'center' },
  calcLabel: { color: '#64748B', fontSize: 9.5, fontWeight: '800', letterSpacing: 0.8 },
  calcValue: { color: '#FBBF24', fontSize: 12.5, fontWeight: '800', marginTop: 2 },
  calcDivider: { width: 1, height: 24, backgroundColor: '#334155' },

  colorDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: '#64748B' },

  regInputContainer: {
    flexDirection: 'row', alignItems: 'center', height: 52, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#334155', backgroundColor: '#0F172A', overflow: 'hidden',
  },
  indBadge: {
    backgroundColor: '#1E293B', paddingHorizontal: 12, height: '100%',
    alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#334155',
  },
  indBadgeText: { color: '#60A5FA', fontSize: 11, fontWeight: '900' },
  regInput: {
    flex: 1, paddingHorizontal: 14, fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1.2,
  },
  regHint: { color: '#64748B', fontSize: 11, marginTop: 6 },
  inputError: { borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.08)' },
  errorText: { color: '#F87171', fontSize: 12, marginTop: 4 },

  button: {
    height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    marginBottom: 14, marginTop: 8,
  },
  buttonActive: {
    backgroundColor: '#F59E0B', shadowColor: '#F59E0B', shadowOpacity: 0.3,
    shadowRadius: 10, elevation: 4,
  },
  buttonDisabled: { backgroundColor: '#334155' },
  buttonTextActive: { color: '#0F172A', fontSize: 15, fontWeight: '800' },
  backBtn: { alignItems: 'center', paddingVertical: 8 },
  backBtnText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContainer: {
    backgroundColor: '#1E293B', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '80%', borderWidth: 1, borderColor: '#334155',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#475569', alignSelf: 'center', marginBottom: 14 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  modalSubtitle: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  modalCloseBtn: { padding: 4 },

  modalSearchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A',
    borderRadius: 12, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 12,
    height: 44, marginBottom: 14, gap: 8,
  },
  modalSearchInput: { flex: 1, color: '#FFFFFF', fontSize: 14 },

  modalItemRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    paddingHorizontal: 12, borderRadius: 14, marginBottom: 8, backgroundColor: '#0F172A',
    borderWidth: 1, borderColor: '#334155',
  },
  modalItemRowActive: { borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.08)' },
  brandIconCircle: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#1E293B',
    alignItems: 'center', justifyContent: 'center',
  },
  modalItemTitle: { fontSize: 14.5, fontWeight: '700', color: '#FFFFFF' },
  modalItemTitleActive: { color: '#F59E0B' },
  modalItemSub: { fontSize: 11.5, color: '#94A3B8', marginTop: 2 },

  typeBadge: { backgroundColor: 'rgba(59,130,246,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  typeBadgeText: { color: '#60A5FA', fontSize: 9.5, fontWeight: '700' },

  // Color Grid
  colorPaletteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorOption: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A',
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#334155',
    gap: 8, minWidth: '45%', flex: 1,
  },
  colorOptionActive: { borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.1)' },
  colorCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5 },
  colorName: { color: '#CBD5E1', fontSize: 12.5, fontWeight: '600' },
  colorNameActive: { color: '#F59E0B', fontWeight: '700' },

  customColorRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  customColorInput: {
    flex: 1, height: 44, backgroundColor: '#0F172A', borderRadius: 12,
    borderWidth: 1, borderColor: '#334155', paddingHorizontal: 12, color: '#FFFFFF',
  },
  customColorBtn: {
    backgroundColor: '#F59E0B', paddingHorizontal: 16, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  customColorBtnText: { color: '#0F172A', fontSize: 13, fontWeight: '800' },

  yearItemRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  yearItemRowActive: { backgroundColor: 'rgba(245,158,11,0.08)' },
  yearText: { color: '#CBD5E1', fontSize: 15, fontWeight: '600' },
  yearTextActive: { color: '#F59E0B', fontWeight: '800' },
})
