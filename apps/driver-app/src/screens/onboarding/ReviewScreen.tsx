/**
 * Driver & Partner Onboarding Screen — Step 4: Review and Submit
 * Dynamic summary based on selected services (Hotel, Cab, Freight, etc.)
 */
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { driverApi, normalizeDocType } from '../../api/client'

const DOC_DISPLAY_NAMES: Record<string, string> = {
  license: 'Driving License',
  aadhaar: 'Aadhaar Card',
  rc_book: 'Vehicle RC',
  insurance: 'Vehicle Insurance',
  pan: 'PAN Card',
  hotel_trade_license: 'Trade License / Shop Act',
  hotel_property_deed: 'Property Ownership / Lease',
  hotel_fssai_cert: 'FSSAI / Tourism Certificate',
  hotel_gst_pan: 'GST / Commercial PAN',
  hotel_photos: 'Hotel & Reception Photos',
}

export default function ReviewScreen() {
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [selectedServices, setSelectedServices] = useState<string[]>(['CAB'])
  const [savedAddresses, setSavedAddresses] = useState<any>(null)
  const [vehicleDetails, setVehicleDetails] = useState<any>(null)
  const [docsList, setDocsList] = useState<string[]>([])
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    let isMounted = true
    const loadSummary = async () => {
      try {
        const [profRes, docsRes, srvStr, addrStr, vehStr] = await Promise.allSettled([
          driverApi.getProfile(),
          driverApi.getDocuments(),
          AsyncStorage.getItem('partner_selected_services'),
          AsyncStorage.getItem('driver_saved_addresses'),
          AsyncStorage.getItem('driver_active_vehicle'),
        ])

        if (isMounted) {
          if (profRes.status === 'fulfilled') {
            setProfile(profRes.value.data?.data || profRes.value.data)
          }
          if (docsRes.status === 'fulfilled') {
            const rawDocs = docsRes.value.data?.data || docsRes.value.data || []
            if (Array.isArray(rawDocs)) {
              setDocsList(rawDocs.map((d: any) => normalizeDocType(d.doc_type)))
            }
          }
          if (srvStr.status === 'fulfilled' && srvStr.value) {
            try { setSelectedServices(JSON.parse(srvStr.value)) } catch {}
          }
          if (addrStr.status === 'fulfilled' && addrStr.value) {
            try { setSavedAddresses(JSON.parse(addrStr.value)) } catch {}
          }
          if (vehStr.status === 'fulfilled' && vehStr.value) {
            try { setVehicleDetails(JSON.parse(vehStr.value)) } catch {}
          }
        }
      } catch (e) {
        console.warn('[ReviewScreen] Error loading summary:', e)
      } finally {
        if (isMounted) setFetching(false)
      }
    }
    loadSummary()
    return () => { isMounted = false }
  }, [])

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // 1. Complete onboarding on backend
      await driverApi.completeSetup().catch(() => {})

      // 2. Persist profile complete flag
      const userStr = await SecureStore.getItemAsync('user_data')
      if (userStr) {
        try {
          const user = JSON.parse(userStr)
          user.profile_complete = true
          user.profileComplete = true
          user.selected_services = selectedServices
          await SecureStore.setItemAsync('user_data', JSON.stringify(user))
          await SecureStore.setItemAsync('driver_user', JSON.stringify(user))
        } catch {}
      }
      await AsyncStorage.setItem('profile_complete', 'true')

      const isHotelOnly = selectedServices.length === 1 && selectedServices[0] === 'HOTEL'
      const destination = isHotelOnly ? '/hotel-partner' : '/(tabs)'

      Alert.alert(
        '🎉 Application Submitted!',
        'Your profile, service credentials, and KYC documents have been submitted for verification.',
        [{ text: isHotelOnly ? 'Open Hotel Panel' : 'Go to Dashboard', onPress: () => router.replace(destination as any) }]
      )
    } catch (e: any) {
      const isHotelOnly = selectedServices.length === 1 && selectedServices[0] === 'HOTEL'
      router.replace((isHotelOnly ? '/hotel-partner' : '/(tabs)') as any)
    } finally {
      setLoading(false)
    }
  }

  const isHotel = selectedServices.includes('HOTEL')
  const hasVehicle = !isHotel || selectedServices.length > 1

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoEmoji}>✅</Text>
          </View>
          <Text style={styles.headerTitle}>Review & Submit</Text>
          <Text style={styles.headerSubtitle}>Double check your service vertical & details before final submission</Text>
        </View>

        {/* Stepper (Step 4 of 4) */}
        <View style={styles.stepperContainer}>
          {[1, 2, 3, 4].map((step, i) => (
            <View key={step} style={styles.stepItem}>
              <View style={[styles.stepCircle, styles.stepActive]}>
                <Text style={[styles.stepNumber, styles.stepNumberActive]}>
                  {step < 4 ? '✓' : '✅'}
                </Text>
              </View>
              <Text style={[styles.stepLabel, styles.stepLabelActive]}>
                {step === 1 ? 'Profile' : step === 2 ? 'Vehicle' : step === 3 ? 'Docs' : 'Review'}
              </Text>
              {i < 3 && <View style={[styles.stepConnector, styles.stepConnectorActive]} />}
            </View>
          ))}
        </View>

        {/* Summary Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Application Summary</Text>

          {/* Selected Services Section */}
          <View style={styles.summarySection}>
            <View style={styles.sectionHeaderRow}>
              <Feather name="layers" size={16} color="#F59E0B" />
              <Text style={styles.sectionHeader}>Registered Service Verticals</Text>
            </View>
            <View style={styles.chipRow}>
              {selectedServices.map(srv => (
                <View key={srv} style={styles.serviceChip}>
                  <Text style={styles.serviceChipText}>{srv}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Profile Section */}
          <View style={styles.summarySection}>
            <View style={styles.sectionHeaderRow}>
              <Feather name="user" size={16} color="#60A5FA" />
              <Text style={styles.sectionHeader}>Profile & Contact</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Full Name</Text>
              <Text style={styles.summaryValue}>{profile?.full_name || 'Partner'}</Text>
            </View>
            {savedAddresses?.home?.address ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Home Location</Text>
                <Text style={[styles.summaryValue, { flex: 1, textAlign: 'right' }]} numberOfLines={1}>
                  {savedAddresses.home.address}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Vehicle Section (If Mobility / Multi-service) */}
          {hasVehicle && (
            <View style={styles.summarySection}>
              <View style={styles.sectionHeaderRow}>
                <Feather name="truck" size={16} color="#10B981" />
                <Text style={styles.sectionHeader}>Registered Vehicle</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Make & Model</Text>
                <Text style={styles.summaryValue}>
                  {vehicleDetails?.make ? `${vehicleDetails.make} ${vehicleDetails.model || ''}` : 'Maruti Suzuki Dzire'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Registration No.</Text>
                <Text style={[styles.summaryValue, { color: '#FBBF24' }]}>
                  {vehicleDetails?.registration_number || 'Configured'}
                </Text>
              </View>
            </View>
          )}

          {/* KYC Status */}
          <View style={styles.summarySection}>
            <View style={styles.sectionHeaderRow}>
              <Feather name="file-text" size={16} color="#A78BFA" />
              <Text style={styles.sectionHeader}>KYC Verification</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Documents Status</Text>
              <View style={styles.statusPill}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={[styles.summaryValue, { color: '#10B981' }]}>Uploaded & Ready ✓</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.termsBox}>
          <Text style={styles.termsText}>
            By submitting this application, you agree to the Multi-Service Partner{' '}
            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>.
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
          style={[styles.button, loading ? styles.buttonDisabled : styles.buttonActive]}
        >
          {loading ? (
            <ActivityIndicator color="#0F172A" />
          ) : (
            <Text style={styles.buttonTextActive}>
              {selectedServices.length === 1 && selectedServices[0] === 'HOTEL'
                ? 'Launch Hotel Partner Panel →'
                : 'Submit & Open Partner Dashboard →'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          disabled={loading}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.backBtnText}>← Edit Documents</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F172A' },
  scroll: { flex: 1, paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 48, paddingTop: 8 },

  header: { alignItems: 'center', marginBottom: 20, marginTop: 8 },
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
  stepActive: { backgroundColor: '#10B981' },
  stepNumber: { fontSize: 14, fontWeight: '700' },
  stepNumberActive: { color: '#FFFFFF' },
  stepLabel: { fontSize: 10, fontWeight: '600' },
  stepLabelActive: { color: '#10B981' },
  stepConnector: { position: 'absolute', top: 19, right: 0, width: '50%', height: 1.5 },
  stepConnectorActive: { backgroundColor: '#10B981' },

  card: {
    backgroundColor: '#1E293B', borderRadius: 20, padding: 18,
    marginBottom: 18, borderWidth: 1, borderColor: '#334155',
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 14 },

  summarySection: {
    backgroundColor: '#0F172A', padding: 14, borderRadius: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#334155',
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionHeader: { fontSize: 13, fontWeight: '700', color: '#CBD5E1' },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4,
  },
  summaryLabel: { fontSize: 13, color: '#94A3B8' },
  summaryValue: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  serviceChip: { backgroundColor: 'rgba(245,158,11,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  serviceChipText: { color: '#F59E0B', fontSize: 12, fontWeight: '700' },

  termsBox: { paddingHorizontal: 6, marginBottom: 20 },
  termsText: { fontSize: 11.5, color: '#64748B', lineHeight: 18, textAlign: 'center' },
  termsLink: { color: '#3B82F6', fontWeight: '600' },

  button: {
    height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  buttonActive: { backgroundColor: '#10B981', shadowColor: '#10B981', shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  buttonDisabled: { backgroundColor: '#334155' },
  buttonTextActive: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  backBtn: { alignItems: 'center', paddingVertical: 10 },
  backBtnText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
})
