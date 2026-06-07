/**
 * Google Maps API Service
 * ─────────────────────────────────────────────────────────────
 * Central service for ALL Google Maps REST API calls:
 *   • Directions API  — route polylines, steps, ETA
 *   • Distance Matrix — multi-point ETA calculation
 *   • Geocoding API   — address ↔ coordinates
 *   • Places API      — nearby POI search
 *   • Roads API       — GPS snap-to-road correction
 *
 * Uses: EXPO_PUBLIC_GOOGLE_MAPS_API_KEY from .env
 */
import axios from 'axios'

// ─── Endpoints ────────────────────────────────────────────────
const BASE = {
  directions:  'https://maps.googleapis.com/maps/api/directions/json',
  geocode:     'https://maps.googleapis.com/maps/api/geocode/json',
  places:      'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
  autocomplete: 'https://maps.googleapis.com/maps/api/place/autocomplete/json',
  matrix:      'https://maps.googleapis.com/maps/api/distancematrix/json',
  roads:       'https://roads.googleapis.com/v1/snapToRoads',
}

const key = () => process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyCZw4DVNyJwP85ZeDG1y_x8DLQ7bF8J0EU'

// ─── Types ────────────────────────────────────────────────────
export interface Coordinate { lat: number; lng: number }

export interface RouteStep {
  instruction: string
  distance: string
  duration: string
  maneuver: string
  startLocation: Coordinate
  endLocation: Coordinate
}

export interface RouteLeg {
  startAddress: string
  endAddress: string
  distanceKm: number
  durationMinutes: number
  steps: RouteStep[]
}

export interface RouteData {
  polyline: Coordinate[]         // decoded lat/lng array
  encodedPolyline: string        // raw Google encoded string
  steps: RouteStep[]             // turn-by-turn instructions
  legs: RouteLeg[]               // per-leg breakdown
  distanceKm: number
  durationMinutes: number
  etaTimestamp: number           // Unix ms when driver arrives
  warnings: string[]
  tollsDetected: boolean
}

export interface Place {
  placeId: string
  name: string
  address: string
  lat: number
  lng: number
  rating: number
  isOpen: boolean
  type: PlaceType
}

export interface AutocompletePrediction {
  placeId: string
  description: string
  mainText: string
  secondaryText: string
}

export type PlaceType =
  | 'lodging'
  | 'gas_station'
  | 'restaurant'
  | 'hospital'
  | 'tourist_attraction'

export interface DistanceMatrix {
  origins: string[]
  destinations: string[]
  results: Array<{
    distanceKm: number
    durationMinutes: number
    distanceText: string
    durationText: string
  }>
}

// ─── Polyline Decoder ─────────────────────────────────────────
/**
 * Decode Google's proprietary encoded polyline format
 * into an array of {lat, lng} coordinate objects.
 */
export function decodePolyline(encoded: string): Coordinate[] {
  let index = 0
  const len = encoded.length
  let lat = 0
  let lng = 0
  const result: Coordinate[] = []

  while (index < len) {
    let b: number
    let shift = 0
    let res = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      res |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const dlat = res & 1 ? ~(res >> 1) : res >> 1
    lat += dlat

    shift = 0
    res = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      res |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const dlng = res & 1 ? ~(res >> 1) : res >> 1
    lng += dlng

    result.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }
  return result
}

// ─── Directions API ───────────────────────────────────────────
/**
 * Get driving directions between origin and destination.
 * Supports multiple waypoints (hotel stops, fuel stops, etc.)
 * Returns decoded polyline + turn-by-turn steps + ETA.
 */
