/**
 * AppBadge — Themed status pill / badge.
 * Replaces all statusPill patterns in trips, parcels screens.
 *
 * Usage:
 *   <AppBadge label="Confirmed" color="#1D4ED8" bg="#EFF6FF" />
 *   <AppBadge variant="success" label="Delivered" />
 */
import React, { memo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { Radius } from '../../theme/radius'
import { Typography } from '../../theme/typography'
import { Spacing } from '../../theme/spacing'

type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'default'

interface AppBadgeProps {
  label:     string
  variant?:  BadgeVariant
  color?:    string
  bg?:       string
  size?:     'sm' | 'md'
  style?:    any
}

export const AppBadge = memo(function AppBadge({
  label,
  variant = 'default',
  color,
  bg,
  size = 'md',
  style,
}: AppBadgeProps) {
  const { theme } = useTheme()

  const variantMap: Record<BadgeVariant, { color: string; bg: string }> = {
    success: { color: theme.colors.success,          bg: theme.colors.successBg },
    error:   { color: theme.colors.error,            bg: theme.colors.errorBg },
    warning: { color: theme.colors.warning,          bg: theme.colors.warningBg },
    info:    { color: theme.colors.info,             bg: theme.colors.infoBg },
    default: { color: theme.colors.textSecondary,    bg: theme.colors.surface },
  }

  const resolvedColor = color || variantMap[variant].color
  const resolvedBg    = bg    || variantMap[variant].bg

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: resolvedBg,
          paddingHorizontal: size === 'sm' ? Spacing.sm : Spacing.md,
          paddingVertical:   size === 'sm' ? 3 : 5,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color:    resolvedColor,
            fontSize: size === 'sm' ? Typography.size.xxs : Typography.size.xs,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  )
})

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radius.full,
    alignSelf:    'flex-start',
  },
  label: {
    fontWeight: '600',
  },
})
