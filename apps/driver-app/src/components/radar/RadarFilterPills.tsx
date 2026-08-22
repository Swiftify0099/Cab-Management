/**
 * Radar Filter Pills Component — Feature 6
 * Horizontal scrollable filter bar for Smart Ride Radar.
 */
import React from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { SmartRadarFilterType } from '../../types/smartRadar'

interface Props {
  selectedFilter: SmartRadarFilterType
  counts: Record<SmartRadarFilterType, number>
  isDark?: boolean
  onSelect: (filter: SmartRadarFilterType) => void
}

const FILTERS: { id: SmartRadarFilterType; label: string; icon?: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'recommended', label: 'Recommended', icon: '★' },
  { id: 'best_earnings', label: 'Best Earnings', icon: '💰' },
  { id: 'closest', label: 'Closest', icon: '📍' },
  { id: 'airport', label: 'Airport', icon: '✈️' },
]

export const RadarFilterPills: React.FC<Props> = ({
  selectedFilter,
  counts,
  isDark = false,
  onSelect,
}) => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {FILTERS.map(f => {
          const isSelected = selectedFilter === f.id
          const count = counts[f.id] ?? 0

          return (
            <TouchableOpacity
              key={f.id}
              style={[
                styles.pill,
                {
                  backgroundColor: isSelected
                    ? '#0284C7'
                    : isDark
                    ? '#1E293B'
                    : '#FFFFFF',
                  borderColor: isSelected
                    ? '#0284C7'
                    : isDark
                    ? '#334155'
                    : '#E2E8F0',
                },
              ]}
              onPress={() => onSelect(f.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.pillText,
                  {
                    color: isSelected
                      ? '#FFFFFF'
                      : isDark
                      ? '#E2E8F0'
                      : '#334155',
                    fontWeight: isSelected ? '800' : '600',
                  },
                ]}
              >
                {f.icon ? `${f.icon} ` : ''}
                {f.label} {count > 0 ? `(${count})` : ''}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  pillText: {
    fontSize: 12,
  },
})
