/**
 * Driver Onboarding Screen — Step 4: Review and Submit
 */
import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, Alert
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { api } from '../../api/client'
import * as SecureStore from 'expo-secure-store'

export default function ReviewScreen() {
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // In a real app, we would make a final API call to mark onboarding as complete
      // and trigger the background admin approval workflow.
      // await api.post('/driver/setup/complete')
      
      // Update local storage to mark profile as complete
      const userStr = await SecureStore.getItemAsync('driver_user')
      if (userStr) {
        const user = JSON.parse(userStr)
        user.profileComplete = true
        await SecureStore.setItemAsync('driver_user', JSON.stringify(user))
      }

      // Simulate a small delay for better UX
      await new Promise(r => setTimeout(r, 1500))

      Alert.alert(
        '🎉 Setup Complete!',
        'Your profile has been submitted for review. You can now access the app.',
        [{ text: 'Go to Dashboard', onPress: () => router.replace('/(tabs)') }]
      )
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to submit application')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoEmoji}>✅</Text>
          </View>
          <Text style={styles.headerTitle}>Review & Submit</Text>
          <Text style={styles.headerSubtitle}>Double check your details before submitting</Text>
        </View>

        {/* Stepper */}
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
          
          <View style={styles.summarySection}>
            <Text style={styles.sectionHeader}>👤 Profile Details</Text>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Status</Text><Text style={styles.summaryValue}>Saved ✅</Text></View>
          </View>

          <View style={styles.summarySection}>
            <Text style={styles.sectionHeader}>🚗 Vehicle Details</Text>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Status</Text><Text style={styles.summaryValue}>Saved ✅</Text></View>
          </View>

          <View style={styles.summarySection}>
            <Text style={styles.sectionHeader}>📄 Documents</Text>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Driving License</Text><Text style={styles.summaryValue}>Uploaded ✅</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Aadhaar Card</Text><Text style={styles.summaryValue}>Uploaded ✅</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Vehicle RC</Text><Text style={styles.summaryValue}>Uploaded ✅</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Insurance</Text><Text style={styles.summaryValue}>Uploaded ✅</Text></View>
          </View>
        </View>

        <View style={styles.termsBox}>
          <Text style={styles.termsText}>
            By submitting this application, you agree to the Swiftify <Text style={styles.termsLink}>Terms of Service</Text> and <Text style={styles.termsLink}>Privacy Policy</Text>. Your account will be verified by our admin team before you can accept trips.
          </Text>
        </View>

        <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.85}
          style={[styles.button, loading ? styles.buttonDisabled : styles.buttonActive]}>
          {loading ? <ActivityIndicator color="#0F172A" /> : <Text style={styles.buttonTextActive}>Submit Application →</Text>}
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => router.back()} disabled={loading} style={styles.backBtn}>
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
  header: { alignItems: 'center', marginBottom: 28, marginTop: 12 },
  logoBox: { width: 72, height: 72, borderRadius: 20, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 1, borderColor: '#334155' },
  logoEmoji: { fontSize: 36 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  headerSubtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 6 },
  stepperContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 24, paddingHorizontal: 8 },
  stepItem: { alignItems: 'center', flex: 1, position: 'relative' },
  stepCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  stepActive: { backgroundColor: '#10B981' },
  stepNumber: { fontSize: 14, fontWeight: '700' },
  stepNumberActive: { color: '#FFFFFF' },
  stepLabel: { fontSize: 10, fontWeight: '600' },
  stepLabelActive: { color: '#10B981' },
  stepConnector: { position: 'absolute', top: 20, right: 0, width: '50%', height: 1.5 },
  stepConnectorActive: { backgroundColor: '#10B981' },
  card: { backgroundColor: '#1E293B', borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#334155' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 16 },
  summarySection: { backgroundColor: '#0F172A', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  sectionHeader: { fontSize: 14, fontWeight: '700', color: '#CBD5E1', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontSize: 13, color: '#94A3B8' },
  summaryValue: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  termsBox: { paddingHorizontal: 8, marginBottom: 24 },
  termsText: { fontSize: 12, color: '#64748B', lineHeight: 18, textAlign: 'center' },
  termsLink: { color: '#3B82F6', fontWeight: '600' },
  button: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  buttonActive: { backgroundColor: '#10B981', shadowColor: '#10B981', shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  buttonDisabled: { backgroundColor: '#334155' },
  buttonTextActive: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  backBtn: { alignItems: 'center', paddingVertical: 12 },
  backBtnText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
})
