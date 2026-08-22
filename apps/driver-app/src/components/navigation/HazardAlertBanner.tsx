/**
 * Hazard Alert Banner Component — Feature 7
 * Non-intrusive banner displaying upcoming road hazards with dismiss action.
 */
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { RoadHazardData } from '../../types/navigation'

interface Props {
  hazard: RoadHazardData
  distanceMeters?: number
  onDismiss: () => void
}

export const HazardAlertBanner: React.FC<Props> = ({
  hazard,
  distanceMeters = 600,
  onDismiss,
}) => {
  const getHazardLabel = () => {
    switch (hazard.hazard_type) {
      case 'accident':
        return '🚗 Accident reported ahead'
      case 'pothole':
        return '🕳 Pothole / Rough road ahead'
      case 'road_closed':
        return '🚫 Road closure ahead'
      case 'construction':
        return '🚧 Construction work ahead'
      case 'heavy_traffic':
        return '🚦 Heavy traffic slowdown'
      case 'flooding':
        return '🌊 Water logging / Flooding ahead'
      default:
        return '⚠ Road hazard ahead'
    }
  }

  const distText = distanceMeters > 1000 ? `${(distanceMeters / 1000).toFixed(1)} km` : `${distanceMeters} m`

  return (
    <View style={styles.banner}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name="alert-decagram" size={22} color="#FFFFFF" />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.alertTitle}>{getHazardLabel()}</Text>
        <Text style={styles.alertSub}>Approx. {distText} away • Drive carefully</Text>
      </View>
      <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
        <Feather name="x" size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EA580C',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  iconWrap: {
    marginRight: 10,
  },
  textWrap: {
    flex: 1,
  },
  alertTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  alertSub: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    marginTop: 1,
  },
  dismissBtn: {
    padding: 6,
  },
})
