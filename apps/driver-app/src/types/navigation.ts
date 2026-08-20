/**
 * Navigation System Types — Feature 7
 */

export type NavigationPhase =
  | 'EN_ROUTE_PICKUP'
  | 'ARRIVED_PICKUP'
  | 'PASSENGER_ONBOARD'
  | 'EN_ROUTE_DESTINATION'
  | 'ARRIVED_DESTINATION'
  | 'COMPLETED'

export type HazardType =
  | 'construction'
  | 'pothole'
  | 'accident'
  | 'road_closed'
  | 'heavy_traffic'
  | 'flooding'
  | 'other'

export interface TurnStep {
  instruction: string
  maneuver: 'STRAIGHT' | 'TURN_LEFT' | 'TURN_RIGHT' | 'UTURN' | 'ROUNDABOUT' | 'EXIT' | 'ARRIVE' | string
  distance_meters: number
}

export interface NavigationRouteData {
  distance_km: number
  duration_min: number
  duration_sec: number
  polyline: string
  steps: TurnStep[]
  source: 'google_routes' | 'postgis_math' | 'redis_cache'
  cache_hit?: boolean
  prevented_by_postgis?: boolean
}

export interface RoadHazardData {
  hazard_id: string
  hazard_type: HazardType
  description?: string
  latitude: number
  longitude: number
  confidence_score: number
  report_count: number
  status: 'reported' | 'verified' | 'resolved'
}

export interface ArrivalCheckResult {
  is_arrived: boolean
  distance_meters: number
  phase: string
  message: string
}
