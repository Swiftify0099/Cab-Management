import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native'
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../../theme'
import { DriverVehicle } from '../../services/vehicleService'
import { VehicleStatusBadge } from './VehicleStatusBadge'

interface Props {
  vehicle: DriverVehicle
  onPress: () => void
  onSetActive?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

export function VehicleCard({
  vehicle,
  onPress,
  onSetActive,
  onEdit,
  onDelete,
}: Props) {
  const { theme, isDark } = useTheme()
  const isActive = vehicle.is_active && vehicle.status === 'ACTIVE'
  const isPending = ['PENDING_REVIEW', 'DOCUMENTS_REQUIRED', 'INSPECTION_PENDING'].includes(vehicle.status)
  const isActionRequired = ['REJECTED', 'EXPIRED', 'INSPECTION_REQUIRED'].includes(vehicle.status)

  // Document summary calculations
  const approvedDocs = vehicle.documents.filter(d => d.status === 'approved').length
  const totalDocs = vehicle.documents.length
  const warningDoc = vehicle.documents.find(d => d.status === 'rejected' || d.is_expired)

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[
        styles.cardContainer,
        {
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          borderColor: isActive
            ? '#10B981'
            : isActionRequired
            ? '#EF4444'
            : isDark
            ? '#1F2937'
            : '#E2E8F0',
          borderWidth: isActive ? 2 : 1,
          shadowColor: isActive ? '#10B981' : '#000',
          shadowOpacity: isActive ? 0.18 : 0.05,
          shadowRadius: isActive ? 12 : 6,
        },
      ]}
    >
      {/* Active Hero Glow / Header Strip */}
      {isActive && (
        <LinearGradient
          colors={['rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0.02)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Top Header Row */}
      <View style={styles.topRow}>
        <View style={styles.leftMeta}>
          {isActive && (
            <View style={styles.activePill}>
              <Ionicons name="flash" size={11} color="#10B981" />
              <Text style={styles.activePillText}>ACTIVE VEHICLE</Text>
            </View>
          )}
          <Text style={[styles.typeLabel, { color: theme.colors.textSecondary }]}>
            {vehicle.vehicle_type.toUpperCase()} • {vehicle.fuel_type.toUpperCase()}
          </Text>
        </View>
        <VehicleStatusBadge status={vehicle.status} size="sm" />
      </View>

      {/* Main Vehicle Info */}
      <View style={styles.bodyRow}>
        <View style={styles.infoCol}>
          <Text style={[styles.modelTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {vehicle.make} {vehicle.model}
            {vehicle.variant ? ` ${vehicle.variant}` : ''}
          </Text>

          {/* Registration Number Tag */}
          <View
            style={[
              styles.regPlate,
              {
                backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                borderColor: isDark ? '#334155' : '#CBD5E1',
              },
            ]}
          >
            <View style={styles.indStrip}>
              <Text style={styles.indText}>IND</Text>
            </View>
            <Text style={[styles.regNumber, { color: theme.colors.text }]}>
              {vehicle.registration_number}
            </Text>
          </View>

          {/* Key Specs Pills */}
          <View style={styles.specsRow}>
            <View style={styles.specItem}>
              <Feather name="users" size={12} color={theme.colors.textSecondary} />
              <Text style={[styles.specText, { color: theme.colors.textSecondary }]}>
                {vehicle.seat_capacity} Seats
              </Text>
            </View>
            <View style={styles.specDot} />
            <View style={styles.specItem}>
              <Ionicons
                name={vehicle.has_ac ? 'snow-outline' : 'close-circle-outline'}
                size={13}
                color={vehicle.has_ac ? '#0EA5E9' : '#94A3B8'}
              />
              <Text style={[styles.specText, { color: theme.colors.textSecondary }]}>
                {vehicle.has_ac ? 'AC' : 'Non-AC'}
              </Text>
            </View>
            <View style={styles.specDot} />
            <View style={styles.specItem}>
              <MaterialCommunityIcons
                name="palette-outline"
                size={13}
                color={theme.colors.textSecondary}
              />
              <Text style={[styles.specText, { color: theme.colors.textSecondary }]}>
                {vehicle.color}
              </Text>
            </View>
          </View>
        </View>

        {/* Thumbnail / Vehicle Icon */}
        <View
          style={[
            styles.imageWrap,
            {
              backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
              borderColor: isDark ? '#334155' : '#E2E8F0',
            },
          ]}
        >
          {vehicle.photos && vehicle.photos.length > 0 ? (
            <Image source={{ uri: vehicle.photos[0] }} style={styles.thumbImage} resizeMode="cover" />
          ) : (
            <MaterialCommunityIcons
              name={
                vehicle.vehicle_type === 'suv'
                  ? 'car-estate'
                  : vehicle.vehicle_type === 'tempo_traveller'
                  ? 'van-passenger'
                  : vehicle.vehicle_type === 'bike'
                  ? 'motorbike'
                  : 'car-side'
              }
              size={36}
              color={isActive ? '#10B981' : theme.colors.primary}
            />
          )}
        </View>
      </View>

      {/* Compliance / Status Bar */}
      <View
        style={[
          styles.complianceRow,
          {
            backgroundColor: isDark ? '#1A2333' : '#F8FAFC',
            borderColor: isDark ? '#27354A' : '#EDF2F7',
          },
        ]}
      >
        <View style={styles.complianceLeft}>
          <Feather
            name={warningDoc ? 'alert-triangle' : 'check-circle'}
            size={13}
            color={warningDoc ? '#EF4444' : '#10B981'}
          />
          <Text
            style={[
              styles.complianceText,
              { color: warningDoc ? '#EF4444' : theme.colors.textSecondary },
            ]}
            numberOfLines={1}
          >
            {warningDoc
              ? `${warningDoc.name} requires attention`
              : `Docs: ${approvedDocs}/${totalDocs} Verified`}
          </Text>
        </View>

        <View style={styles.inspectionBadge}>
          <Text
            style={[
              styles.inspectionText,
              {
                color:
                  vehicle.inspection_status === 'PASSED'
                    ? '#10B981'
                    : vehicle.inspection_status === 'REQUIRED'
                    ? '#8B5CF6'
                    : '#64748B',
              },
            ]}
          >
            {vehicle.inspection_status === 'PASSED'
              ? 'Inspection Passed'
              : vehicle.inspection_status === 'REQUIRED'
              ? 'Inspection Due'
              : 'Insp: ' + vehicle.inspection_status}
          </Text>
        </View>
      </View>

      {/* Action Footer */}
      <View style={styles.footerRow}>
        {!isActive && (vehicle.status === 'APPROVED' || vehicle.status === 'INACTIVE') && onSetActive ? (
          <TouchableOpacity
            style={styles.activateBtn}
            activeOpacity={0.8}
            onPress={onSetActive}
          >
            <Ionicons name="flash" size={14} color="#FFFFFF" />
            <Text style={styles.activateBtnText}>Set as Active</Text>
          </TouchableOpacity>
        ) : isActionRequired ? (
          <TouchableOpacity
            style={styles.actionReqBtn}
            activeOpacity={0.8}
            onPress={onPress}
          >
            <Feather name="alert-circle" size={14} color="#FFFFFF" />
            <Text style={styles.actionReqBtnText}>Resolve Action</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.manageBtn,
              {
                backgroundColor: isDark ? '#1F2937' : '#F1F5F9',
                borderColor: isDark ? '#374151' : '#CBD5E1',
              },
            ]}
            activeOpacity={0.8}
            onPress={onPress}
          >
            <Feather name="settings" size={13} color={theme.colors.text} />
            <Text style={[styles.manageBtnText, { color: theme.colors.text }]}>
              Manage Vehicle
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.footerRightIcons}>
          {onEdit && (
            <TouchableOpacity style={styles.iconActionBtn} onPress={onEdit}>
              <Feather name="edit-2" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
          {onDelete && !isActive && (
            <TouchableOpacity style={styles.iconActionBtn} onPress={onDelete}>
              <Feather name="trash-2" size={16} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  leftMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  activePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  bodyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoCol: {
    flex: 1,
    marginRight: 12,
  },
  modelTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  regPlate: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingRight: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  indStrip: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginRight: 6,
  },
  indText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  regNumber: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  specDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#94A3B8',
  },
  specText: {
    fontSize: 11,
    fontWeight: '500',
  },
  imageWrap: {
    width: 68,
    height: 68,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  complianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  complianceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  complianceText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inspectionBadge: {
    paddingLeft: 8,
  },
  inspectionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  activateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionReqBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EF4444',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionReqBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  manageBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footerRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconActionBtn: {
    padding: 6,
  },
})
