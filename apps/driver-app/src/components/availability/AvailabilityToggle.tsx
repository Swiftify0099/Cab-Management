import React, { useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from '../../theme'
import { AvailabilityState } from '../../services/availabilityService'

interface Props {
  state: AvailabilityState
  onToggle: () => void
  disabled?: boolean
}

export function AvailabilityToggle({ state, onToggle, disabled }: Props) {
  const { theme, isDark } = useTheme()
  const isOnline = state === 'ONLINE'
  const isTransitioning = state === 'GOING_ONLINE' || state === 'GOING_OFFLINE'

  // Pulse animation for Online state
  const pulseAnim = useRef(new Animated.Value(1)).current
  const glowAnim = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    if (isOnline) {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.15,
              duration: 1200,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1200,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 0.8,
              duration: 1200,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0.3,
              duration: 1200,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start()
    } else {
      pulseAnim.setValue(1)
      glowAnim.setValue(0.4)
    }
  }, [isOnline])

  return (
    <View style={styles.outerContainer}>
      {/* Outer Glowing Wave when Online */}
      {isOnline && (
        <Animated.View
          style={[
            styles.pulseRing,
            {
              transform: [{ scale: pulseAnim }],
              opacity: glowAnim,
              borderColor: '#10B981',
            },
          ]}
        />
      )}

      <TouchableOpacity
        style={[
          styles.mainCapsule,
          {
            backgroundColor: isOnline
              ? '#10B981'
              : isDark
              ? '#1E293B'
              : '#FFFFFF',
            borderColor: isOnline
              ? '#059669'
              : isDark
              ? '#334155'
              : '#E2E8F0',
            shadowColor: isOnline ? '#10B981' : '#000000',
          },
        ]}
        activeOpacity={0.85}
        disabled={disabled || isTransitioning}
        onPress={onToggle}
      >
        {isOnline ? (
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}

        <View style={styles.contentRow}>
          {/* Status Indicator Icon */}
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isOnline
                  ? 'rgba(255,255,255,0.25)'
                  : isDark
                  ? '#0F172A'
                  : '#F1F5F9',
              },
            ]}
          >
            {isTransitioning ? (
              <ActivityIndicator size="small" color={isOnline ? '#FFFFFF' : '#0EA5E9'} />
            ) : isOnline ? (
              <Ionicons name="radio" size={20} color="#FFFFFF" />
            ) : (
              <MaterialCommunityIcons
                name="power"
                size={22}
                color={isDark ? '#94A3B8' : '#64748B'}
              />
            )}
          </View>

          {/* Main Availability Text */}
          <View style={styles.textCol}>
            <Text
              style={[
                styles.primaryTitle,
                {
                  color: isOnline ? '#FFFFFF' : theme.colors.text,
                },
              ]}
            >
              {state === 'GOING_ONLINE'
                ? 'VERIFYING ELIGIBILITY...'
                : state === 'GOING_OFFLINE'
                ? 'GOING OFFLINE...'
                : isOnline
                ? 'YOU ARE ONLINE'
                : 'GO ONLINE'}
            </Text>
            <Text
              style={[
                styles.secondarySubtitle,
                {
                  color: isOnline
                    ? 'rgba(255, 255, 255, 0.85)'
                    : theme.colors.textSecondary,
                },
              ]}
            >
              {isOnline
                ? 'Ready & looking for nearby trips'
                : 'Tap to start receiving ride requests'}
            </Text>
          </View>

          {/* Action Arrow / Switch Indicator */}
          <View
            style={[
              styles.actionPill,
              {
                backgroundColor: isOnline
                  ? 'rgba(255, 255, 255, 0.2)'
                  : '#0EA5E9',
              },
            ]}
          >
            <Feather
              name={isOnline ? 'pause' : 'arrow-right'}
              size={16}
              color="#FFFFFF"
            />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  pulseRing: {
    ...StyleSheet.absoluteFill,
    borderRadius: 24,
    borderWidth: 2,
  },
  mainCapsule: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  primaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  secondarySubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
})
