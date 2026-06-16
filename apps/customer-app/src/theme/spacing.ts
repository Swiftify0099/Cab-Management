/**
 * Customer App — Design Token: Spacing
 * Consistent 4pt grid spacing system.
 */

export const Spacing = {
  none:  0,
  xxs:   2,
  xs:    4,
  sm:    8,
  md:    12,
  lg:    16,
  xl:    20,
  xxl:   24,
  xxxl:  32,
  huge:  40,
  giant: 48,
  mega:  64,
} as const

export type SpacingKey = keyof typeof Spacing
