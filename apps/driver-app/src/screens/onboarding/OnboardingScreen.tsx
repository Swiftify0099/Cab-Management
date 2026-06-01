/**
 * Driver Onboarding Screen — Step 1: Profile Setup
 * Full StyleSheet version — NativeWind removed (caused Metro 99.9% hang).
 */
import React, { useState } from 'react'
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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { api } from '../../api/client'

const ONBOARDING_STEPS = [
  { id: 1, title: 'Profile', icon: '👤' },
  { id: 2, title: 'Vehicle', icon: '🚗' },
  { id: 3, title: 'Documents', icon: '📄' },
  { id: 4, title: 'Review', icon: '✅' },
]

export default function DriverOnboardingScreen() {
  const [fullName, setFullName] = useState('')
  const [homeCity, setHomeCity] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!fullName.trim() || fullName.trim().length < 2) {
      e.fullName = 'Please enter your full name (min 2 characters)'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleNext = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      await api.post('/driver/setup', {
        full_name: fullName.trim(),
        home_city: homeCity.trim() || undefined,
      })
      router.push('/onboarding/vehicle')
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Something went wrong. Please try again.'
      Alert.alert('Setup Failed', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <Text style={styles.logoEmoji}>🚗</Text>
            </View>
            <Text style={styles.headerTitle}>Driver Onboarding</Text>
            <Text style={styles.headerSubtitle}>
              Set up your account to start accepting rides
            </Text>
          </View>

          {/* Step Progress */}
          <View style={styles.stepperContainer}>
            {ONBOARDING_STEPS.map((step, i) => (
              <View key={step.id} style={styles.stepItem}>
                <View style={[styles.stepCircle, step.id === 1 ? styles.stepActive : styles.stepInactive]}>
                  <Text style={[styles.stepNumber, step.id === 1 ? styles.stepNumberActive : styles.stepNumberInactive]}>
                    {step.id === 1 ? step.icon : step.id}
                  </Text>
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

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Basic Information</Text>

            {/* Full Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, errors.fullName ? styles.inputError : styles.inputNormal]}
                placeholder="Enter your full name"
                placeholderTextColor="#64748B"
                value={fullName}
                onChangeText={(t) => { setFullName(t); setErrors((e) => ({ ...e, fullName: '' })) }}
                autoCapitalize="words"
                returnKeyType="next"
              />
              {errors.fullName ? (
                <Text style={styles.errorText}>⚠ {errors.fullName}</Text>
              ) : null}
            </View>

            {/* Home City */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Home City <Text style={styles.optional}>(Optional)</Text></Text>
              <TextInput
                style={[styles.input, styles.inputNormal]}
                placeholder="e.g. Pune, Mumbai, Delhi"
                placeholderTextColor="#64748B"
                value={homeCity}
                onChangeText={setHomeCity}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleNext}
              />
              <Text style={styles.hint}>Helps match you with nearby routes</Text>
            </View>
          </View>

          {/* Documents required info */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>📋 Documents You'll Need</Text>
            {['Driving License', 'Aadhaar Card', 'Vehicle RC', 'Vehicle Insurance', 'PAN Card'].map((doc) => (
              <View key={doc} style={styles.docRow}>
                <View style={styles.docDot} />
                <Text style={styles.docText}>{doc}</Text>
              </View>
            ))}
            <Text style={styles.infoHint}>You'll upload these in the next steps. Keep them ready.</Text>
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
                Continue to Vehicle Setup →
              </Text>
            )}
          </TouchableOpacity>

          {__DEV__ && (
            <Text style={styles.devHint}>🔧 Dev mode — Auth token from SecureStore</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F172A' },
  flex: { flex: 1 },
  scroll: { flex: 1, paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 48, paddingTop: 8 },

  // Header
  header: { alignItems: 'center', marginBottom: 28, marginTop: 12 },
  logoBox: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: '#F59E0B',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    shadowColor: '#F59E0B', shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  logoEmoji: { fontSize: 36 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  headerSubtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 6 },

  // Stepper
  stepperContainer: {
    flexDirection: 'row', justifyContent: 'center',
    marginBottom: 24, paddingHorizontal: 8,
  },
  stepItem: { alignItems: 'center', flex: 1, position: 'relative' },
  stepCircle: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  stepActive: { backgroundColor: '#F59E0B' },
  stepInactive: { backgroundColor: '#1E293B', borderWidth: 1.5, borderColor: '#334155' },
  stepNumber: { fontSize: 14, fontWeight: '700' },
  stepNumberActive: { color: '#0F172A' },
  stepNumberInactive: { color: '#475569' },
  stepLabel: { fontSize: 10, fontWeight: '600' },
  stepLabelActive: { color: '#F59E0B' },
  stepLabelInactive: { color: '#475569' },
  stepConnector: {
    position: 'absolute', top: 20, right: 0, width: '50%', height: 1.5,
  },
  stepConnectorActive: { backgroundColor: '#F59E0B' },
  stepConnectorInactive: { backgroundColor: '#1E293B' },

  // Card
  card: {
    backgroundColor: '#1E293B', borderRadius: 20, padding: 20,
    marginBottom: 16, borderWidth: 1, borderColor: '#334155',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 18 },

  // Fields
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#CBD5E1', marginBottom: 8 },
  required: { color: '#F87171' },
  optional: { color: '#64748B', fontWeight: '400' },
  input: {
    height: 52, paddingHorizontal: 16, borderRadius: 14,
    borderWidth: 1.5, fontSize: 15, color: '#FFFFFF',
  },
  inputNormal: { borderColor: '#334155', backgroundColor: '#0F172A' },
  inputError: { borderColor: '#EF4444', backgroundColor: 'rgba(127,29,29,0.15)' },
  errorText: { color: '#F87171', fontSize: 12, marginTop: 6 },
  hint: { color: '#64748B', fontSize: 11, marginTop: 6 },

  // Info Card
  infoCard: {
    backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)',
    padding: 16, marginBottom: 20,
  },
  infoTitle: { fontSize: 13, fontWeight: '700', color: '#F59E0B', marginBottom: 12 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  docDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F59E0B' },
  docText: { fontSize: 13, color: '#CBD5E1' },
  infoHint: { fontSize: 11, color: '#64748B', marginTop: 8 },

  // Button
  button: {
    height: 54, borderRadius: 16, alignItems: 'center',
    justifyContent: 'center', marginBottom: 12,
  },
  buttonActive: { backgroundColor: '#F59E0B', shadowColor: '#F59E0B', shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  buttonDisabled: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  buttonText: { fontSize: 15, fontWeight: '700' },
  buttonTextActive: { color: '#0F172A' },
  buttonTextDisabled: { color: '#475569' },

  devHint: { fontSize: 11, textAlign: 'center', color: '#F59E0B', marginTop: 8 },
})
