import React, { useState, useEffect } from 'react'
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
  StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api } from '../../api/client'
import { useTheme } from '../../theme'
import LocationPickerModal, { SelectedLocationData } from '../../components/map/LocationPickerModal'

const ONBOARDING_STEPS = [
  { id: 1, title: 'Profile', icon: 'user' },
  { id: 2, title: 'Vehicle', icon: 'truck' },
  { id: 3, title: 'Documents', icon: 'file-text' },
  { id: 4, title: 'Review', icon: 'check-circle' },
]

export interface ServiceVerticalOption {
  id: string
  title: string
  subtitle: string
  icon: string
  category: 'mobility' | 'hospitality' | 'logistics'
}

export const AVAILABLE_SERVICES: ServiceVerticalOption[] = [
  { id: 'CAB', title: 'Cab & City Taxi', subtitle: 'Point-to-point city & intercity rides', icon: '🚖', category: 'mobility' },
  { id: 'HOTEL', title: 'Hotel & Stays', subtitle: 'Manage rooms, live inventory & stays', icon: '🏨', category: 'hospitality' },
  { id: 'PARCEL', title: 'Parcel Delivery', subtitle: 'Express package & document delivery', icon: '📦', category: 'logistics' },
  { id: 'TRANSPORT', title: 'Commercial Freight', subtitle: 'Mini trucks & heavy cargo transport', icon: '🚚', category: 'logistics' },
  { id: 'PACKERS_MOVERS', title: 'Packers & Movers', subtitle: 'Home & office shifting services', icon: '🏠', category: 'logistics' },
  { id: 'AIRPORT', title: 'Airport Transfers', subtitle: 'Dedicated airport drop & meet/greet', icon: '✈️', category: 'mobility' },
  { id: 'CORPORATE', title: 'Corporate Commute', subtitle: 'Company employee daily rides', icon: '🏢', category: 'mobility' },
  { id: 'CARPOOL', title: 'Carpool & Shared', subtitle: 'Highway corridor seat sharing', icon: '🚗', category: 'mobility' },
]

export interface SavedAddressItem {
  id: string
  type: 'home' | 'office' | 'other'
  label: string
  address: string
  latitude: number
  longitude: number
  city?: string
}

