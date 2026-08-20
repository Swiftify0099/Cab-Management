import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { VehicleStatus, InspectionStatus } from '../../services/vehicleService'

interface Props {
  status: VehicleStatus | string
  size?: 'sm' | 'md' | 'lg'
}

export function VehicleStatusBadge({ status, size = 'md' }: Props) {
  let bg = '#E2E8F0'
  let text = '#475569'
  let label = status
  let iconName: any = 'help-circle'
  let iconType: 'feather' | 'material' = 'feather'

  switch (status) {
    case 'ACTIVE':
      bg = 'rgba(16, 185, 129, 0.15)'
      text = '#10B981'
      label = 'Active Vehicle'
      iconName = 'check-circle'
      break
    case 'INACTIVE':
    case 'APPROVED':
      bg = 'rgba(59, 130, 246, 0.15)'
      text = '#3B82F6'
      label = 'Approved (Standby)'
      iconName = 'shield-check'
      iconType = 'material'
      break
    case 'PENDING_REVIEW':
      bg = 'rgba(245, 158, 11, 0.15)'
      text = '#F59E0B'
      label = 'Under Review'
      iconName = 'clock'
      break
    case 'DOCUMENTS_REQUIRED':
      bg = 'rgba(234, 179, 8, 0.15)'
      text = '#EAB308'
      label = 'Docs Required'
      iconName = 'file-text'
      break
    case 'INSPECTION_REQUIRED':
      bg = 'rgba(139, 92, 246, 0.15)'
      text = '#8B5CF6'
      label = 'Inspection Required'
      iconName = 'wrench'
      break
    case 'INSPECTION_PENDING':
      bg = 'rgba(99, 102, 241, 0.15)'
      text = '#6366F1'
      label = 'Inspection Scheduled'
      iconName = 'calendar'
      break
    case 'REJECTED':
      bg = 'rgba(239, 68, 68, 0.15)'
      text = '#EF4444'
      label = 'Action Required'
      iconName = 'alert-triangle'
      break
    case 'EXPIRED':
      bg = 'rgba(239, 68, 68, 0.15)'
      text = '#DC2626'
      label = 'Docs Expired'
      iconName = 'alert-octagon'
      break
    case 'SUSPENDED':
      bg = 'rgba(100, 116, 139, 0.2)'
      text = '#64748B'
      label = 'Suspended'
      iconName = 'lock'
      break
    case 'REMOVED':
      bg = 'rgba(148, 163, 184, 0.15)'
      text = '#94A3B8'
      label = 'Archived'
      iconName = 'archive'
      break
  }

  const isSmall = size === 'sm'
  const isLarge = size === 'lg'

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg },
        isSmall && styles.badgeSm,
        isLarge && styles.badgeLg,
      ]}
    >
      {iconType === 'material' ? (
        <MaterialCommunityIcons
          name={iconName}
          size={isSmall ? 10 : isLarge ? 14 : 12}
          color={text}
          style={styles.icon}
        />
      ) : (
        <Feather
          name={iconName}
          size={isSmall ? 10 : isLarge ? 14 : 12}
          color={text}
          style={styles.icon}
        />
      )}
      <Text
        style={[
          styles.text,
          { color: text },
          isSmall && styles.textSm,
          isLarge && styles.textLg,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeLg: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  icon: {
    marginRight: 5,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textSm: {
    fontSize: 10,
    fontWeight: '600',
  },
  textLg: {
    fontSize: 13,
    fontWeight: '700',
  },
})
