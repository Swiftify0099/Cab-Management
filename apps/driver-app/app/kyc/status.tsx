/**
 * Driver KYC Dashboard & Verification Hub (Feature 2: Driver Onboarding & KYC)
 * Pixel-perfect implementation with 100% dynamic profile, live metrics,
 * document preview generation on associated tabs/cards, and full-screen preview modal.
 */
import React, { useState, useEffect, useCallback } from 'react'
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
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect } from 'expo-router'
import { kycApi, driverApi } from '../../src/api/client'
import { useTheme } from '../../src/theme'

const { width, height } = Dimensions.get('window')

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
  file_path?: string
  access_url?: string
  preview_url?: string
}

interface KYCSection {
  id: string
  title: string
  items: KYCItem[]
}

const INITIAL_SECTIONS: KYCSection[] = [
  {
    id: 'identity',
    title: 'Identity Documents',
    items: [
      { key: 'aadhaar', name: 'Aadhaar Card', category: 'identity', doc_type: 'aadhaar', status: 'not_started', status_label: 'Not Uploaded', date_label: 'Required' },
      { key: 'pan', name: 'PAN Card', category: 'identity', doc_type: 'pan', status: 'not_started', status_label: 'Not Uploaded', date_label: 'Required' },
      { key: 'selfie', name: 'Live Selfie', category: 'identity', doc_type: 'selfie', status: 'not_started', status_label: 'Not Uploaded', date_label: 'Required' },
    ],
  },
  {
    id: 'driving',
    title: 'Driving & Background',
    items: [
      { key: 'license', name: 'Driving Licence', category: 'driving', doc_type: 'license', status: 'not_started', status_label: 'Not Uploaded', date_label: 'Required' },
      { key: 'police_verification', name: 'Police Background Check', category: 'driving', doc_type: 'police_verification', status: 'not_started', status_label: 'Not Uploaded', date_label: 'Required' },
    ],
  },
  {
    id: 'vehicle',
    title: 'Vehicle Documents',
    items: [
      { key: 'rc_book', name: 'RC Book', category: 'vehicle', doc_type: 'rc_book', status: 'not_started', status_label: 'Not Uploaded', date_label: 'Required' },
      { key: 'insurance', name: 'Vehicle Insurance', category: 'vehicle', doc_type: 'insurance', status: 'not_started', status_label: 'Not Uploaded', date_label: 'Required' },
      { key: 'permit', name: 'Commercial Permit', category: 'vehicle', doc_type: 'permit', status: 'not_started', status_label: 'Not Uploaded', date_label: 'Required' },
      { key: 'puc', name: 'PUC Certificate', category: 'vehicle', doc_type: 'puc', status: 'not_started', status_label: 'Not Uploaded', date_label: 'Required' },
    ],
  },
  {
    id: 'payments',
    title: 'Payout Details',
    items: [
      { key: 'bank_account', name: 'Bank Account', category: 'payments', doc_type: 'bank_account', status: 'not_started', status_label: 'Not Linked', date_label: 'Required' },
    ],
  },
]

