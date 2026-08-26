/**
 * Customer App — Packers & Movers / House Relocation Screen
 * Route: /packers
 * Specialized House Shifting & Office Moving with Helpers, Floors, and Inventory.
 */
import React, { useState } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  StatusBar,
  Alert,
  Switch,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'

import { useTheme } from '../../src/contexts/ThemeContext'
import { useTranslation } from '../../src/i18n'
import { AppText, AppButton, AppCard, AppBadge, AppDivider } from '../../src/components/ui'
import { transportApi } from '../../src/api/client'

const SHIFTING_TYPES = [
  { id: '1BHK', label: '1 BHK House', truck: 'Tata Ace (750 kg)', helpers: 2, base: 2499, icon: 'home-outline' },
  { id: '2BHK', label: '2 BHK House', truck: 'Pickup 8ft (1.5 Ton)', helpers: 2, base: 3999, icon: 'home' },
  { id: '3BHK', label: '3 BHK / Villa', truck: 'Eicher 14ft (4 Ton)', helpers: 4, base: 6999, icon: 'home-city-outline' },
  { id: 'OFFICE', label: 'Office Shifting', truck: 'Truck 19ft (8 Ton)', helpers: 4, base: 8999, icon: 'office-building' },
  { id: 'FEW_ITEMS', label: 'Few Furniture Items', truck: 'Mini Truck (Tata Ace)', helpers: 1, base: 1499, icon: 'chair-rolling' },
]

