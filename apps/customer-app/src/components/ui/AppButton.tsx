/**
 * AppButton — Themed, animated, reusable button.
 * Replaces ALL button variants across the app.
 *
 * Usage:
 *   <AppButton onPress={fn}>Book Now</AppButton>
 *   <AppButton variant="outline" size="sm" loading={isLoading}>Cancel</AppButton>
 *   <AppButton variant="ghost" icon="arrow-right">Continue</AppButton>
 */
import React, { memo, useCallback } from 'react'
import {
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
  View,
  Text,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../../contexts/ThemeContext'
import { Radius } from '../../theme/radius'
import { Typography } from '../../theme/typography'
import { Spacing } from '../../theme/spacing'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'gradient'
type ButtonSize    = 'sm' | 'md' | 'lg'

interface AppButtonProps {
  children?:    React.ReactNode
  onPress?:     () => void
  variant?:     ButtonVariant
  size?:        ButtonSize
  loading?:     boolean
  disabled?:    boolean
  icon?:        string
  iconRight?:   string
  fullWidth?:   boolean
  style?:       StyleProp<ViewStyle>
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

const SIZE_STYLES = {
  sm: { height: 40, paddingHorizontal: Spacing.lg, fontSize: Typography.size.caption, radius: Radius.md },
  md: { height: 52, paddingHorizontal: Spacing.xl, fontSize: Typography.size.subtitle, radius: Radius.lg },
  lg: { height: 60, paddingHorizontal: Spacing.xxl, fontSize: Typography.size.body, radius: Radius.xl },
}

export const AppButton = memo(function AppButton({
  children,
  onPress,
  variant  = 'primary',
  size     = 'md',
  loading  = false,
  disabled = false,
  icon,
  iconRight,
  fullWidth = false,
  style,
}: AppButtonProps) {
  const { theme } = useTheme()
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 })
  }, [scale])

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 })
  }, [scale])

  const sizeStyle = SIZE_STYLES[size]
  const isDisabled = disabled || loading

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: theme.colors.primary,
          borderWidth: 0,
        }
      case 'secondary':
        return {
          backgroundColor: theme.colors.secondary,
          borderWidth: 0,
        }
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: theme.colors.primary,
        }
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
        }
      case 'danger':
        return {
          backgroundColor: theme.colors.error,
          borderWidth: 0,
        }
      case 'success':
        return {
          backgroundColor: theme.colors.success,
          borderWidth: 0,
        }
      case 'gradient':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
          overflow: 'hidden',
        }
      default:
        return { backgroundColor: theme.colors.primary }
    }
  }

  const getTextColor = (): string => {
    switch (variant) {
      case 'outline': return theme.colors.primary
      case 'ghost':   return theme.colors.textSecondary
      default:        return theme.colors.white
    }
  }

  const iconColor = getTextColor()
  const textColor = getTextColor()

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      activeOpacity={1}
      style={[
        styles.base,
        {
          height:         sizeStyle.height,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          borderRadius:   sizeStyle.radius,
          ...getVariantStyle(),
          opacity:        isDisabled ? 0.6 : 1,
        },
        fullWidth && styles.fullWidth,
        animatedStyle,
        style,
      ]}
    >
      {variant === 'gradient' ? (
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={styles.content}>
          {icon ? (
            <Feather name={icon as any} size={sizeStyle.fontSize} color={iconColor} style={styles.iconLeft} />
          ) : null}
          {children ? (
            <Text style={[styles.text, { color: textColor, fontSize: sizeStyle.fontSize }]}>
              {children}
            </Text>
          ) : null}
          {iconRight ? (
            <Feather name={iconRight as any} size={sizeStyle.fontSize} color={iconColor} style={styles.iconRight} />
          ) : null}
        </View>
      )}
    </AnimatedTouchable>
  )
})

const styles = StyleSheet.create({
  base: {
    alignItems:     'center',
    justifyContent: 'center',
    flexDirection:  'row',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  iconLeft:  { marginRight: 8 },
  iconRight: { marginLeft: 8 },
})
