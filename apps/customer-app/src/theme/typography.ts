/**
 * Customer App — Design Token: Typography
 * Consistent text scale from display to label.
 */

export const Typography = {
  // ─── Font Sizes ─────────────────────────────────────────────
  size: {
    display:  36,
    h1:       28,
    h2:       24,
    h3:       22,
    h4:       20,
    title:    18,
    subtitle: 16,
    body:     15,
    bodyS:    14,
    caption:  13,
    small:    12,
    xs:       11,
    xxs:      10,
  },

  // ─── Font Weights ────────────────────────────────────────────
  weight: {
    regular:     '400' as const,
    medium:      '500' as const,
    semibold:    '600' as const,
    bold:        '700' as const,
    extrabold:   '800' as const,
    black:       '900' as const,
  },

  // ─── Line Heights ────────────────────────────────────────────
  lineHeight: {
    tight:   1.2,
    normal:  1.5,
    relaxed: 1.75,
  },

  // ─── Letter Spacing ──────────────────────────────────────────
  letterSpacing: {
    tight:   -0.5,
    normal:  0,
    wide:    0.5,
    wider:   1,
    widest:  1.5,
  },
} as const

export type FontSize = keyof typeof Typography.size
export type FontWeight = keyof typeof Typography.weight
