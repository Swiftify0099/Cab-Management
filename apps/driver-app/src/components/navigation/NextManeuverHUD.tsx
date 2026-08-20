/**
 * Next Maneuver HUD Component — Feature 7
 * Top turn-by-turn banner displaying next turn instruction, distance, maneuver icon, and voice toggle.
 */
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { TurnStep } from '../../types/navigation'

interface Props {
  currentStep?: TurnStep | null
  distanceMeters?: number
  isVoiceOn: boolean
  isDark?: boolean
  onToggleVoice: () => void
}

export const NextManeuverHUD: React.FC<Props> = ({
  currentStep,
  distanceMeters = 300,
  isVoiceOn,
  isDark = false,
  onToggleVoice,
}) => {
  const instruction = currentStep?.instruction || 'Proceed toward destination on main route'
  const maneuver = currentStep?.maneuver || 'STRAIGHT'

  // Icon mapping
  const getManeuverIcon = () => {
    switch (maneuver) {
      case 'TURN_RIGHT':
        return <MaterialCommunityIcons name="arrow-top-right-thick" size={28} color="#FFFFFF" />
      case 'TURN_LEFT':
        return <MaterialCommunityIcons name="arrow-top-left-thick" size={28} color="#FFFFFF" />
      case 'UTURN':
        return <MaterialCommunityIcons name="arrow-u-down-left" size={28} color="#FFFFFF" />
      case 'ARRIVE':
        return <MaterialCommunityIcons name="flag-checkered" size={26} color="#FFFFFF" />
      default:
        return <MaterialCommunityIcons name="arrow-up-thick" size={28} color="#FFFFFF" />
    }
  }

  const bgHeader = isDark ? '#1E293B' : '#0F766E'
  const distText = distanceMeters > 1000 ? `${(distanceMeters / 1000).toFixed(1)} km` : `${distanceMeters} m`

  return (
    <View style={[styles.container, { backgroundColor: bgHeader }]}>
      <View style={styles.iconBox}>{getManeuverIcon()}</View>

      <View style={styles.textCol}>
        <Text style={styles.distanceText}>IN {distText}</Text>
        <Text style={styles.instructionText} numberOfLines={2}>
          {instruction}
        </Text>
      </View>

      <TouchableOpacity style={styles.voiceBtn} onPress={onToggleVoice} activeOpacity={0.7}>
        <Feather name={isVoiceOn ? 'volume-2' : 'volume-x'} size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textCol: {
    flex: 1,
  },
  distanceText: {
    color: '#A7F3D0',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
    lineHeight: 19,
  },
  voiceBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
})
