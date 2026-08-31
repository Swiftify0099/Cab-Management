/**
 * Driver KYC Document Upload Screen (Feature 2: Driver Onboarding & KYC)
 * Dynamic authentic Indian government & transport document fields
 * (strictly NO expiry date for Aadhaar/PAN, required expiry for DL/RC/Insurance/Permit/PUC),
 * and high-fidelity live preview cards.
 */
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { kycApi, driverApi } from '../../src/api/client'
import { useTheme } from '../../src/theme'

interface DocConfig {
  title: string
  label: string
  docNumberLabel: string
  docNumberPlaceholder: string
  hasExpiry: boolean
  expiryLabel?: string
  expiryPlaceholder?: string
  badgeText: string
  badgeColor: string
  requiresBackSide: boolean
  extraField1Label?: string
  extraField1Placeholder?: string
  extraField2Label?: string
  extraField2Placeholder?: string
  guidelines: string[]
}

const DOC_CONFIGS: Record<string, DocConfig> = {
  aadhaar: {
    title: 'Aadhaar Card Verification',
    label: 'Aadhaar Card (UIDAI)',
    docNumberLabel: '12-Digit Aadhaar Number',
    docNumberPlaceholder: '5489 7721 9043',
    hasExpiry: false, // Strictly NO expiry date for Aadhaar
    badgeText: 'UIDAI Lifetime • No Expiry',
    badgeColor: '#10B981',
    requiresBackSide: true,
    extraField1Label: 'Full Name as on Aadhaar',
    extraField1Placeholder: 'e.g. Rahul Sharma',
    extraField2Label: 'Date of Birth (DD/MM/YYYY)',
    extraField2Placeholder: '15/06/1992',
    guidelines: [
      'Ensure 12-digit UID is clearly legible',
      'Make sure UIDAI QR code is unscratched',
      'No expiry date required for Aadhaar cards',
      'Upload both Front side (Photo) and Back side (Address)',
    ],
  },
  pan: {
    title: 'PAN Card Verification',
    label: 'PAN Card (IT Dept)',
    docNumberLabel: '10-Character PAN Number',
    docNumberPlaceholder: 'APEYP9842K',
    hasExpiry: false, // Strictly NO expiry date for PAN
    badgeText: 'ITD Permanent • No Expiry',
    badgeColor: '#3B82F6',
    requiresBackSide: false,
    extraField1Label: 'Full Name on PAN Card',
    extraField1Placeholder: 'e.g. RAHUL SHARMA',
    extraField2Label: "Father's Name",
    extraField2Placeholder: 'e.g. SANJAY SHARMA',
    guidelines: [
      '10-character alphanumeric PAN must be clear',
      'Driver photograph and signature must be visible',
      'PAN has permanent lifetime validity',
    ],
  },
  license: {
    title: 'Driving Licence Verification',
    label: 'Commercial Driving Licence',
    docNumberLabel: 'Driving Licence Number',
    docNumberPlaceholder: 'MH12 20180054321',
    hasExpiry: true,
    expiryLabel: 'Licence Valid Upto (Expiry Date)',
    expiryPlaceholder: '11/04/2028',
    badgeText: 'Transport Validity Required',
    badgeColor: '#F59E0B',
    requiresBackSide: true,
    extraField1Label: 'Vehicle Class (COV)',
    extraField1Placeholder: 'LMV-TR (Transport / Commercial)',
    extraField2Label: 'Issuing RTO Authority',
    extraField2Placeholder: 'MH12 Pune',
    guidelines: [
      'Ensure LMV-TR / Transport class endorsement is visible',
      'Licence must have active validity (future expiry date)',
      'Smart chip and badge number must be clear',
    ],
  },
  rc_book: {
    title: 'Vehicle RC Book Verification',
    label: 'Certificate of Registration (Form 23)',
    docNumberLabel: 'Vehicle Registration Number',
    docNumberPlaceholder: 'MH12 AB 8686',
    hasExpiry: true,
    expiryLabel: 'Fitness Valid Upto (RC Expiry)',
    expiryPlaceholder: '19/08/2035',
    badgeText: 'Fitness Tracked',
    badgeColor: '#10B981',
    requiresBackSide: true,
    extraField1Label: 'Vehicle Make & Model',
    extraField1Placeholder: 'Maruti Suzuki Dzire VXI',
    extraField2Label: 'Chassis Number (VIN)',
    extraField2Placeholder: 'MA3EKB1S000123456',
    guidelines: [
      'Number plate on car must match RC number exactly',
      'Fitness date must be valid and legible',
      'Upload Front (Owner info) and Back (Specs)',
    ],
  },
  insurance: {
    title: 'Vehicle Insurance Verification',
    label: 'Commercial Insurance Policy',
    docNumberLabel: 'Insurance Policy Number',
    docNumberPlaceholder: 'OG-24-1234-5678-00000123',
    hasExpiry: true,
    expiryLabel: 'Policy Expiry Date (DD/MM/YYYY)',
    expiryPlaceholder: '25/08/2027',
    badgeText: 'Active Policy Required',
    badgeColor: '#06B6D4',
    requiresBackSide: false,
    extraField1Label: 'Insurance Company Name',
    extraField1Placeholder: 'ICICI Lombard / Tata AIG',
    extraField2Label: 'Policy Type',
    extraField2Placeholder: 'Commercial Passenger Carrying',
    guidelines: [
      'Policy must cover passenger carrying commercial vehicle',
      'Valid policy dates must cover current date and future',
      'Insured vehicle number must match RC',
    ],
  },
  permit: {
    title: 'Commercial Permit Verification',
    label: 'Commercial Vehicle Permit',
    docNumberLabel: 'Permit Number',
    docNumberPlaceholder: 'PER/MH12/2024/09876',
    hasExpiry: true,
    expiryLabel: 'Permit Valid Upto (Expiry)',
    expiryPlaceholder: '15/09/2028',
    badgeText: 'AITP / State Permit',
    badgeColor: '#EC4899',
    requiresBackSide: true,
    extraField1Label: 'Permit Type',
    extraField1Placeholder: 'All India Tourist Permit (AITP)',
    guidelines: [
      'All India Tourist Permit or State Contract Carriage',
      'Authorised route and state stamps must be visible',
    ],
  },
  puc: {
    title: 'PUC Certificate Verification',
    label: 'Pollution Under Control Certificate',
    docNumberLabel: 'PUC Certificate Number',
    docNumberPlaceholder: 'PUC-MH12-2026-7890',
    hasExpiry: true,
    expiryLabel: 'PUC Valid Till (Expiry Date)',
    expiryPlaceholder: '18/02/2027',
    badgeText: 'BS-VI Compliant',
    badgeColor: '#10B981',
    requiresBackSide: false,
    extraField1Label: 'Emission Norm',
    extraField1Placeholder: 'BS-VI',
    guidelines: [
      'Valid RTO certified emission test certificate',
      'Validity date must be active',
    ],
  },
  police_verification: {
    title: 'Police Verification Clearance',
    label: 'Police Background Verification',
    docNumberLabel: 'Verification Ref. Number',
    docNumberPlaceholder: 'PV-PUN-2024-5541',
    hasExpiry: true,
    expiryLabel: 'Clearance Valid Upto',
    expiryPlaceholder: '09/01/2027',
    badgeText: 'No Criminal Precedent',
    badgeColor: '#8B5CF6',
    requiresBackSide: false,
    extraField1Label: 'Issuing Police Station',
    extraField1Placeholder: 'Shivajinagar Police Station, Pune',
    guidelines: [
      'Official police clearance certificate or character certificate',
      'Police commissionerate stamp must be visible',
    ],
  },
  vehicle_photo: {
    title: 'Vehicle Asset Verification',
    label: 'Vehicle Photo & Inspection',
    docNumberLabel: 'Vehicle Registration Number',
    docNumberPlaceholder: 'MH12 AB 8686',
    hasExpiry: false,
    badgeText: 'Physical Inspection',
    badgeColor: '#3B82F6',
    requiresBackSide: true,
    extraField1Label: 'Vehicle Exterior Color',
    extraField1Placeholder: 'White / Silver',
    guidelines: [
      'Front view must clearly show license plate and headlights',
      'Back view must show clean interior seats and boot space',
    ],
  },
}

