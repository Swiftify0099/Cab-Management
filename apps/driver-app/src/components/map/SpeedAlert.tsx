/**
 * SpeedAlert Component
 * ─────────────────────────────────────────────────────────────
 * Floating overlay that appears when the driver exceeds the speed limit.
 * Shows current speed, limit, and a warning with optional voice alert.
 */
import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated, Vibration } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface SpeedAlertProps {
  currentSpeed: number   // km/h
  speedLimit?: number    // km/h (default 80)
  visible?: boolean      // manual override
  useVoice?: boolean     // speak warning (requires expo-speech)
}

export function SpeedAlert({
  currentSpeed,
  speedLimit = 80,
  visible,
  useVoice = false,
}: SpeedAlertProps) {
  const isOver  = currentSpeed > speedLimit
  const show    = visible ?? isOver
  const opacity = useRef(new Animated.Value(0)).current
  const scale   = useRef(new Animated.Value(0.8)).current
  const lastVibratedRef = useRef(0)  // timestamp of last vibration (cooldown guard)

  useEffect(() => {
    if (show) {
      // Vibrate on overspeed — but only once per 10 seconds to avoid spam
      const now = Date.now()
      if (now - lastVibratedRef.current > 10000) {
        lastVibratedRef.current = now
        try {
          Vibration.cancel()
          Vibration.vibrate(200)
        } catch { /* ignore vibration errors */ }
      }

      Animated.parallel([
        Animated.spring(opacity, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
      ]).start()

      // Voice alert
      if (useVoice) {
        try {
          const Speech = require('expo-speech')
          Speech.speak(`Speed alert. Current speed ${currentSpeed} kilometres per hour. Speed limit is ${speedLimit}.`, {
            language: 'en-IN',
            rate: 1.1,
          })
        } catch { /* expo-speech not available */ }
      }
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.8, duration: 200, useNativeDriver: true }),
      ]).start()
    }
  }, [show, currentSpeed])

  if (!show) return null

  const isCritical = currentSpeed > speedLimit + 20

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity, transform: [{ scale }] },
        isCritical && styles.critical,
      ]}
    >
      <Ionicons
        name="speedometer"
        size={20}
        color={isCritical ? '#fff' : '#FEF3C7'}
      />
      <View>
        <Text style={[styles.speed, isCritical && styles.textWhite]}>
          {currentSpeed} km/h
        </Text>
        <Text style={[styles.limit, isCritical && styles.textWhiteLight]}>
          ⚠️ Limit: {speedLimit} km/h
        </Text>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245,158,11,0.92)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#F59E0B',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  critical: {
    backgroundColor: 'rgba(220,38,38,0.95)',
    shadowColor: '#DC2626',
  },
  speed: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  limit: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '600',
  },
  textWhite:      { color: '#fff' },
  textWhiteLight: { color: 'rgba(255,255,255,0.85)' },
})
