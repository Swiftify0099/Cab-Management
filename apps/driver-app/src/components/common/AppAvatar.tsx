import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { useTheme } from '../../theme';

interface AppAvatarProps {
  source?: { uri: string };
  fallbackText?: string;
  size?: number;
  style?: ViewStyle;
}

export const AppAvatar: React.FC<AppAvatarProps> = ({
  source,
  fallbackText,
  size = 40,
  style,
}) => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: theme.colors.surfaceVariant,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    image: {
      width: '100%',
      height: '100%',
    },
  });

  return (
    <View style={[styles.container, style]}>
      {source ? (
        <Image source={source} style={styles.image} />
      ) : (
        <AppText variant="body1" weight="bold" color="textSecondary">
          {fallbackText?.charAt(0).toUpperCase() || '?'}
        </AppText>
      )}
    </View>
  );
};
