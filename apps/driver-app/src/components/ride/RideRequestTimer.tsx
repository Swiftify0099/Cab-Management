/**
 * Ride Request Circular Countdown Timer — Feature 5
 * Server-synced 180s circular animated countdown ring with dynamic color shift.
 */
import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'

interface Props {
  timeLeft: number
  totalTime: number
  isDark?: boolean
}

export const RideRequestTimer: React.FC<Props> = ({
  timeLeft,
  totalTime = 180,
  isDark = false,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current

  const progress = Math.max(0, Math.min(1, timeLeft / totalTime))

  // Color dynamics: Green (>50%) -> Amber (>25%) -> Red (<=25%)
  const timerColor =
    progress > 0.5 ? '#16A34A' : progress > 0.25 ? '#D97706' : '#DC2626'

  // Pulse animation when time < 20s
  useEffect(() => {
    if (timeLeft <= 20 && timeLeft > 0) {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [timeLeft, pulseAnim])

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      <View
        style={[
          styles.outerRing,
          {
            borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
          },
        ]}
      >
        <View
          style={[
            styles.progressArc,
            {
              borderColor: timerColor,
              transform: [{ rotate: `${(1 - progress) * 360}deg` }],
            },
          ]}
        />
        <View
          style={[
            styles.innerCircle,
            {
              backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
            },
          ]}
        >
          <Text style={[styles.timerText, { color: timerColor }]}>
            {timeLeft}
          </Text>
        </View>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
  },
  outerRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  progressArc: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3.5,
    borderLeftColor: 'transparent',
    borderTopColor: 'transparent',
    position: 'absolute',
  },
  innerCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
})
