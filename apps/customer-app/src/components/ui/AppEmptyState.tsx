/**
 * AppEmptyState — Themed empty state.
 * Replaces 5+ different empty state implementations.
 *
 * Usage:
 *   <AppEmptyState icon="🗺️" title="No trips" subtitle="Book a ride!" action={{ label: 'Book Now', onPress }} />
 */
import React, { memo } from 'react'
import { View, StyleSheet } from 'react-native'
import { AppText } from './AppText'
import { AppButton } from './AppButton'
import { Spacing } from '../../theme/spacing'

interface AppEmptyStateProps {
  icon?:     string
  title:     string
  subtitle?: string
  action?:   { label: string; onPress: () => void }
}

export const AppEmptyState = memo(function AppEmptyState({
  icon     = '🔍',
  title,
  subtitle,
  action,
}: AppEmptyStateProps) {
  return (
    <View style={styles.container}>
      <AppText style={styles.emoji}>{icon}</AppText>
      <AppText variant="title" center bold style={styles.title}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="caption" color="muted" center style={styles.subtitle}>
          {subtitle}
        </AppText>
      ) : null}
      {action ? (
        <AppButton onPress={action.onPress} style={styles.action}>
          {action.label}
        </AppButton>
      ) : null}
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: Spacing.huge,
    paddingHorizontal: Spacing.xxl,
  },
  emoji:    { fontSize: 52, marginBottom: Spacing.lg },
  title:    { marginBottom: Spacing.sm },
  subtitle: { marginBottom: Spacing.xxl },
  action:   { minWidth: 180 },
})
