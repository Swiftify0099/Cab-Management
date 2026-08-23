/**
 * Feature 17: Commercial Goods Transport & Freight Booking Screen
 * Dual Mode: Instant Guaranteed Price ⚡ vs Request Transporter Quotes 💬
 * Supports Cargo details, Payload Safety checks, Helpers count, and Vehicle taxonomy.
 */
import React, { useState, useEffect } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useTheme } from '../../src/contexts/ThemeContext'
import { useTranslation } from '../../src/i18n'
import { AppText, AppButton, AppCard, AppBadge } from '../../src/components/ui'
import { transportApi } from '../../src/api/client'

const GOODS_CATEGORIES = [
  { id: 'GENERAL', label: 'General Goods', icon: 'cube-outline' },
  { id: 'FURNITURE', label: 'Furniture & Home', icon: 'bed-outline' },
  { id: 'MACHINERY', label: 'Industrial / Machinery', icon: 'cog-outline' },
  { id: 'AGRICULTURE', label: 'Agri & Produce', icon: 'leaf-outline' },
  { id: 'ELECTRONICS', label: 'Electronics / Appliances', icon: 'tv-outline' },
  { id: 'CONSTRUCTION', label: 'Building Materials', icon: 'hammer-outline' },
  { id: 'HOUSEHOLD', label: 'House Relocation', icon: 'home-outline' },
]

const VEHICLE_CATEGORIES = [
  {
    id: 'TATA_ACE',
    name: 'Mini Truck (Tata Ace)',
    capacity: '750 kg',
    volume: '120 cu.ft',
    helpers: 'Up to 1 Helper',
    tag: 'City Express',
    icon: 'truck-fast-outline',
  },
  {
    id: 'BOLERO_PICKUP',
    name: 'Pickup 8ft (Bolero)',
    capacity: '1,500 kg',
    volume: '220 cu.ft',
    helpers: 'Up to 2 Helpers',
    tag: 'Most Popular',
    icon: 'truck-flatbed',
  },
  {
    id: 'EICHER_14FT',
    name: 'Light Truck 14ft (Eicher)',
    capacity: '4,000 kg',
    volume: '650 cu.ft',
    helpers: 'Up to 3 Helpers',
    tag: 'Heavy Commercial',
    icon: 'truck-cargo-container',
  },
  {
    id: 'TRUCK_19FT',
    name: 'Medium Truck 19ft',
    capacity: '8,000 kg',
    volume: '1,200 cu.ft',
    helpers: 'Up to 4 Helpers',
    tag: 'Intercity Cargo',
    icon: 'truck-delivery',
  },
  {
    id: 'TRAILER_32FT',
    name: 'Heavy Multi-Axle 32ft',
    capacity: '20,000 kg',
    volume: '2,500 cu.ft',
    helpers: 'Industrial Bulk',
    tag: 'Long Haul',
    icon: 'truck-check',
  },
]

