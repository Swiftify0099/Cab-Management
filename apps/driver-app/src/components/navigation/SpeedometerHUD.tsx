/**
 * Speedometer & Speed Limit HUD Component — Feature 7
 * Displays live vehicle speed alongside posted road limit with subtle visual warning when speeding.
 */
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

interface Props {
  currentSpeedKmh: number
  speedLimitKmh?: number
  isDark?: boolean
}

export const SpeedometerHUD: React.FC<Props> = ({
  currentSpeedKmh,
  speedLimitKmh = 60,
  isDark = false,
}) => {
  const speed = Math.max(0, Math.round(currentSpeedKmh))
  const isSpeeding = speed > speedLimitKmh

  const bgBox = isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.92)'
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A'

  return (
    <View style={[styles.container, { backgroundColor: bgBox, borderColor: isSpeeding ? '#DC2626' : 'rgba(0,0,0,0.08)' }]}>
      {/* Current Speed */}
      <View style={styles.speedCol}>
        <Text style={[styles.speedVal, { color: isSpeeding ? '#DC2626' : textPrimary }]}>
          {speed}
        </Text>
        <Text style={styles.speedUnit}>km/h</Text>
      </View>

      {/* Speed Limit Sign */}
      <View style={styles.limitSign}>
        <Text style={styles.limitLabel}>LIMIT</Text>
        <Text style={styles.limitVal}>{speedLimitKmh}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  speedCol: {
    alignItems: 'center',
    minWidth: 40,
  },
  speedVal: {
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
  },
  speedUnit: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  limitSign: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: '#DC2626',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  limitLabel: {
    fontSize: 6,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 7,
  },
  limitVal: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 13,
  },
})
