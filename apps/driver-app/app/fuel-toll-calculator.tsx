/**
 * Fuel & Toll Calculator Screen
 * ─────────────────────────────────────────────────────────────
 * Standalone calculator screen for drivers to estimate:
 *  - Fuel cost based on vehicle mileage + fuel price
 *  - Toll cost based on route and vehicle type
 *  - Net earnings after all deductions
 *
 * Premium dark UI with interactive sliders and live calculation.
 */
import React, { useState, useMemo } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import {
  calculateTripBreakdown, VEHICLE_MILEAGE, formatINR,
  DEFAULT_FUEL_PRICE,
} from '../src/services/fuelCalculator'
import { quickTollEstimate } from '../src/services/tollCalculator'

// ─── Vehicle Options ───────────────────────────────────────────
const VEHICLES = [
  { key: 'sedan',           label: 'Sedan',     icon: 'car',              mileage: 16 },
  { key: 'suv',             label: 'SUV',        icon: 'car-sport',        mileage: 12 },
  { key: 'mini',            label: 'Mini',       icon: 'car-outline',      mileage: 18 },
  { key: 'tempo_traveller', label: 'Tempo',      icon: 'bus',              mileage: 8  },
  { key: 'bus',             label: 'Bus',        icon: 'bus-outline',      mileage: 6  },
] as const

