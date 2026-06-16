/**
 * AppCard — Themed card container with optional glass effect.
 * Replaces all card/glassCard/breakdownCard patterns.
 *
 * Usage:
 *   <AppCard>...</AppCard>
 *   <AppCard glass>...</AppCard>
 *   <AppCard onPress={fn}>...</AppCard>
 */
import React, { memo, useCallback } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated'
import { useTheme } from '../../contexts/ThemeContext'
import { Radius } from '../../theme/radius'
import { Spacing } from '../../theme/spacing'

interface AppCardProps {
  children:    React.ReactNode
  glass?:      boolean
  onPress?:    () => void
  style?:      StyleProp<ViewStyle>
  padding?:    number
  noBorder?:   boolean
  noShadow?:   boolean
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

export const AppCard = memo(function AppCard({
  children,
  glass = false,
  onPress,
  style,
  padding = Spacing.lg,
  noBorder = false,
  noShadow = false,
}: AppCardProps) {
  const { theme } = useTheme()
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePressIn = useCallback(() => {
    if (onPress) scale.value = withSpring(0.98, { damping: 15 })
  }, [onPress, scale])

  const handlePressOut = useCallback(() => {
    if (onPress) scale.value = withSpring(1, { damping: 15 })
  }, [onPress, scale])

  const cardStyle = [
    styles.card,
    {
      backgroundColor: glass ? theme.colors.card : theme.colors.surface,
      padding,
      borderRadius: Radius.xl,
      borderWidth: noBorder ? 0 : 1,
      borderColor: glass ? theme.colors.cardBorder : theme.colors.border,
    },
    !noShadow && !glass && {
      shadowColor: theme.isDark ? '#000' : '#94A3B8',
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    style,
  ]

  if (onPress) {
    return (
      <AnimatedTouchable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={[cardStyle, animatedStyle]}
      >
        {children}
      </AnimatedTouchable>
    )
  }

  return (
    <Animated.View style={[cardStyle, animatedStyle]}>
      {children}
    </Animated.View>
  )
})

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
})
