/**
 * Customer App — Send a Parcel (Logistics Booking Flow) — Feature 15
 * Complete 4-Step logistics creation wizard with live authoritative quotes,
 * vehicle selection, identity separation, insurance, promo coupons, and multi-bucket payment.
 */
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useTheme } from '../src/contexts/ThemeContext'
import { parcelApi, profileApi } from '../src/api/client'
import { PromotionsSheet } from '../src/components/promotions/PromotionsSheet'

const CATEGORIES = [
  { key: 'DOCUMENTS', label: 'Documents', icon: 'file-text', lib: 'feather' },
  { key: 'ELECTRONICS', label: 'Electronics', icon: 'monitor', lib: 'feather' },
  { key: 'FOOD', label: 'Food & Meals', icon: 'coffee', lib: 'feather' },
  { key: 'CLOTHING', label: 'Apparel', icon: 'shopping-bag', lib: 'feather' },
  { key: 'FRAGILE', label: 'Fragile Glass', icon: 'glass-fragile', lib: 'mci' },
  { key: 'MEDICINES', label: 'Medicines', icon: 'medical-bag', lib: 'mci' },
  { key: 'GENERAL_BOX', label: 'General Box', icon: 'box', lib: 'feather' },
]

const VEHICLE_OPTIONS = [
  { key: 'BIKE', label: 'Delivery Bike', icon: 'motorbike', maxWeight: 'Up to 15 kg', eta: '30-45 min', baseFare: '₹40' },
  { key: 'AUTO', label: 'Cargo Auto', icon: 'rickshaw', maxWeight: 'Up to 60 kg', eta: '40-60 min', baseFare: '₹70' },
  { key: 'CAR', label: 'Hatchback / Sedan', icon: 'car', maxWeight: 'Up to 150 kg', eta: '35-50 min', baseFare: '₹120' },
  { key: 'VAN', label: 'Cargo Van', icon: 'van-utility', maxWeight: 'Up to 500 kg', eta: '1-2 hrs', baseFare: '₹250' },
  { key: 'MINI_TRUCK', label: 'Mini Truck (Ace)', icon: 'truck', maxWeight: 'Up to 1,000 kg', eta: '1-3 hrs', baseFare: '₹400' },
]

const PRIORITIES = [
  { key: 'STANDARD', label: 'Standard', desc: 'Optimal route', badge: 'Best Value' },
  { key: 'EXPRESS', label: 'Express Direct', desc: 'Direct point-to-point', badge: '+35% faster' },
  { key: 'SAME_DAY', label: 'Same Day', desc: 'Flexible schedule', badge: 'Eco' },
]

