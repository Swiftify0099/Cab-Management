import { colors } from './colors';
import { typography } from './typography';
import { spacing, radius, shadows, zIndex } from './spacing';

export const lightTheme = {
  dark: false,
  colors: colors.light,
  typography,
  spacing,
  radius,
  shadows,
  zIndex,
};

export type Theme = typeof lightTheme;
