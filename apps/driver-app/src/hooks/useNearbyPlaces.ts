/**
 * useNearbyPlaces Hook
 * ─────────────────────────────────────────────────────────────
 * Search for nearby POIs using Google Places API.
 * Useful for showing nearby hotels, fuel stations, hospitals,
 * and restaurants to drivers during active trips.
 */
import { useState, useEffect, useCallback } from 'react'
import {
  searchNearbyPlaces,
  type Place,
  type PlaceType,
} from '../services/googleMaps'

// ─── Types ────────────────────────────────────────────────────
export interface NearbyPlacesResult {
  places: Place[]
  isLoading: boolean
  error: string | null
  refresh: () => void
}

// Friendly labels and emojis for each place type
export const PLACE_TYPE_META: Record<PlaceType, { label: string; emoji: string; color: string }> = {
  lodging:              { label: 'Hotels',        emoji: '🏨', color: '#3B82F6' },
  gas_station:          { label: 'Fuel Stations',  emoji: '⛽', color: '#F59E0B' },
  restaurant:           { label: 'Restaurants',    emoji: '🍽️', color: '#EF4444' },
  hospital:             { label: 'Hospitals',      emoji: '🏥', color: '#10B981' },
  tourist_attraction:   { label: 'Rest Stops',     emoji: '🛑', color: '#8B5CF6' },
}

// ─── Hook ─────────────────────────────────────────────────────
/**
 * Fetches nearby places for a given GPS coordinate and place type.
 *
 * @param lat          Latitude of search center
 * @param lng          Longitude of search center
 * @param type         Type of place to search for
 * @param radiusMeters Search radius in meters (default 5km)
 * @param enabled      Set to false to pause fetching (e.g., when offline)
 */
export function useNearbyPlaces(
  lat: number | null,
  lng: number | null,
  type: PlaceType,
  radiusMeters: number = 5000,
  enabled: boolean = true
): NearbyPlacesResult {
  const [places, setPlaces]     = useState<Place[]>([])
  const [isLoading, setLoading] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const fetchPlaces = useCallback(async () => {
    if (!enabled || lat === null || lng === null) return

    setLoading(true)
    setError(null)

    try {
      const results = await searchNearbyPlaces(lat, lng, type, radiusMeters)
      setPlaces(results)
    } catch (err) {
      setError(`Could not load nearby ${PLACE_TYPE_META[type].label.toLowerCase()}`)
      console.error('[useNearbyPlaces]', err)
    } finally {
      setLoading(false)
    }
  }, [lat, lng, type, radiusMeters, enabled])

  useEffect(() => {
    fetchPlaces()
  }, [fetchPlaces])

  return { places, isLoading, error, refresh: fetchPlaces }
}

/**
 * Multi-type nearby places hook
 * Fetches multiple place types simultaneously.
 */
export function useAllNearbyPlaces(
  lat: number | null,
  lng: number | null,
  types: PlaceType[] = ['lodging', 'gas_station', 'restaurant', 'hospital'],
  radiusMeters: number = 5000
): Record<PlaceType, Place[]> & { isLoading: boolean } {
  const [results, setResults] = useState<Record<PlaceType, Place[]>>({
    lodging:            [],
    gas_station:        [],
    restaurant:         [],
    hospital:           [],
    tourist_attraction: [],
  })
  const [isLoading, setLoading] = useState(false)

  const fetchAll = useCallback(async () => {
    if (lat === null || lng === null) return

    setLoading(true)
    try {
      const settled = await Promise.allSettled(
        types.map(t => searchNearbyPlaces(lat, lng, t, radiusMeters))
      )
      const next = { ...results }
      types.forEach((t, i) => {
        const res = settled[i]
        if (res.status === 'fulfilled') {
          next[t] = res.value
        }
      })
      setResults(next)
    } catch (err) {
      console.error('[useAllNearbyPlaces]', err)
    } finally {
      setLoading(false)
    }
  }, [lat, lng, radiusMeters])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  return { ...results, isLoading }
}
