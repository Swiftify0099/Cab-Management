/**
 * AppHeader — Themed screen header.
 * Replaces header patterns across all screens.
 *
 * Usage:
 *   <AppHeader title="My Trips" onBack={() => router.back()} />
 *   <AppHeader title="Wallet" right={<Button>...</Button>} />
 */
import React, { memo } from 'react'
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { Spacing } from '../../theme/spacing'
import { Typography } from '../../theme/typography'
import { Radius } from '../../theme/radius'
import { Feather } from '@expo/vector-icons'

interface AppHeaderProps {
  title:    string
  onBack?:  () => void
  right?:   React.ReactNode
  transparent?: boolean
}

export const AppHeader = memo(function AppHeader({
  title,
  onBack,
  right,
  transparent = false,
}: AppHeaderProps) {
  const { theme } = useTheme()

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: transparent ? 'transparent' : theme.colors.background,
          borderBottomColor: transparent ? 'transparent' : theme.colors.border,
          borderBottomWidth: transparent ? 0 : 1,
        },
      ]}
    >
      {onBack ? (
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.colors.surface }]}
          onPress={onBack}
        >
          <Feather name="arrow-left" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}

      <Text
        style={[styles.title, { color: theme.colors.textPrimary }]}
        numberOfLines={1}
      >
        {title}
      </Text>

      {right ? (
        <View style={styles.right}>{right}</View>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  )
})

const styles = StyleSheet.create({
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.md,
    minHeight:      56,
  },
  backBtn: {
    width:        40,
    height:       40,
    borderRadius: Radius.full,
    alignItems:   'center',
    justifyContent: 'center',
  },
  title: {
    fontSize:   Typography.size.subtitle,
    fontWeight: '700',
    flex:       1,
    textAlign:  'center',
    marginHorizontal: Spacing.sm,
  },
  right:       { width: 40, alignItems: 'flex-end' },
  placeholder: { width: 40 },
})
