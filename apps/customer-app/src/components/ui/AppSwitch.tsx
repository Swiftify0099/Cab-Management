/**
 * AppSwitch — Themed switch toggle.
 * Replaces all Switch + isDarkMode patterns.
 */
import React, { memo } from 'react'
import { Switch, View, Text, StyleSheet } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { Typography } from '../../theme/typography'
import { Spacing } from '../../theme/spacing'

interface AppSwitchProps {
  value:           boolean
  onValueChange:   (v: boolean) => void
  label?:          string
  sublabel?:       string
}

export const AppSwitch = memo(function AppSwitch({
  value,
  onValueChange,
  label,
  sublabel,
}: AppSwitchProps) {
  const { theme } = useTheme()

  return (
    <View style={styles.row}>
      {(label || sublabel) ? (
        <View style={styles.textWrap}>
          {label ? (
            <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
              {label}
            </Text>
          ) : null}
          {sublabel ? (
            <Text style={[styles.sublabel, { color: theme.colors.textSecondary }]}>
              {sublabel}
            </Text>
          ) : null}
        </View>
      ) : null}
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        thumbColor={theme.colors.white}
        ios_backgroundColor={theme.colors.border}
      />
    </View>
  )
})

const styles = StyleSheet.create({
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  textWrap: { flex: 1, marginRight: Spacing.md },
  label:    { fontSize: Typography.size.body, fontWeight: '600' },
  sublabel: { fontSize: Typography.size.small, marginTop: 2 },
})
