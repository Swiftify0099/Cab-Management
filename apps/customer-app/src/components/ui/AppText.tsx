/**
 * AppText — Themed text with variant system.
 * Replaces ALL raw <Text> with consistent typography.
 *
 * Usage:
 *   <AppText variant="h1">Title</AppText>
 *   <AppText variant="body" color="secondary">Description</AppText>
 */
import React, { memo } from 'react'
import { Text, TextStyle, StyleProp } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { Typography } from '../../theme/typography'

type TextVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'bodyS'
  | 'caption'
  | 'small'
  | 'label'

type TextColor =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'disabled'
  | 'inverse'
  | 'brand'
  | 'success'
  | 'error'
  | 'warning'
  | 'white'

interface AppTextProps {
  children:    React.ReactNode
  variant?:    TextVariant
  color?:      TextColor
  bold?:       boolean
  semibold?:   boolean
  center?:     boolean
  numberOfLines?: number
  style?:      StyleProp<TextStyle>
}

const VARIANT_STYLES: Record<TextVariant, { fontSize: number; fontWeight: TextStyle['fontWeight'] }> = {
  display:  { fontSize: Typography.size.display,  fontWeight: '800' },
  h1:       { fontSize: Typography.size.h1,       fontWeight: '800' },
  h2:       { fontSize: Typography.size.h2,       fontWeight: '700' },
  h3:       { fontSize: Typography.size.h3,       fontWeight: '700' },
  h4:       { fontSize: Typography.size.h4,       fontWeight: '700' },
  title:    { fontSize: Typography.size.title,    fontWeight: '700' },
  subtitle: { fontSize: Typography.size.subtitle, fontWeight: '600' },
  body:     { fontSize: Typography.size.body,     fontWeight: '400' },
  bodyS:    { fontSize: Typography.size.bodyS,    fontWeight: '400' },
  caption:  { fontSize: Typography.size.caption,  fontWeight: '500' },
  small:    { fontSize: Typography.size.small,    fontWeight: '400' },
  label:    { fontSize: Typography.size.xxs,      fontWeight: '600' },
}

export const AppText = memo(function AppText({
  children,
  variant = 'body',
  color = 'primary',
  bold,
  semibold,
  center,
  numberOfLines,
  style,
}: AppTextProps) {
  const { theme } = useTheme()

  const colorMap: Record<TextColor, string> = {
    primary:  theme.colors.textPrimary,
    secondary:theme.colors.textSecondary,
    muted:    theme.colors.textMuted,
    disabled: theme.colors.textDisabled,
    inverse:  theme.colors.white,
    brand:    theme.colors.primary,
    success:  theme.colors.success,
    error:    theme.colors.error,
    warning:  theme.colors.warning,
    white:    theme.colors.white,
  }

  const { fontSize, fontWeight: variantWeight } = VARIANT_STYLES[variant]
  const resolvedWeight = bold ? '700' : semibold ? '600' : variantWeight

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        { fontSize, fontWeight: resolvedWeight, color: colorMap[color] },
        center && { textAlign: 'center' },
        style,
      ]}
    >
      {children}
    </Text>
  )
})
