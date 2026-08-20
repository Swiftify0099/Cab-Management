/**
 * Customer App — Dark Theme
 * Maps semantic tokens → dark palette values.
 */
import { Colors } from './colors'
import { Spacing } from './spacing'
import { Typography } from './typography'
import { Radius } from './radius'
import { Shadows } from './shadows'

export const DarkTheme = {
  dark: true,
  isDark: true,
  colors: {
    // Backgrounds
    background:      Colors.dark.bg,
    backgroundAlt:   Colors.dark.bgAlt,
    surface:         Colors.dark.surface,
    surfaceHover:    Colors.dark.surfaceHover,
    card:            Colors.dark.card,
    cardBorder:      Colors.dark.cardBorder,

    // Tab bar
    tabBar:          Colors.dark.tabBar,
    tabBorder:       Colors.dark.tabBorder,
    tabActive:       Colors.dark.activeTab,
    tabInactive:     Colors.dark.inactiveTab,

    // Text
    textPrimary:     Colors.dark.textPrimary,
    textSecondary:   Colors.dark.textSecondary,
    textMuted:       Colors.dark.textMuted,
    textDisabled:    Colors.dark.textDisabled,
    textInverse:     Colors.dark.bg,

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
    border:          Colors.dark.border,
    divider:         Colors.dark.divider,
    inputBg:         Colors.dark.inputBg,
    inputBorder:     Colors.dark.inputBorder,
    placeholder:     Colors.dark.placeholder,

    // Overlay
    overlay:         Colors.dark.overlay,

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

export type Theme = typeof DarkTheme
