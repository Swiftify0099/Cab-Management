/**
 * Customer App — Light Theme
 * Maps semantic tokens → light palette values.
 */
import { Colors } from './colors'
import { Spacing } from './spacing'
import { Typography } from './typography'
import { Radius } from './radius'
import { Shadows } from './shadows'

export const LightTheme = {
  dark: false,
  isDark: false,
  colors: {
    // Backgrounds
    background:      Colors.light.bg,
    backgroundAlt:   Colors.light.bgAlt,
    surface:         Colors.light.surface,
    surfaceHover:    Colors.light.surfaceHover,
    card:            Colors.light.card,
    cardBorder:      Colors.light.cardBorder,

    // Tab bar
    tabBar:          Colors.light.tabBar,
    tabBorder:       Colors.light.tabBorder,
    tabActive:       Colors.light.activeTab,
    tabInactive:     Colors.light.inactiveTab,

    // Text
    textPrimary:     Colors.light.textPrimary,
    textSecondary:   Colors.light.textSecondary,
    textMuted:       Colors.light.textMuted,
    textDisabled:    Colors.light.textDisabled,
    textInverse:     Colors.white,

    // Brand
    primary:         Colors.brand.primary,
    secondary:       Colors.brand.secondary,
    tertiary:        Colors.brand.tertiary,
    accent:          Colors.brand.accent,

    // Status
    success:         Colors.status.success,
    successBg:       Colors.status.successBg,
    warning:         Colors.status.warning,
    warningBg:       Colors.status.warningBg,
    error:           Colors.status.error,
    errorBg:         Colors.status.errorBg,
    info:            Colors.status.info,
    infoBg:          Colors.status.infoBg,

    // Borders & Inputs
    border:          Colors.light.border,
    divider:         Colors.light.divider,
    inputBg:         Colors.light.inputBg,
    inputBorder:     Colors.light.inputBorder,
    placeholder:     Colors.light.placeholder,

    // Overlay
    overlay:         Colors.light.overlay,

    // Fixed
    white:           Colors.white,
    black:           Colors.black,
  },
  spacing:    Spacing,
  typography: Typography,
  radius:     Radius,
  shadows:    Shadows,
  gradient:   Colors.gradient,
} as const

export type LightThemeType = typeof LightTheme
