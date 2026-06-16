import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { AppIcon } from './AppIcon';
import { useTheme } from '../../theme';
import { useRouter } from 'expo-router';

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  showBack = true,
  onBack,
  rightAction,
  style,
}) => {
  const { theme } = useTheme();
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    backButton: {
      marginRight: theme.spacing.md,
      padding: theme.spacing.xs,
      borderRadius: theme.radius.round,
      backgroundColor: theme.colors.surfaceVariant,
    },
    title: {
      flex: 1,
    },
    rightSection: {
      marginLeft: theme.spacing.md,
    },
  });

  return (
    <View style={[styles.container, style]}>
      <View style={styles.leftSection}>
        {showBack && (
          <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
            <AppIcon name="chevron-left" size={24} colorVariant="text" />
          </TouchableOpacity>
        )}
        <AppText variant="h3" weight="bold" color="text" numberOfLines={1} style={styles.title}>
          {title}
        </AppText>
      </View>
      {rightAction && <View style={styles.rightSection}>{rightAction}</View>}
    </View>
  );
};