export default function FuelTollCalculatorScreen() {
  // Inputs
  const [distance,    setDistance]    = useState('240')
  const [fare,        setFare]        = useState('2400')
  const [fuelPrice,   setFuelPrice]   = useState(String(DEFAULT_FUEL_PRICE))
  const [vehicle,     setVehicle]     = useState('sedan')
  const [customMileage, setCustomMileage] = useState('')
  const [isExpressway, setExpressway] = useState(false)

  // Computed
  const result = useMemo(() => {
    const distKm   = parseFloat(distance)  || 0
    const fareAmt  = parseFloat(fare)      || 0
    const priceL   = parseFloat(fuelPrice) || DEFAULT_FUEL_PRICE
    const custom   = customMileage ? parseFloat(customMileage) : undefined
    const toll     = quickTollEstimate(distKm, vehicle, isExpressway)

    return calculateTripBreakdown(distKm, fareAmt, vehicle, toll, custom, priceL)
  }, [distance, fare, fuelPrice, vehicle, customMileage, isExpressway])

  const profitColor = result.netProfit > 0
    ? '#10B981' : result.netProfit === 0 ? '#F59E0B' : '#EF4444'

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0F1E" />
      <LinearGradient
        colors={['#0A0F1E', '#111827', '#0A0F1E']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color="#38BDF8" />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Fuel & Toll Calculator</Text>
            <Text style={styles.subtitle}>Estimate your trip earnings</Text>
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ─── Vehicle Selector ─────────────────────────── */}
            <Text style={styles.sectionLabel}>Vehicle Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehicleRow}>
              {VEHICLES.map(v => (
                <TouchableOpacity
                  key={v.key}
                  style={[styles.vehicleChip, vehicle === v.key && styles.vehicleChipActive]}
                  onPress={() => setVehicle(v.key)}
                >
                  <Ionicons
                    name={v.icon as any}
                    size={20}
                    color={vehicle === v.key ? '#38BDF8' : '#64748B'}
                  />
                  <Text style={[
                    styles.vehicleLabel,
                    vehicle === v.key && styles.vehicleLabelActive,
                  ]}>
                    {v.label}
                  </Text>
                  <Text style={styles.vehicleMileage}>{v.mileage} km/L</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* ─── Input Fields ─────────────────────────────── */}
            <Text style={styles.sectionLabel}>Trip Details</Text>
            <View style={styles.inputGrid}>
              <InputCard
                label="Distance (km)"
                icon="map"
                value={distance}
                onChange={setDistance}
                keyboardType="decimal-pad"
                placeholder="e.g. 240"
              />
              <InputCard
                label="Total Fare (₹)"
                icon="dollar-sign"
                value={fare}
                onChange={setFare}
                keyboardType="decimal-pad"
                placeholder="e.g. 2400"
              />
              <InputCard
                label="Fuel Price (₹/L)"
                icon="droplet"
                value={fuelPrice}
                onChange={setFuelPrice}
                keyboardType="decimal-pad"
                placeholder={String(DEFAULT_FUEL_PRICE)}
              />
              <InputCard
                label="Custom Mileage (km/L)"
                icon="activity"
                value={customMileage}
                onChange={setCustomMileage}
                keyboardType="decimal-pad"
                placeholder={`Default: ${VEHICLE_MILEAGE[vehicle] ?? 14}`}
              />
            </View>

            {/* Expressway toggle */}
            <TouchableOpacity
              style={[styles.toggleRow, isExpressway && styles.toggleRowActive]}
              onPress={() => setExpressway(e => !e)}
            >
              <View>
                <Text style={styles.toggleLabel}>Expressway Route</Text>
                <Text style={styles.toggleSub}>Higher toll rates (NHAI FastTag)</Text>
              </View>
              <View style={[styles.toggleDot, isExpressway && styles.toggleDotActive]}>
                {isExpressway && <Feather name="check" size={12} color="#fff" />}
              </View>
            </TouchableOpacity>

            {/* ─── Results ──────────────────────────────────── */}
            <Text style={styles.sectionLabel}>Cost Breakdown</Text>
            <LinearGradient
              colors={['rgba(30,41,59,0.95)', 'rgba(15,23,42,0.95)']}
              style={styles.resultsCard}
            >
              <ResultRow emoji="🛣️" label="Distance"         value={`${result.distanceKm} km`}    color="#CBD5E1" />
              <ResultRow emoji="⛽" label="Fuel Used"         value={`${result.fuelLitres}L`}       color="#F59E0B" />
              <ResultRow emoji="💸" label="Fuel Cost"         value={formatINR(result.fuelCost)}   color="#EF4444" />
              <ResultRow emoji="🏷️"  label="Toll (FastTag)"   value={formatINR(result.tollCost)}   color="#8B5CF6" />

              <View style={styles.dividerLine} />

              <ResultRow emoji="🎫" label="Platform Fee (8%)"
                value={formatINR(result.fareAmount ? (result.fareAmount * 0.08) : 0)}
                color="#64748B"
              />
              <ResultRow emoji="💰" label="Gross Fare"         value={formatINR(result.fare)}       color="#10B981" />

              {/* Net Earnings — large display */}
              <LinearGradient
                colors={['rgba(16,185,129,0.15)', 'rgba(16,185,129,0.05)']}
                style={styles.netBox}
              >
                <Text style={styles.netLabel}>Net Earnings</Text>
                <Text style={[styles.netAmount, { color: profitColor }]}>
                  {formatINR(result.netProfit)}
                </Text>
                <View style={styles.profitRow}>
                  <Text style={[styles.profitPct, { color: profitColor }]}>
                    {result.profitPercent}% profit margin
                  </Text>
                  {result.profitPercent < 20 && (
                    <View style={styles.warnBadge}>
                      <Feather name="alert-circle" size={11} color="#F59E0B" />
                      <Text style={styles.warnText}>Low margin</Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
            </LinearGradient>

            {/* Tip */}
            <View style={styles.tipCard}>
              <Feather name="info" size={14} color="#38BDF8" />
              <Text style={styles.tipText}>
                Tip: For higher profit margins, pick trips with ₹{Math.round(result.distanceKm * 12)}+ fare for this distance.
              </Text>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

// ─── Sub-components ───────────────────────────────────────────
function InputCard({
  label, icon, value, onChange, keyboardType, placeholder
}: {
  label: string; icon: string; value: string
  onChange: (v: string) => void; keyboardType?: any; placeholder?: string
}) {
  return (
    <View style={iStyles.card}>
      <View style={iStyles.labelRow}>
        <Feather name={icon as any} size={12} color="#64748B" />
        <Text style={iStyles.label}>{label}</Text>
      </View>
      <TextInput
        style={iStyles.input}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType ?? 'default'}
        placeholder={placeholder}
        placeholderTextColor="#475569"
        returnKeyType="done"
      />
    </View>
  )
}

function ResultRow({ emoji, label, value, color }: {
  emoji: string; label: string; value: string; color: string
}) {
  return (
    <View style={rStyles.row}>
      <Text style={rStyles.emoji}>{emoji}</Text>
      <Text style={rStyles.label}>{label}</Text>
      <Text style={[rStyles.value, { color }]}>{value}</Text>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#0A0F1E' },
  scroll:  { padding: 20 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(56,189,248,0.1)', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(56,189,248,0.3)',
  },
  title:    { color: '#F1F5F9', fontSize: 18, fontWeight: '800' },
  subtitle: { color: '#64748B', fontSize: 12, marginTop: 2 },

  sectionLabel: {
    color: '#94A3B8', fontSize: 11, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase',
    marginBottom: 10, marginTop: 4,
  },

  vehicleRow: { marginBottom: 20, marginHorizontal: -4 },
  vehicleChip: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14, paddingVertical: 10, marginRight: 10,
    alignItems: 'center', gap: 4,
  },
  vehicleChipActive: {
    backgroundColor: 'rgba(56,189,248,0.12)',
    borderColor: 'rgba(56,189,248,0.4)',
  },
  vehicleLabel: { color: '#64748B', fontSize: 12, fontWeight: '600' },
  vehicleLabelActive: { color: '#38BDF8' },
  vehicleMileage: { color: '#475569', fontSize: 10 },

  inputGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14,
  },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  toggleRowActive: {
    backgroundColor: 'rgba(139,92,246,0.1)',
    borderColor: 'rgba(139,92,246,0.3)',
  },
  toggleLabel: { color: '#F1F5F9', fontSize: 14, fontWeight: '600' },
  toggleSub:   { color: '#64748B', fontSize: 11, marginTop: 2 },
  toggleDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  toggleDotActive: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },

  resultsCard: {
    borderRadius: 20, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  dividerLine: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 14,
  },
  netBox: {
    marginTop: 14, borderRadius: 16, padding: 20, alignItems: 'center',
  },
  netLabel:  { color: '#94A3B8', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  netAmount: { fontSize: 40, fontWeight: '900', marginBottom: 8 },
  profitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  profitPct: { fontSize: 13, fontWeight: '700' },
  warnBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  warnText: { color: '#F59E0B', fontSize: 10, fontWeight: '600' },

  tipCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: 'rgba(56,189,248,0.07)',
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(56,189,248,0.2)',
  },
  tipText: { flex: 1, color: '#94A3B8', fontSize: 12, lineHeight: 18 },
})

const iStyles = StyleSheet.create({
  card: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  label:    { color: '#64748B', fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  input: {
    color: '#F1F5F9', fontSize: 16, fontWeight: '700',
    padding: 0, borderBottomWidth: 1, borderBottomColor: 'rgba(56,189,248,0.2)',
    paddingBottom: 4,
  },
})

const rStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  emoji: { fontSize: 16, width: 26 },
  label: { flex: 1, color: '#94A3B8', fontSize: 13 },
  value: { fontSize: 14, fontWeight: '700' },
})
