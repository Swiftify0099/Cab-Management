import React from 'react';
import { View, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

interface AppLoaderProps {
  size?: 'small' | 'large';
  colorVariant?: 'primary' | 'secondary' | 'inverse';
  fullScreen?: boolean;
  style?: ViewStyle;
}

export const AppLoader: React.FC<AppLoaderProps> = ({
  size = 'large',
  colorVariant = 'primary',
  fullScreen = false,
  style,
}) => {
  const { theme } = useTheme();

  const getColor = () => {
    switch (colorVariant) {
      case 'primary': return theme.colors.primary;
      case 'secondary': return theme.colors.secondary;
      case 'inverse': return theme.colors.background;
      default: return theme.colors.primary;
    }
  };

  const styles = StyleSheet.create({
    fullScreen: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: theme.zIndex.overlay,
    },
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.md,
    }
  });

  return (
    <View style={[fullScreen ? styles.fullScreen : styles.container, style]}>
      <ActivityIndicator size={size} color={getColor()} />
    </View>
  );
};
