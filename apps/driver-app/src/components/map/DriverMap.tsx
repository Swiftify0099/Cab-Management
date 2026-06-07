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
 *  - Graceful fallback UI if Maps fails to initialise
 *
 *  Phase 2 — Polygon + Corridor additions:
 *  - Pickup polygon overlay (green, 30% opacity)
 *  - Destination polygon overlay (red, 30% opacity)
 *  - 3 KM route corridor buffer (blue, 15% opacity)
 *  - Customer markers inside corridor with distance label
 *  - Polygon drawing mode (tap to collect vertices, finish to close)
 */
import React, { useRef, useEffect, forwardRef, useState, useCallback } from 'react'
import { StyleSheet, View, Text, Platform, TouchableOpacity, Alert } from 'react-native'
import MapView, {
  type Region,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
  Polygon,
  Marker,
  Callout,
} from 'react-native-maps'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
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

/** A customer currently inside the driver's route corridor. */
export interface CorridorCustomer {
  booking_id: string
  customer_name: string
  pickup_address: string
  pickup_lat: number
  pickup_lng: number
  destination_address: string
  destination_lat: number
  destination_lng: number
  seats_required: number
  parcel: boolean
  from_time: string
  to_time: string
  women_only: boolean
  pickup_distance_km: number
  route_distance_km?: number | null
}

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

  // ── Phase 2: Polygon + Corridor Matching ─────────────────────────────────
  /** Driver-drawn pickup service area polygon (green) */
  pickupPolygon?: Coordinate[]
  /** Driver-drawn destination service area polygon (red) */
  destinationPolygon?: Coordinate[]
  /** 3 KM route buffer corridor polygon (blue) — decoded from backend */
  routeBufferPolygon?: Coordinate[]
  /** Customers eligible inside the corridor */
  corridorCustomers?: CorridorCustomer[]
  /**
   * When set, tapping the map adds a vertex to the polygon being drawn.
   * 'pickup_polygon' | 'destination_polygon' | null
   */
  drawingMode?: 'pickup_polygon' | 'destination_polygon' | null
  /** Called when driver finishes drawing a polygon */
  onPolygonDrawn?: (type: 'pickup' | 'destination', coords: Coordinate[]) => void
  /** Called when driver taps a corridor customer marker */
  onCorridorCustomerPress?: (customer: CorridorCustomer) => void

  // Callbacks
  onMapReady?: () => void
  onRegionChange?: (region: Region) => void
  onMarkerPress?: (stopId: string) => void
}

