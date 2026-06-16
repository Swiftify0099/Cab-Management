/**
 * AppSearchBar — Themed search input with action button.
 * Replaces searchContainer in HomeTab.
 *
 * Usage:
 *   <AppSearchBar onPress={() => router.push('/book/cab')} />
 */
import React, { memo } from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet, Text } from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../contexts/ThemeContext'
import { Radius } from '../../theme/radius'
import { Spacing } from '../../theme/spacing'
import { Typography } from '../../theme/typography'

interface AppSearchBarProps {
  onPress?:    () => void
  placeholder?: string
  rightLabel?:  string
}

export const AppSearchBar = memo(function AppSearchBar({
  onPress,
  placeholder = 'Where are you going?',
  rightLabel  = 'Now',
}: AppSearchBarProps) {
  const { theme } = useTheme()

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.inputBg,
          borderColor:     theme.colors.inputBorder,
        },
      ]}
    >
      <Feather name="search" size={20} color={theme.colors.placeholder} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={theme.colors.placeholder}
        style={[styles.input, { color: theme.colors.textPrimary }]}
        onPressIn={onPress}
        editable={false}
        pointerEvents="none"
      />
      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
      <TouchableOpacity
        style={[styles.nowBtn, { backgroundColor: theme.colors.surface }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Ionicons name="time-outline" size={18} color={theme.colors.textPrimary} />
        <Text style={[styles.nowText, { color: theme.colors.textPrimary }]}>
          {rightLabel}
        </Text>
        <Feather name="chevron-down" size={16} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    flexDirection:  'row',
    alignItems:     'center',
    borderRadius:   Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.md,
    borderWidth:    1,
    marginHorizontal: Spacing.xxl,
    marginBottom:   Spacing.xxl + 4,
  },
  input: {
    flex:        1,
    marginLeft:  Spacing.md,
    fontSize:    Typography.size.subtitle,
    fontWeight:  '500',
  },
  divider: {
    width:  1,
    height: 24,
    marginHorizontal: Spacing.md,
  },
  nowBtn: {
    flexDirection: 'row',
    alignItems:    'center',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.md,
    gap: 4,
  },
  nowText: {
    fontSize:   Typography.size.caption,
    fontWeight: '600',
    marginHorizontal: 4,
  },
})
