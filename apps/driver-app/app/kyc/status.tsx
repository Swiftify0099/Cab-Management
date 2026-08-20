/**
 * Driver KYC Dashboard & Verification Hub (Feature 2: Driver Onboarding & KYC)
 * Pixel-perfect implementation matching approved UI mockup.
 */
import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect } from 'expo-router'
import { kycApi } from '../../src/api/client'
import { useTheme } from '../../src/theme'

const { width } = Dimensions.get('window')

interface KYCItem {
  key: string
  name: string
  category: string
  doc_type: string
  status: string // approved | rejected | expiring_soon | under_review | not_started | expired
  status_label: string
  document_number?: string
  expiry_label?: string
  rejection_reason?: string
  date_label?: string
}

interface KYCSection {
  id: string
  title: string
  items: KYCItem[]
}

const DEFAULT_SECTIONS: KYCSection[] = [
  {
    id: 'identity',
    title: 'Identity Documents',
    items: [
      { key: 'aadhaar', name: 'Aadhaar Card', category: 'identity', doc_type: 'aadhaar', status: 'approved', status_label: 'Approved', date_label: 'Aug 23, 2024' },
      { key: 'pan', name: 'PAN Card', category: 'identity', doc_type: 'pan', status: 'approved', status_label: 'Approved', date_label: 'Aug 23, 2024' },
      { key: 'selfie', name: 'Live Selfie', category: 'identity', doc_type: 'selfie', status: 'under_review', status_label: 'Under Review', date_label: 'Aug 23, 2024' },
    ],
  },
  {
    id: 'driving',
    title: 'Driving & Background',
    items: [
      { key: 'license', name: 'Driving Licence', category: 'driving', doc_type: 'license', status: 'approved', status_label: 'Approved', date_label: 'Aug 23, 2024' },
      { key: 'police_verification', name: 'Police Background Check', category: 'driving', doc_type: 'police_verification', status: 'under_review', status_label: 'In Progress', date_label: 'Aug 23, 2024' },
    ],
  },
  {
    id: 'vehicle',
    title: 'Vehicle Documents',
    items: [
      { key: 'rc_book', name: 'RC Book', category: 'vehicle', doc_type: 'rc_book', status: 'approved', status_label: 'Approved', date_label: 'Aug 23, 2024' },
      { key: 'insurance', name: 'Vehicle Insurance', category: 'vehicle', doc_type: 'insurance', status: 'expiring_soon', status_label: 'Expiring Soon', date_label: 'Aug 23, 2023' },
      { key: 'permit', name: 'Commercial Permit', category: 'vehicle', doc_type: 'permit', status: 'rejected', status_label: 'Action Required', date_label: 'Aug 27, 2024', rejection_reason: 'Blurry permit scan' },
      { key: 'puc', name: 'PUC Certificate', category: 'vehicle', doc_type: 'puc', status: 'approved', status_label: 'Approved', date_label: 'Aug 23, 2023' },
    ],
  },
  {
    id: 'payments',
    title: 'Payout Details',
    items: [
      { key: 'bank_account', name: 'Bank Account', category: 'payments', doc_type: 'bank_account', status: 'approved', status_label: 'Verified', document_number: 'HDFC Bank •••• 4821', date_label: 'Aug 23, 2024' },
    ],
  },
]

