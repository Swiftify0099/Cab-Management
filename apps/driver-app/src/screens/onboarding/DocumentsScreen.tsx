/**
 * Driver Onboarding Screen — Step 3: Documents Upload
 * Crash-proof document & photo upload with Camera, Gallery, and PDF support
 */
import React, { useState, useEffect } from 'react'
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
import { router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { driverApi, normalizeDocType } from '../../api/client'

interface RequiredDoc {
  id: string
  label: string
  icon: string
  desc: string
  badge: string
}

const REQUIRED_DOCS: RequiredDoc[] = [
  {
    id: 'license',
    label: 'Driving License',
    icon: '🪪',
    desc: 'Front and back side with transport endorsement',
    badge: 'Transport Validity',
  },
  {
    id: 'aadhaar',
    label: 'Aadhaar Card',
    icon: '📑',
    desc: 'Government identity verification (Front & Back)',
    badge: 'UIDAI Lifetime',
  },
  {
    id: 'rc_book',
    label: 'Vehicle RC',
    icon: '📝',
    desc: 'Certificate of Registration (Form 23)',
    badge: 'Fitness Tracked',
  },
  {
    id: 'insurance',
    label: 'Vehicle Insurance',
    icon: '🛡️',
    desc: 'Active commercial passenger vehicle policy',
    badge: 'Active Policy',
  },
  {
    id: 'pan',
    label: 'PAN Card',
    icon: '💳',
    desc: 'For income tax and bank account settlements',
    badge: 'ITD Permanent',
  },
]

export default function DocumentsScreen() {
  const [uploads, setUploads] = useState<Record<string, 'pending' | 'uploading' | 'done'>>({
    license: 'pending',
    aadhaar: 'pending',
    rc_book: 'pending',
    insurance: 'pending',
    pan: 'pending',
  })
  const [previewUris, setPreviewUris] = useState<Record<string, string>>({})
  const [fileNames, setFileNames] = useState<Record<string, string>>({})
  const [selectedDoc, setSelectedDoc] = useState<RequiredDoc | null>(null)
  const [showPickerModal, setShowPickerModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<{ id: string; label: string; uri: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  // Fetch already uploaded documents on mount
  useEffect(() => {
    let isMounted = true
    const loadUploadedDocs = async () => {
      try {
        const res = await driverApi.getDocuments().catch(() => null)
        const docs = res?.data?.data || res?.data
        if (Array.isArray(docs) && isMounted) {
          const newUploads = { ...uploads }
          const newPreviews = { ...previewUris }
          docs.forEach((d: any) => {
            const normalized = normalizeDocType(d.doc_type)
            if (newUploads[normalized] !== undefined) {
              newUploads[normalized] = 'done'
              if (d.file_path) {
                newPreviews[normalized] = d.file_path
              }
            }
          })
          setUploads(newUploads)
          setPreviewUris(newPreviews)
        }
      } catch (e) {
        console.warn('[DocumentsScreen] Could not fetch uploaded documents:', e)
      } finally {
        if (isMounted) setInitialLoading(false)
      }
    }
    loadUploadedDocs()
    return () => {
      isMounted = false
    }
  }, [])

  const handleOpenPicker = (doc: RequiredDoc) => {
    setSelectedDoc(doc)
    setShowPickerModal(true)
  }

  const uploadFileToBackend = async (docId: string, uri: string, name?: string, mime?: string) => {
    setUploads(p => ({ ...p, [docId]: 'uploading' }))
    try {
      const cleanUri = uri
      const fallbackName = `${docId}_${Date.now()}.jpg`
      const filename = name || cleanUri.split('/').pop() || fallbackName
      const match = /\.(\w+)$/.exec(filename)
      const type = mime || (match ? `image/${match[1].toLowerCase()}` : 'image/jpeg')

      const formData = new FormData()
      formData.append('file', {
        uri: cleanUri,
        name: filename,
        type,
      } as any)

      await driverApi.uploadDocument(docId, formData)

      setUploads(p => ({ ...p, [docId]: 'done' }))
      setPreviewUris(p => ({ ...p, [docId]: cleanUri }))
      setFileNames(p => ({ ...p, [docId]: filename }))
    } catch (e: any) {
      console.warn('[DocumentsScreen] Upload failed:', e)
      setUploads(p => ({ ...p, [docId]: 'pending' }))
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e.message ||
        'Could not upload document. Please try again.'
      Alert.alert('Upload Failed', msg)
    }
  }

  const handlePickCamera = async () => {
    if (!selectedDoc) return
    setShowPickerModal(false)
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync().catch(() => ({ granted: false }))
      if (!perm.granted) {
        Alert.alert(
          'Camera Permission Required',
          'Please allow camera permission in settings to take photos of your documents.'
        )
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
      console.warn('[DocumentsScreen] Camera error:', e)
      Alert.alert('Camera Error', 'Could not open camera. Please try selecting from Gallery.')
    }
  }

  const handlePickGallery = async () => {
    if (!selectedDoc) return
    setShowPickerModal(false)
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync().catch(() => ({ granted: false }))
      if (!perm.granted) {
        Alert.alert(
          'Photo Library Permission Required',
          'Please allow photo library permission to upload documents from your gallery.'
        )
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
      console.warn('[DocumentsScreen] Gallery error:', e)
      Alert.alert('Gallery Error', 'Could not open photo gallery. Please try again.')
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
      console.warn('[DocumentsScreen] Document picker error:', e)
      Alert.alert('Document Error', 'Could not access file. Please select a photo from your gallery.')
    }
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

  const allUploaded = REQUIRED_DOCS.every(doc => uploads[doc.id] === 'done')

  const handleNext = () => {
    if (!allUploaded) {
      Alert.alert('Incomplete Documents', 'Please upload all required documents to continue to the final review.')
      return
    }
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      router.push('/onboarding/review')
    }, 400)
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
            <Text style={styles.logoEmoji}>📄</Text>
          </View>
          <Text style={styles.headerTitle}>Document Upload</Text>
          <Text style={styles.headerSubtitle}>Upload photos or PDF copies of your documents</Text>
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
                <View
                  style={[
                    styles.stepConnector,
                    step < 3 ? styles.stepConnectorActive : styles.stepConnectorInactive,
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        {/* Document List Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Required Documents</Text>
            <View style={styles.cardCounter}>
              <Text style={styles.cardCounterText}>
                {REQUIRED_DOCS.filter(d => uploads[d.id] === 'done').length} / {REQUIRED_DOCS.length} Done
              </Text>
            </View>
          </View>

          {initialLoading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="small" color="#F59E0B" />
              <Text style={styles.loaderText}>Checking document status...</Text>
            </View>
          ) : (
            REQUIRED_DOCS.map(doc => {
              const status = uploads[doc.id]
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
                      <Text style={styles.docLabel}>{doc.label}</Text>
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
            <Text style={styles.infoTitle}>Secure Encrypted KYC</Text>
            <Text style={styles.infoText}>
              All documents are encrypted with 256-bit AES encryption. Used strictly for driver identity and compliance
              verification.
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
              Continue to Review →
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
            <Text style={styles.modalSub}>Select where you would like to upload your document from</Text>

            <TouchableOpacity style={styles.modalOption} onPress={handlePickCamera} activeOpacity={0.75}>
              <View style={[styles.modalOptionIconBox, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
                <Feather name="camera" size={22} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Take Photo with Camera</Text>
                <Text style={styles.modalOptionDesc}>Capture clear front and back document photos</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#64748B" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOption} onPress={handlePickGallery} activeOpacity={0.75}>
              <View style={[styles.modalOptionIconBox, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                <Feather name="image" size={22} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Choose from Photo Gallery</Text>
                <Text style={styles.modalOptionDesc}>Select an existing image from your gallery</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#64748B" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOption} onPress={handlePickDocument} activeOpacity={0.75}>
              <View style={[styles.modalOptionIconBox, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                <MaterialCommunityIcons name="file-pdf-box" size={24} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Select PDF / Document File</Text>
                <Text style={styles.modalOptionDesc}>Upload official digital PDF certificate</Text>
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
                    const docObj = REQUIRED_DOCS.find(d => d.id === previewDoc.id)
                    if (docObj) handleOpenPicker(docObj)
                  }
                }}
                activeOpacity={0.8}
              >
                <Feather name="refresh-cw" size={16} color="#FFFFFF" />
                <Text style={styles.previewRetakeText}>Retake / Re-upload</Text>
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

  card: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  cardCounter: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  cardCounterText: { color: '#F59E0B', fontSize: 12, fontWeight: '800' },

  loaderContainer: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  loaderText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },

  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  docIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  docIcon: { fontSize: 22 },
  thumbnailContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: '#10B981',
    position: 'relative',
  },
  thumbnail: { width: '100%', height: '100%' },
  thumbZoomBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 4,
    padding: 2,
  },
  docInfo: { flex: 1, marginRight: 8 },
  docTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  docLabel: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  tagBadge: {
    backgroundColor: 'rgba(59,130,246,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagBadgeText: { color: '#60A5FA', fontSize: 9, fontWeight: '700' },
  docDesc: { fontSize: 11, color: '#94A3B8' },

  uploadBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  uploadingBox: { width: 68, height: 32, alignItems: 'center', justifyContent: 'center' },
  doneBox: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  doneText: { color: '#10B981', fontSize: 12, fontWeight: '700' },

  infoBox: {
    backgroundColor: 'rgba(59,130,246,0.08)',
    padding: 14,
    borderRadius: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(59,130,246,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: { color: '#93C5FD', fontSize: 13, fontWeight: '800', marginBottom: 2 },
  infoText: { color: '#94A3B8', fontSize: 11.5, lineHeight: 17 },

  button: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  buttonActive: {
    backgroundColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonDisabled: { backgroundColor: '#334155' },
  buttonTextActive: { color: '#0F172A', fontSize: 15, fontWeight: '800' },
  buttonTextDisabled: { color: '#64748B', fontSize: 15, fontWeight: '700' },
  backBtn: { alignItems: 'center', paddingVertical: 10 },
  backBtnText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    borderTopWidth: 1,
    borderColor: '#334155',
  },
  modalIndicator: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#475569',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  modalSub: { fontSize: 12, color: '#94A3B8', marginBottom: 18 },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  modalOptionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOptionTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  modalOptionDesc: { fontSize: 11, color: '#94A3B8' },
  modalCancelBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: '#CBD5E1' },

  // Fullscreen Preview Modal Styles
  previewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  previewModalCard: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  previewModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  previewModalTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', flex: 1 },
  previewModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImageContainer: {
    width: '100%',
    height: 280,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewFullImage: { width: '100%', height: '100%' },
  previewModalFooter: { flexDirection: 'row', gap: 10, marginTop: 14 },
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
  previewRetakeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  previewDoneBtn: {
    paddingHorizontal: 20,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewDoneBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
})
