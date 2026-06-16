/**
 * AppInput — Themed, animated text input.
 * Replaces all input patterns (search, form, OTP, etc.)
 *
 * Usage:
 *   <AppInput
 *     label="Mobile Number"
 *     placeholder="Enter 10-digit number"
 *     value={phone}
 *     onChangeText={setPhone}
 *     icon="phone"
 *     keyboardType="phone-pad"
 *   />
 */
import React, { memo, useState, useCallback, useRef } from 'react'
import {
  View,
  TextInput,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextInputProps,
  Text,
  TouchableOpacity,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../../contexts/ThemeContext'
import { Radius } from '../../theme/radius'
import { Spacing } from '../../theme/spacing'
import { Typography } from '../../theme/typography'

interface AppInputProps extends TextInputProps {
  label?:       string
  icon?:        string
  iconRight?:   string
  onIconRightPress?: () => void
  error?:       string
  hint?:        string
  containerStyle?: StyleProp<ViewStyle>
  secure?:      boolean
}

export const AppInput = memo(function AppInput({
  label,
  icon,
  iconRight,
  onIconRightPress,
  error,
  hint,
  containerStyle,
  secure = false,
  style,
  onFocus,
  onBlur,
  ...rest
}: AppInputProps) {
  const { theme } = useTheme()
  const [isFocused, setIsFocused] = useState(false)
  const [secureVisible, setSecureVisible] = useState(false)
  const borderColor = useSharedValue(theme.colors.inputBorder)

  const handleFocus = useCallback((e: any) => {
    setIsFocused(true)
    borderColor.value = withTiming(theme.colors.primary, { duration: 200 })
    onFocus?.(e)
  }, [borderColor, theme.colors.primary, onFocus])

  const handleBlur = useCallback((e: any) => {
    setIsFocused(false)
    borderColor.value = withTiming(
      error ? theme.colors.error : theme.colors.inputBorder,
      { duration: 200 }
    )
    onBlur?.(e)
  }, [borderColor, error, theme.colors.error, theme.colors.inputBorder, onBlur])

  const animatedBorder = useAnimatedStyle(() => ({
    borderColor: error ? theme.colors.error : borderColor.value,
  }))

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? (
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
          {label}
        </Text>
      ) : null}

      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.inputBg,
            borderWidth: 1.5,
          },
          animatedBorder,
        ]}
      >
        {icon ? (
          <Feather
            name={icon as any}
            size={20}
            color={isFocused ? theme.colors.primary : theme.colors.placeholder}
            style={styles.iconLeft}
          />
        ) : null}

        <TextInput
          style={[
            styles.input,
            { color: theme.colors.textPrimary },
            style,
          ]}
          placeholderTextColor={theme.colors.placeholder}
          secureTextEntry={secure && !secureVisible}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...rest}
        />

        {secure ? (
          <TouchableOpacity
            onPress={() => setSecureVisible((v) => !v)}
            style={styles.iconRight}
          >
            <Feather
              name={secureVisible ? 'eye-off' : 'eye'}
              size={18}
              color={theme.colors.placeholder}
            />
          </TouchableOpacity>
        ) : iconRight ? (
          <TouchableOpacity onPress={onIconRightPress} style={styles.iconRight}>
            <Feather name={iconRight as any} size={18} color={theme.colors.placeholder} />
          </TouchableOpacity>
        ) : null}
      </Animated.View>

      {error ? (
        <Text style={[styles.error, { color: theme.colors.error }]}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
          {hint}
        </Text>
      ) : null}
    </View>
  )
})

const styles = StyleSheet.create({
  wrapper:    { marginBottom: Spacing.md },
  label:      {
    fontSize: Typography.size.caption,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    marginLeft: 2,
  },
  container:  {
    flexDirection:  'row',
    alignItems:     'center',
    borderRadius:   Radius.lg,
    paddingHorizontal: Spacing.lg,
    minHeight:      52,
  },
  input:      {
    flex:       1,
    fontSize:   Typography.size.subtitle,
    paddingVertical: Spacing.md,
  },
  iconLeft:   { marginRight: Spacing.md },
  iconRight:  { marginLeft: Spacing.sm, padding: Spacing.xs },
  error:      {
    fontSize:   Typography.size.small,
    marginTop:  Spacing.xs,
    marginLeft: 2,
  },
  hint:       {
    fontSize:   Typography.size.small,
    marginTop:  Spacing.xs,
    marginLeft: 2,
  },
})
