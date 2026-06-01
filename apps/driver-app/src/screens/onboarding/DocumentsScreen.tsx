/**
 * Driver Onboarding Screen — Step 3: Documents Upload
 */
import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, StyleSheet
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'

const REQUIRED_DOCS = [
  { id: 'dl', label: 'Driving License', icon: '🪪', desc: 'Front and back side' },
  { id: 'aadhaar', label: 'Aadhaar Card', icon: '📑', desc: 'Used for identity verification' },
  { id: 'rc', label: 'Vehicle RC', icon: '📝', desc: 'Registration Certificate' },
  { id: 'insurance', label: 'Vehicle Insurance', icon: '🛡️', desc: 'Valid insurance policy' },
]

export default function DocumentsScreen() {
  const [uploads, setUploads] = useState<Record<string, 'pending' | 'uploading' | 'done'>>({
    dl: 'pending',
    aadhaar: 'pending',
    rc: 'pending',
    insurance: 'pending',
  })
  const [loading, setLoading] = useState(false)

  const handleUpload = (docId: string) => {
    // Mock upload process
    setUploads(p => ({ ...p, [docId]: 'uploading' }))
    setTimeout(() => {
      setUploads(p => ({ ...p, [docId]: 'done' }))
    }, 1500)
  }

  const allUploaded = Object.values(uploads).every(v => v === 'done')

  const handleNext = () => {
    if (!allUploaded) {
      Alert.alert('Incomplete', 'Please upload all required documents to continue.')
      return
    }
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      router.push('/onboarding/review')
    }, 500)
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoEmoji}>📄</Text>
          </View>
          <Text style={styles.headerTitle}>Document Upload</Text>
          <Text style={styles.headerSubtitle}>Please provide clear photos of these documents</Text>
        </View>

        {/* Stepper */}
        <View style={styles.stepperContainer}>
          {[1, 2, 3, 4].map((step, i) => (
            <View key={step} style={styles.stepItem}>
              <View style={[styles.stepCircle, step <= 3 ? styles.stepActive : styles.stepInactive]}>
                <Text style={[styles.stepNumber, step <= 3 ? styles.stepNumberActive : styles.stepNumberInactive]}>
                  {step < 3 ? '✓' : step === 3 ? '📄' : step}
                </Text>
              </View>
              <Text style={[styles.stepLabel, step <= 3 ? styles.stepLabelActive : styles.stepLabelInactive]}>
                {step === 1 ? 'Profile' : step === 2 ? 'Vehicle' : step === 3 ? 'Docs' : 'Review'}
              </Text>
              {i < 3 && <View style={[styles.stepConnector, step < 3 ? styles.stepConnectorActive : styles.stepConnectorInactive]} />}
            </View>
          ))}
        </View>

        {/* Document List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Required Documents</Text>
          
          {REQUIRED_DOCS.map(doc => {
            const status = uploads[doc.id]
            return (
              <View key={doc.id} style={styles.docRow}>
                <View style={styles.docIconBox}>
                  <Text style={styles.docIcon}>{doc.icon}</Text>
                </View>
                <View style={styles.docInfo}>
                  <Text style={styles.docLabel}>{doc.label}</Text>
                  <Text style={styles.docDesc}>{doc.desc}</Text>
                </View>

                {status === 'pending' ? (
                  <TouchableOpacity style={styles.uploadBtn} onPress={() => handleUpload(doc.id)}>
                    <Text style={styles.uploadBtnText}>Upload</Text>
                  </TouchableOpacity>
                ) : status === 'uploading' ? (
                  <View style={styles.uploadingBox}>
                    <ActivityIndicator size="small" color="#F59E0B" />
                  </View>
                ) : (
                  <View style={styles.doneBox}>
                    <Text style={styles.doneText}>✓ Done</Text>
                  </View>
                )}
              </View>
            )
          })}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>🔒 Secure Uploads</Text>
          <Text style={styles.infoText}>Your documents are encrypted and stored securely. They are only used for verification purposes.</Text>
        </View>

        <TouchableOpacity onPress={handleNext} disabled={loading || !allUploaded} activeOpacity={0.85}
          style={[styles.button, allUploaded && !loading ? styles.buttonActive : styles.buttonDisabled]}>
          {loading ? <ActivityIndicator color="#0F172A" /> : <Text style={allUploaded ? styles.buttonTextActive : styles.buttonTextDisabled}>Continue to Review →</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>← Back</Text></TouchableOpacity>
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
  stepActive: { backgroundColor: '#F59E0B' },
  stepInactive: { backgroundColor: '#1E293B', borderWidth: 1.5, borderColor: '#334155' },
  stepNumber: { fontSize: 14, fontWeight: '700' },
  stepNumberActive: { color: '#0F172A' },
  stepNumberInactive: { color: '#475569' },
  stepLabel: { fontSize: 10, fontWeight: '600' },
  stepLabelActive: { color: '#F59E0B' },
  stepLabelInactive: { color: '#475569' },
  stepConnector: { position: 'absolute', top: 20, right: 0, width: '50%', height: 1.5 },
  stepConnectorActive: { backgroundColor: '#F59E0B' },
  stepConnectorInactive: { backgroundColor: '#1E293B' },
  card: { backgroundColor: '#1E293B', borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#334155' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 18 },
  docRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', padding: 12, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  docIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  docIcon: { fontSize: 20 },
  docInfo: { flex: 1 },
  docLabel: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  docDesc: { fontSize: 11, color: '#94A3B8' },
  uploadBtn: { backgroundColor: '#3B82F6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  uploadBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  uploadingBox: { width: 66, height: 32, alignItems: 'center', justifyContent: 'center' },
  doneBox: { backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  doneText: { color: '#10B981', fontSize: 12, fontWeight: '700' },
  infoBox: { backgroundColor: 'rgba(59,130,246,0.1)', padding: 16, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)' },
  infoTitle: { color: '#60A5FA', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  infoText: { color: '#94A3B8', fontSize: 12, lineHeight: 18 },
  button: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  buttonActive: { backgroundColor: '#F59E0B', shadowColor: '#F59E0B', shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  buttonDisabled: { backgroundColor: '#334155' },
  buttonTextActive: { color: '#0F172A', fontSize: 15, fontWeight: '700' },
  buttonTextDisabled: { color: '#475569', fontSize: 15, fontWeight: '700' },
  backBtn: { alignItems: 'center', paddingVertical: 12 },
  backBtnText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
})
