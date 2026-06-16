/**
 * Customer App — Design Token: Colors
 * All colors in ONE place. Never hardcode hex in screens.
 * Usage: import { Colors } from '@/theme/colors'
 */

export const Colors = {
  // ─── Brand ────────────────────────────────────────────────────
  brand: {
    primary:   '#3B82F6', // blue-500
    secondary: '#8B5CF6', // violet-500
    tertiary:  '#06B6D4', // cyan-500
    accent:    '#10B981', // emerald-500
  },

  // ─── Semantic Status ──────────────────────────────────────────
  status: {
    success:        '#22C55E',
    successBg:      '#DCFCE7',
    successMuted:   '#166534',
    warning:        '#F59E0B',
    warningBg:      '#FEF9C3',
    warningMuted:   '#92400E',
    error:          '#EF4444',
    errorBg:        '#FEE2E2',
    errorMuted:     '#991B1B',
    info:           '#3B82F6',
    infoBg:         '#EFF6FF',
    infoMuted:      '#1D4ED8',
  },

  // ─── Dark Palette (current app default) ───────────────────────
  dark: {
    // Backgrounds
    bg:           '#0F172A', // slate-900  — root screens
    bgAlt:        '#0A0D1A', // deeper bg
    surface:      'rgba(255,255,255,0.04)',
    surfaceHover: 'rgba(255,255,255,0.08)',
    card:         'rgba(255,255,255,0.05)',
    cardBorder:   'rgba(255,255,255,0.08)',

    // Tab bar
    tabBar:       '#0A0D1A',
    tabBorder:    'rgba(255,255,255,0.08)',

    // Text
    textPrimary:  '#F8FAFC', // near-white
    textSecondary:'#94A3B8', // slate-400
    textMuted:    '#475569', // slate-600
    textDisabled: '#334155', // slate-700

    // Borders & Dividers
    border:       'rgba(255,255,255,0.10)',
    divider:      'rgba(255,255,255,0.06)',

    // Input
    inputBg:      'rgba(255,255,255,0.08)',
    inputBorder:  'rgba(255,255,255,0.16)',
    placeholder:  '#94A3B8',

    // Active indicator
    activeTab:    '#3B82F6',
    inactiveTab:  '#9CA3AF',

    // Overlay
    overlay:      'rgba(0,0,0,0.65)',
  },

  // ─── Light Palette ─────────────────────────────────────────────
  light: {
    // Backgrounds
    bg:           '#F1F5F9', // slate-100
    bgAlt:        '#F8FAFC', // slate-50
    surface:      '#FFFFFF',
    surfaceHover: '#F8FAFC',
    card:         '#FFFFFF',
    cardBorder:   '#E2E8F0', // slate-200

    // Tab bar
    tabBar:       '#FFFFFF',
    tabBorder:    '#E2E8F0',

    // Text
    textPrimary:  '#0F172A', // slate-900
    textSecondary:'#64748B', // slate-500
    textMuted:    '#94A3B8', // slate-400
    textDisabled: '#CBD5E1', // slate-300

    // Borders & Dividers
    border:       '#E2E8F0',
    divider:      '#F1F5F9',

    // Input
    inputBg:      '#F8FAFC',
    inputBorder:  '#E2E8F0',
    placeholder:  '#94A3B8',

    // Active indicator
    activeTab:    '#2563EB',
    inactiveTab:  '#64748B',

    // Overlay
    overlay:      'rgba(0,0,0,0.4)',
  },

  // ─── Gradients (shared) ────────────────────────────────────────
  gradient: {
    primary:    ['#3B82F6', '#8B5CF6'] as [string, string],
    brand:      ['#0EA5E9', '#A855F7'] as [string, string],
    hero:       ['#0A0D1A', '#0F172A', '#1E1B4B'] as [string, string, string],
    promoBlue:  ['#8B5CF6', '#3B82F6'] as [string, string],
    promoCyan:  ['#06B6D4', '#3B82F6', '#8B5CF6'] as [string, string, string],
    heroBg:     ['#0A0F1E', '#0F172A', '#1E1B4B'] as [string, string, string],
    parcelsBg:  ['#0B132B', '#1C3A70', '#0B132B'] as [string, string, string],
    walletBg:   ['#0A0F1E', '#1E1B4B'] as [string, string],
  },

  // ─── Fixed Colors (never theme-variant) ────────────────────────
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const

export type ColorKey = keyof typeof Colors