export async function getDirections(
  origin: Coordinate | string,
  destination: Coordinate | string,
  waypoints: (Coordinate | string)[] = [],
  mode: 'driving' | 'walking' | 'transit' = 'driving'
): Promise<RouteData | null> {
  try {
    const toStr = (p: Coordinate | string) =>
      typeof p === 'string' ? p : `${p.lat},${p.lng}`

    const params: Record<string, string> = {
      origin:      toStr(origin),
      destination: toStr(destination),
      mode,
      language:    'en',
      region:      'IN',
      key:         key(),
    }

    if (waypoints.length > 0) {
      params.waypoints = `optimize:true|${waypoints.map(toStr).join('|')}`
    }

    const res = await axios.get(BASE.directions, { params })

    if (res.data.status !== 'OK' || !res.data.routes?.length) {
      console.warn('[GoogleMaps] Directions:', res.data.status)
      return null
    }

    const route = res.data.routes[0]
    const encodedPolyline: string = route.overview_polyline.points
    const polyline = decodePolyline(encodedPolyline)
    const warnings: string[] = route.warnings || []
    const tollsDetected = warnings.some((w: string) =>
      w.toLowerCase().includes('toll')
    )

    const legs: RouteLeg[] = route.legs.map((leg: any) => ({
      startAddress:    leg.start_address,
      endAddress:      leg.end_address,
      distanceKm:      leg.distance.value / 1000,
      durationMinutes: Math.ceil(leg.duration.value / 60),
      steps: leg.steps.map((step: any) => ({
        instruction:   step.html_instructions.replace(/<[^>]*>/g, ''),
        distance:      step.distance.text,
        duration:      step.duration.text,
        maneuver:      step.maneuver || 'straight',
        startLocation: step.start_location as Coordinate,
        endLocation:   step.end_location as Coordinate,
      })),
    }))

    const distanceKm    = Math.round(legs.reduce((s, l) => s + l.distanceKm, 0) * 10) / 10
    const durationMinutes = legs.reduce((s, l) => s + l.durationMinutes, 0)

    return {
      polyline,
      encodedPolyline,
      steps:           legs.flatMap(l => l.steps),
      legs,
      distanceKm,
      durationMinutes,
      etaTimestamp:    Date.now() + durationMinutes * 60 * 1000,
      warnings,
      tollsDetected,
    }
  } catch (err) {
    console.error('[GoogleMaps] Directions error:', err)
    return null
  }
}

// ─── Distance Matrix API ──────────────────────────────────────
/**
 * Calculate distances and durations between multiple
 * origin/destination pairs in one API call.
 */
export async function getDistanceMatrix(
  origins: (Coordinate | string)[],
  destinations: (Coordinate | string)[]
): Promise<DistanceMatrix | null> {
  try {
    const toStr = (p: Coordinate | string) =>
      typeof p === 'string' ? p : `${p.lat},${p.lng}`

    const res = await axios.get(BASE.matrix, {
      params: {
        origins:      origins.map(toStr).join('|'),
        destinations: destinations.map(toStr).join('|'),
        mode:     'driving',
        language: 'en',
        region:   'IN',
        key:      key(),
      },
    })

    if (res.data.status !== 'OK') return null

    const results = res.data.rows.flatMap((row: any) =>
      row.elements.map((el: any) => ({
        distanceKm:      el.distance?.value ? el.distance.value / 1000 : 0,
        durationMinutes: el.duration?.value ? Math.ceil(el.duration.value / 60) : 0,
        distanceText:    el.distance?.text || '',
        durationText:    el.duration?.text || '',
      }))
    )

    return {
      origins:      res.data.origin_addresses,
      destinations: res.data.destination_addresses,
      results,
    }
  } catch (err) {
    console.error('[GoogleMaps] Matrix error:', err)
    return null
  }
}

// ─── Geocoding API ────────────────────────────────────────────
/** Address string → {lat, lng} coordinates */
export async function geocodeAddress(address: string): Promise<Coordinate | null> {
  try {
    const res = await axios.get(BASE.geocode, {
      params: { address, region: 'IN', key: key() },
    })
    if (res.data.status !== 'OK' || !res.data.results?.length) return null
    const loc = res.data.results[0].geometry.location
    return { lat: loc.lat, lng: loc.lng }
  } catch (err) {
    console.error('[GoogleMaps] Geocode error:', err)
    return null
  }
}

