/**
 * Customer App — Smart Companion Cross-Service Card Component
 * Feature 27: Smart Features / Intelligence Layer
 * Context-aware companion prompt (Hotel ➔ Airport, Airport ➔ Hotel, Parcel ➔ Transport).
 */
import React from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'

import { SmartCompanion } from '../../api/client'
import { useTheme } from '../../contexts/ThemeContext'
import { AppText, AppCard, AppButton, AppBadge } from '../ui'

interface Props {
  companion: SmartCompanion
  onDismiss?: () => void
}

export const SmartCompanionCard: React.FC<Props> = ({ companion, onDismiss }) => {
  const { theme, isDark } = useTheme()

  const getIcon = () => {
    switch (companion.companion_type) {
      case 'HOTEL_TO_AIRPORT':
        return { icon: 'airplane', color: theme.colors.primary, lib: 'Ionicons' }
      case 'AIRPORT_TO_HOTEL':
        return { icon: 'business', color: theme.colors.accent, lib: 'Ionicons' }
      case 'PARCEL_TO_TRANSPORT':
        return { icon: 'truck', color: theme.colors.warning, lib: 'Feather' }
      default:
        return { icon: 'sparkles', color: theme.colors.success, lib: 'Ionicons' }
    }
  }

  const iconInfo = getIcon()

  const handleAction = () => {
    if (companion.deep_link) {
      router.push({
        pathname: companion.deep_link as any,
        params: companion.prefilled_params,
      })
    }
  }

  return (
    <AppCard style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: `${iconInfo.color}35` }]}>
      <View style={styles.topRow}>
        <View style={[styles.iconCircle, { backgroundColor: `${iconInfo.color}18` }]}>
          {iconInfo.lib === 'Feather' ? (
            <Feather name={iconInfo.icon as any} size={20} color={iconInfo.color} />
          ) : (
            <Ionicons name={iconInfo.icon as any} size={20} color={iconInfo.color} />
          )}
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppBadge label="Smart Suggestion" variant="accent" size="sm" />
            {onDismiss && (
              <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Feather name="x" size={16} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <AppText variant="body" bold style={{ marginTop: 4 }}>
            {companion.title}
          </AppText>
        </View>
      </View>

      <AppText variant="small" color="secondary" style={styles.subtitle}>
        {companion.subtitle}
      </AppText>

      {companion.reason && (
        <View style={[styles.reasonPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F1F5F9' }]}>
          <Feather name="info" size={12} color={theme.colors.textMuted} />
          <AppText variant="small" color="muted" style={{ marginLeft: 6, flex: 1 }} numberOfLines={1}>
            {companion.reason}
          </AppText>
        </View>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: iconInfo.color }]}
          onPress={handleAction}
          activeOpacity={0.8}
        >
          <AppText variant="bodyS" bold color="white">
            {companion.action_label}
          </AppText>
          <Feather name="arrow-right" size={16} color="white" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>
    </AppCard>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    marginTop: 8,
    lineHeight: 18,
  },
  reasonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
  },
  actionRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
})
