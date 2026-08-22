/**
 * Add Vehicle Screen — 6-Step Dynamic Onboarding Wizard
 * Step 1: Vehicle Type
 * Step 2: Basic Info (Make, Model, Variant, Color, Fuel, AC)
 * Step 3: Registration & Ownership (Reg No, Owner, Classification)
 * Step 4: Documents (RC, Insurance, Permit, PUC, Photos)
 * Step 5: Inspection Hub Booking (if applicable)
 * Step 6: Review & Submit
 */
import React, { useState } from 'react'
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
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { useTheme } from '../../src/theme'
import {
  VehicleType,
  OwnershipType,
  VEHICLE_REQUIREMENT_CONFIG,
  VehicleService,
} from '../../src/services/vehicleService'
import { VehicleTypeSelector } from '../../src/components/vehicle/VehicleTypeSelector'
import { VehicleStepper } from '../../src/components/vehicle/VehicleStepper'

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

const OWNERSHIP_OPTIONS: { value: OwnershipType; label: string }[] = [
  { value: 'self', label: 'Self-Owned' },
  { value: 'leased', label: 'Leased Vehicle' },
  { value: 'company', label: 'Company / Commercial Partner' },
  { value: 'fleet_partner', label: 'Fleet Partner' },
]

export default function AddVehicleScreen() {
  const { theme, isDark } = useTheme()
  const [step, setStep] = useState(1) // 1 to 6
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [vehicleType, setVehicleType] = useState<VehicleType>('sedan')
  const [make, setMake] = useState('Maruti Suzuki')
  const [model, setModel] = useState('Dzire')
  const [variant, setVariant] = useState('VXI')
  const [year, setYear] = useState('2023')
  const [color, setColor] = useState('Pearl White')
  const [fuelType, setFuelType] = useState<'petrol' | 'diesel' | 'cng' | 'electric' | 'hybrid'>('petrol')
  const [hasAc, setHasAc] = useState(true)
  const [parcelCapable, setParcelCapable] = useState(true)
  const [parcelKg, setParcelKg] = useState('50')

  // Registration
  const [regNumber, setRegNumber] = useState('')
  const [ownerName, setOwnerName] = useState('Rahul Ramesh Sharma')
  const [ownershipType, setOwnershipType] = useState<OwnershipType>('self')
  const [regDate, setRegDate] = useState('2023-05-10')

  // Uploaded docs mock cache
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string>>({})
  const [uploadingType, setUploadingType] = useState<string | null>(null)

  // Inspection
  const [selectedHub, setSelectedHub] = useState('Hadapsar Inspection Hub, Pune')
  const [selectedSlot, setSelectedSlot] = useState('Feb 25, 2026 • 11:30 AM')

  // Review
  const [declarationAgreed, setDeclarationAgreed] = useState(true)

  const reqConfig = VEHICLE_REQUIREMENT_CONFIG[vehicleType]

  // Image Picker for documents
  const pickDocImage = async (docType: string) => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      })
      if (!res.canceled && res.assets[0]?.uri) {
        setUploadedDocs(prev => ({ ...prev, [docType]: res.assets[0].uri }))
      }
    } catch (e) {
      console.warn('Image picker error:', e)
    }
  }

  const handleNext = () => {
    if (step === 1) {
      setStep(2)
    } else if (step === 2) {
      if (!make.trim() || !model.trim()) {
        Alert.alert('Required Fields', 'Please enter vehicle Make and Model.')
        return
      }
      setStep(3)
    } else if (step === 3) {
      const cleanReg = regNumber.replace(/\s+/g, '').toUpperCase()
      if (cleanReg.length < 5) {
        Alert.alert('Invalid Registration', 'Please enter a valid registration number (e.g. MH 12 AB 1234).')
        return
      }
      if (!ownerName.trim()) {
        Alert.alert('Required Field', 'Please enter the registered owner name as per RC.')
        return
      }
      setStep(4)
    } else if (step === 4) {
      setStep(5)
    } else if (step === 5) {
      setStep(6)
    }
  }

  const handleFinalSubmit = async () => {
    if (!declarationAgreed) {
      Alert.alert('Declaration Required', 'Please confirm the vehicle ownership declaration to proceed.')
      return
    }

    try {
      setSubmitting(true)
      const created = await VehicleService.createVehicle({
        vehicle_type: vehicleType,
        make: make.trim(),
        model: model.trim(),
        variant: variant.trim() || undefined,
        year: parseInt(year, 10) || 2023,
        color,
        registration_number: regNumber.toUpperCase().trim(),
        seat_capacity: reqConfig.seats,
        fuel_type: fuelType,
        ownership_type: ownershipType,
        registered_owner_name: ownerName.trim(),
        registration_date: regDate,
        has_ac: hasAc,
        parcel_capable: parcelCapable,
        parcel_capacity_kg: parcelCapable ? parseFloat(parcelKg) || 50 : undefined,
      })

      // Upload mock docs if captured
      for (const [dt, uri] of Object.entries(uploadedDocs)) {
        await VehicleService.uploadVehicleDocument(created.id, dt, {
          file_url: uri,
          document_number: dt === 'rc_book' ? regNumber.toUpperCase() : undefined,
          expires_at: '2027-02-28',
        })
      }

      // Schedule inspection if applicable
      if (reqConfig.requires_inspection) {
        await VehicleService.scheduleInspection(created.id, {
          scheduled_at: new Date(Date.now() + 86400000 * 3).toISOString(),
          hub_location: selectedHub,
          hub_address: 'Survey No. 42, Magarpatta Road, Hadapsar, Pune - 411028',
        })
      }

      Alert.alert(
        'Vehicle Submitted!',
        `${make} ${model} (${regNumber.toUpperCase()}) has been registered and submitted for verification.`,
        [
          {
            text: 'View My Vehicles',
            onPress: () => router.replace('/vehicle'),
          },
        ]
      )
    } catch (err: any) {
      Alert.alert('Registration Error', err.message || 'Failed to submit vehicle.')
    } finally {
      setSubmitting(false)
    }
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
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => {
              if (step > 1) setStep(step - 1)
              else router.back()
            }}
          >
            <Feather name="arrow-left" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Add New Vehicle</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Stepper Progress */}
        <VehicleStepper currentStep={step} totalSteps={6} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* STEP 1: VEHICLE TYPE */}
          {step === 1 && (
            <View>
              <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
                Select Vehicle Category
              </Text>
              <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
                Choose the category that matches your vehicle's commercial registration.
              </Text>
              <VehicleTypeSelector selectedType={vehicleType} onSelect={setVehicleType} />
            </View>
          )}

          {/* STEP 2: BASIC DETAILS */}
          {step === 2 && (
            <View>
              <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
                Vehicle Specifications
              </Text>
              <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
                Enter your vehicle make, model, color, and fuel details.
              </Text>

              {/* Make & Model */}
              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Vehicle Make *</Text>
                <TextInput
                  style={[
                    styles.inputField,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                      borderColor: isDark ? '#334155' : '#CBD5E1',
                      color: theme.colors.text,
                    },
                  ]}
                  placeholder="e.g. Maruti Suzuki, Toyota, Honda"
                  placeholderTextColor="#94A3B8"
                  value={make}
                  onChangeText={setMake}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Vehicle Model *</Text>
                <TextInput
                  style={[
                    styles.inputField,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                      borderColor: isDark ? '#334155' : '#CBD5E1',
                      color: theme.colors.text,
                    },
                  ]}
                  placeholder="e.g. Dzire, Innova, Swift, City"
                  placeholderTextColor="#94A3B8"
                  value={model}
                  onChangeText={setModel}
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Variant (Optional)</Text>
                  <TextInput
                    style={[
                      styles.inputField,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                        borderColor: isDark ? '#334155' : '#CBD5E1',
                        color: theme.colors.text,
                      },
                    ]}
                    placeholder="e.g. VXI, ZDI"
                    placeholderTextColor="#94A3B8"
                    value={variant}
                    onChangeText={setVariant}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Mfg Year *</Text>
                  <TextInput
                    style={[
                      styles.inputField,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                        borderColor: isDark ? '#334155' : '#CBD5E1',
                        color: theme.colors.text,
                      },
                    ]}
                    placeholder="2023"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    maxLength={4}
                    value={year}
                    onChangeText={setYear}
                  />
                </View>
              </View>

              {/* Color Selector */}
              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Vehicle Color *</Text>
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
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Fuel Type *</Text>
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

              {/* Toggles */}
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
                    Working Air Conditioning (AC)
                  </Text>
                  <Text style={[styles.toggleSub, { color: theme.colors.textSecondary }]}>
                    Vehicle is equipped with operational climate control
                  </Text>
                </View>
                <Switch value={hasAc} onValueChange={setHasAc} trackColor={{ true: '#0EA5E9', false: '#CBD5E1' }} />
              </View>
            </View>
          )}

          {/* STEP 3: REGISTRATION & OWNERSHIP */}
          {step === 3 && (
            <View>
              <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
                Registration & Ownership
              </Text>
              <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
                Provide registration details exactly as printed on your RC Book.
              </Text>

              {/* Registration Number */}
              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                  Vehicle Registration Number *
                </Text>
                <TextInput
                  style={[
                    styles.inputField,
                    styles.regInput,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                      borderColor: isDark ? '#334155' : '#CBD5E1',
                      color: theme.colors.text,
                    },
                  ]}
                  placeholder="e.g. MH 12 AB 1234"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                  value={regNumber}
                  onChangeText={v => setRegNumber(v.toUpperCase())}
                />
              </View>

              {/* Registered Owner Name */}
              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                  Registered Owner Name *
                </Text>
                <TextInput
                  style={[
                    styles.inputField,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                      borderColor: isDark ? '#334155' : '#CBD5E1',
                      color: theme.colors.text,
                    },
                  ]}
                  placeholder="Full name as on RC"
                  placeholderTextColor="#94A3B8"
                  value={ownerName}
                  onChangeText={setOwnerName}
                />
              </View>

              {/* Ownership Category */}
              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                  Ownership Classification *
                </Text>
                <View style={styles.ownershipGrid}>
                  {OWNERSHIP_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.ownershipOption,
                        {
                          backgroundColor: ownershipType === opt.value
                            ? isDark
                              ? 'rgba(14, 165, 233, 0.15)'
                              : 'rgba(14, 165, 233, 0.08)'
                            : isDark
                            ? '#1E293B'
                            : '#F8FAFC',
                          borderColor: ownershipType === opt.value
                            ? '#0EA5E9'
                            : isDark
                            ? '#334155'
                            : '#E2E8F0',
                          borderWidth: ownershipType === opt.value ? 2 : 1,
                        },
                      ]}
                      onPress={() => setOwnershipType(opt.value)}
                    >
                      <Feather
                        name={ownershipType === opt.value ? 'check-circle' : 'circle'}
                        size={16}
                        color={ownershipType === opt.value ? '#0EA5E9' : '#94A3B8'}
                      />
                      <Text
                        style={[
                          styles.ownershipLabel,
                          {
                            color: ownershipType === opt.value ? '#0EA5E9' : theme.colors.text,
                            fontWeight: ownershipType === opt.value ? '700' : '500',
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* STEP 4: DOCUMENTS UPLOAD */}
          {step === 4 && (
            <View>
              <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
                Upload Vehicle Documents
              </Text>
              <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
                Please upload clear photos or PDF copies of required compliance certificates.
              </Text>

              {reqConfig.required_docs.map((doc, idx) => {
                const isUploaded = !!uploadedDocs[doc.type]

                return (
                  <View
                    key={doc.type}
                    style={[
                      styles.docUploadCard,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                        borderColor: isUploaded ? '#10B981' : isDark ? '#334155' : '#E2E8F0',
                      },
                    ]}
                  >
                    <View style={styles.docCardLeft}>
                      <View
                        style={[
                          styles.docIconCircle,
                          {
                            backgroundColor: isUploaded
                              ? 'rgba(16, 185, 129, 0.15)'
                              : isDark
                              ? '#0F172A'
                              : '#F1F5F9',
                          },
                        ]}
                      >
                        <Feather
                          name={isUploaded ? 'check' : 'file-text'}
                          size={18}
                          color={isUploaded ? '#10B981' : theme.colors.text}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.docName, { color: theme.colors.text }]}>
                          {doc.name}
                        </Text>
                        <Text style={[styles.docStatusSub, { color: isUploaded ? '#10B981' : '#94A3B8' }]}>
                          {isUploaded ? 'File Attached ✅' : doc.mandatory ? 'Mandatory Document' : 'Optional'}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.uploadBtn,
                        {
                          backgroundColor: isUploaded ? 'rgba(16, 185, 129, 0.12)' : '#0EA5E9',
                          borderColor: isUploaded ? '#10B981' : '#0EA5E9',
                        },
                      ]}
                      onPress={() => pickDocImage(doc.type)}
                    >
                      <Feather
                        name={isUploaded ? 'refresh-cw' : 'upload'}
                        size={13}
                        color={isUploaded ? '#10B981' : '#FFFFFF'}
                      />
                      <Text
                        style={[
                          styles.uploadBtnText,
                          { color: isUploaded ? '#10B981' : '#FFFFFF' },
                        ]}
                      >
                        {isUploaded ? 'Replace' : 'Upload'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )
              })}
            </View>
          )}

          {/* STEP 5: INSPECTION HUB */}
          {step === 5 && (
            <View>
              <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
                Vehicle Safety & Inspection
              </Text>
              <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
                {reqConfig.requires_inspection
                  ? 'This vehicle category requires physical hub verification before going online.'
                  : 'Fast-Track: Physical inspection waived for this private/commercial vehicle tier.'}
              </Text>

              {reqConfig.requires_inspection ? (
                <View
                  style={[
                    styles.inspectionBox,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                    },
                  ]}
                >
                  <View style={styles.inspBadgeRow}>
                    <Feather name="map-pin" size={16} color="#0EA5E9" />
                    <Text style={[styles.inspHubTitle, { color: theme.colors.text }]}>
                      Select Inspection Hub
                    </Text>
                  </View>

                  {['Hadapsar Inspection Hub, Pune', 'Wakad Inspection Hub, PCMC', 'Swargate Hub, Pune'].map(hub => (
                    <TouchableOpacity
                      key={hub}
                      style={[
                        styles.hubOption,
                        {
                          backgroundColor: selectedHub === hub
                            ? isDark
                              ? 'rgba(14, 165, 233, 0.15)'
                              : 'rgba(14, 165, 233, 0.08)'
                            : isDark
                            ? '#0F172A'
                            : '#FFFFFF',
                          borderColor: selectedHub === hub ? '#0EA5E9' : isDark ? '#334155' : '#E2E8F0',
                          borderWidth: selectedHub === hub ? 2 : 1,
                        },
                      ]}
                      onPress={() => setSelectedHub(hub)}
                    >
                      <Feather
                        name={selectedHub === hub ? 'check-circle' : 'circle'}
                        size={16}
                        color={selectedHub === hub ? '#0EA5E9' : '#94A3B8'}
                      />
                      <Text style={[styles.hubText, { color: theme.colors.text }]}>{hub}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View
                  style={[
                    styles.waivedBox,
                    {
                      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5',
                      borderColor: '#10B981',
                    },
                  ]}
                >
                  <Ionicons name="checkmark-done-circle" size={32} color="#10B981" />
                  <Text style={[styles.waivedTitle, { color: theme.colors.text }]}>
                    Self-Declaration Verification Eligible
                  </Text>
                  <Text style={[styles.waivedSub, { color: theme.colors.textSecondary }]}>
                    Your vehicle documents will be reviewed digitally by our compliance team. You do not need to visit a physical inspection center.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* STEP 6: REVIEW & SUBMIT */}
          {step === 6 && (
            <View>
              <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
                Review Vehicle Summary
              </Text>
              <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
                Please confirm the details below before submitting for compliance approval.
              </Text>

              <View
                style={[
                  styles.summaryCard,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                  },
                ]}
              >
                <View style={styles.summaryHeader}>
                  <Text style={[styles.summaryVehicleName, { color: theme.colors.text }]}>
                    {make} {model} {variant}
                  </Text>
                  <Text style={styles.summaryRegPlate}>{regNumber.toUpperCase()}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.summaryRow}>
                  <Text style={[styles.sLabel, { color: theme.colors.textSecondary }]}>Category</Text>
                  <Text style={[styles.sVal, { color: theme.colors.text }]}>{reqConfig.label}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.sLabel, { color: theme.colors.textSecondary }]}>Color & Fuel</Text>
                  <Text style={[styles.sVal, { color: theme.colors.text }]}>{color} • {fuelType.toUpperCase()}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.sLabel, { color: theme.colors.textSecondary }]}>Owner Name</Text>
                  <Text style={[styles.sVal, { color: theme.colors.text }]}>{ownerName}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.sLabel, { color: theme.colors.textSecondary }]}>Seat Capacity</Text>
                  <Text style={[styles.sVal, { color: theme.colors.text }]}>{reqConfig.seats} Passenger Seats</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.sLabel, { color: theme.colors.textSecondary }]}>Inspection</Text>
                  <Text style={[styles.sVal, { color: reqConfig.requires_inspection ? '#8B5CF6' : '#10B981' }]}>
                    {reqConfig.requires_inspection ? 'Hub Scheduled' : 'Digital Verification'}
                  </Text>
                </View>
              </View>

              {/* Declaration Checkbox */}
              <TouchableOpacity
                style={styles.declarationRow}
                activeOpacity={0.8}
                onPress={() => setDeclarationAgreed(!declarationAgreed)}
              >
                <Feather
                  name={declarationAgreed ? 'check-square' : 'square'}
                  size={20}
                  color={declarationAgreed ? '#0EA5E9' : '#94A3B8'}
                />
                <Text style={[styles.declarationText, { color: theme.colors.textSecondary }]}>
                  I solemnly declare that all information and documents submitted are valid, original, and belong to the registered vehicle.
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Navigation Button */}
          <View style={styles.bottomCtaContainer}>
            {step < 6 ? (
              <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                <LinearGradient
                  colors={['#0EA5E9', '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientCta}
                >
                  <Text style={styles.ctaText}>Continue to Step {step + 1} →</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.nextBtn}
                disabled={submitting}
                onPress={handleFinalSubmit}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientCta}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                      <Text style={styles.ctaText}>Submit Vehicle for Approval</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
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
    paddingTop: 8,
    paddingBottom: 40,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 18,
  },
  formGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  inputField: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  regInput: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  rowInputs: {
    flexDirection: 'row',
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
    marginTop: 6,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  toggleSub: {
    fontSize: 11,
    marginTop: 2,
  },
  ownershipGrid: {
    gap: 8,
  },
  ownershipOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
  },
  ownershipLabel: {
    fontSize: 14,
  },
  docUploadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  docCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  docIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docName: {
    fontSize: 13,
    fontWeight: '700',
  },
  docStatusSub: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  uploadBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  inspectionBox: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  inspBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  inspHubTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  hubOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 10,
  },
  hubText: {
    fontSize: 13,
    fontWeight: '600',
  },
  waivedBox: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  waivedTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  waivedSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  summaryCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryVehicleName: {
    fontSize: 17,
    fontWeight: '800',
  },
  summaryRegPlate: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0EA5E9',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  sLabel: {
    fontSize: 12,
  },
  sVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  declarationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 8,
  },
  declarationText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  bottomCtaContainer: {
    marginTop: 24,
    marginBottom: 20,
  },
  nextBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  gradientCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
