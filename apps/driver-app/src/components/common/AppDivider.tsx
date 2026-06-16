import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

interface AppDividerProps {
  orientation?: 'horizontal' | 'vertical';
  thickness?: number;
  colorVariant?: 'border' | 'borderLight' | 'transparent';
  style?: ViewStyle;
}

export const AppDivider: React.FC<AppDividerProps> = ({
  orientation = 'horizontal',
  thickness = 1,
  colorVariant = 'border',
  style,
}) => {
  const { theme } = useTheme();

  const getColor = () => {
    if (colorVariant === 'transparent') return 'transparent';
    return theme.colors[colorVariant];
  };

  const styles = StyleSheet.create({
    divider: {
      backgroundColor: getColor(),
      ...(orientation === 'horizontal'
        ? { height: thickness, width: '100%' }
        : { width: thickness, height: '100%' }),
    },
  });

  return <View style={[styles.divider, style]} />;
};
