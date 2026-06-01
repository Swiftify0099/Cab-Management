/**
 * DriverMarker Component
 * ─────────────────────────────────────────────────────────────
 * Animated car marker showing real-time driver position with
 * heading direction arrow and speed badge.
 */
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Marker } from 'react-native-maps'
import { Ionicons } from '@expo/vector-icons'
import type { Coordinate } from '../../services/googleMaps'

interface DriverMarkerProps {
  lat: number
  lng: number
  heading: number   // degrees 0–360
  speed: number     // km/h
}

export function DriverMarker({ lat, lng, heading, speed }: DriverMarkerProps) {
  return (
    <Marker
      coordinate={{ latitude: lat, longitude: lng }}
      anchor={{ x: 0.5, y: 0.5 }}
      flat
      tracksViewChanges={false}
    >
      <View style={styles.markerContainer}>
        {/* Heading arrow (rotated to match direction) */}
        <View style={[styles.arrow, { transform: [{ rotate: `${heading}deg` }] }]}>
          <View style={styles.arrowHead} />
        </View>

        {/* Car icon circle */}
        <View style={styles.carCircle}>
          <Ionicons name="car-sport" size={18} color="#fff" />
        </View>

        {/* Speed badge */}
        {speed > 0 && (
          <View style={styles.speedBadge}>
            <Text style={styles.speedText}>{speed}</Text>
            <Text style={styles.speedUnit}>km/h</Text>
          </View>
        )}
      </View>
    </Marker>
  )
}

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
  },
  arrow: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    width: 60,
    height: 60,
  },
  arrowHead: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#3B82F6',
    marginTop: 2,
  },
  carCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E40AF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  speedBadge: {
    position: 'absolute',
    bottom: -4,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 1,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  speedText: { color: '#F1F5F9', fontSize: 10, fontWeight: '800' },
  speedUnit: { color: '#64748B', fontSize: 7 },
})