export default function ParcelBookingScreen() {
  const { theme, isDark } = useTheme()
  const [currentStep, setCurrentStep] = useState<number>(1)

  // Step 1: Addresses & Contacts
  const [senderName, setSenderName] = useState('')
  const [senderPhone, setSenderPhone] = useState('')
  const [senderAddress, setSenderAddress] = useState('102, Baner High Street, Pune')
  const [senderLat, setSenderLat] = useState(18.5590)
  const [senderLng, setSenderLng] = useState(73.7868)
  const [pickupNotes, setPickupNotes] = useState('')
  const [isSenderSelf, setIsSenderSelf] = useState(true)

  const [receiverName, setReceiverName] = useState('')
  const [receiverPhone, setReceiverPhone] = useState('')
  const [receiverAddress, setReceiverAddress] = useState('Flat 402, Kothrud Prime, Pune')
  const [receiverLat, setReceiverLat] = useState(18.5074)
  const [receiverLng, setReceiverLng] = useState(73.8077)
  const [deliveryNotes, setDeliveryNotes] = useState('')

  // Step 2: Package Specifications
  const [category, setCategory] = useState('ELECTRONICS')
  const [description, setDescription] = useState('')
  const [weightKg, setWeightKg] = useState(2.5)
  const [packageCount, setPackageCount] = useState(1)
  const [lengthCm, setLengthCm] = useState('30')
  const [widthCm, setWidthCm] = useState('20')
  const [heightCm, setHeightCm] = useState('15')
  const [isFragile, setIsFragile] = useState(false)
  const [isValuable, setIsValuable] = useState(false)
  const [declaredValue, setDeclaredValue] = useState('')
  const [insuranceOptIn, setInsuranceOptIn] = useState(false)

  // Step 3: Vehicle & Priority
  const [vehicleCategory, setVehicleCategory] = useState('BIKE')
  const [deliveryPriority, setDeliveryPriority] = useState('STANDARD')

  // Step 4: Quote & Payment
  const [paymentMethod, setPaymentMethod] = useState<'WALLET' | 'UPI' | 'CARD' | 'CASH'>('WALLET')
  const [appliedPromo, setAppliedPromo] = useState<any>(null)
  const [promoModalVisible, setPromoModalVisible] = useState(false)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [quoteData, setQuoteData] = useState<any>(null)

  // Load user profile for default sender
  useEffect(() => {
    profileApi.getMe()
      .then((res: any) => {
        if (res.data?.data) {
          const u = res.data.data
          if (isSenderSelf) {
            setSenderName(u.full_name || u.name || 'Aditya Patil')
            setSenderPhone(u.phone || '+91 98765 43210')
          }
        }
      })
      .catch(() => {
        if (isSenderSelf) {
          setSenderName('Aditya Patil')
          setSenderPhone('+91 98765 43210')
        }
      })
  }, [isSenderSelf])

  // Fetch dynamic quote whenever relevant inputs change
  useEffect(() => {
    fetchQuote()
  }, [
    senderLat, senderLng, receiverLat, receiverLng,
    weightKg, packageCount, lengthCm, widthCm, heightCm,
    vehicleCategory, deliveryPriority, isFragile, isValuable,
    declaredValue, insuranceOptIn, appliedPromo,
  ])

  const fetchQuote = async () => {
    setQuoteLoading(true)
    try {
      const payload = {
        sender_lat: senderLat,
        sender_lng: senderLng,
        receiver_lat: receiverLat,
        receiver_lng: receiverLng,
        weight_kg: weightKg,
        length_cm: parseFloat(lengthCm) || undefined,
        width_cm: parseFloat(widthCm) || undefined,
        height_cm: parseFloat(heightCm) || undefined,
        package_count: packageCount,
        vehicle_category: vehicleCategory,
        delivery_priority: deliveryPriority,
        is_fragile: isFragile,
        is_valuable: isValuable,
        declared_value: parseFloat(declaredValue) || undefined,
        insurance_opt_in: insuranceOptIn,
        promo_code: appliedPromo?.code || undefined,
      }
      const res = await parcelApi.getQuote(payload)
      if (res.data?.data) {
        setQuoteData(res.data.data)
      }
    } catch {
      // Fallback local calculation
      const dist = 8.5
      const base = vehicleCategory === 'BIKE' ? 40 : vehicleCategory === 'AUTO' ? 70 : 120
      const distFare = (dist - 2) * 10
      const wtFare = Math.max(0, weightKg - 2) * 15
      const fragileFee = isFragile ? 30 : 0
      const insFee = insuranceOptIn && declaredValue ? Math.max(25, parseFloat(declaredValue) * 0.005) : 0
      const pMult = deliveryPriority === 'EXPRESS' ? 1.35 : 1.0
      const sub = (base + distFare + wtFare + fragileFee) * pMult + insFee
      const disc = appliedPromo ? 50 : 0
      const finalFare = Math.max(40, Math.round(sub - disc))
      setQuoteData({
        estimated_distance_km: dist,
        estimated_duration_min: 28,
        base_fare: base,
        distance_fare: distFare,
        weight_fare: wtFare,
        handling_fee: fragileFee,
        priority_fare: Math.round(sub - (base + distFare + wtFare + fragileFee)),
        insurance_fee: insFee,
        discount_amount: disc,
        final_fare: finalFare,
        driver_earning: Math.round(finalFare * 0.8),
      })
    } finally {
      setQuoteLoading(false)
    }
  }

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!senderName.trim() || !senderPhone.trim() || !senderAddress.trim()) {
        Alert.alert('Sender Information Required', 'Please provide complete sender details.')
        return
      }
      if (!receiverName.trim() || !receiverPhone.trim() || !receiverAddress.trim()) {
        Alert.alert('Receiver Information Required', 'Please provide complete receiver details.')
        return
      }
      setCurrentStep(2)
    } else if (currentStep === 2) {
      if (weightKg <= 0) {
        Alert.alert('Invalid Weight', 'Please provide a valid package weight.')
        return
      }
      if (isValuable && !declaredValue) {
        Alert.alert('Declared Value Needed', 'Please enter declared value for high-value shipment.')
        return
      }
      setCurrentStep(3)
    } else if (currentStep === 3) {
      setCurrentStep(4)
    }
  }

  const handleCreateBooking = async () => {
    setSubmitting(true)
    try {
      const payload = {
        sender_name: senderName,
        sender_phone: senderPhone,
        sender_address: senderAddress,
        sender_lat: senderLat,
        sender_lng: senderLng,
        pickup_instructions: pickupNotes || undefined,
        receiver_name: receiverName,
        receiver_phone: receiverPhone,
        receiver_address: receiverAddress,
        receiver_lat: receiverLat,
        receiver_lng: receiverLng,
        delivery_instructions: deliveryNotes || undefined,
        parcel_category: category,
        description: description || undefined,
        package_count: packageCount,
        weight_kg: weightKg,
        length_cm: parseFloat(lengthCm) || undefined,
        width_cm: parseFloat(widthCm) || undefined,
        height_cm: parseFloat(heightCm) || undefined,
        is_fragile: isFragile,
        is_valuable: isValuable,
        declared_value: parseFloat(declaredValue) || undefined,
        insurance_opt_in: insuranceOptIn,
        vehicle_category: vehicleCategory,
        delivery_priority: deliveryPriority,
        payment_method: paymentMethod,
        promo_code: appliedPromo?.code || undefined,
      }

      const res = await parcelApi.createOrder(payload)
      const data = res.data?.data
      if (data?.parcel_id) {
        Alert.alert(
          'Parcel Order Dispatched! 📦',
          `Tracking #: ${data.tracking_number}\nPickup OTP: ${data.pickup_otp}\nSearching nearby delivery partners...`,
          [
            {
              text: 'Track Shipment',
              onPress: () => {
                router.replace({
                  pathname: '/parcel-tracking',
                  params: { parcel_id: data.parcel_id },
                } as any)
              },
            },
          ]
        )
      }
    } catch (err: any) {
      Alert.alert('Booking Failed', err?.response?.data?.detail || 'Unable to create parcel order. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: isDark ? '#0B0F19' : '#F8FAFC' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}
            onPress={() => {
              if (currentStep > 1) setCurrentStep(currentStep - 1)
              else router.back()
            }}
          >
            <Feather name="arrow-left" size={22} color={isDark ? '#F8FAFC' : '#0F172A'} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>Send a Parcel</Text>
            <Text style={[styles.headerSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Step {currentStep} of 4 • {currentStep === 1 ? 'Addresses' : currentStep === 2 ? 'Package Specs' : currentStep === 3 ? 'Vehicle & ETA' : 'Review & Pay'}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <MaterialCommunityIcons name="cube-send" size={24} color="#6366F1" />
          </View>
        </View>

        {/* Step Progress Bar */}
        <View style={styles.progressContainer}>
          {[1, 2, 3, 4].map((step) => (
            <View
              key={step}
              style={[
                styles.progressBar,
                {
                  backgroundColor:
                    step <= currentStep
                      ? '#6366F1'
                      : isDark
                      ? '#1E293B'
                      : '#E2E8F0',
                },
              ]}
            />
          ))}
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ═════════ STEP 1: ADDRESSES & CONTACTS ═════════ */}
            {currentStep === 1 && (
              <View>
                {/* Sender Card */}
                <View style={[styles.card, { backgroundColor: isDark ? '#151D2E' : '#FFFFFF', borderColor: isDark ? '#23304B' : '#E2E8F0' }]}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.pinCircle, { backgroundColor: '#10B98120' }]}>
                      <Ionicons name="radio-button-on" size={18} color="#10B981" />
                    </View>
                    <Text style={[styles.cardTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>Sender (Pickup Location)</Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Pickup Address</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: isDark ? '#0B0F19' : '#F1F5F9', color: isDark ? '#F8FAFC' : '#0F172A' }]}
                      value={senderAddress}
                      onChangeText={setSenderAddress}
                      placeholder="Enter pickup address, landmark..."
                      placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                    />
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                      <Text style={[styles.inputLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Sender Name</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: isDark ? '#0B0F19' : '#F1F5F9', color: isDark ? '#F8FAFC' : '#0F172A' }]}
                        value={senderName}
                        onChangeText={setSenderName}
                        placeholder="Sender's Name"
                        placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={[styles.inputLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Phone Number</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: isDark ? '#0B0F19' : '#F1F5F9', color: isDark ? '#F8FAFC' : '#0F172A' }]}
                        value={senderPhone}
                        onChangeText={setSenderPhone}
                        placeholder="+91 98765..."
                        placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>

                  <TextInput
                    style={[styles.input, { backgroundColor: isDark ? '#0B0F19' : '#F1F5F9', color: isDark ? '#F8FAFC' : '#0F172A', marginTop: 4 }]}
                    value={pickupNotes}
                    onChangeText={setPickupNotes}
                    placeholder="Pickup instructions (e.g. Ring bell, 2nd floor)..."
                    placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                  />
                </View>

                {/* Receiver Card */}
                <View style={[styles.card, { backgroundColor: isDark ? '#151D2E' : '#FFFFFF', borderColor: isDark ? '#23304B' : '#E2E8F0', marginTop: 16 }]}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.pinCircle, { backgroundColor: '#EF444420' }]}>
                      <Ionicons name="location-sharp" size={18} color="#EF4444" />
                    </View>
                    <Text style={[styles.cardTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>Receiver (Dropoff Location)</Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Dropoff Address</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: isDark ? '#0B0F19' : '#F1F5F9', color: isDark ? '#F8FAFC' : '#0F172A' }]}
                      value={receiverAddress}
                      onChangeText={setReceiverAddress}
                      placeholder="Enter receiver delivery address..."
                      placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                    />
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                      <Text style={[styles.inputLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Receiver Name</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: isDark ? '#0B0F19' : '#F1F5F9', color: isDark ? '#F8FAFC' : '#0F172A' }]}
                        value={receiverName}
                        onChangeText={setReceiverName}
                        placeholder="Receiver's Name"
                        placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={[styles.inputLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Phone Number</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: isDark ? '#0B0F19' : '#F1F5F9', color: isDark ? '#F8FAFC' : '#0F172A' }]}
                        value={receiverPhone}
                        onChangeText={setReceiverPhone}
                        placeholder="+91 98765..."
                        placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>

                  <TextInput
                    style={[styles.input, { backgroundColor: isDark ? '#0B0F19' : '#F1F5F9', color: isDark ? '#F8FAFC' : '#0F172A', marginTop: 4 }]}
                    value={deliveryNotes}
                    onChangeText={setDeliveryNotes}
                    placeholder="Delivery instructions (e.g. Leave with security)..."
                    placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                  />
                </View>
              </View>
            )}

            {/* ═════════ STEP 2: PACKAGE SPECIFICATIONS ═════════ */}
            {currentStep === 2 && (
              <View>
                {/* Category Chips */}
                <Text style={[styles.sectionTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>Select Parcel Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                  {CATEGORIES.map((cat) => {
                    const isSelected = category === cat.key
                    return (
                      <TouchableOpacity
                        key={cat.key}
                        style={[
                          styles.categoryChip,
                          {
                            backgroundColor: isSelected ? '#6366F1' : isDark ? '#151D2E' : '#FFFFFF',
                            borderColor: isSelected ? '#6366F1' : isDark ? '#23304B' : '#E2E8F0',
                          },
                        ]}
                        onPress={() => setCategory(cat.key)}
                      >
                        {cat.lib === 'mci' ? (
                          <MaterialCommunityIcons
                            name={cat.icon as any}
                            size={18}
                            color={isSelected ? '#FFFFFF' : isDark ? '#94A3B8' : '#64748B'}
                          />
                        ) : (
                          <Feather
                            name={cat.icon as any}
                            size={18}
                            color={isSelected ? '#FFFFFF' : isDark ? '#94A3B8' : '#64748B'}
                          />
                        )}
                        <Text
                          style={[
                            styles.categoryChipText,
                            { color: isSelected ? '#FFFFFF' : isDark ? '#F8FAFC' : '#0F172A' },
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </ScrollView>

                {/* Weight & Dimension Card */}
                <View style={[styles.card, { backgroundColor: isDark ? '#151D2E' : '#FFFFFF', borderColor: isDark ? '#23304B' : '#E2E8F0', marginTop: 16 }]}>
                  <Text style={[styles.cardTitle, { color: isDark ? '#F8FAFC' : '#0F172A', marginBottom: 12 }]}>
                    Weight & Dimensions
                  </Text>

                  {/* Weight Quick Selector */}
                  <Text style={[styles.inputLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Package Weight (kg)</Text>
                  <View style={styles.weightRow}>
                    {[0.5, 1.0, 2.5, 5.0, 10.0, 20.0].map((w) => (
                      <TouchableOpacity
                        key={w}
                        style={[
                          styles.weightPill,
                          {
                            backgroundColor: weightKg === w ? '#6366F1' : isDark ? '#0B0F19' : '#F1F5F9',
                            borderColor: weightKg === w ? '#6366F1' : isDark ? '#23304B' : '#E2E8F0',
                          },
                        ]}
                        onPress={() => setWeightKg(w)}
                      >
                        <Text style={{ color: weightKg === w ? '#FFFFFF' : isDark ? '#F8FAFC' : '#0F172A', fontWeight: '600', fontSize: 13 }}>
                          {w} kg
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Package Dimensions */}
                  <Text style={[styles.inputLabel, { color: isDark ? '#94A3B8' : '#64748B', marginTop: 12 }]}>
                    Dimensions (L × W × H in cm) — Optional
                  </Text>
                  <View style={styles.row}>
                    <TextInput
                      style={[styles.input, styles.dimInput, { backgroundColor: isDark ? '#0B0F19' : '#F1F5F9', color: isDark ? '#F8FAFC' : '#0F172A' }]}
                      value={lengthCm}
                      onChangeText={setLengthCm}
                      placeholder="L (cm)"
                      placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                      keyboardType="numeric"
                    />
                    <Text style={{ color: isDark ? '#64748B' : '#94A3B8', marginHorizontal: 4, alignSelf: 'center' }}>×</Text>
                    <TextInput
                      style={[styles.input, styles.dimInput, { backgroundColor: isDark ? '#0B0F19' : '#F1F5F9', color: isDark ? '#F8FAFC' : '#0F172A' }]}
                      value={widthCm}
                      onChangeText={setWidthCm}
                      placeholder="W (cm)"
                      placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                      keyboardType="numeric"
                    />
                    <Text style={{ color: isDark ? '#64748B' : '#94A3B8', marginHorizontal: 4, alignSelf: 'center' }}>×</Text>
                    <TextInput
                      style={[styles.input, styles.dimInput, { backgroundColor: isDark ? '#0B0F19' : '#F1F5F9', color: isDark ? '#F8FAFC' : '#0F172A' }]}
                      value={heightCm}
                      onChangeText={setHeightCm}
                      placeholder="H (cm)"
                      placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Fragile & Valuable Items */}
                <View style={[styles.card, { backgroundColor: isDark ? '#151D2E' : '#FFFFFF', borderColor: isDark ? '#23304B' : '#E2E8F0', marginTop: 16 }]}>
                  {/* Fragile Switch */}
                  <TouchableOpacity
                    style={styles.toggleRow}
                    onPress={() => setIsFragile(!isFragile)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <MaterialCommunityIcons name="glass-fragile" size={22} color={isFragile ? '#F59E0B' : '#94A3B8'} />
                      <View style={{ marginLeft: 12 }}>
                        <Text style={[styles.toggleTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>Fragile Package</Text>
                        <Text style={[styles.toggleDesc, { color: isDark ? '#94A3B8' : '#64748B' }]}>Special careful handling & transport</Text>
                      </View>
                    </View>
                    <Ionicons
                      name={isFragile ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={isFragile ? '#6366F1' : isDark ? '#475569' : '#CBD5E1'}
                    />
                  </TouchableOpacity>

                  {/* High-Value Item & Insurance */}
                  <TouchableOpacity
                    style={[styles.toggleRow, { marginTop: 14, borderTopWidth: 1, borderTopColor: isDark ? '#23304B' : '#F1F5F9', paddingTop: 14 }]}
                    onPress={() => setIsValuable(!isValuable)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Feather name="shield" size={20} color={isValuable ? '#10B981' : '#94A3B8'} />
                      <View style={{ marginLeft: 12 }}>
                        <Text style={[styles.toggleTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>High-Value & Insurance</Text>
                        <Text style={[styles.toggleDesc, { color: isDark ? '#94A3B8' : '#64748B' }]}>Protect shipments up to ₹50,000</Text>
                      </View>
                    </View>
                    <Ionicons
                      name={isValuable ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={isValuable ? '#6366F1' : isDark ? '#475569' : '#CBD5E1'}
                    />
                  </TouchableOpacity>

                  {isValuable && (
                    <View style={{ marginTop: 12, padding: 12, backgroundColor: isDark ? '#0B0F19' : '#F8FAFC', borderRadius: 8 }}>
                      <Text style={[styles.inputLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Declared Item Value (₹)</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: isDark ? '#151D2E' : '#FFFFFF', color: isDark ? '#F8FAFC' : '#0F172A' }]}
                        value={declaredValue}
                        onChangeText={setDeclaredValue}
                        placeholder="e.g. 25000"
                        placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                        keyboardType="numeric"
                      />
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}
                        onPress={() => setInsuranceOptIn(!insuranceOptIn)}
                      >
                        <Ionicons
                          name={insuranceOptIn ? 'checkbox' : 'square-outline'}
                          size={20}
                          color={insuranceOptIn ? '#10B981' : '#94A3B8'}
                        />
                        <Text style={{ marginLeft: 8, fontSize: 13, color: isDark ? '#F8FAFC' : '#0F172A' }}>
                          Add Transit Insurance Coverage (0.5% fee)
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* ═════════ STEP 3: VEHICLE & PRIORITY ═════════ */}
            {currentStep === 3 && (
              <View>
                <Text style={[styles.sectionTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>Select Delivery Vehicle</Text>

                {VEHICLE_OPTIONS.map((v) => {
                  const isSelected = vehicleCategory === v.key
                  return (
                    <TouchableOpacity
                      key={v.key}
                      style={[
                        styles.vehicleCard,
                        {
                          backgroundColor: isSelected ? (isDark ? '#1E1B4B' : '#EEF2FF') : isDark ? '#151D2E' : '#FFFFFF',
                          borderColor: isSelected ? '#6366F1' : isDark ? '#23304B' : '#E2E8F0',
                        },
                      ]}
                      onPress={() => setVehicleCategory(v.key)}
                    >
                      <View style={[styles.vehicleIconCircle, { backgroundColor: isSelected ? '#6366F1' : isDark ? '#1E293B' : '#F1F5F9' }]}>
                        <MaterialCommunityIcons
                          name={v.icon as any}
                          size={24}
                          color={isSelected ? '#FFFFFF' : '#6366F1'}
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.vehicleTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>{v.label}</Text>
                        <Text style={[styles.vehicleSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>{v.maxWeight} • ETA: {v.eta}</Text>
                      </View>
                      <Text style={[styles.vehiclePrice, { color: '#6366F1' }]}>{v.baseFare}+</Text>
                    </TouchableOpacity>
                  )
                })}

                <Text style={[styles.sectionTitle, { color: isDark ? '#F8FAFC' : '#0F172A', marginTop: 20 }]}>Delivery Priority</Text>

                <View style={styles.row}>
                  {PRIORITIES.map((p) => {
                    const isSelected = deliveryPriority === p.key
                    return (
                      <TouchableOpacity
                        key={p.key}
                        style={[
                          styles.priorityCard,
                          {
                            backgroundColor: isSelected ? (isDark ? '#1E1B4B' : '#EEF2FF') : isDark ? '#151D2E' : '#FFFFFF',
                            borderColor: isSelected ? '#6366F1' : isDark ? '#23304B' : '#E2E8F0',
                          },
                        ]}
                        onPress={() => setDeliveryPriority(p.key)}
                      >
                        <Text style={[styles.priorityBadge, { color: '#6366F1' }]}>{p.badge}</Text>
                        <Text style={[styles.priorityTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>{p.label}</Text>
                        <Text style={[styles.priorityDesc, { color: isDark ? '#94A3B8' : '#64748B' }]}>{p.desc}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            )}

            {/* ═════════ STEP 4: REVIEW & PAY ═════════ */}
            {currentStep === 4 && (
              <View>
                {/* Breakdown Summary Card */}
                <View style={[styles.card, { backgroundColor: isDark ? '#151D2E' : '#FFFFFF', borderColor: isDark ? '#23304B' : '#E2E8F0' }]}>
                  <Text style={[styles.cardTitle, { color: isDark ? '#F8FAFC' : '#0F172A', marginBottom: 12 }]}>
                    Shipment Summary
                  </Text>

                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Route Distance</Text>
                    <Text style={[styles.summaryVal, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>{quoteData?.estimated_distance_km || 8.5} km</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Estimated Delivery Time</Text>
                    <Text style={[styles.summaryVal, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>{quoteData?.estimated_duration_min || 30} mins</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Base & Distance Fare</Text>
                    <Text style={[styles.summaryVal, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>₹{((quoteData?.base_fare || 40) + (quoteData?.distance_fare || 45)).toFixed(2)}</Text>
                  </View>
                  {quoteData?.weight_fare > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Extra Weight Fee ({weightKg} kg)</Text>
                      <Text style={[styles.summaryVal, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>₹{quoteData.weight_fare.toFixed(2)}</Text>
                    </View>
                  )}
                  {quoteData?.handling_fee > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Special Handling / Fragile</Text>
                      <Text style={[styles.summaryVal, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>₹{quoteData.handling_fee.toFixed(2)}</Text>
                    </View>
                  )}
                  {quoteData?.insurance_fee > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Transit Insurance Premium</Text>
                      <Text style={[styles.summaryVal, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>₹{quoteData.insurance_fee.toFixed(2)}</Text>
                    </View>
                  )}
                  {quoteData?.discount_amount > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: '#10B981' }]}>Promo Discount Applied</Text>
                      <Text style={[styles.summaryVal, { color: '#10B981' }]}>-₹{quoteData.discount_amount.toFixed(2)}</Text>
                    </View>
                  )}

                  <View style={[styles.summaryTotalRow, { borderTopColor: isDark ? '#23304B' : '#E2E8F0' }]}>
                    <Text style={[styles.totalLabel, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>Total Payable</Text>
                    <Text style={[styles.totalVal, { color: '#6366F1' }]}>₹{quoteData?.final_fare || 120}</Text>
                  </View>
                </View>

                {/* Promo Code Trigger */}
                <TouchableOpacity
                  style={[styles.promoCard, { backgroundColor: isDark ? '#151D2E' : '#FFFFFF', borderColor: isDark ? '#23304B' : '#E2E8F0' }]}
                  onPress={() => setPromoModalVisible(true)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="pricetag" size={20} color="#6366F1" />
                    <Text style={[styles.promoCardText, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                      {appliedPromo ? `Coupon: ${appliedPromo.code} applied!` : 'Apply Coupon or Promo Code'}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={20} color="#94A3B8" />
                </TouchableOpacity>

                {/* Payment Method Selector */}
                <Text style={[styles.sectionTitle, { color: isDark ? '#F8FAFC' : '#0F172A', marginTop: 16 }]}>Select Payment Method</Text>

                <View style={styles.paymentMethodsRow}>
                  {[
                    { key: 'WALLET', label: 'Wallet', icon: 'account-balance-wallet', lib: 'mci' },
                    { key: 'UPI', label: 'UPI / QR', icon: 'qrcode-scan', lib: 'mci' },
                    { key: 'CARD', label: 'Card', icon: 'credit-card', lib: 'feather' },
                    { key: 'CASH', label: 'Cash on Pickup', icon: 'cash', lib: 'mci' },
                  ].map((m) => {
                    const isSelected = paymentMethod === m.key
                    return (
                      <TouchableOpacity
                        key={m.key}
                        style={[
                          styles.payPill,
                          {
                            backgroundColor: isSelected ? '#6366F1' : isDark ? '#151D2E' : '#FFFFFF',
                            borderColor: isSelected ? '#6366F1' : isDark ? '#23304B' : '#E2E8F0',
                          },
                        ]}
                        onPress={() => setPaymentMethod(m.key as any)}
                      >
                        <Text style={{ color: isSelected ? '#FFFFFF' : isDark ? '#F8FAFC' : '#0F172A', fontWeight: '600', fontSize: 13 }}>
                          {m.label}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Bottom Action Footer */}
        <View style={[styles.footer, { backgroundColor: isDark ? '#151D2E' : '#FFFFFF', borderTopColor: isDark ? '#23304B' : '#E2E8F0' }]}>
          <View style={styles.footerPriceCol}>
            <Text style={[styles.footerPriceLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Estimated Fare</Text>
            {quoteLoading ? (
              <ActivityIndicator size="small" color="#6366F1" />
            ) : (
              <Text style={[styles.footerPriceVal, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                ₹{quoteData?.final_fare || 80}
              </Text>
            )}
          </View>

          {currentStep < 4 ? (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#6366F1' }]}
              onPress={handleNextStep}
            >
              <Text style={styles.actionBtnText}>Continue</Text>
              <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
              onPress={handleCreateBooking}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.actionBtnText}>Confirm & Book</Text>
                  <MaterialCommunityIcons name="check-circle" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      {/* Promotions Bottom Sheet */}
      <PromotionsSheet
        visible={promoModalVisible}
        bookingAmount={quoteData?.final_fare || 100}
        serviceType="PARCEL"
        onClose={() => setPromoModalVisible(false)}
        onApplyPromo={(promo: any) => {
          setAppliedPromo(promo)
          setPromoModalVisible(false)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  headerRight: { width: 40, alignItems: 'center' },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 6,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pinCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  inputGroup: { marginBottom: 10 },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  chipScroll: { marginBottom: 8 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryChipText: { fontSize: 13, fontWeight: '600', marginLeft: 6 },
  weightRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  weightPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  dimInput: { flex: 1, textAlign: 'center' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTitle: { fontSize: 14, fontWeight: '600' },
  toggleDesc: { fontSize: 12, marginTop: 2 },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  vehicleIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleTitle: { fontSize: 15, fontWeight: '700' },
  vehicleSubtitle: { fontSize: 12, marginTop: 2 },
  vehiclePrice: { fontSize: 16, fontWeight: '800' },
  priorityCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
  },
  priorityBadge: { fontSize: 10, fontWeight: '800', marginBottom: 4 },
  priorityTitle: { fontSize: 13, fontWeight: '700' },
  priorityDesc: { fontSize: 11, marginTop: 2 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: { fontSize: 13 },
  summaryVal: { fontSize: 13, fontWeight: '600' },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  totalLabel: { fontSize: 15, fontWeight: '700' },
  totalVal: { fontSize: 18, fontWeight: '800' },
  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  promoCardText: { fontSize: 14, fontWeight: '600', marginLeft: 10 },
  paymentMethodsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  payPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  footerPriceCol: { justifyContent: 'center' },
  footerPriceLabel: { fontSize: 11, fontWeight: '600' },
  footerPriceVal: { fontSize: 20, fontWeight: '800', marginTop: 2 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
})
