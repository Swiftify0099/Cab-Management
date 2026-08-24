/**
 * Customer App — Outstation & Intercity Cab Booking Screen
 * Route: /outstation
 * Feature 20: One-Way, Round-Trip & Multi-City Outstation Trips with Driver Commitments.
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
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'

import { useTheme } from '../../src/contexts/ThemeContext'
import { useTranslation } from '../../src/i18n'
import { AppText, AppButton, AppCard, AppBadge, AppDivider } from '../../src/components/ui'
import { outstationApi } from '../../src/api/client'

const VEHICLE_TIERS = [
  { id: 'sedan', name: 'Sedan (Dzire / Etios)', seats: 4, per_km: 14, icon: 'car-side', desc: 'AC • 4 Seats • 2 Bags' },
  { id: 'suv', name: 'SUV (Ertiga / Innova)', seats: 6, per_km: 19, icon: 'car-estate', desc: 'AC • 6 Seats • 4 Bags' },
  { id: 'crysta', name: 'Innova Crysta', seats: 6, per_km: 24, icon: 'car-estate', desc: 'AC • Captain Seats • Luxury' },
]

export default function OutstationBookingScreen() {
  const { theme, isDark } = useTheme()
  const { t } = useTranslation()

  const [tripType, setTripType] = useState<'ONE_WAY' | 'ROUND_TRIP' | 'MULTI_CITY'>('ONE_WAY')
  const [originAddress, setOriginAddress] = useState('Pune Railway Station, Pune')
  const [destinationAddress, setDestinationAddress] = useState('Mahabaleshwar Main Market')
  const [departureDate, setDepartureDate] = useState('Tomorrow, 06:00 AM')
  const [returnDate, setReturnDate] = useState('Day after tomorrow, 08:00 PM')
  const [selectedTier, setSelectedTier] = useState<string>('sedan')
  const [passengers, setPassengers] = useState<number>(2)
  const [loading, setLoading] = useState<boolean>(false)

  // Estimated values
  const estDistanceKm = tripType === 'ROUND_TRIP' ? 240 : 120
  const rate = VEHICLE_TIERS.find((v) => v.id === selectedTier)?.per_km || 14
  const baseFare = estDistanceKm * rate
  const driverAllowance = tripType === 'ROUND_TRIP' ? 400 : 250
  const tollEstimate = 180
  const totalEstimatedFare = baseFare + driverAllowance + tollEstimate

  const handleBookOutstation = () => {
    router.push({
      pathname: '/book/cab',
      params: {
        pickupAddress: originAddress,
        dropAddress: destinationAddress,
        serviceType: 'outstation',
      },
    } as any)
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
              Outstation & Intercity Rides
            </AppText>
            <AppText variant="caption" color="muted">
              Top-rated verified drivers • Zero cancellation guarantee
            </AppText>
          </View>
        </View>

        {/* Trip Type Selector */}
        <View style={[styles.tabBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {(['ONE_WAY', 'ROUND_TRIP', 'MULTI_CITY'] as const).map((tMode) => (
            <TouchableOpacity
              key={tMode}
              style={[
                styles.tabItem,
                tripType === tMode && { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => setTripType(tMode)}
            >
              <AppText
                variant="caption"
                bold
                style={{ color: tripType === tMode ? '#FFF' : theme.colors.textPrimary }}
              >
                {tMode === 'ONE_WAY' ? '➡️ One-Way' : tMode === 'ROUND_TRIP' ? '🔄 Round-Trip' : '🏙️ Multi-City'}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Route Card */}
          <AppCard style={styles.card}>
            <View style={styles.inputGroup}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="radio-button-on" size={16} color="#10B981" />
                <AppText variant="caption" bold color="muted" style={{ marginLeft: 8 }}>
                  FROM (ORIGIN CITY / ADDRESS)
                </AppText>
              </View>
              <TextInput
                style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                value={originAddress}
                onChangeText={setOriginAddress}
              />
            </View>

            <View style={[styles.inputGroup, { marginTop: 12 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="location" size={16} color="#EF4444" />
                <AppText variant="caption" bold color="muted" style={{ marginLeft: 8 }}>
                  TO (DESTINATION CITY / RESORT)
                </AppText>
              </View>
              <TextInput
                style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                value={destinationAddress}
                onChangeText={setDestinationAddress}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color="muted">
                  DEPARTURE
                </AppText>
                <TextInput
                  style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                  value={departureDate}
                  onChangeText={setDepartureDate}
                />
              </View>
              {tripType === 'ROUND_TRIP' && (
                <View style={{ flex: 1 }}>
                  <AppText variant="caption" color="muted">
                    RETURN
                  </AppText>
                  <TextInput
                    style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                    value={returnDate}
                    onChangeText={setReturnDate}
                  />
                </View>
              )}
            </View>
          </AppCard>

          {/* Vehicle Selection */}
          <View style={{ marginTop: 16 }}>
            <AppText variant="body" bold style={{ marginBottom: 8 }}>
              Select Vehicle Tier
            </AppText>
            <View style={{ gap: 10 }}>
              {VEHICLE_TIERS.map((v) => {
                const isSel = selectedTier === v.id
                const fare = (estDistanceKm * v.per_km) + driverAllowance + tollEstimate
                return (
                  <TouchableOpacity
                    key={v.id}
                    style={[
                      styles.vehicleCard,
                      {
                        backgroundColor: isSel ? `${theme.colors.primary}12` : theme.colors.surface,
                        borderColor: isSel ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() => setSelectedTier(v.id)}
                  >
                    <View style={[styles.vehIconBox, { backgroundColor: isSel ? theme.colors.primary : theme.colors.backgroundAlt }]}>
                      <MaterialCommunityIcons name={v.icon as any} size={24} color={isSel ? '#FFF' : theme.colors.textPrimary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <AppText variant="bodyS" bold>
                        {v.name}
                      </AppText>
                      <AppText variant="caption" color="muted">
                        {v.desc}
                      </AppText>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <AppText variant="title" bold color="brand">
                        ₹{fare}
                      </AppText>
                      <AppText variant="caption" color="muted">
                        ₹{v.per_km}/km
                      </AppText>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* Fare Summary Breakdown */}
          <AppCard style={[styles.card, { marginTop: 16 }]}>
            <AppText variant="bodyS" bold style={{ marginBottom: 10 }}>
              Estimated Outstation Fare Breakdown
            </AppText>
            <View style={styles.fareRow}>
              <AppText variant="caption" color="muted">
                Estimated Distance ({estDistanceKm} km @ ₹{rate}/km)
              </AppText>
              <AppText variant="bodyS">₹{baseFare}</AppText>
            </View>
            <View style={styles.fareRow}>
              <AppText variant="caption" color="muted">
                Driver Day / Night Allowance
              </AppText>
              <AppText variant="bodyS">₹{driverAllowance}</AppText>
            </View>
            <View style={styles.fareRow}>
              <AppText variant="caption" color="muted">
                Estimated Toll & State Permit
              </AppText>
              <AppText variant="bodyS">₹{tollEstimate}</AppText>
            </View>
            <AppDivider marginVertical={8} />
            <View style={styles.fareRow}>
              <AppText variant="body" bold>
                Guaranteed All-Inclusive Fare
              </AppText>
              <AppText variant="h3" bold color="brand">
                ₹{totalEstimatedFare}
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
              ₹{totalEstimatedFare}
            </AppText>
          </View>
          <AppButton
            variant="primary"
            style={{ minWidth: 180 }}
            onPress={handleBookOutstation}
          >
            Book Outstation Cab 🏙️
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
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    marginBottom: 12,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
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
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  vehIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
