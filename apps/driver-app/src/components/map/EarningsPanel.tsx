/**
 * EarningsPanel Component
 * ─────────────────────────────────────────────────────────────
 * Bottom HUD panel for the driver map screens showing:
 *   Distance remaining, ETA, Fuel Cost, Toll Cost, Net Earnings
 * Designed as a frosted glass card that sits above the map.
 */
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { formatINR } from '../../services/fuelCalculator'

// ─── Types ────────────────────────────────────────────────────
interface EarningsPanelProps {
  distanceKm: number
  etaText: string          // e.g. "4h 15m"
  fuelCost: number         // ₹
  tollCost: number         // ₹
  grossFare: number        // ₹ total fare
  nightMode?: boolean
  onDetailsPress?: () => void  // opens full breakdown screen
}

// ─── Component ────────────────────────────────────────────────
export function EarningsPanel({
  distanceKm,
  etaText,
  fuelCost,
  tollCost,
  grossFare,
  nightMode = false,
  onDetailsPress,
}: EarningsPanelProps) {
  const platformFee = Math.round(grossFare * 0.08)
  const netEarnings = Math.max(0, grossFare - fuelCost - tollCost - platformFee)

  const bgColors = nightMode
    ? ['rgba(15,23,42,0.95)', 'rgba(30,41,59,0.98)'] as const
    : ['rgba(255,255,255,0.95)', 'rgba(248,250,252,0.98)'] as const

  const textColor     = nightMode ? '#F1F5F9' : '#0F172A'
  const subTextColor  = nightMode ? '#94A3B8' : '#64748B'
  const borderColor   = nightMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'

  return (
    <LinearGradient
      colors={bgColors}
      style={[styles.panel, { borderTopColor: borderColor }]}
    >
      {/* Top row — Distance + ETA */}
      <View style={styles.row}>
        <StatItem
          icon="map"
          label="Distance"
          value={`${distanceKm} km`}
          valueColor="#3B82F6"
          textColor={textColor}
          subColor={subTextColor}
        />
        <View style={[styles.divider, { backgroundColor: borderColor }]} />
        <StatItem
          icon="clock"
          label="ETA"
          value={etaText}
          valueColor="#10B981"
          textColor={textColor}
          subColor={subTextColor}
        />
        <View style={[styles.divider, { backgroundColor: borderColor }]} />
        <StatItem
          icon="droplet"
          label="Fuel"
          value={formatINR(fuelCost)}
          valueColor="#F59E0B"
          textColor={textColor}
          subColor={subTextColor}
        />
        <View style={[styles.divider, { backgroundColor: borderColor }]} />
        <StatItem
          icon="tag"
          label="Toll"
          value={formatINR(tollCost)}
          valueColor="#8B5CF6"
          textColor={textColor}
          subColor={subTextColor}
        />
      </View>

      {/* Bottom row — Net Earnings */}
      <View style={[styles.earningsRow, { borderTopColor: borderColor }]}>
        <View>
          <Text style={[styles.earningsLabel, { color: subTextColor }]}>
            Net Earnings (after fuel + toll + 8% fee)
          </Text>
          <Text style={styles.earningsAmount}>{formatINR(netEarnings)}</Text>
        </View>

        {onDetailsPress && (
          <TouchableOpacity style={styles.detailsBtn} onPress={onDetailsPress}>
            <Feather name="bar-chart-2" size={14} color="#fff" />
            <Text style={styles.detailsBtnText}>Breakdown</Text>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  )
}

// ─── Sub-Component ────────────────────────────────────────────
function StatItem({
  icon, label, value, valueColor, textColor, subColor,
}: {
  icon: string; label: string; value: string
  valueColor: string; textColor: string; subColor: string
}) {
  return (
    <View style={styles.statItem}>
      <Feather name={icon as any} size={13} color={valueColor} style={{ marginBottom: 2 }} />
      <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: subColor }]}>{label}</Text>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  panel: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    borderTopWidth: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: 36,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    paddingBottom: 4,
  },
  earningsLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 2,
  },
  earningsAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#10B981',
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  detailsBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
})
