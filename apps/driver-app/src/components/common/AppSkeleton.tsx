import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

interface AppSkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  variant?: 'rectangular' | 'circular' | 'text';
  style?: ViewStyle;
}

export const AppSkeleton: React.FC<AppSkeletonProps> = ({
  width,
  height,
  borderRadius,
  variant = 'rectangular',
  style,
}) => {
  const { theme } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'circular':
        return {
          width: width || 40,
          height: height || width || 40,
          borderRadius: borderRadius || (typeof width === 'number' ? width / 2 : 20),
        };
      case 'text':
        return {
          width: width || '100%',
          height: height || 20,
          borderRadius: borderRadius || theme.radius.sm,
          marginBottom: theme.spacing.xs,
        };
      case 'rectangular':
      default:
        return {
          width: width || '100%',
          height: height || 100,
          borderRadius: borderRadius || theme.radius.md,
        };
    }
  };

  const styles = StyleSheet.create({
    skeleton: {
      backgroundColor: theme.colors.surfaceVariant,
      overflow: 'hidden',
      ...getVariantStyles(),
    },
  });

  return (
    <Animated.View style={[styles.skeleton, style, { opacity }]} />
  );
};
