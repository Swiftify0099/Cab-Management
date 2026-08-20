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
  StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { router } from 'expo-router'
import { api } from '../../api/client'
import { useTheme } from '../../theme'

const ONBOARDING_STEPS = [
  { id: 1, title: 'Profile', icon: 'user' },
  { id: 2, title: 'Vehicle', icon: 'truck' },
  { id: 3, title: 'Documents', icon: 'file-text' },
  { id: 4, title: 'Review', icon: 'check-circle' },
]

export default function DriverOnboardingScreen() {
  const { theme, isDark } = useTheme()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [experienceYears, setExperienceYears] = useState('3')
  const [homeCity, setHomeCity] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!fullName.trim() || fullName.trim().length < 2) {
      e.fullName = 'Please enter your full name (min 2 characters)'
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      e.email = 'Please enter a valid email address'
    }
    const exp = parseInt(experienceYears, 10)
    if (isNaN(exp) || exp < 0 || exp > 50) {
      e.experienceYears = 'Please enter valid driving experience (0-50 years)'
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
        email: email.trim() || undefined,
        experience_years: parseInt(experienceYears, 10) || 0,
        gender,
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

  const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    flex: { flex: 1 },
    scroll: { flex: 1, paddingHorizontal: 20 },
    scrollContent: { paddingBottom: 48, paddingTop: 12 },

    // Header
    header: { alignItems: 'center', marginBottom: 24, marginTop: 8 },
    logoBox: {
      width: 64, height: 64, borderRadius: 20, backgroundColor: theme.colors.primary,
      alignItems: 'center', justifyContent: 'center', marginBottom: 12,
      shadowColor: theme.colors.primary, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
    },
    headerTitle: { fontSize: 24, fontWeight: '800', color: theme.colors.text, textAlign: 'center' },
    headerSubtitle: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 4 },

    // Stepper
    stepperContainer: {
      flexDirection: 'row', justifyContent: 'center',
      marginBottom: 20, paddingHorizontal: 4,
    },
    stepItem: { alignItems: 'center', flex: 1, position: 'relative' },
    stepCircle: {
      width: 38, height: 38, borderRadius: 19,
      alignItems: 'center', justifyContent: 'center', marginBottom: 4,
    },
    stepActive: { backgroundColor: theme.colors.primary },
    stepInactive: { backgroundColor: theme.colors.surfaceVariant, borderWidth: 1, borderColor: theme.colors.border },
    stepLabel: { fontSize: 11, fontWeight: '600' },
    stepLabelActive: { color: theme.colors.primary },
    stepLabelInactive: { color: theme.colors.textTertiary },
    stepConnector: {
      position: 'absolute', top: 19, right: 0, width: '50%', height: 1.5,
    },
    stepConnectorActive: { backgroundColor: theme.colors.primary },
    stepConnectorInactive: { backgroundColor: theme.colors.border },

    // Card
    card: {
      backgroundColor: theme.colors.surface, borderRadius: 20, padding: 20,
      marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border,
      shadowColor: '#000', shadowOpacity: isDark ? 0.2 : 0.05, shadowRadius: 8, elevation: 2,
    },
    cardTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: 16 },

    // Fields
    fieldGroup: { marginBottom: 14 },
    label: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 6 },
    required: { color: theme.colors.error },
    optional: { color: theme.colors.textTertiary, fontWeight: '400' },
    input: {
      height: 50, paddingHorizontal: 16, borderRadius: 14,
      borderWidth: 1.5, fontSize: 15, color: theme.colors.text,
      backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.border,
    },
    inputError: { borderColor: theme.colors.error },
    errorText: { color: theme.colors.error, fontSize: 12, marginTop: 4 },
    hint: { color: theme.colors.textTertiary, fontSize: 11, marginTop: 4 },

    // Gender selector
    genderRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
    genderBtn: {
      flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5,
      borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceVariant,
      alignItems: 'center', justifyContent: 'center',
    },
    genderBtnActive: {
      borderColor: theme.colors.primary, backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#D1FAE5',
    },
    genderText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
    genderTextActive: { color: theme.colors.primary, fontWeight: '700' },

    // Info Card
    infoCard: {
      backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : '#EFF6FF', borderRadius: 16,
      borderWidth: 1, borderColor: isDark ? 'rgba(59,130,246,0.25)' : '#BFDBFE',
      padding: 16, marginBottom: 20,
    },
    infoTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.secondary, marginBottom: 10 },
    docRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    docDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.secondary },
    docText: { fontSize: 13, color: theme.colors.textSecondary },
    infoHint: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 8 },

    // Button
    button: {
      height: 54, borderRadius: 16, alignItems: 'center',
      justifyContent: 'center', marginBottom: 12,
    },
    buttonActive: { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
    buttonDisabled: { backgroundColor: theme.colors.surfaceVariant, borderWidth: 1, borderColor: theme.colors.border },
    buttonText: { fontSize: 15, fontWeight: '700' },
    buttonTextActive: { color: '#FFFFFF' },
    buttonTextDisabled: { color: theme.colors.textTertiary },

    devHint: { fontSize: 12, textAlign: 'center', color: theme.colors.accent, marginTop: 8 },
  })

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
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
              <Feather name="user-check" size={30} color="#FFFFFF" />
            </View>
            <Text style={styles.headerTitle}>Driver Onboarding</Text>
            <Text style={styles.headerSubtitle}>
              Set up your profile to start accepting intercity rides
            </Text>
          </View>

          {/* Step Progress */}
          <View style={styles.stepperContainer}>
            {ONBOARDING_STEPS.map((step, i) => (
              <View key={step.id} style={styles.stepItem}>
                <View style={[styles.stepCircle, step.id === 1 ? styles.stepActive : styles.stepInactive]}>
                  <Feather
                    name={step.icon as any}
                    size={16}
                    color={step.id === 1 ? '#FFFFFF' : theme.colors.textTertiary}
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

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Basic & Professional Information</Text>

            {/* Full Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, errors.fullName ? styles.inputError : null]}
                placeholder="e.g. Rahul Sharma"
                placeholderTextColor={theme.colors.textTertiary}
                value={fullName}
                onChangeText={(t) => { setFullName(t); setErrors((e) => ({ ...e, fullName: '' })) }}
                autoCapitalize="words"
                returnKeyType="next"
              />
              {errors.fullName ? (
                <Text style={styles.errorText}>⚠ {errors.fullName}</Text>
              ) : null}
            </View>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Address <Text style={styles.optional}>(Optional)</Text></Text>
              <TextInput
                style={[styles.input, errors.email ? styles.inputError : null]}
                placeholder="e.g. rahul.sharma@example.com"
                placeholderTextColor={theme.colors.textTertiary}
                value={email}
                onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: '' })) }}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
              />
              {errors.email ? (
                <Text style={styles.errorText}>⚠ {errors.email}</Text>
              ) : null}
            </View>

            {/* Driving Experience */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Driving Experience (Years) <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, errors.experienceYears ? styles.inputError : null]}
                placeholder="e.g. 5"
                placeholderTextColor={theme.colors.textTertiary}
                value={experienceYears}
                onChangeText={(t) => { setExperienceYears(t.replace(/\D/g, '')); setErrors((e) => ({ ...e, experienceYears: '' })) }}
                keyboardType="numeric"
                maxLength={2}
                returnKeyType="next"
              />
              {errors.experienceYears ? (
                <Text style={styles.errorText}>⚠ {errors.experienceYears}</Text>
              ) : null}
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

            {/* Home City */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Home City <Text style={styles.optional}>(Optional)</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Pune, Mumbai, Delhi"
                placeholderTextColor={theme.colors.textTertiary}
                value={homeCity}
                onChangeText={setHomeCity}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleNext}
              />
              <Text style={styles.hint}>Helps match you with preferred pickup routes</Text>
            </View>
          </View>

          {/* Documents required info */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>📋 Next Steps: Required Documents</Text>
            {['Driving License', 'Aadhaar Card', 'Vehicle RC', 'Vehicle Insurance', 'PAN Card'].map((doc) => (
              <View key={doc} style={styles.docRow}>
                <View style={styles.docDot} />
                <Text style={styles.docText}>{doc}</Text>
              </View>
            ))}
            <Text style={styles.infoHint}>You will upload photos of these documents in Step 3.</Text>
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
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={[styles.buttonText, fullName.trim().length < 2 ? styles.buttonTextDisabled : styles.buttonTextActive]}>
                Continue to Vehicle Setup →
              </Text>
            )}
          </TouchableOpacity>

          {__DEV__ && (
            <Text style={styles.devHint}>🔧 Dev mode — Local test environment active</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

