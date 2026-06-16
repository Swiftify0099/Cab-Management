import React from 'react';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface AppIconProps {
  family?: 'Feather' | 'Ionicons';
  name: any;
  size?: number;
  color?: string;
  colorVariant?: 'primary' | 'secondary' | 'text' | 'textSecondary' | 'textTertiary' | 'error' | 'success' | 'warning' | 'inverse';
}

export const AppIcon: React.FC<AppIconProps> = ({
  family = 'Feather',
  name,
  size = 20,
  color,
  colorVariant,
}) => {
  const { theme } = useTheme();

  const getIconColor = () => {
    if (color) return color;
    switch (colorVariant) {
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

  const IconComponent = family === 'Feather' ? Feather : Ionicons;

  return (
    <IconComponent name={name} size={size} color={getIconColor()} />
  );
};