export default function DocumentUploadScreen() {
  const { theme, isDark } = useTheme()
  const { doc_type = 'aadhaar' } = useLocalSearchParams<{ doc_type: string }>()

  const config = DOC_CONFIGS[doc_type] || DOC_CONFIGS.aadhaar

  const [docNumber, setDocNumber] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [extraField1, setExtraField1] = useState('')
  const [extraField2, setExtraField2] = useState('')
  const [frontUri, setFrontUri] = useState<string | null>(null)
  const [backUri, setBackUri] = useState<string | null>(null)
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front')
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewUri, setPreviewUri] = useState<string | null>(null)
  const [previewTitle, setPreviewTitle] = useState('')

  useEffect(() => {
    setDocNumber('')
    setExpiryDate('')
    setExtraField1('')
    setExtraField2('')
    setFrontUri(null)
    setBackUri(null)

    const loadDriverDefaultsAndDoc = async () => {
      try {
        // Pre-fill profile defaults from driver profile
        const profileRes = await driverApi.getProfile().catch(() => null)
        const p = profileRes?.data?.data || profileRes?.data
        if (p?.full_name) {
          setExtraField1(p.full_name)
        }

        const res = await kycApi.getDocumentDetails(doc_type).catch(() => null)
        const doc = res?.data?.data || res?.data
        if (doc) {
          if (doc.document_number) setDocNumber(String(doc.document_number))
          if (config.hasExpiry && doc.expires_at) {
            const parts = String(doc.expires_at).split('-')
            if (parts.length === 3) setExpiryDate(`${parts[2]}/${parts[1]}/${parts[0]}`)
            else setExpiryDate(String(doc.expires_at))
          }
          const meta = doc.metadata_json || {}
          if (meta.extra_field_1) setExtraField1(meta.extra_field_1)
          if (meta.extra_field_2) setExtraField2(meta.extra_field_2)

          const pUrl = doc.access_url || doc.file_path || doc.preview_url
          if (pUrl) {
            setFrontUri(pUrl)
          }
          const bUrl = meta.back_url || doc.back_url
          if (bUrl) {
            setBackUri(bUrl)
          }
        }
      } catch (e) {
        console.warn('[DocUpload] Error loading doc details:', e)
      }
    }
    loadDriverDefaultsAndDoc()
  }, [doc_type])

  const handlePickImage = async (useCamera: boolean) => {
    setShowPhotoModal(false)
    try {
      const permission = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Camera / Gallery access is required to capture document photos.')
        return
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.85,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.85,
          })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri
        if (activeSide === 'front') {
          setFrontUri(selectedUri)
        } else {
          setBackUri(selectedUri)
        }
      }
    } catch (e) {
      console.warn('[DocUpload] Error picking photo:', e)
    }
  }

  const handleOpenCard = (side: 'front' | 'back') => {
    setActiveSide(side)
    setShowPhotoModal(true)
  }

  const handlePreview = (side: 'front' | 'back') => {
    const uri = side === 'front' ? frontUri : backUri
    if (uri) {
      setPreviewUri(uri)
      setPreviewTitle(`${config.label} (${side === 'front' ? 'Front Side' : 'Back Side'})`)
      setShowPreviewModal(true)
    }
  }

  const isLocalUri = (uri: string | null): boolean => {
    if (!uri) return false
    return !uri.startsWith('http://') && !uri.startsWith('https://')
  }

  const handleSubmit = async () => {
    if (!frontUri && !backUri) {
      Alert.alert('Please Attach Photo', `Please capture or select the front side photo of your ${config.label}.`)
      return
    }

    if (!docNumber.trim()) {
      Alert.alert('Document Number Required', `Please enter your ${config.docNumberLabel}.`)
      return
    }

    if (config.hasExpiry && !expiryDate.trim()) {
      Alert.alert('Expiry Date Required', `Please enter the valid expiry / fitness date for ${config.label}.`)
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()

      // Only append binary file payload if user captured/selected a new local file
      if (frontUri && isLocalUri(frontUri)) {
        const filename = frontUri.split('/').pop() || `${doc_type}.jpg`
        const match = /\.(\w+)$/.exec(filename)
        const type = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg'
        formData.append('file', {
          uri: frontUri,
          name: filename,
          type,
        } as any)
      }

      if (config.requiresBackSide && backUri && isLocalUri(backUri)) {
        const bFilename = backUri.split('/').pop() || `${doc_type}_back.jpg`
        const bMatch = /\.(\w+)$/.exec(bFilename)
        const bType = bMatch ? `image/${bMatch[1].toLowerCase()}` : 'image/jpeg'
        formData.append('back_file', {
          uri: backUri,
          name: bFilename,
          type: bType,
        } as any)
      }

      if (docNumber.trim()) formData.append('document_number', docNumber.trim())
      if (config.hasExpiry && expiryDate.trim()) {
        const parts = expiryDate.trim().split('/')
        if (parts.length === 3) {
          formData.append('expires_at', `${parts[2]}-${parts[1]}-${parts[0]}`)
        } else {
          formData.append('expires_at', expiryDate.trim())
        }
      }

      if (extraField1.trim()) formData.append('extra_field_1', extraField1.trim())
      if (extraField2.trim()) formData.append('extra_field_2', extraField2.trim())

      const res = await kycApi.uploadDocument(doc_type, formData)
      const uploadedData = res.data?.data || res.data

      if (uploadedData?.access_url || uploadedData?.file_path || uploadedData?.preview_url) {
        setFrontUri(uploadedData.access_url || uploadedData.file_path || uploadedData.preview_url)
      }
      if (uploadedData?.back_url) {
        setBackUri(uploadedData.back_url)
      }

      Alert.alert(
        'Upload Successful',
        `${config.title} details saved and submitted with authentic verified fields.`,
        [
          { text: 'KYC Hub', onPress: () => router.push('/kyc/status' as any) },
          { text: 'Done', style: 'default' },
        ]
      )
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.response?.data?.message || e.message || 'Failed to upload document.'
      Alert.alert('Upload Failed', msg, [{ text: 'OK' }])
    } finally {
      setUploading(false)
    }
  }

  const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: isDark ? '#080C17' : '#F8FAFC' },
    safeArea: { flex: 1 },

    // Header
    header: {
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 12,
    },
    topTag: { color: '#3B82F6', fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textAlign: 'center', marginBottom: 6 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: isDark ? '#FFFFFF' : '#0F172A', fontSize: 17, fontWeight: '800' },

    scrollContent: { paddingHorizontal: 18, paddingBottom: 40 },

    // Top Badge Banner
    badgeBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59,130,246,0.2)' : '#E2E8F0',
      marginBottom: 14,
    },
    badgeText: { color: config.badgeColor, fontSize: 12, fontWeight: '800' },
    badgeSub: { color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: '600' },

    // Form inputs
    fieldGroup: { marginTop: 12 },
    fieldLabel: { color: isDark ? '#94A3B8' : '#64748B', fontSize: 12, fontWeight: '700', marginBottom: 6 },
    inputGlowBox: {
      height: 50,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: '#3B82F6',
      backgroundColor: isDark ? 'rgba(15,23,42,0.8)' : '#FFFFFF',
      paddingHorizontal: 16,
      justifyContent: 'center',
      shadowColor: '#3B82F6',
      shadowOpacity: 0.2,
      shadowRadius: 5,
      elevation: 2,
    },
    inputText: {
      color: isDark ? '#FFFFFF' : '#0F172A',
      fontSize: 15,
      fontWeight: '700',
    },
    noExpiryNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : '#ECFDF5',
      borderRadius: 12,
      padding: 10,
      marginTop: 10,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(16,185,129,0.25)' : '#A7F3D0',
    },
    noExpiryText: { color: '#10B981', fontSize: 11, fontWeight: '700', flex: 1 },

    // Dual Upload Cards Row
    cardsRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 18,
    },
    uploadCard: {
      flex: 1,
      height: 135,
      borderRadius: 16,
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      borderWidth: 1.5,
      borderColor: '#3B82F6',
      padding: 8,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    uploadCardDashed: {
      flex: 1,
      height: 135,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC',
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: '#3B82F6',
      padding: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardSideTitle: { color: isDark ? '#E2E8F0' : '#334155', fontSize: 11, fontWeight: '700', marginBottom: 4 },
    previewThumb: { width: '100%', height: 72, borderRadius: 8, marginBottom: 4 },
    uploadedPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    uploadedText: { color: '#10B981', fontSize: 11, fontWeight: '700' },
    dashedLabel: { color: '#60A5FA', fontSize: 10, fontWeight: '800', textAlign: 'center', marginTop: 6, letterSpacing: 0.5 },

    // Guidelines Card
    guidelinesCard: {
      marginTop: 20,
      padding: 14,
      borderRadius: 16,
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0',
    },
    guidelinesTitle: { color: isDark ? '#FFFFFF' : '#0F172A', fontSize: 13, fontWeight: '800', marginBottom: 10 },
    guideRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    guideText: { color: isDark ? '#94A3B8' : '#475569', fontSize: 12, fontWeight: '600', flex: 1 },

    // Submit Button
    submitBtn: {
      marginTop: 24,
      height: 50,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#3B82F6',
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 4,
    },
    submitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
    modalContent: {
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 22,
      paddingBottom: 36,
    },
    modalTitle: { fontSize: 17, fontWeight: '800', color: isDark ? '#FFFFFF' : '#0F172A', marginBottom: 16 },
    modalOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
    },
    modalOptionText: { fontSize: 15, fontWeight: '600', color: isDark ? '#FFFFFF' : '#0F172A' },
    modalCancelBtn: {
      marginTop: 14,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
      alignItems: 'center',
    },
    modalCancelText: { fontSize: 15, fontWeight: '700', color: '#64748B' },

    // Fullscreen Preview Modal
    previewModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.88)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    previewModalContent: {
      width: '100%',
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
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
      fontSize: 17,
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
    previewImageContainer: {
      width: '100%',
      height: 280,
      borderRadius: 16,
      backgroundColor: isDark ? '#020617' : '#000000',
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewImage: {
      width: '100%',
      height: '100%',
    },
    previewModalFooter: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 18,
    },
    previewRetakeBtn: {
      flex: 1,
      height: 44,
      borderRadius: 12,
      backgroundColor: '#2563EB',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    previewRetakeBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
    previewCloseBtn: {
      paddingHorizontal: 18,
      height: 44,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewCloseBtnText: {
      color: isDark ? '#94A3B8' : '#475569',
      fontSize: 14,
      fontWeight: '700',
    },
  })

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#080C17" />

      <SafeAreaView style={styles.safeArea}>
        {/* Top Header */}
        <View style={styles.header}>
          <Text style={styles.topTag}>OFFICIAL DRIVER KYC</Text>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Feather name="chevron-left" size={24} color={isDark ? '#FFFFFF' : '#0F172A'} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{config.title}</Text>
            <View style={{ width: 36 }} />
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Top Rule Badge Banner */}
          <View style={styles.badgeBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.badgeText}>{config.badgeText}</Text>
              <Text style={styles.badgeSub}>{config.label}</Text>
            </View>
            <Ionicons name="shield-checkmark" size={22} color={config.badgeColor} />
          </View>

          {/* Document Number Input */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{config.docNumberLabel}:</Text>
            <View style={styles.inputGlowBox}>
              <TextInput
                style={styles.inputText}
                value={docNumber}
                onChangeText={setDocNumber}
                placeholder={config.docNumberPlaceholder}
                placeholderTextColor="#64748B"
                autoCapitalize="characters"
              />
            </View>
          </View>

          {/* Optional Extra Fields (Name, Father Name, Vehicle Specs) */}
          {config.extraField1Label && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{config.extraField1Label}:</Text>
              <View style={styles.inputGlowBox}>
                <TextInput
                  style={styles.inputText}
                  value={extraField1}
                  onChangeText={setExtraField1}
                  placeholder={config.extraField1Placeholder}
                  placeholderTextColor="#64748B"
                />
              </View>
            </View>
          )}

          {config.extraField2Label && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{config.extraField2Label}:</Text>
              <View style={styles.inputGlowBox}>
                <TextInput
                  style={styles.inputText}
                  value={extraField2}
                  onChangeText={setExtraField2}
                  placeholder={config.extraField2Placeholder}
                  placeholderTextColor="#64748B"
                />
              </View>
            </View>
          )}

          {/* Expiry Date Input — STRICTLY conditionally rendered! */}
          {config.hasExpiry ? (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{config.expiryLabel || 'Expiry Date (DD/MM/YYYY)'}:</Text>
              <View style={styles.inputGlowBox}>
                <TextInput
                  style={styles.inputText}
                  value={expiryDate}
                  onChangeText={setExpiryDate}
                  placeholder={config.expiryPlaceholder || 'DD/MM/YYYY'}
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                />
              </View>
            </View>
          ) : (
            <View style={styles.noExpiryNotice}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              <Text style={styles.noExpiryText}>
                No Expiry Date Required: {config.label} has permanent lifetime validity in India.
              </Text>
            </View>
          )}

          {/* Dual Upload Cards (Front Side & Back Side) */}
          <View style={styles.cardsRow}>
            {/* Front Card */}
            <TouchableOpacity
              style={frontUri ? styles.uploadCard : styles.uploadCardDashed}
              onPress={() => handleOpenCard('front')}
              activeOpacity={0.8}
            >
              <Text style={styles.cardSideTitle}>Front Side Photo</Text>
              {frontUri ? (
                <>
                  <Image source={{ uri: frontUri }} style={styles.previewThumb} resizeMode="cover" />
                  <View style={styles.uploadedPill}>
                    <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                    <Text style={styles.uploadedText}>Captured • Tap Options</Text>
                  </View>
                </>
              ) : (
                <>
                  <Feather name="camera" size={28} color="#3B82F6" />
                  <Text style={styles.dashedLabel}>TAP TO CAPTURE{'\n'}FRONT SIDE</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Back Card (if required) */}
            {config.requiresBackSide ? (
              <TouchableOpacity
                style={backUri ? styles.uploadCard : styles.uploadCardDashed}
                onPress={() => handleOpenCard('back')}
                activeOpacity={0.8}
              >
                <Text style={styles.cardSideTitle}>Back Side Photo</Text>
                {backUri ? (
                  <>
                    <Image source={{ uri: backUri }} style={styles.previewThumb} resizeMode="cover" />
                    <View style={styles.uploadedPill}>
                      <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                      <Text style={styles.uploadedText}>Captured • Tap Options</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Feather name="camera" size={28} color="#3B82F6" />
                    <Text style={styles.dashedLabel}>TAP TO CAPTURE{'\n'}BACK SIDE</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={[styles.uploadCard, { opacity: 0.6, borderColor: 'rgba(148,163,184,0.3)' }]}>
                <Ionicons name="document-text-outline" size={28} color="#94A3B8" />
                <Text style={[styles.cardSideTitle, { marginTop: 6, textAlign: 'center' }]}>
                  Single Sided{'\n'}Document
                </Text>
              </View>
            )}
          </View>

          {/* Guidelines */}
          <View style={styles.guidelinesCard}>
            <Text style={styles.guidelinesTitle}>Verification Guidelines</Text>
            {config.guidelines.map((g, idx) => (
              <View key={idx} style={styles.guideRow}>
                <Feather name="check-circle" size={14} color="#10B981" />
                <Text style={styles.guideText}>{g}</Text>
              </View>
            ))}
          </View>

          {/* Submit Button */}
          <TouchableOpacity activeOpacity={0.85} onPress={handleSubmit} disabled={uploading}>
            <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.submitBtn}>
              {uploading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Submit {config.label} for Verification</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      {/* Photo Options Modal */}
      <Modal
        visible={showPhotoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPhotoModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {activeSide === 'front' ? 'Front Side' : 'Back Side'} — {config.label}
            </Text>

            {(activeSide === 'front' ? frontUri : backUri) ? (
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setShowPhotoModal(false)
                  handlePreview(activeSide)
                }}
              >
                <Feather name="eye" size={20} color="#3B82F6" />
                <Text style={[styles.modalOptionText, { color: '#3B82F6', fontWeight: '700' }]}>
                  View Fullscreen Preview
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={styles.modalOption} onPress={() => handlePickImage(true)}>
              <Feather name="camera" size={20} color="#10B981" />
              <Text style={styles.modalOptionText}>
                {(activeSide === 'front' ? frontUri : backUri) ? 'Retake Photo with Camera' : 'Take Photo with Camera'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOption} onPress={() => handlePickImage(false)}>
              <Feather name="image" size={20} color="#8B5CF6" />
              <Text style={styles.modalOptionText}>Choose from Photo Gallery</Text>
            </TouchableOpacity>

            {(activeSide === 'front' ? frontUri : backUri) ? (
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  if (activeSide === 'front') setFrontUri(null)
                  else setBackUri(null)
                  setShowPhotoModal(false)
                }}
              >
                <Feather name="trash-2" size={20} color="#EF4444" />
                <Text style={[styles.modalOptionText, { color: '#EF4444' }]}>Remove Photo</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowPhotoModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Fullscreen Document Preview Modal */}
      <Modal
        visible={showPreviewModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPreviewModal(false)}
      >
        <View style={styles.previewModalOverlay}>
          <View style={styles.previewModalContent}>
            <View style={styles.previewModalHeader}>
              <Text style={styles.previewModalTitle} numberOfLines={1}>
                {previewTitle || 'Document Preview'}
              </Text>
              <TouchableOpacity
                style={styles.previewModalCloseBtn}
                onPress={() => setShowPreviewModal(false)}
              >
                <Feather name="x" size={20} color={isDark ? '#FFFFFF' : '#0F172A'} />
              </TouchableOpacity>
            </View>

            <View style={styles.previewImageContainer}>
              {previewUri ? (
                <Image
                  source={{ uri: previewUri }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              ) : null}
            </View>

            <View style={styles.previewModalFooter}>
              <TouchableOpacity
                style={styles.previewRetakeBtn}
                onPress={() => {
                  setShowPreviewModal(false)
                  setShowPhotoModal(true)
                }}
              >
                <Feather name="camera" size={16} color="#FFFFFF" />
                <Text style={styles.previewRetakeBtnText}>Retake Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.previewCloseBtn}
                onPress={() => setShowPreviewModal(false)}
              >
                <Text style={styles.previewCloseBtnText}>Close Preview</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}
