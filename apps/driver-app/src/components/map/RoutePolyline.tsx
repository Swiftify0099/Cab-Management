/**
 * RoutePolyline Component
 * ─────────────────────────────────────────────────────────────
 * Renders the driving route on Google Maps as a styled polyline.
 * Shows the completed portion in a faded color and the remaining
 * route in the active color.
 */
import React from 'react'
import { Polyline } from 'react-native-maps'
import type { Coordinate } from '../../services/googleMaps'

interface RoutePolylineProps {
  coordinates: Coordinate[]
  completedUpToIndex?: number   // index up to which route is "completed"
  strokeColor?: string
  strokeWidth?: number
  nightMode?: boolean
}

export function RoutePolyline({
  coordinates,
  completedUpToIndex = 0,
  strokeColor,
  strokeWidth = 5,
  nightMode = false,
}: RoutePolylineProps) {
  if (!coordinates?.length) return null

  const latLng = coordinates.map(c => ({
    latitude: c.lat,
    longitude: c.lng,
  }))

  const activeColor  = strokeColor ?? (nightMode ? '#38BDF8' : '#2563EB')
  const doneColor    = nightMode ? 'rgba(56,189,248,0.3)' : 'rgba(37,99,235,0.3)'

  const completedCoords = completedUpToIndex > 0
    ? latLng.slice(0, completedUpToIndex + 1)
    : []

  const remainingCoords = completedUpToIndex > 0
    ? latLng.slice(completedUpToIndex)
    : latLng

  return (
    <>
      {/* Completed portion — faded */}
      {completedCoords.length > 1 && (
        <Polyline
          coordinates={completedCoords}
          strokeColor={doneColor}
          strokeWidth={strokeWidth}
          lineDashPattern={[8, 4]}
        />
      )}

      {/* Remaining/active portion */}
      {remainingCoords.length > 1 && (
        <>
          {/* White outline for contrast */}
          <Polyline
            coordinates={remainingCoords}
            strokeColor={nightMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.8)'}
            strokeWidth={strokeWidth + 4}
          />
          {/* Colored route line */}
          <Polyline
            coordinates={remainingCoords}
            strokeColor={activeColor}
            strokeWidth={strokeWidth}
            lineCap="round"
            lineJoin="round"
          />
        </>
      )}
    </>
  )
}
