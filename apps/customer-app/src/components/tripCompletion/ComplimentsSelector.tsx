/**
 * Feature 10: Driver Compliments Selector
 * Interactive badges allowing passenger to express appreciation for driver performance.
 */
import React from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { AppText } from '../ui'

export const COMPLIMENT_CATALOG = [
  { id: 'SAFE_DRIVING', label: 'Safe Driver', icon: 'shield-checkmark', emoji: '🛡️' },
  { id: 'CLEAN_VEHICLE', label: 'Clean & Fresh Car', icon: 'sparkles', emoji: '✨' },
  { id: 'PROFESSIONAL', label: 'Polite & Respectful', icon: 'heart', emoji: '🤝' },
  { id: 'SMOOTH_RIDE', label: 'Smooth Ride & AC', icon: 'musical-notes', emoji: '❄️' },
  { id: 'PUNCTUAL', label: 'Punctual & Fast', icon: 'time', emoji: '⏱️' },
  { id: 'HELPFUL', label: 'Helpful with Bags', icon: 'bag', emoji: '🧳' },
]

interface ComplimentsSelectorProps {
  selectedCompliments: string[]
  onToggleCompliment: (id: string) => void
}

export function ComplimentsSelector({
  selectedCompliments,
  onToggleCompliment,
}: ComplimentsSelectorProps) {
  const { theme, isDark } = useTheme()

  return (
    <View style={styles.container}>
      <AppText variant="label" color="secondary" style={styles.sectionTitle}>
        WHAT WENT GREAT? (OPTIONAL)
      </AppText>

      <View style={styles.grid}>
        {COMPLIMENT_CATALOG.map((item) => {
          const isSelected = selectedCompliments.includes(item.id)
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected
                    ? isDark ? 'rgba(16, 185, 129, 0.2)' : '#ECFDF5'
                    : isDark ? theme.colors.surface : '#F8FAFC',
                  borderColor: isSelected ? '#10B981' : isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                },
              ]}
              onPress={() => onToggleCompliment(item.id)}
              activeOpacity={0.7}
            >
              <AppText style={styles.emoji}>{item.emoji}</AppText>
              <AppText
                variant="caption"
                style={{
                  fontWeight: isSelected ? '700' : '500',
                  color: isSelected ? '#10B981' : theme.colors.textPrimary,
                }}
              >
                {item.label}
              </AppText>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  emoji: {
    fontSize: 14,
    marginRight: 6,
  },
})
