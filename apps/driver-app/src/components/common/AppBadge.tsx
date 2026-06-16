import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { useTheme } from '../../theme';

interface AppBadgeProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  style?: ViewStyle;
}

export const AppBadge: React.FC<AppBadgeProps> = ({
  label,
  variant = 'primary',
  style,
}) => {
  const { theme } = useTheme();

  const getBackgroundColor = () => {
    switch (variant) {
      case 'primary': return theme.colors.primary + '20'; // 20% opacity
      case 'secondary': return theme.colors.secondary + '20';
      case 'success': return theme.colors.success + '20';
      case 'error': return theme.colors.error + '20';
      case 'warning': return theme.colors.warning + '20';
      case 'info': return theme.colors.info + '20';
      default: return theme.colors.primary + '20';
    }
  };

  const getBorderColor = () => {
    switch (variant) {
      case 'primary': return theme.colors.primary + '50';
      case 'secondary': return theme.colors.secondary + '50';
      case 'success': return theme.colors.success + '50';
      case 'error': return theme.colors.error + '50';
      case 'warning': return theme.colors.warning + '50';
      case 'info': return theme.colors.info + '50';
      default: return theme.colors.primary + '50';
    }
  };

  const styles = StyleSheet.create({
    badge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xxs,
      borderRadius: theme.radius.sm,
      backgroundColor: getBackgroundColor(),
      borderWidth: 1,
      borderColor: getBorderColor(),
      alignSelf: 'flex-start',
    },
  });

  return (
    <View style={[styles.badge, style]}>
      <AppText variant="caption" weight="bold" color={variant}>
        {label}
      </AppText>
    </View>
  );
};
