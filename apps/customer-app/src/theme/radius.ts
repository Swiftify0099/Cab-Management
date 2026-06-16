/**
 * Customer App — Design Token: Border Radius
 */

export const Radius = {
  none:  0,
  xs:    4,
  sm:    8,
  md:    12,
  lg:    16,
  xl:    20,
  xxl:   24,
  xxxl:  28,
  full:  9999,
} as const

export type RadiusKey = keyof typeof Radius