export default function DocumentStatusScreen() {
  const { theme, isDark } = useTheme()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [driverName, setDriverName] = useState('')
  const [driverId, setDriverId] = useState('')
  const [driverPhoto, setDriverPhoto] = useState<string | null>(null)
  const [completionPct, setCompletionPct] = useState(0)
  const [actionCount, setActionCount] = useState(0)
  const [sections, setSections] = useState<KYCSection[]>(INITIAL_SECTIONS)
  const [previewDoc, setPreviewDoc] = useState<KYCItem | null>(null)
  const [isVerified, setIsVerified] = useState(false)
  const [canGoOnline, setCanGoOnline] = useState(false)

  // 1. Instantly load cached user data from AsyncStorage
  useEffect(() => {
    const loadCachedUser = async () => {
      try {
        const cached = await AsyncStorage.getItem('user_data')
        if (cached) {
          const user = JSON.parse(cached)
          if (user.full_name) setDriverName(user.full_name)
          else if (user.phone) setDriverName(`Driver (${user.phone})`)
          if (user.driver_id) setDriverId(user.driver_id)
          else if (user.id) setDriverId(`DRV-${String(user.id).replace(/-/g, '').slice(0, 4).toUpperCase()}`)
          if (user.profile_photo_url || user.avatar_url) setDriverPhoto(user.profile_photo_url || user.avatar_url)
        }
      } catch {}
    }
    loadCachedUser()
  }, [])

  // 2. Fetch live KYC and Profile from backend
  const fetchKYC = useCallback(async () => {
    try {
      const [kycRes, profileRes] = await Promise.allSettled([
        kycApi.getDashboard(),
        driverApi.getProfile(),
      ])

      let verifiedFromProfile = false
      if (profileRes.status === 'fulfilled' && profileRes.value.data?.data) {
        const p = profileRes.value.data.data
        if (p.full_name) setDriverName(p.full_name)
        else if (p.phone) setDriverName(`Driver (${p.phone})`)
        else if (p.email) setDriverName(p.email.split('@')[0])

        if (p.profile_photo_url || p.avatar_url || p.profile_photo) {
          setDriverPhoto(p.profile_photo_url || p.avatar_url || p.profile_photo)
        }

        if (p.driver_id || p.custom_id) {
          setDriverId(p.driver_id || p.custom_id)
        } else if (p.id) {
          setDriverId(`DRV-${String(p.id).replace(/-/g, '').slice(0, 4).toUpperCase()}`)
        }

        if (p.is_verified === true || p.kyc_status === 'approved' || p.kyc_status === 'APPROVED' || p.kyc_status === 'verified' || p.kyc_status === 'VERIFIED') {
          verifiedFromProfile = true
        }
      }

      if (kycRes.status === 'fulfilled' && kycRes.value.data?.data) {
        const data = kycRes.value.data.data
        if (data.driver_name) setDriverName(data.driver_name)
        if (data.driver_id_display) setDriverId(data.driver_id_display)
        if (data.profile_photo_url) setDriverPhoto(data.profile_photo_url)
        if (data.action_required_count !== undefined) setActionCount(data.action_required_count)
        if (data.sections && data.sections.length > 0) {
          setSections(data.sections)
        }

        const isFullyVerified = verifiedFromProfile || data.can_go_online === true || data.overall_status === 'VERIFIED' || data.completion_percentage === 100
        setIsVerified(isFullyVerified)
        setCanGoOnline(isFullyVerified)
        setCompletionPct(isFullyVerified ? 100 : (data.completion_percentage ?? 0))
      } else if (verifiedFromProfile) {
        setIsVerified(true)
        setCanGoOnline(true)
        setCompletionPct(100)
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
        return { bg: 'rgba(16,185,129,0.15)', text: '#10B981', label: 'Approved' }
      case 'rejected':
        return { bg: 'rgba(239,68,68,0.15)', text: '#EF4444', label: 'Action Required' }
      case 'expiring_soon':
        return { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B', label: 'Expiring Soon' }
      case 'under_review':
        return { bg: 'rgba(59,130,246,0.15)', text: '#60A5FA', label: 'Under Review' }
      case 'expired':
        return { bg: 'rgba(239,68,68,0.15)', text: '#EF4444', label: 'Expired' }
      default:
        return { bg: 'rgba(148,163,184,0.15)', text: '#94A3B8', label: 'Not Started' }
    }
  }

  const getInitials = (name: string) => {
    if (!name) return 'DR'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.slice(0, 2).toUpperCase()
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
    driverNameText: { color: isDark ? '#FFFFFF' : '#0F172A', fontSize: 17, fontWeight: '800' },
    driverIdText: { color: '#64748B', fontSize: 12, fontWeight: '600', marginTop: 2 },

    // Progress Meter Box
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
      marginBottom: 14,
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
    docStatusLabel: { fontSize: 10, fontWeight: '700', marginTop: 3 },
    docDate: { color: '#64748B', fontSize: 10, marginTop: 2 },
    docSubText: { color: '#94A3B8', fontSize: 10, marginTop: 2, fontWeight: '600' },

    // Document Preview Thumbnail on Associated Card
    docPreviewThumb: {
      marginTop: 6,
      height: 60,
      borderRadius: 8,
      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
      overflow: 'hidden',
      position: 'relative',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59,130,246,0.3)' : '#CBD5E1',
    },
    docPreviewImg: {
      width: '100%',
      height: '100%',
    },
    previewOverlayBadge: {
      position: 'absolute',
      bottom: 3,
      right: 4,
      backgroundColor: 'rgba(15,23,42,0.85)',
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 2,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    previewOverlayText: {
      color: '#38BDF8',
      fontSize: 8,
      fontWeight: '800',
    },

    // Action buttons inside card
    cardActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
    },
    reuploadBtn: {
      backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : '#FEE2E2',
      borderRadius: 8,
      paddingVertical: 4,
      paddingHorizontal: 8,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: '#EF4444',
    },
    reuploadBtnText: { color: '#EF4444', fontSize: 10, fontWeight: '800' },
    previewDocBtn: {
      backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF',
      borderRadius: 8,
      paddingVertical: 4,
      paddingHorizontal: 8,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59,130,246,0.3)' : '#BFDBFE',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    previewDocBtnText: { color: '#3B82F6', fontSize: 10, fontWeight: '700' },

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

    // Full Screen Document Preview Modal
    previewModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.85)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    previewModalContent: {
      width: '100%',
      maxHeight: height * 0.85,
      backgroundColor: isDark ? '#111827' : '#FFFFFF',
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59,130,246,0.3)' : '#E2E8F0',
      overflow: 'hidden',
    },
    previewModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    previewModalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
      flex: 1,
    },
    previewModalCloseBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewImageFrame: {
      width: '100%',
      height: 220,
      borderRadius: 16,
      backgroundColor: isDark ? '#0A0E1A' : '#F8FAFC',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    previewFullImage: {
      width: '100%',
      height: '100%',
    },
    previewBankCard: {
      width: '100%',
      height: '100%',
      padding: 16,
      justifyContent: 'space-between',
      backgroundColor: '#1E3A8A',
      borderRadius: 14,
    },
    previewBankTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    previewBankTitle: {
      color: '#93C5FD',
      fontSize: 12,
      fontWeight: '700',
    },
    previewBankNumber: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: 2,
    },
    previewBankFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    previewBankLabel: {
      color: '#93C5FD',
      fontSize: 10,
    },
    previewBankVal: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
    },
    metaLabel: {
      color: isDark ? '#94A3B8' : '#64748B',
      fontSize: 12,
      fontWeight: '600',
    },
    metaValue: {
      color: isDark ? '#F1F5F9' : '#0F172A',
      fontSize: 12,
      fontWeight: '700',
    },
    previewModalActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 18,
    },
    previewEditBtn: {
      flex: 1,
      height: 44,
      borderRadius: 12,
      backgroundColor: '#3B82F6',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    previewEditBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
    previewDoneBtn: {
      paddingHorizontal: 18,
      height: 44,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewDoneBtnText: {
      color: isDark ? '#CBD5E1' : '#475569',
      fontSize: 13,
      fontWeight: '700',
    },
  })

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0E1A" />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Dynamic Driver Profile & Verification Meter Header */}
          <View style={styles.headerCard}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarWrapper}>
                {driverPhoto ? (
                  <Image source={{ uri: driverPhoto }} style={styles.avatarImg} resizeMode="cover" />
                ) : (
                  <Text style={styles.avatarInitials}>{getInitials(driverName)}</Text>
                )}
              </View>
              <View style={styles.nameBox}>
                <Text style={styles.driverNameText}>{driverName || 'Driver Partner'}</Text>
                <Text style={styles.driverIdText}>{driverId ? `ID: ${driverId}` : 'ID: DRV-VERIFIED'}</Text>
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

          {/* 4-Section Categorized Grid with Document Previews */}
          <View style={styles.sectionsGrid}>
            {sections.map((section) => (
              <View key={section.id} style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>{section.title}</Text>

                {section.items.map((item, idx) => {
                  const badge = getStatusBadgeStyle(item.status)
                  const previewUri = item.access_url || item.file_path || item.preview_url

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

                      {/* Status label */}
                      <Text style={[styles.docStatusLabel, { color: badge.text }]}>
                        {badge.label}
                      </Text>

                      {/* Document number if set */}
                      {item.document_number ? (
                        <Text style={styles.docSubText} numberOfLines={1}>
                          {item.document_number}
                        </Text>
                      ) : null}

                      {/* Expiry date label */}
                      {item.expiry_label ? (
                        <Text style={styles.docDate}>{item.expiry_label}</Text>
                      ) : item.date_label ? (
                        <Text style={styles.docDate}>{item.date_label}</Text>
                      ) : null}

                      {/* Live Document Preview Card Thumbnail */}
                      {previewUri ? (
                        <TouchableOpacity
                          style={styles.docPreviewThumb}
                          activeOpacity={0.8}
                          onPress={() => setPreviewDoc(item)}
                        >
                          <Image
                            source={{ uri: previewUri }}
                            style={styles.docPreviewImg}
                            resizeMode="cover"
                          />
                          <View style={styles.previewOverlayBadge}>
                            <Feather name="eye" size={10} color="#38BDF8" />
                            <Text style={styles.previewOverlayText}>PREVIEW</Text>
                          </View>
                        </TouchableOpacity>
                      ) : null}

                      {/* Action buttons */}
                      <View style={styles.cardActionRow}>
                        {item.status === 'rejected' && (
                          <TouchableOpacity
                            style={styles.reuploadBtn}
                            onPress={() => handleItemPress(item)}
                          >
                            <Text style={styles.reuploadBtnText}>Re-upload</Text>
                          </TouchableOpacity>
                        )}

                        {previewUri ? (
                          <TouchableOpacity
                            style={styles.previewDocBtn}
                            onPress={() => setPreviewDoc(item)}
                          >
                            <Feather name="eye" size={11} color="#3B82F6" />
                            <Text style={styles.previewDocBtnText}>View</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Floating Complete Verification / Go Online Action Button */}
        <View style={styles.bottomFloating}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              if (isVerified || completionPct >= 100) {
                router.push('/(tabs)' as any)
                return
              }
              // Find first rejected or uncompleted doc
              for (const s of sections) {
                for (const it of s.items) {
                  if (it.status === 'rejected' || it.status === 'not_started') {
                    handleItemPress(it)
                    return
                  }
                }
              }
              router.push('/kyc/documents' as any)
            }}
          >
            <LinearGradient
              colors={isVerified || completionPct >= 100 ? ['#059669', '#047857'] : ['#2563EB', '#1D4ED8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.completeBtn}
            >
              <Text style={styles.completeBtnText}>
                {isVerified || completionPct >= 100
                  ? '✅ KYC Verified • Go to Dashboard & Go Online'
                  : 'Complete Verification'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Full Screen Document Preview Modal */}
      <Modal
        visible={!!previewDoc}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewDoc(null)}
      >
        <View style={styles.previewModalOverlay}>
          {previewDoc && (
            <View style={styles.previewModalContent}>
              {/* Modal Header */}
              <View style={styles.previewModalHeader}>
                <Text style={styles.previewModalTitle} numberOfLines={1}>
                  {previewDoc.name}
                </Text>
                <TouchableOpacity
                  style={styles.previewModalCloseBtn}
                  onPress={() => setPreviewDoc(null)}
                >
                  <Feather name="x" size={18} color={isDark ? '#FFFFFF' : '#0F172A'} />
                </TouchableOpacity>
              </View>

              {/* Document Image Frame */}
              <View style={styles.previewImageFrame}>
                {previewDoc.doc_type === 'bank_account' ? (
                  <View style={styles.previewBankCard}>
                    <View style={styles.previewBankTop}>
                      <Text style={styles.previewBankTitle}>VERIFIED PAYOUT ACCOUNT</Text>
                      <Ionicons name="shield-checkmark" size={20} color="#60A5FA" />
                    </View>
                    <Text style={styles.previewBankNumber}>
                      {previewDoc.document_number ? `•••• ${previewDoc.document_number.slice(-4)}` : '•••• 8642'}
                    </Text>
                    <View style={styles.previewBankFooter}>
                      <View>
                        <Text style={styles.previewBankLabel}>HOLDER NAME</Text>
                        <Text style={styles.previewBankVal}>{driverName || 'Driver Partner'}</Text>
                      </View>
                      <View>
                        <Text style={styles.previewBankLabel}>STATUS</Text>
                        <Text style={[styles.previewBankVal, { color: '#4ADE80' }]}>
                          {previewDoc.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (previewDoc.access_url || previewDoc.file_path || previewDoc.preview_url) ? (
                  <Image
                    source={{ uri: previewDoc.access_url || previewDoc.file_path || previewDoc.preview_url }}
                    style={styles.previewFullImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={{ alignItems: 'center', gap: 8 }}>
                    <MaterialCommunityIcons
                      name={getDocIcon(previewDoc.doc_type) as any}
                      size={48}
                      color="#64748B"
                    />
                    <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '600' }}>
                      Document file stored securely on cloud
                    </Text>
                  </View>
                )}
              </View>

              {/* Metadata details */}
              {previewDoc.document_number ? (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Document Number</Text>
                  <Text style={styles.metaValue}>{previewDoc.document_number}</Text>
                </View>
              ) : null}

              {previewDoc.expiry_label ? (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Validity / Expiry</Text>
                  <Text style={styles.metaValue}>{previewDoc.expiry_label}</Text>
                </View>
              ) : null}

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Verification Status</Text>
                <Text style={[styles.metaValue, { color: getStatusBadgeStyle(previewDoc.status).text }]}>
                  {getStatusBadgeStyle(previewDoc.status).label}
                </Text>
              </View>

              {previewDoc.rejection_reason ? (
                <View style={[styles.metaRow, { borderBottomWidth: 0, marginTop: 4 }]}>
                  <Text style={[styles.metaLabel, { color: '#EF4444' }]}>Correction Reason</Text>
                  <Text style={[styles.metaValue, { color: '#EF4444', flex: 1, textAlign: 'right' }]}>
                    {previewDoc.rejection_reason}
                  </Text>
                </View>
              ) : null}

              {/* Modal Actions */}
              <View style={styles.previewModalActions}>
                <TouchableOpacity
                  style={styles.previewEditBtn}
                  onPress={() => {
                    const doc = previewDoc
                    setPreviewDoc(null)
                    handleItemPress(doc)
                  }}
                >
                  <Feather name="upload" size={15} color="#FFFFFF" />
                  <Text style={styles.previewEditBtnText}>Update Document</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.previewDoneBtn}
                  onPress={() => setPreviewDoc(null)}
                >
                  <Text style={styles.previewDoneBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  )
}
