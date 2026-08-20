/**
 * Driver KYC Rejection & Audit Timeline Screen (Feature 2: Driver Onboarding & KYC)
 * Pixel-perfect implementation matching approved UI mockup.
 */
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { kycApi } from '../../src/api/client'
import { useTheme } from '../../src/theme'

interface TimelineStep {
  step: number
  title: string
  date: string
  isCurrent?: boolean
  isRejected?: boolean
}

export default function DocumentRejectionScreen() {
  const { theme, isDark } = useTheme()
  const { doc_type = 'permit' } = useLocalSearchParams<{ doc_type: string }>()

  const [loading, setLoading] = useState(true)
  const [docName, setDocName] = useState('Commercial Permit')
  const [rejectionReason, setRejectionReason] = useState(
    'The permit image is blurry and the permit number (MH-02-PMT-948) cannot be validated.'
  )
  const [actionRequired, setActionRequired] = useState(
    'Please upload a clear, high-resolution original scan of your All-India Permit.'
  )
  const [timeline, setTimeline] = useState<TimelineStep[]>([
    { step: 1, title: 'Submitted on', date: 'Aug 24' },
    { step: 2, title: 'Review Started by Admin Team on', date: 'Aug 25' },
    { step: 3, title: 'Rejected on', date: 'Aug 26', isCurrent: true, isRejected: true },
  ])

  useEffect(() => {
    loadDetails()
  }, [doc_type])

  const loadDetails = async () => {
    try {
      setLoading(true)
      const res = await kycApi.getDocumentDetails(doc_type)
      const data = res.data?.data
      if (data) {
        if (data.document_name) setDocName(data.document_name)
        if (data.rejection_reason) setRejectionReason(data.rejection_reason)
        if (data.action_required) setActionRequired(data.action_required)
        if (data.timeline && data.timeline.length > 0) {
          setTimeline(
            data.timeline.map((ev: any, i: number) => ({
              step: i + 1,
              title: ev.title,
              date: new Date(ev.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              isCurrent: i === data.timeline.length - 1,
              isRejected: ev.status === 'rejected',
            }))
          )
        }
      }
    } catch (e) {
      console.warn('[DocRejection] Error loading details:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleReupload = () => {
    router.push({ pathname: '/kyc/documents' as any, params: { doc_type } })
  }

  const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: isDark ? '#080C17' : '#F8FAFC' },
    safeArea: { flex: 1 },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 16,
    },
    backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: isDark ? '#FFFFFF' : '#0F172A', fontSize: 18, fontWeight: '800' },
    bellBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

    scroll: { flex: 1, paddingHorizontal: 18 },
    scrollContent: { paddingBottom: 40, paddingTop: 4 },

    // Top Rejection Alert Card
    alertBanner: {
      backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#FEE2E2',
      borderWidth: 1.5,
      borderColor: '#EF4444',
      borderRadius: 18,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 16,
    },
    alertIconCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(239,68,68,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    alertTitle: { color: '#EF4444', fontSize: 16, fontWeight: '800' },
    alertSub: { color: isDark ? '#FCA5A5' : '#991B1B', fontSize: 13, fontWeight: '600', marginTop: 2 },

    // Rejection Details Card
    detailsCard: {
      backgroundColor: isDark ? '#121827' : '#FFFFFF',
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
      marginBottom: 20,
    },
    sectionLabel: { color: isDark ? '#FFFFFF' : '#0F172A', fontSize: 14, fontWeight: '800', marginBottom: 4 },
    sectionBody: { color: isDark ? '#94A3B8' : '#475569', fontSize: 13, fontWeight: '600', lineHeight: 19, marginBottom: 16 },

    // Replace & Re-upload Button
    reuploadBtn: {
      height: 52,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: '#10B981',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
      backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#ECFDF5',
      shadowColor: '#10B981',
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    reuploadText: { color: '#10B981', fontSize: 16, fontWeight: '800' },

    // Timeline Card
    timelineCard: {
      backgroundColor: isDark ? '#121827' : '#FFFFFF',
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
    },
    timelineTitle: { color: isDark ? '#FFFFFF' : '#0F172A', fontSize: 15, fontWeight: '800', marginBottom: 16 },

    // Timeline Row
    timelineRow: { flexDirection: 'row', gap: 14, position: 'relative' },
    timelineLeft: { alignItems: 'center' },
    stepCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : '#EFF6FF',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: '#3B82F6',
    },
    stepCircleRejected: {
      backgroundColor: 'rgba(239,68,68,0.2)',
      borderColor: '#EF4444',
    },
    stepNumber: { color: '#3B82F6', fontSize: 13, fontWeight: '800' },
    stepNumberRejected: { color: '#EF4444', fontSize: 13, fontWeight: '800' },
    timelineConnector: {
      width: 2,
      height: 36,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
      marginVertical: 4,
    },
    timelineInfo: { flex: 1, paddingTop: 4 },
    stepTitle: { color: isDark ? '#F1F5F9' : '#0F172A', fontSize: 13, fontWeight: '700' },
    stepDate: { color: '#64748B', fontSize: 12, fontWeight: '600', marginTop: 2 },
  })

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#080C17" />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={isDark ? '#FFFFFF' : '#0F172A'} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{docName} Review</Text>
          <TouchableOpacity style={styles.bellBtn}>
            <Feather name="bell" size={20} color="#F59E0B" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Rejection Alert Banner */}
          <View style={styles.alertBanner}>
            <View style={styles.alertIconCircle}>
              <Ionicons name="alert" size={20} color="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>❌ Document Rejected by Reviewer</Text>
              <Text style={styles.alertSub}>Action required to activate your account</Text>
            </View>
          </View>

          {/* Details Card */}
          <View style={styles.detailsCard}>
            <Text style={styles.sectionLabel}>Rejection Reason:</Text>
            <Text style={styles.sectionBody}>{rejectionReason}</Text>

            <Text style={styles.sectionLabel}>Action Required:</Text>
            <Text style={styles.sectionBody}>{actionRequired}</Text>
          </View>

          {/* Replace & Re-upload Button */}
          <TouchableOpacity style={styles.reuploadBtn} activeOpacity={0.85} onPress={handleReupload}>
            <Text style={styles.reuploadText}>Replace & Re-upload Document</Text>
          </TouchableOpacity>

          {/* Audit & Verification Timeline Card */}
          <View style={styles.timelineCard}>
            <Text style={styles.timelineTitle}>Audit & Verification Timeline</Text>

            {timeline.map((step, idx) => (
              <View key={step.step} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.stepCircle, step.isRejected && styles.stepCircleRejected]}>
                    <Text style={[styles.stepNumber, step.isRejected && styles.stepNumberRejected]}>
                      {step.step}
                    </Text>
                  </View>
                  {idx < timeline.length - 1 && <View style={styles.timelineConnector} />}
                </View>

                <View style={styles.timelineInfo}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDate}>{step.date}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}
