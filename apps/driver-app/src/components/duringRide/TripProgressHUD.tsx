/**
 * TripProgressHUD — Feature 10: In-Flight Navigation & Trip Execution HUD
 * High-contrast, glanceable driving controls: Server-backed Timer, Live Estimated Fare,
 * Multi-Stop Timeline, Quick Actions, and Primary Trip Progression CTA.
 */
import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { RideStopItem } from '../../types/duringRide'

interface TripProgressHUDProps {
  isDark: boolean
  tripSeconds: number
  distanceRemainingKm: number
  durationRemainingMin: number
  currentEstimatedFare: number
  destinationAddress: string
  activeStop?: RideStopItem | null
  hasActiveSOS: boolean
  arriving: boolean
  onOpenCall: () => void
  onOpenChat: () => void
  onOpenAddStop: () => void
  onOpenUpdateDestination: () => void
  onOpenSOS: () => void
  onArriveAtStop?: (stop: RideStopItem) => void
  onDepartFromStop?: (stop: RideStopItem) => void
  onCompleteTrip: () => void
}

export function TripProgressHUD({
  isDark,
  tripSeconds,
  distanceRemainingKm,
  durationRemainingMin,
  currentEstimatedFare,
  destinationAddress,
  activeStop,
  hasActiveSOS,
  arriving,
  onOpenCall,
  onOpenChat,
  onOpenAddStop,
  onOpenUpdateDestination,
  onOpenSOS,
  onArriveAtStop,
  onDepartFromStop,
  onCompleteTrip,
}: TripProgressHUDProps) {
  const formatTimer = (sec: number) => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`
  }

  const bgCard = isDark ? '#1E293B' : '#FFFFFF'
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A'
  const textSecondary = isDark ? '#94A3B8' : '#64748B'

  const isAtStop = activeStop && activeStop.status === 'arrived'

  return (
    <View style={[styles.container, { backgroundColor: bgCard }]}>
      {/* Top Banner: Status + Timer + Live Fare */}
      <View style={styles.topStatusRow}>
        <View style={styles.timerPill}>
          <Feather name="clock" size={13} color="#0284C7" />
          <Text style={styles.timerText}>{formatTimer(tripSeconds)}</Text>
        </View>

        {hasActiveSOS ? (
          <View style={styles.sosActiveBadge}>
            <MaterialCommunityIcons name="alarm-light" size={14} color="#FFFFFF" />
            <Text style={styles.sosActiveText}>SOS ACTIVE</Text>
          </View>
        ) : (
          <View style={styles.statusPill}>
            <View style={styles.greenDot} />
            <Text style={[styles.statusText, { color: textSecondary }]}>Trip in Progress</Text>
          </View>
        )}

        <View style={styles.farePill}>
          <Text style={styles.fareLabel}>EST. FARE</Text>
          <Text style={styles.fareValue}>₹{currentEstimatedFare.toFixed(0)}</Text>
        </View>
      </View>

      {/* Target Destination / Stop Address Header */}
      <View style={styles.destinationCard}>
        <Text style={[styles.destinationTypeLabel, { color: activeStop ? '#D97706' : '#0284C7' }]}>
          {activeStop ? `STOP #${activeStop.sequence} OF TRIP` : 'FINAL DESTINATION'}
        </Text>
        <Text style={[styles.destinationAddress, { color: textPrimary }]} numberOfLines={1}>
          📍 {activeStop ? activeStop.address : destinationAddress}
        </Text>
      </View>

      {/* Distance & ETA Row */}
      <View style={styles.metricsRow}>
        <Text style={[styles.metricsText, { color: textPrimary }]}>
          {distanceRemainingKm.toFixed(1)} km • ~{durationRemainingMin} min remaining
        </Text>
      </View>

      {/* Action Buttons Row */}
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={onOpenCall} activeOpacity={0.8}>
          <Feather name="phone" size={17} color="#16A34A" />
          <Text style={styles.actionBtnText}>Call</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onOpenChat} activeOpacity={0.8}>
          <Feather name="message-square" size={17} color="#0284C7" />
          <Text style={styles.actionBtnText}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onOpenAddStop} activeOpacity={0.8}>
          <MaterialCommunityIcons name="map-marker-plus" size={17} color="#D97706" />
          <Text style={styles.actionBtnText}>+ Stop</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onOpenUpdateDestination} activeOpacity={0.8}>
          <Feather name="edit-3" size={17} color="#8B5CF6" />
          <Text style={styles.actionBtnText}>Dest</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sosActionBtn} onPress={onOpenSOS} activeOpacity={0.8}>
          <MaterialCommunityIcons name="alarm-light" size={17} color="#FFFFFF" />
          <Text style={styles.sosActionBtnText}>SOS</Text>
        </TouchableOpacity>
      </View>

      {/* Primary Trip Progression CTA */}
      {activeStop && !isAtStop ? (
        <TouchableOpacity
          style={styles.stopArriveBtn}
          onPress={() => onArriveAtStop?.(activeStop)}
          disabled={arriving}
          activeOpacity={0.85}
        >
          {arriving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.ctaBtnText}>✓ ARRIVED AT STOP #{activeStop.sequence}</Text>
          )}
        </TouchableOpacity>
      ) : activeStop && isAtStop ? (
        <TouchableOpacity
          style={styles.stopDepartBtn}
          onPress={() => onDepartFromStop?.(activeStop)}
          disabled={arriving}
          activeOpacity={0.85}
        >
          {arriving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.ctaBtnText}>🚀 DEPART STOP #{activeStop.sequence}</Text>
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.completeTripBtn}
          onPress={onCompleteTrip}
          disabled={arriving}
          activeOpacity={0.85}
        >
          {arriving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.ctaBtnText}>🏁 COMPLETE TRIP & COLLECT PAYMENT</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  topStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sosActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sosActiveText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  farePill: {
    alignItems: 'flex-end',
  },
  fareLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#16A34A',
    letterSpacing: 0.5,
  },
  fareValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#16A34A',
  },
  destinationCard: {
    marginBottom: 6,
  },
  destinationTypeLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  destinationAddress: {
    fontSize: 15,
    fontWeight: '700',
  },
  metricsRow: {
    marginVertical: 6,
  },
  metricsText: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sosActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#DC2626',
  },
  sosActionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  completeTripBtn: {
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  stopArriveBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  stopDepartBtn: {
    backgroundColor: '#16A34A',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
})
