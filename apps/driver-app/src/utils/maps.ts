/**
 * Maps Utilities
 * ─────────────────────────────────────────────────────────────
 * Backward-compatible geocoding helpers now powered by
 * Google Geocoding API instead of Nominatim (OpenStreetMap).
 *
 * All functions maintain the same call signatures so existing
 * screens continue to work without changes.
 */
import { geocodeAddress, reverseGeocodeCoord, decodePolyline, calculateBearing, getPlaceAutocomplete } from '../services/googleMaps'

// ─── geocodeCity ──────────────────────────────────────────────
// Previously used Nominatim. Now uses Google Geocoding API.
// Returns { lat, lon } for backward compatibility.
export const geocodeCity = async (
  city: string
): Promise<{ lat: number; lon: number } | null> => {
  const coord = await geocodeAddress(city)
  if (!coord) return null
  return { lat: coord.lat, lon: coord.lng }
}

// ─── reverseGeocode ───────────────────────────────────────────
// Previously returned { city, state }. Now returns a richer
// formatted address but still exposes city + state.
export const reverseGeocode = async (
  lat: number,
  lon: number
): Promise<{ city: string; state: string; formatted?: string } | null> => {
  const formatted = await reverseGeocodeCoord(lat, lon)
  if (!formatted) return null

  // Parse city and state from formatted address string
  // Typical format: "Area, City, State, Country"
  const parts = formatted.split(',').map(p => p.trim())
  const city  = parts[parts.length - 3] || parts[0] || ''
  const state = parts[parts.length - 2] || ''

  return { city, state, formatted }
}

// ─── getRoutePolyline ─────────────────────────────────────────
// Was previously using OSRM. Now uses Google Directions API.
// Returns coordinate array for MapView Polyline component.
export { decodePolyline, calculateBearing, getPlaceAutocomplete } from '../services/googleMaps'
export { getDirections as getRoutePolyline } from '../services/googleMaps'
