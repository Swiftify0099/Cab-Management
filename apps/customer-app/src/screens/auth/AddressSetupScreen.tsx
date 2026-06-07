/**
 * Address Setup Screen — Premium UI
 * Customer App
 */
import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  StyleSheet, StatusBar, ScrollView, Alert
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Feather, Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps'
import * as Location from 'expo-location'
import { profileApi } from '../../api/client'

const LABELS = [
  { id: 'Home', icon: 'home' },
  { id: 'Work', icon: 'briefcase' },
  { id: 'Other', icon: 'map-pin' }
]

export default function AddressSetupScreen() {
  const [loading, setLoading] = useState(false)
  const [mapLoading, setMapLoading] = useState(true)
  
  const [region, setRegion] = useState({
    latitude: 28.6139,
    longitude: 77.2090,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  })

  const [form, setForm] = useState({
    label: 'Home',
    pincode: '',
    district: '',
    state: '',
    landmark: '',
    full_address: ''
  })
  
  const mapRef = useRef<MapView>(null)

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Allow location access to use the map.')
        setMapLoading(false)
        return
      }

      const loc = await Location.getCurrentPositionAsync({})
      const newReg = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }
      setRegion(newReg)
      mapRef.current?.animateToRegion(newReg)
      await fetchAddress(loc.coords.latitude, loc.coords.longitude)
    })()
  }, [])

  const fetchAddress = async (lat: number, lng: number) => {
    setMapLoading(true)
    try {
      const result = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
      if (result.length > 0) {
        const addr = result[0]
        setForm(f => ({
          ...f,
          pincode: addr.postalCode || '',
          district: addr.subregion || addr.city || '',
          state: addr.region || '',
          full_address: `${addr.name || ''} ${addr.street || ''}, ${addr.city || ''}`.trim()
        }))
      }
    } catch (e) {
      console.log('Reverse geocoding error', e)
    } finally {
      setMapLoading(false)
    }
  }

  const handleRegionChangeComplete = async (newRegion: any) => {
    setRegion(newRegion)
    await fetchAddress(newRegion.latitude, newRegion.longitude)
  }

  const handleSave = async () => {
    if (!form.full_address || !form.pincode || !form.district || !form.state) {
      Alert.alert('Incomplete', 'Please ensure full address, pincode, district, and state are filled.')
      return
    }

    setLoading(true)
    try {
      await profileApi.addAddress({
        label: form.label,
        latitude: region.latitude,
        longitude: region.longitude,
        pincode: form.pincode,
        district: form.district,
        state: form.state,
        landmark: form.landmark,
        full_address: form.full_address,
        is_default: true
      })
      router.replace('/(tabs)')
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to save address')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      
      {/* Map Section */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_DEFAULT}
          initialRegion={region}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation
          showsMyLocationButton={false}
        />
        {/* Center Pin */}
        <View style={styles.centerPinWrap} pointerEvents="none">
           <Ionicons name="location" size={40} color="#E11D48" style={styles.pinIcon} />
           <View style={styles.pinShadow} />
        </View>
        
        {/* Top Bar inside Map */}
        <SafeAreaView style={styles.mapOverlay} edges={['top']}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
             <Feather name="arrow-left" size={24} color="#0F172A" />
          </TouchableOpacity>
        </SafeAreaView>
      </View>

      {/* Form Bottom Sheet */}
      <KeyboardAvoidingView 
        style={styles.sheetContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.sheetHandle} />
          
          <Text style={styles.title}>Confirm Address</Text>
          <Text style={styles.subtitle}>Step 2 of 2</Text>

          {/* Labels */}
          <View style={styles.labelRow}>
            {LABELS.map(l => (
              <TouchableOpacity 
                key={l.id}
                style={[styles.labelBtn, form.label === l.id && styles.labelBtnActive]}
                onPress={() => setForm({...form, label: l.id})}
              >
                <Feather name={l.icon as any} size={16} color={form.label === l.id ? '#FFFFFF' : '#64748B'} />
                <Text style={[styles.labelText, form.label === l.id && styles.labelTextActive]}>{l.id}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Full Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Address</Text>
            <View style={styles.inputBox}>
              <TextInput
                 style={styles.input}
                 value={form.full_address}
                 onChangeText={t => setForm({...form, full_address: t})}
                 multiline
                 placeholder="Enter full address"
              />
              {mapLoading && <ActivityIndicator size="small" color="#2563EB" />}
            </View>
          </View>

          {/* Row: Pincode & Landmark */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, {flex: 1}]}>
              <Text style={styles.inputLabel}>Pincode</Text>
              <View style={styles.inputBox}>
                <TextInput
                   style={styles.input}
                   value={form.pincode}
                   onChangeText={t => setForm({...form, pincode: t})}
                   placeholder="000000"
                   keyboardType="number-pad"
                />
              </View>
            </View>
            <View style={{width: 16}} />
            <View style={[styles.inputGroup, {flex: 1}]}>
              <Text style={styles.inputLabel}>Landmark (Optional)</Text>
              <View style={styles.inputBox}>
                <TextInput
                   style={styles.input}
                   value={form.landmark}
                   onChangeText={t => setForm({...form, landmark: t})}
                   placeholder="Near hospital"
                />
              </View>
            </View>
          </View>

          {/* District & State */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, {flex: 1}]}>
              <Text style={styles.inputLabel}>District / City</Text>
              <View style={styles.inputBox}>
                <TextInput
                   style={styles.input}
                   value={form.district}
                   onChangeText={t => setForm({...form, district: t})}
                   placeholder="City"
                />
              </View>
            </View>
            <View style={{width: 16}} />
            <View style={[styles.inputGroup, {flex: 1}]}>
              <Text style={styles.inputLabel}>State</Text>
              <View style={styles.inputBox}>
                <TextInput
                   style={styles.input}
                   value={form.state}
                   onChangeText={t => setForm({...form, state: t})}
                   placeholder="State"
                />
              </View>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity 
            style={[styles.saveBtn, loading && {opacity: 0.7}]} 
            onPress={handleSave}
            disabled={loading}
          >
            <LinearGradient
              colors={['#0EA5E9', '#A855F7']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.gradientBtn}
            >
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Address & Start</Text>}
            </LinearGradient>
          </TouchableOpacity>
          <View style={{height: 40}} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  mapContainer: { flex: 1, position: 'relative' },
  centerPinWrap: {
    position: 'absolute', top: '50%', left: '50%',
    marginLeft: -20, marginTop: -40,
    alignItems: 'center', justifyContent: 'center'
  },
  pinIcon: { marginBottom: -8 },
  pinShadow: {
    width: 12, height: 4, borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
    transform: [{ scaleX: 2 }]
  },
  mapOverlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16 },
  backBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4,
    marginTop: 10
  },
  sheetContainer: {
    flex: 1, backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    marginTop: -32,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10,
  },
  sheetScroll: { paddingHorizontal: 24, paddingTop: 16 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 24 },
  
  labelRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  labelBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', gap: 8
  },
  labelBtnActive: { borderColor: '#8B5CF6', backgroundColor: '#8B5CF6' },
  labelText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  labelTextActive: { color: '#FFFFFF' },

  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', minHeight: 56,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16
  },
  input: { flex: 1, fontSize: 16, color: '#0F172A', paddingVertical: 12 },
  
  row: { flexDirection: 'row' },
  
  saveBtn: { marginTop: 16, borderRadius: 20, overflow: 'hidden', shadowColor: '#A855F7', shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  gradientBtn: { height: 60, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' }
})
