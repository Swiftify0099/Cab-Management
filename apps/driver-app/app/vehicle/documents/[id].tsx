/**
 * Vehicle Document Upload & Preview Screen
 * Route: /vehicle/documents/[id]
 */
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { useTheme } from '../../../src/theme'
import {
  DriverVehicle,
  VehicleDocument,
  VehicleService,
} from '../../../src/services/vehicleService'

export default function VehicleDocumentUploadScreen() {
  const { theme, isDark } = useTheme()
  const { id, doc: initialDocType } = useLocalSearchParams<{ id: string; doc?: string }>()
  const [vehicle, setVehicle] = useState<DriverVehicle | null>(null)
  const [selectedDocType, setSelectedDocType] = useState<string>(initialDocType || 'rc_book')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Document Form
  const [docNumber, setDocNumber] = useState('')
  const [expiresAt, setExpiresAt] = useState('2027-04-30')
  const [imageUri, setImageUri] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    VehicleService.getVehicleById(id).then(veh => {
      setVehicle(veh)
      if (veh) {
        const target = veh.documents.find(d => d.doc_type === selectedDocType) || veh.documents[0]
        if (target) {
          setSelectedDocType(target.doc_type)
          setDocNumber(target.document_number || '')
          setExpiresAt(target.expires_at || '2027-04-30')
          setImageUri(target.file_url || null)
        }
      }
      setLoading(false)
    })
  }, [id])

  const handleSelectDoc = (docType: string) => {
    setSelectedDocType(docType)
    if (vehicle) {
      const target = vehicle.documents.find(d => d.doc_type === docType)
      if (target) {
        setDocNumber(target.document_number || '')
        setExpiresAt(target.expires_at || '2027-04-30')
        setImageUri(target.file_url || null)
      } else {
        setDocNumber('')
        setImageUri(null)
      }
    }
  }

  const pickImage = async (useCamera = false) => {
    try {
      let res
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync()
        if (status !== 'granted') {
          Alert.alert('Permission Needed', 'Camera access is required to take document photos.')
          return
        }
        res = await ImagePicker.launchCameraAsync({
          quality: 0.8,
          allowsEditing: true,
        })
      } else {
        res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          allowsEditing: true,
        })
      }

      if (!res.canceled && res.assets[0]?.uri) {
        setImageUri(res.assets[0].uri)
      }
    } catch (e) {
      console.warn('Image picker error:', e)
    }
  }

  const handleSaveDocument = async () => {
    if (!vehicle || !id) return
    if (!imageUri) {
      Alert.alert('Photo Required', 'Please capture or upload a document photo.')
      return
    }

    try {
      setSubmitting(true)
      await VehicleService.uploadVehicleDocument(id, selectedDocType, {
        file_url: imageUri,
        document_number: docNumber.trim() || undefined,
        expires_at: expiresAt,
      })

      Alert.alert(
        'Document Uploaded',
        'Your document has been submitted for review. Verification usually takes 1-2 hours.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      )
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Failed to save document.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !vehicle) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    )
  }

  const currentDoc = vehicle.documents.find(d => d.doc_type === selectedDocType)

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: isDark ? '#111827' : '#FFFFFF',
              borderBottomColor: isDark ? '#1F2937' : '#E2E8F0',
            },
          ]}
        >
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Vehicle Documents
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Vehicle Mini Bar */}
          <View
            style={[
              styles.vehicleBar,
              {
                backgroundColor: isDark ? '#111827' : '#FFFFFF',
                borderColor: isDark ? '#1F2937' : '#E2E8F0',
              },
            ]}
          >
            <MaterialCommunityIcons name="car" size={24} color="#0EA5E9" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.vName, { color: theme.colors.text }]}>
                {vehicle.make} {vehicle.model}
              </Text>
              <Text style={[styles.vReg, { color: theme.colors.textSecondary }]}>
                {vehicle.registration_number}
              </Text>
            </View>
          </View>

          {/* Document Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.docTabsScroll}>
            {vehicle.documents.map(d => {
              const isSelected = d.doc_type === selectedDocType
              return (
                <TouchableOpacity
                  key={d.id}
                  style={[
                    styles.docTab,
                    {
                      backgroundColor: isSelected
                        ? '#0EA5E9'
                        : isDark
                        ? '#1E293B'
                        : '#F1F5F9',
                      borderColor: isSelected ? '#0EA5E9' : isDark ? '#334155' : '#CBD5E1',
                    },
                  ]}
                  onPress={() => handleSelectDoc(d.doc_type)}
                >
                  <Text
                    style={[
                      styles.docTabText,
                      { color: isSelected ? '#FFFFFF' : theme.colors.text },
                    ]}
                  >
                    {d.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          {/* Document Info Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark ? '#111827' : '#FFFFFF',
                borderColor: isDark ? '#1F2937' : '#E2E8F0',
              },
            ]}
          >
            <Text style={[styles.docHeading, { color: theme.colors.text }]}>
              {currentDoc?.name || 'Document Upload'}
            </Text>
            <Text style={[styles.docSubtitle, { color: theme.colors.textSecondary }]}>
              Ensure all text, vehicle registration, and issue dates are sharp and clearly legible.
            </Text>

            {/* Document Number */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Certificate / Policy Number
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    borderColor: isDark ? '#334155' : '#CBD5E1',
                    color: theme.colors.text,
                  },
                ]}
                placeholder="e.g. MH12AB1234 or Policy #"
                placeholderTextColor="#94A3B8"
                value={docNumber}
                onChangeText={setDocNumber}
              />
            </View>

            {/* Expiry Date */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Expiry Date</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    borderColor: isDark ? '#334155' : '#CBD5E1',
                    color: theme.colors.text,
                  },
                ]}
                placeholder="YYYY-MM-DD (e.g. 2027-04-30)"
                placeholderTextColor="#94A3B8"
                value={expiresAt}
                onChangeText={setExpiresAt}
              />
            </View>

            {/* Document Preview / Upload Area */}
            <View style={styles.uploadArea}>
              {imageUri ? (
                <View style={styles.previewWrap}>
                  <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
                  <View style={styles.previewOverlay}>
                    <TouchableOpacity
                      style={styles.replaceBtn}
                      onPress={() => pickImage(false)}
                    >
                      <Feather name="refresh-cw" size={14} color="#FFFFFF" />
                      <Text style={styles.replaceBtnText}>Replace Photo</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View
                  style={[
                    styles.uploadPlaceholder,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                      borderColor: isDark ? '#334155' : '#CBD5E1',
                    },
                  ]}
                >
                  <MaterialCommunityIcons name="camera-plus" size={40} color="#0EA5E9" />
                  <Text style={[styles.placeholderTitle, { color: theme.colors.text }]}>
                    Upload Document Scan / Photo
                  </Text>
                  <Text style={[styles.placeholderSub, { color: theme.colors.textSecondary }]}>
                    Supports JPG, PNG, PDF up to 10MB
                  </Text>

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={styles.pickerActionBtn}
                      onPress={() => pickImage(true)}
                    >
                      <Feather name="camera" size={14} color="#FFFFFF" />
                      <Text style={styles.pickerActionBtnText}>Use Camera</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.pickerActionBtn,
                        { backgroundColor: isDark ? '#334155' : '#E2E8F0' },
                      ]}
                      onPress={() => pickImage(false)}
                    >
                      <Feather name="image" size={14} color={theme.colors.text} />
                      <Text style={[styles.pickerActionBtnText, { color: theme.colors.text }]}>
                        Gallery
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Guidelines Card */}
            <View
              style={[
                styles.guidelinesBox,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F0F9FF',
                  borderColor: isDark ? '#334155' : '#BAE6FD',
                },
              ]}
            >
              <Text style={[styles.guideTitle, { color: '#0EA5E9' }]}>
                Guidelines for Fast Approval:
              </Text>
              <Text style={[styles.guideItem, { color: theme.colors.textSecondary }]}>
                • Ensure all 4 corners of the document are visible.
              </Text>
              <Text style={[styles.guideItem, { color: theme.colors.textSecondary }]}>
                • Vehicle Registration Number must match exactly.
              </Text>
              <Text style={[styles.guideItem, { color: theme.colors.textSecondary }]}>
                • Avoid glare, flash reflections, or shadows.
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitBtn}
              disabled={submitting}
              onPress={handleSaveDocument}
            >
              <LinearGradient
                colors={['#0EA5E9', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={18} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Submit Document</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  vehicleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  vName: {
    fontSize: 15,
    fontWeight: '700',
  },
  vReg: {
    fontSize: 12,
    marginTop: 2,
  },
  docTabsScroll: {
    marginBottom: 16,
  },
  docTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  docTabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
  },
  docHeading: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  docSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 18,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  uploadArea: {
    marginVertical: 14,
  },
  uploadPlaceholder: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  placeholderTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  placeholderSub: {
    fontSize: 11,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  pickerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pickerActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  previewWrap: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  replaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  replaceBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  guidelinesBox: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 4,
    marginBottom: 20,
  },
  guideTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  guideItem: {
    fontSize: 11,
    lineHeight: 16,
  },
  submitBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
