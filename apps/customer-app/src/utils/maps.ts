/**
 * Maps utility — CabBooking Customer App
 * Uses Google Maps Geocoding API (we already have a key) instead of
 * Nominatim, which is rate-limited and blocks non-browser User-Agents
 * on Android.
 */
import axios from 'axios'

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || ''

/**
 * Geocode any address string → lat/lon using Google Geocoding API.
 * Falls back to trying the address as-is, then strips to the first comma-part
 * (city name) and retries.
 */
export const geocodeCity = async (address: string): Promise<{ lat: number; lon: number } | null> => {
  if (!address?.trim()) return null

  // Try 1: full address as given (best if user picked from map / autocomplete)
  const result = await _googleGeocode(address.trim())
  if (result) return result

  // Try 2: first segment (usually the city/area)
  const cityPart = address.split(',')[0]?.trim()
  if (cityPart && cityPart !== address.trim()) {
    const result2 = await _googleGeocode(cityPart)
    if (result2) return result2
  }

  // Try 3: last meaningful segment (state or city at end)
  const parts = address.split(',').map(s => s.trim()).filter(Boolean)
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 2] // second-to-last is usually district/city
    if (lastPart) {
      const result3 = await _googleGeocode(lastPart)
      if (result3) return result3
    }
  }

  console.warn('[Geocode] Could not resolve:', address)
  return null
}

async function _googleGeocode(query: string): Promise<{ lat: number; lon: number } | null> {
  try {
    if (!GOOGLE_API_KEY) {
      // Last-resort fallback to Nominatim
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { headers: { 'User-Agent': 'SwiftifyCabApp/1.0 (contact@swiftify.com)' }, timeout: 5000 }
      )
      if (res.data?.length > 0) {
        return { lat: parseFloat(res.data[0].lat), lon: parseFloat(res.data[0].lon) }
      }
      return null
    }

    const res = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`,
      { timeout: 8000 }
    )
    if (res.data?.status === 'OK' && res.data.results?.length > 0) {
      const loc = res.data.results[0].geometry.location
      return { lat: loc.lat, lon: loc.lng }
    }
    return null
  } catch (e) {
    console.warn('[Geocode] Error for query:', query, e)
    return null
  }
}

/**
 * Get route polyline using OpenRouteService.
 * Falls back to a straight line between two points if ORS fails.
 */
const ORS_DEFAULT_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjRlYjFhNDY4Y2ExZDQ0NmU4OWQ0Yjk3ZWI5ZGEzN2FjIiwiaCI6Im11cm11cjY0In0='

export const getRoutePolyline = async (
  start: { lat: number; lon: number },
  end: { lat: number; lon: number },
  apiKey?: string
): Promise<Array<{ latitude: number; longitude: number }> | null> => {
  const key = apiKey || ORS_DEFAULT_KEY
  try {
    const res = await axios.get(
      `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${key}&start=${start.lon},${start.lat}&end=${end.lon},${end.lat}`,
      { timeout: 10000 }
    )
    const coordinates = res.data?.features?.[0]?.geometry?.coordinates
    if (coordinates && Array.isArray(coordinates) && coordinates.length > 0) {
      return coordinates.map((coord: [number, number]) => ({
        latitude: coord[1],
        longitude: coord[0],
      }))
    }
  } catch (e) {
    console.warn('[ORS] Routing failed, using straight line:', e)
  }

  // Fallback: straight line between start and end
  return [
    { latitude: start.lat, longitude: start.lon },
    { latitude: end.lat, longitude: end.lon },
  ]
}

/**
 * Reverse Geocode coordinate → human readable address.
 * Uses expo-location first, then Google Maps Geocoding API.
 */
export const reverseGeocodeCoordinate = async (
  latitude: number,
  longitude: number
): Promise<string> => {
  try {
    const Location = require('expo-location')
    const [addressObj] = await Location.reverseGeocodeAsync({ latitude, longitude })
    if (addressObj) {
      const parts = [
        addressObj.name,
        addressObj.street,
        addressObj.subregion || addressObj.district,
        addressObj.city,
        addressObj.region,
      ].filter(Boolean)
      if (parts.length > 0) {
        return parts.join(', ')
      }
    }
  } catch (err) {
    console.warn('[ReverseGeocode] expo-location failed:', err)
  }

  // Google Maps Geocoding Fallback
  if (GOOGLE_API_KEY) {
    try {
      const res = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_API_KEY}`,
        { timeout: 8000 }
      )
      if (res.data?.status === 'OK' && res.data.results?.length > 0) {
        return res.data.results[0].formatted_address
      }
    } catch (e) {
      console.warn('[ReverseGeocode] Google API error:', e)
    }
  }

  return `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`
}

/**
 * Haversine distance in km between two coordinates.
 */
export const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371.0
  const dLat = ((lat2 - lat1) * Math.PI) / 180.0
  const dLon = ((lon2 - lon1) * Math.PI) / 180.0
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180.0) *
      Math.cos((lat2 * Math.PI) / 180.0) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10
}