export default function DriverOnboardingScreen() {
  const { theme, isDark } = useTheme()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [experienceYears, setExperienceYears] = useState('3')
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male')

  // Multi-Service Selection (Multiple Allowed!)
  const [selectedServices, setSelectedServices] = useState<string[]>(['CAB'])

  // Map-Based Saved Addresses (Home, Office, Other)
  const [homeLocation, setHomeLocation] = useState<SavedAddressItem | null>(null)
  const [officeLocation, setOfficeLocation] = useState<SavedAddressItem | null>(null)
  const [otherLocation, setOtherLocation] = useState<SavedAddressItem | null>(null)

  // Location Picker Modal Control
  const [activePickerTarget, setActivePickerTarget] = useState<'home' | 'office' | 'other' | null>(null)

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    import('expo-secure-store').then(SecureStore => {
      SecureStore.getItemAsync('access_token').then(token => {
        if (!token || token === 'demo_token') {
          Alert.alert(
            'Authentication Required',
            'Please verify your phone number first to register as a partner.',
            [{ text: 'Sign In / Register', onPress: () => router.replace('/auth/phone' as any) }]
          )
        }
      })
    })

    // Load pre-existing profile and saved addresses
    api.get('/profile').then(res => {
      const p = res.data?.data || res.data
      if (p) {
        if (p.full_name) setFullName(p.full_name)
        if (p.email) setEmail(p.email)
        if (p.experience_years !== undefined) setExperienceYears(String(p.experience_years))
        if (p.gender) setGender(p.gender)
      }
    }).catch(() => {})

    AsyncStorage.getItem('driver_saved_addresses').then(str => {
      if (str) {
        try {
          const parsed = JSON.parse(str)
          if (parsed.home) setHomeLocation(parsed.home)
          if (parsed.office) setOfficeLocation(parsed.office)
          if (parsed.other) setOtherLocation(parsed.other)
        } catch {}
      }
    })
  }, [])

  // Toggle service selection (Multi-Select)
  const toggleService = (srvId: string) => {
    setSelectedServices(prev => {
      if (prev.includes(srvId)) {
        if (prev.length === 1) {
          Alert.alert('Selection Required', 'Please select at least one service vertical.')
          return prev
        }
        return prev.filter(s => s !== srvId)
      } else {
        return [...prev, srvId]
      }
    })
    setErrors(e => ({ ...e, services: '' }))
  }

  // Handle Location Confirmation from Map Picker
  const handleLocationConfirmed = async (loc: SelectedLocationData) => {
    if (!activePickerTarget) return
    const addressItem: SavedAddressItem = {
      id: `${activePickerTarget}_${Date.now()}`,
      type: activePickerTarget,
      label: activePickerTarget === 'home' ? 'Home' : activePickerTarget === 'office' ? 'Office / Hub' : 'Saved Place',
      address: loc.address,
      latitude: loc.latitude,
      longitude: loc.longitude,
      city: loc.city,
    }

    if (activePickerTarget === 'home') setHomeLocation(addressItem)
    if (activePickerTarget === 'office') setOfficeLocation(addressItem)
    if (activePickerTarget === 'other') setOtherLocation(addressItem)

    // Save locally
    const currentMap = {
      home: activePickerTarget === 'home' ? addressItem : homeLocation,
      office: activePickerTarget === 'office' ? addressItem : officeLocation,
      other: activePickerTarget === 'other' ? addressItem : otherLocation,
    }
    await AsyncStorage.setItem('driver_saved_addresses', JSON.stringify(currentMap))
    setActivePickerTarget(null)
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!fullName.trim() || fullName.trim().length < 2) {
      e.fullName = 'Please enter your full name (min 2 characters)'
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      e.email = 'Please enter a valid email address'
    }
    if (selectedServices.length === 0) {
      e.services = 'Please select at least one service vertical you provide'
    }
    if (!homeLocation) {
      e.homeLocation = 'Please select your Home location on the map'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleNext = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const savedAddressesObj = {
        home: homeLocation,
        office: officeLocation,
        other: otherLocation,
      }

      // 1. Save locally
      await AsyncStorage.setItem('partner_selected_services', JSON.stringify(selectedServices))
      await AsyncStorage.setItem('driver_saved_addresses', JSON.stringify(savedAddressesObj))

      // 2. Post to backend
      await api.post('/driver/setup', {
        full_name: fullName.trim(),
        email: email.trim() || undefined,
        experience_years: parseInt(experienceYears, 10) || 0,
        gender,
        home_city: homeLocation?.city || 'Pune',
        home_address: homeLocation?.address,
        home_lat: homeLocation?.latitude,
        home_lng: homeLocation?.longitude,
        selected_services: selectedServices,
        approved_services: selectedServices,
      }).catch(() => {})

      // 3. Routing: If partner chose ONLY Hotel, skip vehicle screen directly to Documents
      const isHotelOnly = selectedServices.length === 1 && selectedServices[0] === 'HOTEL'
      if (isHotelOnly) {
        router.push('/onboarding/documents')
      } else {
        router.push('/onboarding/vehicle')
      }
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Something went wrong. Please try again.'
      Alert.alert('Setup Failed', msg)
    } finally {
      setLoading(false)
    }
  }

  const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#0F172A' },
    flex: { flex: 1 },
    scroll: { flex: 1, paddingHorizontal: 20 },
    scrollContent: { paddingBottom: 48, paddingTop: 12 },

    // Header
    header: { alignItems: 'center', marginBottom: 20, marginTop: 4 },
    logoBox: {
      width: 64, height: 64, borderRadius: 20, backgroundColor: '#F59E0B',
      alignItems: 'center', justifyContent: 'center', marginBottom: 12,
      shadowColor: '#F59E0B', shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
    },
    headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
    headerSubtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 4 },

    // Stepper
    stepperContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20, paddingHorizontal: 4 },
    stepItem: { alignItems: 'center', flex: 1, position: 'relative' },
    stepCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    stepActive: { backgroundColor: '#F59E0B' },
    stepInactive: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
    stepLabel: { fontSize: 11, fontWeight: '600' },
    stepLabelActive: { color: '#F59E0B' },
    stepLabelInactive: { color: '#64748B' },
    stepConnector: { position: 'absolute', top: 19, right: 0, width: '50%', height: 1.5 },
    stepConnectorActive: { backgroundColor: '#F59E0B' },
    stepConnectorInactive: { backgroundColor: '#334155' },

    // Card
    card: {
      backgroundColor: '#1E293B', borderRadius: 20, padding: 18,
      marginBottom: 16, borderWidth: 1, borderColor: '#334155',
    },
    cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    cardTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
    cardBadge: { backgroundColor: 'rgba(245,158,11,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    cardBadgeText: { color: '#F59E0B', fontSize: 11, fontWeight: '700' },

    // Fields
    fieldGroup: { marginBottom: 14 },
    label: { fontSize: 13, fontWeight: '600', color: '#CBD5E1', marginBottom: 6 },
    required: { color: '#EF4444' },
    optional: { color: '#64748B', fontWeight: '400' },
    input: {
      height: 50, paddingHorizontal: 16, borderRadius: 14,
      borderWidth: 1.5, fontSize: 15, color: '#FFFFFF',
      backgroundColor: '#0F172A', borderColor: '#334155',
    },
    inputError: { borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.08)' },
    errorText: { color: '#F87171', fontSize: 12, marginTop: 4 },
    hint: { color: '#94A3B8', fontSize: 11.5, marginTop: 4 },

    // Gender selector
    genderRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
    genderBtn: {
      flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5,
      borderColor: '#334155', backgroundColor: '#0F172A',
      alignItems: 'center', justifyContent: 'center',
    },
    genderBtnActive: { borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.15)' },
    genderText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
    genderTextActive: { color: '#F59E0B', fontWeight: '700' },

    // Multi-Service Vertical Grid
    serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
    serviceCard: {
      width: '48%', backgroundColor: '#0F172A', borderRadius: 14,
      padding: 12, borderWidth: 1.5, borderColor: '#334155',
    },
    serviceCardActive: { borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.08)' },
    serviceIconBox: {
      width: 38, height: 38, borderRadius: 10, backgroundColor: '#1E293B',
      alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    },
    serviceTitle: { fontSize: 13, fontWeight: '700', color: '#CBD5E1', marginBottom: 2 },
    serviceTitleActive: { color: '#F59E0B' },
    serviceSubtitle: { fontSize: 10.5, color: '#64748B', lineHeight: 14 },
    serviceCheckCircle: {
      position: 'absolute', top: 10, right: 10, width: 20, height: 20,
      borderRadius: 10, backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center',
    },

    // Map Location Box
    locationBox: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A',
      borderRadius: 14, borderWidth: 1.5, borderColor: '#334155', padding: 12,
      marginBottom: 10,
    },
    locationIconBox: {
      width: 40, height: 40, borderRadius: 12, backgroundColor: '#1E293B',
      alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    locationLabel: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
    locationAddressText: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
    locationPlaceholder: { fontSize: 12, color: '#64748B', fontStyle: 'italic' },
    pickMapBtn: {
      backgroundColor: '#2563EB', paddingHorizontal: 10, paddingVertical: 6,
      borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4,
    },
    pickMapBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

    // Button
    button: {
      height: 54, borderRadius: 16, alignItems: 'center',
      justifyContent: 'center', marginBottom: 12, marginTop: 8,
    },
    buttonActive: { backgroundColor: '#F59E0B', shadowColor: '#F59E0B', shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
    buttonDisabled: { backgroundColor: '#334155' },
    buttonText: { fontSize: 15, fontWeight: '800' },
    buttonTextActive: { color: '#0F172A' },
    buttonTextDisabled: { color: '#64748B' },
  })

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <Feather name="user-check" size={30} color="#0F172A" />
            </View>
            <Text style={styles.headerTitle}>Partner Onboarding</Text>
            <Text style={styles.headerSubtitle}>
              Select your service verticals, profile & base map locations
            </Text>
          </View>

          {/* Stepper Progress */}
          <View style={styles.stepperContainer}>
            {ONBOARDING_STEPS.map((step, i) => (
              <View key={step.id} style={styles.stepItem}>
                <View style={[styles.stepCircle, step.id === 1 ? styles.stepActive : styles.stepInactive]}>
                  <Feather
                    name={step.icon as any}
                    size={16}
                    color={step.id === 1 ? '#0F172A' : '#64748B'}
                  />
                </View>
                <Text style={[styles.stepLabel, step.id === 1 ? styles.stepLabelActive : styles.stepLabelInactive]}>
                  {step.title}
                </Text>
                {i < ONBOARDING_STEPS.length - 1 && (
                  <View style={[styles.stepConnector, step.id < 1 ? styles.stepConnectorActive : styles.stepConnectorInactive]} />
                )}
              </View>
            ))}
          </View>

          {/* 1. Multi-Service Selection Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Which services do you provide?</Text>
              <View style={styles.cardBadge}>
                <Text style={styles.cardBadgeText}>Multi-Select ({selectedServices.length})</Text>
              </View>
            </View>
            <Text style={styles.hint}>
              Select all verticals you provide. Your KYC documents and dashboard will be tailored to these services.
            </Text>

            <View style={styles.serviceGrid}>
              {AVAILABLE_SERVICES.map(srv => {
                const isSelected = selectedServices.includes(srv.id)
                return (
                  <TouchableOpacity
                    key={srv.id}
                    style={[styles.serviceCard, isSelected && styles.serviceCardActive]}
                    onPress={() => toggleService(srv.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.serviceIconBox}>
                      <Text style={{ fontSize: 20 }}>{srv.icon}</Text>
                    </View>
                    <Text style={[styles.serviceTitle, isSelected && styles.serviceTitleActive]}>{srv.title}</Text>
                    <Text style={styles.serviceSubtitle}>{srv.subtitle}</Text>
                    {isSelected && (
                      <View style={styles.serviceCheckCircle}>
                        <Feather name="check" size={12} color="#0F172A" />
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
            {errors.services && <Text style={styles.errorText}>⚠ {errors.services}</Text>}
          </View>

          {/* 2. Map-Based Saved Addresses Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Map Saved Locations</Text>
              <View style={[styles.cardBadge, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
                <Text style={[styles.cardBadgeText, { color: '#60A5FA' }]}>📍 Pin on Map</Text>
              </View>
            </View>
            <Text style={styles.hint}>
              Pick exact locations from map. These saved addresses will be used for 1-tap pickup & drop trip creation.
            </Text>

            {/* Home Address Picker */}
            <View style={[styles.locationBox, errors.homeLocation && styles.inputError]}>
              <View style={styles.locationIconBox}>
                <Text style={{ fontSize: 18 }}>🏠</Text>
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.locationLabel}>Home Location *</Text>
                {homeLocation ? (
                  <Text style={styles.locationAddressText} numberOfLines={2}>
                    {homeLocation.address}
                  </Text>
                ) : (
                  <Text style={styles.locationPlaceholder}>Tap to set home location on map</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.pickMapBtn}
                onPress={() => setActivePickerTarget('home')}
                activeOpacity={0.8}
              >
                <Feather name="map-pin" size={12} color="#FFFFFF" />
                <Text style={styles.pickMapBtnText}>{homeLocation ? 'Change' : 'Pick Map'}</Text>
              </TouchableOpacity>
            </View>
            {errors.homeLocation && <Text style={styles.errorText}>⚠ {errors.homeLocation}</Text>}

            {/* Office / Hub Address Picker */}
            <View style={[styles.locationBox, { marginTop: 6 }]}>
              <View style={styles.locationIconBox}>
                <Text style={{ fontSize: 18 }}>🏢</Text>
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.locationLabel}>Office / Operating Hub <Text style={styles.optional}>(Optional)</Text></Text>
                {officeLocation ? (
                  <Text style={styles.locationAddressText} numberOfLines={2}>
                    {officeLocation.address}
                  </Text>
                ) : (
                  <Text style={styles.locationPlaceholder}>Tap to set office/hub on map</Text>
                )}
              </View>
              <TouchableOpacity
                style={[styles.pickMapBtn, { backgroundColor: '#475569' }]}
                onPress={() => setActivePickerTarget('office')}
                activeOpacity={0.8}
              >
                <Feather name="map-pin" size={12} color="#FFFFFF" />
                <Text style={styles.pickMapBtnText}>{officeLocation ? 'Change' : 'Pick Map'}</Text>
              </TouchableOpacity>
            </View>

            {/* Other / Favorite Address Picker */}
            <View style={[styles.locationBox, { marginTop: 6 }]}>
              <View style={styles.locationIconBox}>
                <Text style={{ fontSize: 18 }}>📍</Text>
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.locationLabel}>Favorite Base Point <Text style={styles.optional}>(Optional)</Text></Text>
                {otherLocation ? (
                  <Text style={styles.locationAddressText} numberOfLines={2}>
                    {otherLocation.address}
                  </Text>
                ) : (
                  <Text style={styles.locationPlaceholder}>Tap to set custom point on map</Text>
                )}
              </View>
              <TouchableOpacity
                style={[styles.pickMapBtn, { backgroundColor: '#475569' }]}
                onPress={() => setActivePickerTarget('other')}
                activeOpacity={0.8}
              >
                <Feather name="map-pin" size={12} color="#FFFFFF" />
                <Text style={styles.pickMapBtnText}>{otherLocation ? 'Change' : 'Pick Map'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 3. Personal & Professional Details Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Personal Information</Text>

            {/* Full Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, errors.fullName ? styles.inputError : null]}
                placeholder="e.g. Rahul Sharma / Hotel Green View"
                placeholderTextColor="#64748B"
                value={fullName}
                onChangeText={(t) => { setFullName(t); setErrors((e) => ({ ...e, fullName: '' })) }}
                autoCapitalize="words"
              />
              {errors.fullName ? <Text style={styles.errorText}>⚠ {errors.fullName}</Text> : null}
            </View>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Address <Text style={styles.optional}>(Optional)</Text></Text>
              <TextInput
                style={[styles.input, errors.email ? styles.inputError : null]}
                placeholder="e.g. rahul.sharma@example.com"
                placeholderTextColor="#64748B"
                value={email}
                onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: '' })) }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email ? <Text style={styles.errorText}>⚠ {errors.email}</Text> : null}
            </View>

            {/* Experience */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Operating Experience (Years) <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 5"
                placeholderTextColor="#64748B"
                value={experienceYears}
                onChangeText={(t) => setExperienceYears(t.replace(/\D/g, ''))}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>

            {/* Gender */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderRow}>
                {(['male', 'female', 'other'] as const).map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                    onPress={() => setGender(g)}
                  >
                    <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            onPress={handleNext}
            disabled={loading || fullName.trim().length < 2}
            activeOpacity={0.85}
            style={[
              styles.button,
              loading || fullName.trim().length < 2 ? styles.buttonDisabled : styles.buttonActive,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#0F172A" />
            ) : (
              <Text style={[styles.buttonText, fullName.trim().length < 2 ? styles.buttonTextDisabled : styles.buttonTextActive]}>
                {selectedServices.length === 1 && selectedServices[0] === 'HOTEL'
                  ? 'Continue to Hotel Documents →'
                  : 'Continue to Vehicle Setup →'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Interactive Map Location Picker Modal */}
      {activePickerTarget && (
        <LocationPickerModal
          visible={!!activePickerTarget}
          title={`Select ${activePickerTarget === 'home' ? 'Home' : activePickerTarget === 'office' ? 'Office / Hub' : 'Custom'} Location`}
          initialLocation={
            activePickerTarget === 'home' && homeLocation
              ? { latitude: homeLocation.latitude, longitude: homeLocation.longitude, address: homeLocation.address }
              : activePickerTarget === 'office' && officeLocation
              ? { latitude: officeLocation.latitude, longitude: officeLocation.longitude, address: officeLocation.address }
              : { latitude: 18.5204, longitude: 73.8567 }
          }
          onClose={() => setActivePickerTarget(null)}
          onConfirm={handleLocationConfirmed}
        />
      )}
    </SafeAreaView>
  )
}
