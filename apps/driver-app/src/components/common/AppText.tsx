import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

interface AppTextProps extends TextProps {
  variant?: 'display' | 'h1' | 'h2' | 'h3' | 'h4' | 'body1' | 'body2' | 'caption';
  color?: 'primary' | 'secondary' | 'text' | 'textSecondary' | 'textTertiary' | 'error' | 'success' | 'warning' | 'inverse';
  weight?: 'regular' | 'medium' | 'bold';
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export const AppText: React.FC<AppTextProps> = ({
  children,
  variant = 'body1',
  color = 'text',
  weight = 'regular',
  align = 'auto',
  style,
  ...props
}) => {
  const { theme } = useTheme();

  const getFontSizeAndLineHeight = () => {
    switch (variant) {
      case 'display': return { fontSize: theme.typography.sizes.display, lineHeight: theme.typography.lineHeights.display };
      case 'h1': return { fontSize: theme.typography.sizes.xxxl, lineHeight: theme.typography.lineHeights.xxxl };
      case 'h2': return { fontSize: theme.typography.sizes.xxl, lineHeight: theme.typography.lineHeights.xxl };
      case 'h3': return { fontSize: theme.typography.sizes.xl, lineHeight: theme.typography.lineHeights.xl };
      case 'h4': return { fontSize: theme.typography.sizes.lg, lineHeight: theme.typography.lineHeights.lg };
      case 'body1': return { fontSize: theme.typography.sizes.md, lineHeight: theme.typography.lineHeights.md };
      case 'body2': return { fontSize: theme.typography.sizes.sm, lineHeight: theme.typography.lineHeights.sm };
      case 'caption': return { fontSize: theme.typography.sizes.xs, lineHeight: theme.typography.lineHeights.xs };
      default: return { fontSize: theme.typography.sizes.md, lineHeight: theme.typography.lineHeights.md };
    }
  };

  const getFontColor = () => {
    switch (color) {
      case 'primary': return theme.colors.primary;
      case 'secondary': return theme.colors.secondary;
      case 'textSecondary': return theme.colors.textSecondary;
      case 'textTertiary': return theme.colors.textTertiary;
      case 'error': return theme.colors.error;
      case 'success': return theme.colors.success;
      case 'warning': return theme.colors.warning;
      case 'inverse': return theme.colors.background;
      case 'text':
      default: return theme.colors.text;
    }
  };

  const getFontFamily = () => {
    switch (weight) {
      case 'bold': return theme.typography.fontFamily.bold;
      case 'medium': return theme.typography.fontFamily.medium;
      case 'regular':
      default: return theme.typography.fontFamily.regular;
    }
  };

  const { fontSize, lineHeight } = getFontSizeAndLineHeight();

  const textStyles = StyleSheet.create({
    text: {
      fontSize,
      lineHeight,
      color: getFontColor(),
      fontFamily: getFontFamily(),
      textAlign: align,
      fontWeight: weight === 'bold' ? '700' : weight === 'medium' ? '500' : '400',
    },
  });

  return (
    <Text style={[textStyles.text, style]} {...props}>
      {children}
    </Text>
  );
};
