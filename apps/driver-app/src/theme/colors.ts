export const colors = {
  light: {
    primary: '#10B981', // Emerald green
    primaryDark: '#059669',
    primaryLight: '#34D399',
    secondary: '#3B82F6', // Blue
    accent: '#F59E0B', // Amber
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceVariant: '#F1F5F9',
    text: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#94A3B8',
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
    overlay: 'rgba(15, 23, 42, 0.4)',
    transparent: 'transparent',
  },
  dark: {
    primary: '#10B981', // Emerald green
    primaryDark: '#047857',
    primaryLight: '#34D399',
    secondary: '#38BDF8', // Light Blue
    accent: '#FBBF24', // Amber
    background: '#0F172A', // Slate 900
    surface: '#1E293B', // Slate 800
    surfaceVariant: '#334155', // Slate 700
    text: '#F8FAFC', // Slate 50
    textSecondary: '#CBD5E1', // Slate 300
    textTertiary: '#64748B', // Slate 500
    border: '#334155', // Slate 700
    borderLight: '#1E293B',
    success: '#34D399',
    error: '#F87171',
    warning: '#FBBF24',
    info: '#60A5FA',
    overlay: 'rgba(15, 23, 42, 0.7)',
    transparent: 'transparent',
  },
};

export type ColorsType = typeof colors.light;
