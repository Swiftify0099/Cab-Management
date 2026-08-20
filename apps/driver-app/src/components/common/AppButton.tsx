import React from 'react';
import { TouchableOpacity, ActivityIndicator, StyleSheet, TouchableOpacityProps, View } from 'react-native';
import { AppText } from './AppText';
import { useTheme } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';

interface AppButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const AppButton: React.FC<AppButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  style,
  ...props
}) => {
  const { theme } = useTheme();
  
  const getPadding = () => {
    switch(size) {
      case 'sm': return { paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md };
      case 'lg': return { paddingVertical: theme.spacing.lg, paddingHorizontal: theme.spacing.xxl };
      case 'md':
      default: return { paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.lg };
    }
  };

  const getBackgroundColor = () => {
    if (disabled) return theme.colors.surfaceVariant;
    switch(variant) {
      case 'primary': return theme.colors.primary;
      case 'secondary': return theme.colors.secondary;
      case 'outline': return 'transparent';
      case 'ghost': return 'transparent';
      case 'gradient': return 'transparent';
      default: return theme.colors.primary;
    }
  };

  const getBorder = () => {
    if (variant === 'outline') {
      return { borderWidth: 1, borderColor: disabled ? theme.colors.textTertiary : theme.colors.primary };
    }
    return { borderWidth: 0 };
  };

  const getTextColor = () => {
    if (disabled) return 'textTertiary';
    if (variant === 'outline' || variant === 'ghost') return 'primary';
    return 'inverse';
  };

  const styles = StyleSheet.create({
    button: {
      ...getPadding(),
      ...getBorder(),
      backgroundColor: getBackgroundColor(),
      borderRadius: theme.radius.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      overflow: 'hidden',
    },
    gradient: {
      ...StyleSheet.absoluteFill,
      borderRadius: theme.radius.md,
    }
  });

  const renderContent = () => (
    <>
      {loading ? (
        <ActivityIndicator color={getTextColor() === 'inverse' ? theme.colors.background : theme.colors.primary} size="small" />
      ) : (
        <>
          {leftIcon}
          <AppText color={getTextColor()} weight="medium" variant={size === 'sm' ? 'body2' : 'body1'}>
            {title}
          </AppText>
          {rightIcon}
        </>
      )}
    </>
  );

  if (variant === 'gradient' && !disabled) {
    return (
      <TouchableOpacity 
        style={[styles.button, style]} 
        disabled={loading || disabled} 
        activeOpacity={0.8}
        {...props}
      >
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
           {renderContent()}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={[styles.button, style]} 
      disabled={loading || disabled} 
      activeOpacity={0.8}
      {...props}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};
