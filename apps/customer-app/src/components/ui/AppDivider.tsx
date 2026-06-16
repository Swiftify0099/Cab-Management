/**
 * AppDivider — Themed horizontal divider line.
 * Replaces menuDivider, fareDivider, divider patterns.
 */
import React, { memo } from 'react'
import { View, StyleSheet } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'

interface AppDividerProps {
  marginVertical?: number
  marginLeft?:     number
  dashed?:         boolean
}

export const AppDivider = memo(function AppDivider({
  marginVertical = 0,
  marginLeft     = 0,
  dashed         = false,
}: AppDividerProps) {
  const { theme } = useTheme()
  return (
    <View
      style={[
        styles.divider,
        {
          backgroundColor:   dashed ? 'transparent' : theme.colors.divider,
          borderBottomColor: theme.colors.divider,
          borderBottomWidth: dashed ? 1 : 0,
          borderStyle:       dashed ? 'dashed' : 'solid',
          marginVertical,
          marginLeft,
        },
      ]}
    />
  )
})

const styles = StyleSheet.create({
  divider: {
    height:     1,
    width:      '100%',
  },
})