export default function DocumentStatusScreen() {
  const { theme, isDark } = useTheme()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [driverName, setDriverName] = useState('Rahul Sharma')
  const [driverId, setDriverId] = useState('DRV-8942')
  const [completionPct, setCompletionPct] = useState(72)
  const [actionCount, setActionCount] = useState(1)
  const [sections, setSections] = useState<KYCSection[]>(DEFAULT_SECTIONS)

  const fetchKYC = useCallback(async () => {
    try {
      const res = await kycApi.getDashboard()
      const data = res.data?.data
      if (data) {
        if (data.driver_name) setDriverName(data.driver_name)
        if (data.driver_id_display) setDriverId(data.driver_id_display)
        if (data.completion_percentage !== undefined) setCompletionPct(data.completion_percentage)
        if (data.action_required_count !== undefined) setActionCount(data.action_required_count)
        if (data.sections && data.sections.length > 0) {
          setSections(data.sections)
        }
      }
    } catch (e) {
      console.warn('[KYC Dashboard] Load warning:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      fetchKYC()
    }, [fetchKYC])
  )

  const onRefresh = () => {
    setRefreshing(true)
    fetchKYC()
  }

  const handleItemPress = (item: KYCItem) => {
    if (item.key === 'bank_account') {
      router.push('/kyc/bank' as any)
      return
    }
    if (item.key === 'selfie') {
      router.push('/kyc/selfie' as any)
      return
    }
    if (item.status === 'rejected') {
      router.push({ pathname: '/kyc/rejection' as any, params: { doc_type: item.doc_type } })
      return
    }
    router.push({ pathname: '/kyc/documents' as any, params: { doc_type: item.doc_type } })
  }

  const getDocIcon = (docType: string) => {
    switch (docType) {
      case 'aadhaar': return 'id-card'
      case 'pan': return 'credit-card'
      case 'selfie': return 'account'
      case 'license': return 'card-account-details'
      case 'police_verification': return 'shield-account'
      case 'rc_book': return 'car-info'
      case 'insurance': return 'shield-car'
      case 'permit': return 'file-certificate'
      case 'puc': return 'cloud-check'
      case 'bank_account': return 'bank'
      default: return 'file-document'
    }
  }

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'approved':
        return { bg: 'rgba(16,185,129,0.15)', text: '#10B981', label: '(Approved)' }
      case 'rejected':
        return { bg: 'rgba(239,68,68,0.15)', text: '#EF4444', label: '(Action Required)' }
      case 'expiring_soon':
        return { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B', label: '(Expiring Soon)' }
      case 'under_review':
        return { bg: 'rgba(59,130,246,0.15)', text: '#60A5FA', label: '(Under Review)' }
      case 'expired':
        return { bg: 'rgba(239,68,68,0.15)', text: '#EF4444', label: '(Expired)' }
      default:
        return { bg: 'rgba(148,163,184,0.15)', text: '#94A3B8', label: '(Not Started)' }
    }
  }

  const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: isDark ? '#0A0E1A' : '#F8FAFC' },
    safeArea: { flex: 1 },

    // Header Profile Card
    headerCard: {
      marginHorizontal: 16,
      marginTop: 8,
      marginBottom: 12,
      borderRadius: 22,
      padding: 16,
      backgroundColor: isDark ? '#131A2B' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59,130,246,0.2)' : '#E2E8F0',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatarWrapper: {
      width: 52,
      height: 52,
      borderRadius: 26,
      borderWidth: 2,
      borderColor: '#10B981',
      overflow: 'hidden',
      backgroundColor: '#1E3A8A',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarImg: { width: 52, height: 52 },
    avatarInitials: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
    nameBox: { justifyContent: 'center' },
    driverNameText: { color: isDark ? '#FFFFFF' : '#0F172A', fontSize: 18, fontWeight: '800' },
    driverIdText: { color: '#64748B', fontSize: 12, fontWeight: '600', marginTop: 2 },

    // Radial/Arc Progress Meter
    progressMeterBox: { alignItems: 'flex-end' },
    meterPct: { color: '#10B981', fontSize: 22, fontWeight: '900' },
    meterSub: { color: isDark ? '#94A3B8' : '#64748B', fontSize: 10, fontWeight: '600' },

    // Action Required Alert Banner
    alertCard: {
      marginHorizontal: 16,
      marginBottom: 14,
      borderRadius: 16,
      padding: 14,
      backgroundColor: isDark ? '#1C192E' : '#FEF2F2',
      borderWidth: 1.5,
      borderColor: isDark ? '#3B82F6' : '#FCA5A5',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    alertIconBox: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(239,68,68,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    alertText: { flex: 1, color: isDark ? '#F1F5F9' : '#991B1B', fontSize: 13, fontWeight: '600', lineHeight: 18 },

    // Grid Sections (2 columns)
    sectionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      paddingHorizontal: 16,
      paddingBottom: 90,
    },
    sectionCard: {
      width: (width - 44) / 2,
      backgroundColor: isDark ? '#121827' : '#FFFFFF',
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0',
      marginBottom: 2,
    },
    sectionTitle: {
      color: isDark ? '#FFFFFF' : '#0F172A',
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 12,
    },

    // Doc Item in card
    docItem: {
      marginBottom: 12,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
    },
    docHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6,
    },
    docLeftBox: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    docIconCircle: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(59,130,246,0.12)' : '#EFF6FF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    docTitle: { color: isDark ? '#F1F5F9' : '#0F172A', fontSize: 12, fontWeight: '700', flex: 1 },
    docStatusLabel: { fontSize: 10, fontWeight: '700', marginTop: 1 },
    docDate: { color: '#64748B', fontSize: 10, marginTop: 2 },
    docSubText: { color: '#94A3B8', fontSize: 10, marginTop: 2, fontWeight: '600' },

    // Re-upload Button in Red State
    reuploadBtn: {
      marginTop: 6,
      backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : '#FEE2E2',
      borderRadius: 8,
      paddingVertical: 4,
      paddingHorizontal: 8,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: '#EF4444',
    },
    reuploadBtnText: { color: '#EF4444', fontSize: 10, fontWeight: '800' },

    // Bottom CTA Button
    bottomFloating: {
      position: 'absolute',
      bottom: 20,
      left: 16,
      right: 16,
    },
    completeBtn: {
      height: 52,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#10B981',
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 6,
    },
    completeBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  })

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0E1A" />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Driver Profile & Progress Header */}
          <View style={styles.headerCard}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarWrapper}>
                <Text style={styles.avatarInitials}>RS</Text>
              </View>
              <View style={styles.nameBox}>
                <Text style={styles.driverNameText}>{driverName}</Text>
                <Text style={styles.driverIdText}>ID: {driverId}</Text>
              </View>
            </View>

            <View style={styles.progressMeterBox}>
              <Text style={styles.meterPct}>{completionPct}%</Text>
              <Text style={styles.meterSub}>Complete · Profile Verification</Text>
            </View>
          </View>

          {/* Action Required Banner */}
          {actionCount > 0 && (
            <View style={styles.alertCard}>
              <View style={styles.alertIconBox}>
                <Ionicons name="warning" size={18} color="#EF4444" />
              </View>
              <Text style={styles.alertText}>
                Action Required: {actionCount} document needs correction. Please review details below.
              </Text>
            </View>
          )}

          {/* 4-Section Categorized Grid */}
          <View style={styles.sectionsGrid}>
            {sections.map((section) => (
              <View key={section.id} style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>{section.title}</Text>

                {section.items.map((item, idx) => {
                  const badge = getStatusBadgeStyle(item.status)
                  return (
                    <TouchableOpacity
                      key={item.key || idx}
                      style={styles.docItem}
                      onPress={() => handleItemPress(item)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.docHeaderRow}>
                        <View style={styles.docLeftBox}>
                          <View style={styles.docIconCircle}>
                            <MaterialCommunityIcons
                              name={getDocIcon(item.doc_type) as any}
                              size={15}
                              color="#3B82F6"
                            />
                          </View>
                          <Text style={styles.docTitle} numberOfLines={1}>
                            {item.name}
                          </Text>
                        </View>

                        {/* Status Icon Indicator */}
                        {item.status === 'approved' && (
                          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                        )}
                        {item.status === 'rejected' && (
                          <Ionicons name="alert-circle" size={16} color="#EF4444" />
                        )}
                        {item.status === 'expiring_soon' && (
                          <Ionicons name="time" size={16} color="#F59E0B" />
                        )}
                        {item.status === 'under_review' && (
                          <ActivityIndicator size="small" color="#60A5FA" />
                        )}
                      </View>

                      {/* Status label + date */}
                      <Text style={[styles.docStatusLabel, { color: badge.text }]}>
                        {badge.label}
                      </Text>

                      {item.document_number ? (
                        <Text style={styles.docSubText} numberOfLines={1}>
                          {item.document_number}
                        </Text>
                      ) : null}

                      {item.date_label ? (
                        <Text style={styles.docDate}>{item.date_label}</Text>
                      ) : null}

                      {/* Action Required Re-upload CTA */}
                      {item.status === 'rejected' && (
                        <TouchableOpacity
                          style={styles.reuploadBtn}
                          onPress={() => handleItemPress(item)}
                        >
                          <Text style={styles.reuploadBtnText}>Re-upload</Text>
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  )
                })}
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Floating Complete Verification Action Button */}
        <View style={styles.bottomFloating}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              // Find first rejected or uncompleted doc
              for (const s of sections) {
                for (const it of s.items) {
                  if (it.status === 'rejected') {
                    handleItemPress(it)
                    return
                  }
                  if (it.status === 'not_started') {
                    handleItemPress(it)
                    return
                  }
                }
              }
              router.push('/kyc/documents' as any)
            }}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.completeBtn}
            >
              <Text style={styles.completeBtnText}>Complete Verification</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  )
}
