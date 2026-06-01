/**
 * StopMarkers Component
 * ─────────────────────────────────────────────────────────────
 * Renders all stop types on the map with distinct colored markers:
 *   🟢 Pickup     — Green
 *   🔴 Dropoff    — Red
 *   🔵 Hotel Stop — Blue
 *   🟠 Fuel Stop  — Orange
 *   🟡 Food Stop  — Yellow
 *   🟣 Parcel P/U — Purple
 *   🩷 Parcel Del — Pink
 */
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Marker, Callout } from 'react-native-maps'

// ─── Types ────────────────────────────────────────────────────
export type StopType =
  | 'pickup'
  | 'dropoff'
  | 'hotel'
  | 'fuel'
  | 'food'
  | 'parcel_pickup'
  | 'parcel_drop'

export interface MapStop {
  id: string
  label: string
  address?: string
  lat: number
  lng: number
  type: StopType
  completed?: boolean
  eta?: string
}

// ─── Stop Config ──────────────────────────────────────────────
const STOP_CONFIG: Record<StopType, { color: string; bg: string; emoji: string; label: string }> = {
  pickup:       { color: '#10B981', bg: '#D1FAE5', emoji: '📍', label: 'Pickup'       },
  dropoff:      { color: '#EF4444', bg: '#FEE2E2', emoji: '🏁', label: 'Drop-off'     },
  hotel:        { color: '#3B82F6', bg: '#DBEAFE', emoji: '🏨', label: 'Hotel Stop'   },
  fuel:         { color: '#F59E0B', bg: '#FEF3C7', emoji: '⛽', label: 'Fuel Stop'    },
  food:         { color: '#EAB308', bg: '#FEF9C3', emoji: '🍽️', label: 'Food Stop'    },
  parcel_pickup:{ color: '#8B5CF6', bg: '#EDE9FE', emoji: '📦', label: 'Parcel P/U'  },
  parcel_drop:  { color: '#EC4899', bg: '#FCE7F3', emoji: '📫', label: 'Parcel Del'   },
}

// ─── Single Marker ────────────────────────────────────────────
function StopMarker({ stop, onPress }: { stop: MapStop; onPress?: (id: string) => void }) {
  const cfg = STOP_CONFIG[stop.type]
  const opacity = stop.completed ? 0.4 : 1

  return (
    <Marker
      key={stop.id}
      coordinate={{ latitude: stop.lat, longitude: stop.lng }}
      anchor={{ x: 0.5, y: 1 }}
      onPress={() => onPress?.(stop.id)}
      tracksViewChanges={false}
    >
      {/* Custom marker pin */}
      <View style={{ opacity, alignItems: 'center' }}>
        <View style={[styles.pin, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
          <Text style={styles.emoji}>{cfg.emoji}</Text>
        </View>
        <View style={[styles.pinTail, { borderTopColor: cfg.color }]} />
      </View>

      {/* Callout popup on tap */}
      <Callout tooltip>
        <View style={[styles.callout, { borderColor: cfg.color }]}>
          <Text style={[styles.calloutTitle, { color: cfg.color }]}>
            {cfg.emoji} {stop.label || cfg.label}
          </Text>
          {stop.address ? (
            <Text style={styles.calloutAddress} numberOfLines={2}>{stop.address}</Text>
          ) : null}
          {stop.eta ? (
            <Text style={[styles.calloutEta, { color: cfg.color }]}>ETA: {stop.eta}</Text>
          ) : null}
          {stop.completed ? (
            <Text style={styles.calloutDone}>✅ Completed</Text>
          ) : null}
        </View>
      </Callout>
    </Marker>
  )
}

// ─── Multi Markers ────────────────────────────────────────────
interface StopMarkersProps {
  stops: MapStop[]
  onPress?: (stopId: string) => void
}

export function StopMarkers({ stops, onPress }: StopMarkersProps) {
  return (
    <>
      {stops.map(stop => (
        <StopMarker key={stop.id} stop={stop} onPress={onPress} />
      ))}
    </>
  )
}

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  pin: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  emoji: { fontSize: 18 },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  callout: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 10,
    minWidth: 140,
    maxWidth: 220,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  calloutTitle:   { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  calloutAddress: { fontSize: 11, color: '#64748B', marginBottom: 4, lineHeight: 16 },
  calloutEta:     { fontSize: 11, fontWeight: '600' },
  calloutDone:    { fontSize: 11, color: '#10B981', fontWeight: '600', marginTop: 4 },
})
