/**
 * AppChip — Themed filter pill / chip.
 * Replaces all filter pill patterns (wallet, parcels, trips tabs).
 *
 * Usage:
 *   <AppChip label="All" active={filter==='all'} onPress={() => setFilter('all')} />
 */
import React, { memo, useCallback } from 'react'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated'
import { useTheme } from '../../contexts/ThemeContext'
import { Radius } from '../../theme/radius'
import { Spacing } from '../../theme/spacing'
import { Typography } from '../../theme/typography'

interface AppChipProps {
  label:   string
  active?: boolean
  onPress?: () => void
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

export const AppChip = memo(function AppChip({
  label,
  active = false,
  onPress,
}: AppChipProps) {
  const { theme } = useTheme()
  const scale = useSharedValue(1)

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.94, { damping: 15 })
  }, [scale])
  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15 })
  }, [scale])

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={[
        styles.chip,
        {
          backgroundColor: active
            ? theme.colors.textPrimary
            : theme.isDark ? 'rgba(255,255,255,0.1)' : theme.colors.border,
          borderColor: active
            ? theme.colors.textPrimary
            : theme.colors.border,
        },
        animStyle,
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: active ? theme.colors.white : theme.colors.textSecondary,
          },
        ]}
      >
        {label}
      </Text>
    </AnimatedTouchable>
  )
})

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.sm,
    borderRadius:      Radius.full,
    borderWidth:       1,
    marginRight:       Spacing.sm,
  },
  label: {
    fontSize:   Typography.size.caption,
    fontWeight: '600',
  },
})
