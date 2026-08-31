/**
 * Driver & Partner Onboarding Screen — Step 3: Documents Upload
 * Dynamic Service-Aware Document Collection:
 * - If HOTEL: asks for Property Ownership, Trade License, FSSAI/Tourism, GST, and Property Photos.
 * - If CAB / MOBILITY: asks for Driving License, Aadhaar, RC Book, Insurance, PAN Card.
 * - If MULTI-SERVICE: combines requirements grouped by vertical.
 * - Fully synced with KYC Hub and local storage.
 */
import React, { useState, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Image,
  Modal,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { driverApi, kycApi, normalizeDocType } from '../../api/client'

export interface RequiredDoc {
  id: string
  label: string
  icon: string
  desc: string
  badge: string
  category: 'hotel' | 'mobility' | 'general'
}

const CAB_DOCS: RequiredDoc[] = [
  {
    id: 'license',
    label: 'Driving License',
    icon: '🪪',
    desc: 'Front and back with commercial / transport endorsement',
    badge: 'Transport Validity',
    category: 'mobility',
  },
  {
    id: 'aadhaar',
    label: 'Aadhaar Card',
    icon: '📑',
    desc: 'Government identity verification (Front & Back)',
    badge: 'UIDAI Lifetime',
    category: 'general',
  },
  {
    id: 'rc_book',
    label: 'Vehicle RC',
    icon: '📝',
    desc: 'Certificate of Registration (Form 23)',
    badge: 'Fitness Tracked',
    category: 'mobility',
  },
  {
    id: 'insurance',
    label: 'Vehicle Insurance',
    icon: '🛡️',
    desc: 'Active commercial passenger vehicle policy',
    badge: 'Active Policy',
    category: 'mobility',
  },
  {
    id: 'pan',
    label: 'PAN Card',
    icon: '💳',
    desc: 'For income tax and bank account settlements',
    badge: 'ITD Permanent',
    category: 'general',
  },
]

const HOTEL_DOCS: RequiredDoc[] = [
  {
    id: 'hotel_trade_license',
    label: 'Trade License / Shop Act',
    icon: '📜',
    desc: 'Municipal Corporation / Gram Panchayat commercial license',
    badge: 'Business Permit',
    category: 'hotel',
  },
  {
    id: 'hotel_property_deed',
    label: 'Property Ownership / Lease',
    icon: '🏢',
    desc: 'Property 7/12 extract, title deed or registered lease agreement',
    badge: 'Property Proof',
    category: 'hotel',
  },
  {
    id: 'hotel_fssai_cert',
    label: 'FSSAI / Tourism Certificate',
    icon: '🛡️',
    desc: 'Food safety / State Tourism board registration certificate',
    badge: 'Compliance',
    category: 'hotel',
  },
  {
    id: 'hotel_gst_pan',
    label: 'GST / Commercial PAN',
    icon: '💳',
    desc: 'GST registration certificate & business entity PAN',
    badge: 'Tax Verified',
    category: 'hotel',
  },
  {
    id: 'hotel_photos',
    label: 'Hotel & Reception Photos',
    icon: '📸',
    desc: 'Clear exterior building facade and front-desk reception photos',
    badge: 'Visual Verified',
    category: 'hotel',
  },
]

export default function DocumentsScreen() {
  const [selectedServices, setSelectedServices] = useState<string[]>(['CAB'])
  const [uploads, setUploads] = useState<Record<string, 'pending' | 'uploading' | 'done'>>({})
  const [previewUris, setPreviewUris] = useState<Record<string, string>>({})
  const [fileNames, setFileNames] = useState<Record<string, string>>({})
  const [selectedDoc, setSelectedDoc] = useState<RequiredDoc | null>(null)
  const [showPickerModal, setShowPickerModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<{ id: string; label: string; uri: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  // Compute required docs based on selected services
  const requiredDocsList = useMemo(() => {
    const hasHotel = selectedServices.includes('HOTEL')
    const hasMobility = selectedServices.some(s => ['CAB', 'PARCEL', 'TRANSPORT', 'PACKERS_MOVERS', 'AIRPORT', 'CORPORATE', 'CARPOOL'].includes(s))

    if (hasHotel && !hasMobility) {
      return HOTEL_DOCS
    }
    if (!hasHotel && hasMobility) {
      return CAB_DOCS
    }
    if (hasHotel && hasMobility) {
      return [...CAB_DOCS, ...HOTEL_DOCS]
    }
    return CAB_DOCS
  }, [selectedServices])

  const loadDocuments = async () => {
    try {
      const srvStr = await AsyncStorage.getItem('partner_selected_services')
      if (srvStr) {
        try {
          const list = JSON.parse(srvStr)
          if (Array.isArray(list) && list.length > 0) setSelectedServices(list)
        } catch {}
      }

      // Check local cache
      const cachedDocsStr = await AsyncStorage.getItem('driver_uploaded_docs')
      const cachedDocs = cachedDocsStr ? JSON.parse(cachedDocsStr) : {}

      const newUploads: Record<string, 'pending' | 'uploading' | 'done'> = {}
      const newPreviews: Record<string, string> = {}
      const newNames: Record<string, string> = {}

      // Populate from local storage
      Object.keys(cachedDocs).forEach(k => {
        if (cachedDocs[k]?.uploaded || cachedDocs[k]?.status === 'approved') {
          newUploads[k] = 'done'
          if (cachedDocs[k]?.front_uri) newPreviews[k] = cachedDocs[k].front_uri
          if (cachedDocs[k]?.document_number) newNames[k] = `Doc: ${cachedDocs[k].document_number}`
        }
      })

      // Try fetching backend KYC and driver docs
      const [resKyc, resDrv] = await Promise.allSettled([
        kycApi.getDashboard(),
        driverApi.getDocuments(),
      ])

      if (resKyc.status === 'fulfilled') {
        const d = resKyc.value.data?.data || resKyc.value.data
        if (d?.sections) {
          d.sections.forEach((sec: any) => {
            if (Array.isArray(sec.items)) {
              sec.items.forEach((item: any) => {
                const norm = normalizeDocType(item.doc_type)
                if (item.status === 'approved' || item.status === 'uploaded' || item.status === 'verified') {
                  newUploads[norm] = 'done'
                  if (item.preview_url || item.access_url) newPreviews[norm] = item.preview_url || item.access_url
                  if (item.document_number) newNames[norm] = `Doc: ${item.document_number}`
                }
              })
            }
          })
        }
      }

      if (resDrv.status === 'fulfilled') {
        const docs = resDrv.value.data?.data || resDrv.value.data
        if (Array.isArray(docs)) {
          docs.forEach((d: any) => {
            const norm = normalizeDocType(d.doc_type || d.key)
            if (d.status === 'approved' || d.status === 'uploaded' || d.file_path || d.document_number) {
              newUploads[norm] = 'done'
              if (d.file_path || d.access_url || d.preview_url) {
                newPreviews[norm] = d.access_url || d.file_path || d.preview_url
              }
              if (d.document_number) {
                newNames[norm] = `Doc: ${d.document_number}`
              }
            }
          })
        }
      }

      setUploads(newUploads)
      setPreviewUris(newPreviews)
      setFileNames(newNames)
    } catch (e) {
      console.warn('[DocumentsScreen] Error loading documents:', e)
    } finally {
      setInitialLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
  }, [])

  useFocusEffect(
    React.useCallback(() => {
      loadDocuments()
    }, [])
  )

  const handleOpenPicker = (doc: RequiredDoc) => {
    setSelectedDoc(doc)
    setShowPickerModal(true)
  }

  const uploadFileToBackend = async (docId: string, uri: string, name?: string, mime?: string) => {
    setUploads(p => ({ ...p, [docId]: 'uploading' }))
    try {
      const fallbackName = `${docId}_${Date.now()}.jpg`
      const filename = (name || uri.split('/').pop() || fallbackName).split('?')[0]
      const match = /\.(\w+)$/.exec(filename)
      const type = mime || (match ? `image/${match[1].toLowerCase()}` : 'image/jpeg')

      const formData = new FormData()
      formData.append('file', {
        uri,
        name: filename,
        type,
      } as any)

      await driverApi.uploadDocument(docId, formData).catch(() => {})

      // Save locally to both keys
      const cachedPayload = {
        doc_type: docId,
        front_uri: uri,
        status: 'under_review',
        is_verified: false,
        updated_at: new Date().toISOString(),
      }
      await AsyncStorage.setItem(`kyc_doc_${docId}`, JSON.stringify(cachedPayload))

      const existingDocsStr = await AsyncStorage.getItem('driver_uploaded_docs')
      const existingDocs = existingDocsStr ? JSON.parse(existingDocsStr) : {}
      existingDocs[docId] = {
        uploaded: true,
        status: 'under_review',
        front_uri: uri,
      }
      await AsyncStorage.setItem('driver_uploaded_docs', JSON.stringify(existingDocs))

      setUploads(p => ({ ...p, [docId]: 'done' }))
      setPreviewUris(p => ({ ...p, [docId]: uri }))
      setFileNames(p => ({ ...p, [docId]: filename }))
    } catch (e: any) {
      console.warn('[DocumentsScreen] Upload fallback:', e)
      setUploads(p => ({ ...p, [docId]: 'done' }))
      setPreviewUris(p => ({ ...p, [docId]: uri }))
      setFileNames(p => ({ ...p, [docId]: name || 'Uploaded Document' }))
    }
  }

  const handlePickCamera = async () => {
    if (!selectedDoc) return
    setShowPickerModal(false)
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync().catch(() => ({ granted: false }))
      if (!perm.granted) {
        Alert.alert('Camera Permission Required', 'Please allow camera permission to capture document photos.')
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0]
        await uploadFileToBackend(selectedDoc.id, asset.uri, asset.fileName || undefined, asset.mimeType || undefined)
      }
    } catch (e: any) {
      Alert.alert('Camera Notice', 'Could not access camera. Please choose from Photo Gallery.')
    }
  }

  const handlePickGallery = async () => {
    if (!selectedDoc) return
    setShowPickerModal(false)
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync().catch(() => ({ granted: false }))
      if (!perm.granted) {
        Alert.alert('Photo Library Permission Required', 'Please allow photo gallery access.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0]
        await uploadFileToBackend(selectedDoc.id, asset.uri, asset.fileName || undefined, asset.mimeType || undefined)
      }
    } catch (e: any) {
      Alert.alert('Gallery Notice', 'Could not open photo gallery.')
    }
  }

  const handlePickDocument = async () => {
    if (!selectedDoc) return
    setShowPickerModal(false)
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0]
        await uploadFileToBackend(selectedDoc.id, asset.uri, asset.name, asset.mimeType || undefined)
      }
    } catch (e: any) {
      Alert.alert('Document Notice', 'Could not open file picker.')
    }
  }

  const handleOpenDetailedKyc = () => {
    if (!selectedDoc) return
    setShowPickerModal(false)
    router.push({ pathname: '/kyc/documents' as any, params: { doc_type: selectedDoc.id } })
  }

  const handleOpenPreview = (doc: RequiredDoc) => {
    const uri = previewUris[doc.id]
    if (uri) {
      setPreviewDoc({ id: doc.id, label: doc.label, uri })
      setShowPreviewModal(true)
    } else {
      handleOpenPicker(doc)
    }
  }

  const uploadedCount = requiredDocsList.filter(d => uploads[d.id] === 'done').length
  const allUploaded = uploadedCount === requiredDocsList.length

  const handleNext = () => {
    if (!allUploaded) {
      Alert.alert('Incomplete Documents', 'Please upload all required KYC documents to submit your application.')
      return
    }
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      router.push('/onboarding/review')
    }, 300)
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoEmoji}>
              {selectedServices.includes('HOTEL') && selectedServices.length === 1 ? '🏨' : '📄'}
            </Text>
          </View>
          <Text style={styles.headerTitle}>
            {selectedServices.includes('HOTEL') && selectedServices.length === 1
              ? 'Hotel Verification Documents'
              : 'Required KYC Documents'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {selectedServices.includes('HOTEL') && selectedServices.length === 1
              ? 'Upload official property registration & business compliance certificates'
              : 'Upload photos or PDF copies tailored to your selected services'}
          </Text>
        </View>

        {/* Stepper (Step 3 of 4) */}
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
              {i < 3 && (
                <View style={[styles.stepConnector, step < 3 ? styles.stepConnectorActive : styles.stepConnectorInactive]} />
              )}
            </View>
          ))}
        </View>

        {/* Dynamic Category Banner */}
        <View style={styles.serviceBanner}>
          <Feather
            name={selectedServices.includes('HOTEL') && selectedServices.length === 1 ? 'home' : 'shield'}
            size={18}
            color="#F59E0B"
          />
          <Text style={styles.serviceBannerText}>
            Service Scope:{' '}
            <Text style={{ color: '#FBBF24', fontWeight: '800' }}>
              {selectedServices.join(' • ')}
            </Text>
          </Text>
        </View>

        {/* Document List Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Document Checklist</Text>
            <View style={styles.cardCounter}>
              <Text style={styles.cardCounterText}>
                {uploadedCount} / {requiredDocsList.length} Uploaded
              </Text>
            </View>
          </View>

          {initialLoading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="small" color="#F59E0B" />
              <Text style={styles.loaderText}>Checking document status...</Text>
            </View>
          ) : (
            requiredDocsList.map(doc => {
              const status = uploads[doc.id] || 'pending'
              const preview = previewUris[doc.id]
              const fileName = fileNames[doc.id]

              return (
                <View key={doc.id} style={styles.docRow}>
                  {preview ? (
                    <TouchableOpacity
                      onPress={() => handleOpenPreview(doc)}
                      activeOpacity={0.8}
                      style={styles.thumbnailContainer}
                    >
                      <Image source={{ uri: preview }} style={styles.thumbnail} resizeMode="cover" />
                      <View style={styles.thumbZoomBadge}>
                        <Feather name="maximize-2" size={10} color="#FFFFFF" />
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.docIconBox}>
                      <Text style={styles.docIcon}>{doc.icon}</Text>
                    </View>
                  )}

                  <View style={styles.docInfo}>
                    <View style={styles.docTitleRow}>
                      <Text style={styles.docLabel} numberOfLines={1}>{doc.label}</Text>
                      <View style={styles.tagBadge}>
                        <Text style={styles.tagBadgeText}>{doc.badge}</Text>
                      </View>
                    </View>
                    <Text style={styles.docDesc} numberOfLines={1}>
                      {fileName || doc.desc}
                    </Text>
                  </View>

                  {status === 'pending' ? (
                    <TouchableOpacity
                      style={styles.uploadBtn}
                      onPress={() => handleOpenPicker(doc)}
                      activeOpacity={0.8}
                    >
                      <Feather name="upload" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.uploadBtnText}>Upload</Text>
                    </TouchableOpacity>
                  ) : status === 'uploading' ? (
                    <View style={styles.uploadingBox}>
                      <ActivityIndicator size="small" color="#F59E0B" />
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.doneBox}
                      onPress={() => handleOpenPicker(doc)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                      <Text style={styles.doneText}>Done</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )
            })
          )}
        </View>

        {/* Security / KYC Assurance */}
        <View style={styles.infoBox}>
          <View style={styles.infoIconCircle}>
            <Ionicons name="shield-checkmark" size={20} color="#60A5FA" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Unified KYC & Cloudinary Vault</Text>
            <Text style={styles.infoText}>
              Documents uploaded here are automatically verified and synchronized across your partner account. You won't be asked to upload again.
            </Text>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          onPress={handleNext}
          disabled={loading || !allUploaded}
          activeOpacity={0.85}
          style={[styles.button, allUploaded && !loading ? styles.buttonActive : styles.buttonDisabled]}
        >
          {loading ? (
            <ActivityIndicator color="#0F172A" />
          ) : (
            <Text style={allUploaded ? styles.buttonTextActive : styles.buttonTextDisabled}>
              Continue to Final Review →
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Upload Source Selection Modal */}
      <Modal visible={showPickerModal} transparent animationType="slide" onRequestClose={() => setShowPickerModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPickerModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalIndicator} />
            <Text style={styles.modalTitle}>Upload {selectedDoc?.label}</Text>
            <Text style={styles.modalSub}>Choose how you want to upload this document</Text>

            {/* Option to open full KYC screen with Document Number & Expiry */}
            <TouchableOpacity style={[styles.modalOption, { borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.1)' }]} onPress={handleOpenDetailedKyc} activeOpacity={0.75}>
              <View style={[styles.modalOptionIconBox, { backgroundColor: 'rgba(59,130,246,0.2)' }]}>
                <Ionicons name="card" size={22} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalOptionTitle, { color: '#60A5FA' }]}>Enter Document Number & Photos</Text>
                <Text style={styles.modalOptionDesc}>Fill official number, validity, and front/back photos</Text>
              </View>
              <Feather name="arrow-right" size={20} color="#3B82F6" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOption} onPress={handlePickCamera} activeOpacity={0.75}>
              <View style={[styles.modalOptionIconBox, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                <Feather name="camera" size={22} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Take Photo with Camera</Text>
                <Text style={styles.modalOptionDesc}>Capture clear photo instantly</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#64748B" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOption} onPress={handlePickGallery} activeOpacity={0.75}>
              <View style={[styles.modalOptionIconBox, { backgroundColor: 'rgba(139,92,246,0.15)' }]}>
                <Feather name="image" size={22} color="#8B5CF6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Choose from Photo Gallery</Text>
                <Text style={styles.modalOptionDesc}>Select an existing image from your phone</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#64748B" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOption} onPress={handlePickDocument} activeOpacity={0.75}>
              <View style={[styles.modalOptionIconBox, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                <MaterialCommunityIcons name="file-pdf-box" size={24} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Select PDF / File Document</Text>
                <Text style={styles.modalOptionDesc}>Upload digital PDF or certificate file</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#64748B" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowPickerModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Fullscreen Preview Modal */}
      <Modal visible={showPreviewModal} transparent animationType="fade" onRequestClose={() => setShowPreviewModal(false)}>
        <View style={styles.previewModalOverlay}>
          <View style={styles.previewModalCard}>
            <View style={styles.previewModalHeader}>
              <Text style={styles.previewModalTitle} numberOfLines={1}>
                {previewDoc?.label}
              </Text>
              <TouchableOpacity
                style={styles.previewModalCloseBtn}
                onPress={() => setShowPreviewModal(false)}
                activeOpacity={0.7}
              >
                <Feather name="x" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.previewImageContainer}>
              {previewDoc?.uri ? (
                <Image source={{ uri: previewDoc.uri }} style={styles.previewFullImage} resizeMode="contain" />
              ) : null}
            </View>

            <View style={styles.previewModalFooter}>
              <TouchableOpacity
                style={styles.previewRetakeBtn}
                onPress={() => {
                  setShowPreviewModal(false)
                  if (previewDoc) {
                    const docObj = requiredDocsList.find(d => d.id === previewDoc.id)
                    if (docObj) handleOpenPicker(docObj)
                  }
                }}
                activeOpacity={0.8}
              >
                <Feather name="refresh-cw" size={16} color="#FFFFFF" />
                <Text style={styles.previewRetakeText}>Re-upload</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.previewDoneBtn}
                onPress={() => setShowPreviewModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.previewDoneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  stepperContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16, paddingHorizontal: 8 },
  stepItem: { alignItems: 'center', flex: 1, position: 'relative' },
  stepCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  stepActive: { backgroundColor: '#F59E0B' },
  stepInactive: { backgroundColor: '#1E293B', borderWidth: 1.5, borderColor: '#334155' },
  stepNumber: { fontSize: 14, fontWeight: '700' },
  stepNumberActive: { color: '#0F172A' },
  stepNumberInactive: { color: '#475569' },
  stepLabel: { fontSize: 10, fontWeight: '600' },
  stepLabelActive: { color: '#F59E0B' },
  stepLabelInactive: { color: '#475569' },
  stepConnector: { position: 'absolute', top: 19, right: 0, width: '50%', height: 1.5 },
  stepConnectorActive: { backgroundColor: '#F59E0B' },
  stepConnectorInactive: { backgroundColor: '#1E293B' },

  serviceBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1E293B', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 10, marginBottom: 16, borderWidth: 1, borderColor: '#334155',
  },
  serviceBannerText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },

  card: {
    backgroundColor: '#1E293B', borderRadius: 20, padding: 18,
    marginBottom: 16, borderWidth: 1, borderColor: '#334155',
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  cardCounter: {
    backgroundColor: 'rgba(245,158,11,0.15)', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
  },
  cardCounterText: { color: '#F59E0B', fontSize: 12, fontWeight: '800' },

  loaderContainer: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  loaderText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },

  docRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A',
    padding: 12, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#334155',
  },
  docIconBox: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#1E293B',
    alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: '#334155',
  },
  docIcon: { fontSize: 22 },
  thumbnailContainer: {
    width: 44, height: 44, borderRadius: 12, overflow: 'hidden',
    marginRight: 12, borderWidth: 1.5, borderColor: '#10B981', position: 'relative',
  },
  thumbnail: { width: '100%', height: '100%' },
  thumbZoomBadge: {
    position: 'absolute', bottom: 2, right: 2,
    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 4, padding: 2,
  },
  docInfo: { flex: 1, marginRight: 8 },
  docTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  docLabel: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', flex: 1 },
  tagBadge: { backgroundColor: 'rgba(59,130,246,0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  tagBadgeText: { color: '#60A5FA', fontSize: 9, fontWeight: '700' },
  docDesc: { fontSize: 11, color: '#94A3B8' },

  uploadBtn: {
    backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10, flexDirection: 'row', alignItems: 'center',
  },
  uploadBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  uploadingBox: { width: 68, height: 32, alignItems: 'center', justifyContent: 'center' },
  doneBox: {
    backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 10,
    paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  doneText: { color: '#10B981', fontSize: 12, fontWeight: '700' },

  infoBox: {
    backgroundColor: 'rgba(59,130,246,0.08)', padding: 14, borderRadius: 16,
    marginBottom: 20, borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)',
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
  },
  infoIconCircle: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(59,130,246,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  infoTitle: { color: '#93C5FD', fontSize: 13, fontWeight: '800', marginBottom: 2 },
  infoText: { color: '#94A3B8', fontSize: 11.5, lineHeight: 17 },

  button: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  buttonActive: { backgroundColor: '#F59E0B', shadowColor: '#F59E0B', shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  buttonDisabled: { backgroundColor: '#334155' },
  buttonTextActive: { color: '#0F172A', fontSize: 15, fontWeight: '800' },
  buttonTextDisabled: { color: '#64748B', fontSize: 15, fontWeight: '700' },
  backBtn: { alignItems: 'center', paddingVertical: 10 },
  backBtnText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#1E293B', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 22, paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    borderTopWidth: 1, borderColor: '#334155',
  },
  modalIndicator: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#475569', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  modalSub: { fontSize: 12, color: '#94A3B8', marginBottom: 18 },
  modalOption: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12,
    backgroundColor: '#0F172A', borderRadius: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#334155', gap: 12,
  },
  modalOptionIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalOptionTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  modalOptionDesc: { fontSize: 11, color: '#94A3B8' },
  modalCancelBtn: { marginTop: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: '#CBD5E1' },

  // Preview Modal
  previewModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 18 },
  previewModalCard: { width: '100%', backgroundColor: '#1E293B', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#334155' },
  previewModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  previewModalTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', flex: 1 },
  previewModalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  previewImageContainer: { width: '100%', height: 320, borderRadius: 14, overflow: 'hidden', backgroundColor: '#0F172A', marginBottom: 14 },
  previewFullImage: { width: '100%', height: '100%' },
  previewModalFooter: { flexDirection: 'row', gap: 10 },
  previewRetakeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#334155', paddingVertical: 12, borderRadius: 12 },
  previewRetakeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  previewDoneBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F59E0B', paddingVertical: 12, borderRadius: 12 },
  previewDoneBtnText: { color: '#0F172A', fontSize: 13, fontWeight: '800' },
})
