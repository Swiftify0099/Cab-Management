/**
 * useGoogleDirections Hook
 * ─────────────────────────────────────────────────────────────
 * React hook for fetching Google Directions API route data.
 * Automatically re-fetches when origin, destination, or waypoints change.
 * Includes loading state, error handling, and result caching.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  getDirections,
  type Coordinate,
  type RouteData,
} from '../services/googleMaps'
import { estimateTollCost, type TollSummary } from '../services/tollCalculator'
import { estimateFuelCost, type FuelEstimate } from '../services/fuelCalculator'

// ─── Types ────────────────────────────────────────────────────
export interface DirectionsResult {
  route: RouteData | null
  tollSummary: TollSummary | null
  fuelEstimate: FuelEstimate | null
  isLoading: boolean
  error: string | null
  refresh: () => void
}

// ─── Hook ─────────────────────────────────────────────────────
/**
 * Fetches driving directions from Google Maps API.
 *
 * @param origin       Starting point (Coordinate or address string)
 * @param destination  End point (Coordinate or address string)
 * @param waypoints    Optional stops along the route
 * @param vehicleType  Vehicle type for toll/fuel estimation ('sedan', 'suv', etc.)
 * @param mileage      Vehicle fuel efficiency in km/L (optional, uses preset)
 */
export function useGoogleDirections(
  origin: Coordinate | string | null,
  destination: Coordinate | string | null,
  waypoints: (Coordinate | string)[] = [],
  vehicleType: string = 'sedan',
  mileage?: number
): DirectionsResult {
  const [route, setRoute]           = useState<RouteData | null>(null)
  const [tollSummary, setToll]      = useState<TollSummary | null>(null)
  const [fuelEstimate, setFuel]     = useState<FuelEstimate | null>(null)
  const [isLoading, setLoading]     = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const fetchIdRef = useRef(0)

  const fetchRoute = useCallback(async () => {
    if (!origin || !destination) {
      setRoute(null)
      return
    }

    const fetchId = ++fetchIdRef.current
    setLoading(true)
    setError(null)

    try {
      const data = await getDirections(origin, destination, waypoints)

      // Ignore stale responses
      if (fetchId !== fetchIdRef.current) return

      if (!data) {
        setError('Could not find route. Check city names and try again.')
        return
      }

      setRoute(data)

      // Compute toll + fuel estimates from route data
      const toll = estimateTollCost(data, vehicleType)
      setToll(toll)

      const fuel = estimateFuelCost(data.distanceKm, mileage)
      setFuel(fuel)
    } catch (err) {
      if (fetchId === fetchIdRef.current) {
        setError('Network error fetching route.')
        console.error('[useGoogleDirections]', err)
      }
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false)
      }
    }
  }, [
    typeof origin === 'string' ? origin : `${origin?.lat},${origin?.lng}`,
    typeof destination === 'string' ? destination : `${destination?.lat},${destination?.lng}`,
    waypoints.length,
    vehicleType,
    mileage,
  ])

  useEffect(() => {
    fetchRoute()
  }, [fetchRoute])

  return { route, tollSummary, fuelEstimate, isLoading, error, refresh: fetchRoute }
}
