import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../../theme'

interface Props {
  currentStep: number
  totalSteps?: number
  stepLabels?: string[]
}

const DEFAULT_LABELS = [
  'Type',
  'Basic',
  'RC Info',
  'Docs',
  'Inspection',
  'Review',
]

export function VehicleStepper({
  currentStep,
  totalSteps = 6,
  stepLabels = DEFAULT_LABELS,
}: Props) {
  const { theme, isDark } = useTheme()

  return (
    <View style={styles.container}>
      {/* Top Step Progress Bar */}
      <View style={styles.barContainer}>
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNum = index + 1
          const isDone = stepNum < currentStep
          const isCurrent = stepNum === currentStep

          return (
            <View
              key={index}
              style={[
                styles.barSegment,
                {
                  backgroundColor: isDone
                    ? '#10B981'
                    : isCurrent
                    ? '#0EA5E9'
                    : isDark
                    ? '#334155'
                    : '#E2E8F0',
                },
              ]}
            />
          )
        })}
      </View>

      {/* Step Info Row */}
      <View style={styles.infoRow}>
        <Text style={[styles.stepCount, { color: '#0EA5E9' }]}>
          STEP {currentStep} OF {totalSteps}
        </Text>
        <Text style={[styles.currentLabel, { color: theme.colors.text }]}>
          {stepLabels[currentStep - 1] || `Step ${currentStep}`}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  barSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepCount: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  currentLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
})