export default function TransportCreateScreen() {
  const { theme, isDark } = useTheme()
  const { t } = useTranslation()

  // Route points (Default Pune logistics hubs)
  const [pickupAddress, setPickupAddress] = useState('Bhosari Industrial Estate, Pune')
  const [pickupLat] = useState(18.6279)
  const [pickupLng] = useState(73.8474)
  const [pickupContactName, setPickupContactName] = useState('Aditya Patil')
  const [pickupContactPhone, setPickupContactPhone] = useState('+919822001101')
  const [pickupNotes, setPickupNotes] = useState('Gate 3, Loading Dock B')

  const [dropAddress, setDropAddress] = useState('Chakan MIDC Phase 2, Pune')
  const [dropLat] = useState(18.7562)
  const [dropLng] = useState(73.8344)
  const [dropContactName, setDropContactName] = useState('Karan Shinde')
  const [dropContactPhone, setDropContactPhone] = useState('+919822001102')
  const [dropNotes, setDropNotes] = useState('Warehouse Bay 12')

  // Cargo & Handling
  const [goodsCategory, setGoodsCategory] = useState('MACHINERY')
  const [goodsDescription, setGoodsDescription] = useState('Precision CNC machine spares and metal crates')
  const [weightKg, setWeightKg] = useState('450')
  const [lengthFt, setLengthFt] = useState('5')
  const [widthFt, setWidthFt] = useState('4')
  const [heightFt, setHeightFt] = useState('3')
  const [packageCount, setPackageCount] = useState(3)
  const [declaredValue, setDeclaredValue] = useState('85000')
  const [fragileHandling, setFragileHandling] = useState(false)

  // Loading & Helpers
  const [loadingRequired, setLoadingRequired] = useState(true)
  const [unloadingRequired, setUnloadingRequired] = useState(true)
  const [helpersCount, setHelpersCount] = useState(1)

  // Vehicle Category & Pricing Mode
  const [selectedVehicle, setSelectedVehicle] = useState('BOLERO_PICKUP')
  const [pricingMode, setPricingMode] = useState<'INSTANT_PRICE' | 'REQUEST_QUOTES'>('INSTANT_PRICE')
  const [paymentMethod, setPaymentMethod] = useState<'WALLET' | 'UPI' | 'CASH'>('WALLET')
  const [promoCode, setPromoCode] = useState('TRANSPORT200')

  // Estimate State
  const [estimateLoading, setEstimateLoading] = useState(false)
  const [estimateData, setEstimateData] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchEstimate()
  }, [selectedVehicle, weightKg, lengthFt, widthFt, heightFt, helpersCount, loadingRequired, unloadingRequired, promoCode])

  const fetchEstimate = async () => {
    const numWeight = parseFloat(weightKg) || 100
    try {
      setEstimateLoading(true)
      const res: any = await transportApi.getEstimate({
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        drop_lat: dropLat,
        drop_lng: dropLng,
        goods_category: goodsCategory,
        goods_description: goodsDescription,
        weight_kg: numWeight,
        length_ft: parseFloat(lengthFt) || 0,
        width_ft: parseFloat(widthFt) || 0,
        height_ft: parseFloat(heightFt) || 0,
        package_count: packageCount,
        loading_required: loadingRequired,
        unloading_required: unloadingRequired,
        helpers_count: helpersCount,
        vehicle_category: selectedVehicle,
        declared_value: parseFloat(declaredValue) || undefined,
        promo_code: promoCode || undefined,
      })
      if (res.data) {
        setEstimateData(res.data)
      }
    } catch (err: any) {
      console.log('Estimate fetch error:', err.response?.data || err.message)
    } finally {
      setEstimateLoading(false)
    }
  }

  const handleCreateOrder = async () => {
    if (!pickupAddress || !dropAddress) {
      Alert.alert('Missing Location', 'Please provide valid pickup and destination addresses.')
      return
    }
    const numWeight = parseFloat(weightKg)
    if (isNaN(numWeight) || numWeight <= 0) {
      Alert.alert('Invalid Weight', 'Please specify a valid cargo weight in kg.')
      return
    }

    try {
      setSubmitting(true)
      const res: any = await transportApi.createOrder({
        pickup_address: pickupAddress,
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        pickup_contact_name: pickupContactName,
        pickup_contact_phone: pickupContactPhone,
        drop_address: dropAddress,
        drop_lat: dropLat,
        drop_lng: dropLng,
        drop_contact_name: dropContactName,
        drop_contact_phone: dropContactPhone,
        goods_category: goodsCategory,
        goods_description: goodsDescription,
        weight_kg: numWeight,
        length_ft: parseFloat(lengthFt) || 0,
        width_ft: parseFloat(widthFt) || 0,
        height_ft: parseFloat(heightFt) || 0,
        package_count: packageCount,
        loading_required: loadingRequired,
        unloading_required: unloadingRequired,
        helpers_count: helpersCount,
        vehicle_category_required: selectedVehicle,
        pricing_mode: pricingMode,
        pickup_notes: pickupNotes,
        drop_notes: dropNotes,
        special_instructions: 'Handle with high commercial care.',
        declared_value: parseFloat(declaredValue) || undefined,
        fragile_handling: fragileHandling,
        payment_method: paymentMethod,
        promo_code: promoCode || undefined,
      })

      const order = res.data
      if (order && order.order_id) {
        if (pricingMode === 'REQUEST_QUOTES') {
          router.push({
            pathname: '/transport/quotes' as any,
            params: { order_id: order.order_id, reference: order.order_reference },
          })
        } else {
          router.push({
            pathname: '/transport/tracking' as any,
            params: { order_id: order.order_id },
          })
        }
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || err.message || 'Failed to place transport order'
      Alert.alert('Booking Error', errMsg)
    } finally {
      setSubmitting(false)
    }
  }

  const totalFare = estimateData?.financials?.total_fare || 0
  const distanceKm = estimateData?.distance_km || 18.5

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.colors.surface }]}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <AppText variant="h3" bold>
            Commercial Transport
          </AppText>
          <AppText variant="caption" color="secondary">
            Heavy Cargo • Loading • Multi-Transporters
          </AppText>
        </View>
        <TouchableOpacity
          style={[styles.historyBtn, { backgroundColor: theme.colors.surface }]}
          onPress={() => router.push('/transport/quotes' as any)}
        >
          <Feather name="layers" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Pricing Mode Toggle */}
        <View style={[styles.modeToggleCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <TouchableOpacity
            style={[
              styles.modeTab,
              pricingMode === 'INSTANT_PRICE' && { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => setPricingMode('INSTANT_PRICE')}
          >
            <Ionicons
              name="flash"
              size={16}
              color={pricingMode === 'INSTANT_PRICE' ? '#FFF' : theme.colors.textPrimary}
            />
            <AppText
              variant="label"
              bold
              style={{
                marginLeft: 6,
                color: pricingMode === 'INSTANT_PRICE' ? '#FFF' : theme.colors.textPrimary,
              }}
            >
              Instant Guaranteed Price
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeTab,
              pricingMode === 'REQUEST_QUOTES' && { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => setPricingMode('REQUEST_QUOTES')}
          >
            <Ionicons
              name="chatbubbles"
              size={16}
              color={pricingMode === 'REQUEST_QUOTES' ? '#FFF' : theme.colors.textPrimary}
            />
            <AppText
              variant="label"
              bold
              style={{
                marginLeft: 6,
                color: pricingMode === 'REQUEST_QUOTES' ? '#FFF' : theme.colors.textPrimary,
              }}
            >
              Get Transporter Quotes
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Route Card */}
        <AppCard style={styles.card}>
          <AppText variant="subtitle" bold style={{ marginBottom: 12 }}>
            Transit Route
          </AppText>
          {/* Pickup */}
          <View style={styles.routeRow}>
            <View style={[styles.dotIcon, { backgroundColor: '#10B981' }]} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <AppText variant="caption" color="secondary">
                PICKUP DOCK / LOCATION
              </AppText>
              <TextInput
                style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                value={pickupAddress}
                onChangeText={setPickupAddress}
                placeholder="Enter pickup address"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
          </View>
          {/* Drop */}
          <View style={[styles.routeRow, { marginTop: 12 }]}>
            <View style={[styles.dotIcon, { backgroundColor: '#EF4444' }]} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <AppText variant="caption" color="secondary">
                DESTINATION / WAREHOUSE
              </AppText>
              <TextInput
                style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                value={dropAddress}
                onChangeText={setDropAddress}
                placeholder="Enter drop address"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.routeMeta}>
            <View style={styles.metaBadge}>
              <Feather name="map-pin" size={13} color={theme.colors.primary} />
              <AppText variant="caption" bold style={{ marginLeft: 4 }}>
                {distanceKm} km Est.
              </AppText>
            </View>
            <View style={styles.metaBadge}>
              <Feather name="clock" size={13} color="#F59E0B" />
              <AppText variant="caption" bold style={{ marginLeft: 4 }}>
                ~45 mins transit
              </AppText>
            </View>
          </View>
        </AppCard>

        {/* Cargo Specification */}
        <AppCard style={styles.card}>
          <AppText variant="subtitle" bold style={{ marginBottom: 12 }}>
            Cargo & Payload Details
          </AppText>

          {/* Category Pills */}
          <AppText variant="caption" color="secondary" style={{ marginBottom: 6 }}>
            GOODS CATEGORY
          </AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {GOODS_CATEGORIES.map((cat) => {
              const active = goodsCategory === cat.id
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.catPill,
                    {
                      backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => setGoodsCategory(cat.id)}
                >
                  <MaterialCommunityIcons
                    name={cat.icon as any}
                    size={16}
                    color={active ? '#FFF' : theme.colors.textPrimary}
                  />
                  <AppText
                    variant="caption"
                    bold
                    style={{
                      marginLeft: 6,
                      color: active ? '#FFF' : theme.colors.textPrimary,
                    }}
                  >
                    {cat.label}
                  </AppText>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          {/* Description */}
          <AppText variant="caption" color="secondary">
            DESCRIPTION & PACKAGING
          </AppText>
          <TextInput
            style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border, marginBottom: 12 }]}
            value={goodsDescription}
            onChangeText={setGoodsDescription}
            placeholder="e.g. 5 steel crates, furniture, machinery"
            placeholderTextColor={theme.colors.textMuted}
          />

          {/* Weight & Dimensions Grid */}
          <View style={styles.gridRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <AppText variant="caption" color="secondary">
                WEIGHT (KG)
              </AppText>
              <TextInput
                style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType="numeric"
                placeholder="450"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <AppText variant="caption" color="secondary">
                PACKAGES
              </AppText>
              <View style={styles.stepper}>
                <TouchableOpacity
                  onPress={() => setPackageCount(Math.max(1, packageCount - 1))}
                  style={[styles.stepBtn, { borderColor: theme.colors.border }]}
                >
                  <Feather name="minus" size={14} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <AppText variant="body" bold style={{ marginHorizontal: 8 }}>
                  {packageCount}
                </AppText>
                <TouchableOpacity
                  onPress={() => setPackageCount(packageCount + 1)}
                  style={[styles.stepBtn, { borderColor: theme.colors.border }]}
                >
                  <Feather name="plus" size={14} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Dimensions (L x W x H) */}
          <View style={[styles.gridRow, { marginTop: 10 }]}>
            <View style={{ flex: 1, marginRight: 4 }}>
              <AppText variant="caption" color="secondary">
                LEN (FT)
              </AppText>
              <TextInput
                style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                value={lengthFt}
                onChangeText={setLengthFt}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1, marginHorizontal: 4 }}>
              <AppText variant="caption" color="secondary">
                WID (FT)
              </AppText>
              <TextInput
                style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                value={widthFt}
                onChangeText={setWidthFt}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1, marginLeft: 4 }}>
              <AppText variant="caption" color="secondary">
                HT (FT)
              </AppText>
              <TextInput
                style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                value={heightFt}
                onChangeText={setHeightFt}
                keyboardType="numeric"
              />
            </View>
          </View>
        </AppCard>

        {/* Commercial Vehicle Taxonomy Selection */}
        <AppCard style={styles.card}>
          <AppText variant="subtitle" bold style={{ marginBottom: 4 }}>
            Choose Commercial Truck
          </AppText>
          <AppText variant="caption" color="secondary" style={{ marginBottom: 12 }}>
            Payload capacity verified against cargo weight
          </AppText>

          {VEHICLE_CATEGORIES.map((veh) => {
            const isSelected = selectedVehicle === veh.id
            return (
              <TouchableOpacity
                key={veh.id}
                style={[
                  styles.vehCard,
                  {
                    backgroundColor: isSelected
                      ? isDark
                        ? '#1E293B'
                        : '#EFF6FF'
                      : theme.colors.surface,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => setSelectedVehicle(veh.id)}
              >
                <View style={[styles.vehIconBox, { backgroundColor: isSelected ? theme.colors.primary : '#E2E8F0' }]}>
                  <MaterialCommunityIcons
                    name={veh.icon as any}
                    size={22}
                    color={isSelected ? '#FFF' : '#334155'}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <AppText variant="body" bold>
                      {veh.name}
                    </AppText>
                    <AppBadge label={veh.tag} variant={isSelected ? 'success' : 'default'} />
                  </View>
                  <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                    Max {veh.capacity} • {veh.volume} • {veh.helpers}
                  </AppText>
                </View>
              </TouchableOpacity>
            )
          })}
        </AppCard>

        {/* Loading Assistance & Helpers */}
        <AppCard style={styles.card}>
          <AppText variant="subtitle" bold style={{ marginBottom: 12 }}>
            Loading Assistance & Helpers
          </AppText>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="body" bold>
                Loading Assistance
              </AppText>
              <AppText variant="caption" color="secondary">
                Driver & helper assistance at pickup dock
              </AppText>
            </View>
            <TouchableOpacity
              onPress={() => setLoadingRequired(!loadingRequired)}
              style={[
                styles.togglePill,
                { backgroundColor: loadingRequired ? theme.colors.primary : theme.colors.border },
              ]}
            >
              <AppText variant="caption" bold style={{ color: '#FFF' }}>
                {loadingRequired ? 'YES' : 'NO'}
              </AppText>
            </TouchableOpacity>
          </View>

          <View style={[styles.switchRow, { marginTop: 12 }]}>
            <View style={{ flex: 1 }}>
              <AppText variant="body" bold>
                Unloading Assistance
              </AppText>
              <AppText variant="caption" color="secondary">
                Assistance at destination warehouse
              </AppText>
            </View>
            <TouchableOpacity
              onPress={() => setUnloadingRequired(!unloadingRequired)}
              style={[
                styles.togglePill,
                { backgroundColor: unloadingRequired ? theme.colors.primary : theme.colors.border },
              ]}
            >
              <AppText variant="caption" bold style={{ color: '#FFF' }}>
                {unloadingRequired ? 'YES' : 'NO'}
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Helpers count */}
          <View style={[styles.switchRow, { marginTop: 12 }]}>
            <View style={{ flex: 1 }}>
              <AppText variant="body" bold>
                Dedicated Helpers (₹350/helper)
              </AppText>
              <AppText variant="caption" color="secondary">
                Trained heavy lifting helpers
              </AppText>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity
                onPress={() => setHelpersCount(Math.max(0, helpersCount - 1))}
                style={[styles.stepBtn, { borderColor: theme.colors.border }]}
              >
                <Feather name="minus" size={14} color={theme.colors.textPrimary} />
              </TouchableOpacity>
              <AppText variant="body" bold style={{ marginHorizontal: 10 }}>
                {helpersCount}
              </AppText>
              <TouchableOpacity
                onPress={() => setHelpersCount(Math.min(4, helpersCount + 1))}
                style={[styles.stepBtn, { borderColor: theme.colors.border }]}
              >
                <Feather name="plus" size={14} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        </AppCard>

        {/* Financial Breakdown Card */}
        {estimateData?.financials && (
          <AppCard style={styles.card}>
            <AppText variant="subtitle" bold style={{ marginBottom: 10 }}>
              Price Breakdown (Itemized)
            </AppText>
            <View style={styles.fareRow}>
              <AppText variant="bodyS" color="secondary">
                Base Truck Fare
              </AppText>
              <AppText variant="bodyS" bold>
                ₹{estimateData.financials.base_fare}
              </AppText>
            </View>
            <View style={styles.fareRow}>
              <AppText variant="bodyS" color="secondary">
                Distance Charge ({distanceKm} km)
              </AppText>
              <AppText variant="bodyS" bold>
                ₹{estimateData.financials.distance_fare}
              </AppText>
            </View>
            {estimateData.financials.weight_fare > 0 && (
              <View style={styles.fareRow}>
                <AppText variant="bodyS" color="secondary">
                  Cargo Weight Surcharge
                </AppText>
                <AppText variant="bodyS" bold>
                  ₹{estimateData.financials.weight_fare}
                </AppText>
              </View>
            )}
            {estimateData.financials.helpers_fare > 0 && (
              <View style={styles.fareRow}>
                <AppText variant="bodyS" color="secondary">
                  Helpers ({helpersCount} × ₹350)
                </AppText>
                <AppText variant="bodyS" bold>
                  ₹{estimateData.financials.helpers_fare}
                </AppText>
              </View>
            )}
            {estimateData.financials.loading_fare > 0 && (
              <View style={styles.fareRow}>
                <AppText variant="bodyS" color="secondary">
                  Loading / Unloading Fee
                </AppText>
                <AppText variant="bodyS" bold>
                  ₹{estimateData.financials.loading_fare + estimateData.financials.unloading_fare}
                </AppText>
              </View>
            )}
            {estimateData.financials.discount_amount > 0 && (
              <View style={styles.fareRow}>
                <AppText variant="bodyS" color="success">
                  Promo Discount ({promoCode})
                </AppText>
                <AppText variant="bodyS" bold color="success">
                  - ₹{estimateData.financials.discount_amount}
                </AppText>
              </View>
            )}
            <View style={[styles.fareRow, { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 8, marginTop: 4 }]}>
              <AppText variant="subtitle" bold>
                Total Estimate
              </AppText>
              <AppText variant="h3" bold color="brand">
                ₹{totalFare}
              </AppText>
            </View>
          </AppCard>
        )}
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={[styles.bottomBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
        <View>
          <AppText variant="caption" color="secondary">
            {pricingMode === 'INSTANT_PRICE' ? 'ESTIMATED TOTAL' : 'MODE'}
          </AppText>
          <AppText variant="h2" bold color="brand">
            {pricingMode === 'INSTANT_PRICE' ? `₹${totalFare}` : 'Quotes Bidding'}
          </AppText>
        </View>
        <AppButton
          variant="primary"
          size="lg"
          loading={submitting}
          onPress={handleCreateOrder}
          style={{ minWidth: 190 }}
        >
          {pricingMode === 'INSTANT_PRICE' ? 'Book Transport ⚡' : 'Request Quotes 💬'}
        </AppButton>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: { padding: 16, paddingBottom: 100 },
  modeToggleCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    marginBottom: 14,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  card: { padding: 16, marginBottom: 14, borderRadius: 14 },
  routeRow: { flexDirection: 'row', alignItems: 'center' },
  dotIcon: { width: 10, height: 10, borderRadius: 5, marginTop: 14 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
    fontSize: 14,
  },
  routeMeta: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#E2E8F0',
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  gridRow: { flexDirection: 'row', alignItems: 'center' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
    justifyContent: 'space-between',
  },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  vehIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  togglePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
})
