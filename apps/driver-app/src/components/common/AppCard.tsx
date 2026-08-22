import React from 'react';
import { View, StyleSheet, ViewProps, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';

interface AppCardProps extends ViewProps {
  variant?: 'elevated' | 'outlined' | 'glass' | 'flat';
  onPress?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const AppCard: React.FC<AppCardProps> = ({
  children,
  variant = 'elevated',
  onPress,
  padding = 'md',
  style,
  ...props
}) => {
  const { theme } = useTheme();

  const getPadding = () => {
    switch(padding) {
      case 'none': return 0;
      case 'sm': return theme.spacing.sm;
      case 'lg': return theme.spacing.lg;
      case 'md':
      default: return theme.spacing.md;
    }
  };

  const styles = StyleSheet.create({
    card: {
      padding: getPadding(),
      borderRadius: theme.radius.lg,
      backgroundColor: variant === 'outlined' || variant === 'glass' ? 'transparent' : theme.colors.surface,
      borderWidth: variant === 'outlined' ? 1 : 0,
      borderColor: theme.colors.border,
      ...(variant === 'elevated' ? theme.shadows.md : {}),
      overflow: 'hidden',
    },
    glassGradient: {
      ...StyleSheet.absoluteFill,
      opacity: 0.8,
    }
  });

  const Component = onPress ? TouchableOpacity : View;
  
  if (variant === 'glass') {
    return (
      <Component 
        style={[styles.card, { borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }, style]} 
        onPress={onPress} 
        activeOpacity={onPress ? 0.8 : 1}
        {...props as any}
      >
        <LinearGradient
          colors={[
            theme.dark ? 'rgba(30,41,59,0.7)' : 'rgba(255,255,255,0.7)', 
            theme.dark ? 'rgba(15,23,42,0.9)' : 'rgba(241,245,249,0.9)'
          ]}
          style={styles.glassGradient}
        />
        <View style={{ zIndex: 1 }}>
          {children}
        </View>
      </Component>
    );
  }

  return (
    <Component 
      style={[styles.card, style]} 
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      {...props as any}
    >
      {children}
    </Component>
  );
};
