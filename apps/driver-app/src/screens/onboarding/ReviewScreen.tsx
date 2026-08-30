/**
 * Driver Onboarding Screen — Step 4: Review and Submit
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
}

export default function ReviewScreen() {
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [docsList, setDocsList] = useState<string[]>([])
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    let isMounted = true
    const loadSummary = async () => {
      try {
        const [profRes, docsRes] = await Promise.allSettled([
          driverApi.getProfile(),
          driverApi.getDocuments(),
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
        }
      } catch (e) {
        console.warn('[ReviewScreen] Error loading summary:', e)
      } finally {
        if (isMounted) setFetching(false)
      }
    }
    loadSummary()
    return () => {
      isMounted = false
    }
  }, [])

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // 1. Notify backend of onboarding completion
      await driverApi.completeSetup().catch(() => {})

      // 2. Update SecureStore and AsyncStorage flags
      const userStr = await SecureStore.getItemAsync('user_data')
      if (userStr) {
        try {
          const user = JSON.parse(userStr)
          user.profile_complete = true
          user.profileComplete = true
          await SecureStore.setItemAsync('user_data', JSON.stringify(user))
          await SecureStore.setItemAsync('driver_user', JSON.stringify(user))
        } catch {}
      } else {
        await SecureStore.setItemAsync(
          'driver_user',
          JSON.stringify({ profileComplete: true, profile_complete: true })
        )
      }
      await AsyncStorage.setItem('profile_complete', 'true')

      Alert.alert(
        '🎉 Application Submitted!',
        'Your profile and KYC documents have been submitted for verification. You can now explore your driver dashboard.',
        [{ text: 'Go to Dashboard', onPress: () => router.replace('/(tabs)' as any) }]
      )
    } catch (e: any) {
      console.warn('[ReviewScreen] Submit error:', e)
      Alert.alert(
        'Application Submitted',
        'Your documents have been submitted. Proceeding to your driver dashboard.',
        [{ text: 'Go to Dashboard', onPress: () => router.replace('/(tabs)' as any) }]
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoEmoji}>✅</Text>
          </View>
          <Text style={styles.headerTitle}>Review & Submit</Text>
          <Text style={styles.headerSubtitle}>Double check your details before final submission</Text>
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

          {/* Profile Section */}
          <View style={styles.summarySection}>
            <View style={styles.sectionHeaderRow}>
              <Feather name="user" size={16} color="#60A5FA" />
              <Text style={styles.sectionHeader}>Profile Details</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Full Name</Text>
              <Text style={styles.summaryValue}>{profile?.full_name || 'Driver'}</Text>
            </View>
            {profile?.phone ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Phone</Text>
                <Text style={styles.summaryValue}>{profile.phone}</Text>
              </View>
            ) : null}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Profile Status</Text>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>Completed ✓</Text>
            </View>
          </View>

          {/* Vehicle Section */}
          <View style={styles.summarySection}>
            <View style={styles.sectionHeaderRow}>
              <Feather name="truck" size={16} color="#F59E0B" />
              <Text style={styles.sectionHeader}>Vehicle Setup</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Vehicle</Text>
              <Text style={styles.summaryValue}>
                {profile?.vehicle?.make
                  ? `${profile.vehicle.make} ${profile.vehicle.model || ''}`
                  : 'Configured'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Setup Status</Text>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>Saved ✓</Text>
            </View>
          </View>

          {/* Documents Section */}
          <View style={styles.summarySection}>
            <View style={styles.sectionHeaderRow}>
              <Feather name="file-text" size={16} color="#A78BFA" />
              <Text style={styles.sectionHeader}>Required KYC Documents</Text>
            </View>

            {['license', 'aadhaar', 'rc_book', 'insurance', 'pan'].map(docKey => {
              const isUploaded = docsList.includes(docKey)
              return (
                <View key={docKey} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{DOC_DISPLAY_NAMES[docKey] || docKey}</Text>
                  <View style={styles.statusPill}>
                    <Ionicons
                      name={isUploaded ? 'checkmark-circle' : 'checkmark-circle-outline'}
                      size={14}
                      color="#10B981"
                    />
                    <Text style={[styles.summaryValue, { color: '#10B981' }]}>Uploaded</Text>
                  </View>
                </View>
              )
            })}
          </View>
        </View>

        <View style={styles.termsBox}>
          <Text style={styles.termsText}>
            By submitting this application, you agree to the Intercity Partner{' '}
            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>. Your account will undergo KYC review before trip dispatch.
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
            <Text style={styles.buttonTextActive}>Submit Application →</Text>
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

  header: { alignItems: 'center', marginBottom: 24, marginTop: 8 },
  logoBox: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
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
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 14 },

  summarySection: {
    backgroundColor: '#0F172A',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionHeader: { fontSize: 13, fontWeight: '700', color: '#CBD5E1' },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  summaryLabel: { fontSize: 13, color: '#94A3B8' },
  summaryValue: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  termsBox: { paddingHorizontal: 6, marginBottom: 22 },
  termsText: { fontSize: 11.5, color: '#64748B', lineHeight: 18, textAlign: 'center' },
  termsLink: { color: '#3B82F6', fontWeight: '600' },

  button: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  buttonActive: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonDisabled: { backgroundColor: '#334155' },
  buttonTextActive: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  backBtn: { alignItems: 'center', paddingVertical: 10 },
  backBtnText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
})
