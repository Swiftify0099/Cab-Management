/**
 * DriverPerformanceCard — Feature 12: Cancellation Score & Standing Card
 */
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { DriverCancellationMetrics } from '../../types/waitingAndCancellation'

interface DriverPerformanceCardProps {
  isDark: boolean
  metrics: DriverCancellationMetrics | null
}

export function DriverPerformanceCard({ isDark, metrics }: DriverPerformanceCardProps) {
  const ratePct = metrics?.cancellation_rate_percentage || '0.0%'
  const status = metrics?.restriction_status || 'NORMAL'
  const totalTrips = metrics?.total_trips || 0
  const totalCancellations = metrics?.total_cancellations || 0
  const penaltyCancellations = metrics?.penalty_cancellations || 0

  const bgCard = isDark ? '#1E293B' : '#FFFFFF'
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A'
  const textSecondary = isDark ? '#94A3B8' : '#64748B'

  const getStatusBadge = () => {
    switch (status) {
      case 'WARNING':
        return { label: 'Elevated Warning', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' }
      case 'RESTRICTED':
        return { label: 'Restricted Dispatch', color: '#EA580C', bg: 'rgba(234, 88, 12, 0.12)' }
      case 'TEMPORARILY_SUSPENDED':
        return { label: 'Suspended (24h)', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' }
      default:
        return { label: 'Good Standing', color: '#16A34A', bg: 'rgba(22, 163, 74, 0.12)' }
    }
  }

  const badge = getStatusBadge()

  return (
    <View style={[styles.card, { backgroundColor: bgCard }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <MaterialCommunityIcons name="shield-check" size={22} color={badge.color} />
          <Text style={[styles.title, { color: textPrimary }]}>Cancellation Performance</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>

      {/* Main Score Box */}
      <View style={[styles.scoreBox, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
        <View style={styles.scoreCol}>
          <Text style={[styles.scoreLabel, { color: textSecondary }]}>CANCELLATION RATE</Text>
          <Text style={[styles.scoreValue, { color: badge.color }]}>{ratePct}</Text>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: textSecondary }]}>Accepted</Text>
            <Text style={[styles.metricVal, { color: textPrimary }]}>{totalTrips}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: textSecondary }]}>Cancelled</Text>
            <Text style={[styles.metricVal, { color: textPrimary }]}>{totalCancellations}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: textSecondary }]}>Penalty</Text>
            <Text style={[styles.metricVal, { color: '#EF4444' }]}>{penaltyCancellations}</Text>
          </View>
        </View>
      </View>

      {/* Warning Notice if elevated */}
      {status !== 'NORMAL' && metrics?.restriction_reason && (
        <View style={styles.warningBox}>
          <Feather name="alert-triangle" size={16} color={badge.color} />
          <Text style={[styles.warningText, { color: badge.color }]}>
            {metrics.restriction_reason}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  scoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
  },
  scoreCol: {
    alignItems: 'flex-start',
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 14,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  metricVal: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
})