export default function PackersMoversScreen() {
  const { theme, isDark } = useTheme()
  const { t } = useTranslation()

  const [selectedType, setSelectedType] = useState<string>('2BHK')
  const [pickupAddress, setPickupAddress] = useState('Koregaon Park, Pune')
  const [pickupFloor, setPickupFloor] = useState('3rd Floor')
  const [pickupHasLift, setPickupHasLift] = useState(true)

  const [dropAddress, setDropAddress] = useState('Kalyani Nagar, Pune')
  const [dropFloor, setDropFloor] = useState('1st Floor')
  const [dropHasLift, setDropHasLift] = useState(true)

  const [shiftingDate, setShiftingDate] = useState('Saturday, 29 Aug 2026 - 09:00 AM')
  const [needPacking, setNeedPacking] = useState(true)
  const [needDismantling, setNeedDismantling] = useState(true)
  const [bookingLoading, setBookingLoading] = useState(false)

  const currentType = SHIFTING_TYPES.find((s) => s.id === selectedType) || SHIFTING_TYPES[1]
  const baseCost = currentType.base
  const packingAddon = needPacking ? 800 : 0
  const dismantlingAddon = needDismantling ? 500 : 0
  const floorFee = (!pickupHasLift ? 300 : 0) + (!dropHasLift ? 300 : 0)
  const totalEstimate = baseCost + packingAddon + dismantlingAddon + floorFee

  const handleBookPackers = async () => {
    setBookingLoading(true)
    try {
      // Forward to transport create or confirm order
      router.push({
        pathname: '/transport/create',
        params: {
          pickupAddress,
          dropAddress,
          goodsType: 'HOUSEHOLD',
          vehicleCategory: selectedType === '1BHK' ? 'TATA_ACE' : selectedType === '2BHK' ? 'BOLERO_PICKUP' : 'EICHER_14FT',
          helpers: currentType.helpers.toString(),
        },
      } as any)
    } finally {
      setBookingLoading(false)
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.backgroundAlt }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText variant="title" bold>
              Packers & Movers
            </AppText>
            <AppText variant="caption" color="muted">
              House shifting • Verified helpers • Safe handling
            </AppText>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Shifting House Size Selection */}
          <View>
            <AppText variant="body" bold style={{ marginBottom: 10 }}>
              1. Select Relocation Type
            </AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {SHIFTING_TYPES.map((type) => {
                const isSel = selectedType === type.id
                return (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeCard,
                      {
                        backgroundColor: isSel ? `${theme.colors.primary}15` : theme.colors.surface,
                        borderColor: isSel ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() => setSelectedType(type.id)}
                  >
                    <MaterialCommunityIcons
                      name={type.icon as any}
                      size={28}
                      color={isSel ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <AppText variant="bodyS" bold style={{ marginTop: 8 }}>
                      {type.label}
                    </AppText>
                    <AppText variant="caption" color="muted">
                      {type.truck}
                    </AppText>
                    <AppText variant="caption" color="muted">
                      👥 {type.helpers} Helpers Included
                    </AppText>
                    <AppText variant="title" bold color="brand" style={{ marginTop: 6 }}>
                      ₹{type.base}
                    </AppText>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>

          {/* Pickup & Destination Details */}
          <AppCard style={[styles.card, { marginTop: 16 }]}>
            <AppText variant="bodyS" bold style={{ marginBottom: 10 }}>
              2. Pickup & Drop Locations
            </AppText>

            {/* Pickup */}
            <View style={styles.inputGroup}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="radio-button-on" size={16} color="#10B981" />
                <AppText variant="caption" color="muted" style={{ marginLeft: 6 }}>
                  PICKUP ADDRESS
                </AppText>
              </View>
              <TextInput
                style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                value={pickupAddress}
                onChangeText={setPickupAddress}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <TextInput
                    style={[styles.inputSm, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                    value={pickupFloor}
                    onChangeText={setPickupFloor}
                    placeholder="Floor (e.g. 3rd)"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AppText variant="caption">Elevator / Lift</AppText>
                  <Switch value={pickupHasLift} onValueChange={setPickupHasLift} trackColor={{ true: theme.colors.primary }} />
                </View>
              </View>
            </View>

            <AppDivider marginVertical={12} />

            {/* Drop */}
            <View style={styles.inputGroup}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="location" size={16} color="#EF4444" />
                <AppText variant="caption" color="muted" style={{ marginLeft: 6 }}>
                  NEW HOUSE DESTINATION
                </AppText>
              </View>
              <TextInput
                style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                value={dropAddress}
                onChangeText={setDropAddress}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <TextInput
                    style={[styles.inputSm, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                    value={dropFloor}
                    onChangeText={setDropFloor}
                    placeholder="Floor (e.g. 1st)"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AppText variant="caption">Elevator / Lift</AppText>
                  <Switch value={dropHasLift} onValueChange={setDropHasLift} trackColor={{ true: theme.colors.primary }} />
                </View>
              </View>
            </View>

            {/* Date */}
            <View style={[styles.inputGroup, { marginTop: 12 }]}>
              <AppText variant="caption" color="muted">
                PREFERRED SHIFTING DATE & TIME
              </AppText>
              <TextInput
                style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                value={shiftingDate}
                onChangeText={setShiftingDate}
              />
            </View>
          </AppCard>

          {/* Add-on Services */}
          <AppCard style={[styles.card, { marginTop: 16 }]}>
            <AppText variant="bodyS" bold style={{ marginBottom: 8 }}>
              3. Protection & Add-ons
            </AppText>

            <View style={styles.addonRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyS" bold>
                  Multi-layer Bubble & Box Packing (+₹800)
                </AppText>
                <AppText variant="caption" color="muted">
                  High-grade bubble wraps, carton boxes & tape
                </AppText>
              </View>
              <Switch value={needPacking} onValueChange={setNeedPacking} trackColor={{ true: theme.colors.primary }} />
            </View>

            <AppDivider marginVertical={8} />

            <View style={styles.addonRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyS" bold>
                  Bed & Wardrobe Dismantling (+₹500)
                </AppText>
                <AppText variant="caption" color="muted">
                  Carpentry tools & re-assembly at destination
                </AppText>
              </View>
              <Switch value={needDismantling} onValueChange={setNeedDismantling} trackColor={{ true: theme.colors.primary }} />
            </View>
          </AppCard>

          {/* Price Breakdown */}
          <AppCard style={[styles.card, { marginTop: 16 }]}>
            <AppText variant="bodyS" bold style={{ marginBottom: 8 }}>
              Estimated Shifting Estimate
            </AppText>
            <View style={styles.fareRow}>
              <AppText variant="caption" color="muted">
                Base ({currentType.label} + {currentType.truck})
              </AppText>
              <AppText variant="bodyS">₹{baseCost}</AppText>
            </View>
            {needPacking && (
              <View style={styles.fareRow}>
                <AppText variant="caption" color="muted">
                  Protective Bubble Packing
                </AppText>
                <AppText variant="bodyS">₹{packingAddon}</AppText>
              </View>
            )}
            {needDismantling && (
              <View style={styles.fareRow}>
                <AppText variant="caption" color="muted">
                  Furniture Dismantle & Assemble
                </AppText>
                <AppText variant="bodyS">₹{dismantlingAddon}</AppText>
              </View>
            )}
            {floorFee > 0 && (
              <View style={styles.fareRow}>
                <AppText variant="caption" color="muted">
                  Staircase Labour Fee (No Lift)
                </AppText>
                <AppText variant="bodyS">₹{floorFee}</AppText>
              </View>
            )}
            <AppDivider marginVertical={8} />
            <View style={styles.fareRow}>
              <AppText variant="body" bold>
                Total Guaranteed Price
              </AppText>
              <AppText variant="h3" bold color="brand">
                ₹{totalEstimate}
              </AppText>
            </View>
          </AppCard>
        </ScrollView>

        {/* Bottom Bar */}
        <View style={[styles.bottomBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
          <View>
            <AppText variant="caption" color="muted">
              Estimated Total
            </AppText>
            <AppText variant="h2" bold color="brand">
              ₹{totalEstimate}
            </AppText>
          </View>
          <AppButton
            variant="primary"
            style={{ minWidth: 180 }}
            onPress={handleBookPackers}
            loading={bookingLoading}
          >
            Book Shifting 📦
          </AppButton>
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  typeCard: {
    width: 165,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  card: {
    padding: 16,
    borderRadius: 16,
  },
  inputGroup: {
    gap: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },
  inputSm: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    fontSize: 12,
  },
  addonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
})
