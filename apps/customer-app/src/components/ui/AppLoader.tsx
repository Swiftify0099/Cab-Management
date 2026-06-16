/**
 * AppLoader — Themed activity indicator.
 * Replaces all <ActivityIndicator color="#2563EB"> instances.
 *
 * Usage:
 *   <AppLoader />
 *   <AppLoader size="large" fullScreen />
 *   <AppLoader color="white" />
 */
import React, { memo } from 'react'
import { ActivityIndicator, View, StyleSheet } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { AppText } from './AppText'

interface AppLoaderProps {
  size?:      'small' | 'large'
  color?:     'primary' | 'white' | 'secondary'
  fullScreen?: boolean
  label?:     string
}

export const AppLoader = memo(function AppLoader({
  size       = 'large',
  color      = 'primary',
  fullScreen = false,
  label,
}: AppLoaderProps) {
  const { theme } = useTheme()

  const resolvedColor =
    color === 'white'     ? theme.colors.white :
    color === 'secondary' ? theme.colors.secondary :
    theme.colors.primary

  if (fullScreen) {
    return (
      <View style={[styles.fullScreen, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size={size} color={resolvedColor} />
        {label ? (
          <AppText variant="caption" color="muted" style={styles.label}>
            {label}
          </AppText>
        ) : null}
      </View>
    )
  }

  return (
    <View style={styles.inline}>
      <ActivityIndicator size={size} color={resolvedColor} />
      {label ? (
        <AppText variant="caption" color="muted" style={styles.label}>
          {label}
        </AppText>
      ) : null}
    </View>
  )
})

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inline: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  label: {
    marginTop: 10,
  },
})
