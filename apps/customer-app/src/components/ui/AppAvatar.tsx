/**
 * AppAvatar — Themed circular avatar with initials fallback.
 * Replaces avatar patterns in HomeTab and ProfileTab.
 *
 * Usage:
 *   <AppAvatar name="John Doe" size={88} />
 *   <AppAvatar imageUri={profile.photo_url} size={44} />
 */
import React, { memo } from 'react'
import { View, Text, Image, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../../contexts/ThemeContext'

interface AppAvatarProps {
  name?:     string
  imageUri?: string | null
  size?:     number
}

export const AppAvatar = memo(function AppAvatar({
  name    = '',
  imageUri,
  size    = 44,
}: AppAvatarProps) {
  const { theme } = useTheme()

  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || '?'

  const fontSize = size * 0.34

  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={[
          styles.avatar,
          {
            width:        size,
            height:       size,
            borderRadius: size / 2,
            borderColor:  theme.colors.primary,
            borderWidth:  2,
          },
        ]}
      />
    )
  }

  return (
    <LinearGradient
      colors={theme.gradient.primary}
      style={[
        styles.gradient,
        {
          width:        size,
          height:       size,
          borderRadius: size / 2,
          borderColor:  `${theme.colors.primary}80`,
          borderWidth:  2,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize, color: theme.colors.white }]}>
        {initials}
      </Text>
    </LinearGradient>
  )
})

const styles = StyleSheet.create({
  avatar: {
    resizeMode: 'cover',
  },
  gradient: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '800',
  },
})