/** {lat, lng} coordinates → full formatted address string */
export async function reverseGeocodeCoord(
  lat: number,
  lng: number
): Promise<string | null> {
  try {
    const res = await axios.get(BASE.geocode, {
      params: { latlng: `${lat},${lng}`, key: key() },
    })
    if (res.data.status !== 'OK' || !res.data.results?.length) return null
    return res.data.results[0].formatted_address as string
  } catch (err) {
    console.error('[GoogleMaps] Reverse Geocode error:', err)
    return null
  }
}

// ─── Places API ───────────────────────────────────────────────
/**
 * Search nearby places by type.
 * Types: 'lodging' (hotels), 'gas_station', 'restaurant',
 *        'hospital', 'tourist_attraction'
 */
export async function searchNearbyPlaces(
  lat: number,
  lng: number,
  type: PlaceType,
  radiusMeters = 5000
): Promise<Place[]> {
  try {
    const res = await axios.get(BASE.places, {
      params: {
        location: `${lat},${lng}`,
        radius:   radiusMeters,
        type,
        key:      key(),
      },
    })
    if (res.data.status !== 'OK') return []

    return (res.data.results as any[]).slice(0, 10).map(p => ({
      placeId: p.place_id,
      name:    p.name,
      address: p.vicinity,
      lat:     p.geometry.location.lat,
      lng:     p.geometry.location.lng,
      rating:  p.rating || 0,
      isOpen:  p.opening_hours?.open_now ?? true,
      type,
    }))
  } catch (err) {
    console.error('[GoogleMaps] Places error:', err)
    return []
  }
}

/**
 * Get place predictions as the user types.
 */
export async function getPlaceAutocomplete(
  input: string,
  sessionToken?: string
): Promise<AutocompletePrediction[]> {
  try {
    const params: Record<string, string> = {
      input,
      components: 'country:in', // Bias to India
      key: key(),
    }
    if (sessionToken) params.sessiontoken = sessionToken

    const res = await axios.get(BASE.autocomplete, { params })
    if (res.data.status !== 'OK') return []

    return (res.data.predictions as any[]).slice(0, 5).map(p => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting?.main_text || p.description,
      secondaryText: p.structured_formatting?.secondary_text || '',
    }))
  } catch (err) {
    console.error('[GoogleMaps] Autocomplete error:', err)
    return []
  }
}

// ─── Roads API ────────────────────────────────────────────────
/**
 * Snap raw GPS coordinates to nearest road segments.
 * Used to correct GPS drift and inaccurate readings.
 */
export async function snapToRoad(
  coordinates: Coordinate[]
): Promise<Coordinate[]> {
  try {
    // Roads API supports max 100 points per request
    const chunk = coordinates.slice(0, 100)
    const path = chunk.map(c => `${c.lat},${c.lng}`).join('|')

    const res = await axios.get(BASE.roads, {
      params: { path, interpolate: true, key: key() },
    })

    if (!res.data.snappedPoints) return coordinates

    return (res.data.snappedPoints as any[]).map(p => ({
      lat: p.location.latitude,
      lng: p.location.longitude,
    }))
  } catch (err) {
    console.error('[GoogleMaps] SnapToRoad error:', err)
    return coordinates // fall back to raw GPS
  }
}

// ─── Helpers ──────────────────────────────────────────────────
/** Format ETA timestamp into "h m" string */
export function formatETA(etaTimestamp: number): string {
  const diff = etaTimestamp - Date.now()
  if (diff <= 0) return '0m'
  const totalMin = Math.round(diff / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

/** Calculate compass bearing between two coordinates (degrees) */
export function calculateBearing(from: Coordinate, to: Coordinate): number {
  const dLon = ((to.lng - from.lng) * Math.PI) / 180
  const lat1 = (from.lat * Math.PI) / 180
  const lat2 = (to.lat * Math.PI) / 180
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  const brng = (Math.atan2(y, x) * 180) / Math.PI
  return (brng + 360) % 360
}
