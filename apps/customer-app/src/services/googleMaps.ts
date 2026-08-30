/**
 * Google Maps API Service — Customer App
 * ─────────────────────────────────────────────────────────────
 * Central service for Google Maps API calls with minimal API consumption:
 *   • In-memory caching for autocomplete, geocoding, and reverse geocoding
 *   • Geocoding coordinate rounding (4 decimal places ~11m precision)
 *   • India country biasing for high relevance
 *   • Reverse geocode fallback to expo-location
 */
import axios from 'axios'
import * as Location from 'expo-location'

const BASE = {
  geocode:      'https://maps.googleapis.com/maps/api/geocode/json',
  autocomplete: 'https://maps.googleapis.com/maps/api/place/autocomplete/json',
  placeDetails: 'https://maps.googleapis.com/maps/api/place/details/json',
  directions:   'https://maps.googleapis.com/maps/api/directions/json',
}

const key = () => process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyCZw4DVNyJwP85ZeDG1y_x8DLQ7bF8J0EU'

// ─── In-Memory Caches ─────────────────────────────────────────
const autocompleteCache = new Map<string, AutocompletePrediction[]>()
const reverseGeocodeCache = new Map<string, string>()
const geocodeCache = new Map<string, Coordinate>()

export interface Coordinate {
  lat: number
  lng: number
}

export interface AutocompletePrediction {
  placeId: string
  description: string
  mainText: string
  secondaryText: string
}

/**
 * Get place predictions as the user types.
 * Cached by lowercase input string to avoid redundant API hits.
 */
export async function getPlaceAutocomplete(
  input: string,
  sessionToken?: string
): Promise<AutocompletePrediction[]> {
  const trimmed = input.trim().toLowerCase()
  if (!trimmed || trimmed.length < 2) return []

  if (autocompleteCache.has(trimmed)) {
    return autocompleteCache.get(trimmed)!
  }

  try {
    const params: Record<string, string> = {
      input: trimmed,
      components: 'country:in', // Bias to India
      key: key(),
    }
    if (sessionToken) params.sessiontoken = sessionToken

    const res = await axios.get(BASE.autocomplete, { params, timeout: 6000 })
    if (res.data.status !== 'OK') return []

    const predictions: AutocompletePrediction[] = (res.data.predictions as any[]).slice(0, 5).map((p) => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting?.main_text || p.description,
      secondaryText: p.structured_formatting?.secondary_text || '',
    }))

    // Cache results
    autocompleteCache.set(trimmed, predictions)
    return predictions
  } catch (err) {
    console.warn('[GoogleMaps] Autocomplete error:', err)
    return []
  }
}

/**
 * Address string → {lat, lng} coordinates with caching
 */
export async function geocodeAddress(address: string): Promise<Coordinate | null> {
  const trimmed = address.trim()
  if (!trimmed) return null

  if (geocodeCache.has(trimmed.toLowerCase())) {
    return geocodeCache.get(trimmed.toLowerCase())!
  }

  try {
    const res = await axios.get(BASE.geocode, {
      params: { address: trimmed, region: 'IN', key: key() },
      timeout: 7000,
    })
    if (res.data.status !== 'OK' || !res.data.results?.length) return null
    const loc = res.data.results[0].geometry.location
    const result: Coordinate = { lat: loc.lat, lng: loc.lng }

    geocodeCache.set(trimmed.toLowerCase(), result)
    return result
  } catch (err) {
    console.warn('[GoogleMaps] Geocode error:', err)
    return null
  }
}

/**
 * Reverse Geocode {lat, lng} → formatted address string
 * Rounded to 4 decimal precision to share cache for minor drag jitter (~11m radius)
 */
export async function reverseGeocodeCoord(
  lat: number,
  lng: number
): Promise<string | null> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`
  if (reverseGeocodeCache.has(cacheKey)) {
    return reverseGeocodeCache.get(cacheKey)!
  }

  // 1. Try expo-location first for device-native fast resolution
  try {
    const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
    if (places && places.length > 0) {
      const p = places[0]
      const parts = [
        p.name && p.name !== p.street ? p.name : null,
        p.street,
        p.district || p.subregion,
        p.city,
        p.region,
      ].filter(Boolean)
      if (parts.length >= 2) {
        const fullAddr = parts.join(', ')
        reverseGeocodeCache.set(cacheKey, fullAddr)
        return fullAddr
      }
    }
  } catch {}

  // 2. Fallback to Google Geocoding API
  try {
    const res = await axios.get(BASE.geocode, {
      params: { latlng: `${lat},${lng}`, key: key() },
      timeout: 7000,
    })
    if (res.data.status === 'OK' && res.data.results?.length > 0) {
      const formatted = res.data.results[0].formatted_address as string
      reverseGeocodeCache.set(cacheKey, formatted)
      return formatted
    }
  } catch (err) {
    console.warn('[GoogleMaps] Reverse Geocode error:', err)
  }

  return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`
}
