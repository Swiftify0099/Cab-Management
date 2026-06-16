import React from 'react';
import { View, TextInput, TextInputProps, StyleSheet, TouchableOpacity } from 'react-native';
import { AppText } from './AppText';
import { AppIcon } from './AppIcon';
import { useTheme } from '../../theme';

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  iconFamily?: 'Feather' | 'Ionicons';
}

export const AppInput: React.FC<AppInputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  iconFamily = 'Feather',
  style,
  ...props
}) => {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = React.useState(false);

  const styles = StyleSheet.create({
    container: {
      marginBottom: theme.spacing.md,
    },
    label: {
      marginBottom: theme.spacing.xs,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: error ? theme.colors.error : isFocused ? theme.colors.primary : theme.colors.border,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.md,
      height: 48,
    },
    input: {
      flex: 1,
      color: theme.colors.text,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.sizes.md,
      height: '100%',
    },
    iconLeft: {
      marginRight: theme.spacing.sm,
    },
    iconRight: {
      marginLeft: theme.spacing.sm,
    },
    errorText: {
      marginTop: theme.spacing.xs,
    }
  });

  return (
    <View style={styles.container}>
      {label && (
        <AppText variant="body2" weight="medium" color="textSecondary" style={styles.label}>
          {label}
        </AppText>
      )}
      <View style={styles.inputContainer}>
        {leftIcon && (
          <View style={styles.iconLeft}>
            <AppIcon family={iconFamily} name={leftIcon} size={20} colorVariant={isFocused ? 'primary' : 'textTertiary'} />
          </View>
        )}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={theme.colors.textTertiary}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} disabled={!onRightIconPress} style={styles.iconRight}>
            <AppIcon family={iconFamily} name={rightIcon} size={20} colorVariant="textTertiary" />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <AppText variant="caption" color="error" style={styles.errorText}>
          {error}
        </AppText>
      )}
    </View>
  );
};
