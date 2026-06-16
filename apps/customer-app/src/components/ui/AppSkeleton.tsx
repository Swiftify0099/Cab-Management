/**
 * AppSkeleton — Animated shimmer skeleton loader.
 * Shows while content is loading instead of blank screens.
 *
 * Usage:
 *   <AppSkeleton width="100%" height={80} radius={16} />
 *   <AppSkeleton circle size={44} />
 */
import React, { memo, useEffect } from 'react'
import { StyleSheet, StyleProp, ViewStyle } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { useTheme } from '../../contexts/ThemeContext'

interface AppSkeletonProps {
  width?:   number | string
  height?:  number
  radius?:  number
  circle?:  boolean
  size?:    number
  style?:   StyleProp<ViewStyle>
}

export const AppSkeleton = memo(function AppSkeleton({
  width   = '100%',
  height  = 16,
  radius  = 8,
  circle  = false,
  size,
  style,
}: AppSkeletonProps) {
  const { theme } = useTheme()
  const opacity = useSharedValue(1)

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1,   { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false
    )
  }, [opacity])

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  const resolvedWidth  = circle && size ? size : width
  const resolvedHeight = circle && size ? size : height
  const resolvedRadius = circle && size ? size / 2 : radius

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width:           resolvedWidth as any,
          height:          resolvedHeight,
          borderRadius:    resolvedRadius,
          backgroundColor: theme.isDark
            ? 'rgba(255,255,255,0.08)'
            : '#E2E8F0',
        },
        animStyle,
        style,
      ]}
    />
  )
})

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
})