// ─── Fallback UI shown if MapView crashes ─────────────────────
function MapErrorFallback() {
  return (
    <View style={styles.fallback}>
      <Ionicons name="map-outline" size={48} color="#334155" />
      <Text style={styles.fallbackTitle}>Map unavailable</Text>
      <Text style={styles.fallbackSub}>
        Could not load Google Maps.{'\n'}Check your internet connection and API key.
      </Text>
    </View>
  )
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
      // Phase 2 props
      pickupPolygon = [],
      destinationPolygon = [],
      routeBufferPolygon = [],
      corridorCustomers = [],
      drawingMode = null,
      onPolygonDrawn,
      onCorridorCustomerPress,
      onMapReady,
      onRegionChange,
      onMarkerPress,
    },
    ref
  ) => {
    const mapRef = useRef<MapView | null>(null)
    const [mapError, setMapError] = useState(false)
    const [mapReady, setMapReady] = useState(false)

    // Polygon drawing state — vertices collected as driver taps the map
    const [drawingVertices, setDrawingVertices] = useState<Coordinate[]>([])

    // Merge external ref
    const setRef = (map: MapView | null) => {
      mapRef.current = map
      if (typeof ref === 'function') ref(map)
      else if (ref) (ref as React.MutableRefObject<MapView | null>).current = map
    }

    // Animate camera to follow driver when position updates
    useEffect(() => {
      if (!followDriver || !driverLat || !driverLng || !mapRef.current || !mapReady) return

      try {
        mapRef.current.animateCamera(
          {
            center:  { latitude: driverLat, longitude: driverLng },
            heading: driverHeading,
            pitch:   45,
            zoom:    16,
          },
          { duration: 1000 }
        )
      } catch (e) {
        console.warn('[DriverMap] animateCamera failed:', e)
      }
    }, [driverLat, driverLng, driverHeading, followDriver, mapReady])

    // Reset drawing vertices when drawing mode changes
    useEffect(() => {
      setDrawingVertices([])
    }, [drawingMode])

    const handleMapPress = useCallback(
      (event: any) => {
        if (!drawingMode) return
        const { latitude, longitude } = event.nativeEvent.coordinate
        setDrawingVertices((prev) => [...prev, { latitude, longitude }])
      },
      [drawingMode]
    )

    const handleFinishDrawing = useCallback(() => {
      if (drawingVertices.length < 3) {
        Alert.alert('Draw more', 'Please tap at least 3 points to create a service area polygon.')
        return
      }
      const type = drawingMode === 'pickup_polygon' ? 'pickup' : 'destination'
      onPolygonDrawn?.(type, drawingVertices)
      setDrawingVertices([])
    }, [drawingVertices, drawingMode, onPolygonDrawn])

    const defaultRegion: Region = initialRegion ?? {
      latitude:       driverLat ?? 19.076,
      longitude:      driverLng ?? 72.8777,
      latitudeDelta:  0.05,
      longitudeDelta: 0.05,
    }

    // Show fallback if MapView had a native error
    if (mapError) return <MapErrorFallback />

    return (
      <View style={[styles.container, style]}>
        <MapView
          ref={setRef}
          // Use Google provider on Android (requires API key in AndroidManifest.xml)
          // Fall back to default on iOS to avoid crash if Google SDK not linked
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
          style={StyleSheet.absoluteFill}
          initialRegion={defaultRegion}
          showsTraffic={trafficEnabled}
          showsUserLocation={showsUserLocation}
          showsMyLocationButton={false}
          showsCompass={false}
          toolbarEnabled={false}
          customMapStyle={nightMode ? NIGHT_MAP_STYLE : []}
          onMapReady={() => {
            console.log('[DriverMap] Map ready ✅')
            setMapReady(true)
            onMapReady?.()
          }}
          onRegionChangeComplete={onRegionChange}
          mapType="standard"
          moveOnMarkerPress={false}
          onPress={drawingMode ? handleMapPress : undefined}
          // ✅ Native error handler — prevents full app crash on bad API key
          onError={(e) => {
            console.error('[DriverMap] Native map error:', e.nativeEvent)
            setMapError(true)
          }}
        >
          {/* ── Route polyline ───────────────────────────────────────────────── */}
          {polyline.length > 1 && (
            <RoutePolyline coordinates={polyline} />
          )}

          {/* ── Stop markers ─────────────────────────────────────────────────── */}
          {stops.length > 0 && (
            <StopMarkers stops={stops} onPress={onMarkerPress} />
          )}

          {/* ── Animated driver marker ───────────────────────────────────────── */}
          {driverLat !== undefined && driverLng !== undefined && (
            <DriverMarker
              lat={driverLat}
              lng={driverLng}
              heading={driverHeading}
              speed={driverSpeed}
            />
          )}

          {/* ── Phase 2: Route Corridor Buffer (3KM) — blue, low opacity ──────── */}
          {routeBufferPolygon.length > 2 && (
            <Polygon
              coordinates={routeBufferPolygon}
              strokeColor="rgba(59,130,246,0.6)"
              fillColor="rgba(59,130,246,0.10)"
              strokeWidth={1.5}
            />
          )}

          {/* ── Phase 2: Pickup Polygon — green ──────────────────────────────── */}
          {pickupPolygon.length > 2 && (
            <Polygon
              coordinates={pickupPolygon}
              strokeColor="rgba(34,197,94,0.9)"
              fillColor="rgba(34,197,94,0.20)"
              strokeWidth={2}
              lineDashPattern={[8, 4]}
            />
          )}

          {/* ── Phase 2: Destination Polygon — red ───────────────────────────── */}
          {destinationPolygon.length > 2 && (
            <Polygon
              coordinates={destinationPolygon}
              strokeColor="rgba(239,68,68,0.9)"
              fillColor="rgba(239,68,68,0.20)"
              strokeWidth={2}
              lineDashPattern={[8, 4]}
            />
          )}

          {/* ── Phase 2: Drawing-mode in-progress polygon ─────────────────────── */}
          {drawingMode && drawingVertices.length > 1 && (
            <Polygon
              coordinates={drawingVertices}
              strokeColor={drawingMode === 'pickup_polygon'
                ? 'rgba(34,197,94,0.9)'
                : 'rgba(239,68,68,0.9)'}
              fillColor={drawingMode === 'pickup_polygon'
                ? 'rgba(34,197,94,0.15)'
                : 'rgba(239,68,68,0.15)'}
              strokeWidth={2}
              lineDashPattern={[6, 3]}
            />
          )}

          {/* ── Phase 2: Drawing vertex dots ─────────────────────────────────── */}
          {drawingMode && drawingVertices.map((coord, idx) => (
            <Marker
              key={`vertex-${idx}`}
              coordinate={coord}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <View style={[
                styles.vertexDot,
                { backgroundColor: drawingMode === 'pickup_polygon' ? '#22C55E' : '#EF4444' },
              ]} />
            </Marker>
          ))}

          {/* ── Phase 2: Corridor Customer Markers ───────────────────────────── */}
          {corridorCustomers.map((customer) => (
            <Marker
              key={`customer-${customer.booking_id}`}
              coordinate={{ latitude: customer.pickup_lat, longitude: customer.pickup_lng }}
              anchor={{ x: 0.5, y: 1 }}
              onPress={() => onCorridorCustomerPress?.(customer)}
              tracksViewChanges={false}
            >
              {/* Custom marker view */}
              <View style={styles.customerMarkerWrap}>
                <View style={[
                  styles.customerMarkerBubble,
                  customer.women_only && styles.customerMarkerWomenOnly,
                ]}>
                  <MaterialCommunityIcons
                    name={customer.women_only ? 'human-female' : 'account'}
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text style={styles.customerMarkerDist}>
                    {customer.pickup_distance_km < 1
                      ? `${Math.round(customer.pickup_distance_km * 1000)}m`
                      : `${customer.pickup_distance_km.toFixed(1)}km`}
                  </Text>
                </View>
                {/* Arrow tip */}
                <View style={[
                  styles.customerMarkerArrow,
                  customer.women_only && { borderTopColor: '#A855F7' },
                ]} />
              </View>

              {/* Callout shown on tap */}
              <Callout tooltip onPress={() => onCorridorCustomerPress?.(customer)}>
                <View style={styles.customerCallout}>
                  <Text style={styles.calloutName} numberOfLines={1}>
                    {customer.customer_name}
                  </Text>
                  <Text style={styles.calloutDetail} numberOfLines={1}>
                    📍 {customer.pickup_address}
                  </Text>
                  <Text style={styles.calloutDetail} numberOfLines={1}>
                    🏁 {customer.destination_address}
                  </Text>
                  <Text style={styles.calloutMeta}>
                    {customer.seats_required} seat{customer.seats_required > 1 ? 's' : ''}
                    {customer.parcel ? ' · 📦 Parcel' : ''}
                    {customer.women_only ? ' · 🚺 Women-only' : ''}
                  </Text>
                  <Text style={styles.calloutTime}>
                    🕐 {customer.from_time} – {customer.to_time}
                  </Text>
                  <View style={styles.calloutBtn}>
                    <Text style={styles.calloutBtnText}>Tap to Send Request</Text>
                  </View>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>

        {/* ── Drawing mode overlay controls ──────────────────────────────────── */}
        {drawingMode && (
          <View style={styles.drawingOverlay}>
            <View style={styles.drawingBadge}>
              <View style={[
                styles.drawingIndicator,
                { backgroundColor: drawingMode === 'pickup_polygon' ? '#22C55E' : '#EF4444' },
              ]} />
              <Text style={styles.drawingText}>
                Drawing {drawingMode === 'pickup_polygon' ? 'Pickup' : 'Destination'} Area
              </Text>
              <Text style={styles.drawingHint}>
                {drawingVertices.length} point{drawingVertices.length !== 1 ? 's' : ''} · Tap map to add
              </Text>
            </View>

            <View style={styles.drawingActions}>
              <TouchableOpacity
                style={[styles.drawingBtn, styles.drawingBtnUndo]}
                onPress={() => setDrawingVertices((prev) => prev.slice(0, -1))}
                disabled={drawingVertices.length === 0}
              >
                <Ionicons name="arrow-undo" size={18} color="#94A3B8" />
                <Text style={styles.drawingBtnText}>Undo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.drawingBtn, styles.drawingBtnFinish]}
                onPress={handleFinishDrawing}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={[styles.drawingBtnText, { color: '#FFFFFF' }]}>Finish</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    )
  }
)

DriverMap.displayName = 'DriverMap'

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Fallback styles
  fallback: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  fallbackTitle: {
    color: '#94A3B8',
    fontSize: 18,
    fontWeight: '700',
  },
  fallbackSub: {
    color: '#475569',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Drawing mode ───────────────────────────────────────────
  vertexDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  drawingOverlay: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    gap: 10,
  },
  drawingBadge: {
    backgroundColor: 'rgba(15,23,42,0.92)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    gap: 4,
  },
  drawingIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  drawingText: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '700',
  },
  drawingHint: {
    color: '#94A3B8',
    fontSize: 12,
  },
  drawingActions: {
    flexDirection: 'row',
    gap: 12,
  },
  drawingBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  drawingBtnUndo: {
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  drawingBtnFinish: {
    backgroundColor: '#3B82F6',
  },
  drawingBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },

  // ── Customer markers ────────────────────────────────────────
  customerMarkerWrap: {
    alignItems: 'center',
  },
  customerMarkerBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  customerMarkerWomenOnly: {
    backgroundColor: '#A855F7',
  },
  customerMarkerDist: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  customerMarkerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#2563EB',
    marginTop: -1,
  },

  // ── Callout ─────────────────────────────────────────────────
  customerCallout: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    width: 240,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    gap: 4,
  },
  calloutName: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  calloutDetail: {
    color: '#94A3B8',
    fontSize: 12,
  },
  calloutMeta: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 4,
  },
  calloutTime: {
    color: '#64748B',
    fontSize: 11,
  },
  calloutBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  calloutBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
})
