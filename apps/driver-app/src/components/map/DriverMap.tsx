/**
 * DriverMap Component
 * ─────────────────────────────────────────────────────────────
 * Core Google Maps wrapper for all driver-facing screens.
 * Features:
 *  - provider="google" with night mode map style
 *  - Animated driver marker with heading arrow
 *  - Traffic layer toggle
 *  - User location dot
 *  - Accepts route polyline, stop markers, nearby places
 */
import React, { useRef, useEffect, forwardRef } from 'react'
import { StyleSheet, View } from 'react-native'
import MapView, { type Region } from 'react-native-maps'
import type { Coordinate } from '../../services/googleMaps'
import { RoutePolyline } from './RoutePolyline'
import { StopMarkers, type MapStop } from './StopMarkers'
import { DriverMarker } from './DriverMarker'

// ─── Night Mode Map Style ─────────────────────────────────────
const NIGHT_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#4b6878' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#334e87' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#023e58' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#283d6a' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6f9ba5' }] },
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#023e58' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
  { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c6675' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#255763' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#b0d5ce' }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4e6d70' }] },
]

// ─── Types ────────────────────────────────────────────────────
export interface DriverMapProps {
  style?: object
  initialRegion?: Region

  // Driver position
  driverLat?: number
  driverLng?: number
  driverHeading?: number
  driverSpeed?: number

  // Route
  polyline?: Coordinate[]

  // Stops
  stops?: MapStop[]

  // Settings
  nightMode?: boolean
  trafficEnabled?: boolean
  showsUserLocation?: boolean
  followDriver?: boolean        // Camera follows driver marker
  zoomLevel?: number

  // Callbacks
  onMapReady?: () => void
  onRegionChange?: (region: Region) => void
  onMarkerPress?: (stopId: string) => void
}

// ─── Component ────────────────────────────────────────────────
export const DriverMap = forwardRef<MapView, DriverMapProps>(
  (
    {
      style,
      initialRegion,
      driverLat,
      driverLng,
      driverHeading = 0,
      driverSpeed = 0,
      polyline = [],
      stops = [],
      nightMode = false,
      trafficEnabled = true,
      showsUserLocation = false,
      followDriver = false,
      onMapReady,
      onRegionChange,
      onMarkerPress,
    },
    ref
  ) => {
    const mapRef = useRef<MapView | null>(null)

    // Merge external ref
    const setRef = (map: MapView | null) => {
      mapRef.current = map
      if (typeof ref === 'function') ref(map)
      else if (ref) (ref as React.MutableRefObject<MapView | null>).current = map
    }

    // Animate camera to follow driver when position updates
    useEffect(() => {
      if (!followDriver || !driverLat || !driverLng || !mapRef.current) return

      mapRef.current.animateCamera(
        {
          center:  { latitude: driverLat, longitude: driverLng },
          heading: driverHeading,
          pitch:   45,
          zoom:    16,
        },
        { duration: 1000 }
      )
    }, [driverLat, driverLng, driverHeading, followDriver])

    const defaultRegion: Region = initialRegion ?? {
      latitude:       driverLat ?? 19.076,
      longitude:      driverLng ?? 72.8777,
      latitudeDelta:  0.05,
      longitudeDelta: 0.05,
    }

    return (
      <View style={[styles.container, style]}>
        <MapView
          ref={setRef}
          style={StyleSheet.absoluteFill}
          initialRegion={defaultRegion}
          showsTraffic={trafficEnabled}
          showsUserLocation={showsUserLocation}
          showsMyLocationButton={false}
          showsCompass={false}
          toolbarEnabled={false}
          customMapStyle={nightMode ? NIGHT_MAP_STYLE : []}
          onMapReady={onMapReady}
          onRegionChangeComplete={onRegionChange}
          mapType="standard"
          moveOnMarkerPress={false}
        >
          {/* Route line */}
          {polyline.length > 1 && (
            <RoutePolyline coordinates={polyline} />
          )}

          {/* Stop markers */}
          {stops.length > 0 && (
            <StopMarkers stops={stops} onPress={onMarkerPress} />
          )}

          {/* Animated driver marker */}
          {driverLat !== undefined && driverLng !== undefined && (
            <DriverMarker
              lat={driverLat}
              lng={driverLng}
              heading={driverHeading}
              speed={driverSpeed}
            />
          )}
        </MapView>
      </View>
    )
  }
)

DriverMap.displayName = 'DriverMap'

const styles = StyleSheet.create({
  container: { flex: 1 },
})
